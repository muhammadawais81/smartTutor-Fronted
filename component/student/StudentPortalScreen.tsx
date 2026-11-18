import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  getMyAttendanceRecords,
  getMyMarksRecords,
} from '../../api';
import {getMyEnrollments} from '../../api/enrollment';

const StudentPortalScreen = ({onBack}: {onBack: () => void}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'marks'>('attendance');
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [marksRecords, setMarksRecords] = useState<any[]>([]);
  const [subjectMap, setSubjectMap] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSubjects = async () => {
    try {
      const enrollments = await getMyEnrollments();
      const nextMap: Record<number, string> = {};
      enrollments.forEach((enrollment: any) => {
        const subjectId = enrollment?.teacher_subject?.subject_id;
        const subjectName = enrollment?.teacher_subject?.subject?.name;
        if (subjectId && subjectName) {
          nextMap[subjectId] = subjectName;
        }
      });
      setSubjectMap(nextMap);
    } catch (error) {
      console.error('[STUDENT PORTAL] Failed to load subjects:', error);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      await loadSubjects();

      if (activeTab === 'attendance') {
        const records = await getMyAttendanceRecords();
        setAttendanceRecords(records || []);
      } else {
        const records = await getMyMarksRecords();
        setMarksRecords(records || []);
      }
    } catch (error) {
      console.error('[STUDENT PORTAL] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const overallAttendance = useMemo(() => {
    const totalSessions = attendanceRecords.length;
    const totalPresent = attendanceRecords.filter(
      (record) => record.status === 'present'
    ).length;

    const percentage = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

    return {
      totalSessions,
      totalPresent,
      percentage,
    };
  }, [attendanceRecords]);

  const attendanceBySubject = useMemo(() => {
    const subjectMapLocal: Record<number, {records: any[]}> = {};
    attendanceRecords.forEach((record) => {
      const subjectId = record.subject_id || 0;
      if (!subjectMapLocal[subjectId]) {
        subjectMapLocal[subjectId] = {records: []};
      }
      subjectMapLocal[subjectId].records.push(record);
    });

    return Object.entries(subjectMapLocal).map(([subjectId, data]) => {
      const records = data.records
        .slice()
        .sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));
      const totalSessions = records.length;
      const totalPresent = records.filter((record) => record.status === 'present').length;
      const percentage = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;
      return {
        subjectId: Number(subjectId),
        records,
        totalSessions,
        totalPresent,
        percentage,
      };
    });
  }, [attendanceRecords]);

  const marksBySubject = useMemo(() => {
    const subjectMapLocal: Record<number, any[]> = {};
    marksRecords.forEach((record) => {
      const subjectId = record.subject_id || 0;
      if (!subjectMapLocal[subjectId]) {
        subjectMapLocal[subjectId] = [];
      }
      subjectMapLocal[subjectId].push(record);
    });

    return Object.entries(subjectMapLocal).map(([subjectId, records]) => ({
      subjectId: Number(subjectId),
      records: records
        .slice()
        .sort((a, b) => (b.exam_date || '').localeCompare(a.exam_date || '')),
    }));
  }, [marksRecords]);

  const getSubjectLabel = (subjectId?: number) => {
    if (!subjectId) return 'Subject';
    return subjectMap[subjectId] || `Subject ${subjectId}`;
  };

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor="#10284C" barStyle="light-content" translucent={false} />
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Portal</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.tabNav}>
          {['attendance', 'marks'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab as 'attendance' | 'marks')}>
              <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                {tab === 'attendance' ? 'Attendance' : 'Marks'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E88E5" />
            <Text style={styles.loadingText}>Loading portal...</Text>
          </View>
        ) : activeTab === 'attendance' ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentPadding}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Overall Attendance</Text>
                <Text style={styles.summaryValue}>{overallAttendance.percentage}%</Text>
                <Text style={styles.summarySubtext}>
                  {overallAttendance.totalPresent}/{overallAttendance.totalSessions} sessions
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Subject Attendance</Text>
            {attendanceBySubject.length > 0 ? (
              attendanceBySubject.map(subject => (
                <View key={subject.subjectId} style={styles.subjectCard}>
                  <View style={styles.subjectHeader}>
                    <Text style={styles.subjectName}>{getSubjectLabel(subject.subjectId)}</Text>
                    <Text style={styles.subjectPercent}>{subject.percentage}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {width: `${Math.min(subject.percentage, 100)}%`},
                      ]}
                    />
                  </View>
                  <Text style={styles.subjectDetail}>
                    {subject.totalPresent}/{subject.totalSessions} sessions
                  </Text>
                  <View style={styles.attendanceList}>
                    {subject.records.map((record) => (
                      <View key={`${record.id}-${record.session_date}`} style={styles.attendanceRow}>
                        <View>
                          <Text style={styles.attendanceDate}>{record.session_date}</Text>
                          {record.class_section ? (
                            <Text style={styles.attendanceMeta}>Section {record.class_section}</Text>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            record.status === 'present'
                              ? styles.statusPresent
                              : record.status === 'absent'
                              ? styles.statusAbsent
                              : styles.statusLeave,
                          ]}>
                          <Text style={styles.statusText}>{record.status?.toUpperCase()}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No attendance records available yet.</Text>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentPadding}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            <Text style={styles.sectionTitle}>Marks by Subject</Text>
            {marksBySubject.length > 0 ? (
              marksBySubject.map(subject => (
                <View key={subject.subjectId} style={styles.subjectCard}>
                  <Text style={styles.subjectName}>{getSubjectLabel(subject.subjectId)}</Text>
                  {subject.records.map(record => (
                    <View key={`${record.id}-${record.exam_name}`} style={styles.markCardCompact}>
                      <View style={styles.markHeader}>
                        <View>
                          <Text style={styles.markTitle}>{record.exam_name}</Text>
                          <Text style={styles.markDate}>{record.exam_date}</Text>
                        </View>
                        <View style={styles.markScoreBadge}>
                          <Text style={styles.markScoreBadgeText}>
                            {record.marks_obtained}/{record.total_marks}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.markProgress}>
                        <View style={styles.markProgressBar}>
                          <View
                            style={[
                              styles.markProgressFill,
                              {
                                width: `${Math.min(
                                  Math.round((record.marks_obtained / record.total_marks) * 100 || 0),
                                  100,
                                )}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.markPercent}>
                          {Math.round((record.marks_obtained / record.total_marks) * 100 || 0)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No marks recorded yet.</Text>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#10284C'},
  headerSafeArea: {backgroundColor: '#10284C'},
  contentSafeArea: {flex: 1, backgroundColor: '#F4F7FB'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 54,
    backgroundColor: '#10284C',
  },
  backButton: {width: 40, height: 40, justifyContent: 'center'},
  backButtonText: {fontSize: 28, color: '#FFFFFF'},
  headerTitle: {flex: 1, textAlign: 'left', marginLeft: 6, fontSize: 18, fontWeight: '600', color: '#FFFFFF'},
  headerSpacer: {width: 40},
  tabNav: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F4F7FB',
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E5ECF6',
    alignItems: 'center',
  },
  tabButtonActive: {backgroundColor: '#10284C'},
  tabButtonText: {fontSize: 14, fontWeight: '600', color: '#1B2B44'},
  tabButtonTextActive: {color: '#FFFFFF'},
  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  loadingText: {marginTop: 10, color: '#556', fontSize: 14},
  content: {flex: 1},
  contentPadding: {padding: 16, paddingBottom: 80},
  summaryCard: {
    backgroundColor: '#10284C',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryItem: {alignItems: 'center'},
  summaryLabel: {color: '#CFE3FF', fontSize: 12, fontWeight: '600'},
  summaryValue: {color: '#FFFFFF', fontSize: 28, fontWeight: '700', marginTop: 4},
  summarySubtext: {color: '#CFE3FF', fontSize: 12, marginTop: 4},
  sectionTitle: {fontSize: 16, fontWeight: '700', color: '#1A2B44', marginBottom: 12},
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2EAF5',
  },
  subjectHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  subjectName: {fontSize: 14, fontWeight: '700', color: '#10284C'},
  subjectPercent: {fontSize: 14, fontWeight: '700', color: '#1E88E5'},
  progressBar: {
    height: 8,
    backgroundColor: '#E6EEF9',
    borderRadius: 6,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {height: '100%', backgroundColor: '#1E88E5'},
  subjectDetail: {marginTop: 8, fontSize: 12, color: '#64748B'},
  attendanceList: {marginTop: 12, gap: 10},
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFD',
  },
  attendanceDate: {fontSize: 13, fontWeight: '700', color: '#10284C'},
  attendanceMeta: {fontSize: 11, color: '#64748B', marginTop: 2},
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPresent: {backgroundColor: '#E3F2FD'},
  statusAbsent: {backgroundColor: '#FFE4E6'},
  statusLeave: {backgroundColor: '#FFF3E0'},
  statusText: {fontSize: 11, fontWeight: '700', color: '#10284C'},
  markCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2EAF5',
  },
  markCardCompact: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2EAF5',
  },
  markHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  markTitle: {fontSize: 14, fontWeight: '700', color: '#10284C'},
  markSubject: {fontSize: 12, color: '#64748B', marginTop: 4},
  markScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
  },
  markScoreBadgeText: {fontSize: 12, fontWeight: '700', color: '#1E88E5'},
  markProgress: {marginTop: 10},
  markProgressBar: {
    height: 6,
    backgroundColor: '#E6EEF9',
    borderRadius: 6,
    overflow: 'hidden',
  },
  markProgressFill: {height: '100%', backgroundColor: '#1E88E5'},
  markDate: {marginTop: 8, fontSize: 11, color: '#94A3B8'},
  markPercent: {marginTop: 8, fontSize: 12, fontWeight: '700', color: '#1E88E5'},
  emptyText: {textAlign: 'center', color: '#64748B', marginTop: 20},
});

export default StudentPortalScreen;
