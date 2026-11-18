import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getAllTeacherEnrollments, getTeacherSubjects} from '../../api/enrollment';
import {getMyTeacherProfile} from '../../api/teacher';
import {endVideoCall, getVideoCallDetails, initiateVideoCall} from '../../api/video';

type Props = {
  onBack: () => void;
  onNavigateToRoom?: (callData: {
    callId: number;
    token: string;
    channelName: string;
    uid: number;
    tokenStatus?: string;
    tokenExpiresAt?: string | null;
  }) => void;
};

type StudentItem = {
  student_id: number;
  student_name: string;
  student_profile_picture: string | null;
  subject_id: number;
  subject_name: string;
  status: string;
};

type SubjectItem = {
  subject_id: number;
  subject_name: string;
};

const ACTIVE_CALL_STORAGE_KEY = 'teacher_active_video_call';

const TeacherVideoClassScreen: React.FC<Props> = ({onBack, onNavigateToRoom}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [showEndedSuccessModal, setShowEndedSuccessModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [callType, setCallType] = useState<'one_to_one' | 'group'>('one_to_one');

  const [activeCall, setActiveCall] = useState<any>(null);
  const [activeDetails, setActiveDetails] = useState<any>(null);

  const restorePersistedActiveCall = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_CALL_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const savedCall = JSON.parse(raw);
      if (!savedCall?.id) {
        return null;
      }

      const details = await getVideoCallDetails(savedCall.id);
      if (details?.status === 'ended' || details?.status === 'cancelled') {
        await AsyncStorage.removeItem(ACTIVE_CALL_STORAGE_KEY);
        setActiveCall(null);
        setActiveDetails(null);
        return null;
      }

      setActiveCall(savedCall);
      setActiveDetails(details);
      return savedCall;
    } catch (error) {
      console.log('[VIDEO][Teacher] Failed to restore persisted active call:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const restoreActiveCall = async () => {
      await restorePersistedActiveCall();
    };

    restoreActiveCall();
  }, [restorePersistedActiveCall]);

  useEffect(() => {
    const persistActiveCall = async () => {
      try {
        if (activeCall?.id) {
          await AsyncStorage.setItem(ACTIVE_CALL_STORAGE_KEY, JSON.stringify(activeCall));
        } else {
          await AsyncStorage.removeItem(ACTIVE_CALL_STORAGE_KEY);
        }
      } catch (error) {
        console.log('[VIDEO][Teacher] Failed to persist active call:', error);
      }
    };

    persistActiveCall();
  }, [activeCall]);

  const filteredStudents = useMemo(() => {
    if (!selectedSubjectId) {
      return students;
    }
    return students.filter(item => item.subject_id === selectedSubjectId);
  }, [students, selectedSubjectId]);

  const loadData = useCallback(async () => {
    try {
      let subjectOptions: SubjectItem[] = [];
      try {
        const profile = await getMyTeacherProfile();
        if (profile?.teacher_id) {
          const teacherSubjects = await getTeacherSubjects(profile.teacher_id);
          subjectOptions = (teacherSubjects || [])
            .filter(subject => subject.is_active !== false)
            .map(subject => ({
              subject_id: subject.subject_id,
              subject_name: subject.subject?.name || 'Unknown Subject',
            }));
        }
      } catch (subjectError) {
        console.log('[VIDEO][Teacher] Failed to load subject list:', subjectError);
      }

      const enrollments = await getAllTeacherEnrollments();
      const mapped: StudentItem[] = (enrollments || [])
        .filter((item: any) => item.status === 'approved')
        .map((item: any) => ({
          student_id: item.student_id,
          student_name: item.student?.full_name || item.student?.name || `Student #${item.student_id}`,
          student_profile_picture:
            item.student?.profile_picture ||
            item.student?.profilePicture ||
            item.student_profile_picture ||
            item.profile_picture ||
            null,
          subject_id: item.teacher_subject?.subject_id,
          subject_name: item.teacher_subject?.subject?.name || 'Unknown Subject',
          status: item.status,
        }))
        .filter((item: StudentItem) => !!item.subject_id);

      const uniqueStudents = Array.from(
        new Map(mapped.map(s => [`${s.student_id}-${s.subject_id}`, s])).values(),
      );

      if (subjectOptions.length === 0) {
        const fallback = new Map<number, SubjectItem>();
        uniqueStudents.forEach(item => {
          if (!fallback.has(item.subject_id)) {
            fallback.set(item.subject_id, {
              subject_id: item.subject_id,
              subject_name: item.subject_name,
            });
          }
        });
        subjectOptions = Array.from(fallback.values());
      }

      setStudents(uniqueStudents);
      setSubjects(subjectOptions);

      const subjectIds = new Set(subjectOptions.map(subject => subject.subject_id));
      if (!selectedSubjectId || !subjectIds.has(selectedSubjectId)) {
        setSelectedSubjectId(subjectOptions[0]?.subject_id ?? null);
      }

      if (activeCall?.id) {
        const details = await getVideoCallDetails(activeCall.id);
        if (details?.status === 'ended' || details?.status === 'cancelled') {
          setActiveCall(null);
          setActiveDetails(null);
          await AsyncStorage.removeItem(ACTIVE_CALL_STORAGE_KEY);
        } else {
          setActiveDetails(details);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load class data');
    }
  }, [activeCall?.id, selectedSubjectId]);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      await loadData();
      setIsLoading(false);
    };
    run();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleStudent = (studentId: number) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        if (callType === 'one_to_one') {
          next.clear();
        }
        next.add(studentId);
      }
      return next;
    });
  };

  const onChangeCallType = (type: 'one_to_one' | 'group') => {
    setCallType(type);
    setSelectedStudents(prev => {
      if (type === 'group') {
        return prev;
      }
      const first = Array.from(prev)[0];
      return first ? new Set([first]) : new Set();
    });
  };

  const handleStartCall = async () => {
    const selected = Array.from(selectedStudents);

    if (!selectedSubjectId) {
      Alert.alert('Select Subject', 'Please choose a subject first.');
      return;
    }

    if (selected.length === 0) {
      Alert.alert('Select Students', 'Please select at least one student.');
      return;
    }

    if (callType === 'one_to_one' && selected.length !== 1) {
      Alert.alert('One-to-One Call', 'Please select exactly one student.');
      return;
    }

    try {
      setIsStarting(true);
      const payload =
        callType === 'one_to_one'
          ? {
              student_id: selected[0],
              subject_id: selectedSubjectId,
              call_type: 'one_to_one' as const,
            }
          : {
              student_id: selected[0],
              student_ids: selected,
              subject_id: selectedSubjectId,
              call_type: 'group' as const,
            };

      console.log('[VIDEO] Initiating call with payload:', JSON.stringify(payload, null, 2));
      console.log('[VIDEO] Student IDs being sent:', callType === 'one_to_one' ? selected[0] : selected);
      console.log('[VIDEO] Subject ID:', selectedSubjectId);

      const response = await initiateVideoCall(payload);
      console.log('[VIDEO] Backend response:', JSON.stringify(response, null, 2));
      if (response.token_status) {
        console.log('[VIDEO] ✅ Call Initiative Details:');
        console.log('[VIDEO]   Token Status:', response.token_status);
        if (response.token_generated_at) console.log('[VIDEO]   Generated:', response.token_generated_at);
        if (response.token_expires_at) console.log('[VIDEO]   Expires:', response.token_expires_at);
        if (response.token_ttl_seconds) console.log('[VIDEO]   TTL:', response.token_ttl_seconds + 's');
      }
      
      setActiveCall(response);
      await AsyncStorage.setItem(ACTIVE_CALL_STORAGE_KEY, JSON.stringify(response));

      const details = await getVideoCallDetails(response.id);
      setActiveDetails(details);

      // Navigate to video room if callback provided
      if (onNavigateToRoom) {
        onNavigateToRoom({
          callId: response.id,
          token: response.token,
          channelName: response.channel_name,
          uid: response.uid,
          tokenStatus: response.token_status,
          tokenExpiresAt: response.token_expires_at,
        });
      } else {
        Alert.alert('Class Started', `Channel: ${response.channel_name}`);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Please try again.';

      if (errorMessage.toLowerCase().includes('already has an active call')) {
        const restored = await restorePersistedActiveCall();
        if (restored) {
          Alert.alert('Active Class Found', 'Your previous active class is restored below. End it first or continue it.');
          return;
        }
      }

      Alert.alert('Unable to Start Call', error?.message || 'Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndCall = async () => {
    if (!activeCall?.id) {
      return;
    }
    setShowEndConfirmModal(true);
  };

  const confirmEndCall = async () => {
    if (!activeCall?.id) {
      return;
    }
    try {
      setIsEnding(true);
      await endVideoCall(activeCall.id);
      setActiveCall(null);
      setActiveDetails(null);
      await AsyncStorage.removeItem(ACTIVE_CALL_STORAGE_KEY);
      setShowEndConfirmModal(false);
      setShowEndedSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to end class.');
    } finally {
      setIsEnding(false);
    }
  };

  const renderStudent = ({item}: {item: StudentItem}) => {
    const isSelected = selectedStudents.has(item.student_id);
    return (
      <TouchableOpacity
        style={[styles.studentCard, isSelected && styles.studentCardSelected]}
        onPress={() => toggleStudent(item.student_id)}>
        {item.student_profile_picture ? (
          <Image
            source={{uri: item.student_profile_picture}}
            style={styles.studentAvatar}
          />
        ) : (
          <View style={styles.studentAvatar}>
            <Text style={styles.studentAvatarText}>
              {item.student_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.student_name}</Text>
          <Text style={styles.studentSubject}>{item.subject_name}</Text>
        </View>
        <Text style={styles.checkMark}>{isSelected ? '✓' : ''}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#10284C" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Video Class</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10284C" />
          <Text style={styles.loadingText}>Loading class setup...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={item => `${item.student_id}-${item.subject_id}`}
          renderItem={renderStudent}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Class Type</Text>
                <View style={styles.rowGap}>
                  <TouchableOpacity
                    style={[styles.typeButton, callType === 'one_to_one' && styles.typeButtonActive]}
                    onPress={() => onChangeCallType('one_to_one')}>
                    <Text style={[styles.typeText, callType === 'one_to_one' && styles.typeTextActive]}>One-to-One</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeButton, callType === 'group' && styles.typeButtonActive]}
                    onPress={() => onChangeCallType('group')}>
                    <Text style={[styles.typeText, callType === 'group' && styles.typeTextActive]}>Group</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Select Subject</Text>
                <View style={styles.chipsWrap}>
                  {subjects.map(subject => (
                    <TouchableOpacity
                      key={subject.subject_id}
                      style={[styles.chip, selectedSubjectId === subject.subject_id && styles.chipActive]}
                      onPress={() => setSelectedSubjectId(subject.subject_id)}>
                      <Text style={[styles.chipText, selectedSubjectId === subject.subject_id && styles.chipTextActive]}>
                        {subject.subject_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Selected Students: {selectedStudents.size}</Text>
                <Text style={styles.helperText}>Choose students to invite into this class.</Text>
              </View>

              <TouchableOpacity
                style={[styles.startButton, isStarting && styles.buttonDisabled]}
                disabled={isStarting}
                onPress={handleStartCall}>
                <Text style={styles.startButtonText}>{isStarting ? 'Starting...' : 'Start Video Class'}</Text>
              </TouchableOpacity>

              {activeCall && (
                <View style={styles.activeCard}>
                  <View style={styles.activeHeader}>
                    <Text style={styles.activeTitle}>🔴 Active Call</Text>
                    <Text style={styles.activeStatus}>Live</Text>
                  </View>
                  <Text style={styles.activeText}>Call ID: {activeCall.id}</Text>
                  <Text style={styles.activeText}>Channel: {activeCall.channel_name}</Text>
                  <Text style={styles.activeText}>Type: {activeCall.call_type}</Text>
                  <Text style={styles.activeText} numberOfLines={1}>Link: {activeCall.call_link}</Text>
                  <Text style={styles.activeText}>Participants: {activeDetails?.participants?.filter((p: any) => p.is_active).length || 1}</Text>

                  <View style={styles.activeButtons}>
                    <TouchableOpacity
                      style={styles.returnButton}
                      onPress={() => {
                        if (onNavigateToRoom) {
                          onNavigateToRoom({
                            callId: activeCall.id,
                            token: activeCall.token,
                            channelName: activeCall.channel_name,
                            uid: activeCall.uid,
                          });
                        }
                      }}>
                      <Text style={styles.returnButtonText}>📹 Return to Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.endButton, isEnding && styles.buttonDisabled]}
                      disabled={isEnding}
                      onPress={handleEndCall}>
                      <Text style={styles.endButtonText}>{isEnding ? 'Ending...' : 'End Class'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={styles.sectionLabel}>Approved Students</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No approved students available for selected subject.</Text>}
        />
      )}

      <Modal
        visible={showEndConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalWarningIconWrap}>
              <Ionicons name="alert-circle-outline" size={30} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>End Class?</Text>
            <Text style={styles.modalMessage}>
              This will disconnect all students from the live class.
            </Text>
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.88}
                onPress={() => setShowEndConfirmModal(false)}
                disabled={isEnding}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDangerBtn, isEnding && styles.buttonDisabled]}
                activeOpacity={0.88}
                onPress={confirmEndCall}
                disabled={isEnding}>
                <Text style={styles.modalDangerBtnText}>
                  {isEnding ? 'Ending...' : 'End Class'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEndedSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndedSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalSuccessIconWrap}>
              <Ionicons name="checkmark-circle" size={34} color="#16A34A" />
            </View>
            <Text style={styles.modalTitle}>Class Ended</Text>
            <Text style={styles.modalMessage}>Video class ended successfully.</Text>
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              activeOpacity={0.88}
              onPress={() => setShowEndedSuccessModal(false)}>
              <Text style={styles.modalPrimaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F4F7FB'},
  header: {
    backgroundColor: '#10284C',
    paddingHorizontal: 10,
    
    paddingTop: 25,
    flexDirection: 'row',
    alignItems: 'center',
    height: 82,
  },
  backButton: {width: 40, height: 40, justifyContent: 'center'},
  backButtonText: {fontSize: 28, color: '#FFFFFF'},
  headerTitle: {flex: 1, textAlign: 'left', marginLeft: 6, fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginTop: 4},
  headerSpacer: {width: 40},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  loadingText: {marginTop: 10, color: '#556', fontSize: 14},
  listContent: {padding: 14, paddingBottom: 110},
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E7ECF3',
  },
  panelTitle: {fontSize: 15, fontWeight: '700', color: '#152238', marginBottom: 10},
  rowGap: {flexDirection: 'row', gap: 10},
  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#C8D5E6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
  },
  typeButtonActive: {backgroundColor: '#10284C', borderColor: '#10284C'},
  typeText: {fontSize: 13, color: '#31445E', fontWeight: '600'},
  typeTextActive: {color: '#FFFFFF'},
  chipsWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C8D5E6',
    backgroundColor: '#F8FAFD',
  },
  chipActive: {backgroundColor: '#10284C', borderColor: '#10284C'},
  chipText: {fontSize: 12, color: '#31445E', fontWeight: '600'},
  chipTextActive: {color: '#FFFFFF'},
  helperText: {fontSize: 12, color: '#64748B'},
  startButton: {
    backgroundColor: '#10284C',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButtonText: {color: '#FFFFFF', fontSize: 15, fontWeight: '700'},
  buttonDisabled: {opacity: 0.6},
  activeCard: {
    backgroundColor: '#10284C',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeTitle: {fontSize: 16, color: '#FFFFFF', fontWeight: '700'},
  activeStatus: {
    fontSize: 12,
    color: '#4ADE80',
    fontWeight: '700',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeText: {fontSize: 12, color: '#D9E7FF', marginBottom: 4},
  activeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  returnButton: {
    flex: 1,
    backgroundColor: '#1E88E5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  returnButtonText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
  endButton: {
    flex: 1,
    backgroundColor: '#D64545',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  endButtonText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
  sectionLabel: {fontSize: 14, fontWeight: '700', color: '#243B55', marginBottom: 10},
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2EAF5',
  },
  studentCardSelected: {borderColor: '#1E88E5', backgroundColor: '#EFF6FF'},
  studentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#CFE7FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  studentAvatarText: {fontSize: 16, color: '#0D3B66', fontWeight: '700'},
  studentInfo: {flex: 1, marginLeft: 10},
  studentName: {fontSize: 14, fontWeight: '700', color: '#11223A'},
  studentSubject: {fontSize: 12, color: '#64748B', marginTop: 2},
  checkMark: {fontSize: 20, color: '#1E88E5', width: 24, textAlign: 'right'},
  emptyText: {textAlign: 'center', color: '#64748B', marginTop: 30},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalWarningIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalSuccessIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#10284C',
    textAlign: 'center',
  },
  modalMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
  },
  modalActionsRow: {
    marginTop: 18,
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  modalCancelBtnText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  modalDangerBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  modalDangerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalPrimaryBtn: {
    marginTop: 16,
    alignSelf: 'stretch',
    backgroundColor: '#10284C',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default TeacherVideoClassScreen;
