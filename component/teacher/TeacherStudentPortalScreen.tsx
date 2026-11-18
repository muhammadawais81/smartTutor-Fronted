import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  getAttendanceRecordsBySubject,
  getAttendanceStudentsBySubject,
  submitAttendance,
  updateAttendanceRecord,
  deleteAttendanceRecord,
} from '../../api/attendance';
import type {AttendanceRecord} from '../../api/attendance';
import {
  getMarksRecordsBySubject,
  getMarksStudentsBySubject,
  submitMarks,
  updateMarksRecord,
  deleteMarksRecord,
} from '../../api/marks';

// App color scheme
const PRIMARY = '#10284C';
const PRIMARY_TINT = '#EAF0F9';
const BG = '#F4F6FA';
const BORDER = '#E6EBF2';
const TEXT = '#0F172A';
const MUTED = '#64748B';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const maybe = error as {
      message?: string;
      response?: {data?: {detail?: string; message?: string}};
    };
    return (
      maybe.message ||
      maybe.response?.data?.detail ||
      maybe.response?.data?.message ||
      ''
    );
  }
  return '';
};

type AttendanceData = {
  totalClasses: number;
  attended: number;
  percentage: number;
  lastAttendance: string | null;
};

type MarkItem = {
  id: number;
  test: string;
  subject: string;
  marks: number;
  totalMarks: number;
  percentage: number;
  examDate: string;
};

type NoticeItem = {
  id: number;
  title: string;
  content: string;
  date: string;
};

