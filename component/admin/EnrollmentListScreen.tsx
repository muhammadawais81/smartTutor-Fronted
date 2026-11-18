import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ADMIN_COLORS, ADMIN_SPACING, ADMIN_SHADOW, ADMIN_RADII } from './adminTheme';
import { getAdminEnrollments, approveAdminEnrollment, rejectAdminEnrollment, getAdminTeacherEnrolledStudents } from '../../api/admin/adminApi';
import { EnrollmentResponse, AdminStatusFilter } from '../../api/admin/types';

interface EnrollmentListScreenProps {
  onBack?: () => void;
}

interface EnrollmentItem extends EnrollmentResponse {
  key: string;
}

const EnrollmentListScreen: React.FC<EnrollmentListScreenProps> = ({ onBack }) => {
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter | ''>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [actionModal, setActionModal] = useState<{
    visible: boolean;
    enrollmentId?: number;
    action?: 'approve' | 'reject';
    reason?: string;
  }>({ visible: false });
  const [teacherStudents, setTeacherStudents] = useState<any[]>([]);

  const STATUS_OPTIONS: Array<'pending' | 'approved' | 'rejected'> = [
    'pending',
    'approved',
    'rejected',
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminEnrollments({ limit: 200, skip: 0 });

      const rawEnrollments: any[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.data)
          ? (data as any).data
          : Array.isArray((data as any)?.results)
            ? (data as any).results
            : Array.isArray((data as any)?.enrollments)
              ? (data as any).enrollments
              : [];

      const enrollmentsWithKeys = rawEnrollments.map((e: any, idx: number) => ({
        ...e,
        key: `enrollment-${e.id || e._id || idx}`,
      }));
      setEnrollments(enrollmentsWithKeys);
      applyFilters(enrollmentsWithKeys, searchQuery, statusFilter, selectedTeacherId);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyFilters = (data: EnrollmentItem[], query: string, status: AdminStatusFilter | '', teacherId: number | null = null) => {
    let filtered = data;

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.teacher_subject?.teacher?.user?.name?.toLowerCase().includes(q) ||
          e.teacher_subject?.subject?.name?.toLowerCase().includes(q) ||
          e.student?.full_name?.toLowerCase().includes(q) ||
          e.teacher_subject?.subject?.level?.toString().includes(q)
      );
    }

    if (status) {
      filtered = filtered.filter(e => e.status === status);
    }

    if (teacherId) {
      filtered = filtered.filter(e => e.teacher_subject?.teacher_id === teacherId);
    }

    setFilteredEnrollments(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(enrollments, text, statusFilter, selectedTeacherId);
  };

  const handleStatusFilter = (status: AdminStatusFilter | '') => {
    const newStatus = statusFilter === status ? '' : status;
    setStatusFilter(newStatus);
    applyFilters(enrollments, searchQuery, newStatus, selectedTeacherId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return ADMIN_COLORS.success;
      case 'pending':
      case 'pending_approval':
        return ADMIN_COLORS.warning;
      case 'rejected':
        return ADMIN_COLORS.danger;
      default:
        return ADMIN_COLORS.textMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_approval':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const handleActionApprove = async (enrollmentId: number) => {
    Alert.alert(
      'Approve Enrollment',
      'Are you sure you want to approve this enrollment?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approveAdminEnrollment(String(enrollmentId));
              Alert.alert('Success', 'Enrollment approved successfully');
              await loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve enrollment');
            }
          },
          style: 'default',
        },
      ]
    );
  };

  const handleActionReject = async (enrollmentId: number) => {
    setActionModal({
      visible: true,
      enrollmentId,
      action: 'reject',
      reason: '',
    });
  };

  const handleRejectSubmit = async () => {
    if (!actionModal.reason?.trim()) {
      Alert.alert('Required', 'Please enter a rejection reason');
      return;
    }

    try {
      if (actionModal.enrollmentId) {
        await rejectAdminEnrollment(String(actionModal.enrollmentId));
        Alert.alert('Success', 'Enrollment rejected successfully');
      }
      setActionModal({ visible: false });
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject enrollment');
    }
  };

  const renderEnrollmentCard = ({ item }: { item: EnrollmentItem }) => {
    const teacher = item.teacher_subject?.teacher?.user;
    const subject = item.teacher_subject?.subject;
    const student = item.student?.user;
    const isPending = item.status === 'pending_approval';

    return (
      <View style={styles.enrollmentCard}>
        {/* Header with Status */}
        <View style={styles.cardHeader}>
          <View style={styles.headerContent}>
            <Text style={styles.studentName}>{student?.name || 'Unknown Student'}</Text>
            <View style={styles.headerSubtitle}>
              <MaterialCommunityIcons
                name="book-outline"
                size={12}
                color={ADMIN_COLORS.textMuted}
              />
              <Text style={styles.subjectName}>{subject?.name || 'N/A'}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusBadgeText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          {/* Teacher Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoPair}>
              <MaterialCommunityIcons
                name="account-tie"
                size={14}
                color={ADMIN_COLORS.brand}
              />
              <Text style={styles.infoLabel}>Teacher</Text>
            </View>
            <Text style={styles.infoValue}>{teacher?.name || 'N/A'}</Text>
          </View>

          {/* Subject & Level */}
          <View style={styles.rowInfo}>
            <View style={styles.infoPairSmall}>
              <Text style={styles.infoLabel}>Level</Text>
              <Text style={styles.infoValue}>{subject?.level || 'N/A'}</Text>
            </View>
            <View style={styles.infoPairSmall}>
              <Text style={styles.infoLabel}>Fee</Text>
              <Text style={[styles.infoValue, { color: ADMIN_COLORS.success }]}>
                Rs. {subject?.fee || '0'}
              </Text>
            </View>
          </View>

          {/* Fee Status */}
          {item.teacher_subject?.fee_paid && (
            <View style={styles.feeStatus}>
              <MaterialCommunityIcons
                name="check-circle"
                size={14}
                color={ADMIN_COLORS.success}
              />
              <Text style={styles.feeStatusText}>Fee Paid</Text>
            </View>
          )}
        </View>

          {/* Actions (Only show for Pending) */}
        {isPending && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleActionApprove(item.id)}
            >
              <MaterialCommunityIcons
                name="check"
                size={16}
                color={ADMIN_COLORS.surface}
              />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleActionReject(item.id)}
            >
              <MaterialCommunityIcons
                name="close"
                size={16}
                color={ADMIN_COLORS.surface}
              />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const openTeacherStudents = async (teacherId: number) => {
    setSelectedTeacherId(teacherId);
    try {
      const students = await getAdminTeacherEnrolledStudents(teacherId, { limit: 200, skip: 0 });
      const raw = Array.isArray(students) ? students : (students as any).data || [];
      setTeacherStudents(raw);
    } catch (err) {
      console.log('[Enrollments] failed to load enrolled students', err);
      Alert.alert('Error', 'Failed to load enrolled students for teacher');
    }
  };

  // Get unique teachers from enrollments
  const getUniqueTeachers = () => {
    const teacherMap = new Map();
    enrollments.forEach(e => {
      const teacher = e.teacher_subject?.teacher;
      const teacherId = e.teacher_subject?.teacher_id;
      if (teacherId && !teacherMap.has(teacherId)) {
        teacherMap.set(teacherId, {
          id: teacherId,
          name: teacher?.user?.name || teacher?.name || `Teacher ${teacherId}`,
        });
      }
    });
    return Array.from(teacherMap.values());
  };

  const teachers = getUniqueTeachers();

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="school-outline"
        size={60}
        color={ADMIN_COLORS.textMuted}
      />
      <Text style={styles.emptyTitle}>No Enrollments Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || statusFilter ? 'Try adjusting your filters' : 'No enrollments yet'}
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ADMIN_COLORS.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={ADMIN_COLORS.surface}
            />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Enrollments</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={ADMIN_COLORS.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search student, teacher, subject..."
          placeholderTextColor={ADMIN_COLORS.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={ADMIN_COLORS.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {/* Teachers Row */}
      <View style={{ paddingHorizontal: ADMIN_SPACING.md, paddingVertical: ADMIN_SPACING.sm }}>
        <Text style={styles.filterLabel}>Filter by Teacher</Text>
        <FlatList
          data={teachers}
          horizontal
          keyExtractor={(t, idx) => `teacher-${t.id || idx}`}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: teacher }) => (
            <TouchableOpacity
              style={[
                styles.teacherBadge,
                selectedTeacherId === teacher.id && { backgroundColor: ADMIN_COLORS.brand },
              ]}
              onPress={() => {
                if (selectedTeacherId === teacher.id) {
                  setSelectedTeacherId(null);
                  applyFilters(enrollments, searchQuery, statusFilter, null);
                } else {
                  openTeacherStudents(teacher.id);
                  applyFilters(enrollments, searchQuery, statusFilter, teacher.id);
                }
              }}
            >
              <Text
                style={[
                  styles.teacherBadgeText,
                  selectedTeacherId === teacher.id && { color: ADMIN_COLORS.surface },
                ]}
              >
                {teacher.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Status Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by Status:</Text>
        <View style={styles.filterButtons}>
          {STATUS_OPTIONS.map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                statusFilter === status && styles.filterButtonActive,
                { borderColor: getStatusColor(status) },
              ]}
              onPress={() => handleStatusFilter(status)}
            >
              <View
                style={[
                  styles.filterButtonDot,
                  { backgroundColor: getStatusColor(status) },
                ]}
              />
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === status && styles.filterButtonTextActive,
                ]}
              >
                {getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {statusFilter && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setStatusFilter('');
              applyFilters(enrollments, searchQuery, '');
            }}
          >
            <Text style={styles.clearButtonText}>Clear Filter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Enrollment List */}
      <FlatList
        data={filteredEnrollments}
        renderItem={renderEnrollmentCard}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ADMIN_COLORS.brand}
          />
        }
      />
{/* Teacher Enrolled Students Modal */}
      <Modal
        visible={selectedTeacherId !== null && teacherStudents.length > 0}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          setSelectedTeacherId(null);
          setTeacherStudents([]);
        }}
      >
        <View style={{flex:1, backgroundColor: ADMIN_COLORS.surfaceAlt}}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSelectedTeacherId(null);
                setTeacherStudents([]);
                applyFilters(enrollments, searchQuery, statusFilter, null);
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={ADMIN_COLORS.surface} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Enrolled Students</Text>
            <View style={{width:40}} />
          </View>

          {teacherStudents.length === 0 ? (
            <View style={styles.centerContainer}><Text style={{color: ADMIN_COLORS.textMuted}}>No enrolled students</Text></View>
          ) : (
            <FlatList
              data={teacherStudents}
              keyExtractor={(s, idx) => `tstudent-${s.enrollment_id || s.student_id || s.user_id || idx}`}
              renderItem={({item}) => {
                const status = item.status || 'pending';
                const statusColor = status === 'approved' ? ADMIN_COLORS.success : status === 'rejected' ? ADMIN_COLORS.danger : ADMIN_COLORS.warning;
                return (
                  <View style={styles.studentRow}>
                    <View style={{flex:1}}>
                      <Text style={styles.studentNameText}>{item.student?.full_name || item.full_name || 'Student'}</Text>
                      <Text style={{color: ADMIN_COLORS.textMuted, fontSize: 12}}>{item.teacher_subject?.subject?.name || ''}</Text>
                    </View>
                    <View style={[{paddingHorizontal: ADMIN_SPACING.sm, paddingVertical: ADMIN_SPACING.xs, borderRadius: ADMIN_RADII.pill, backgroundColor: statusColor}]}>
                      <Text style={{color: ADMIN_COLORS.surface, fontSize: 10, fontWeight: '600'}}>{status}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        visible={actionModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModal({ visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rejection Reason</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejecting this enrollment:
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              placeholderTextColor={ADMIN_COLORS.textMuted}
              multiline
              numberOfLines={4}
              value={actionModal.reason || ''}
              onChangeText={text =>
                setActionModal(prev => ({ ...prev, reason: text }))
              }
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setActionModal({ visible: false })}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSubmit}
                onPress={handleRejectSubmit}
              >
                <Text style={styles.modalButtonSubmitText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.surfaceAlt,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: ADMIN_COLORS.brand,
    paddingHorizontal: ADMIN_SPACING.lg,
    paddingVertical: ADMIN_SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...ADMIN_SHADOW,
  },
  backButton: {
    padding: ADMIN_SPACING.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ADMIN_COLORS.surface,
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.surface,
    marginHorizontal: ADMIN_SPACING.md,
    marginVertical: ADMIN_SPACING.md,
    paddingHorizontal: ADMIN_SPACING.sm,
    borderRadius: ADMIN_RADII.input,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.surfaceAlt,
  },
  searchIcon: {
    marginRight: ADMIN_SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: ADMIN_SPACING.sm,
    fontSize: 14,
    color: ADMIN_COLORS.text,
  },
  filterSection: {
    backgroundColor: ADMIN_COLORS.surface,
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.surfaceAlt,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textMuted,
    marginBottom: ADMIN_SPACING.sm,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ADMIN_SPACING.sm,
    paddingVertical: ADMIN_SPACING.xs,
    marginHorizontal: 2,
    borderRadius: ADMIN_RADII.input,
    borderWidth: 1.5,
    borderColor: ADMIN_COLORS.surfaceAlt,
    backgroundColor: ADMIN_COLORS.surface,
  },
  filterButtonActive: {
    backgroundColor: ADMIN_COLORS.brand + '20',
    borderColor: ADMIN_COLORS.brand,
  },
  filterButtonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: ADMIN_SPACING.xs,
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: ADMIN_COLORS.textMuted,
    flex: 1,
  },
  filterButtonTextActive: {
    color: ADMIN_COLORS.text,
    fontWeight: '600',
  },
  clearButton: {
    marginTop: ADMIN_SPACING.sm,
  },
  clearButtonText: {
    fontSize: 12,
    color: ADMIN_COLORS.danger,
    fontWeight: '600',
  },
  listContent: {
    padding: ADMIN_SPACING.md,
    paddingBottom: ADMIN_SPACING.lg,
  },
  enrollmentCard: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: ADMIN_RADII.card,
    marginBottom: ADMIN_SPACING.md,
    overflow: 'hidden',
    ...ADMIN_SHADOW,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.surfaceAlt,
  },
  headerContent: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: ADMIN_COLORS.text,
    marginBottom: 6,
  },
  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: 4,
    borderRadius: ADMIN_RADII.pill,
    marginLeft: ADMIN_SPACING.md,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: ADMIN_COLORS.surface,
  },
  cardBody: {
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.md,
  },
  infoSection: {
    marginBottom: ADMIN_SPACING.md,
  },
  infoPair: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ADMIN_SPACING.xs,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.textMuted,
    marginLeft: ADMIN_SPACING.xs,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: ADMIN_COLORS.text,
  },
  rowInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: ADMIN_SPACING.md,
  },
  infoPairSmall: {
    flex: 1,
  },
  feeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ADMIN_SPACING.md,
    paddingTop: ADMIN_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.surfaceAlt,
  },
  feeStatusText: {
    fontSize: 12,
    color: ADMIN_COLORS.success,
    fontWeight: '600',
    marginLeft: ADMIN_SPACING.xs,
  },
  cardActions: {
    flexDirection: 'row',
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.md,
    backgroundColor: ADMIN_COLORS.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.surfaceAlt,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ADMIN_SPACING.sm,
    marginHorizontal: ADMIN_SPACING.xs,
    borderRadius: ADMIN_RADII.input,
  },
  approveButton: {
    backgroundColor: ADMIN_COLORS.success,
  },
  rejectButton: {
    backgroundColor: ADMIN_COLORS.danger,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.surface,
    marginLeft: ADMIN_SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ADMIN_SPACING.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ADMIN_COLORS.text,
    marginTop: ADMIN_SPACING.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: ADMIN_COLORS.textMuted,
    marginTop: ADMIN_SPACING.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: ADMIN_RADII.card,
    padding: ADMIN_SPACING.lg,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ADMIN_COLORS.text,
    marginBottom: ADMIN_SPACING.sm,
  },
  modalSubtitle: {
    fontSize: 13,
    color: ADMIN_COLORS.textMuted,
    marginBottom: ADMIN_SPACING.md,
  },
  reasonInput: {
    backgroundColor: ADMIN_COLORS.surfaceAlt,
    borderRadius: ADMIN_RADII.input,
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.md,
    fontSize: 13,
    color: ADMIN_COLORS.text,
    marginBottom: ADMIN_SPACING.lg,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    gap: ADMIN_SPACING.md,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: ADMIN_SPACING.md,
    borderRadius: ADMIN_RADII.input,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.textMuted,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
  },
  modalButtonSubmit: {
    flex: 1,
    paddingVertical: ADMIN_SPACING.md,
    borderRadius: ADMIN_RADII.input,
    backgroundColor: ADMIN_COLORS.danger,
    alignItems: 'center',
  },
  modalButtonSubmitText: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.surface,
  },
  teacherBadge: {
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.xs,
    marginRight: ADMIN_SPACING.sm,
    borderRadius: ADMIN_RADII.pill,
    backgroundColor: ADMIN_COLORS.surface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.surfaceAlt,
  },
  teacherBadgeText: {
    color: ADMIN_COLORS.text,
    fontWeight: '600',
  },
  studentRow: {
    paddingVertical: ADMIN_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.surfaceAlt,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentNameText: { color: ADMIN_COLORS.text, fontWeight: '600' },
});

export default EnrollmentListScreen;
