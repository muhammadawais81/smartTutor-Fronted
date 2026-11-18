import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {getAdminTeacherEnrolledStudents, getAdminTeachers, getTeacherStatistics} from '../../api/admin';
import type {AdminTeacherEnrolledStudent, TeacherStatistics} from '../../api/admin/types';
import type {TeacherDetailResponse} from '../../api/teacher/types';
import {ADMIN_COLORS, ADMIN_RADII, ADMIN_SHADOW, ADMIN_SPACING} from './adminTheme';

interface TeacherEnrollmentHubScreenProps {
  onBack?: () => void;
}

type TeacherStatusFilter = 'all' | 'incomplete' | 'pending_approval' | 'approved' | 'rejected' | 'suspended';
type EnrollmentStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const TEACHER_FILTERS: Array<{label: string; value: TeacherStatusFilter}> = [
  {label: 'All', value: 'all'},
  {label: 'Approved', value: 'approved'},
  {label: 'Pending', value: 'pending_approval'},
  {label: 'Suspended', value: 'suspended'},
];

const ENROLLMENT_FILTERS: Array<{label: string; value: EnrollmentStatusFilter}> = [
  {label: 'All students', value: 'all'},
  {label: 'Approved', value: 'approved'},
  {label: 'Pending', value: 'pending'},
  {label: 'Rejected', value: 'rejected'},
];

const normalizeArray = <T,>(value: any): T[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Recently';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently';
  return parsed.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
};

const getInitials = (name?: string | null) => {
  if (!name) return 'ST';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
};

