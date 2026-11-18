import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getMyTeacherProfile} from '../../api/teacher';
import type {TeacherDetailResponse, ProfileStatus} from '../../api/teacher/types';

// ==================== Types ====================

interface TeacherProfileStatusScreenProps {
  onNavigateToDashboard: () => void;
  onNavigateToEditProfile: () => void;
  onLogout: () => void;
}

interface StatusConfig {
  title: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  showEditButton: boolean;
  showDashboardButton: boolean;
}

// ==================== Constants ====================

const STATUS_CONFIG: Record<ProfileStatus, StatusConfig> = {
  incomplete: {
    title: 'Profile Incomplete',
    description:
      'Your profile is not complete. Please fill in all required information to submit for approval.',
    icon: '📝',
    color: '#F57C00',
    bgColor: '#FFF3E0',
    showEditButton: true,
    showDashboardButton: false,
  },
  pending_approval: {
    title: 'Pending Approval',
    description:
      'Your profile has been submitted and is under review. You will be notified once it is approved.',
    icon: '⏳',
    color: '#1976D2',
    bgColor: '#E3F2FD',
    showEditButton: false,
    showDashboardButton: false,
  },
  approved: {
    title: 'Profile Approved',
    description:
      'Congratulations! Your profile has been approved. You are now visible to students.',
    icon: '✅',
    color: '#388E3C',
    bgColor: '#E8F5E9',
    showEditButton: true,
    showDashboardButton: true,
  },
  rejected: {
    title: 'Profile Rejected',
    description:
      'Unfortunately, your profile was not approved. Please review the feedback and update your profile.',
    icon: '❌',
    color: '#D32F2F',
    bgColor: '#FFEBEE',
    showEditButton: true,
    showDashboardButton: false,
  },
  suspended: {
    title: 'Profile Suspended',
    description:
      'Your profile has been suspended. Please contact support for more information.',
    icon: '⚠️',
    color: '#616161',
    bgColor: '#F5F5F5',
    showEditButton: false,
    showDashboardButton: false,
  },
};

// ==================== Component ====================

const TeacherProfileStatusScreen: React.FC<TeacherProfileStatusScreenProps> = ({
  onNavigateToDashboard,
  onNavigateToEditProfile,
  onLogout,
}) => {
  const [profile, setProfile] = useState<TeacherDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setError(null);
      const data = await getMyTeacherProfile();
      setProfile(data);
    } catch (err: any) {
      console.error('[STATUS] Error loading profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProfile();
  };

  const getStatusConfig = (): StatusConfig => {
    if (!profile) {
      return STATUS_CONFIG.incomplete;
    }
    return STATUS_CONFIG[profile.profile_status] || STATUS_CONFIG.incomplete;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ==================== Render ====================

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <StatusBar backgroundColor="#10284C" barStyle="light-content" translucent={false} />
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile Status</Text>
          </View>
        </SafeAreaView>
        <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E88E5" />
            <Text style={styles.loadingText}>Loading profile status...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <StatusBar backgroundColor="#10284C" barStyle="light-content" translucent={false} />
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile Status</Text>
          </View>
        </SafeAreaView>
        <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const config = getStatusConfig();

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor="#10284C" barStyle="light-content" translucent={false} />
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile Status</Text>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#1E88E5']}
            />
          }>
        {/* Status Card */}
        <View style={[styles.statusCard, {backgroundColor: config.bgColor}]}>
          <Text style={styles.statusIcon}>{config.icon}</Text>
          <Text style={[styles.statusTitle, {color: config.color}]}>
            {config.title}
          </Text>
          <Text style={styles.statusDescription}>{config.description}</Text>
        </View>

        {/* Profile Summary */}
        {profile && (
          <View style={styles.profileCard}>
            <Text style={styles.sectionTitle}>Profile Summary</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{profile.full_name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profile.phone || 'Not set'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City</Text>
              <Text style={styles.infoValue}>
                {profile.city?.name || 'Not set'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teaching Mode</Text>
              <Text style={styles.infoValue}>
                {profile.teaching_mode?.charAt(0).toUpperCase() +
                  profile.teaching_mode?.slice(1) || 'Not set'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Subjects</Text>
              <Text style={styles.infoValue}>
                {profile.subjects?.length || 0} subject(s)
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Availability</Text>
              <Text style={styles.infoValue}>
                {profile.availability?.length || 0} time slot(s)
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Profile Complete</Text>
              <Text
                style={[
                  styles.infoValue,
                  {color: profile.is_profile_complete ? '#388E3C' : '#F57C00'},
                ]}>
                {profile.is_profile_complete ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        )}

        {/* Rejection Reason */}
        {profile?.profile_status === 'rejected' && profile.rejection_reason && (
          <View style={styles.rejectionCard}>
            <Text style={styles.rejectionTitle}>Rejection Reason</Text>
            <Text style={styles.rejectionReason}>{profile.rejection_reason}</Text>
          </View>
        )}

        {/* Approval Info */}
        {(profile?.profile_status === 'approved' ||
          profile?.profile_status === 'rejected') &&
          profile.approval_date && (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>
                {profile.profile_status === 'approved'
                  ? 'Approval Details'
                  : 'Review Details'}
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>
                  {formatDate(profile.approval_date)}
                </Text>
              </View>
            </View>
          )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {config.showEditButton && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onNavigateToEditProfile}>
              <Text style={styles.primaryButtonText}>
                {profile?.profile_status === 'incomplete'
                  ? 'Complete Profile'
                  : 'Edit Profile'}
              </Text>
            </TouchableOpacity>
          )}

          {config.showDashboardButton && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onNavigateToDashboard}>
              <Text style={styles.secondaryButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// ==================== Styles ====================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerSafeArea: {
    backgroundColor: '#10284C',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#10284C',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#10284C',
    paddingHorizontal: 20,
    height: 64,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statusCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  rejectionCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 8,
  },
  rejectionReason: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#10284C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#10284C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10284C',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
  },
});

export default TeacherProfileStatusScreen;
