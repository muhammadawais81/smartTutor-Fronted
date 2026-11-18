import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  getParentProfile,
  getParentStudents,
  getParentStudentAttendance,
  getParentStudentMarks,
} from '../../api/parent';
import {API_BASE_URL} from '../../api/config';

const resolveProfilePictureUrl = (url?: string | null): string | null => {
  if (!url || !url.trim()) {
    return null;
  }

  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${path}`;
};

interface ParentDashboardScreenProps {
  onLogout: () => void;
  onChangePassword: () => void;
}

type DashboardView = 'overview' | 'attendance' | 'marks';

const ParentDashboardScreen = ({onLogout, onChangePassword}: ParentDashboardScreenProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [marksRecords, setMarksRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<DashboardView>('overview');

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentInsights(selectedStudentId);
    }
  }, [selectedStudentId]);

  const selectedStudent = students.find(item => item.student_id === selectedStudentId) || null;
  const selectedStudentProfile = selectedStudent?.student || null;

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [profileResponse, studentsResponse, storedUser] = await Promise.all([
        getParentProfile(),
        getParentStudents(),
        AsyncStorage.getItem('user'),
      ]);

      const fallbackProfile = storedUser ? JSON.parse(storedUser) : null;
      const resolvedProfile = profileResponse || fallbackProfile;
      setProfile(resolvedProfile);
      setStudents(studentsResponse || []);

      if (resolvedProfile?.must_change_password) {
        onChangePassword();
        return;
      }

      const firstStudentId = studentsResponse?.[0]?.student_id ?? null;
      setSelectedStudentId(firstStudentId);
    } catch (error: any) {
      Alert.alert('Parent Portal', error?.message || 'Failed to load parent portal data');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentInsights = async (studentId: number) => {
    try {
      setLoadingDetails(true);
      const [attendanceResponse, marksResponse] = await Promise.all([
        getParentStudentAttendance(studentId),
        getParentStudentMarks(studentId),
      ]);
      setAttendanceRecords(attendanceResponse || []);
      setMarksRecords(marksResponse || []);
    } catch (error: any) {
      console.error('[PARENT DASHBOARD] Failed to load student insights:', error);
      setAttendanceRecords([]);
      setMarksRecords([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user', 'user_role']);
    } catch (error) {
      console.warn('[PARENT DASHBOARD] Failed to clear auth state:', error);
    }

    onLogout();
  };

  const attendanceSummary = useMemo(() => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(record => record.status === 'present').length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return {total, present, absent, percentage};
  }, [attendanceRecords]);

  const marksSummary = useMemo(() => {
    const total = marksRecords.length;
    if (total === 0) {
      return {average: 0, total: 0, best: 0, worst: 0};
    }

    const percentages = marksRecords.map(record => {
      const totalMarks = Number(record.total_marks || 0);
      const obtained = Number(record.marks_obtained || 0);
      return totalMarks > 0 ? Math.round((obtained / totalMarks) * 100) : 0;
    });

    const average = Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length);
    return {
      average,
      total,
      best: Math.max(...percentages),
      worst: Math.min(...percentages),
    };
  }, [marksRecords]);

  const attendanceByDate = useMemo(() => {
    const grouped: Record<string, {present: number; absent: number}> = {};

    attendanceRecords.forEach(record => {
      const key = record.session_date || 'Unknown';
      if (!grouped[key]) {
        grouped[key] = {present: 0, absent: 0};
      }
      if (record.status === 'present') {
        grouped[key].present += 1;
      } else {
        grouped[key].absent += 1;
      }
    });

    return Object.entries(grouped)
      .map(([date, values]) => ({
        date,
        ...values,
        total: values.present + values.absent,
        percentage:
          values.present + values.absent > 0
            ? Math.round((values.present / (values.present + values.absent)) * 100)
            : 0,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords]);

  const marksByExam = useMemo(() => {
    return marksRecords
      .map(record => {
        const totalMarks = Number(record.total_marks || 0);
        const obtained = Number(record.marks_obtained || 0);
        const percentage = totalMarks > 0 ? Math.round((obtained / totalMarks) * 100) : 0;
        return {
          id: record.id,
          exam_name: record.exam_name,
          exam_date: record.exam_date,
          total_marks: totalMarks,
          marks_obtained: obtained,
          percentage,
        };
      })
      .sort((a, b) => b.exam_date.localeCompare(a.exam_date));
  }, [marksRecords]);

  const latestAttendance = attendanceRecords
    .slice()
    .sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''))[0];
  const latestMark = marksRecords
    .slice()
    .sort((a, b) => (b.exam_date || '').localeCompare(a.exam_date || ''))[0];

  const studentName = selectedStudentProfile?.full_name || selectedStudentProfile?.name || 'Select a student';

  const renderStudentAvatar = (
    name: string,
    profilePicture?: string | null,
    size: 'card' | 'header' = 'card',
  ) => {
    const photoUrl = resolveProfilePictureUrl(profilePicture);
    const initial = name.charAt(0).toUpperCase();
    const isHeader = size === 'header';

    if (photoUrl) {
      return (
        <Image
          source={{uri: photoUrl}}
          style={isHeader ? styles.studentHeaderAvatar : styles.studentAvatarImage}
        />
      );
    }

    return (
      <View style={isHeader ? styles.studentHeaderAvatarPlaceholder : styles.studentAvatar}>
        <Text style={isHeader ? styles.studentHeaderAvatarText : styles.studentAvatarText}>
          {initial}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar backgroundColor="#0B1B33" barStyle="light-content" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#46D9B1" />
          <Text style={styles.loadingText}>Loading parent dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor="#0B1B33" barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#46D9B1" />}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroGlowA} />
          <View style={styles.heroGlowB} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroKicker}>Parent Dashboard</Text>
              <Text style={styles.heroTitle}>Hello, {profile?.name || 'Parent'}</Text>
              <Text style={styles.heroSubtitle}>
                Track attendance, marks, and progress from one dashboard.
              </Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={18} color="#0B1B33" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaCard}>
              <Text style={styles.heroMetaValue}>{students.length}</Text>
              <Text style={styles.heroMetaLabel}>Linked Students</Text>
            </View>
            <View style={styles.heroMetaCard}>
              <Text style={styles.heroMetaValue}>{attendanceSummary.percentage}%</Text>
              <Text style={styles.heroMetaLabel}>Attendance</Text>
            </View>
            <View style={styles.heroMetaCard}>
              <Text style={styles.heroMetaValue}>{marksSummary.average}%</Text>
              <Text style={styles.heroMetaLabel}>Marks Avg</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabWrap}>
          {[
            {key: 'overview', label: 'Overview', icon: 'grid-outline'},
            {key: 'attendance', label: 'Attendance', icon: 'calendar-outline'},
            {key: 'marks', label: 'Marks', icon: 'bar-chart-outline'},
          ].map(tab => {
            const isActive = activeView === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveView(tab.key as DashboardView)}
                activeOpacity={0.85}>
                <Ionicons name={tab.icon} size={16} color={isActive ? '#FFFFFF' : '#5A6E87'} />
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Students</Text>
          <TouchableOpacity style={styles.refreshChip} onPress={handleRefresh} activeOpacity={0.85}>
            <Ionicons name="refresh" size={14} color="#0B1B33" />
            <Text style={styles.refreshChipText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {students.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color="#9FB3C8" />
            <Text style={styles.emptyTitle}>No linked students yet</Text>
            <Text style={styles.emptyText}>Ask the teacher to create a parent link for your child.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.studentRow}>
            {students.map(link => {
              const student = link.student || {};
              const studentLabel = student.full_name || student.name || `Student ${link.student_id}`;
              const isSelected = selectedStudentId === link.student_id;

              return (
                <TouchableOpacity
                  key={link.id}
                  style={[styles.studentCard, isSelected && styles.studentCardActive]}
                  onPress={() => setSelectedStudentId(link.student_id)}
                  activeOpacity={0.85}>
                  {renderStudentAvatar(studentLabel, student.profile_picture, 'card')}
                  <Text style={styles.studentName} numberOfLines={1}>{studentLabel}</Text>
                  <Text style={styles.studentMeta} numberOfLines={1}>{student.grade_level || link.relationship || 'Linked'}</Text>
                  <View style={[styles.studentPill, isSelected && styles.studentPillActive]}>
                    <Text style={[styles.studentPillText, isSelected && styles.studentPillTextActive]}>
                      {isSelected ? 'Selected' : 'Open'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* <View style={styles.studentHeaderCard}>
          <View style={styles.studentHeaderInfo}>
            {renderStudentAvatar(studentName, selectedStudentProfile?.profile_picture, 'header')}
            <View style={styles.studentHeaderTextBlock}>
              <Text style={styles.studentHeaderKicker}>Selected student</Text>
              <Text style={styles.studentHeaderTitle}>{studentName}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.passwordButton} onPress={onChangePassword} activeOpacity={0.85}>
            <Text style={styles.passwordButtonText}>Change Password</Text>
          </TouchableOpacity>
        </View> */}

        {activeView === 'overview' ? (
          <>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryCardTop}>
                  <Ionicons name="calendar-outline" size={18} color="#46D9B1" />
                  <Text style={styles.summaryLabel}>Attendance</Text>
                </View>
                <Text style={styles.summaryValue}>{attendanceSummary.percentage}%</Text>
                <Text style={styles.summarySubtext}>{attendanceSummary.present}/{attendanceSummary.total} sessions present</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, {width: `${attendanceSummary.percentage}%`}]} />
                </View>
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryCardTop}>
                  <Ionicons name="bar-chart-outline" size={18} color="#FFD166" />
                  <Text style={styles.summaryLabel}>Marks</Text>
                </View>
                <Text style={styles.summaryValue}>{marksSummary.average}%</Text>
                <Text style={styles.summarySubtext}>{marksSummary.total} exam records</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFillMarks, {width: `${marksSummary.average}%`}]} />
                </View>
              </View>
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Attendance graph</Text>
                <Text style={styles.chartMeta}>{attendanceSummary.percentage}% overall</Text>
              </View>
              {attendanceByDate.length > 0 ? (
                attendanceByDate.slice(0, 6).map(item => (
                  <View key={item.date} style={styles.chartRow}>
                    <Text style={styles.chartRowLabel} numberOfLines={1}>{item.date}</Text>
                    <View style={styles.chartBarTrack}>
                      <View style={[styles.chartBarFill, {width: `${item.percentage}%`}]} />
                    </View>
                    <Text style={styles.chartRowValue}>{item.present}/{item.total}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyInline}>No attendance data yet.</Text>
              )}
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Marks graph</Text>
                <Text style={styles.chartMeta}>{marksSummary.average}% average</Text>
              </View>
              {marksByExam.length > 0 ? (
                marksByExam.slice(0, 6).map(item => (
                  <View key={item.id} style={styles.chartRow}>
                    <Text style={styles.chartRowLabel} numberOfLines={1}>{item.exam_name}</Text>
                    <View style={styles.chartBarTrack}>
                      <View style={[styles.chartBarFillMarks, {width: `${item.percentage}%`}]} />
                    </View>
                    <Text style={styles.chartRowValue}>{item.percentage}%</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyInline}>No marks data yet.</Text>
              )}
            </View>

            <View style={styles.miniSection}>
              <Text style={styles.miniSectionTitle}>Latest updates</Text>
              <View style={styles.latestCard}>
                <View style={styles.latestItem}>
                  <Text style={styles.latestLabel}>Attendance</Text>
                  {latestAttendance ? (
                    <>
                      <Text style={styles.latestValue}>{latestAttendance.session_date}</Text>
                      <Text style={styles.latestMeta}>{String(latestAttendance.status || '').toUpperCase()}</Text>
                    </>
                  ) : (
                    <Text style={styles.latestMeta}>No attendance records yet.</Text>
                  )}
                </View>
                <View style={styles.latestDivider} />
                <View style={styles.latestItem}>
                  <Text style={styles.latestLabel}>Marks</Text>
                  {latestMark ? (
                    <>
                      <Text style={styles.latestValue}>{latestMark.exam_name}</Text>
                      <Text style={styles.latestMeta}>{latestMark.marks_obtained}/{latestMark.total_marks}</Text>
                    </>
                  ) : (
                    <Text style={styles.latestMeta}>No marks records yet.</Text>
                  )}
                </View>
              </View>
            </View>
          </>
        ) : activeView === 'attendance' ? (
          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitleMain}>All attendance</Text>
              <Text style={styles.listMetaMain}>{attendanceSummary.total} records</Text>
            </View>
            {loadingDetails ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color="#46D9B1" />
                <Text style={styles.inlineLoadingText}>Loading attendance...</Text>
              </View>
            ) : attendanceRecords.length > 0 ? (
              attendanceRecords.map(record => (
                <View key={record.id} style={styles.listRow}>
                  <View style={styles.listRowMain}>
                    <Text style={styles.listRowTitle}>{record.session_date}</Text>
                    <Text style={styles.listRowMeta}>{record.class_section ? `Section ${record.class_section}` : 'No section'}</Text>
                  </View>
                  <View style={[styles.statusBadge, record.status === 'present' ? styles.statusPresent : styles.statusAbsent]}>
                    <Text style={styles.statusText}>{String(record.status || '').toUpperCase()}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyInline}>No attendance data for this student yet.</Text>
            )}
          </View>
        ) : (
          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitleMain}>All marks</Text>
              <Text style={styles.listMetaMain}>{marksSummary.total} records</Text>
            </View>
            {loadingDetails ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color="#FFD166" />
                <Text style={styles.inlineLoadingText}>Loading marks...</Text>
              </View>
            ) : marksRecords.length > 0 ? (
              marksRecords.map(record => {
                const totalMarks = Number(record.total_marks || 0);
                const obtained = Number(record.marks_obtained || 0);
                const percentage = totalMarks > 0 ? Math.round((obtained / totalMarks) * 100) : 0;
                return (
                  <View key={record.id} style={styles.markRow}>
                    <View style={styles.listRowMain}>
                      <Text style={styles.listRowTitle}>{record.exam_name}</Text>
                      <Text style={styles.listRowMeta}>{record.exam_date}</Text>
                    </View>
                    <View style={styles.markScoreBlock}>
                      <Text style={styles.markScoreText}>{obtained}/{totalMarks}</Text>
                      <Text style={styles.markPercentText}>{percentage}%</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyInline}>No marks data for this student yet.</Text>
            )}
          </View>
        )}

        <View style={styles.footerCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#46D9B1" />
          <View style={styles.footerTextBlock}>
            <Text style={styles.footerTitle}>Secure parent access</Text>
            <Text style={styles.footerText}>Password changes and student data stay tied to your authenticated account.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F3F7FB'},
  content: {paddingBottom: 110, backgroundColor: '#F3F7FB'},
  loadingWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0B1B33'},
  loadingText: {marginTop: 12, color: '#C9D6E6', fontSize: 14, fontWeight: '600'},
  hero: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 18,
    borderRadius: 28,
    backgroundColor: '#0B1B33',
    overflow: 'hidden',
  },
  heroGlowA: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(70,217,177,0.18)',
    top: -48,
    right: -42,
  },
  heroGlowB: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,209,102,0.12)',
    bottom: -36,
    left: -20,
  },
  heroTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12},
  heroTextBlock: {flex: 1},
  heroKicker: {color: '#7FE9C9', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10},
  heroTitle: {color: '#FFFFFF', fontSize: 28, fontWeight: '900', lineHeight: 34},
  heroSubtitle: {color: '#C9D6E6', fontSize: 14, lineHeight: 20, marginTop: 10, maxWidth: 320},
  logoutButton: {flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10},
  logoutText: {color: '#0B1B33', fontSize: 12, fontWeight: '800'},
  heroMetaRow: {flexDirection: 'row', gap: 10, marginTop: 18},
  heroMetaCard: {flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'},
  heroMetaValue: {color: '#FFFFFF', fontSize: 22, fontWeight: '900'},
  heroMetaLabel: {color: '#C9D6E6', fontSize: 12, marginTop: 4, fontWeight: '600'},
  tabWrap: {flexDirection: 'row', marginHorizontal: 16, marginTop: 14, gap: 10},
  tabButton: {flex: 1, borderRadius: 16, backgroundColor: '#FFFFFF', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: '#E3EAF3'},
  tabButtonActive: {backgroundColor: '#0B1B33', borderColor: '#0B1B33'},
  tabButtonText: {fontSize: 13, fontWeight: '800', color: '#5A6E87'},
  tabButtonTextActive: {color: '#FFFFFF'},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 18, marginBottom: 10},
  sectionTitle: {fontSize: 18, fontWeight: '900', color: '#10284C'},
  refreshChip: {flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5F0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8},
  refreshChipText: {color: '#0B1B33', fontSize: 12, fontWeight: '800'},
  studentRow: {paddingHorizontal: 16, gap: 12},
  studentCard: {width: 152, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 14, borderWidth: 1, borderColor: '#E1EAF5', marginBottom: 6},
  studentCardActive: {borderColor: '#46D9B1', shadowColor: '#46D9B1', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: {width: 0, height: 6}, elevation: 2},
  studentAvatar: {width: 48, height: 48, borderRadius: 24, backgroundColor: '#0B1B33', alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden'},
  studentAvatarImage: {width: 48, height: 48, borderRadius: 24, marginBottom: 10, backgroundColor: '#E1EAF5'},
  studentAvatarText: {color: '#FFFFFF', fontSize: 18, fontWeight: '900'},
  studentName: {color: '#10284C', fontSize: 15, fontWeight: '900'},
  studentMeta: {color: '#5F6E82', fontSize: 12, marginTop: 4, minHeight: 16},
  studentPill: {marginTop: 12, borderRadius: 999, backgroundColor: '#F1F5FB', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6},
  studentPillActive: {backgroundColor: '#0B1B33'},
  studentPillText: {color: '#0B1B33', fontSize: 11, fontWeight: '800'},
  studentPillTextActive: {color: '#FFFFFF'},
  emptyCard: {marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E1EAF5'},
  emptyTitle: {color: '#10284C', fontSize: 16, fontWeight: '900', marginTop: 10},
  emptyText: {color: '#5F6E82', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19},
  studentHeaderCard: {marginHorizontal: 16, marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#E1EAF5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10},
  studentHeaderInfo: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12},
  studentHeaderTextBlock: {flex: 1},
  studentHeaderAvatar: {width: 52, height: 52, borderRadius: 26, backgroundColor: '#E1EAF5'},
  studentHeaderAvatarPlaceholder: {width: 52, height: 52, borderRadius: 26, backgroundColor: '#0B1B33', alignItems: 'center', justifyContent: 'center'},
  studentHeaderAvatarText: {color: '#FFFFFF', fontSize: 20, fontWeight: '900'},
  studentHeaderKicker: {color: '#46D9B1', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4},
  studentHeaderTitle: {color: '#10284C', fontSize: 18, fontWeight: '900', marginTop: 4},
  passwordButton: {backgroundColor: '#0B1B33', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10},
  passwordButtonText: {color: '#FFFFFF', fontSize: 12, fontWeight: '800'},
  summaryGrid: {flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16},
  summaryCard: {flex: 1, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#E1EAF5'},
  summaryCardTop: {flexDirection: 'row', alignItems: 'center', gap: 8},
  summaryLabel: {color: '#5F6E82', fontSize: 12, fontWeight: '800'},
  summaryValue: {color: '#10284C', fontSize: 28, fontWeight: '900', marginTop: 12},
  summarySubtext: {color: '#6B7C90', fontSize: 12, marginTop: 6, lineHeight: 17},
  progressTrack: {height: 8, backgroundColor: '#EEF3FA', borderRadius: 999, marginTop: 14, overflow: 'hidden'},
  progressFill: {height: '100%', backgroundColor: '#46D9B1', borderRadius: 999},
  progressFillMarks: {height: '100%', backgroundColor: '#FFD166', borderRadius: 999},
  chartCard: {marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#E1EAF5'},
  chartHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12},
  chartTitle: {fontSize: 16, fontWeight: '900', color: '#10284C'},
  chartMeta: {fontSize: 12, color: '#6B7C90', fontWeight: '600'},
  chartRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12},
  chartRowLabel: {width: 92, fontSize: 12, color: '#10284C', fontWeight: '700'},
  chartBarTrack: {flex: 1, height: 10, backgroundColor: '#EEF3FA', borderRadius: 999, overflow: 'hidden'},
  chartBarFill: {height: '100%', backgroundColor: '#46D9B1', borderRadius: 999},
  chartBarFillMarks: {height: '100%', backgroundColor: '#FFD166', borderRadius: 999},
  chartRowValue: {width: 50, textAlign: 'right', fontSize: 12, color: '#5F6E82', fontWeight: '800'},
  miniSection: {marginHorizontal: 16, marginTop: 14, backgroundColor: '#0B1B33', borderRadius: 22, padding: 16},
  miniSectionTitle: {color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginBottom: 12},
  latestCard: {backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'stretch'},
  latestItem: {flex: 1},
  latestDivider: {width: 1, backgroundColor: 'rgba(255,255,255,0.16)', marginHorizontal: 12},
  latestLabel: {color: '#8CD9C7', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4},
  latestValue: {color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginTop: 6},
  latestMeta: {color: '#C9D6E6', fontSize: 12, marginTop: 4},
  listCard: {marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#E1EAF5'},
  listHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14},
  listTitleMain: {fontSize: 17, fontWeight: '900', color: '#10284C'},
  listMetaMain: {fontSize: 12, color: '#6B7C90', fontWeight: '700'},
  inlineLoading: {paddingVertical: 20, alignItems: 'center', justifyContent: 'center'},
  inlineLoadingText: {marginTop: 8, color: '#6B7C90', fontSize: 13},
  listRow: {paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10},
  listRowMain: {flex: 1},
  listRowTitle: {color: '#10284C', fontSize: 14, fontWeight: '900'},
  listRowMeta: {color: '#6B7C90', fontSize: 12, marginTop: 4},
  statusBadge: {borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6},
  statusPresent: {backgroundColor: '#E7F7EC'},
  statusAbsent: {backgroundColor: '#FDECEC'},
  statusText: {color: '#10284C', fontSize: 11, fontWeight: '900'},
  markRow: {paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10},
  markScoreBlock: {alignItems: 'flex-end'},
  markScoreText: {color: '#10284C', fontSize: 13, fontWeight: '900'},
  markPercentText: {color: '#FFD166', fontSize: 12, fontWeight: '800', marginTop: 4},
  emptyInline: {color: '#6B7C90', fontSize: 13, paddingVertical: 8},
  footerCard: {marginHorizontal: 16, marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#E1EAF5', flexDirection: 'row', alignItems: 'center', gap: 12},
  footerTextBlock: {flex: 1},
  footerTitle: {color: '#10284C', fontSize: 14, fontWeight: '900'},
  footerText: {color: '#6B7C90', fontSize: 12, marginTop: 4, lineHeight: 18},
});

export default ParentDashboardScreen;
