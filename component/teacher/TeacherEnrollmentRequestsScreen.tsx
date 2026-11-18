import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEnrollment } from '../../hooks/useEnrollment';

interface EnrollmentRequest {
  id: string;
  student_id: number;
  student?: {
    id: number;
    full_name: string;
    grade_level?: string;
    phone?: string;
  };
  teacher_subject_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  teacher_subject: {
    id: number;
    teacher_id: number;
    subject_id: number;
    level_id?: number;
    fee_per_month: number;
    is_active: boolean;
    subject: {
      id: number;
      name: string;
      description?: string;
    };
  };
}

interface TeacherEnrollmentRequestsScreenProps {
  onBack: () => void;
}

const TeacherEnrollmentRequestsScreen: React.FC<TeacherEnrollmentRequestsScreenProps> = ({
  onBack,
}) => {
  const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState<{[key: string]: boolean}>({});
  const [rejecting, setRejecting] = useState<{[key: string]: boolean}>({});
  const [token, setToken] = useState('');

  const {
    loadingTeacherSubjects,
    error: enrollmentError,
    getPendingEnrollments,
    approveEnrollment,
    rejectEnrollment,
  } = useEnrollment();

  useEffect(() => {
    loadTokenAndFetchEnrollments();
  }, []);

  const loadTokenAndFetchEnrollments = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('access_token');
      if (accessToken) {
        setToken(accessToken);
      }
      await fetchPendingEnrollments();
    } catch (error) {
      console.error('[TeacherEnrollments] Error loading:', error);
    }
  };

  const fetchPendingEnrollments = async () => {
    setLoading(true);
    try {
      const requests = await getPendingEnrollments();
      setEnrollmentRequests(requests || []);
    } catch (error: any) {
      console.error('[TeacherEnrollments] Error fetching enrollments:', error);
      Alert.alert('Error', 'Failed to load enrollment requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchPendingEnrollments();
    } finally {
      setRefreshing(false);
    }
  };

  const handleApproveEnrollment = async (enrollmentId: string, studentName: string) => {
    setApproving(prev => ({ ...prev, [enrollmentId]: true }));
    try {
      await approveEnrollment(enrollmentId);
      Alert.alert('Success', `Enrollment approved for ${studentName}`);
      // Remove from list
      setEnrollmentRequests(prev => prev.filter(r => r.id !== enrollmentId));
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to approve enrollment';
      Alert.alert('Error', errorMsg);
    } finally {
      setApproving(prev => ({ ...prev, [enrollmentId]: false }));
    }
  };

  const handleRejectEnrollment = async (enrollmentId: string, studentName: string) => {
    Alert.alert(
      'Confirm Rejection',
      `Are you sure you want to reject the enrollment request from ${studentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setRejecting(prev => ({ ...prev, [enrollmentId]: true }));
            try {
              await rejectEnrollment(enrollmentId);
              Alert.alert('Success', `Enrollment rejected for ${studentName}`);
              // Remove from list
              setEnrollmentRequests(prev => prev.filter(r => r.id !== enrollmentId));
            } catch (error: any) {
              const errorMsg = error?.message || 'Failed to reject enrollment';
              Alert.alert('Error', errorMsg);
            } finally {
              setRejecting(prev => ({ ...prev, [enrollmentId]: false }));
            }
          },
        },
      ]
    );
  };

  const renderEnrollmentCard = ({ item }: { item: EnrollmentRequest }) => {
    const isApproving = approving[item.id];
    const isRejecting = rejecting[item.id];
    const isProcessing = isApproving || isRejecting;

    return (
      <View style={styles.enrollmentCard}>
        {/* Header with Student Info */}
        <View style={styles.cardHeader}>
          <View style={styles.studentInfo}>
            <View style={styles.studentAvatar}>
              <Text style={styles.avatarText}>
                {item.student?.full_name?.[0]?.toUpperCase() || 'S'}
              </Text>
            </View>
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{item.student?.full_name || 'Unknown Student'}</Text>
              {item.student?.grade_level && (
                <Text style={styles.studentGrade}>Grade: {item.student.grade_level}</Text>
              )}
              {item.student?.phone && (
                <Text style={styles.studentPhone}>📱 {item.student.phone}</Text>
              )}
            </View>
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Requested</Text>
            <Text style={styles.dateValue}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Subject Info */}
        <View style={styles.subjectSection}>
          <View style={styles.subjectCard}>
            <Text style={styles.subjectName}>
              📚 {item.teacher_subject.subject.name}
            </Text>
            {item.teacher_subject.subject.description && (
              <Text style={styles.subjectDescription}>
                {item.teacher_subject.subject.description}
              </Text>
            )}
          </View>
          
          {/* Fee Info */}
          <View style={styles.feeContainer}>
            <Text style={styles.feeLabel}>Monthly Fee</Text>
            <Text style={styles.feeAmount}>Rs. {item.teacher_subject.fee_per_month}</Text>
          </View>

          {/* Level Info */}
          {item.teacher_subject.level_id && (
            <View style={styles.levelContainer}>
              <Text style={styles.levelLabel}>Level ID: {item.teacher_subject.level_id}</Text>
            </View>
          )}
        </View>

        {/* Status Badge */}
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, styles.statusPending]}>
            <Text style={styles.statusText}>⏳ PENDING</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.rejectButton,
              isProcessing && styles.buttonDisabled,
            ]}
            onPress={() => handleRejectEnrollment(item.id, item.student?.full_name || 'Student')}
            disabled={isProcessing}
          >
            {isRejecting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.rejectButtonText}>❌ Reject</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.approveButton,
              isProcessing && styles.buttonDisabled,
            ]}
            onPress={() => handleApproveEnrollment(item.id, item.student?.full_name || 'Student')}
            disabled={isProcessing}
          >
            {isApproving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.approveButtonText}>✅ Approve</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar backgroundColor="#10284C" barStyle="light-content" translucent={false} />
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Enrollment Requests</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
        <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E88E5" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const pendingRequests = enrollmentRequests.filter(r => r.status === 'pending');

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor="#10284C" barStyle="light-content" translucent={false} />
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Enrollment Requests</Text>
          <View style={[styles.headerSpacer, styles.badgeContainer]}>
            {pendingRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
        {/* Content */}
        {pendingRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Pending Requests</Text>
            <Text style={styles.emptyText}>
              You don't have any enrollment requests at the moment
            </Text>
          </View>
        ) : (
          <FlatList
            data={pendingRequests}
            keyExtractor={item => item.id}
            renderItem={renderEnrollmentCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

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
  header: {
    backgroundColor: '#10284C',
    paddingHorizontal: 20,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#FFFFFF',
    marginRight: 4,
  },
  backText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 50,
    alignItems: 'flex-end',
  },
  badgeContainer: {
    alignItems: 'flex-end',
  },
  badge: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },

  enrollmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },

  studentInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },

  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },

  studentDetails: {
    flex: 1,
  },

  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },

  studentGrade: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },

  studentPhone: {
    fontSize: 12,
    color: '#999999',
  },

  dateContainer: {
    alignItems: 'flex-end',
  },

  dateLabel: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 2,
  },

  dateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },

  subjectSection: {
    marginBottom: 16,
  },

  subjectCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  subjectName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },

  subjectDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },

  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginBottom: 8,
  },

  feeLabel: {
    fontSize: 13,
    color: '#666666',
  },

  feeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },

  levelContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3E5F5',
    borderRadius: 8,
  },

  levelLabel: {
    fontSize: 12,
    color: '#6A1B9A',
  },

  statusBadgeContainer: {
    marginBottom: 12,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  statusPending: {
    backgroundColor: '#FFF3E0',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
  },

  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },

  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  approveButton: {
    backgroundColor: '#28a745',
  },

  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  rejectButton: {
    backgroundColor: '#DC3545',
    borderWidth: 1,
    borderColor: '#DC3545',
  },

  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});

export default TeacherEnrollmentRequestsScreen;
