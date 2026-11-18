import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import StarRating from './StarRating';
import type {Review} from '../../api/reviews';

interface ReviewCardProps {
  review: Review;
  variant?: 'default' | 'profile';
}

const formatDate = (value?: string) => {
  if (!value) {
    return '';
  }
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
};

const ReviewCard = ({review, variant = 'default'}: ReviewCardProps) => {
  const isParent = review.reviewer_type === 'parent';
  const label = isParent ? 'Parent' : 'Student';
  const isProfile = variant === 'profile';

  return (
    <View style={[styles.card, isProfile && styles.cardProfile]}>
      <View style={styles.topRow}>
        <View style={styles.reviewerBlock}>
          <View style={[styles.avatar, isParent ? styles.avatarParent : styles.avatarStudent]}>
            <Text style={styles.avatarText}>{label.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.reviewerName}>{label}</Text>
            <Text style={styles.date}>{formatDate(review.created_at)}</Text>
          </View>
        </View>
        <StarRating rating={review.rating} size={isProfile ? 16 : 15} />
      </View>

      {review.feedback ? (
        <Text style={[styles.feedback, isProfile && styles.feedbackProfile]}>{review.feedback}</Text>
      ) : (
        <Text style={styles.noFeedback}>No written feedback.</Text>
      )}

      {isProfile ? (
        <View style={[styles.badge, isParent ? styles.badgeParent : styles.badgeStudent]}>
          <Ionicons
            name={isParent ? 'people-outline' : 'school-outline'}
            size={12}
            color={isParent ? '#0B7A5B' : '#1D4A87'}
          />
          <Text style={[styles.badgeText, isParent ? styles.badgeTextParent : styles.badgeTextStudent]}>
            {label} review
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F9FBFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4ECF6',
    marginBottom: 10,
  },
  cardProfile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderColor: '#E8EEF5',
    shadowColor: '#10284C',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  reviewerBlock: {flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1},
  avatar: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  avatarStudent: {backgroundColor: '#E9F2FF'},
  avatarParent: {backgroundColor: '#E8F5F0'},
  avatarText: {fontSize: 16, fontWeight: '900', color: '#10284C'},
  reviewerName: {fontSize: 14, fontWeight: '800', color: '#10284C'},
  date: {fontSize: 11, color: '#90A0B3', marginTop: 2},
  feedback: {fontSize: 14, color: '#3A4757', lineHeight: 21},
  feedbackProfile: {fontSize: 14, color: '#4A5568', lineHeight: 22},
  noFeedback: {fontSize: 13, color: '#90A0B3', fontStyle: 'italic'},
  badge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeStudent: {backgroundColor: '#E9F2FF'},
  badgeParent: {backgroundColor: '#E8F5F0'},
  badgeText: {fontSize: 11, fontWeight: '800'},
  badgeTextStudent: {color: '#1D4A87'},
  badgeTextParent: {color: '#0B7A5B'},
});

export default ReviewCard;
