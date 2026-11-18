import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  getParentStudents,
  getParentStudentAttendance,
  getParentStudentMarks,
} from '../../api/parent';
import {getTeacherById} from '../../api/teacher';
import {
  getParentReviewEligibility,
  submitParentReview,
  type ReviewEligibility,
} from '../../api/reviews';
import {API_BASE_URL} from '../../api/config';
import StarRating from '../reviews/StarRating';
import WriteReviewModal from '../reviews/WriteReviewModal';

interface TeacherReviewCard {
  teacherId: number;
  name: string;
  profilePicture?: string | null;
  averageRating: number;
  totalReviews: number;
  eligibility: ReviewEligibility | null;
}

const resolveImageUrl = (url?: string | null): string | null => {
  if (!url || !url.trim()) {
    return null;
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `${API_BASE_URL}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
};

const ParentFeedbackScreen = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [teacherCards, setTeacherCards] = useState<TeacherReviewCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTeacher, setActiveTeacher] = useState<TeacherReviewCard | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadTeachersForStudent(selectedStudentId);
    } else {
      setTeacherCards([]);
    }
  }, [selectedStudentId]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await getParentStudents();
      const list = Array.isArray(response) ? response : [];
      setStudents(list);
      setSelectedStudentId(prev => prev ?? list?.[0]?.student_id ?? null);
    } catch (error: any) {
      console.error('[PARENT FEEDBACK] Failed to load students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTeachersForStudent = async (studentId: number) => {
    try {
      setLoadingTeachers(true);

      const [attendance, marks] = await Promise.all([
        getParentStudentAttendance(studentId).catch(() => []),
        getParentStudentMarks(studentId).catch(() => []),
      ]);

      const teacherIds = Array.from(
        new Set(
          [...attendance, ...marks]
            .map(record => record?.teacher_id)
            .filter((id): id is number => typeof id === 'number' && id > 0),
        ),
      );

      if (teacherIds.length === 0) {
        setTeacherCards([]);
        return;
      }

      const cards = await Promise.all(
        teacherIds.map(async teacherId => {
          const [teacher, eligibility] = await Promise.all([
            getTeacherById(teacherId).catch(() => null),
            getParentReviewEligibility(teacherId, studentId).catch(() => null),
          ]);

          return {
            teacherId,
            name: teacher?.full_name || `Teacher ${teacherId}`,
            profilePicture: teacher?.profile_picture,
            averageRating: Number(teacher?.rating || 0),
            totalReviews: Number(teacher?.total_reviews || 0),
            eligibility,
          } as TeacherReviewCard;
        }),
      );

      setTeacherCards(cards);
    } catch (error: any) {
      console.error('[PARENT FEEDBACK] Failed to load teachers:', error);
      setTeacherCards([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (selectedStudentId) {
      await loadTeachersForStudent(selectedStudentId);
    }
    setRefreshing(false);
  };

  const handleSubmitReview = async (rating: number, feedback: string) => {
    if (!activeTeacher || !selectedStudentId) {
      return;
    }

    setSubmitting(true);
    try {
      await submitParentReview({
        teacher_id: activeTeacher.teacherId,
        student_id: selectedStudentId,
        rating,
        feedback: feedback || undefined,
      });

      setActiveTeacher(null);
      Alert.alert('Thank you', 'Your review has been submitted.');
      await loadTeachersForStudent(selectedStudentId);
    } catch (error: any) {
      Alert.alert('Review Failed', error?.message || 'Could not submit your review.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedStudent = students.find(item => item.student_id === selectedStudentId);
  const selectedStudentName =
    selectedStudent?.student?.full_name ||
    selectedStudent?.student?.name ||
    (selectedStudentId ? `Student ${selectedStudentId}` : '');

  const renderTeacherCard = (card: TeacherReviewCard) => {
    const photo = resolveImageUrl(card.profilePicture);
    const eligibility = card.eligibility;
    const existing = eligibility?.existing_review;

    return (
      <View key={card.teacherId} style={styles.teacherCard}>
        <View style={styles.teacherTop}>
          {photo ? (
            <Image source={{uri: photo}} style={styles.teacherAvatar} />
          ) : (
            <View style={styles.teacherAvatarPlaceholder}>
              <Text style={styles.teacherAvatarText}>{card.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.teacherInfo}>
            <Text style={styles.teacherName} numberOfLines={1}>{card.name}</Text>
            <View style={styles.teacherRatingRow}>
              <StarRating rating={card.averageRating} size={14} />
              <Text style={styles.teacherRatingText}>
                {card.averageRating > 0 ? card.averageRating.toFixed(1) : 'New'}
                {card.totalReviews > 0 ? ` (${card.totalReviews})` : ''}
              </Text>
            </View>
          </View>
        </View>

        {existing ? (
          <View style={styles.existingBox}>
            <View style={styles.existingHeader}>
              <Ionicons name="checkmark-circle" size={16} color="#0B7A5B" />
              <Text style={styles.existingTitle}>Your review</Text>
              <StarRating rating={existing.rating} size={14} />
            </View>
            {existing.feedback ? (
              <Text style={styles.existingFeedback}>{existing.feedback}</Text>
            ) : null}
          </View>
        ) : eligibility?.can_review ? (
          <TouchableOpacity
            style={styles.reviewButton}
            activeOpacity={0.85}
            onPress={() => setActiveTeacher(card)}>
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.reviewButtonText}>Write a review</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.reasonBox}>
            <Ionicons name="information-circle-outline" size={16} color="#B7791F" />
            <Text style={styles.reasonText}>
              {eligibility?.reason || 'Review not available yet.'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar backgroundColor="#0B1B33" barStyle="light-content" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#46D9B1" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#0B1B33" barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#46D9B1" />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>Feedback &amp; Ratings</Text>
          <Text style={styles.heroTitle}>Rate your child&apos;s teachers</Text>
          <Text style={styles.heroSubtitle}>
            Share a rating and feedback for the teachers your child studies with.
          </Text>
        </View>

        {students.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color="#9FB3C8" />
            <Text style={styles.emptyTitle}>No linked students</Text>
            <Text style={styles.emptyText}>Ask the teacher to link your child to your account.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Select child</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}>
              {students.map(link => {
                const student = link.student || {};
                const label = student.full_name || student.name || `Student ${link.student_id}`;
                const isActive = selectedStudentId === link.student_id;
                return (
                  <TouchableOpacity
                    key={link.id ?? link.student_id}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setSelectedStudentId(link.student_id)}
                    activeOpacity={0.85}>
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Teachers{selectedStudentName ? ` for ${selectedStudentName}` : ''}
              </Text>
            </View>

            {loadingTeachers ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color="#46D9B1" />
                <Text style={styles.inlineLoadingText}>Loading teachers...</Text>
              </View>
            ) : teacherCards.length > 0 ? (
              teacherCards.map(renderTeacherCard)
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="school-outline" size={44} color="#9FB3C8" />
                <Text style={styles.emptyTitle}>No teachers to review yet</Text>
                <Text style={styles.emptyText}>
                  Reviews appear once your child has attendance or class records with a teacher.
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.noteCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#46D9B1" />
          <Text style={styles.noteText}>
            You can review each teacher once. Reviews help teachers improve and guide other families.
          </Text>
        </View>
      </ScrollView>

      <WriteReviewModal
        visible={!!activeTeacher}
        title={activeTeacher ? `Review ${activeTeacher.name}` : 'Write a review'}
        subtitle={selectedStudentName ? `For ${selectedStudentName}` : undefined}
        submitting={submitting}
        onSubmit={handleSubmitReview}
        onClose={() => setActiveTeacher(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F3F7FB'},
  content: {paddingBottom: 110, backgroundColor: '#F3F7FB'},
  loadingWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0B1B33'},
  loadingText: {marginTop: 12, color: '#C9D6E6', fontSize: 14, fontWeight: '600'},
  hero: {marginHorizontal: 16, marginTop: 10, padding: 22, borderRadius: 28, backgroundColor: '#0B1B33'},
  heroKicker: {color: '#7FE9C9', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10},
  heroTitle: {color: '#FFFFFF', fontSize: 25, fontWeight: '900'},
  heroSubtitle: {color: '#C9D6E6', fontSize: 14, lineHeight: 20, marginTop: 10},
  sectionLabel: {fontSize: 13, fontWeight: '800', color: '#10284C', marginHorizontal: 16, marginTop: 18, marginBottom: 10},
  chipRow: {paddingHorizontal: 16, gap: 10},
  chip: {backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#E1EAF5'},
  chipActive: {backgroundColor: '#0B1B33', borderColor: '#0B1B33'},
  chipText: {color: '#5A6E87', fontSize: 13, fontWeight: '800'},
  chipTextActive: {color: '#FFFFFF'},
  sectionHeaderRow: {paddingHorizontal: 16, marginTop: 18, marginBottom: 12},
  sectionTitle: {fontSize: 17, fontWeight: '900', color: '#10284C'},
  inlineLoading: {paddingVertical: 24, alignItems: 'center', justifyContent: 'center'},
  inlineLoadingText: {marginTop: 8, color: '#6B7C90', fontSize: 13},
  teacherCard: {marginHorizontal: 16, marginBottom: 12, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E1EAF5'},
  teacherTop: {flexDirection: 'row', alignItems: 'center', gap: 14},
  teacherAvatar: {width: 52, height: 52, borderRadius: 26, backgroundColor: '#E1EAF5'},
  teacherAvatarPlaceholder: {width: 52, height: 52, borderRadius: 26, backgroundColor: '#0B1B33', alignItems: 'center', justifyContent: 'center'},
  teacherAvatarText: {color: '#FFFFFF', fontSize: 20, fontWeight: '900'},
  teacherInfo: {flex: 1},
  teacherName: {color: '#10284C', fontSize: 16, fontWeight: '900'},
  teacherRatingRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6},
  teacherRatingText: {color: '#6B7C90', fontSize: 12, fontWeight: '700'},
  reviewButton: {marginTop: 14, backgroundColor: '#0B1B33', borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  reviewButtonText: {color: '#FFFFFF', fontSize: 14, fontWeight: '800'},
  existingBox: {marginTop: 14, backgroundColor: '#EAF7F1', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#CDEBDF'},
  existingHeader: {flexDirection: 'row', alignItems: 'center', gap: 8},
  existingTitle: {flex: 1, color: '#0B7A5B', fontSize: 13, fontWeight: '800'},
  existingFeedback: {color: '#33514A', fontSize: 13, lineHeight: 19, marginTop: 8},
  reasonBox: {marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF6E7', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F6E3BC'},
  reasonText: {flex: 1, color: '#8A6A1F', fontSize: 12, lineHeight: 18},
  emptyCard: {marginHorizontal: 16, marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E1EAF5'},
  emptyTitle: {color: '#10284C', fontSize: 16, fontWeight: '900', marginTop: 10},
  emptyText: {color: '#5F6E82', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19},
  noteCard: {marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E1EAF5', flexDirection: 'row', alignItems: 'center', gap: 12},
  noteText: {flex: 1, color: '#6B7C90', fontSize: 12, lineHeight: 18},
});

export default ParentFeedbackScreen;
