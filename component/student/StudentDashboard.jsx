import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
  StatusBar,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {getAllTeachers} from '../../api/teacher';
import {getStudentByUserId} from '../../api/student';
import {getActiveVideoCall} from '../../api/video';

const StudentDashboard = ({
  onNavigateToProfile,
  onLogout,
  onOpenTeacherDetail,
  onNavigateToJoinClass,
}) => {
  const [user, setUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [allTeachers, setAllTeachers] = useState([]);
  const [serverMatches, setServerMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeClass, setActiveClass] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (user) {
      loadTeachers();
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const loadActiveClass = async () => {
      try {
        const call = await getActiveVideoCall();
        if (mounted) {
          setActiveClass(call || null);
        }
      } catch (error) {
        if (mounted) {
          setActiveClass(null);
        }
      }
    };

    loadActiveClass();

    const interval = setInterval(() => {
      loadActiveClass();
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleOpenLiveClassLink = async () => {
    const link = activeClass?.call_link;
    if (!link) {
      Alert.alert('No Link', 'No active class link is available right now.');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(link);
      if (!canOpen) {
        Alert.alert('Invalid Link', 'Unable to open class link on this device.');
        return;
      }
      await Linking.openURL(link);
    } catch (error) {
      Alert.alert('Error', 'Failed to open class link.');
    }
  };

  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  const handleNotificationPress = () => {
    setShowNotifications(false);
    onNavigateToJoinClass?.();
  };

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);

        if (
          userData.role === 'student' ||
          userData.role === 'STUDENT' ||
          userData.role?.toLowerCase() === 'student'
        ) {
          try {
            const profile = await getStudentByUserId(userData.id);
            setStudentProfile(profile);
          } catch (err) {
            console.log('Student profile not found:', err?.message);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sort by rating: highest rated first, unrated (0) at the bottom.
  const sortByRating = list =>
    [...(list || [])].sort((a, b) => {
      const ratingA = Number(a?.total_reviews) > 0 ? Number(a?.rating) || 0 : 0;
      const ratingB = Number(b?.total_reviews) > 0 ? Number(b?.rating) || 0 : 0;
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      // Tie-breaker: more reviews first
      return (Number(b?.total_reviews) || 0) - (Number(a?.total_reviews) || 0);
    });

  const loadTeachers = async () => {
    setIsLoadingTeachers(true);
    try {
      const teachersList = await getAllTeachers({limit: 100});
      setAllTeachers(sortByRating(teachersList));
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setIsLoadingTeachers(false);
    }
  };

  // Debounced server-side search (covers name + subject matches the backend
  // knows about, even if a teacher isn't in the first 100 loaded locally).
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setServerMatches([]);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const results = await getAllTeachers({search: q, limit: 50});
        if (!cancelled) {
          setServerMatches(results || []);
        }
      } catch (error) {
        if (!cancelled) {
          setServerMatches([]);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery]);

  // Does a teacher match the query by name, subject, city or location?
  const matchesQuery = (teacher, q) => {
    // Name
    if ((teacher.full_name || '').toLowerCase().includes(q)) return true;

    // Qualification / headline
    const qualification = (
      teacher.highest_qualification ||
      teacher.qualification ||
      ''
    ).toLowerCase();
    if (qualification.includes(q)) return true;

    // City / location (object or string) + area
    const city = teacher.city;
    const cityName = (
      (typeof city === 'string' ? city : city?.name) || ''
    ).toLowerCase();
    const area = (teacher.area || '').toLowerCase();
    if (cityName.includes(q) || area.includes(q)) return true;

    // Subjects
    const subjectNames = Array.isArray(teacher.subjects)
      ? teacher.subjects
          .map(s => (s?.subject?.name || s?.name || '').toLowerCase())
          .filter(Boolean)
      : [];
    if (subjectNames.some(s => s.includes(q))) return true;

    return false;
  };

  // Combine instant local filtering with debounced server matches.
  const teachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return allTeachers;
    }

    const localMatches = allTeachers.filter(t => matchesQuery(t, q));

    // Merge server + local results, de-duplicated by teacher_id.
    const byId = new Map();
    [...localMatches, ...serverMatches].forEach(t => {
      const id = t?.teacher_id ?? t?.id;
      if (id != null && !byId.has(id)) {
        byId.set(id, t);
      }
    });

    return sortByRating(Array.from(byId.values()));
  }, [allTeachers, serverMatches, searchQuery]);

  const getModeInfo = mode => {
    switch ((mode || '').toLowerCase()) {
      case 'online':
        return {label: 'Online', icon: 'globe-outline', color: '#0EA5A4', bg: '#E6F7F6'};
      case 'physical':
        return {label: 'In-person', icon: 'location-outline', color: '#7C3AED', bg: '#F1EBFE'};
      case 'both':
        return {label: 'Online & In-person', icon: 'swap-horizontal-outline', color: '#2563EB', bg: '#E8F0FE'};
      default:
        return {label: 'Flexible', icon: 'options-outline', color: '#475569', bg: '#EEF2F7'};
    }
  };

  const getSessionLabel = sessionType => {
    switch ((sessionType || '').toLowerCase()) {
      case 'one_to_one':
        return '1-to-1';
      case 'group':
        return 'Group';
      case 'both':
        return '1-to-1 & Group';
      default:
        return null;
    }
  };

  const getCityName = city => {
    if (!city) return null;
    if (typeof city === 'string') return city;
    return city.name || null;
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
          onLogout?.();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#10284C" />
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  const userName = user?.first_name || 'Student';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#10284C" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        
        {/* Header - Dark Blue */}
        <View style={styles.header}>
          {/* Top Row: User Info + Icons */}
          <View style={styles.topRow}>
            <TouchableOpacity 
              style={styles.userInfo} 
              onPress={onNavigateToProfile} 
              activeOpacity={0.8}>
              {studentProfile?.profile_picture ? (
                <Image
                  source={{uri: studentProfile.profile_picture}}
                  style={styles.userAvatar}
                />
              ) : (
                <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                  <Text style={styles.userAvatarText}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.greetingContainer}>
                <Text style={styles.greetingText}>Hello,</Text>
                <Text style={styles.userName}>{userName} 👋</Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.headerIcons}>
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.7}
                onPress={handleOpenNotifications}>
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                {activeClass?.call_link ? (
                  <View style={styles.notificationDot} />
                ) : null}
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Section - Simple */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Find Your Perfect Tutor</Text>
            <Text style={styles.heroSubtitle}>
              Connect with expert tutors and start learning today
            </Text>
            
            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, subject, or city..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        </View>

        {/* Content - White Background */}
        <View style={styles.content}>
          {/* Tutors Section Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Tutors</Text>
            {/* <View style={styles.countBadge}>
              <Text style={styles.countText}>{teachers.length}</Text>
            </View> */}
          </View>

          {isLoadingTeachers ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Finding tutors...</Text>
            </View>
          ) : teachers.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="school-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No Tutors Found</Text>
              <Text style={styles.emptyText}>Try adjusting your search</Text>
            </View>
          ) : (
            <View style={styles.tutorsGrid}>
              {teachers.map(teacher => {
                const mode = getModeInfo(teacher.teaching_mode);
                const sessionLabel = getSessionLabel(teacher.session_type);
                const cityName = getCityName(teacher.city);
                const isOnline =
                  (teacher.teaching_mode || '').toLowerCase() === 'online' ||
                  (teacher.teaching_mode || '').toLowerCase() === 'both';
                const hasRating =
                  Number(teacher.total_reviews) > 0 && Number(teacher.rating) > 0;
                const subjectList = Array.isArray(teacher.subjects)
                  ? teacher.subjects
                      .map(s => s?.subject?.name || s?.name)
                      .filter(Boolean)
                  : [];

                return (
                  <TouchableOpacity
                    key={teacher.teacher_id}
                    style={styles.tutorCard}
                    onPress={() => onOpenTeacherDetail?.(teacher.teacher_id)}
                    activeOpacity={0.85}>

                    {/* Top Row: Avatar + Info + Rating */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.avatarWrap}>
                        {teacher.profile_picture ? (
                          <Image source={{uri: teacher.profile_picture}} style={styles.tutorAvatar} />
                        ) : (
                          <View style={[styles.tutorAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitial}>
                              {teacher.full_name?.charAt(0).toUpperCase() || 'T'}
                            </Text>
                          </View>
                        )}
                        {isOnline ? <View style={styles.onlineDot} /> : null}
                      </View>

                      <View style={styles.tutorInfo}>
                        <Text style={styles.tutorName} numberOfLines={1}>
                          {teacher.full_name || 'Teacher'}
                        </Text>
                        <Text style={styles.tutorSubject} numberOfLines={1}>
                          {teacher.highest_qualification || teacher.qualification || 'Professional Tutor'}
                        </Text>
                        {cityName ? (
                          <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={13} color="#94A3B8" />
                            <Text style={styles.locationText} numberOfLines={1}>{cityName}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={hasRating ? styles.ratingBadge : styles.newBadge}>
                        {hasRating ? (
                          <>
                            <Ionicons name="star" size={13} color="#F59E0B" />
                            <Text style={styles.ratingBadgeText}>{teacher.rating.toFixed(1)}</Text>
                          </>
                        ) : (
                          <Text style={styles.newBadgeText}>NEW</Text>
                        )}
                      </View>
                    </View>

                    {/* Tags Row: Mode + Session */}
                    <View style={styles.tagsRow}>
                      <View style={[styles.modeTag, {backgroundColor: mode.bg}]}>
                        <Ionicons name={mode.icon} size={13} color={mode.color} />
                        <Text style={[styles.modeTagText, {color: mode.color}]}>{mode.label}</Text>
                      </View>
                      {sessionLabel ? (
                        <View style={styles.sessionTag}>
                          <Ionicons name="people-outline" size={13} color="#475569" />
                          <Text style={styles.sessionTagText}>{sessionLabel}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Subjects */}
                    {subjectList.length > 0 ? (
                      <View style={styles.subjectsRow}>
                        {subjectList.slice(0, 3).map((name, idx) => (
                          <View key={idx} style={styles.subjectChip}>
                            <Text style={styles.subjectChipText}>{name}</Text>
                          </View>
                        ))}
                        {subjectList.length > 3 ? (
                          <View style={styles.subjectChipMore}>
                            <Text style={styles.subjectChipMoreText}>+{subjectList.length - 3}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Footer: Stats + Fee */}
                    <View style={styles.cardFooter}>
                      <View style={styles.footerStats}>
                        <View style={styles.footerStat}>
                          <Ionicons name="briefcase-outline" size={15} color="#64748B" />
                          <Text style={styles.footerStatText}>
                            {teacher.experience_years || 0} year{(teacher.experience_years || 0) === 1 ? '' : 's'}
                          </Text>
                        </View>
                        <View style={styles.footerDivider} />
                        <View style={styles.footerStat}>
                          <Ionicons name="people" size={15} color="#64748B" />
                          <Text style={styles.footerStatText}>{teacher.total_students || 0}</Text>
                        </View>
                      </View>

                      <View style={styles.viewProfileBtn}>
                        <Text style={styles.viewProfileText}>View Profile</Text>
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                      </View>
                    </View>

                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          
        </View>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        transparent
        animationType="slide"
        onRequestClose={handleCloseNotifications}
      >
        <View style={styles.notificationOverlay}>
          <TouchableOpacity
            style={styles.notificationBackdrop}
            activeOpacity={1}
            onPress={handleCloseNotifications}
          />
          <View style={styles.notificationSheet}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>Notifications</Text>
              <TouchableOpacity onPress={handleCloseNotifications}>
                <Text style={styles.notificationClose}>Close</Text>
              </TouchableOpacity>
            </View>

            {activeClass?.call_link ? (
              <TouchableOpacity
                style={styles.notificationCard}
                activeOpacity={0.8}
                onPress={handleNotificationPress}
              >
                <View style={styles.notificationIconWrap}>
                  <Ionicons name="videocam" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationItemTitle}>Live class is ready</Text>
                  <Text style={styles.notificationItemSub} numberOfLines={1}>
                    Tap to open class tab
                  </Text>
                </View>
                <Text style={styles.notificationAction}>Open</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.notificationEmpty}>
                <Ionicons name="notifications-off-outline" size={36} color="#C7D2E1" />
                <Text style={styles.notificationEmptyText}>No new notifications</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10284C',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header Section
  header: {
    backgroundColor: '#10284C',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    backgroundColor: '#07478c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  greetingContainer: {
    justifyContent: 'center',
  },
  greetingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconText: {
    fontSize: 20,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#10284C',
  },
  notificationOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  notificationBackdrop: {
    flex: 1,
  },
  notificationSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10284C',
  },
  notificationClose: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F8FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCE8FF',
  },
  notificationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E88E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10284C',
  },
  notificationItemSub: {
    fontSize: 12,
    color: '#667085',
    marginTop: 4,
  },
  notificationAction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
  },
  notificationEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  notificationEmptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9AA4B2',
  },

  // Hero Section
  heroSection: {
    marginBottom: 10,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
  },

  // Content Section
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -10,
    paddingTop: 24,
    paddingHorizontal: 20,
    minHeight: 500,
  },
  liveClassCard: {
    backgroundColor: '#1E88E5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  liveClassIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  liveClassIcon: {
    fontSize: 28,
  },
  liveClassContent: {
    flex: 1,
  },
  liveClassTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  liveClassSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  linkRow: {
    marginTop: 8,
  },
  liveClassLink: {
    fontSize: 11,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    marginBottom: 6,
  },
  openLinkButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  openLinkButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  liveClassArrow: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10284C',
  },
  countBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Loading / Empty
  loadingSection: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
  emptySection: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },

  // Tutors Grid
  tutorsGrid: {
    gap: 16,
    marginBottom: 24,
  },
  tutorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#10284C',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  tutorAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#EEF2F7',
  },
  avatarPlaceholder: {
    backgroundColor: '#10284C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  tutorInfo: {
    flex: 1,
    marginLeft: 14,
  },
  tutorName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  tutorSubject: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 12,
    color: '#94A3B8',
    flexShrink: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF7E6',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCEFC7',
  },
  ratingBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  newBadge: {
    backgroundColor: '#E6F7F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0EA5A4',
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  modeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modeTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sessionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  sessionTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  subjectsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  subjectChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  subjectChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  subjectChipMore: {
    backgroundColor: '#EEF2F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  subjectChipMoreText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerStatText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
  },
  footerDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10284C',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  viewProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default StudentDashboard;
