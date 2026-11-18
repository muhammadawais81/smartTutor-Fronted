import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getAdminTeachers, getTeacherStatistics } from '../../api/admin';
import type { TeacherDetailResponse } from '../../api/teacher/types';
import type { TeacherStatistics } from '../../api/admin/types';
import { ADMIN_COLORS, ADMIN_SPACING, ADMIN_SHADOW, ADMIN_RADII } from './adminTheme';

interface AllTeachersScreenProps {
  onBack?: () => void;
  onSelectTeacher?: (teacherId: number) => void;
}

type StatusFilter = 'all' | 'incomplete' | 'pending_approval' | 'approved' | 'rejected' | 'suspended';

const AllTeachersScreen: React.FC<AllTeachersScreenProps> = ({
  onBack,
  onSelectTeacher,
}) => {
  const [teachers, setTeachers] = useState<TeacherDetailResponse[]>([]);
  const [stats, setStats] = useState<TeacherStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('approved');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [skip, setSkip] = useState(0);
  const limit = 50;

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setSkip(0);
    } else {
      setLoading(true);
    }

    try {
      const params = {
        skip: isRefresh ? 0 : skip,
        limit,
        status_filter: selectedStatus !== 'all' ? (selectedStatus as any) : undefined,
      };

      const [teachersData, statsData] = await Promise.all([
        getAdminTeachers(params),
        getTeacherStatistics(),
      ]);

      setTeachers(teachersData);
      setStats(statsData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skip, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const handleStatusFilter = (status: StatusFilter) => {
    setSelectedStatus(status);
    setShowFilterMenu(false);
    setSkip(0);
  };

  const filteredTeachers = useMemo(() => {
    let filtered = teachers;

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.full_name?.toLowerCase().includes(search) ||
          t.phone?.toLowerCase().includes(search) ||
          t.city?.name?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [teachers, searchText]);

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

  const renderTeacherItem = ({ item }: { item: TeacherDetailResponse }) => {
    const formatApprovalDate = (dateString: string | null) => {
      if (!dateString) return 'Recently approved';
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return date.toLocaleDateString();
    };

    return (
      <TouchableOpacity
        style={styles.teacherItem}
        onPress={() => onSelectTeacher?.(item.teacher_id)}>
        <View style={styles.itemLeft}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.profile_status) }]} />
          <View style={styles.itemInfo}>
            <Text style={styles.teacherName}>{item.full_name}</Text>
            <Text style={styles.teacherDetail}>{item.city?.name || 'N/A'} · {item.phone}</Text>
            
            {/* Approval Date for Approved Teachers */}
            {item.profile_status === 'approved' && item.approval_date && (
              <Text style={styles.approvalDate}>
                ✅ Approved {formatApprovalDate(item.approval_date)}
              </Text>
            )}
            
            <View style={styles.subjectsContainer}>
              <Text style={styles.subjectsText}>
                {item.subjects?.length || 0} subjects · {item.total_students || 0} students · ⭐ {item.rating || '0.0'}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.profile_status) + '20' }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(item.profile_status) }]}>
            {item.profile_status?.replace(/_/g, ' ').slice(0, 3).toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>No Teachers Found</Text>
      <Text style={styles.emptyMessage}>
        {searchText
          ? 'Try adjusting your search criteria'
          : 'No teachers in this category'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor={ADMIN_COLORS.brand} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedStatus === 'approved' ? 'Active Teachers' : 'All Teachers'}
        </Text>
        <View style={styles.headerRight}>
          {stats && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>
                {selectedStatus === 'approved' ? stats.approved : stats.total_teachers}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats Bar */}
      {stats && (
        <View style={styles.statsBar}>
          <StatItem
            label="Approved"
            value={stats.approved}
            color="#4CAF50"
          />
          <StatItem
            label="Pending"
            value={stats.pending_approval}
            color="#FFD700"
          />
          <StatItem
            label="Rejected"
            value={stats.rejected}
            color="#F44336"
          />
          <StatItem
            label="Suspended"
            value={stats.suspended}
            color="#9E9E9E"
          />
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, city..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterMenu(true)}>
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Active Filter Badge */}
      {selectedStatus !== 'all' && (
        <View style={styles.activeFilterBadge}>
          <Text style={styles.activeFilterText}>
            Filter: {selectedStatus.replace(/_/g, ' ').toUpperCase()}
          </Text>
          <TouchableOpacity onPress={() => handleStatusFilter('all')}>
            <Text style={styles.clearFilterText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Teachers List or Loading */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ADMIN_COLORS.accent} />
          <Text style={styles.loadingText}>Loading teachers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTeachers}
          renderItem={renderTeacherItem}
          keyExtractor={item => item.teacher_id.toString()}
          contentContainerStyle={[
            styles.listContent,
            filteredTeachers.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          scrollIndicatorInsets={{ right: 1 }}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterMenu}
        animationType="fade"
        transparent
        onRequestClose={() => setShowFilterMenu(false)}>
        <TouchableOpacity
          style={styles.filterModalOverlay}
          onPress={() => setShowFilterMenu(false)}>
          <View style={styles.filterModalContent}>
            <Text style={styles.filterModalTitle}>Filter by Status</Text>

            <FilterOption
              label="All Teachers"
              value="all"
              selected={selectedStatus === 'all'}
              count={stats?.total_teachers}
              onPress={() => handleStatusFilter('all')}
            />

            <FilterOption
              label="Incomplete"
              value="incomplete"
              selected={selectedStatus === 'incomplete'}
              count={stats?.incomplete_profiles}
              onPress={() => handleStatusFilter('incomplete')}
              icon="⚠️"
            />

            <FilterOption
              label="Pending Approval"
              value="pending_approval"
              selected={selectedStatus === 'pending_approval'}
              count={stats?.pending_approval}
              onPress={() => handleStatusFilter('pending_approval')}
              icon="⏳"
            />

            <FilterOption
              label="Approved"
              value="approved"
              selected={selectedStatus === 'approved'}
              count={stats?.approved}
              onPress={() => handleStatusFilter('approved')}
              icon="✅"
            />

            <FilterOption
              label="Rejected"
              value="rejected"
              selected={selectedStatus === 'rejected'}
              count={stats?.rejected}
              onPress={() => handleStatusFilter('rejected')}
              icon="❌"
            />

            <FilterOption
              label="Suspended"
              value="suspended"
              selected={selectedStatus === 'suspended'}
              count={stats?.suspended}
              onPress={() => handleStatusFilter('suspended')}
              icon="🚫"
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const StatItem = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={styles.statItem}>
    <View style={[styles.statColor, { backgroundColor: color }]} />
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const FilterOption = ({
  label,
  value,
  selected,
  count,
  onPress,
  icon,
}: {
  label: string;
  value: string;
  selected: boolean;
  count?: number;
  onPress: () => void;
  icon?: string;
}) => (
  <TouchableOpacity
    style={[styles.filterOption, selected && styles.filterOptionSelected]}
    onPress={onPress}>
    <View style={styles.filterOptionLeft}>
      {icon && <Text style={styles.filterOptionIcon}>{icon}</Text>}
      <Text style={[styles.filterOptionLabel, selected && { color: ADMIN_COLORS.accent, fontWeight: '600' }]}>
        {label}
      </Text>
    </View>
    <View style={styles.filterOptionRight}>
      <Text style={styles.filterOptionCount}>{count || 0}</Text>
      {selected && <Text style={styles.filterOptionCheck}>✓</Text>}
    </View>
  </TouchableOpacity>
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
    flex: 1,
    marginLeft: ADMIN_SPACING.md,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  totalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.xs,
    borderRadius: ADMIN_RADII.pill,
  },
  totalBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 4,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  statColor: {
    width: 3,
    height: 28,
    borderRadius: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    lineHeight: 14,
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#333',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIcon: {
    fontSize: 18,
  },
  activeFilterBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  clearFilterText: {
    fontSize: 16,
    color: '#1976D2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  teacherItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  itemInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  teacherDetail: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  approvalDate: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  subjectsContainer: {
    marginTop: 2,
  },
  subjectsText: {
    fontSize: 10,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterOptionSelected: {
    backgroundColor: ADMIN_COLORS.brandSoft,
    borderLeftWidth: 4,
    borderLeftColor: ADMIN_COLORS.accent,
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  filterOptionIcon: {
    fontSize: 18,
  },
  filterOptionLabel: {
    fontSize: 13,
    color: '#333',
  },
  filterOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterOptionCount: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  filterOptionCheck: {
    fontSize: 16,
    color: ADMIN_COLORS.accent,
    fontWeight: '600',
  },
});

export default AllTeachersScreen;
