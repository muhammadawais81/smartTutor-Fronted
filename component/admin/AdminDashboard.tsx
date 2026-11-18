import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {getStudentStatistics, getTeacherStatistics} from '../../api/admin/adminApi';
import type {StudentStatistics, TeacherStatistics} from '../../api/admin/types';
import {ADMIN_COLORS, ADMIN_SPACING, ADMIN_SHADOW, ADMIN_RADII} from './adminTheme';

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigateToTeachers: () => void;
  onNavigateToAllTeachers: () => void;
  onNavigateToStudents: () => void;
}

type QuickCard = {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  onNavigateToTeachers,
  onNavigateToAllTeachers,
  onNavigateToStudents,
}) => {
  const [adminName, setAdminName] = useState('Admin');
  const [teacherStats, setTeacherStats] = useState<TeacherStatistics | null>(null);
  const [studentStats, setStudentStats] = useState<StudentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [teacherResponse, studentResponse, storedName] = await Promise.all([
        getTeacherStatistics(),
        getStudentStatistics(),
        AsyncStorage.getItem('user_name'),
      ]);

      setTeacherStats(teacherResponse);
      setStudentStats(studentResponse);
      setAdminName(storedName || 'Admin');
    } catch (error: any) {
      Alert.alert('Dashboard Error', error?.message || 'Failed to load admin dashboard data');
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        await loadDashboard();
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [loadDashboard]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboard]);

  const handleLogout = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data', 'user_name', 'user_role']);
    } catch (error) {
      console.warn('[AdminDashboard] Failed to clear auth state:', error);
    }

    onLogout();
  }, [onLogout]);

  const quickCards: QuickCard[] = [
    {title: 'Teachers', subtitle: 'Pending approvals and reviews', icon: 'account-group-outline', color: ADMIN_COLORS.brand, onPress: onNavigateToTeachers},
    {title: 'Teacher Enrollments', subtitle: 'Browse teachers and enrolled students', icon: 'account-search-outline', color: ADMIN_COLORS.info, onPress: onNavigateToAllTeachers},
    {title: 'Students', subtitle: 'Search and manage students', icon: 'school-outline', color: ADMIN_COLORS.success, onPress: onNavigateToStudents},
  ];

  const teacherTotal = teacherStats?.total_teachers ?? 0;
  const studentTotal = studentStats?.total_students ?? 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ADMIN_COLORS.accent} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ADMIN_COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroText}>
              <Text style={styles.heroKicker}>SmartTutor Admin</Text>
              <Text style={styles.heroTitle}>Welcome, {adminName}</Text>
              <Text style={styles.heroSubtitle}>Manage the platform from one clean overview.</Text>
            </View>
            <TouchableOpacity style={styles.logoutPill} onPress={handleLogout} activeOpacity={0.85}>
              <MaterialCommunityIcons name="logout" size={18} color={ADMIN_COLORS.surface} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.sectionMeta}>Live stats</Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{teacherTotal}</Text>
            <Text style={styles.metricLabel}>Teachers</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{studentTotal}</Text>
            <Text style={styles.metricLabel}>Students</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionMeta}>Open modules</Text>
        </View>

        <View style={styles.cardGrid}>
          {quickCards.map(card => (
            <TouchableOpacity key={card.title} style={styles.card} onPress={card.onPress} activeOpacity={0.86}>
              <View style={[styles.cardIconWrap, {backgroundColor: `${card.color}18`}]}>
                <MaterialCommunityIcons name={card.icon} size={28} color={card.color} />
              </View>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              <View style={styles.cardFooter}>
                <Text style={[styles.cardAction, {color: card.color}]}>Open</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={card.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: ADMIN_COLORS.surfaceAlt},
  screen: {flex: 1, backgroundColor: ADMIN_COLORS.surfaceAlt},
  content: {padding: ADMIN_SPACING.md, paddingBottom: ADMIN_SPACING.xl},
  loadingWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: ADMIN_SPACING.xl},
  loadingText: {marginTop: ADMIN_SPACING.md, color: ADMIN_COLORS.textMuted, fontSize: 14},
  hero: {backgroundColor: ADMIN_COLORS.brand, borderRadius: ADMIN_RADII.card, padding: ADMIN_SPACING.lg, marginBottom: ADMIN_SPACING.lg, ...ADMIN_SHADOW},
  heroTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: ADMIN_SPACING.md},
  heroText: {flex: 1},
  heroKicker: {color: 'rgba(255,255,255,0.84)', fontSize: 12, marginBottom: ADMIN_SPACING.xs, letterSpacing: 0.3, textTransform: 'uppercase'},
  heroTitle: {color: ADMIN_COLORS.surface, fontSize: 28, fontWeight: '800', marginBottom: ADMIN_SPACING.xs},
  heroSubtitle: {color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 18},
  logoutPill: {flexDirection: 'row', alignItems: 'center', gap: ADMIN_SPACING.xs, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: ADMIN_SPACING.md, paddingVertical: ADMIN_SPACING.sm, borderRadius: ADMIN_RADII.pill},
  logoutText: {color: ADMIN_COLORS.surface, fontSize: 12, fontWeight: '700'},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: ADMIN_SPACING.sm},
  sectionTitle: {fontSize: 18, fontWeight: '700', color: ADMIN_COLORS.text},
  sectionMeta: {fontSize: 12, color: ADMIN_COLORS.textMuted},
  metricsRow: {flexDirection: 'row', gap: ADMIN_SPACING.sm, marginBottom: ADMIN_SPACING.lg},
  metricCard: {flex: 1, backgroundColor: ADMIN_COLORS.surface, borderRadius: ADMIN_RADII.card, padding: ADMIN_SPACING.lg, minHeight: 92, justifyContent: 'space-between', ...ADMIN_SHADOW},
  metricValue: {fontSize: 24, fontWeight: '800', color: ADMIN_COLORS.accent},
  metricLabel: {fontSize: 12, color: ADMIN_COLORS.textMuted, fontWeight: '600'},
  cardGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'},
  card: {width: '48%', backgroundColor: ADMIN_COLORS.surface, borderRadius: ADMIN_RADII.card, padding: ADMIN_SPACING.md, marginBottom: ADMIN_SPACING.md, minHeight: 164, ...ADMIN_SHADOW},
  cardIconWrap: {width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: ADMIN_SPACING.md},
  cardTitle: {fontSize: 15, fontWeight: '700', color: ADMIN_COLORS.text, marginBottom: ADMIN_SPACING.xs},
  cardSubtitle: {fontSize: 12, color: ADMIN_COLORS.textMuted, lineHeight: 17, flex: 1},
  cardFooter: {marginTop: ADMIN_SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  cardAction: {fontSize: 12, fontWeight: '700'},
});

export default AdminDashboard;