const TeacherStudentPortalScreen = ({
  student,
  subject,
  portalType = 'attendance',
  portalMode = 'single',
  onBack,
}) => {
  const isGroupPortal = portalMode === 'group';
  const [activeTab, setActiveTab] = useState('attendance'); // attendance, marks, notices, details
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({
    totalClasses: 0,
    attended: 0,
    percentage: 0,
    lastAttendance: null,
  });
  const [marksData, setMarksData] = useState<MarkItem[]>([]);
  const [noticesData, setNoticesData] = useState<NoticeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [classSection, setClassSection] = useState('A');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessionDateValue, setSessionDateValue] = useState(new Date());
  const [subjectStudents, setSubjectStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [selectedSingleStudentId, setSelectedSingleStudentId] = useState<number | null>(
    student?.student_id ?? null
  );
  const [studentStatusMap, setStudentStatusMap] = useState<Record<number, 'present' | 'absent'>>({});
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [examDateValue, setExamDateValue] = useState(new Date());
  const [totalMarks, setTotalMarks] = useState('100');
  const [marksObtained, setMarksObtained] = useState('');
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [isSubmittingMarks, setIsSubmittingMarks] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [editingMarkId, setEditingMarkId] = useState<number | null>(null);
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({visible: false, title: '', message: ''});

  const showSuccess = (title: string, message: string) =>
    setSuccessModal({visible: true, title, message});

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: (() => void) | null;
  }>({visible: false, title: '', message: '', confirmLabel: 'Delete', onConfirm: null});

  const closeConfirm = () =>
    setConfirmModal((p) => ({...p, visible: false, onConfirm: null}));

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = 'Delete'
  ) => setConfirmModal({visible: true, title, message, confirmLabel, onConfirm});

  useEffect(() => {
    setActiveTab(portalType);
  }, [portalType]);

  useEffect(() => {
    loadData();
  }, [activeTab, portalMode, portalType]);

  useEffect(() => {
    if (student?.student_id) {
      setSelectedSingleStudentId(student.student_id);
    }
  }, [student?.student_id]);

  useEffect(() => {
    if (isGroupPortal) {
      setSelectedStudentIds([]);
    }
  }, [isGroupPortal, portalType, subject?.id, subject?.subject_id]);

  const formatDate = (date: Date) => date.toISOString().slice(0, 10);

  const openSessionDatePicker = () => {
    DateTimePickerAndroid.open({
      value: sessionDateValue,
      mode: 'date',
      is24Hour: true,
      onChange: (_event, selectedDate) => {
        if (!selectedDate) {
          return;
        }
        setSessionDateValue(selectedDate);
        setSessionDate(formatDate(selectedDate));
      },
    });
  };

  const openExamDatePicker = () => {
    DateTimePickerAndroid.open({
      value: examDateValue,
      mode: 'date',
      is24Hour: true,
      onChange: (_event, selectedDate) => {
        if (!selectedDate) {
          return;
        }
        setExamDateValue(selectedDate);
        setExamDate(formatDate(selectedDate));
      },
    });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (portalType === 'attendance') {
        await fetchAttendance();
      } else if (portalType === 'marks') {
        await fetchMarks();
      } else if (activeTab === 'notices') {
        await fetchNotices();
      }
    } catch (error) {
      console.error('[STUDENT PORTAL] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const subjectId = isGroupPortal ? subject?.id || subject?.subject_id : student?.subject_id;
      if (!subjectId) {
        setAttendanceData({totalClasses: 0, attended: 0, percentage: 0, lastAttendance: null});
        setAttendanceRecords([]);
        return;
      }

      if (isGroupPortal) {
        const enrolledStudents = await getAttendanceStudentsBySubject(subjectId);
        setSubjectStudents(enrolledStudents || []);
        setStudentStatusMap((prev) => {
          const next: Record<number, 'present' | 'absent'> = {};
          (enrolledStudents || []).forEach((s) => {
            const id = s.student_id;
            next[id] = prev[id] || 'present';
          });
          return next;
        });
      } else if (student?.student_id) {
        setSubjectStudents([
          {
            student_id: student.student_id,
            student_name: student.student_name,
            student: {
              name: student.student_name,
              full_name: student.student_name,
            },
            student_profile_picture: student.student_profile_picture,
          },
        ]);
        setStudentStatusMap((prev) => ({
          ...prev,
          [student.student_id]: prev[student.student_id] || 'present',
        }));

        const records = await getAttendanceRecordsBySubject(subjectId);
        const studentRecords = records.filter(
          (record) => record.student_id === student.student_id
        );
        setAttendanceRecords(studentRecords);
        const totalClasses = studentRecords.length;
        const attended = studentRecords.filter((record) => record.status === 'present').length;
        const percentage = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0;
        const lastAttendance = studentRecords
          .map((record) => record.session_date)
          .sort()
          .pop();

        setAttendanceData({
          totalClasses,
          attended,
          percentage,
          lastAttendance: lastAttendance || null,
        });
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchMarks = async () => {
    try {
      const subjectId = isGroupPortal ? subject?.id || subject?.subject_id : student?.subject_id;
      if (!subjectId) {
        setMarksData([]);
        return;
      }

      if (isGroupPortal) {
        const enrolledStudents = await getMarksStudentsBySubject(subjectId);
        setSubjectStudents(enrolledStudents || []);
      }

      const records = await getMarksRecordsBySubject(subjectId);
      const filteredRecords = isGroupPortal
        ? records
        : records.filter((record) => record.student_id === student.student_id);
      const formatted = filteredRecords.map((record) => {
        const total = record.total_marks || 0;
        const marks = record.marks_obtained || 0;
        const percentage = total > 0 ? Math.round((marks / total) * 100) : 0;
        return {
          id: record.id,
          test: record.exam_name,
          subject:
            (isGroupPortal ? subject?.name || subject?.subject_name : student?.subject_name) ||
            `Subject ${record.subject_id}`,
          marks,
          totalMarks: total,
          percentage,
          examDate: record.exam_date,
        };
      });
      setMarksData(formatted);
    } catch (error) {
      console.error('Error fetching marks:', error);
    }
  };

  const fetchNotices = async () => {
    try {
      // Mock data - replace with actual API call
      setNoticesData([
        { id: 1, title: 'Class Schedule Update', content: 'Next week classes will be held on Monday and Wednesday', date: new Date(Date.now() - 86400000).toLocaleDateString() },
        { id: 2, title: 'Assignment Submission', content: 'Please submit your homework assignments by Friday', date: new Date(Date.now() - 172800000).toLocaleDateString() },
        { id: 3, title: 'Exam Preparation', content: 'Final exams starting next month. Start preparation now.', date: new Date(Date.now() - 259200000).toLocaleDateString() },
      ]);
    } catch (error) {
      console.error('Error fetching notices:', error);
    }
  };

  const submitAttendanceRecords = async () => {
    try {
      const subjectId = isGroupPortal ? subject?.id || subject?.subject_id : student?.subject_id;
      if (!subjectId) {
        Alert.alert('Missing Data', 'Subject information is missing.');
        return;
      }

      if (isGroupPortal && selectedStudentIds.length === 0) {
        Alert.alert('Select Students', 'Please select at least one student.');
        return;
      }

      if (!isGroupPortal && !selectedSingleStudentId) {
        Alert.alert('Select Student', 'Please select one student.');
        return;
      }

      setIsSubmittingAttendance(true);
      const records = isGroupPortal
        ? selectedStudentIds.map((studentId) => ({
            student_id: studentId,
            status: studentStatusMap[studentId] || 'present',
          }))
        : [
            {
              student_id: selectedSingleStudentId,
              status: studentStatusMap[selectedSingleStudentId] || 'present',
            },
          ];

      // Group mode requires ALL enrolled students; when only some are picked,
      // fall back to single mode so attendance is saved for just the selection.
      const allEnrolledSelected =
        isGroupPortal &&
        subjectStudents.length > 0 &&
        selectedStudentIds.length === subjectStudents.length;
      const submitMode: 'single' | 'group' = allEnrolledSelected
        ? 'group'
        : 'single';

      await submitAttendance({
        subject_id: subjectId,
        session_date: sessionDate,
        class_section: classSection.trim() || 'A',
        mode: submitMode,
        records,
      });

      if (isGroupPortal) {
        setSelectedStudentIds([]);
      }

      await fetchAttendance();
      showSuccess(
        'Attendance Saved',
        isGroupPortal
          ? 'Attendance has been submitted for the selected students.'
          : 'Attendance has been submitted successfully.'
      );
    } catch (error) {
      console.error('[ATTENDANCE] Submit error:', error);
      const errorMessage = getErrorMessage(error);
      if (String(errorMessage).toLowerCase().includes('must include all enrolled')) {
        Alert.alert(
          'Validation',
          'Group mode requires every enrolled student. Select all students or mark only the ones you need.'
        );
      } else {
        Alert.alert('Error', 'Failed to submit attendance');
      }
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const submitMarksEntry = async () => {
    try {
      const subjectId = isGroupPortal ? subject?.id || subject?.subject_id : student?.subject_id;
      if (!subjectId) {
        Alert.alert('Missing Data', 'Subject or student information is missing.');
        return;
      }

      const total = Number(totalMarks);
      const obtained = Number(marksObtained);

      if (!examName.trim()) {
        Alert.alert('Missing Exam', 'Please enter the exam name.');
        return;
      }

      if (!examDate.trim()) {
        Alert.alert('Missing Date', 'Please enter the exam date (YYYY-MM-DD).');
        return;
      }

      if (!Number.isFinite(total) || total <= 0) {
        Alert.alert('Invalid Total', 'Please enter a valid total marks value.');
        return;
      }

      if (!Number.isFinite(obtained) || obtained < 0) {
        Alert.alert('Invalid Marks', 'Please enter a valid marks obtained value.');
        return;
      }

      if (isGroupPortal && selectedStudentIds.length === 0) {
        Alert.alert('Select Students', 'Please select at least one student.');
        return;
      }

      setIsSubmittingMarks(true);
      const wasEditing = editingMarkId;
      if (wasEditing) {
        await updateMarksRecord(wasEditing, {
          exam_name: examName.trim(),
          exam_date: examDate.trim(),
          class_section: classSection.trim() || 'A',
          total_marks: total,
          marks_obtained: obtained,
        });
      } else {
        const targetStudentIds = isGroupPortal
          ? selectedStudentIds
          : student?.student_id
          ? [student.student_id]
          : [];
        const allEnrolledSelected =
          isGroupPortal &&
          subjectStudents.length > 0 &&
          selectedStudentIds.length === subjectStudents.length;
        const submitMode: 'single' | 'group' = allEnrolledSelected ? 'group' : 'single';

        await submitMarks({
          subject_id: subjectId,
          exam_name: examName.trim(),
          exam_date: examDate.trim(),
          class_section: classSection.trim() || 'A',
          total_marks: total,
          mode: submitMode,
          records: targetStudentIds.map((id) => ({
            student_id: id,
            marks_obtained: obtained,
            total_marks: total,
          })),
        });
      }

      setMarksObtained('');
      setExamName('');
      setEditingMarkId(null);
      await fetchMarks();
      showSuccess(
        wasEditing ? 'Marks Updated' : 'Marks Saved',
        wasEditing
          ? 'The marks record has been updated successfully.'
          : 'Marks have been submitted successfully.'
      );
    } catch (error) {
      console.error('[MARKS] Submit error:', error);
      Alert.alert('Error', 'Failed to submit marks.');
    } finally {
      setIsSubmittingMarks(false);
    }
  };

  const handleToggleAttendanceStatus = async (record: AttendanceRecord) => {
    try {
      const newStatus = record.status === 'present' ? 'absent' : 'present';
      await updateAttendanceRecord(record.id, {status: newStatus});
      await fetchAttendance();
    } catch (error) {
      console.error('[ATTENDANCE] Update error:', error);
      Alert.alert('Error', 'Failed to update attendance record.');
    }
  };

  const handleDeleteAttendance = (record: AttendanceRecord) => {
    showConfirm(
      'Delete Attendance',
      `Are you sure you want to delete the attendance record for ${record.session_date}? This action cannot be undone.`,
      async () => {
        try {
          await deleteAttendanceRecord(record.id);
          await fetchAttendance();
          showSuccess(
            'Attendance Deleted',
            `Attendance record for ${record.session_date} has been deleted.`
          );
        } catch (error) {
          console.error('[ATTENDANCE] Delete error:', error);
          Alert.alert('Error', 'Failed to delete attendance record.');
        }
      }
    );
  };

  const handleEditMark = (mark: MarkItem) => {
    setEditingMarkId(mark.id);
    setExamName(mark.test);
    setExamDate(mark.examDate);
    const parsed = mark.examDate ? new Date(mark.examDate) : new Date();
    setExamDateValue(isNaN(parsed.getTime()) ? new Date() : parsed);
    setTotalMarks(String(mark.totalMarks));
    setMarksObtained(String(mark.marks));
  };

  const cancelEditMark = () => {
    setEditingMarkId(null);
    setExamName('');
    setMarksObtained('');
  };

  const handleDeleteMark = (mark: MarkItem) => {
    showConfirm(
      'Delete Marks',
      `Are you sure you want to delete the "${mark.test}" record? This action cannot be undone.`,
      async () => {
        try {
          await deleteMarksRecord(mark.id);
          if (editingMarkId === mark.id) {
            cancelEditMark();
          }
          await fetchMarks();
          showSuccess(
            'Marks Deleted',
            `"${mark.test}" record has been deleted successfully.`
          );
        } catch (error) {
          console.error('[MARKS] Delete error:', error);
          Alert.alert('Error', 'Failed to delete marks record.');
        }
      }
    );
  };

  const renderAttendance = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.contentPadding}>
      {isGroupPortal && (
        <View style={styles.groupSelectIntro}>
          <View style={styles.groupSelectIntroLeft}>
            <Text style={styles.groupSelectIntroTitle}>Select Students</Text>
            <Text style={styles.groupSelectIntroText}>
              {selectedStudentIds.length} of {subjectStudents.length} selected
            </Text>
          </View>
          <TouchableOpacity
            style={styles.groupSelectIntroBtn}
            activeOpacity={0.85}
            onPress={() => {
              const allIds = subjectStudents.map((s) => s.student_id);
              const isAllSelected =
                allIds.length > 0 && selectedStudentIds.length === allIds.length;
              setSelectedStudentIds(isAllSelected ? [] : allIds);
            }}>
            <Text style={styles.groupSelectIntroBtnText}>
              {subjectStudents.length > 0 &&
              selectedStudentIds.length === subjectStudents.length
                ? 'Clear'
                : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {subjectStudents.length > 0 && (
        <View style={styles.studentSelectCard}>
          <Text style={styles.sectionTitle}>
            {isGroupPortal ? 'Select Students' : 'Student Attendance'}
          </Text>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={subjectStudents.length > 3}
            style={subjectStudents.length > 3 ? styles.studentSelectScroll : undefined}>
            {subjectStudents.map((s) => {
              const studentName =
                s.student?.name ||
                s.student?.full_name ||
                s.student_name ||
                s.full_name ||
                'Student';
              const studentEmail = s.student?.email || s.student_email || s.email || '';
              const studentImage =
                s.student?.profile_picture ||
                s.student?.profilePicture ||
                s.student_profile_picture ||
                s.profile_picture ||
                '';
              const isSelected = isGroupPortal
                ? selectedStudentIds.includes(s.student_id)
                : selectedSingleStudentId === s.student_id;
              const statusValue = studentStatusMap[s.student_id] || 'present';
              return (
                <View key={s.student_id} style={styles.studentSelectRow}>
                  <TouchableOpacity
                    style={styles.studentSelectToggle}
                    onPress={() => {
                      if (isGroupPortal) {
                        setSelectedStudentIds((prev) =>
                          prev.includes(s.student_id)
                            ? prev.filter((id) => id !== s.student_id)
                            : [...prev, s.student_id]
                        );
                      }
                    }}>
                    {isGroupPortal ? (
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected,
                        ]}
                      />
                    ) : null}
                    <View style={styles.studentRowAvatar}>
                      {studentImage ? (
                        <Image
                          source={{ uri: studentImage }}
                          style={styles.studentRowAvatarImage}
                        />
                      ) : (
                        <Text style={styles.studentRowAvatarText}>
                          {studentName.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.studentRowInfo}>
                      <Text style={styles.studentSelectName}>{studentName}</Text>
                      {studentEmail ? (
                        <Text style={styles.studentRowMeta}>{studentEmail}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  <View
                    style={[
                      styles.statusToggle,
                      isGroupPortal && !isSelected && styles.statusToggleDisabled,
                    ]}>
                    <TouchableOpacity
                      style={[
                        styles.statusToggleButton,
                        statusValue === 'present' && styles.statusToggleButtonActive,
                      ]}
                      onPress={() => {
                        if (isGroupPortal && !isSelected) {
                          setSelectedStudentIds((prev) =>
                            prev.includes(s.student_id) ? prev : [...prev, s.student_id]
                          );
                        }
                        setStudentStatusMap((prev) => ({
                          ...prev,
                          [s.student_id]: 'present',
                        }));
                      }}>
                      <Text
                        style={[
                          styles.statusToggleText,
                          statusValue === 'present' && styles.statusToggleTextActive,
                        ]}>
                        Present
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusToggleButton,
                        statusValue === 'absent' && styles.statusToggleButtonActive,
                      ]}
                      onPress={() => {
                        if (isGroupPortal && !isSelected) {
                          setSelectedStudentIds((prev) =>
                            prev.includes(s.student_id) ? prev : [...prev, s.student_id]
                          );
                        }
                        setStudentStatusMap((prev) => ({
                          ...prev,
                          [s.student_id]: 'absent',
                        }));
                      }}
                    >
                      <Text
                        style={[
                          styles.statusToggleText,
                          statusValue === 'absent' && styles.statusToggleTextActive,
                        ]}>
                        Absent
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {isGroupPortal ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Selected Students</Text>
            <Text style={styles.summaryValue}>{selectedStudentIds.length}</Text>
            <Text style={styles.summarySubtext}>
              {subjectStudents.length} total enrolled
            </Text>
            <View style={styles.summaryInlineRow}>
              <Text style={styles.summaryInlineText}>
                Present: {
                  selectedStudentIds.filter(
                    (id) => (studentStatusMap[id] || 'present') === 'present'
                  ).length
                }
              </Text>
              <Text style={styles.summaryInlineText}>
                Absent: {
                  selectedStudentIds.filter(
                    (id) => (studentStatusMap[id] || 'present') === 'absent'
                  ).length
                }
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Attendance</Text>
              <Text style={styles.summaryValue}>{attendanceData.percentage || 0}%</Text>
              <Text style={styles.summarySubtext}>
                {attendanceData.attended || 0}/{attendanceData.totalClasses || 0} sessions
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.sectionTitle}>Progress</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {width: `${Math.min(attendanceData.percentage || 0, 100)}%`},
                ]}
              />
            </View>
            <Text style={styles.progressText}>{attendanceData.percentage || 0}% attendance</Text>
          </View>
        </>
      )}

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Mark Attendance</Text>
        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>Session Date</Text>
            <TouchableOpacity onPress={openSessionDatePicker} activeOpacity={0.8}>
              <View pointerEvents="none" style={styles.dateInputWrap}>
                <TextInput
                  value={sessionDate}
                  placeholder="YYYY-MM-DD"
                  style={[styles.input, styles.dateInput]}
                  placeholderTextColor="#94A3B8"
                  editable={false}
                />
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={PRIMARY}
                  style={styles.dateInputIcon}
                />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>Class Section</Text>
            <TextInput
              value={classSection}
              onChangeText={setClassSection}
              placeholder="A"
              style={styles.input}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isSubmittingAttendance && styles.buttonDisabled]}
          onPress={submitAttendanceRecords}
          disabled={isSubmittingAttendance}>
          <Text style={styles.primaryButtonText}>
            {isSubmittingAttendance ? 'Submitting...' : 'Submit Attendance'}
          </Text>
        </TouchableOpacity>
      </View>

      {!isGroupPortal && attendanceRecords.length > 0 && (
        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>Attendance History</Text>
          {[...attendanceRecords]
            .sort((a, b) => (a.session_date < b.session_date ? 1 : -1))
            .map((record) => {
              const isPresent = record.status === 'present';
              return (
                <View key={record.id} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <View
                      style={[
                        styles.historyDot,
                        isPresent ? styles.dotPresent : styles.dotAbsent,
                      ]}
                    />
                    <View>
                      <Text style={styles.historyDate}>{record.session_date}</Text>
                      <Text style={styles.historyMeta}>
                        {isPresent ? 'Present' : 'Absent'}
                        {record.class_section ? ` · Sec ${record.class_section}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyActions}>
                    <TouchableOpacity
                      style={styles.historyActionBtn}
                      onPress={() => handleToggleAttendanceStatus(record)}>
                      <Ionicons name="swap-horizontal" size={16} color={PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.historyActionBtn, styles.historyDeleteBtn]}
                      onPress={() => handleDeleteAttendance(record)}>
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
        </View>
      )}
    </ScrollView>
  );

  const renderMarks = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.contentPadding}>
      {isGroupPortal && (
        <>
          <View style={styles.groupSelectIntro}>
            <View style={styles.groupSelectIntroLeft}>
              <Text style={styles.groupSelectIntroTitle}>Select Students</Text>
              <Text style={styles.groupSelectIntroText}>
                {selectedStudentIds.length} of {subjectStudents.length} selected
              </Text>
            </View>
            <TouchableOpacity
              style={styles.groupSelectIntroBtn}
              activeOpacity={0.85}
              onPress={() => {
                const allIds = subjectStudents.map((s) => s.student_id);
                const isAllSelected =
                  allIds.length > 0 && selectedStudentIds.length === allIds.length;
                setSelectedStudentIds(isAllSelected ? [] : allIds);
              }}>
              <Text style={styles.groupSelectIntroBtnText}>
                {subjectStudents.length > 0 &&
                selectedStudentIds.length === subjectStudents.length
                  ? 'Clear'
                  : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          {subjectStudents.length > 0 && (
            <View style={styles.studentSelectCard}>
              <Text style={styles.sectionTitle}>Select Students</Text>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={subjectStudents.length > 3}
                style={subjectStudents.length > 3 ? styles.studentSelectScroll : undefined}>
                {subjectStudents.map((s) => {
                  const studentName =
                    s.student?.name ||
                    s.student?.full_name ||
                    s.student_name ||
                    s.full_name ||
                    'Student';
                  const studentEmail = s.student?.email || s.student_email || s.email || '';
                  const studentImage =
                    s.student?.profile_picture ||
                    s.student?.profilePicture ||
                    s.student_profile_picture ||
                    s.profile_picture ||
                    '';
                  const isSelected = selectedStudentIds.includes(s.student_id);
                  return (
                    <TouchableOpacity
                      key={s.student_id}
                      style={styles.marksSelectRow}
                      activeOpacity={0.85}
                      onPress={() =>
                        setSelectedStudentIds((prev) =>
                          prev.includes(s.student_id)
                            ? prev.filter((id) => id !== s.student_id)
                            : [...prev, s.student_id]
                        )
                      }>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]} />
                      <View style={styles.studentRowAvatar}>
                        {studentImage ? (
                          <Image
                            source={{ uri: studentImage }}
                            style={styles.studentRowAvatarImage}
                          />
                        ) : (
                          <Text style={styles.studentRowAvatarText}>
                            {studentName.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.studentRowInfo}>
                        <Text style={styles.studentSelectName}>{studentName}</Text>
                        {studentEmail ? (
                          <Text style={styles.studentRowMeta}>{studentEmail}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </>
      )}

      <View style={styles.formCard}>
        <View style={styles.formHeaderRow}>
          <Text style={styles.sectionTitle}>
            {editingMarkId ? 'Edit Marks' : 'Submit Marks'}
          </Text>
          {editingMarkId ? (
            <TouchableOpacity onPress={cancelEditMark} style={styles.cancelChip}>
              <Ionicons name="close" size={13} color={MUTED} />
              <Text style={styles.cancelChipText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.formFieldFull}>
          <Text style={styles.inputLabel}>Exam Name</Text>
          <TextInput
            value={examName}
            onChangeText={setExamName}
            placeholder="Midterm"
            style={styles.input}
            placeholderTextColor="#94A3B8"
          />
        </View>
        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>Exam Date</Text>
            <TouchableOpacity onPress={openExamDatePicker} activeOpacity={0.8}>
              <View pointerEvents="none" style={styles.dateInputWrap}>
                <TextInput
                  value={examDate}
                  placeholder="YYYY-MM-DD"
                  style={[styles.input, styles.dateInput]}
                  placeholderTextColor="#94A3B8"
                  editable={false}
                />
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={PRIMARY}
                  style={styles.dateInputIcon}
                />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>Total Marks</Text>
            <TextInput
              value={totalMarks}
              onChangeText={setTotalMarks}
              placeholder="100"
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>
        <View style={styles.formFieldFull}>
          <Text style={styles.inputLabel}>Marks Obtained</Text>
          <TextInput
            value={marksObtained}
            onChangeText={setMarksObtained}
            placeholder="0"
            keyboardType="numeric"
            style={styles.input}
            placeholderTextColor="#94A3B8"
          />
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, isSubmittingMarks && styles.buttonDisabled]}
          onPress={submitMarksEntry}
          disabled={isSubmittingMarks}>
          <Text style={styles.primaryButtonText}>
            {isSubmittingMarks
              ? 'Saving...'
              : editingMarkId
              ? 'Update Marks'
              : 'Submit Marks'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recorded Results</Text>
      {marksData.length > 0 ? (
        marksData.map((mark) => (
          <View
            key={mark.id}
            style={[
              styles.markCard,
              editingMarkId === mark.id && styles.markCardEditing,
            ]}>
            <View style={styles.markHeader}>
              <View>
                <Text style={styles.markTitle}>{mark.test}</Text>
                <Text style={styles.markSubject}>{mark.subject}</Text>
              </View>
              <View
                style={styles.markPercentageBadge}>
                <Text style={styles.markPercentageText}>
                  {mark.percentage}%
                </Text>
              </View>
            </View>
            <View style={styles.markProgress}>
              <View style={styles.markProgressBar}>
                <View
                  style={[
                    styles.markProgressFill,
                    {width: `${(mark.marks / mark.totalMarks) * 100}%`},
                  ]}
                />
              </View>
              <Text style={styles.markScoreText}>
                {mark.marks}/{mark.totalMarks}
              </Text>
            </View>
            <View style={styles.markFooter}>
              <Text style={styles.markMeta}>{mark.examDate || ''}</Text>
              <View style={styles.markActions}>
                <TouchableOpacity
                  style={styles.markActionBtn}
                  onPress={() => handleEditMark(mark)}>
                  <Ionicons name="create-outline" size={15} color={PRIMARY} />
                  <Text style={styles.markActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.markActionBtn, styles.markDeleteBtn]}
                  onPress={() => handleDeleteMark(mark)}>
                  <Ionicons name="trash-outline" size={15} color="#DC2626" />
                  <Text style={[styles.markActionText, styles.markDeleteText]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No marks available yet</Text>
      )}
    </ScrollView>
  );

  const renderNotices = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.contentPadding}>
      <Text style={styles.sectionTitle}>Notices & Announcements</Text>
      {noticesData.length > 0 ? (
        noticesData.map((notice) => (
          <View key={notice.id} style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <View style={styles.noticeBadge}>
                <Ionicons name="megaphone-outline" size={16} color={PRIMARY} />
              </View>
              <View style={styles.noticeHeaderText}>
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.noticeDate}>{notice.date}</Text>
              </View>
            </View>
            <Text style={styles.noticeContent}>{notice.content}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No notices yet</Text>
      )}
    </ScrollView>
  );

  const renderDetails = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.contentPadding}>
      <View style={styles.detailCard}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Student Name</Text>
          <Text style={styles.detailValue}>{student?.student_name}</Text>
        </View>
        <View style={styles.detailDivider} />

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{student?.student_email}</Text>
        </View>
        <View style={styles.detailDivider} />

        {student?.grade && (
          <>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Grade</Text>
              <Text style={styles.detailValue}>{student?.grade}</Text>
            </View>
            <View style={styles.detailDivider} />
          </>
        )}

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Subject</Text>
          <Text style={styles.detailValue}>{student?.subject_name}</Text>
        </View>
        <View style={styles.detailDivider} />

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Monthly Fee</Text>
          <Text style={styles.detailValue}>Rs. {student?.monthly_fee?.toLocaleString()}</Text>
        </View>
        <View style={styles.detailDivider} />

        {student?.enrollment_date && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Enrollment Date</Text>
            <Text style={styles.detailValue}>
              {new Date(student?.enrollment_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const portalTabs = portalType === 'marks'
    ? ['marks']
    : ['attendance'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#10284C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {portalType === 'marks' ? 'Marks Portal' : 'Attendance Portal'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Student/Subject Info Bar */}
      {isGroupPortal ? (
        <View style={styles.studentBar}>
          <View style={styles.studentBarAvatar}>
            <Ionicons name="book" size={20} color={PRIMARY} />
          </View>
          <View style={styles.studentBarInfo}>
            <Text style={styles.studentBarName}>{subject?.name || subject?.subject_name}</Text>
            <Text style={styles.studentBarSubject}>Group attendance portal</Text>
          </View>
        </View>
      ) : (
        <View style={styles.studentBar}>
          <View style={styles.studentBarAvatar}>
            {student?.student_profile_picture || student?.profile_picture ? (
              <Image
                source={{
                  uri: student?.student_profile_picture || student?.profile_picture,
                }}
                style={styles.studentBarAvatarImage}
              />
            ) : (
              <Text style={styles.studentBarAvatarText}>
                {student?.student_name?.charAt(0).toUpperCase() || 'S'}
              </Text>
            )}
          </View>
          <View style={styles.studentBarInfo}>
            <Text style={styles.studentBarName}>{student?.student_name}</Text>
            <Text style={styles.studentBarSubject}>{student?.subject_name}</Text>
          </View>
        </View>
      )}

      {/* Tab Navigation */}
      {portalTabs.length > 1 && (
        <View style={styles.tabNavigation}>
          {portalTabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab(tab)}>
              <Text
                style={[
                  styles.tabButtonLabel,
                  activeTab === tab && styles.tabButtonLabelActive,
                ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tab Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading portal...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'attendance' && renderAttendance()}
          {activeTab === 'marks' && renderMarks()}
          {activeTab === 'notices' && renderNotices()}
          {activeTab === 'details' && renderDetails()}
        </>
      )}

      <Modal
        visible={successModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSuccessModal((p) => ({...p, visible: false}))}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconRing}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="checkmark" size={34} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.modalTitle}>{successModal.title}</Text>
            <Text style={styles.modalMessage}>{successModal.message}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.85}
              onPress={() => setSuccessModal((p) => ({...p, visible: false}))}>
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeConfirm}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.confirmIconRing}>
              <Ionicons name="trash-outline" size={30} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>{confirmModal.title}</Text>
            <Text style={styles.modalMessage}>{confirmModal.message}</Text>
            <View style={styles.confirmButtonRow}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmCancelBtn]}
                activeOpacity={0.85}
                onPress={closeConfirm}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmDeleteBtn]}
                activeOpacity={0.85}
                onPress={() => {
                  const cb = confirmModal.onConfirm;
                  closeConfirm();
                  cb?.();
                }}>
                <Text style={styles.confirmDeleteText}>
                  {confirmModal.confirmLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  studentBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  studentBarAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_TINT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  studentBarAvatarImage: {
    width: 44,
    height: 44,
    resizeMode: 'cover',
  },
  studentBarAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: PRIMARY,
  },
  studentBarInfo: {
    flex: 1,
  },
  studentBarName: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
  },
  studentBarSubject: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  tabNavigation: {
    backgroundColor: BG,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: PRIMARY_TINT,
  },
  tabButtonActive: {
    backgroundColor: PRIMARY,
  },
  tabButtonLabel: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '700',
  },
  tabButtonLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabContent: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingBottom: 28,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#AFC4E4',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#AFC4E4',
    marginTop: 4,
  },
  summaryInlineRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  summaryInlineText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: PRIMARY_TINT,
    borderRadius: 999,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PRIMARY,
    borderRadius: 999,
  },
  progressText: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '600',
  },
  studentSelectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  studentSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  studentSelectScroll: {
    maxHeight: 264,
  },
  marksSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  studentSelectToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentRowAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PRIMARY_TINT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  studentRowAvatarImage: {
    width: 38,
    height: 38,
    resizeMode: 'cover',
  },
  studentRowAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY,
  },
  studentRowInfo: {
    flex: 1,
  },
  studentRowMeta: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 10,
  },
  checkboxSelected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  studentSelectName: {
    fontSize: 13,
    color: TEXT,
    fontWeight: '700',
  },
  statusToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    overflow: 'hidden',
  },
  statusToggleDisabled: {
    opacity: 0.45,
  },
  statusToggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  statusToggleButtonActive: {
    backgroundColor: PRIMARY,
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
  },
  statusToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  formField: {flex: 1},
  formFieldFull: {marginBottom: 12},
  inputLabel: {fontSize: 12, fontWeight: '700', color: MUTED, marginBottom: 6},
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: BG,
    color: TEXT,
    fontSize: 14,
  },
  dateInputWrap: {
    justifyContent: 'center',
  },
  dateInput: {
    paddingRight: 40,
  },
  dateInputIcon: {
    position: 'absolute',
    right: 12,
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {color: '#FFFFFF', fontSize: 15, fontWeight: '800'},
  buttonDisabled: {opacity: 0.6},
  markCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  markHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  markTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
  },
  markSubject: {
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
  },
  markPercentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PRIMARY_TINT,
  },
  markPercentageText: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY,
  },
  markProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: PRIMARY_TINT,
    borderRadius: 999,
    overflow: 'hidden',
  },
  markProgressFill: {
    height: '100%',
    backgroundColor: PRIMARY,
    borderRadius: 999,
  },
  markScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    minWidth: 45,
  },
  markMeta: {
    fontSize: 11,
    color: MUTED,
  },
  markCardEditing: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_TINT,
  },
  markFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  markActions: {
    flexDirection: 'row',
    gap: 8,
  },
  markActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PRIMARY_TINT,
  },
  markDeleteBtn: {
    backgroundColor: '#FEE2E2',
  },
  markActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },
  markDeleteText: {
    color: '#DC2626',
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: BG,
    marginBottom: 12,
  },
  cancelChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  dotPresent: {
    backgroundColor: '#16A34A',
  },
  dotAbsent: {
    backgroundColor: '#DC2626',
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
  },
  historyMeta: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },
  historyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  historyActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_TINT,
  },
  historyDeleteBtn: {
    backgroundColor: '#FEE2E2',
  },
  noticeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noticeBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PRIMARY_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  noticeHeaderText: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
  },
  noticeDate: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },
  noticeContent: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  detailItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailLabel: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: TEXT,
    fontWeight: '700',
  },
  detailDivider: {
    height: 1,
    backgroundColor: BORDER,
  },
  emptyText: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginTop: 32,
  },
  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  loadingText: {marginTop: 10, color: MUTED, fontSize: 14},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 10},
    elevation: 10,
  },
  modalIconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: TEXT,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  modalButton: {
    marginTop: 22,
    alignSelf: 'stretch',
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  confirmIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  confirmButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
    alignSelf: 'stretch',
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmCancelBtn: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  confirmCancelText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
  },
  confirmDeleteBtn: {
    backgroundColor: '#DC2626',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  groupSelectIntro: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupSelectIntroLeft: {
    flex: 1,
    marginRight: 10,
  },
  groupSelectIntroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
  },
  groupSelectIntroText: {
    marginTop: 3,
    fontSize: 12,
    color: MUTED,
    fontWeight: '600',
  },
  groupSelectIntroBtn: {
    backgroundColor: PRIMARY_TINT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  groupSelectIntroBtnText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: '800',
  },
});

export default TeacherStudentPortalScreen;
