import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getAdminTeacherById,
  approveTeacher,
  rejectTeacher,
  suspendTeacher,
} from '../../api/admin';
import type { TeacherDetailResponse } from '../../api/teacher/types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ADMIN_COLORS, ADMIN_SPACING, ADMIN_SHADOW, ADMIN_RADII } from './adminTheme';

interface TeacherApprovalScreenProps {
  teacherId: number;
  onBack?: () => void;
  onApprovalComplete?: () => void;
}

type ModalType = 'reject' | 'suspend' | null;

const TeacherApprovalScreen: React.FC<TeacherApprovalScreenProps> = ({
  teacherId,
  onBack,
  onApprovalComplete,
}) => {
  const [teacher, setTeacher] = useState<TeacherDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadTeacher();
  }, [teacherId]);

  const loadTeacher = async () => {
    setLoading(true);
    try {
      const data = await getAdminTeacherById(teacherId);
      setTeacher(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load teacher details');
      onBack?.();
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!teacher) return;

    if (!teacher.is_profile_complete) {
      Alert.alert('Error', 'Cannot approve teacher with incomplete profile');
      return;
    }

    Alert.alert(
      'Approve Teacher',
      `Are you sure you want to approve ${teacher.full_name}?\n\nThey will become visible to students immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setProcessing(true);
            try {
              await approveTeacher(teacherId);
              Alert.alert(
                'Success',
                `${teacher.full_name} has been approved successfully!`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      onApprovalComplete?.();
                      onBack?.();
                    },
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve teacher');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectConfirm = async () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Please enter a rejection reason');
      return;
    }

    if (!teacher) return;

    setProcessing(true);
    try {
      await rejectTeacher(teacherId, reason);
      Alert.alert(
        'Success',
        `${teacher.full_name} has been rejected.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onApprovalComplete?.();
              onBack?.();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject teacher');
    } finally {
      setProcessing(false);
      setModalType(null);
      setReason('');
    }
  };

  const handleSuspendConfirm = async () => {
    if (!teacher) return;

    setProcessing(true);
    try {
      await suspendTeacher(teacherId, reason || undefined);
      Alert.alert(
        'Success',
        `${teacher.full_name} has been suspended.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onApprovalComplete?.();
              onBack?.();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to suspend teacher');
    } finally {
      setProcessing(false);
      setModalType(null);
      setReason('');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      incomplete: '#FFA500',
      pending_approval: '#FFD700',
      approved: '#4CAF50',
      rejected: '#F44336',
      suspended: '#9E9E9E',
    };
    return colors[status] || '#757575';
  };

  const openDocument = (url: string | null | undefined) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open document. The URL may be invalid.');
      });
    } else {
      Alert.alert('No Document', 'This document has not been uploaded yet.');
    }
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      incomplete: '⚠️',
      pending_approval: '⏳',
      approved: '✅',
      rejected: '❌',
      suspended: '🚫',
    };
    return icons[status] || '❓';
  };

  if (loading) {
    return (
      <SafeAreaView edges={[]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ADMIN_COLORS.accent} />
          <Text style={styles.loadingText}>Loading teacher details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!teacher) {
    return (
      <SafeAreaView edges={[]} style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Teacher not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={[]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teacher Approval</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Alert */}
        <View style={[styles.statusAlert, { backgroundColor: getStatusColor(teacher.profile_status) + '20' }]}>
          <Text style={styles.statusAlertIcon}>{getStatusIcon(teacher.profile_status)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusAlertTitle}>Current Status</Text>
            <Text style={[styles.statusAlertText, { color: getStatusColor(teacher.profile_status) }]}>
              {teacher.profile_status?.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Profile Summary */}
        <View style={styles.profileCard}>
          <Image
            source={{
              uri: teacher.profile_picture || 'https://via.placeholder.com/80',
            }}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{teacher.full_name}</Text>
            <Text style={styles.profileDetail}>{teacher.phone}</Text>
            <Text style={styles.profileDetail}>{teacher.city?.name}</Text>
          </View>
        </View>

        {/* Checklist for Approval */}
        <View style={styles.checklistCard}>
          <Text style={styles.checklistTitle}>✅ Approval Checklist</Text>

          <CheckItem
            icon={teacher.is_profile_complete ? '✓' : '✗'}
            label="Profile Complete"
            status={teacher.is_profile_complete ? 'complete' : 'incomplete'}
          />

          <CheckItem
            icon={teacher.degree_certificate ? '✓' : '✗'}
            label="Degree Certificate"
            status={teacher.degree_certificate ? 'complete' : 'incomplete'}
          />

          <CheckItem
            icon={teacher.cnic ? '✓' : '✗'}
            label="CNIC Verified"
            status={teacher.cnic ? 'complete' : 'incomplete'}
          />

          <CheckItem
            icon={teacher.subjects && teacher.subjects.length > 0 ? '✓' : '✗'}
            label="Subjects Added"
            status={teacher.subjects && teacher.subjects.length > 0 ? 'complete' : 'incomplete'}
          />

          <CheckItem
            icon={teacher.availability && teacher.availability.length > 0 ? '✓' : '✗'}
            label="Availability Set"
            status={teacher.availability && teacher.availability.length > 0 ? 'complete' : 'incomplete'}
          />
        </View>

        {/* Qualifications Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>🎓 Qualifications</Text>
          <InfoRow label="Qualification" value={teacher.highest_qualification} />
          <InfoRow label="Institute" value={teacher.institute} />
          <InfoRow label="Experience" value={`${teacher.experience_years || 0} years`} />
        </View>

        {/* Teaching Details Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>🎯 Teaching Details</Text>
          <InfoRow label="Teaching Mode" value={teacher.teaching_mode} />
          <InfoRow label="Session Type" value={teacher.session_type} />
          <InfoRow label="Subjects" value={`${teacher.subjects?.length || 0} subjects`} />
          <InfoRow label="Availability Slots" value={`${teacher.availability?.length || 0} slots`} />
        </View>

        {/* Location Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>📍 Location</Text>
          <InfoRow label="City" value={teacher.city?.name} />
          <InfoRow label="Area" value={teacher.area} />
          <InfoRow
            label="Teaching Radius"
            value={teacher.physical_teaching_radius ? `${teacher.physical_teaching_radius} km` : 'Online only'}
          />
        </View>

        {/* Verification Documents Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>📄 Verification Documents</Text>
          
          {/* CNIC Information */}
          {teacher.cnic && (
            <View style={styles.documentSection}>
              <InfoRow label="CNIC Number" value={teacher.cnic} />
              <TouchableOpacity
                style={[
                  styles.documentButton,
                  !teacher.cnic_image && styles.documentButtonDisabled,
                ]}
                onPress={() => openDocument(teacher.cnic_image)}
                disabled={!teacher.cnic_image}>
                <Text style={styles.documentButtonIcon}>📷</Text>
                <Text style={styles.documentButtonText}>
                  {teacher.cnic_image ? 'View CNIC Image' : 'CNIC Image Not Uploaded'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Degree Certificate */}
          <TouchableOpacity
            style={[
              styles.documentButton,
              !teacher.degree_certificate && styles.documentButtonDisabled,
            ]}
            onPress={() => openDocument(teacher.degree_certificate)}
            disabled={!teacher.degree_certificate}>
            <Text style={styles.documentButtonIcon}>📜</Text>
            <Text style={styles.documentButtonText}>
              {teacher.degree_certificate ? 'View Degree Certificate' : 'Certificate Not Uploaded'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subjects List */}
        {teacher.subjects && teacher.subjects.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>📚 Subjects Offered</Text>
            {teacher.subjects.map((subject, idx) => (
              <View key={idx} style={styles.subjectItem}>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subject.subject?.name}</Text>
                  {subject.level && (
                    <Text style={styles.subjectLevel}>{subject.level.name}</Text>
                  )}
                </View>
                {subject.fee_per_month && (
                  <Text style={styles.subjectFee}>Rs. {subject.fee_per_month}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        {teacher.profile_status === 'pending_approval' && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApprove}
              disabled={processing || !teacher.is_profile_complete}>
              {processing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.actionButtonIcon}>✓</Text>
                  <Text style={styles.actionButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => {
                setReason('');
                setModalType('reject');
              }}
              disabled={processing}>
              <Text style={styles.actionButtonIcon}>✕</Text>
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {teacher.profile_status === 'approved' && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.suspendButton]}
              onPress={() => {
                setReason('');
                setModalType('suspend');
              }}
              disabled={processing}>
              <Text style={styles.actionButtonIcon}>🚫</Text>
              <Text style={styles.actionButtonText}>Suspend</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={modalType === 'reject'}
        animationType="slide"
        transparent
        onRequestClose={() => setModalType(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Teacher</Text>
            <Text style={styles.modalSubtitle}>
              Provide a reason for rejection. This will be communicated to the teacher.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter rejection reason (required)..."
              placeholderTextColor="#999"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!processing}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalType(null)}
                disabled={processing}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectModalButton]}
                onPress={handleRejectConfirm}
                disabled={processing || !reason.trim()}>
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Suspend Modal */}
      <Modal
        visible={modalType === 'suspend'}
        animationType="slide"
        transparent
        onRequestClose={() => setModalType(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Suspend Teacher</Text>
            <Text style={styles.modalSubtitle}>
              Provide a reason for suspension (optional).
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter suspension reason..."
              placeholderTextColor="#999"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!processing}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalType(null)}
                disabled={processing}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.suspendModalButton]}
                onPress={handleSuspendConfirm}
                disabled={processing}>
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Suspend</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || 'N/A'}</Text>
  </View>
);

const CheckItem = ({
  icon,
  label,
  status,
}: {
  icon: string;
  label: string;
  status: 'complete' | 'incomplete';
}) => (
  <View style={[styles.checkItem, { backgroundColor: status === 'complete' ? '#E8F5E9' : '#FFEBEE' }]}>
    <Text style={[styles.checkIcon, { color: status === 'complete' ? '#4CAF50' : '#F44336' }]}>
      {icon}
    </Text>
    <Text style={[styles.checkLabel, { color: status === 'complete' ? '#2E7D32' : '#C62828' }]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.surfaceAlt,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ADMIN_COLORS.brand,
    paddingHorizontal: ADMIN_SPACING.lg,
    paddingVertical: ADMIN_SPACING.md,
    ...ADMIN_SHADOW,
  },
  backButton: {
    padding: ADMIN_SPACING.sm,
  },
  backArrow: {
    fontSize: 24,
    color: ADMIN_COLORS.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ADMIN_COLORS.surface,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: ADMIN_SPACING.md,
    paddingTop: ADMIN_SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: ADMIN_SPACING.md,
    fontSize: 14,
    color: ADMIN_COLORS.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: ADMIN_COLORS.textMuted,
  },
  statusAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.info + '20',
    borderRadius: ADMIN_RADII.card,
    padding: ADMIN_SPACING.md,
    marginBottom: ADMIN_SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: ADMIN_COLORS.info,
  },
  statusAlertIcon: {
    fontSize: 28,
    marginRight: ADMIN_SPACING.md,
  },
  statusAlertTitle: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 2,
  },
  statusAlertText: {
    fontSize: 14,
    fontWeight: '700',
    color: ADMIN_COLORS.info,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: ADMIN_RADII.card,
    padding: ADMIN_SPACING.lg,
    marginBottom: ADMIN_SPACING.md,
    ...ADMIN_SHADOW,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ADMIN_COLORS.surfaceAlt,
    marginRight: ADMIN_SPACING.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
    marginBottom: ADMIN_SPACING.sm,
  },
  profileDetail: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginTop: ADMIN_SPACING.xs,
  },
  checklistCard: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: ADMIN_RADII.card,
    padding: ADMIN_SPACING.lg,
    marginBottom: ADMIN_SPACING.md,
    ...ADMIN_SHADOW,
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ADMIN_COLORS.brand,
    marginBottom: ADMIN_SPACING.md,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.sm,
    borderRadius: ADMIN_RADII.input,
    marginBottom: ADMIN_SPACING.sm,
  },
  checkIcon: {
    fontSize: 18,
    marginRight: ADMIN_SPACING.md,
  },
  checkLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: ADMIN_COLORS.text,
  },
  infoCard: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: ADMIN_RADII.card,
    padding: ADMIN_SPACING.lg,
    marginBottom: ADMIN_SPACING.md,
    ...ADMIN_SHADOW,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ADMIN_COLORS.brand,
    marginBottom: ADMIN_SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ADMIN_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.surfaceAlt,
  },
  infoLabel: {
    fontSize: 13,
    color: ADMIN_COLORS.textMuted,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: ADMIN_COLORS.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  subjectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ADMIN_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.surfaceAlt,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
  },
  subjectLevel: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
    marginTop: ADMIN_SPACING.xs,
  },
  subjectFee: {
    fontSize: 13,
    color: ADMIN_COLORS.success,
    fontWeight: '600',
  },
  documentSection: {
    backgroundColor: ADMIN_COLORS.brandSoft,
    borderRadius: ADMIN_RADII.input,
    padding: ADMIN_SPACING.md,
    marginBottom: ADMIN_SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: ADMIN_COLORS.success,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: ADMIN_COLORS.accent,
  },
  documentButtonDisabled: {
    opacity: 0.6,
    borderLeftColor: '#CCCCCC',
  },
  documentButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  documentButtonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  suspendButton: {
    backgroundColor: '#9E9E9E',
  },
  actionButtonIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 19,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#333',
    marginBottom: 20,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  rejectModalButton: {
    backgroundColor: '#F44336',
  },
  suspendModalButton: {
    backgroundColor: '#9E9E9E',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default TeacherApprovalScreen;
