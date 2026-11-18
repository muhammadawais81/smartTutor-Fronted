import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {getMyTeacherProfile} from '../../api/teacher';
import {getAllTeacherEnrollments} from '../../api/enrollment';

const DEFAULT_DASHBOARD_STATS = {
  totalStudents: 0,
  totalActive: 0,
  totalPending: 0,
  totalRejected: 0,
  totalSubjects: 0,
  monthlyRevenue: 0,
};

// App color scheme
const PRIMARY = '#10284C';
const PRIMARY_TINT = '#EAF0F9';
const BG = '#F4F6FA';
const BORDER = '#E6EBF2';
const TEXT = '#0F172A';
const MUTED = '#64748B';

const TeacherDashboard = ({
  onNavigateToProfile,
  onNavigateToCompleteProfile,
  onLogout,
  onNavigateToMessages,
  onNavigateToProfileStatus,
  onNavigateToEnrollmentRequests,
  onNavigateToStudents,
  onNavigateToStudentsBySubject,
  onNavigateToVideoClass,
  onNavigateToAddParent,
  onNavigateToAssistant,
}) => {
  const [user, setUser] = useState(null);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);

        try {
          const profile = await getMyTeacherProfile();
          setTeacherProfile(profile);
        } catch (err) {
          console.log('[DASHBOARD] Teacher profile not found or error:', err?.message);
        }

        await loadDashboardStats();
      }
    } catch (error) {
      console.error('[DASHBOARD] Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const enrollments = await getAllTeacherEnrollments();

      const uniqueStudents = new Set();
      const uniqueSubjects = new Set();
      let approvedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;
      let monthlyRevenue = 0;

      enrollments.forEach((enrollment) => {
        if (enrollment?.student_id) {
          uniqueStudents.add(enrollment.student_id);
        }

        if (enrollment?.teacher_subject?.subject_id) {
          uniqueSubjects.add(enrollment.teacher_subject.subject_id);
        }

        if (enrollment?.status === 'approved') {
          approvedCount += 1;
          monthlyRevenue += enrollment?.teacher_subject?.fee_per_month || 0;
        } else if (enrollment?.status === 'pending') {
          pendingCount += 1;
        } else if (enrollment?.status === 'rejected') {
          rejectedCount += 1;
        }
      });

      const computedStats = {
        totalStudents: uniqueStudents.size,
        totalActive: approvedCount,
        totalPending: pendingCount,
        totalRejected: rejectedCount,
        totalSubjects: uniqueSubjects.size,
        monthlyRevenue,
      };

      setTeacherProfile(prev => {
        if (!prev) {
          return {dashboard_stats: computedStats};
        }
        return {...prev, dashboard_stats: computedStats};
      });
    } catch (error) {
      console.error('[DASHBOARD] Error loading stats:', error);
    }
  };

  const dashboardStats = teacherProfile?.dashboard_stats || DEFAULT_DASHBOARD_STATS;
  const statsLoading = isLoading && !teacherProfile?.dashboard_stats;

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('refresh_token');
            await AsyncStorage.removeItem('user');
            if (onLogout) {
              onLogout();
            }
          } catch (error) {
            console.error('[DASHBOARD] Logout error:', error);
          }
        },
      },
    ]);
  };

  const currentHour = new Date().getHours();
  const greetingLabel =
    currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';
  const displayName = user?.first_name || teacherProfile?.full_name || 'Teacher';
  const isProfileApproved = teacherProfile?.profile_status === 'approved';
  const profileStatus = teacherProfile?.profile_status;

  const heroStats = [
    {id: 'students', label: 'Students', value: dashboardStats.totalStudents},
    {id: 'active', label: 'Active', value: dashboardStats.totalActive},
    {id: 'pending', label: 'Pending', value: dashboardStats.totalPending},
  ];

  const quickActions = [
    {
      id: 'enrollments',
      icon: 'document-text-outline',
      title: 'Requests',
      subtitle: 'Enrollment requests',
      count: dashboardStats.totalPending,
      onPress: onNavigateToEnrollmentRequests,
    },
    {
      id: 'students',
      icon: 'people-outline',
      title: 'My Students',
      subtitle: 'Student directory',
      count: dashboardStats.totalStudents,
      onPress: onNavigateToStudents,
    },
    {
      id: 'subjects',
      icon: 'albums-outline',
      title: 'By Subject',
      subtitle: 'Class-wise list',
      count: dashboardStats.totalSubjects,
      onPress: onNavigateToStudentsBySubject,
    },
    {
      id: 'video',
      icon: 'videocam-outline',
      title: 'Live Class',
      subtitle: 'Start a session',
      count: null,
      onPress: onNavigateToVideoClass,
    },
    {
      id: 'addParent',
      icon: 'person-add-outline',
      title: 'Add Parent',
      subtitle: 'Link a parent',
      count: null,
      onPress: onNavigateToAddParent,
    },
    {
      id: 'profile',
      icon: 'person-circle-outline',
      title: 'Edit Profile',
      subtitle: 'Bio, fee, hours',
      count: null,
      onPress: onNavigateToProfile,
    },
  ];

  const renderHero = (interactive) => (
    <View style={styles.heroWrap}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <TouchableOpacity
            style={styles.userBlock}
            activeOpacity={interactive ? 0.8 : 1}
            onPress={interactive ? onNavigateToProfile : undefined}>
            {teacherProfile?.profile_picture ? (
              <Image
                source={{uri: teacherProfile.profile_picture}}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userTextBlock}>
              <Text style={styles.greeting}>{greetingLabel}</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={interactive ? onNavigateToEnrollmentRequests : undefined}
              activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
              {dashboardStats.totalPending > 0 && <View style={styles.notificationDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={interactive ? handleLogout : undefined}
              activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats inside hero */}
        <View style={styles.heroStats}>
          {heroStats.map((stat, idx) => (
            <React.Fragment key={stat.id}>
              {idx > 0 && <View style={styles.heroStatDivider} />}
              <View style={styles.heroStat}>
                {statsLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.heroStatSpinner} />
                ) : (
                  <Text style={styles.heroStatValue}>{stat.value}</Text>
                )}
                <Text style={styles.heroStatLabel}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <StatusBar backgroundColor={PRIMARY} barStyle="light-content" translucent={false} />
        <SafeAreaView style={styles.statusStrip} edges={['top']} />
        {renderHero(false)}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={PRIMARY} barStyle="light-content" translucent={false} />
      <SafeAreaView style={styles.statusStrip} edges={['top']} />
      {renderHero(true)}

      <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Revenue highlight */}
          <View style={styles.revenueCard}>
            <View style={styles.revenueLeft}>
              <Text style={styles.revenueLabel}>Monthly Active Revenue</Text>
              <Text style={styles.revenueValue}>
                Rs. {dashboardStats.monthlyRevenue.toLocaleString()}
              </Text>
            </View>
            <View style={styles.revenueRight}>
              <Text style={styles.revenueSubValue}>{dashboardStats.totalSubjects}</Text>
              <Text style={styles.revenueSubLabel}>Subjects</Text>
            </View>
          </View>

          {/* Profile status card */}
          {!teacherProfile?.profile_status ? (
            <TouchableOpacity
              style={styles.statusCard}
              activeOpacity={0.9}
              onPress={onNavigateToCompleteProfile || onNavigateToProfile}>
              <View style={styles.statusIcon}>
                <Ionicons name="person-add" size={20} color={PRIMARY} />
              </View>
              <View style={styles.statusTextBlock}>
                <Text style={styles.statusTitle}>Complete your profile</Text>
                <Text style={styles.statusText}>
                  Set up your profile to start connecting with students.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : !isProfileApproved ? (
            <TouchableOpacity
              style={styles.statusCard}
              activeOpacity={0.9}
              onPress={
                profileStatus === 'pending_approval'
                  ? onNavigateToProfileStatus
                  : onNavigateToCompleteProfile
              }>
              <View style={styles.statusIcon}>
                <Ionicons
                  name={
                    profileStatus === 'rejected'
                      ? 'alert-circle'
                      : profileStatus === 'pending_approval'
                      ? 'hourglass'
                      : 'create'
                  }
                  size={20}
                  color={PRIMARY}
                />
              </View>
              <View style={styles.statusTextBlock}>
                <Text style={styles.statusTitle}>
                  {profileStatus === 'rejected'
                    ? 'Profile needs updates'
                    : profileStatus === 'pending_approval'
                    ? 'Profile under review'
                    : 'Finish your profile'}
                </Text>
                <Text style={styles.statusText} numberOfLines={2}>
                  {profileStatus === 'rejected'
                    ? teacherProfile?.rejection_reason || 'Please update and resubmit.'
                    : profileStatus === 'pending_approval'
                    ? "We'll notify you once it's approved."
                    : 'Complete it to start getting students.'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}></Text>

          {/* Teacher Assistant (highlighted action) */}
          <TouchableOpacity
            style={styles.assistantTile}
            activeOpacity={0.9}
            onPress={onNavigateToAssistant}>
            <View style={styles.assistantGlowOne} />
            <View style={styles.assistantGlowTwo} />
            <View style={styles.assistantIconBadge}>
              <Ionicons name="sparkles" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.assistantTextBlock}>
              <View style={styles.aiPill}>
                <Ionicons name="flash" size={11} color="#10284C" />
                <Text style={styles.aiPillText}>AI ASSISTANT</Text>
              </View>
              <Text style={styles.assistantTitle}>Ask your Assistant</Text>
              <Text style={styles.assistantSubtitle}>
                Lesson plans, quizzes & grading help
              </Text>
            </View>
            <View style={styles.assistantCta}>
              <Ionicons name="arrow-forward" size={18} color="#10284C" />
            </View>
          </TouchableOpacity>

          <View style={styles.grid}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.tile}
                activeOpacity={0.85}
                onPress={action.onPress}>
                <View style={styles.tileTop}>
                  <View style={styles.tileIcon}>
                    <Ionicons name={action.icon} size={20} color={PRIMARY} />
                  </View>
                  {typeof action.count === 'number' && action.count > 0 ? (
                    <View style={styles.tileBadge}>
                      <Text style={styles.tileBadgeText}>{action.count}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.tileTitle}>{action.title}</Text>
                <Text style={styles.tileSubtitle} numberOfLines={1}>
                  {action.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  statusStrip: {
    backgroundColor: PRIMARY,
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingBottom: 110,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: MUTED,
  },

  // Hero header
  heroWrap: {
    backgroundColor: BG,
  },
  hero: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 8,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: '#1E3A5F',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  userTextBlock: {
    flexShrink: 1,
  },
  greeting: {
    color: '#A7C0E8',
    fontSize: 12.5,
    marginBottom: 2,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },

  // Hero stats
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heroStatSpinner: {
    height: 27,
  },
  heroStatLabel: {
    color: '#A7C0E8',
    fontSize: 12,
    marginTop: 3,
  },

  // Revenue
  revenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  revenueLeft: {
    flex: 1,
  },
  revenueLabel: {
    fontSize: 12.5,
    color: MUTED,
    marginBottom: 4,
    fontWeight: '500',
  },
  revenueValue: {
    fontSize: 22,
    fontWeight: '800',
    color: PRIMARY,
  },
  revenueRight: {
    alignItems: 'center',
    paddingLeft: 16,
    marginLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
  },
  revenueSubValue: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT,
  },
  revenueSubLabel: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },

  // Status card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: PRIMARY_TINT,
  },
  statusTextBlock: {
    flex: 1,
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 12.5,
    color: MUTED,
    lineHeight: 17,
  },

  // Section
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
    // marginTop: 2,
    // marginBottom: 1,
  },

  // Teacher Assistant tile
  assistantTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: PRIMARY,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  assistantGlowOne: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(96,165,250,0.18)',
    top: -55,
    right: -25,
  },
  assistantGlowTwo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -40,
    left: 30,
  },
  assistantIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(96,165,250,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  assistantTextBlock: {
    flex: 1,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
    gap: 3,
  },
  aiPillText: {
    color: '#10284C',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  assistantTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  assistantSubtitle: {
    color: '#A7C0E8',
    fontSize: 12.5,
    lineHeight: 17,
  },
  assistantCta: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  // Quick actions grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  tile: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_TINT,
  },
  tileBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tileTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 2,
  },
  tileSubtitle: {
    fontSize: 12,
    color: MUTED,
  },
});

export default TeacherDashboard;
