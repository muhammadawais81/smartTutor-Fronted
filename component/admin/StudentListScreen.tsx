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
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ADMIN_COLORS, ADMIN_SPACING, ADMIN_SHADOW, ADMIN_RADII } from './adminTheme';
import { getAdminStudents, getStudentStatistics } from '../../api/admin/adminApi';
import type { Student } from '../../api/student/types';

interface StudentListScreenProps {
  onBack?: () => void;
  onOpenStudent?: (studentId: number) => void;
}

interface StudentItem extends Student {
  key: string;
}

const StudentListScreen: React.FC<StudentListScreenProps> = ({ onBack, onOpenStudent }) => {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [stats, setStats] = useState({ total_students: 0, with_parent_id: 0, without_parent_id: 0 });

  // Grades for filtering
  const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentsData, statsData] = await Promise.all([
        getAdminStudents({ limit: 100, skip: 0 }),
        getStudentStatistics(),
      ]);

      const rawStudents = Array.isArray(studentsData)
        ? studentsData
        : Array.isArray((studentsData as any)?.data)
          ? (studentsData as any).data
          : Array.isArray((studentsData as any)?.results)
            ? (studentsData as any).results
            : Array.isArray((studentsData as any)?.students)
              ? (studentsData as any).students
              : [];

      const studentsWithKeys = rawStudents.map((s: any, idx: number) => ({
        ...s,
        key: `student-${s.student_id || s.user_id || idx}`,
      }));

      setStudents(studentsWithKeys);
      setStats(statsData || { total_students: 0, with_parent_id: 0, without_parent_id: 0 });
      applyFilters(studentsWithKeys, searchQuery, selectedGrade);
    } catch (error: any) {
      console.log('[StudentListScreen] Failed to load students:', error);
      Alert.alert('Error', error.message || 'Failed to load students');
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

  const applyFilters = (data: StudentItem[], query: string, grade: string) => {
    let filtered = data;

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(s =>
        (s.full_name || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.grade_level || '').toString().includes(q) ||
        (s.city || '').toLowerCase().includes(q)
      );
    }

    if (grade) {
      filtered = filtered.filter(s => (s.grade_level || '').toString() === grade);
    }

    setFilteredStudents(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(students, text, selectedGrade);
  };

  const handleGradeFilter = (grade: string) => {
    const newGrade = selectedGrade === grade ? '' : grade;
    setSelectedGrade(newGrade);
    applyFilters(students, searchQuery, newGrade);
  };

  const handleEditStudent = (student: StudentItem) => {
    if (typeof student.student_id === 'number' && typeof onOpenStudent === 'function') {
      onOpenStudent(student.student_id);
      return;
    }

    Alert.alert('Student details', `${student.full_name || 'This student'} detail navigation is not wired.`);
  };

  const renderStudentCard = ({ item }: { item: StudentItem }) => {
    const hasParent = !!item.parent_id;

    return (
      <TouchableOpacity
        style={styles.studentCard}
        onPress={() => handleEditStudent(item)}
        activeOpacity={0.7}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.studentInfo}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons
                name="account-circle"
                size={40}
                color={ADMIN_COLORS.brand}
              />
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.studentName}>{item.full_name || 'N/A'}</Text>
              <Text style={styles.studentEmail}>{item.phone || 'N/A'}</Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={ADMIN_COLORS.textMuted}
          />
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          {/* Grade & City Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoPair}>
              <Text style={styles.infoLabel}>Grade</Text>
              <Text style={styles.infoValue}>{item.grade_level || 'N/A'}</Text>
            </View>
            <View style={styles.infoPair}>
              <Text style={styles.infoLabel}>City</Text>
              <Text style={styles.infoValue}>{item.city || 'N/A'}</Text>
            </View>
          </View>

          {/* Phone & Parent Status Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoPair}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{item.phone || 'N/A'}</Text>
            </View>
            <View style={[styles.infoPair, { alignItems: 'flex-end' }]}>
              <Text style={styles.infoLabel}>Parent</Text>
              <View
                style={[
                  styles.badgeSmall,
                  {
                    backgroundColor: hasParent
                      ? ADMIN_COLORS.success
                      : ADMIN_COLORS.warning,
                  },
                ]}
              >
                <Text style={styles.badgeText}>
                  {hasParent ? 'Linked' : 'Not Linked'}
                </Text>
              </View>
            </View>
          </View>

          {/* Additional Info */}
          {item.profile_picture && (
            <View style={styles.additionalInfo}>
              <MaterialCommunityIcons
                name="image-outline"
                size={14}
                color={ADMIN_COLORS.info}
              />
              <Text style={styles.additionalText}>Has Photo</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="account-search-outline"
        size={60}
        color={ADMIN_COLORS.textMuted}
      />
      <Text style={styles.emptyTitle}>No Students Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || selectedGrade ? 'Try adjusting your filters' : 'No students yet'}
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
        <Text style={styles.headerTitle}>Students</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total_students}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.with_parent_id}</Text>
          <Text style={styles.statLabel}>With Parent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.without_parent_id}</Text>
          <Text style={styles.statLabel}>No Parent</Text>
        </View>
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
          placeholder="Search by name, email, phone, city..."
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

      {/* Grade Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by Grade:</Text>
        <FlatList
          data={GRADES}
          renderItem={({ item: grade }) => (
            <TouchableOpacity
              style={[
                styles.gradeBadge,
                selectedGrade === grade && styles.gradeBadgeActive,
              ]}
              onPress={() => handleGradeFilter(grade)}
            >
              <Text
                style={[
                  styles.gradeBadgeText,
                  selectedGrade === grade && styles.gradeBadgeTextActive,
                ]}
              >
                {grade}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={grade => `grade-${grade}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled
          style={styles.gradeFilterList}
        />
        {selectedGrade && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSelectedGrade('');
              applyFilters(students, searchQuery, '');
            }}
          >
            <Text style={styles.clearButtonText}>Clear Filter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Student List */}
      <FlatList
        data={filteredStudents}
        renderItem={renderStudentCard}
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: ADMIN_COLORS.surface,
    paddingVertical: ADMIN_SPACING.md,
    paddingHorizontal: ADMIN_SPACING.md,
    ...ADMIN_SHADOW,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: ADMIN_COLORS.brand,
  },
  statLabel: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: ADMIN_COLORS.surfaceAlt,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.surface,
    marginHorizontal: ADMIN_SPACING.md,
    marginVertical: ADMIN_SPACING.sm,
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
    paddingVertical: ADMIN_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.surfaceAlt,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textMuted,
    marginBottom: ADMIN_SPACING.sm,
  },
  gradeFilterList: {
    marginBottom: ADMIN_SPACING.sm,
  },
  gradeBadge: {
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.xs,
    marginRight: ADMIN_SPACING.sm,
    borderRadius: ADMIN_RADII.pill,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.brand,
    backgroundColor: ADMIN_COLORS.surface,
  },
  gradeBadgeActive: {
    backgroundColor: ADMIN_COLORS.brand,
  },
  gradeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.brand,
  },
  gradeBadgeTextActive: {
    color: ADMIN_COLORS.surface,
  },
  clearButton: {
    paddingVertical: ADMIN_SPACING.xs,
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
  studentCard: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: ADMIN_RADII.card,
    marginBottom: ADMIN_SPACING.md,
    overflow: 'hidden',
    ...ADMIN_SHADOW,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.surfaceAlt,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: ADMIN_SPACING.md,
  },
  nameContainer: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: ADMIN_COLORS.text,
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
  },
  cardBody: {
    padding: ADMIN_SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: ADMIN_SPACING.md,
  },
  infoPair: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.textMuted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: ADMIN_COLORS.text,
  },
  badgeSmall: {
    paddingHorizontal: ADMIN_SPACING.sm,
    paddingVertical: 2,
    borderRadius: ADMIN_RADII.pill,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.surface,
  },
  additionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ADMIN_SPACING.md,
    paddingTop: ADMIN_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.surfaceAlt,
  },
  additionalText: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginLeft: ADMIN_SPACING.sm,
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
});

export default StudentListScreen;
