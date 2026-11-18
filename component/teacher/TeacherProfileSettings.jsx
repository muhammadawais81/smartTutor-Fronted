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
  Modal,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {getMyTeacherProfile} from '../../api/teacher';
import {getDayName} from '../../api/lookup';

const TeacherProfileSettings = ({onBack, userId, onLogout, onEditProfile, onNavigateToWizard}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      // Get user data from storage
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
      }

      // Get teacher profile using authenticated API
      try {
        const profile = await getMyTeacherProfile();
        setTeacherProfile(profile);
      } catch (profileErr) {
        console.log('[PROFILE] Teacher profile not found:', profileErr?.message);
        // Profile doesn't exist yet - that's okay
      }
    } catch (err) {
      console.log('[PROFILE] Error loading profile:', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    onLogout?.();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion API call
            Alert.alert('Info', 'Account deletion will be available soon.');
          },
        },
      ],
    );
  };

  const getStatusConfig = () => {
    if (!teacherProfile?.profile_status) return null;
    
    const statusConfigs = {
      incomplete: {label: 'Incomplete', color: '#F57C00', bgColor: '#FFF3E0', icon: 'alert-circle'},
      pending_approval: {label: 'Pending Review', color: '#1976D2', bgColor: '#E3F2FD', icon: 'time'},
      approved: {label: 'Verified', color: '#388E3C', bgColor: '#E8F5E9', icon: 'checkmark-circle'},
      rejected: {label: 'Rejected', color: '#D32F2F', bgColor: '#FFEBEE', icon: 'close-circle'},
      suspended: {label: 'Suspended', color: '#616161', bgColor: '#F5F5F5', icon: 'ban'},
    };
    
    return statusConfigs[teacherProfile.profile_status] || statusConfigs.incomplete;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#10284C" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const userName = teacherProfile?.full_name || user?.first_name || 'Teacher';
  const userEmail = user?.email || 'email@example.com';
  const qualification = teacherProfile?.highest_qualification || teacherProfile?.qualification || 'Professional Tutor';
  const statusConfig = getStatusConfig();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#10284C" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        
        {/* Header with curved background */}
        <View style={styles.headerBackground}>
          {/* Top Row: Menu & Bell */}
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={22} color="#10284C" />
            </TouchableOpacity>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {teacherProfile?.profile_picture ? (
                <Image
                  source={{uri: teacherProfile.profile_picture}}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={60} color="#999" />
                </View>
              )}
              {/* Edit Button */}
              <TouchableOpacity 
                style={styles.editAvatarBtn} 
                onPress={onNavigateToWizard || onEditProfile}
                activeOpacity={0.8}>
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Name */}
            <Text style={styles.userName}>{userName}</Text>
            
            {/* Status Badge */}
            {statusConfig && (
              <View style={[styles.statusBadge, {backgroundColor: statusConfig.bgColor}]}>
                <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
                <Text style={[styles.statusBadgeText, {color: statusConfig.color}]}>
                  {statusConfig.label}
                </Text>
              </View>
            )}
            
            {/* Qualification */}
            <Text style={styles.qualification}>{qualification}</Text>
            
            {/* Email with verified badge */}
            <View style={styles.emailRow}>
              <Text style={styles.userEmail}>{userEmail}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
              </View>
            </View>
          </View>
        </View>

        {/* Profile Stats */}
        {teacherProfile && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{teacherProfile.experience_years || 0}</Text>
              <Text style={styles.statLabel}>Years Exp</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{teacherProfile.subjects?.length || 0}</Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{teacherProfile.total_students || 0}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>⭐ {teacherProfile.rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        )}

        {/* Subjects Section */}
        {teacherProfile?.subjects && teacherProfile.subjects.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📚 My Subjects</Text>
            <View style={styles.subjectsContainer}>
              {teacherProfile.subjects.map((s, idx) => (
                <View key={idx} style={styles.subjectChip}>
                  <Text style={styles.subjectChipText}>
                    {s.subject?.name}{s.level ? ` (${s.level.name})` : ''}
                  </Text>
                  {s.fee_per_month && (
                    <Text style={styles.subjectFee}>Rs. {s.fee_per_month}/mo</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Availability Section */}
        {teacherProfile?.availability && teacherProfile.availability.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🗓️ Availability</Text>
            <View style={styles.availabilityContainer}>
              {teacherProfile.availability.map((slot, idx) => (
                <View key={idx} style={styles.availabilitySlot}>
                  <Text style={styles.availabilityDay}>{getDayName(slot.day_of_week)}</Text>
                  <Text style={styles.availabilityTime}>
                    {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Incomplete Profile Banner */}
        {(!teacherProfile || teacherProfile?.profile_status === 'incomplete') && (
          <View style={styles.incompleteBanner}>
            <Ionicons name="alert-circle" size={24} color="#F57C00" />
            <View style={styles.incompleteBannerContent}>
              <Text style={styles.incompleteBannerTitle}>Complete Your Profile</Text>
              <Text style={styles.incompleteBannerText}>
                Add your subjects and availability to start getting students
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.completeBannerBtn}
              onPress={onNavigateToWizard}>
              <Text style={styles.completeBannerBtnText}>Complete</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rejected Profile Banner */}
        {teacherProfile?.profile_status === 'rejected' && (
          <View style={styles.rejectedBanner}>
            <Ionicons name="close-circle" size={24} color="#D32F2F" />
            <View style={styles.rejectedBannerContent}>
              <Text style={styles.rejectedBannerTitle}>Profile Rejected</Text>
              <Text style={styles.rejectedBannerText}>
                {teacherProfile.rejection_reason || 'Please update and resubmit your profile'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.resubmitBtn}
              onPress={onNavigateToWizard}>
              <Text style={styles.resubmitBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content - White Card */}
        <View style={styles.content}>
          <View style={styles.menuCard}>
            {/* Edit Profile */}
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={onNavigateToWizard || onEditProfile}
              activeOpacity={0.7}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="create-outline" size={22} color="#333" />
              </View>
              <Text style={styles.menuText}>Edit Profile & Subjects</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Personal Information */}
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={onEditProfile}
              activeOpacity={0.7}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="card-outline" size={22} color="#333" />
              </View>
              <Text style={styles.menuText}>Personal Information</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Log Out */}
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={handleLogout}
              activeOpacity={0.7}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="log-out-outline" size={22} color="#333" />
              </View>
              <Text style={styles.menuText}>Log Out</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Delete Account */}
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={handleDeleteAccount}
              activeOpacity={0.7}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
              </View>
              <Text style={[styles.menuText, styles.deleteText]}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutCard}>
            <View style={styles.logoutIconWrap}>
              <Ionicons name="log-out-outline" size={22} color="#DC2626" />
            </View>
            <Text style={styles.logoutTitle}>Log Out</Text>
            <Text style={styles.logoutMessage}>
              Are you sure you want to log out?
            </Text>

            <View style={styles.logoutActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.85}
                onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutBtn}
                activeOpacity={0.85}
                onPress={confirmLogout}>
                <Text style={styles.logoutBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },

  // Header Background
  headerBackground: {
    backgroundColor: '#10284C',
    paddingTop: 16,
    paddingBottom: 80,
  },

  // Top Row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  qualification: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  verifiedBadge: {
    marginLeft: 4,
  },

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -50,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  // Subjects
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  subjectChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1976D2',
  },
  subjectFee: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },

  // Availability
  availabilityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  availabilitySlot: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityDay: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  availabilityTime: {
    fontSize: 12,
    color: '#666',
  },

  // Banners
  incompleteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F57C00',
  },
  incompleteBannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  incompleteBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  incompleteBannerText: {
    fontSize: 12,
    color: '#F57C00',
    marginTop: 2,
  },
  completeBannerBtn: {
    backgroundColor: '#F57C00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  completeBannerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  rejectedBannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  rejectedBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C62828',
  },
  rejectedBannerText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 2,
  },
  resubmitBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resubmitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Content
  content: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  menuIconContainer: {
    width: 32,
    marginRight: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  deleteText: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
  },
  logoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoutCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  logoutIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoutTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#10284C',
  },
  logoutMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
  },
  logoutActions: {
    marginTop: 18,
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  cancelBtnText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default TeacherProfileSettings;


