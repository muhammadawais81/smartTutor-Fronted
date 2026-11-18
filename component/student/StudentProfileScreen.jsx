import React, {useState} from 'react';
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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {createStudentProfile} from '../../api/student';
import {ProfilePictureUpload} from '../upload/ProfilePictureUpload';

const StudentProfileScreen = ({
  userId,
  onComplete,
  onNavigateToLogin,
  initialFullName = '',
  hideHeader = false,
}) => {
  // Form fields
  const [fullName, setFullName] = useState(initialFullName.trim());
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [parentId, setParentId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [profilePicture, setProfilePicture] = useState('');

  // UI state
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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

    if (parentId && (isNaN(Number(parentId)) || Number(parentId) < 0)) {
      newErrors.parentId = 'Parent ID must be a valid number';
    }

    if (gradeLevel && gradeLevel.length > 50) {
      newErrors.gradeLevel = 'Grade level must be less than 50 characters';
    }

    if (profilePicture && profilePicture.length > 500) {
      newErrors.profilePicture = 'Profile picture URL must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const studentData = {
        user_id: userId,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        parent_id: parentId ? Number(parentId) : undefined,
        grade_level: gradeLevel.trim() || undefined,
        profile_picture: profilePicture.trim() || undefined,
      };

      await createStudentProfile(studentData);

      Alert.alert(
        'Success',
        'Student profile created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onComplete) {
                onComplete();
              }
            },
          },
        ],
      );
    } catch (err) {
      const errorMessage =
        err?.message || 'Failed to create student profile. Please try again.';
      setErrors({general: errorMessage});
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (
    label,
    value,
    onChangeText,
    errorKey,
    placeholder,
    keyboardType = 'default',
    multiline = false,
    numberOfLines = 1,
  ) => {
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          {label}
        </Text>
        <View
          style={[
            styles.inputWrapper,
            errors[errorKey] && styles.inputError,
            multiline && styles.inputMultiline,
          ]}>
          <TextInput
            style={[styles.input, multiline && styles.inputMultilineText]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#999"
            keyboardType={keyboardType}
            autoCapitalize="none"
            autoCorrect={false}
            multiline={multiline}
            numberOfLines={numberOfLines}
          />
        </View>
        {errors[errorKey] && (
          <Text style={styles.errorText}>{errors[errorKey]}</Text>
        )}
      </View>
    );
  };

  const content = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={styles.keyboardView}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {!hideHeader && (
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>SmartTutor Connect</Text>
            </View>
            <Text style={styles.headerTitle}>Complete Your Student Profile</Text>
            <Text style={styles.headerSubtitle}>
              Help teachers find you by completing your student profile
            </Text>
          </View>
        )}

        {/* Form Section */}
        <View style={[styles.formContainer, hideHeader && styles.formContainerNoHeader]}>
          <View style={styles.formFields}>
            {errors.general && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            {/* Full Name - Required */}
            {renderInput(
              'Full Name',
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

            {/* Parent ID */}
            {renderInput(
              'Parent ID (Optional)',
              parentId,
              setParentId,
              'parentId',
              'Enter parent ID if applicable',
              'numeric',
            )}

            {/* Profile Picture Upload */}
            <View style={styles.uploadSection}>
              <Text style={styles.inputLabel}>Profile Picture</Text>
              <ProfilePictureUpload
                currentImageUrl={profilePicture}
                onUploadSuccess={(url) => setProfilePicture(url)}
                size={100}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Complete Profile</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            {onNavigateToLogin && (
              <View style={styles.loginLinkContainer}>
                <Text style={styles.loginLinkText}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={onNavigateToLogin}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (hideHeader) {
    return content;
  }

  return (
    <SafeAreaView edges={[]} style={styles.container}>
      {content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#10284C',
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.8,
    lineHeight: 22,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  formContainerNoHeader: {
    marginTop: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  formFields: {
    gap: 20,
  },
  inputContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    minHeight: 48,
  },
  inputMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    minHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingVertical: 0,
  },
  inputMultilineText: {
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  uploadSection: {
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#0061cc',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#666666',
  },
  loginLink: {
    fontSize: 14,
    color: '#0061cc',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginBottom: 8,
  },
});

export default StudentProfileScreen;

