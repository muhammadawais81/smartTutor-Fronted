import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAdminTeacherById } from '../../api/admin';
import type { TeacherDetailResponse } from '../../api/teacher/types';
import { ADMIN_COLORS, ADMIN_SPACING, ADMIN_SHADOW, ADMIN_RADII } from './adminTheme';

interface TeacherDetailScreenProps {
  teacherId: number;
  onBack?: () => void;
  onEdit?: (teacherId: number) => void;
}

const TeacherDetailScreen: React.FC<TeacherDetailScreenProps> = ({
  teacherId,
  onBack,
  onEdit,
}) => {
  const [teacher, setTeacher] = useState<TeacherDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeacherDetails();
  }, [teacherId]);

  const loadTeacherDetails = async () => {
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

  const openDocument = (url: string | null) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open document');
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      incomplete: '#FFA500',
      pending_approval: '#FFD700',
      approved: ADMIN_COLORS.success,
      rejected: ADMIN_COLORS.danger,
      suspended: '#9E9E9E',
    };
    return colors[status] || '#757575';
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
          <TouchableOpacity style={styles.errorButton} onPress={onBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Teacher Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={{
              uri: teacher.profile_picture || 'https://via.placeholder.com/100',
            }}
            style={styles.profileImage}
          />
          <Text style={styles.teacherName}>{teacher.full_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(teacher.profile_status) }]}>
            <Text style={styles.statusBadgeText}>
              {teacher.profile_status?.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
          {teacher.rating !== null && (
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Rating: </Text>
              <Text style={styles.ratingValue}>
                ⭐ {teacher.rating}/5 ({teacher.total_reviews} reviews)
              </Text>
            </View>
          )}
        </View>

        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Basic Information</Text>
          <InfoRow label="Phone" value={teacher.phone} />
          <InfoRow label="Gender" value={teacher.gender} />
          <InfoRow label="DOB" value={teacher.date_of_birth} />
          <InfoRow label="CNIC" value={teacher.cnic} />
          <InfoRow label="Active Students" value={teacher.total_students?.toString()} />
        </View>

        {/* Professional Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍💼 Professional Information</Text>
          <InfoRow label="Qualification" value={teacher.highest_qualification} />
          <InfoRow label="Institute" value={teacher.institute} />
          <InfoRow label="Experience" value={`${teacher.experience_years || 0} years`} />
          <InfoRow label="Teaching Mode" value={teacher.teaching_mode} />
          <InfoRow label="Session Type" value={teacher.session_type} />
        </View>

        {/* Location & Coverage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Location & Coverage</Text>
          <InfoRow label="City" value={teacher.city?.name} />
          <InfoRow label="Area" value={teacher.area} />
          <InfoRow
            label="Teaching Radius"
            value={teacher.physical_teaching_radius ? `${teacher.physical_teaching_radius} km` : 'N/A'}
          />
          {teacher.latitude && teacher.longitude && (
            <InfoRow
              label="Coordinates"
              value={`${teacher.latitude.toFixed(4)}, ${teacher.longitude.toFixed(4)}`}
            />
          )}
        </View>

        {/* Bio Section */}
        {teacher.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Biography</Text>
            <Text style={styles.bioText}>{teacher.bio}</Text>
          </View>
        )}

        {/* Subjects Section */}
        {teacher.subjects && teacher.subjects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Teaching Subjects</Text>
            {teacher.subjects.map((subject, idx) => (
              <View key={idx} style={styles.subjectCard}>
                <View style={styles.subjectHeader}>
                  <Text style={styles.subjectName}>{subject.subject?.name}</Text>
                  {subject.is_active && (
                    <View style={styles.activeIndicator}>
                      <Text style={styles.activeText}>Active</Text>
                    </View>
                  )}
                </View>
                {subject.level && (
                  <Text style={styles.subjectLevel}>{subject.level.name}</Text>
                )}
                {subject.fee_per_month && (
                  <Text style={styles.subjectFee}>
                    Rs. {subject.fee_per_month.toLocaleString()} / month
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Availability Section */}
        {teacher.availability && teacher.availability.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Availability</Text>
            {teacher.availability.map((avail, idx) => (
              <View key={idx} style={styles.availabilityItem}>
                <Text style={styles.availabilityDay}>
                  {getDayName(avail.day_of_week)}
                </Text>
                <Text style={styles.availabilityTime}>
                  {avail.start_time} - {avail.end_time}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Documents Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Verification Documents</Text>

          {/* CNIC Information */}
          {teacher.cnic && (
            <View style={styles.cnicSection}>
              <InfoRow label="CNIC Number" value={teacher.cnic} />
              <TouchableOpacity
                style={styles.docButton}
                onPress={() => openDocument(teacher.cnic_image)}
                disabled={!teacher.cnic_image}>
                <Text style={styles.docButtonIcon}>📷</Text>
                <View style={styles.docButtonContent}>
                  <Text style={styles.docButtonTitle}>CNIC Image</Text>
                  <Text style={styles.docButtonSubtitle}>
                    {teacher.cnic_image ? 'Click to view' : 'Not uploaded'}
                  </Text>
                </View>
                {teacher.cnic_image && <Text style={styles.docLink}>→</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Degree Certificate */}
          <TouchableOpacity
            style={styles.docButton}
            onPress={() => openDocument(teacher.degree_certificate)}
            disabled={!teacher.degree_certificate}>
            <Text style={styles.docButtonIcon}>📜</Text>
            <View style={styles.docButtonContent}>
              <Text style={styles.docButtonTitle}>Degree Certificate</Text>
              <Text style={styles.docButtonSubtitle}>
                {teacher.degree_certificate ? 'Click to view' : 'Not uploaded'}
              </Text>
            </View>
            {teacher.degree_certificate && <Text style={styles.docLink}>→</Text>}
          </TouchableOpacity>
        </View>

        {/* Approval History Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Approval History</Text>
          <InfoRow label="Approved By" value={teacher.approved_by?.toString() || 'N/A'} />
          <InfoRow
            label="Approval Date"
            value={
              teacher.approval_date
                ? new Date(teacher.approval_date).toLocaleDateString()
                : 'N/A'
            }
          />
          {teacher.rejection_reason && (
            <View style={styles.rejectionReasonBox}>
              <Text style={styles.rejectionReasonLabel}>Rejection Reason:</Text>
              <Text style={styles.rejectionReasonText}>{teacher.rejection_reason}</Text>
            </View>
          )}
        </View>

        {/* Metadata Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Metadata</Text>
          <InfoRow
            label="Created"
            value={
              teacher.created_at ? new Date(teacher.created_at).toLocaleDateString() : 'N/A'
            }
          />
          <InfoRow
            label="Last Updated"
            value={
              teacher.updated_at ? new Date(teacher.updated_at).toLocaleDateString() : 'N/A'
            }
          />
          <InfoRow label="Profile Complete" value={teacher.is_profile_complete ? 'Yes' : 'No'} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value || 'N/A'}</Text>
  </View>
);

const getDayName = (dayIndex: number): string => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayIndex] || 'Unknown';
};

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
    marginBottom: 16,
  },
  errorButton: {
    backgroundColor: ADMIN_COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: ADMIN_RADII.input,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  profileHeader: {
    backgroundColor: ADMIN_COLORS.surface,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: ADMIN_RADII.card,
    marginBottom: ADMIN_SPACING.md,
    ...ADMIN_SHADOW,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: ADMIN_COLORS.surfaceAlt,
    marginBottom: ADMIN_SPACING.md,
  },
  teacherName: {
    fontSize: 20,
    fontWeight: '700',
    color: ADMIN_COLORS.text,
    marginBottom: ADMIN_SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingLabel: {
    color: ADMIN_COLORS.textMuted,
    fontSize: 12,
  },
  ratingValue: {
    color: ADMIN_COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: ADMIN_RADII.card,
    padding: ADMIN_SPACING.lg,
    marginBottom: ADMIN_SPACING.md,
    ...ADMIN_SHADOW,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ADMIN_COLORS.brand,
    marginBottom: ADMIN_SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
  bioText: {
    fontSize: 13,
    color: ADMIN_COLORS.textMuted,
    lineHeight: 20,
  },
  subjectCard: {
    backgroundColor: ADMIN_COLORS.surfaceAlt,
    borderRadius: ADMIN_RADII.input,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: ADMIN_COLORS.accent,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
    flex: 1,
  },
  activeIndicator: {
    backgroundColor: ADMIN_COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ADMIN_RADII.input,
  },
  activeText: {
    color: ADMIN_COLORS.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  subjectLevel: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginBottom: 6,
  },
  subjectFee: {
    fontSize: 12,
    color: ADMIN_COLORS.success,
    fontWeight: '600',
  },
  availabilityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  availabilityDay: {
    fontSize: 13,
    fontWeight: '500',
    color: ADMIN_COLORS.text,
    flex: 1,
  },
  availabilityTime: {
    fontSize: 13,
    color: ADMIN_COLORS.textMuted,
    fontWeight: '500',
  },
  docButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.surfaceAlt,
    borderRadius: ADMIN_RADII.input,
    padding: 12,
    marginBottom: 8,
  },
  docButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  docButtonContent: {
    flex: 1,
  },
  docButtonTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
  },
  docButtonSubtitle: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginTop: 2,
  },
  docLink: {
    fontSize: 18,
    color: ADMIN_COLORS.accent,
  },
  cnicSection: {
    backgroundColor: ADMIN_COLORS.brandSoft,
    borderRadius: ADMIN_RADII.input,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: ADMIN_COLORS.success,
  },
  rejectionReasonBox: {
    backgroundColor: 'rgba(209, 67, 67, 0.10)',
    borderRadius: ADMIN_RADII.input,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: ADMIN_COLORS.danger,
  },
  rejectionReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 6,
  },
  rejectionReasonText: {
    fontSize: 12,
    color: '#C62828',
    lineHeight: 18,
  },
});

export default TeacherDetailScreen;
