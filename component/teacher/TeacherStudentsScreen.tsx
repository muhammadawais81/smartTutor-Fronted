import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getAllTeacherEnrollments } from '../../api/enrollment';

type EnrollmentStatus = 'pending' | 'approved' | 'rejected';

interface StudentItem {
  id: string;
  student_id: number;
  student_name: string;
  student_email: string;
  student_profile_picture?: string;
  grade: string;
  subject_name: string;
  subject_id?: number;
  monthly_fee: number;
  status: EnrollmentStatus;
  enrollment_date: string;
}

// App color scheme
const PRIMARY = '#10284C';
const PRIMARY_TINT = '#EAF0F9';
const BG = '#F4F6FA';
const BORDER = '#E6EBF2';
const TEXT = '#0F172A';
const MUTED = '#64748B';

const STATUS_STYLES: Record<EnrollmentStatus, { bg: string; color: string }> = {
  approved: { bg: '#DCFCE7', color: '#16A34A' },
  pending: { bg: '#FEF3C7', color: '#D97706' },
  rejected: { bg: '#FEE2E2', color: '#DC2626' },
};

const TeacherStudentsScreen = ({
  onBack,
  onStudentPress,
}: {
  onBack: () => void;
  onStudentPress?: (item: any) => void;
  onStudentsBySubject?: () => void;
}) => {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterBy, setFilterBy] = useState('all');

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchQuery, filterBy, students]);

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      const enrollments = await getAllTeacherEnrollments();

      const studentsList: StudentItem[] = enrollments.map((enrollment: any) => ({
        id: enrollment.id,
        student_id: enrollment.student_id,
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
        subject_name: enrollment.teacher_subject?.subject?.name || 'Unknown Subject',
        subject_id: enrollment.teacher_subject?.subject_id,
        monthly_fee: enrollment.teacher_subject?.fee_per_month || 0,
        status: (enrollment.status || 'pending') as EnrollmentStatus,
        enrollment_date: enrollment.created_at,
      }));

      setStudents(studentsList);
    } catch (error) {
      console.error('[TEACHER STUDENTS] Error:', error);
      Alert.alert('Error', 'Failed to load students. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudents();
    setRefreshing(false);
  };

  const filterStudents = () => {
    let filtered: StudentItem[] = students;

    if (filterBy !== 'all') {
      filtered = filtered.filter(s => s.status === filterBy);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.student_name?.toLowerCase().includes(query) ||
          s.student_email?.toLowerCase().includes(query) ||
          s.subject_name?.toLowerCase().includes(query)
      );
    }

    setFilteredStudents(filtered);
  };

  const renderStudentCard = ({ item }: { item: StudentItem }) => {
    const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
    return (
      <TouchableOpacity
        style={styles.studentCard}
        activeOpacity={0.85}
        onPress={() => onStudentPress?.(item)}>
        <View style={styles.cardTop}>
          <View style={styles.studentAvatar}>
            {item.student_profile_picture ? (
              <Image
                source={{ uri: item.student_profile_picture }}
                style={styles.studentAvatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {item.student_name?.charAt(0).toUpperCase() || 'S'}
              </Text>
            )}
          </View>

          <View style={styles.studentInfo}>
            <Text style={styles.studentName} numberOfLines={1}>
              {item.student_name}
            </Text>
            {item.student_email ? (
              <Text style={styles.studentEmail} numberOfLines={1}>
                {item.student_email}
              </Text>
            ) : null}
            {item.grade ? (
              <Text style={styles.studentGrade}>Grade: {item.grade}</Text>
            ) : null}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {item.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="book-outline" size={15} color={PRIMARY} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.subject_name}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={15} color="#16A34A" />
            <Text style={[styles.metaText, styles.feeText]}>
              Rs. {item.monthly_fee?.toLocaleString() || '0'}
            </Text>
          </View>
        </View>

        {item.enrollment_date ? (
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color={MUTED} />
            <Text style={styles.dateText}>
              Enrolled {new Date(item.enrollment_date).toLocaleDateString()}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="people-outline" size={40} color={PRIMARY} />
      </View>
      <Text style={styles.emptyTitle}>No Students Yet</Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? 'No students match your search'
          : "You don't have any enrolled students yet"}
      </Text>
    </View>
  );

  const renderHeader = (showBadge: boolean) => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>My Students</Text>
      {showBadge ? (
        <View style={styles.headerBadge}>
          <Text style={styles.badgeText}>{students.length}</Text>
        </View>
      ) : (
        <View style={styles.backButton} />
      )}
    </View>
  );

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
            <Text style={styles.loadingText}>Loading students...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={PRIMARY} barStyle="light-content" translucent={false} />
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        {renderHeader(true)}
      </SafeAreaView>

      <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={MUTED} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, email or subject"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filters */}
          <View style={styles.filterContainer}>
            {['all', 'approved', 'pending', 'rejected'].map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filterBy === status && styles.filterButtonActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setFilterBy(status)}>
                <Text
                  style={[
                    styles.filterButtonText,
                    filterBy === status && styles.filterButtonTextActive,
                  ]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick stats */}
        {students.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{students.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {students.filter(s => s.status === 'approved').length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {students.filter(s => s.status === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        )}

        {/* List */}
        <FlatList
          data={filteredStudents}
          renderItem={renderStudentCard}
          keyExtractor={(item, idx) => `${item.id || idx}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
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
    justifyContent: 'flex-start',
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
    textAlign: 'left',
    marginLeft: 6,
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

  // Search
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: TEXT,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: PRIMARY,
  },
  statLabel: {
    fontSize: 12,
    color: MUTED,
    marginTop: 3,
    fontWeight: '500',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 30,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIMARY_TINT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  studentAvatarImage: {
    width: 48,
    height: 48,
    resizeMode: 'cover',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: PRIMARY,
  },
  studentInfo: {
    flex: 1,
    marginRight: 8,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
  },
  studentEmail: {
    fontSize: 12.5,
    color: MUTED,
    marginTop: 2,
  },
  studentGrade: {
    fontSize: 11.5,
    color: '#94A3B8',
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
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    flexShrink: 1,
  },
  feeText: {
    color: '#16A34A',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  dateText: {
    fontSize: 12,
    color: MUTED,
  },

  // Empty
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
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

export default TeacherStudentsScreen;
