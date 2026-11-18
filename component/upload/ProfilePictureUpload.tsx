// component/upload/ProfilePictureUpload.tsx

import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { uploadProfilePicture, takeProfilePhoto } from '../../services/uploadService';

interface Props {
  currentImageUrl?: string | null;
  onUploadSuccess: (url: string) => void;
  size?: number;
}

export const ProfilePictureUpload: React.FC<Props> = ({
  currentImageUrl,
  onUploadSuccess,
  size = 120,
}) => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImageUrl);
  const [feedbackModal, setFeedbackModal] = useState({
    visible: false,
    title: '',
    message: '',
    success: true,
  });

  const handleUpload = async (useCamera: boolean) => {
    setLoading(true);
    
    const result = useCamera 
      ? await takeProfilePhoto() 
      : await uploadProfilePicture();

    setLoading(false);

    if (result.success && result.url) {
      setImageUrl(result.url);
      onUploadSuccess(result.url);
      setFeedbackModal({
        visible: true,
        title: 'Upload Complete',
        message: 'Profile picture uploaded successfully!',
        success: true,
      });
    } else {
      setFeedbackModal({
        visible: true,
        title: 'Upload Failed',
        message: result.error || 'Upload failed',
        success: false,
      });
    }
  };

  const showOptions = () => {
    Alert.alert(
      'Upload Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: () => handleUpload(true) },
        { text: 'Choose from Gallery', onPress: () => handleUpload(false) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const imageSize = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={showOptions} disabled={loading}>
        {loading ? (
          <View style={[styles.placeholder, imageSize]}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={[styles.image, imageSize]} />
        ) : (
          <View style={[styles.placeholder, imageSize]}>
            <Text style={styles.placeholderText}>+</Text>
            <Text style={styles.labelText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={showOptions} style={styles.changeButton} disabled={loading}>
        <Text style={styles.changeButtonText}>
          {imageUrl ? 'Change Photo' : 'Upload Photo'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={feedbackModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackModal(prev => ({...prev, visible: false}))}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIconWrap,
                feedbackModal.success ? styles.modalSuccessBg : styles.modalErrorBg,
              ]}>
              <Ionicons
                name={feedbackModal.success ? 'checkmark-circle' : 'alert-circle'}
                size={32}
                color={feedbackModal.success ? '#16A34A' : '#DC2626'}
              />
            </View>
            <Text style={styles.modalTitle}>{feedbackModal.title}</Text>
            <Text style={styles.modalMessage}>{feedbackModal.message}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.88}
              onPress={() => setFeedbackModal(prev => ({...prev, visible: false}))}>
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  image: {
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 40,
    color: '#999',
  },
  labelText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  changeButton: {
    marginTop: 10,
    padding: 8,
  },
  changeButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalSuccessBg: {
    backgroundColor: '#DCFCE7',
  },
  modalErrorBg: {
    backgroundColor: '#FEE2E2',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10284C',
    textAlign: 'center',
  },
  modalMessage: {
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
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
