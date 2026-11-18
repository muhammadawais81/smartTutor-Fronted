import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import StarRating from './StarRating';

interface WriteReviewModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  initialRating?: number;
  initialFeedback?: string;
  submitting?: boolean;
  onSubmit: (rating: number, feedback: string) => void;
  onClose: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent',
};

const WriteReviewModal = ({
  visible,
  title,
  subtitle,
  initialRating = 0,
  initialFeedback = '',
  submitting = false,
  onSubmit,
  onClose,
}: WriteReviewModalProps) => {
  const [rating, setRating] = useState(initialRating);
  const [feedback, setFeedback] = useState(initialFeedback);

  useEffect(() => {
    if (visible) {
      setRating(initialRating);
      setFeedback(initialFeedback);
    }
  }, [visible, initialRating, initialFeedback]);

  const handleSubmit = () => {
    if (rating < 1) {
      return;
    }
    onSubmit(rating, feedback.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Ionicons name="close" size={22} color="#5A6E87" />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingBlock}>
              <StarRating rating={rating} size={40} editable onChange={setRating} gap={10} />
              <Text style={styles.ratingLabel}>
                {rating > 0 ? RATING_LABELS[rating] : 'Tap to rate'}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Your feedback (optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Share details about your experience..."
              placeholderTextColor="#8A97AA"
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={5}
              maxLength={2000}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitButton, (rating < 1 || submitting) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.9}
              disabled={rating < 1 || submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(7,16,30,0.55)', justifyContent: 'flex-end'},
  backdrop: {flex: 1},
  sheetWrap: {width: '100%'},
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  handle: {alignSelf: 'center', width: 44, height: 5, borderRadius: 999, backgroundColor: '#D7E0EC', marginBottom: 14},
  header: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'},
  headerText: {flex: 1, paddingRight: 12},
  title: {fontSize: 19, fontWeight: '900', color: '#10284C'},
  subtitle: {fontSize: 13, color: '#6B7C90', marginTop: 4, lineHeight: 18},
  closeButton: {width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5FB', alignItems: 'center', justifyContent: 'center'},
  ratingBlock: {alignItems: 'center', paddingVertical: 22},
  ratingLabel: {marginTop: 12, fontSize: 14, fontWeight: '800', color: '#0B1B33'},
  inputLabel: {fontSize: 13, fontWeight: '700', color: '#324054', marginBottom: 8},
  textArea: {
    borderWidth: 1,
    borderColor: '#D9E3F0',
    borderRadius: 14,
    backgroundColor: '#F9FBFD',
    padding: 14,
    fontSize: 15,
    color: '#10284C',
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: '#0B1B33',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitButtonDisabled: {opacity: 0.5},
  submitButtonText: {color: '#FFFFFF', fontSize: 15, fontWeight: '800'},
});

export default WriteReviewModal;
