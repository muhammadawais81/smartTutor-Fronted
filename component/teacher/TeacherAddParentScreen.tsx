import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getAllTeacherEnrollments} from '../../api/enrollment';
import {addStudentParent} from '../../api/parent';

interface TeacherAddParentScreenProps {
  onBack: () => void;
}

const RELATIONSHIPS = ['Father', 'Mother', 'Guardian'];

const TeacherAddParentScreen = ({onBack}: TeacherAddParentScreenProps) => {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentLabel, setStudentLabel] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Father');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [linkMode, setLinkMode] = useState<'new' | 'existing'>('new');
  const [successModal, setSuccessModal] = useState({
    visible: false,
    title: '',
    body: '',
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await getAllTeacherEnrollments();
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert('Teacher Module', error?.message || 'Failed to load student list');
    } finally {
      setLoading(false);
    }
  };

  const studentOptions = useMemo(() => {
    const map = new Map<number, any>();
    enrollments.forEach(enrollment => {
      const id = enrollment?.student_id;
      if (!id || map.has(id)) {
        return;
      }

      const student = enrollment?.student || {};
      map.set(id, {
        student_id: id,
        name: student?.name || student?.full_name || enrollment?.student_name || `Student ${id}`,
        grade_level: student?.grade_level || student?.grade || enrollment?.grade_level || '',
      });
    });

    return Array.from(map.values());
  }, [enrollments]);

  const handleSubmit = async () => {
    const parsedStudentId = Number(studentId);

    if (!Number.isFinite(parsedStudentId) || parsedStudentId <= 0) {
      Alert.alert('Validation', 'Please select or enter a valid student ID.');
      return;
    }

    if (!name.trim() || !email.trim()) {
      Alert.alert('Validation', 'Parent name and email are required.');
      return;
    }

    const isLinkingExistingParent = linkMode === 'existing';

    if (!isLinkingExistingParent && !temporaryPassword.trim()) {
      Alert.alert('Validation', 'Temporary password is required for a new parent account.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Parameters<typeof addStudentParent>[0] = {
        student_id: parsedStudentId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        relationship,
      };

      if (!isLinkingExistingParent) {
        payload.temporary_password = temporaryPassword.trim();
      }

      const response = await addStudentParent(payload);

      const isLinked = response.action === 'linked' || response.is_new_parent === false;
      const alertTitle = isLinked ? 'Parent Linked' : 'Parent Created';
      const alertBody = isLinked
        ? `${response.message}\n\nEmail: ${response.email}\nThis student is now linked to the existing parent account. The parent can log in with their current password and see both children.`
        : `${response.message}\n\nEmail: ${response.email}\nTemporary password: ${response.temporary_password || temporaryPassword.trim()}`;

      setSuccessModal({
        visible: true,
        title: alertTitle,
        body: alertBody,
      });
    } catch (error: any) {
      const message = error?.message || 'Could not create or link parent account';
      Alert.alert('Add Parent Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor="#0E2A4C" barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={20} color="#DCE8F8" />
            <Text style={styles.backButtonText}>Back to dashboard</Text>
          </TouchableOpacity>
          <View style={styles.heroBadge}>
            <Ionicons name="person-add-outline" size={18} color="#0E2A4C" />
            <Text style={styles.heroBadgeText}>Teacher Action</Text>
          </View>
          <Text style={styles.heroTitle}>Add or link a parent</Text>
          <Text style={styles.heroSubtitle}>
            Create a new parent account for the first child, then use the same email to link another child later.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Parent setup</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeChip, linkMode === 'new' && styles.modeChipActive]}
              onPress={() => setLinkMode('new')}
              activeOpacity={0.85}>
              <Text style={[styles.modeChipText, linkMode === 'new' && styles.modeChipTextActive]}>
                New parent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeChip, linkMode === 'existing' && styles.modeChipActive]}
              onPress={() => setLinkMode('existing')}
              activeOpacity={0.85}>
              <Text style={[styles.modeChipText, linkMode === 'existing' && styles.modeChipTextActive]}>
                Link existing parent
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoText}>
            {linkMode === 'new'
              ? 'First child: create the parent account with a temporary password.'
              : 'Second child or more: enter the same parent email again. No new password is needed.'}
          </Text>

          <Text style={styles.sectionTitle}>Quick Select Student</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#1E88E5" />
              <Text style={styles.loadingText}>Loading your students...</Text>
            </View>
          ) : studentOptions.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.studentChips}>
              {studentOptions.map(student => (
                <TouchableOpacity
                  key={student.student_id}
                  style={styles.studentChip}
                  onPress={() => {
                    setStudentId(String(student.student_id));
                    setStudentLabel(student.name);
                  }}
                  activeOpacity={0.85}>
                  <Text style={styles.studentChipTitle}>{student.name}</Text>
                  <Text style={styles.studentChipMeta}>ID {student.student_id}{student.grade_level ? ` • ${student.grade_level}` : ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No enrolled students found for this teacher.</Text>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Student ID</Text>
            <TextInput
              style={styles.input}
              value={studentId}
              onChangeText={setStudentId}
              placeholder="Enter student ID"
              placeholderTextColor="#8A97AA"
              keyboardType="number-pad"
            />
            {studentLabel ? <Text style={styles.helperText}>Selected student: {studentLabel}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Parent Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Father / Mother / Guardian name"
              placeholderTextColor="#8A97AA"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Parent email address"
              placeholderTextColor="#8A97AA"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>
              Same parent email can be used for multiple students. Student and teacher emails must stay unique.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Optional phone number"
              placeholderTextColor="#8A97AA"
              keyboardType="phone-pad"
            />
          </View>

          {linkMode === 'new' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Temporary Password</Text>
              <TextInput
                style={styles.input}
                value={temporaryPassword}
                onChangeText={setTemporaryPassword}
                placeholder="Set a temporary password for the parent"
                placeholderTextColor="#8A97AA"
                autoCapitalize="none"
                secureTextEntry
              />
              <Text style={styles.helperText}>Share this password with the parent after creating the account.</Text>
            </View>
          ) : (
            <View style={styles.linkInfoCard}>
              <Ionicons name="information-circle-outline" size={18} color="#1E88E5" />
              <Text style={styles.linkInfoText}>
                The backend will find the parent by email and link this student. The parent keeps the same login and sees all linked children in the portal.
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Relationship</Text>
            <View style={styles.relationshipRow}>
              {RELATIONSHIPS.map(item => {
                const isActive = relationship === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.relationshipChip, isActive && styles.relationshipChipActive]}
                    onPress={() => setRelationship(item)}
                    activeOpacity={0.85}>
                    <Text style={[styles.relationshipChipText, isActive && styles.relationshipChipTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.9} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {linkMode === 'existing' ? 'Link Parent to Student' : 'Create Parent Account'}
              </Text>
            )}
          </TouchableOpacity>

          
        </View>
      </ScrollView>

      <Modal
        visible={successModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModal(prev => ({...prev, visible: false}))}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark-circle" size={34} color="#16A34A" />
            </View>
            <Text style={styles.modalTitle}>{successModal.title}</Text>
            <Text style={styles.modalBody}>{successModal.body}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.88}
              onPress={() => {
                setSuccessModal(prev => ({...prev, visible: false}));
                onBack();
              }}>
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F4F7FB'},
  content: {paddingBottom: 36, backgroundColor: '#F4F7FB'},
  hero: {backgroundColor: '#0E2A4C', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20},
  backButton: {flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 16},
  backButtonText: {color: '#DCE8F8', fontSize: 13, fontWeight: '600'},
  heroBadge: {flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, backgroundColor: '#DFF4EE', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 16},
  heroBadgeText: {color: '#0E2A4C', fontSize: 12, fontWeight: '700'},
  heroTitle: {color: '#FFFFFF', fontSize: 28, fontWeight: '800', lineHeight: 34},
  heroSubtitle: {color: 'rgba(255,255,255,0.84)', fontSize: 14, lineHeight: 20, marginTop: 8},
  formCard: {marginHorizontal: 16, marginTop: -18, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: {width: 0, height: 8}, elevation: 4},
  sectionTitle: {fontSize: 15, fontWeight: '800', color: '#10284C', marginBottom: 12, marginTop: 4},
  modeRow: {flexDirection: 'row', gap: 10, marginBottom: 10},
  modeChip: {flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: '#EEF4FB'},
  modeChipActive: {backgroundColor: '#10284C'},
  modeChipText: {color: '#10284C', fontSize: 12, fontWeight: '800'},
  modeChipTextActive: {color: '#FFFFFF'},
  infoText: {color: '#5F6E82', fontSize: 13, lineHeight: 19, marginBottom: 8},
  linkInfoCard: {marginTop: 16, flexDirection: 'row', gap: 10, backgroundColor: '#EAF2FF', borderRadius: 14, padding: 14, alignItems: 'flex-start'},
  linkInfoText: {flex: 1, color: '#38506F', fontSize: 13, lineHeight: 19},
  loadingRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8},
  loadingText: {color: '#5F6E82', fontSize: 13},
  studentChips: {gap: 10, paddingBottom: 6},
  studentChip: {width: 155, borderRadius: 18, padding: 14, backgroundColor: '#F7FAFF', borderWidth: 1, borderColor: '#E1EAF5'},
  studentChipTitle: {color: '#10284C', fontSize: 14, fontWeight: '800'},
  studentChipMeta: {color: '#66758A', fontSize: 11, marginTop: 6, lineHeight: 16},
  emptyText: {color: '#5F6E82', fontSize: 13, marginBottom: 10},
  inputGroup: {marginTop: 16},
  inputLabel: {fontSize: 13, fontWeight: '600', color: '#324054', marginBottom: 8},
  input: {borderWidth: 1, borderColor: '#D9E3F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#10284C', backgroundColor: '#F9FBFD'},
  helperText: {marginTop: 8, color: '#1E88E5', fontSize: 12, fontWeight: '600'},
  relationshipRow: {flexDirection: 'row', gap: 10, flexWrap: 'wrap'},
  relationshipChip: {borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#EEF4FB'},
  relationshipChipActive: {backgroundColor: '#10284C'},
  relationshipChipText: {color: '#10284C', fontSize: 12, fontWeight: '700'},
  relationshipChipTextActive: {color: '#FFFFFF'},
  submitButton: {marginTop: 20, backgroundColor: '#10284C', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center'},
  submitButtonText: {color: '#FFFFFF', fontSize: 15, fontWeight: '800'},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  modalBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
  },
  modalButton: {
    marginTop: 16,
    alignSelf: 'stretch',
    backgroundColor: '#10284C',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  });

export default TeacherAddParentScreen;
