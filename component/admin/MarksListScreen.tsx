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
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ADMIN_COLORS, ADMIN_SPACING, ADMIN_SHADOW, ADMIN_RADII } from './adminTheme';
import { getAdminMarks } from '../../api/admin/adminApi';
import { MarksRecord } from '../../api/admin/types';

interface MarksListScreenProps {
  onBack?: () => void;
}

interface MarksItem extends MarksRecord {
  key: string;
}

const MarksListScreen: React.FC<MarksListScreenProps> = ({ onBack }) => {
  const navigation = useNavigation();
  const [marks, setMarks] = useState<MarksItem[]>([]);
  const [filteredMarks, setFilteredMarks] = useState<MarksItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [sortBy, setSortBy] = useState<'marks' | 'percentage' | 'date'>('date');
  const [stats, setStats] = useState({
    total: 0,
    avgPercentage: 0,
    highest: 0,
    lowest: 100,
  });

  // Get unique exam names for filtering
  const [examNames, setExamNames] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminMarks({ limit: 100, skip: 0 });

      // Calculate stats and extract unique exams
      let totalPercentage = 0;
      let highest = 0;
      let lowest = 100;
      const exams = new Set<string>();

      const marksWithKeys = data.data.map((m: MarksRecord, idx: number) => {
        const percentage = (m.marks_obtained / m.total_marks) * 100;
        totalPercentage += percentage;
        highest = Math.max(highest, percentage);
        lowest = Math.min(lowest, percentage);
        if (m.exam_name) exams.add(m.exam_name);

        return {
          ...m,
          key: `marks-${m.id}-${idx}`,
        };
      });

      setMarks(marksWithKeys);
      setExamNames(Array.from(exams).sort());
      setStats({
        total: marksWithKeys.length,
        avgPercentage: marksWithKeys.length > 0 ? totalPercentage / marksWithKeys.length : 0,
        highest,
        lowest: lowest === 100 ? 0 : lowest,
      });
      applyFilters(marksWithKeys, searchQuery, examFilter, sortBy);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load marks');
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

  const applyFilters = (
    data: MarksItem[],
    query: string,
    exam: string,
    sort: 'marks' | 'percentage' | 'date'
  ) => {
    let filtered = data;

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        m =>
          m.student?.user?.name?.toLowerCase().includes(q) ||
          m.subject?.name?.toLowerCase().includes(q) ||
          m.teacher?.user?.name?.toLowerCase().includes(q)
      );
    }

    if (exam) {
      filtered = filtered.filter(m => m.exam_name === exam);
    }

    // Apply sorting
    filtered = filtered.sort((a, b) => {
      switch (sort) {
        case 'marks':
          return b.marks_obtained - a.marks_obtained;
        case 'percentage':
          const percA = (a.marks_obtained / a.total_marks) * 100;
          const percB = (b.marks_obtained / b.total_marks) * 100;
          return percB - percA;
        case 'date':
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        default:
          return 0;
      }
    });

    setFilteredMarks(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(marks, text, examFilter, sortBy);
  };

  const handleExamFilter = (exam: string) => {
    const newExam = examFilter === exam ? '' : exam;
    setExamFilter(newExam);
    applyFilters(marks, searchQuery, newExam, sortBy);
  };

  const handleSortChange = (sort: 'marks' | 'percentage' | 'date') => {
    setSortBy(sort);
    applyFilters(marks, searchQuery, examFilter, sort);
  };

  const getPercentage = (obtained: number, total: number) => {
    return ((obtained / total) * 100).toFixed(1);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return ADMIN_COLORS.success;
    if (percentage >= 60) return ADMIN_COLORS.warning;
    return ADMIN_COLORS.danger;
  };

  const getGradeLetter = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const renderMarksCard = ({ item }: { item: MarksItem }) => {
    const percentage = parseFloat(getPercentage(item.marks_obtained, item.total_marks));
    const grade = getGradeLetter(percentage);

    return (
      <View style={styles.marksCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerContent}>
            <Text style={styles.studentName}>{item.student?.user?.name || 'Unknown'}</Text>
            <View style={styles.headerSubtitle}>
              <MaterialCommunityIcons
                name="clipboard-list"
                size={12}
                color={ADMIN_COLORS.textMuted}
              />
              <Text style={styles.examName}>{item.exam_name || 'N/A'}</Text>
            </View>
          </View>
          <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(percentage) }]}>
            <Text style={styles.gradeBadgeText}>{grade}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          {/* Subject & Teacher Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoPair}>
              <MaterialCommunityIcons
                name="book-open-outline"
                size={14}
                color={ADMIN_COLORS.brand}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Subject</Text>
                <Text style={styles.infoValue}>{item.subject?.name || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.infoPair}>
              <MaterialCommunityIcons
                name="account-tie"
                size={14}
                color={ADMIN_COLORS.brand}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Teacher</Text>
                <Text style={styles.infoValue}>{item.teacher?.user?.name || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Marks Display */}
          <View style={styles.marksDisplay}>
            <View style={styles.marksBox}>
              <Text style={styles.marksLabel}>Marks Obtained</Text>
              <Text style={[styles.marksValue, { color: getGradeColor(percentage) }]}>
                {item.marks_obtained}
              </Text>
              <Text style={styles.marksOutOf}>/ {item.total_marks}</Text>
            </View>

            <View style={styles.percentageBox}>
              <Text style={styles.percentageLabel}>Percentage</Text>
              <Text style={[styles.percentageValue, { color: getGradeColor(percentage) }]}>
                {percentage}%
              </Text>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: getGradeColor(percentage),
                  },
                ]}
              />
            </View>
          </View>

          {/* Date & Level */}
          <View style={styles.metadataRow}>
            <View style={styles.metadata}>
              <MaterialCommunityIcons
                name="calendar-outline"
                size={12}
                color={ADMIN_COLORS.info}
              />
              <Text style={styles.metadataText}>
                {new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            {item.subject?.level && (
              <View style={styles.metadata}>
                <MaterialCommunityIcons
                  name="layers-outline"
                  size={12}
                  color={ADMIN_COLORS.info}
                />
                <Text style={styles.metadataText}>Level {item.subject.level}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="file-document-outline"
        size={60}
        color={ADMIN_COLORS.textMuted}
      />
      <Text style={styles.emptyTitle}>No Marks Records Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || examFilter ? 'Try adjusting your filters' : 'No records yet'}
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
        <Text style={styles.headerTitle}>Marks</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.avgPercentage.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg %</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: ADMIN_COLORS.success }]}>
            {stats.highest.toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Highest</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: ADMIN_COLORS.danger }]}>
            {stats.lowest.toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Lowest</Text>
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
          placeholder="Search student, subject, teacher..."
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

      {/* Exam & Sort Section */}
      <View style={styles.filterSection}>
        {/* Exam Filter */}
        {examNames.length > 0 && (
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Filter by Exam:</Text>
            <FlatList
              data={examNames}
              renderItem={({ item: exam }) => (
                <TouchableOpacity
                  style={[
                    styles.examBadge,
                    examFilter === exam && styles.examBadgeActive,
                  ]}
                  onPress={() => handleExamFilter(exam)}
                >
                  <Text
                    style={[
                      styles.examBadgeText,
                      examFilter === exam && styles.examBadgeTextActive,
                    ]}
                  >
                    {exam}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={exam => `exam-${exam}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled
              style={styles.examFilterList}
            />
          </View>
        )}

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.filterLabel}>Sort by:</Text>
          <View style={styles.sortButtons}>
            {(['marks', 'percentage', 'date'] as const).map(sort => (
              <TouchableOpacity
                key={sort}
                style={[
                  styles.sortButton,
                  sortBy === sort && styles.sortButtonActive,
                ]}
                onPress={() => handleSortChange(sort)}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    sortBy === sort && styles.sortButtonTextActive,
                  ]}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {(examFilter || searchQuery) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setExamFilter('');
              setSearchQuery('');
              applyFilters(marks, '', '', sortBy);
            }}
          >
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Marks List */}
      <FlatList
        data={filteredMarks}
        renderItem={renderMarksCard}
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
    fontSize: 16,
    fontWeight: '700',
    color: ADMIN_COLORS.brand,
    marginVertical: 2,
  },
  statLabel: {
    fontSize: 10,
    color: ADMIN_COLORS.textMuted,
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
  filterContainer: {
    marginBottom: ADMIN_SPACING.md,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textMuted,
    marginBottom: ADMIN_SPACING.sm,
  },
  examFilterList: {
    marginHorizontal: -ADMIN_SPACING.md,
    paddingHorizontal: ADMIN_SPACING.md,
  },
  examBadge: {
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.xs,
    marginRight: ADMIN_SPACING.sm,
    borderRadius: ADMIN_RADII.pill,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.brand,
    backgroundColor: ADMIN_COLORS.surface,
  },
  examBadgeActive: {
    backgroundColor: ADMIN_COLORS.brand,
  },
  examBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.brand,
  },
  examBadgeTextActive: {
    color: ADMIN_COLORS.surface,
  },
  sortContainer: {
    marginBottom: ADMIN_SPACING.md,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: ADMIN_SPACING.sm,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: ADMIN_SPACING.sm,
    borderRadius: ADMIN_RADII.input,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.surfaceAlt,
    backgroundColor: ADMIN_COLORS.surface,
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: ADMIN_COLORS.brand,
    borderColor: ADMIN_COLORS.brand,
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: ADMIN_COLORS.textMuted,
  },
  sortButtonTextActive: {
    color: ADMIN_COLORS.surface,
    fontWeight: '600',
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
  marksCard: {
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
  examName: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginLeft: 4,
  },
  gradeBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: ADMIN_SPACING.md,
  },
  gradeBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: ADMIN_COLORS.surface,
  },
  cardBody: {
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: ADMIN_SPACING.md,
    gap: ADMIN_SPACING.md,
  },
  infoPair: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    marginLeft: ADMIN_SPACING.sm,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: ADMIN_COLORS.text,
  },
  marksDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ADMIN_SPACING.md,
    paddingBottom: ADMIN_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.surfaceAlt,
  },
  marksBox: {
    flex: 1,
    alignItems: 'center',
  },
  marksLabel: {
    fontSize: 10,
    color: ADMIN_COLORS.textMuted,
    marginBottom: 4,
  },
  marksValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  marksOutOf: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
  },
  percentageBox: {
    flex: 0.8,
    alignItems: 'center',
  },
  percentageLabel: {
    fontSize: 10,
    color: ADMIN_COLORS.textMuted,
    marginBottom: 4,
  },
  percentageValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: ADMIN_COLORS.surfaceAlt,
    borderRadius: 3,
    marginBottom: ADMIN_SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: ADMIN_SPACING.md,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 11,
    color: ADMIN_COLORS.info,
    marginLeft: 4,
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

export default MarksListScreen;
