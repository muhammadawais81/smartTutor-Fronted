import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getStudentByUserId, updateStudentProfile} from '../../api/student';
import {ProfilePictureUpload} from '../upload/ProfilePictureUpload';

const StudentProfileEdit = ({userId, onBack, onSaveSuccess}) => {
  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [profilePicture, setProfilePicture] = useState('');

  // UI state
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [studentId, setStudentId] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const profile = await getStudentByUserId(userId);
      
      setStudentId(profile.student_id);
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setCity(profile.city || '');
      setGradeLevel(profile.grade_level || '');
      setProfilePicture(profile.profile_picture || '');
    } catch (err) {
      console.error('[EDIT PROFILE] Error loading profile:', err);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length > 255) {
      newErrors.fullName = 'Full name must be less than 255 characters';
    }

    if (phone && phone.length > 20) {
      newErrors.phone = 'Phone number must be less than 20 characters';
    }

    if (city && city.length > 100) {
      newErrors.city = 'City must be less than 100 characters';
    }

    if (gradeLevel && gradeLevel.length > 50) {
      newErrors.gradeLevel = 'Grade level must be less than 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      const studentData = {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        grade_level: gradeLevel.trim() || undefined,
        profile_picture: profilePicture.trim() || undefined,
      };

      await updateStudentProfile(studentId, studentData);

      Alert.alert(
        'Success',
        'Profile updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSaveSuccess) {
                onSaveSuccess();
              }
            },
          },
        ],
        {cancelable: false},
      );
    } catch (error) {
      console.error('[EDIT PROFILE] Error:', error);
      
      let errorMessage = 'Failed to update profile. Please try again.';
      if (error?.response) {
        if (error.response.status === 404) {
          errorMessage = 'Student profile not found';
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        }
      }
      
      setErrors({general: errorMessage});
    } finally {
      setIsSaving(false);
    }
  };

  const renderInput = (label, value, setValue, fieldName, placeholder, keyboardType = 'default') => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputContainer, errors[fieldName] && styles.inputError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          keyboardType={keyboardType}
          autoCapitalize="none"
        />
      </View>
      {errors[fieldName] && <Text style={styles.errorText}>{errors[fieldName]}</Text>}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar backgroundColor="#10284C" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10284C" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar backgroundColor="#10284C" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          <View style={styles.formContainer}>
            {errors.general && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            {/* Profile Picture Upload */}
            <View style={styles.uploadSection}>
              <Text style={styles.sectionTitle}>Profile Picture</Text>
              <ProfilePictureUpload
                currentImageUrl={profilePicture}
                onUploadSuccess={(url) => setProfilePicture(url)}
                size={120}
              />
            </View>

            {/* Full Name - Required */}
            {renderInput(
              'Full Name *',
              fullName,
              setFullName,
              'fullName',
              'Enter your full name',
              'default',
            )}

            {/* Phone */}
            {renderInput(
              'Phone Number',
              phone,
              setPhone,
              'phone',
              'Enter your phone number',
              'phone-pad',
            )}

            {/* City */}
            {renderInput(
              'City',
              city,
              setCity,
              'city',
              'Enter your city',
              'default',
            )}

            {/* Grade Level */}
            {renderInput(
              'Grade Level',
              gradeLevel,
              setGradeLevel,
              'gradeLevel',
              'e.g., Grade 10, Grade 9',
              'default',
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSaving && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'left',
    paddingHorizontal: 16,
    paddingVertical: 1,
    backgroundColor: '#10284C',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  backArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    paddingRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  formContainer: {
    padding: 20,
  },
  uploadSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingVertical: 0,
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#10284C',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginBottom: 16,
  },
});

export default StudentProfileEdit;
