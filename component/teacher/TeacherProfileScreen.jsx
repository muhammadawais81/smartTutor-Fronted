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
import {createTeacherProfile} from '../../api/teacher';

const TeacherProfileScreen = ({
  userId,
  onComplete,
  onNavigateToLogin,
  hideHeader = false,
}) => {
  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [qualification, setQualification] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [teachingMode, setTeachingMode] = useState('both');
  const [hourlyRate, setHourlyRate] = useState('');

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

    if (experienceYears && (isNaN(Number(experienceYears)) || Number(experienceYears) < 0)) {
      newErrors.experienceYears = 'Experience years must be a non-negative number';
    }

    if (qualification && qualification.length > 255) {
      newErrors.qualification = 'Qualification must be less than 255 characters';
    }

    if (bio && bio.length > 1000) {
      newErrors.bio = 'Bio must be less than 1000 characters';
    }

    if (profilePicture && profilePicture.length > 500) {
      newErrors.profilePicture = 'Profile picture URL must be less than 500 characters';
    }

    if (hourlyRate && (isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0)) {
      newErrors.hourlyRate = 'Hourly rate must be a non-negative number';
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
      const teacherData = {
        user_id: userId,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        experience_years: experienceYears ? Number(experienceYears) : undefined,
        qualification: qualification.trim() || undefined,
        bio: bio.trim() || undefined,
        profile_picture: profilePicture.trim() || undefined,
        teaching_mode: teachingMode,
        hourly_rate: hourlyRate ? Number(hourlyRate) : undefined,
      };

      await createTeacherProfile(teacherData);

      Alert.alert(
        'Success',
        'Teacher profile created successfully!',
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
      const errorMessage = err?.message || 'Failed to create teacher profile. Please try again.';
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

  const renderTeachingModeSelector = () => {
    const modes = [
      {value: 'online', label: 'Online'},
      {value: 'physical', label: 'Physical'},
      {value: 'both', label: 'Both'},
    ];

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          Teaching Mode <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.modeContainer}>
          {modes.map(mode => (
            <TouchableOpacity
              key={mode.value}
              style={[
                styles.modeButton,
                teachingMode === mode.value && styles.modeButtonActive,
              ]}
              onPress={() => setTeachingMode(mode.value)}>
              <View style={styles.radioButton}>
                {teachingMode === mode.value && <View style={styles.radioButtonInner} />}
              </View>
              <Text
                style={[
                  styles.modeButtonText,
                  teachingMode === mode.value && styles.modeButtonTextActive,
                ]}>
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const content = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          hideHeader && styles.scrollContentNoHeader,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {!hideHeader && (
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>SmartTutor Connect</Text>
            </View>
            <Text style={styles.headerTitle}>Complete Your Teacher Profile</Text>
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

              {/* Experience Years */}
              {renderInput(
                'Years of Experience',
                experienceYears,
                setExperienceYears,
                'experienceYears',
                'Enter years of experience',
                'numeric',
              )}

              {/* Qualification */}
              {renderInput(
                'Qualification',
                qualification,
                setQualification,
                'qualification',
                'e.g., M.Sc. Mathematics, B.Ed.',
                'default',
              )}

              {/* Bio */}
              {renderInput(
                'Bio',
                bio,
                setBio,
                'bio',
                'Tell students about yourself and your teaching style...',
                'default',
                true,
                4,
              )}

              {/* Profile Picture URL */}
              {renderInput(
                'Profile Picture URL',
                profilePicture,
                setProfilePicture,
                'profilePicture',
                'https://example.com/profile.jpg',
                'default',
              )}

              {/* Teaching Mode */}
              {renderTeachingModeSelector()}

              {/* Hourly Rate */}
              {renderInput(
                'Hourly Rate ($)',
                hourlyRate,
                setHourlyRate,
                'hourlyRate',
                'Enter your hourly rate',
                'numeric',
              )}

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
    paddingBottom: 24,
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
    fontSize: 22,
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
    paddingTop: 16,
    paddingBottom: 24,
  },
  scrollContentNoHeader: {
    paddingTop: 8,
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
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
    minWidth: 100,
  },
  modeButtonActive: {
    borderColor: '#0061cc',
    backgroundColor: '#E6F2FF',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0061cc',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: '#0061cc',
    fontWeight: '600',
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

export default TeacherProfileScreen;

