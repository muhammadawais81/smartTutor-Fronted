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
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ADMIN_COLORS, ADMIN_SPACING, ADMIN_SHADOW, ADMIN_RADII } from './adminTheme';
import { getAdminAttendance } from '../../api/admin/adminApi';
import { AttendanceRecord } from '../../api/admin/types';

interface AttendanceListScreenProps {
  onBack?: () => void;
}

interface AttendanceItem extends AttendanceRecord {
  key: string;
}

const AttendanceListScreen: React.FC<AttendanceListScreenProps> = ({ onBack }) => {
  const navigation = useNavigation();
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [filteredAttendances, setFilteredAttendances] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'present' | 'absent' | ''>('');
  const [dateFilter, setDateFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminAttendance({ limit: 100, skip: 0 });

      // Calculate stats
      let presentCount = 0;
      let absentCount = 0;

      const attendancesWithKeys = data.data.map((a: AttendanceRecord, idx: number) => {
        if (a.status === 'present') presentCount++;
        if (a.status === 'absent') absentCount++;
        return {
          ...a,
          key: `attendance-${a.id}-${idx}`,
        };
      });

      setAttendances(attendancesWithKeys);
      setStats({
        total: attendancesWithKeys.length,
        present: presentCount,
        absent: absentCount,
      });
      applyFilters(attendancesWithKeys, searchQuery, statusFilter, dateFilter);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load attendance records');
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
    data: AttendanceItem[],
    query: string,
    status: 'present' | 'absent' | '',
    date: string
  ) => {
    let filtered = data;

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.student?.user?.name?.toLowerCase().includes(q) ||
          a.subject?.name?.toLowerCase().includes(q) ||
          a.teacher?.user?.name?.toLowerCase().includes(q)
      );
    }

    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }

    if (date) {
      filtered = filtered.filter(a => {
        const recordDate = new Date(a.session_date).toISOString().split('T')[0];
        return recordDate === date;
      });
    }

    setFilteredAttendances(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(attendances, text, statusFilter, dateFilter);
  };

  const handleStatusFilter = (status: 'present' | 'absent' | '') => {
    const newStatus = statusFilter === status ? '' : status;
    setStatusFilter(newStatus);
    applyFilters(attendances, searchQuery, newStatus, dateFilter);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const getStatusColor = (status: string) => {
    return status === 'present' ? ADMIN_COLORS.success : ADMIN_COLORS.danger;
  };

  const getStatusIcon = (status: string) => {
    return status === 'present' ? 'check-circle' : 'close-circle';
  };

  const renderAttendanceCard = ({ item }: { item: AttendanceItem }) => {
    const isPresent = item.status === 'present';

    return (
      <View style={styles.attendanceCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons
                name={getStatusIcon(item.status)}
                size={16}
                color={getStatusColor(item.status)}
              />
              <Text style={styles.studentName}>{item.student?.user?.name || 'Unknown'}</Text>
            </View>
            <View style={styles.subtitleRow}>
              <MaterialCommunityIcons
                name="calendar-outline"
                size={12}
                color={ADMIN_COLORS.textMuted}
              />
              <Text style={styles.dateText}>{formatDate(item.session_date)}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {isPresent ? 'Present' : 'Absent'}
            </Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          {/* Subject & Teacher Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoPair}>
              <MaterialCommunityIcons
                name="book-outline"
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

          {/* Metadata */}
          <View style={styles.metadataRow}>
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
            <View style={styles.metadata}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={12}
                color={ADMIN_COLORS.info}
              />
              <Text style={styles.metadataText}>
                {new Date(item.created_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="clipboard-list-outline"
        size={60}
        color={ADMIN_COLORS.textMuted}
      />
      <Text style={styles.emptyTitle}>No Attendance Records Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || statusFilter || dateFilter
          ? 'Try adjusting your filters'
          : 'No records yet'}
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
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Bar */}}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <MaterialCommunityIcons
            name="check-circle"
            size={16}
            color={ADMIN_COLORS.success}
          />
          <Text style={[styles.statValue, { color: ADMIN_COLORS.success }]}>
            {stats.present}
          </Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <MaterialCommunityIcons
            name="close-circle"
            size={16}
            color={ADMIN_COLORS.danger}
          />
          <Text style={[styles.statValue, { color: ADMIN_COLORS.danger }]}>
            {stats.absent}
          </Text>
          <Text style={styles.statLabel}>Absent</Text>
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

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterButtons}>
            {(['present', 'absent'] as const).map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  statusFilter === status && styles.filterButtonActive,
                ]}
                onPress={() => handleStatusFilter(status)}
              >
                <View
                  style={[
                    styles.filterDot,
                    {
                      backgroundColor:
                        status === 'present' ? ADMIN_COLORS.success : ADMIN_COLORS.danger,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    statusFilter === status && styles.filterButtonTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {(statusFilter || dateFilter) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setStatusFilter('');
              setDateFilter('');
              applyFilters(attendances, searchQuery, '', '');
            }}
          >
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Attendance List */}
      <FlatList
        data={filteredAttendances}
        renderItem={renderAttendanceCard}
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
    marginVertical: 2,
  },
  statLabel: {
    fontSize: 11,
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ADMIN_SPACING.md,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textMuted,
    marginRight: ADMIN_SPACING.md,
  },
  filterButtons: {
    flexDirection: 'row',
    flex: 1,
    gap: ADMIN_SPACING.sm,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ADMIN_SPACING.sm,
    paddingVertical: 6,
    borderRadius: ADMIN_RADII.input,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.surfaceAlt,
    backgroundColor: ADMIN_COLORS.surface,
  },
  filterButtonActive: {
    backgroundColor: ADMIN_COLORS.brand + '20',
    borderColor: ADMIN_COLORS.brand,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: ADMIN_COLORS.textMuted,
  },
  filterButtonTextActive: {
    color: ADMIN_COLORS.text,
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
  attendanceCard: {
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: ADMIN_COLORS.text,
    marginLeft: ADMIN_SPACING.xs,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
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
  infoRow: {
    flexDirection: 'row',
    marginBottom: ADMIN_SPACING.md,
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
  metadataRow: {
    flexDirection: 'row',
    gap: ADMIN_SPACING.md,
    paddingTop: ADMIN_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.surfaceAlt,
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

export default AttendanceListScreen;
