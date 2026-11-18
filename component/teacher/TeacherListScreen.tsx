import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Image,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getAllTeachers} from '../../api/teacher';
import {getAllCities, getAllSubjects} from '../../api/lookup';
import type {TeacherListItem, GetTeachersQueryParams} from '../../api/teacher/types';
import type {City, Subject} from '../../api/lookup/types';

// ==================== Types ====================

interface TeacherListScreenProps {
  onSelectTeacher: (teacherId: number) => void;
  onBack?: () => void;
}

// ==================== Component ====================

const TeacherListScreen: React.FC<TeacherListScreenProps> = ({
  onSelectTeacher,
  onBack,
}) => {
  // State
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // ==================== Effects ====================

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [selectedCityId, selectedSubjectId]);

  const loadInitialData = async () => {
    try {
      const [citiesData, subjectsData] = await Promise.all([
        getAllCities(),
        getAllSubjects(),
      ]);
      setCities(citiesData);
      setSubjects(subjectsData);
    } catch (err: any) {
      console.error('[TEACHER LIST] Error loading lookup data:', err);
    }
  };

  const loadTeachers = async () => {
    try {
      setError(null);
      const params: GetTeachersQueryParams = {
        limit: 100,
      };

      if (selectedCityId) {
        params.city_id = selectedCityId;
      }
      if (selectedSubjectId) {
        params.subject_id = selectedSubjectId;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const data = await getAllTeachers(params);
      // Only show teachers that have at least one rating or review
      const ratedTeachers = (data || []).filter(
        teacher =>
          Number(teacher?.total_reviews) > 0 || Number(teacher?.rating) > 0,
      );
      setTeachers(ratedTeachers);
    } catch (err: any) {
      console.error('[TEACHER LIST] Error loading teachers:', err);
      setError(err.message || 'Failed to load teachers');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTeachers();
  }, [selectedCityId, selectedSubjectId, searchQuery]);

  const handleSearch = () => {
    setIsLoading(true);
    loadTeachers();
  };

  const clearFilters = () => {
    setSelectedCityId(null);
    setSelectedSubjectId(null);
    setSearchQuery('');
    setIsLoading(true);
    loadTeachers();
  };

  // ==================== Render Helpers ====================

  const renderTeacherCard = ({item}: {item: TeacherListItem}) => {
    const subjectsText =
      item.subjects && item.subjects.length > 0
        ? item.subjects.map(s => s.subject?.name).filter(Boolean).join(', ')
        : 'No subjects';

    return (
      <TouchableOpacity
        style={styles.teacherCard}
        onPress={() => onSelectTeacher(item.teacher_id)}
        activeOpacity={0.7}>
        <View style={styles.cardContent}>
          {/* Profile Image */}
          <View style={styles.imageContainer}>
            {item.profile_picture ? (
              <Image
                source={{uri: item.profile_picture}}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageText}>
                  {item.full_name?.charAt(0).toUpperCase() || 'T'}
                </Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.teacherName}>{item.full_name}</Text>

            <View style={styles.ratingRow}>
              <Text style={styles.ratingStar}>⭐</Text>
              <Text style={styles.ratingText}>
                {item.rating?.toFixed(1) || '0.0'}
              </Text>
              <Text style={styles.reviewCount}>
                ({item.total_reviews || 0} reviews)
              </Text>
            </View>

            {item.highest_qualification && (
              <Text style={styles.qualification} numberOfLines={1}>
                🎓 {item.highest_qualification}
              </Text>
            )}

            <Text style={styles.subjects} numberOfLines={1}>
              📚 {subjectsText}
            </Text>

            <View style={styles.bottomRow}>
              {item.city_id && (
                <Text style={styles.location}>
                  📍 {item.area || 'Location'}
                </Text>
              )}
              <View
                style={[
                  styles.modeBadge,
                  item.teaching_mode === 'online' && styles.onlineBadge,
                  item.teaching_mode === 'physical' && styles.physicalBadge,
                  item.teaching_mode === 'both' && styles.bothBadge,
                ]}>
                <Text style={styles.modeText}>
                  {item.teaching_mode?.charAt(0).toUpperCase() +
                    item.teaching_mode?.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* City Filter */}
      <Text style={styles.filterLabel}>City</Text>
      <FlatList
        horizontal
        data={[{id: null, name: 'All'}, ...cities]}
        keyExtractor={item => String(item.id)}
        showsHorizontalScrollIndicator={false}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedCityId === item.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCityId(item.id)}>
            <Text
              style={[
                styles.filterChipText,
                selectedCityId === item.id && styles.filterChipTextActive,
              ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.filterList}
      />

      {/* Subject Filter */}
      <Text style={[styles.filterLabel, {marginTop: 12}]}>Subject</Text>
      <FlatList
        horizontal
        data={[{id: null, name: 'All'}, ...subjects]}
        keyExtractor={item => String(item.id)}
        showsHorizontalScrollIndicator={false}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedSubjectId === item.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedSubjectId(item.id)}>
            <Text
              style={[
                styles.filterChipText,
                selectedSubjectId === item.id && styles.filterChipTextActive,
              ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.filterList}
      />

      {/* Clear Filters */}
      {(selectedCityId || selectedSubjectId || searchQuery) && (
        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👨‍🏫</Text>
      <Text style={styles.emptyTitle}>No Teachers Found</Text>
      <Text style={styles.emptyText}>
        {searchQuery || selectedCityId || selectedSubjectId
          ? 'Try adjusting your filters'
          : 'No approved teachers available yet'}
      </Text>
    </View>
  );

  // ==================== Main Render ====================

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor="#10284C" barStyle="light-content" translucent={false} />
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          <Text style={styles.headerTitle}>Find Teachers</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}>
            <Text style={styles.filterIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, subject, or qualification..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {showFilters && renderFilters()}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E88E5" />
            <Text style={styles.loadingText}>Loading teachers...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={teachers}
            keyExtractor={item => String(item.teacher_id)}
            renderItem={renderTeacherCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#1E88E5']}
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

// ==================== Styles ====================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerSafeArea: {
    backgroundColor: '#10284C',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10284C',
    paddingHorizontal: 20,
    height: 64,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  backArrow: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  filterButton: {
    padding: 8,
  },
  filterIcon: {
    fontSize: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  searchButton: {
    marginLeft: 12,
    backgroundColor: '#075E54',
    borderRadius: 12,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 20,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  filterList: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#075E54',
    borderColor: '#075E54',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  clearButtonText: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#075E54',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  teacherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  imageContainer: {
    marginRight: 14,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoContainer: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingStar: {
    fontSize: 12,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#999',
  },
  qualification: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  subjects: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  location: {
    fontSize: 11,
    color: '#999',
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  onlineBadge: {
    backgroundColor: '#E3F2FD',
  },
  physicalBadge: {
    backgroundColor: '#FFF3E0',
  },
  bothBadge: {
    backgroundColor: '#E8F5E9',
  },
  modeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
  },
  arrowContainer: {
    paddingLeft: 8,
  },
  arrow: {
    fontSize: 24,
    color: '#CCC',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default TeacherListScreen;
