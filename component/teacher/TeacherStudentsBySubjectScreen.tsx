import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getAllTeacherEnrollments } from '../../api/enrollment';

// App color scheme
const PRIMARY = '#10284C';
const PRIMARY_TINT = '#EAF0F9';
const BG = '#F4F6FA';
const BORDER = '#E6EBF2';
const TEXT = '#0F172A';
const MUTED = '#64748B';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  approved: { bg: '#DCFCE7', color: '#16A34A' },
  pending: { bg: '#FEF3C7', color: '#D97706' },
  rejected: { bg: '#FEE2E2', color: '#DC2626' },
};

const StatusBadge = ({ status }: { status?: string }) => {
  const s = STATUS_STYLES[status || 'pending'] || STATUS_STYLES.pending;
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusText, { color: s.color }]}>
        {(status || 'pending').toUpperCase()}
      </Text>
    </View>
  );
};

const Avatar = ({ uri, name }: { uri?: string; name?: string }) => (
  <View style={styles.avatar}>
    {uri ? (
      <Image source={{ uri }} style={styles.avatarImage} />
    ) : (
      <Text style={styles.avatarText}>{name?.charAt(0).toUpperCase() || 'S'}</Text>
    )}
  </View>
);

const TeacherStudentsBySubjectScreen = ({
  onBack,
  onStudentPress,
  onOpenGroupAttendance,
  entryMode = 'portal',
}) => {
  const [subjectsData, setSubjectsData] = useState([]);
  const [studentsData, setStudentsData] = useState([]);
  const [portalType, setPortalType] = useState<'attendance' | 'marks'>('attendance');
  const [viewMode, setViewMode] = useState<'single' | 'group'>('single');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (entryMode === 'subjects') {
      setPortalType('attendance');
      setViewMode('group');
      setSelectedSubjectId(null);
    }
  }, [entryMode]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const enrollments = await getAllTeacherEnrollments();

      const subjectMap = new Map<number, any>();
      const studentsList: any[] = [];

      enrollments.forEach((enrollment: any) => {
        const subjectId = enrollment.teacher_subject?.subject_id;
        const subjectName = enrollment.teacher_subject?.subject?.name;
        const monthlyFee = enrollment.teacher_subject?.fee_per_month;

        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            id: subjectId,
            name: subjectName,
            subject_name: subjectName,
            monthly_fee: monthlyFee,
            students: [],
          });
        }

        const student = {
          id: enrollment.id,
          student_id: enrollment.student_id,
          subject_id: subjectId,
          student_name:
            enrollment.student?.name ||
            enrollment.student?.full_name ||
            enrollment.student_name ||
            'Student',
          student_email: enrollment.student?.email || enrollment.student_email || '',
          student_profile_picture:
            enrollment.student?.profile_picture ||
            enrollment.student?.profilePicture ||
            enrollment.student_profile_picture ||
            enrollment.profile_picture ||
            '',
          grade: enrollment.student?.grade || '',
          subject_name: subjectName,
          monthly_fee: monthlyFee,
          status: enrollment.status,
          enrollment_date: enrollment.created_at,
        };

        subjectMap.get(subjectId).students.push(student);
        studentsList.push(student);
      });

      const subjectsArray = Array.from(subjectMap.values());
      setSubjectsData(subjectsArray);
      setStudentsData(studentsList);
    } catch (error) {
      console.error('[STUDENTS BY SUBJECT] Error:', error);
      Alert.alert('Error', 'Failed to load students by subject');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderStudentRow = (student, isPressable = true) => {
    const RowComponent: any = isPressable ? TouchableOpacity : View;
    const rowProps = isPressable
      ? { onPress: () => onStudentPress?.(student, portalType), activeOpacity: 0.85 }
      : {};
    return (
      <RowComponent style={styles.studentCard} {...rowProps}>
        <Avatar uri={student.student_profile_picture} name={student.student_name} />
        <View style={styles.studentInfo}>
          <Text style={styles.studentName} numberOfLines={1}>
            {student.student_name}
          </Text>
          {student.student_email ? (
            <Text style={styles.studentEmail} numberOfLines={1}>
              {student.student_email}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={student.status} />
      </RowComponent>
    );
  };

  const renderSingleStudentList = () => (
    <FlatList
      data={studentsData}
      keyExtractor={(item, idx) => `${item.id || idx}`}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.studentCard}
          activeOpacity={0.85}
          onPress={() => onStudentPress?.(item, portalType)}>
          <Avatar uri={item.student_profile_picture} name={item.student_name} />
          <View style={styles.studentInfo}>
            <Text style={styles.studentName} numberOfLines={1}>
              {item.student_name}
            </Text>
            <Text style={styles.studentEmail} numberOfLines={1}>
              {portalType === 'attendance'
                ? item.subject_name
                : `Marks: ${item.subject_name}`}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="people-outline" size={38} color={PRIMARY} />
          </View>
          <Text style={styles.emptyTitle}>No Students Yet</Text>
          <Text style={styles.emptyText}>You don't have any enrolled students yet</Text>
        </View>
      }
    />
  );

  const renderSubjectGroup = ({ item: subject }) => {
    const studentCount = subject.students?.length || 0;
    return (
      <TouchableOpacity
        style={styles.subjectCard}
        activeOpacity={0.85}
        onPress={() => {
          if (entryMode === 'subjects') {
            onOpenGroupAttendance?.(subject, 'attendance');
            return;
          }
          if (viewMode === 'group') {
            onOpenGroupAttendance?.(subject, portalType);
          } else {
            setSelectedSubjectId(subject.id);
          }
        }}>
        <View style={styles.subjectIconCircle}>
          <Ionicons name="book" size={20} color={PRIMARY} />
        </View>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectName} numberOfLines={1}>
            {subject.name || subject.subject_name}
          </Text>
          <Text style={styles.subjectStudentCount}>
            {studentCount} {studentCount === 1 ? 'student' : 'students'}
          </Text>
        </View>
        <View style={styles.subjectRight}>
          <View style={styles.feeTag}>
            <Text style={styles.feeTagText}>Rs. {subject.monthly_fee?.toLocaleString()}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  const totalStudents = subjectsData.reduce(
    (sum, subject) => sum + (subject.students?.length || 0),
    0
  );

  const totalActiveStudents = subjectsData.reduce(
    (sum, subject) =>
      sum + (subject.students?.filter(s => s.status === 'approved').length || 0),
    0
  );

  const headerTitle = entryMode === 'subjects' ? 'Students by Subject' : 'Student Portal';

  const renderHeader = (showBadge: boolean) => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{headerTitle}</Text>
      {showBadge ? (
        <View style={styles.headerBadge}>
          <Text style={styles.badgeText}>
            {viewMode === 'single' ? studentsData.length : subjectsData.length}
          </Text>
        </View>
      ) : (
        <View style={styles.backButton} />
      )}
    </View>
  );

  const portalToggle = (type: 'attendance' | 'marks', mode: 'single' | 'group', label: string) => {
    const active = portalType === type && viewMode === mode;
    return (
      <TouchableOpacity
        style={[styles.portalToggle, active && styles.portalToggleActive]}
        activeOpacity={0.85}
        onPress={() => {
          setPortalType(type);
          setViewMode(mode);
          setSelectedSubjectId(null);
        }}>
        <Text style={[styles.portalToggleText, active && styles.portalToggleTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <StatusBar backgroundColor={PRIMARY} barStyle="light-content" translucent={false} />
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
          {renderHeader(false)}
        </SafeAreaView>
        <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.loadingText}>Loading subjects...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const selectedSubject = subjectsData.find((s) => s.id === selectedSubjectId);

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={PRIMARY} barStyle="light-content" translucent={false} />
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        {renderHeader(true)}
      </SafeAreaView>

      <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
        {entryMode === 'portal' && (
          <>
            <View style={styles.portalIntro}>
              <Text style={styles.portalTitle}>Students Portal</Text>
              <Text style={styles.portalSubtitle}>
                Choose Attendance or Marks, then pick a single student or a subject group.
              </Text>
            </View>

            <View style={styles.portalCardGrid}>
              <View style={styles.portalCard}>
                <View style={styles.portalCardHead}>
                  <View style={styles.portalCardIcon}>
                    <Ionicons name="checkbox-outline" size={18} color={PRIMARY} />
                  </View>
                  <Text style={styles.portalCardTitle}>Attendance</Text>
                </View>
                <Text style={styles.portalCardDesc}>Mark present or absent.</Text>
                <View style={styles.portalCardActions}>
                  {portalToggle('attendance', 'single', 'Single')}
                  {portalToggle('attendance', 'group', 'Group')}
                </View>
              </View>

              <View style={styles.portalCard}>
                <View style={styles.portalCardHead}>
                  <View style={styles.portalCardIcon}>
                    <Ionicons name="create-outline" size={18} color={PRIMARY} />
                  </View>
                  <Text style={styles.portalCardTitle}>Marks</Text>
                </View>
                <Text style={styles.portalCardDesc}>Submit exam or test scores.</Text>
                <View style={styles.portalCardActions}>
                  {portalToggle('marks', 'single', 'Single')}
                  {portalToggle('marks', 'group', 'Group')}
                </View>
              </View>
            </View>
          </>
        )}

        {viewMode === 'single' ? (
          renderSingleStudentList()
        ) : (entryMode === 'subjects' || portalType === 'marks') && selectedSubjectId ? (
          <FlatList
            data={studentsData.filter((s) => s.subject_id === selectedSubjectId)}
            keyExtractor={(item, idx) => `${item.id || idx}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />
            }
            ListHeaderComponent={
              <TouchableOpacity
                style={styles.drillHeader}
                activeOpacity={0.8}
                onPress={() => setSelectedSubjectId(null)}>
                <Ionicons name="arrow-back" size={18} color={PRIMARY} />
                <View style={styles.drillHeaderText}>
                  <Text style={styles.drillBackText}>Subjects</Text>
                  <Text style={styles.drillTitle} numberOfLines={1}>
                    {entryMode === 'subjects'
                      ? selectedSubject?.name || 'Students'
                      : 'Select student for marks'}
                  </Text>
                </View>
              </TouchableOpacity>
            }
            renderItem={({ item }) =>
              renderStudentRow(item, entryMode !== 'subjects')
            }
          />
        ) : (
          <>
            {subjectsData.length > 0 && viewMode !== 'group' && (
              <View style={styles.overviewContainer}>
                <View style={styles.overviewCard}>
                  <View style={styles.overviewIcon}>
                    <Ionicons name="people-outline" size={16} color={PRIMARY} />
                  </View>
                  <Text style={styles.overviewValue}>{totalStudents}</Text>
                  <Text style={styles.overviewLabel}>Students</Text>
                </View>
                <View style={styles.overviewCard}>
                  <View style={styles.overviewIcon}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={PRIMARY} />
                  </View>
                  <Text style={styles.overviewValue}>{totalActiveStudents}</Text>
                  <Text style={styles.overviewLabel}>Active</Text>
                </View>
                <View style={styles.overviewCard}>
                  <View style={styles.overviewIcon}>
                    <Ionicons name="albums-outline" size={16} color={PRIMARY} />
                  </View>
                  <Text style={styles.overviewValue}>{subjectsData.length}</Text>
                  <Text style={styles.overviewLabel}>Subjects</Text>
                </View>
              </View>
            )}

            {subjectsData.length > 0 ? (
              <FlatList
                data={subjectsData}
                renderItem={renderSubjectGroup}
                keyExtractor={(item, idx) => `${item.id || idx}`}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />
                }
              />
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="albums-outline" size={38} color={PRIMARY} />
                </View>
                <Text style={styles.emptyTitle}>No Subjects Yet</Text>
                <Text style={styles.emptyText}>You haven't created any subjects yet</Text>
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  headerSafeArea: {
    backgroundColor: PRIMARY,
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: BG,
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
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerBadge: {
    minWidth: 42,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },

  // Portal
  portalIntro: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  portalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT,
  },
  portalSubtitle: {
    fontSize: 12.5,
    color: MUTED,
    marginTop: 4,
    lineHeight: 17,
  },
  portalCardGrid: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  portalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  portalCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  portalCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
  },
  portalCardDesc: {
    fontSize: 12.5,
    color: MUTED,
    marginTop: 8,
  },
  portalCardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  portalToggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  portalToggleActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  portalToggleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: MUTED,
  },
  portalToggleTextActive: {
    color: '#FFFFFF',
  },

  // Overview
  overviewContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 10,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  overviewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: '800',
    color: PRIMARY,
  },
  overviewLabel: {
    fontSize: 11.5,
    color: MUTED,
    marginTop: 2,
    fontWeight: '500',
  },

  // Lists
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
    flexGrow: 1,
  },

  // Subject card
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  subjectIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PRIMARY_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subjectInfo: {
    flex: 1,
    marginRight: 8,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
  subjectStudentCount: {
    fontSize: 12.5,
    color: MUTED,
    marginTop: 2,
  },
  subjectRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feeTag: {
    backgroundColor: '#ECFDF3',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  feeTagText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#16A34A',
  },

  // Drill header
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  drillHeaderText: {
    flex: 1,
  },
  drillBackText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  drillTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    marginTop: 2,
  },

  // Student card
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PRIMARY_TINT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 46,
    height: 46,
    resizeMode: 'cover',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: PRIMARY,
  },
  studentInfo: {
    flex: 1,
    marginRight: 8,
  },
  studentName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: TEXT,
  },
  studentEmail: {
    fontSize: 12.5,
    color: MUTED,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Empty
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TeacherStudentsBySubjectScreen;
