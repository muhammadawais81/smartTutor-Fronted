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
  Image,
  Alert,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {register, verifyEmail, login} from '../../api/auth';
import TeacherProfileWizard from '../teacher/TeacherProfileWizard';
import StudentProfileScreen from '../student/StudentProfileScreen';

type Role = 'STUDENT' | 'TEACHER' | '';

interface SignupScreenProps {
  onNavigateToLogin?: () => void;
}

interface FeedbackModalState {
  visible: boolean;
  title: string;
  message: string;
  buttonText: string;
  iconName: string;
  iconColor: string;
  iconBg: string;
  onClose: (() => void) | null;
}

const SignupScreen = ({onNavigateToLogin}: SignupScreenProps) => {
  // Step management
  const [currentStep, setCurrentStep] = useState<'basic' | 'verification' | 'details' | 'teacherProfile' | 'studentProfile'>('basic');
  const [verificationCode, setVerificationCode] = useState('');
  
  // Common fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<Role>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState<number | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>({
    visible: false,
    title: '',
    message: '',
    buttonText: 'OK',
    iconName: 'checkmark-circle',
    iconColor: '#16A34A',
    iconBg: '#DCFCE7',
    onClose: null,
  });

  const showFeedbackModal = ({
    title,
    message,
    buttonText = 'OK',
    iconName = 'checkmark-circle',
    iconColor = '#16A34A',
    iconBg = '#DCFCE7',
    onClose,
  }: {
    title: string;
    message: string;
    buttonText?: string;
    iconName?: string;
    iconColor?: string;
    iconBg?: string;
    onClose?: (() => void) | null;
  }) => {
    setFeedbackModal({
      visible: true,
      title,
      message,
      buttonText,
      iconName,
      iconColor,
      iconBg,
      onClose: onClose || null,
    });
  };


  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateBasicForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!role) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDetailsForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone Number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerificationBack = () => {
    setCurrentStep('basic');
    setVerificationCode('');
    setErrors({});
  };

  const handleBasicSignUp = async () => {
    if (!validateBasicForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Map role to backend format (student, teacher, parent)
      let backendRole = 'student';
      if (role === 'TEACHER') {
        backendRole = 'teacher';
      } else if (role === 'STUDENT') {
        backendRole = 'student';
      } 

      const response = await register({
        email: email.trim(),
        password: password,
        role: backendRole,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
      });

      setRegisteredUserId(response.user_id);
      setCurrentStep('verification');
      showFeedbackModal({
        title: 'Code Sent',
        message: 'Please check your email for the verification code.',
        buttonText: 'Enter Code',
        iconName: 'mail-open-outline',
        iconColor: '#10284C',
        iconBg: '#EAF2FF',
      });
    } catch (err: any) {
      const message = err.message || 'Registration failed. Please try again.';
      setErrors({general: message});
      showFeedbackModal({
        title: 'Sign Up Failed',
        message,
        buttonText: 'Try Again',
        iconName: 'alert-circle',
        iconColor: '#DC2626',
        iconBg: '#FEE2E2',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      setErrors({verificationCode: 'Please enter verification code'});
      return;
    }

    if (verificationCode.length !== 6) {
      setErrors({verificationCode: 'Please enter 6-digit verification code'});
      return;
    }

    setIsVerifying(true);
    setErrors({});

    try {
      await verifyEmail({
        email: email.trim(),
        code: verificationCode.trim(),
      });

      // If teacher, auto-login and go to teacher profile screen
      if (role === 'TEACHER') {
        try {
          // Auto-login after verification so teacher can create profile
          await login({
            email: email.trim(),
            password: password,
          });
          showFeedbackModal({
            title: 'Email Verified',
            message: 'Your email is verified successfully.',
            buttonText: 'Continue',
            onClose: () => setCurrentStep('teacherProfile'),
          });
        } catch (loginErr: any) {
          // If auto-login fails, still show verification success but note they need to login
          showFeedbackModal({
            title: 'Email Verified',
            message:
              'Email verified successfully! Please login to complete your teacher profile.',
            buttonText: 'Go to Login',
            onClose: () => {
              onNavigateToLogin?.();
            },
          });
        }
      } else if (role === 'STUDENT') {
        // If student, auto-login and go to student profile screen
        try {
          await login({
            email: email.trim(),
            password: password,
          });
          showFeedbackModal({
            title: 'Email Verified',
            message: 'Your email is verified successfully.',
            buttonText: 'Continue',
            onClose: () => setCurrentStep('studentProfile'),
          });
        } catch (loginErr: any) {
          showFeedbackModal({
            title: 'Email Verified',
            message:
              'Email verified successfully! Please login to complete your student profile.',
            buttonText: 'Go to Login',
            onClose: () => {
              onNavigateToLogin?.();
            },
          });
        }
      } else {
        showFeedbackModal({
          title: 'Email Verified',
          message: 'Your email is verified successfully.',
          buttonText: 'Continue',
          onClose: () => setCurrentStep('details'),
        });
      }
    } catch (err: any) {
      const message = err.message || 'Verification failed. Please try again.';
      setErrors({verificationCode: message});
      showFeedbackModal({
        title: 'Verification Failed',
        message,
        buttonText: 'Try Again',
        iconName: 'alert-circle',
        iconColor: '#DC2626',
        iconBg: '#FEE2E2',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinalSignUp = async () => {
    if (!validateDetailsForm()) {
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      console.log('Sign up successful', {
        firstName,
        lastName,
        email,
        phoneNumber,
        // Add other fields as needed
      });
      // Handle navigation or success message here
    }, 2000);
  };


  const renderRoleSelector = () => {
    const roles = [
      {value: 'STUDENT', label: 'Student'},
      {value: 'TEACHER', label: 'Teacher'},
      // {value: 'PARENT', label: 'Parent'},
    ];

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          Role <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.roleContainer}>
          {roles.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[
                styles.roleButton,
                role === r.value && styles.roleButtonActive,
              ]}
              onPress={() => setRole(r.value as Role)}>
              <View style={styles.radioButton}>
                {role === r.value && <View style={styles.radioButtonInner} />}
              </View>
              <Text
                style={[
                  styles.roleButtonText,
                  role === r.value && styles.roleButtonTextActive,
                ]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
      </View>
    );
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    errorKey: string,
    placeholder: string,
    keyboardType: 'default' | 'email-address' | 'numeric' | 'phone-pad' = 'default',
    secureTextEntry?: boolean,
    showPasswordToggle?: boolean,
    isPasswordVisible?: boolean,
    onTogglePassword?: () => void,
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
          ]}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#999"
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {showPasswordToggle && (
            <TouchableOpacity
              onPress={onTogglePassword}
              style={styles.eyeIcon}>
              <Text style={styles.eyeIconText}>
                {isPasswordVisible ? '👁' : '👁‍🗨'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {errors[errorKey] && (
          <Text style={styles.errorText}>{errors[errorKey]}</Text>
        )}
      </View>
    );
  };



  const renderVerificationScreen = () => {
    return (
      <View style={styles.formContainer}>
        <View style={styles.formFields}>
          <View style={styles.verificationContainer}>
            <Text style={styles.verificationTitle}>Verify Your Password</Text>
            <Text style={styles.verificationSubtitle}>
              We've sent a verification code to {email}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Verification Code <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.verificationCode && styles.inputError,
                ]}>
                <TextInput
                  style={styles.input}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={6}
                  autoFocus
                />
              </View>
              {errors.verificationCode && (
                <Text style={styles.errorText}>{errors.verificationCode}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.signUpButton, isVerifying && styles.buttonDisabled]}
              onPress={handleVerification}
              disabled={isVerifying}>
              {isVerifying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signUpButtonText}>Verify</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => {
                // Resend code logic
                setVerificationCode('');
                setErrors({});
              }}>
              <Text style={styles.resendText}>Resend Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderBasicForm = () => {
    return (
      <View style={styles.formContainer}>
        <View style={styles.formFields}>
          {/* Role Selection */}
          {renderRoleSelector()}

          {/* Basic Fields */}
          {renderInput(
            'Email',
            email,
            setEmail,
            'email',
            'Enter your email',
            'email-address',
          )}
          {renderInput(
            'Password',
            password,
            setPassword,
            'password',
            'Enter your password',
            'default',
            true,
            true,
            showPassword,
            () => setShowPassword(!showPassword),
          )}
          {renderInput(
            'Confirm Password',
            confirmPassword,
            setConfirmPassword,
            'confirmPassword',
            'Confirm your password',
            'default',
            true,
            true,
            showConfirmPassword,
            () => setShowConfirmPassword(!showConfirmPassword),
          )}
          {renderInput(
            'First Name (Optional)',
            firstName,
            setFirstName,
            'firstName',
            'Enter your first name',
          )}
          {renderInput(
            'Last Name (Optional)',
            lastName,
            setLastName,
            'lastName',
            'Enter your last name',
          )}

          {/* General Error Message */}
          {errors.general ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          ) : null}

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.signUpButton, isLoading && styles.buttonDisabled]}
            onPress={handleBasicSignUp}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderDetailsForm = () => {
    return (
      <View style={styles.formContainer}>
        <View style={styles.formFields}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          <Text style={styles.sectionSubtitle}>
            Please provide additional details for your account
          </Text>

          {/* Phone Number */}
          {renderInput(
            'Phone Number',
            phoneNumber,
            setPhoneNumber,
            'phoneNumber',
            'Enter your phone number',
            'phone-pad',
          )}

          {/* Final Sign Up Button */}
          <TouchableOpacity
            style={[styles.signUpButton, isLoading && styles.buttonDisabled]}
            onPress={handleFinalSignUp}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signUpButtonText}>Complete Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const isProfileStep = currentStep === 'teacherProfile' || currentStep === 'studentProfile';
  const signupFullName = `${firstName} ${lastName}`.trim();

  return (
    <SafeAreaView
      edges={[]}
      style={[styles.container, isProfileStep && styles.profileSafeArea]}>
      {/* For Teacher/Student Profile - render full screen without SignupScreen's scroll */}
      {(currentStep === 'teacherProfile' || currentStep === 'studentProfile') ? (
        <View style={styles.profileScreenContainer}>
          {currentStep === 'teacherProfile' && registeredUserId && (
            <TeacherProfileWizard
              userId={registeredUserId}
              initialFullName={signupFullName}
              onComplete={() => {
                Alert.alert(
                  'Profile Submitted',
                  'Your profile has been submitted for review. You can now login to your account.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        if (onNavigateToLogin) {
                          onNavigateToLogin();
                        }
                      },
                    },
                  ],
                );
              }}
              onBack={() => {
                if (onNavigateToLogin) {
                  onNavigateToLogin();
                }
              }}
            />
          )}
          {currentStep === 'studentProfile' && registeredUserId && (
            <StudentProfileScreen
              userId={registeredUserId}
              initialFullName={signupFullName}
              hideHeader={true}
              onComplete={() => {
                if (onNavigateToLogin) {
                  onNavigateToLogin();
                }
              }}
              onNavigateToLogin={onNavigateToLogin}
            />
          )}
        </View>
      ) : (
        /* For other steps - use regular layout with scroll */
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Header Section - Dark Background */}
            <View style={styles.header}>
              {currentStep === 'verification' && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleVerificationBack}
                  accessibilityLabel="Back to sign up">
                  <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../Asset/smartTutor.png')}
                  style={styles.logoIcon}
                  resizeMode="contain"
                />
                <Text style={styles.logoText}>SmartTutor Connect</Text>
              </View>
              <Text style={styles.headerTitle}>
                {currentStep === 'basic'
                  ? 'Create Your Account'
                  : currentStep === 'verification'
                  ? 'Verify Your Account'
                  : 'Complete Your Profile'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {currentStep === 'basic'
                  ? 'Join SmartTutor Connect and start your learning journey'
                  : currentStep === 'verification'
                  ? 'Please verify your email to continue'
                  : ''}
              </Text>
            </View>

            {/* Form Section Based on Step */}
            {currentStep === 'basic' && renderBasicForm()}
            {currentStep === 'verification' && renderVerificationScreen()}
            {currentStep === 'details' && renderDetailsForm()}
          </ScrollView>

          <Modal
            visible={feedbackModal.visible}
            transparent
            animationType="fade"
            onRequestClose={() =>
              setFeedbackModal(prev => ({...prev, visible: false}))
            }>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View
                  style={[
                    styles.modalIconWrap,
                    {backgroundColor: feedbackModal.iconBg},
                  ]}>
                  <Ionicons
                    name={feedbackModal.iconName as any}
                    size={32}
                    color={feedbackModal.iconColor}
                  />
                </View>
                <Text style={styles.modalTitle}>{feedbackModal.title}</Text>
                <Text style={styles.modalBody}>{feedbackModal.message}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  activeOpacity={0.88}
                  onPress={() => {
                    const cb = feedbackModal.onClose;
                    setFeedbackModal(prev => ({...prev, visible: false, onClose: null}));
                    cb?.();
                  }}>
                  <Text style={styles.modalButtonText}>
                    {feedbackModal.buttonText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10284C',
  },
  profileSafeArea: {
    backgroundColor: '#f7f8f9',
  },
  profileScreenContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#10284C',
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  logoIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
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
    flex: 1,
  },
  formFields: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  required: {
    color: '#FF0000',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333333',
  },
  inputError: {
    borderColor: '#FF0000',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333333',
  },
  eyeIcon: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  eyeIconText: {
    fontSize: 18,
    color: '#666666',
  },
  errorText: {
    fontSize: 12,
    color: '#FF0000',
    marginTop: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    minWidth: 100,
  },
  roleButtonActive: {
    borderColor: '#0061cc',
    backgroundColor: '#F0F7FF',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0061cc',
  },
  roleButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: '#0061cc',
    fontWeight: '600',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F7FF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#0061cc',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 16,
    color: '#0061cc',
    fontWeight: 'bold',
  },
  signUpButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 39,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
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
  verificationContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  resendButton: {
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#0061cc',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
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
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
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

export default SignupScreen;