const TeacherEnrollmentHubScreen: React.FC<TeacherEnrollmentHubScreenProps> = ({onBack}) => {
  const [teachers, setTeachers] = useState<TeacherDetailResponse[]>([]);
  const [stats, setStats] = useState<TeacherStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [teacherFilter, setTeacherFilter] = useState<TeacherStatusFilter>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherDetailResponse | null>(null);
  const [selectedEnrollmentFilter, setSelectedEnrollmentFilter] = useState<EnrollmentStatusFilter>('approved');
  const [studentLoading, setStudentLoading] = useState(false);
  const [teacherStudents, setTeacherStudents] = useState<AdminTeacherEnrolledStudent[]>([]);

  const loadTeachers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [teacherData, teacherStats] = await Promise.all([
        getAdminTeachers({
          skip: 0,
          limit: 100,
          status_filter: teacherFilter === 'all' ? undefined : teacherFilter,
        }),
        getTeacherStatistics(),
      ]);

      setTeachers(normalizeArray<TeacherDetailResponse>(teacherData));
      setStats(teacherStats);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teacherFilter]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const loadTeacherStudents = useCallback(async (teacherId: number, filter: EnrollmentStatusFilter) => {
    setStudentLoading(true);
    try {
      const enrollmentData = await getAdminTeacherEnrolledStudents(teacherId, {
        skip: 0,
        limit: 200,
        status_filter: filter === 'all' ? undefined : filter,
      });

      setTeacherStudents(normalizeArray<AdminTeacherEnrolledStudent>(enrollmentData));
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load enrolled students');
      setTeacherStudents([]);
    } finally {
      setStudentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeacher) {
      loadTeacherStudents(selectedTeacher.teacher_id, selectedEnrollmentFilter);
    }
  }, [loadTeacherStudents, selectedEnrollmentFilter, selectedTeacher]);

  const filteredTeachers = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return teachers.filter(teacher => {
      const matchesFilter = teacherFilter === 'all' || teacher.profile_status === teacherFilter;
      if (!matchesFilter) return false;

      if (!search) return true;

      return (
        teacher.full_name?.toLowerCase().includes(search) ||
        teacher.phone?.toLowerCase().includes(search) ||
        teacher.city?.name?.toLowerCase().includes(search) ||
        teacher.subjects?.some(subject => subject.subject?.name?.toLowerCase().includes(search))
      );
    });
  }, [searchText, teacherFilter, teachers]);

  const filteredStudents = useMemo(() => {
    return teacherStudents.filter(enrollment => {
      if (selectedEnrollmentFilter !== 'all' && enrollment.status !== selectedEnrollmentFilter) {
        return false;
      }

      return true;
    });
  }, [selectedEnrollmentFilter, teacherStudents]);

  const handleTeacherPress = (teacher: TeacherDetailResponse) => {
    setSelectedTeacher(teacher);
    setSelectedEnrollmentFilter('approved');
    setTeacherStudents([]);
  };

  const renderTeacherCard = ({item}: {item: TeacherDetailResponse}) => {
    const profilePicture = item.profile_picture || null;
    const subjectCount = item.subjects?.length || 0;

    return (
      <TouchableOpacity style={styles.teacherCard} activeOpacity={0.88} onPress={() => handleTeacherPress(item)}>
        <View style={styles.teacherCardTopRow}>
          {profilePicture ? (
            <Image source={{uri: profilePicture}} style={styles.teacherAvatar} />
          ) : (
            <View style={styles.teacherAvatarFallback}>
              <Text style={styles.teacherAvatarFallbackText}>{getInitials(item.full_name)}</Text>
            </View>
          )}

          <View style={styles.teacherCardBody}>
            <View style={styles.teacherCardHeaderRow}>
              <View style={styles.teacherNameBlock}>
                <Text style={styles.teacherName} numberOfLines={1}>{item.full_name}</Text>
                <Text style={styles.teacherMeta} numberOfLines={1}>
                  {item.city?.name || 'City not set'} · {item.phone || 'Phone not set'}
                </Text>
              </View>
              <View style={[styles.statusBadge, {backgroundColor: `${getTeacherStatusColor(item.profile_status)}18`}]}>
                <Text style={[styles.statusBadgeText, {color: getTeacherStatusColor(item.profile_status)}]}>
                  {formatTeacherStatus(item.profile_status)}
                </Text>
              </View>
            </View>

            <View style={styles.teacherStatsRow}>
              <InfoChip icon="school-outline" label={`${subjectCount} Subjects`} />
              <InfoChip icon="account-group-outline" label={`${item.total_students || 0} Students`} />
              <InfoChip icon="star-outline" label={`${item.rating?.toFixed?.(1) || '0.0'} Rating`} />
            </View>

            {item.subjects?.length ? (
              <View style={styles.subjectPreviewRow}>
                {item.subjects.slice(0, 3).map(subject => (
                  <View key={`${item.teacher_id}-${subject.id}`} style={styles.subjectPill}>
                    <Text style={styles.subjectPillText}>{subject.subject?.name || 'Subject'}</Text>
                  </View>
                ))}
                {item.subjects.length > 3 && <Text style={styles.moreSubjectsText}>+{item.subjects.length - 3} more</Text>}
              </View>
            ) : null}
          </View>

          <MaterialCommunityIcons name="chevron-right" size={24} color={ADMIN_COLORS.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderStudentCard = ({item}: {item: AdminTeacherEnrolledStudent}) => {
    const student = item.student;
    return (
      <View style={styles.studentCard}>
        {student.profile_picture ? (
          <Image source={{uri: student.profile_picture}} style={styles.studentAvatar} />
        ) : (
          <View style={styles.studentAvatarFallback}>
            <Text style={styles.studentAvatarFallbackText}>{getInitials(student.full_name)}</Text>
          </View>
        )}

        <View style={styles.studentCardBody}>
          <View style={styles.studentCardHeaderRow}>
            <Text style={styles.studentName} numberOfLines={1}>{student.full_name}</Text>
            <View style={[styles.enrollmentBadge, {backgroundColor: `${getEnrollmentColor(item.status)}18`}]}>
              <Text style={[styles.enrollmentBadgeText, {color: getEnrollmentColor(item.status)}]}>
                {formatEnrollmentStatus(item.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.studentMeta} numberOfLines={1}>
            {student.grade_level || 'Grade not set'} · {student.city || 'City not set'}
          </Text>
          <Text style={styles.studentSubMeta} numberOfLines={1}>
            {student.phone || 'Phone not set'}
          </Text>

          <View style={styles.studentTagsRow}>
            <View style={styles.studentTag}>
              <Text style={styles.studentTagText}>{item.teacher_subject.subject.name}</Text>
            </View>
            <Text style={styles.studentDateText}>Enrolled {formatDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const teacherCounts = useMemo(() => ({
    total: stats?.total_teachers ?? 0,
    approved: stats?.approved ?? 0,
    pending: stats?.pending_approval ?? 0,
  }), [stats]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={ADMIN_COLORS.brand} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={ADMIN_COLORS.surface} />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerKicker}>Admin Module</Text>
          <Text style={styles.headerTitle}>Teacher Enrollment Hub</Text>
        </View>
        <View style={styles.headerCountPill}>
          <Text style={styles.headerCountValue}>{teacherCounts.total}</Text>
          <Text style={styles.headerCountLabel}>Teachers</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTeachers(true)} tintColor={ADMIN_COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>Teachers and their enrolled students in one place</Text>
              <Text style={styles.heroSubtitle}>
                Tap any teacher to review their approved, pending, or rejected student enrollments.
              </Text>
            </View>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons name="account-search-outline" size={30} color={ADMIN_COLORS.surface} />
            </View>
          </View>

          <View style={styles.metricRow}>
            <MetricCard label="Approved" value={teacherCounts.approved} />
            <MetricCard label="Pending" value={teacherCounts.pending} />
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <MaterialCommunityIcons name="magnify" size={20} color={ADMIN_COLORS.textMuted} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search teachers"
              placeholderTextColor={ADMIN_COLORS.textMuted}
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={() => loadTeachers(true)} activeOpacity={0.85}>
            <MaterialCommunityIcons name="refresh" size={20} color={ADMIN_COLORS.accent} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Teacher filter</Text>
          <View style={styles.filterRow}>
            {TEACHER_FILTERS.map(filter => {
              const selected = teacherFilter === filter.value;
              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[styles.filterChip, selected && styles.filterChipSelected]}
                  onPress={() => setTeacherFilter(filter.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{filter.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={ADMIN_COLORS.accent} />
            <Text style={styles.loadingText}>Loading teacher module...</Text>
          </View>
        ) : filteredTeachers.length ? (
          <FlatList
            data={filteredTeachers}
            renderItem={renderTeacherCard}
            keyExtractor={item => String(item.teacher_id)}
            scrollEnabled={false}
            contentContainerStyle={styles.teacherList}
          />
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-off-outline" size={56} color={ADMIN_COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No teachers found</Text>
            <Text style={styles.emptySubtitle}>Try a different search or filter to continue.</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedTeacher}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTeacher(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {selectedTeacher && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <TouchableOpacity onPress={() => setSelectedTeacher(null)} style={styles.modalCloseButton} activeOpacity={0.85}>
                      <MaterialCommunityIcons name="close" size={20} color={ADMIN_COLORS.text} />
                    </TouchableOpacity>
                    <View>
                      <Text style={styles.modalKicker}>Teacher profile</Text>
                      <Text style={styles.modalTitle} numberOfLines={1}>{selectedTeacher.full_name}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, {backgroundColor: `${getTeacherStatusColor(selectedTeacher.profile_status)}18`}]}>
                    <Text style={[styles.statusBadgeText, {color: getTeacherStatusColor(selectedTeacher.profile_status)}]}>
                      {formatTeacherStatus(selectedTeacher.profile_status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalProfileRow}>
                  {selectedTeacher.profile_picture ? (
                    <Image source={{uri: selectedTeacher.profile_picture}} style={styles.modalAvatar} />
                  ) : (
                    <View style={styles.modalAvatarFallback}>
                      <Text style={styles.modalAvatarFallbackText}>{getInitials(selectedTeacher.full_name)}</Text>
                    </View>
                  )}

                  <View style={styles.modalProfileText}>
                    <Text style={styles.modalTeacherName}>{selectedTeacher.full_name}</Text>
                    <Text style={styles.modalTeacherMeta}>{selectedTeacher.city?.name || 'City not set'} · {selectedTeacher.phone || 'Phone not set'}</Text>
                    <View style={styles.modalProfileStats}>
                      <InfoChip icon="book-outline" label={`${selectedTeacher.subjects?.length || 0} Subjects`} />
                      <InfoChip icon="account-group-outline" label={`${selectedTeacher.total_students || 0} Students`} />
                    </View>
                  </View>
                </View>

                <View style={styles.enrollmentFilterWrap}>
                  {ENROLLMENT_FILTERS.map(filter => {
                    const selected = selectedEnrollmentFilter === filter.value;
                    return (
                      <TouchableOpacity
                        key={filter.value}
                        style={[styles.enrollmentFilterChip, selected && styles.enrollmentFilterChipSelected]}
                        onPress={() => setSelectedEnrollmentFilter(filter.value)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.enrollmentFilterText, selected && styles.enrollmentFilterTextSelected]}>{filter.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.modalDivider} />

                {studentLoading ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color={ADMIN_COLORS.accent} />
                    <Text style={styles.loadingText}>Loading enrolled students...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredStudents}
                    keyExtractor={item => item.enrollment_id}
                    renderItem={renderStudentCard}
                    ListEmptyComponent={
                      <View style={styles.emptyStateModal}>
                        <MaterialCommunityIcons name="account-group-outline" size={44} color={ADMIN_COLORS.textMuted} />
                        <Text style={styles.emptyTitle}>No students found</Text>
                        <Text style={styles.emptySubtitle}>This teacher has no enrollments for the current filter.</Text>
                      </View>
                    }
                    contentContainerStyle={styles.studentList}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getTeacherStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return ADMIN_COLORS.success;
    case 'pending_approval':
      return ADMIN_COLORS.warning;
    case 'rejected':
      return ADMIN_COLORS.danger;
    case 'suspended':
      return '#7A8594';
    default:
      return ADMIN_COLORS.info;
  }
};

const formatTeacherStatus = (status: string) => {
  switch (status) {
    case 'pending_approval':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'suspended':
      return 'Suspended';
    case 'incomplete':
      return 'Incomplete';
    default:
      return status.replace(/_/g, ' ');
  }
};

const getEnrollmentColor = (status: string) => {
  switch (status) {
    case 'approved':
      return ADMIN_COLORS.success;
    case 'pending':
      return ADMIN_COLORS.warning;
    case 'rejected':
      return ADMIN_COLORS.danger;
    default:
      return ADMIN_COLORS.textMuted;
  }
};

const formatEnrollmentStatus = (status: string) => {
  if (status === 'pending') return 'Pending';
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return status;
};

const InfoChip = ({icon, label}: {icon: string; label: string}) => (
  <View style={styles.infoChip}>
    <MaterialCommunityIcons name={icon} size={14} color={ADMIN_COLORS.info} />
    <Text style={styles.infoChipText}>{label}</Text>
  </View>
);

const MetricCard = ({label, value}: {label: string; value: number}) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: ADMIN_COLORS.surfaceAlt},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.md,
    backgroundColor: ADMIN_COLORS.brand,
    ...ADMIN_SHADOW,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {flex: 1, paddingHorizontal: ADMIN_SPACING.md},
  headerKicker: {color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase'},
  headerTitle: {color: ADMIN_COLORS.surface, fontSize: 20, fontWeight: '800', marginTop: 2},
  headerCountPill: {
    minWidth: 72,
    paddingHorizontal: ADMIN_SPACING.sm,
    paddingVertical: 8,
    borderRadius: ADMIN_RADII.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
  },
  headerCountValue: {color: ADMIN_COLORS.surface, fontSize: 16, fontWeight: '800'},
  headerCountLabel: {color: 'rgba(255,255,255,0.72)', fontSize: 10, marginTop: 1},
  content: {padding: ADMIN_SPACING.md, paddingBottom: ADMIN_SPACING.xl},
  heroCard: {
    backgroundColor: ADMIN_COLORS.brandDark,
    borderRadius: ADMIN_RADII.card,
    padding: ADMIN_SPACING.lg,
    marginBottom: ADMIN_SPACING.md,
    ...ADMIN_SHADOW,
  },
  heroRow: {flexDirection: 'row', alignItems: 'flex-start', gap: ADMIN_SPACING.md},
  heroTextBlock: {flex: 1},
  heroTitle: {color: ADMIN_COLORS.surface, fontSize: 22, fontWeight: '800', lineHeight: 29},
  heroSubtitle: {color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19, marginTop: ADMIN_SPACING.sm},
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  metricRow: {flexDirection: 'row', gap: ADMIN_SPACING.sm, marginTop: ADMIN_SPACING.lg},
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: ADMIN_SPACING.md,
  },
  metricValue: {color: ADMIN_COLORS.surface, fontSize: 24, fontWeight: '800'},
  metricLabel: {color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 2},
  searchRow: {flexDirection: 'row', gap: ADMIN_SPACING.sm, marginBottom: ADMIN_SPACING.md},
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ADMIN_SPACING.sm,
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: ADMIN_RADII.input,
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: 13,
    ...ADMIN_SHADOW,
  },
  searchInput: {flex: 1, color: ADMIN_COLORS.text, fontSize: 14, paddingVertical: 0},
  refreshButton: {
    width: 48,
    borderRadius: ADMIN_RADII.input,
    backgroundColor: ADMIN_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...ADMIN_SHADOW,
  },
  filterSection: {marginBottom: ADMIN_SPACING.md},
  sectionTitle: {fontSize: 16, fontWeight: '800', color: ADMIN_COLORS.text, marginBottom: ADMIN_SPACING.sm},
  filterRow: {flexDirection: 'row', flexWrap: 'wrap', gap: ADMIN_SPACING.sm},
  filterChip: {
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: 10,
    borderRadius: ADMIN_RADII.pill,
    backgroundColor: ADMIN_COLORS.surface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.line,
  },
  filterChipSelected: {backgroundColor: ADMIN_COLORS.brand, borderColor: ADMIN_COLORS.brand},
  filterChipText: {color: ADMIN_COLORS.textMuted, fontSize: 12, fontWeight: '700'},
  filterChipTextSelected: {color: ADMIN_COLORS.surface},
  loadingWrap: {alignItems: 'center', justifyContent: 'center', paddingVertical: ADMIN_SPACING.xl},
  loadingText: {marginTop: ADMIN_SPACING.sm, color: ADMIN_COLORS.textMuted, fontSize: 13},
  teacherList: {paddingBottom: ADMIN_SPACING.sm},
  teacherCard: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: ADMIN_RADII.card,
    padding: ADMIN_SPACING.md,
    marginBottom: ADMIN_SPACING.md,
    borderWidth: 1,
    borderColor: '#E8EEF8',
    ...ADMIN_SHADOW,
  },
  teacherCardTopRow: {flexDirection: 'row', alignItems: 'flex-start', gap: ADMIN_SPACING.md},
  teacherAvatar: {width: 56, height: 56, borderRadius: 28, backgroundColor: ADMIN_COLORS.brandSoft},
  teacherAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ADMIN_COLORS.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherAvatarFallbackText: {color: ADMIN_COLORS.brand, fontSize: 18, fontWeight: '800'},
  teacherCardBody: {flex: 1},
  teacherCardHeaderRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: ADMIN_SPACING.sm},
  teacherNameBlock: {flex: 1},
  teacherName: {fontSize: 16, fontWeight: '800', color: ADMIN_COLORS.text},
  teacherMeta: {marginTop: 4, fontSize: 12, color: ADMIN_COLORS.textMuted},
  statusBadge: {paddingHorizontal: ADMIN_SPACING.sm, paddingVertical: 6, borderRadius: ADMIN_RADII.pill},
  statusBadgeText: {fontSize: 11, fontWeight: '800'},
  teacherStatsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: ADMIN_SPACING.sm, marginTop: ADMIN_SPACING.md},
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: ADMIN_RADII.pill,
    backgroundColor: ADMIN_COLORS.surfaceAlt,
  },
  infoChipText: {fontSize: 11, fontWeight: '700', color: ADMIN_COLORS.textMuted},
  subjectPreviewRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: ADMIN_SPACING.md, alignItems: 'center'},
  subjectPill: {
    paddingHorizontal: ADMIN_SPACING.sm,
    paddingVertical: 6,
    borderRadius: ADMIN_RADII.pill,
    backgroundColor: ADMIN_COLORS.brandSoft,
  },
  subjectPillText: {fontSize: 11, color: ADMIN_COLORS.brand, fontWeight: '700'},
  moreSubjectsText: {fontSize: 11, color: ADMIN_COLORS.textMuted, fontWeight: '600'},
  emptyState: {alignItems: 'center', justifyContent: 'center', paddingVertical: 48},
  emptyStateModal: {alignItems: 'center', justifyContent: 'center', paddingVertical: 36},
  emptyTitle: {fontSize: 18, fontWeight: '800', color: ADMIN_COLORS.text, marginTop: ADMIN_SPACING.sm},
  emptySubtitle: {fontSize: 13, color: ADMIN_COLORS.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 18},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(8, 18, 35, 0.52)', justifyContent: 'flex-end'},
  modalSheet: {
    maxHeight: '88%',
    backgroundColor: ADMIN_COLORS.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: ADMIN_SPACING.md,
    paddingTop: ADMIN_SPACING.md,
    paddingBottom: ADMIN_SPACING.lg,
  },
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ADMIN_SPACING.sm},
  modalHeaderLeft: {flexDirection: 'row', alignItems: 'center', gap: ADMIN_SPACING.sm, flex: 1},
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ADMIN_COLORS.surfaceAlt,
  },
  modalKicker: {fontSize: 11, color: ADMIN_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5},
  modalTitle: {fontSize: 18, fontWeight: '800', color: ADMIN_COLORS.text, marginTop: 2, maxWidth: 220},
  modalProfileRow: {flexDirection: 'row', gap: ADMIN_SPACING.md, marginTop: ADMIN_SPACING.lg, alignItems: 'flex-start'},
  modalAvatar: {width: 68, height: 68, borderRadius: 34, backgroundColor: ADMIN_COLORS.brandSoft},
  modalAvatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: ADMIN_COLORS.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarFallbackText: {fontSize: 20, fontWeight: '800', color: ADMIN_COLORS.brand},
  modalProfileText: {flex: 1},
  modalTeacherName: {fontSize: 18, fontWeight: '800', color: ADMIN_COLORS.text},
  modalTeacherMeta: {fontSize: 12, color: ADMIN_COLORS.textMuted, marginTop: 4},
  modalProfileStats: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: ADMIN_SPACING.md},
  enrollmentFilterWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: ADMIN_SPACING.lg},
  enrollmentFilterChip: {
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: 9,
    borderRadius: ADMIN_RADII.pill,
    backgroundColor: ADMIN_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.line,
  },
  enrollmentFilterChipSelected: {backgroundColor: ADMIN_COLORS.brandSoft, borderColor: ADMIN_COLORS.brandSoft},
  enrollmentFilterText: {fontSize: 12, fontWeight: '700', color: ADMIN_COLORS.textMuted},
  enrollmentFilterTextSelected: {color: ADMIN_COLORS.brand},
  modalDivider: {height: 1, backgroundColor: ADMIN_COLORS.line, marginTop: ADMIN_SPACING.md, marginBottom: ADMIN_SPACING.sm},
  studentList: {paddingBottom: ADMIN_SPACING.md},
  studentCard: {
    flexDirection: 'row',
    gap: ADMIN_SPACING.md,
    padding: ADMIN_SPACING.md,
    borderRadius: ADMIN_RADII.card,
    borderWidth: 1,
    borderColor: '#E8EEF8',
    backgroundColor: ADMIN_COLORS.surface,
    marginBottom: ADMIN_SPACING.sm,
  },
  studentAvatar: {width: 52, height: 52, borderRadius: 26, backgroundColor: ADMIN_COLORS.brandSoft},
  studentAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ADMIN_COLORS.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarFallbackText: {fontSize: 16, fontWeight: '800', color: ADMIN_COLORS.brand},
  studentCardBody: {flex: 1},
  studentCardHeaderRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: ADMIN_SPACING.sm},
  studentName: {fontSize: 15, fontWeight: '800', color: ADMIN_COLORS.text, flex: 1},
  studentMeta: {marginTop: 4, fontSize: 12, color: ADMIN_COLORS.textMuted},
  studentSubMeta: {marginTop: 2, fontSize: 12, color: ADMIN_COLORS.textMuted},
  enrollmentBadge: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: ADMIN_RADII.pill},
  enrollmentBadgeText: {fontSize: 10, fontWeight: '800'},
  studentTagsRow: {flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: ADMIN_SPACING.md},
  studentTag: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: ADMIN_RADII.pill, backgroundColor: ADMIN_COLORS.surfaceAlt},
  studentTagText: {fontSize: 11, color: ADMIN_COLORS.textMuted, fontWeight: '700'},
  studentDateText: {fontSize: 11, color: ADMIN_COLORS.textMuted, fontWeight: '600'},
});

export default TeacherEnrollmentHubScreen;