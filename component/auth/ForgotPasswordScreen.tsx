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
import {forgotPassword, resetPassword} from '../../api/auth';

interface ForgotPasswordScreenProps {
  onNavigateToLogin?: () => void;
}

const ForgotPasswordScreen = ({onNavigateToLogin}: ForgotPasswordScreenProps) => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showCodeSentModal, setShowCodeSentModal] = useState(false);
  const [showResetSuccessModal, setShowResetSuccessModal] = useState(false);
  const [showResetErrorModal, setShowResetErrorModal] = useState(false);
  const [resetErrorMessage, setResetErrorMessage] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRequestReset = async () => {
    setErrors({});

    if (!email.trim()) {
      setErrors({email: 'Email is required'});
      return;
    }

    if (!validateEmail(email)) {
      setErrors({email: 'Please enter a valid email'});
      return;
    }

    setIsLoading(true);

    try {
      await forgotPassword({email: email.trim()});
      setShowCodeSentModal(true);
    } catch (err: any) {
      setErrors({general: err.message || 'Failed to send reset code. Please try again.'});
      Alert.alert('Error', err.message || 'Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrors({});

    if (!code.trim()) {
      const message = 'Verification code is required';
      setErrors({code: message});
      setResetErrorMessage(message);
      setShowResetErrorModal(true);
      return;
    }

    if (code.length !== 6) {
      const message = 'Please enter 6-digit verification code';
      setErrors({code: message});
      setResetErrorMessage(message);
      setShowResetErrorModal(true);
      return;
    }

    if (!newPassword.trim()) {
      const message = 'New password is required';
      setErrors({newPassword: message});
      setResetErrorMessage(message);
      setShowResetErrorModal(true);
      return;
    }

    if (newPassword.length < 6) {
      const message = 'Password must be at least 6 characters';
      setErrors({newPassword: message});
      setResetErrorMessage(message);
      setShowResetErrorModal(true);
      return;
    }

    if (!confirmPassword.trim()) {
      const message = 'Please confirm your password';
      setErrors({confirmPassword: message});
      setResetErrorMessage(message);
      setShowResetErrorModal(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      const message = 'Passwords do not match';
      setErrors({confirmPassword: message});
      setResetErrorMessage(message);
      setShowResetErrorModal(true);
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({
        email: email.trim(),
        code: code.trim(),
        new_password: newPassword,
      });
      setShowResetSuccessModal(true);
    } catch (err: any) {
      const message = err.message || 'Password reset failed. Please try again.';
      setErrors({general: message});
      setResetErrorMessage(message);
      setShowResetErrorModal(true);
    } finally {
      setIsLoading(false);
    }
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
    maxLength?: number,
  ) => {
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
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
            maxLength={maxLength}
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

  const renderRequestStep = () => {
    return (
      <View style={styles.formContainer}>
        <View style={styles.formFields}>
          <Text style={styles.sectionTitle}>Forgot Password?</Text>
          <Text style={styles.sectionSubtitle}>
            {"Enter your email address and we'll send you a verification code to reset your password."}
          </Text>

          {errors.general ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          ) : null}

          {renderInput(
            'Email',
            email,
            setEmail,
            'email',
            'Enter your email',
            'email-address',
          )}

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.buttonDisabled]}
            onPress={handleRequestReset}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Send Reset Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={onNavigateToLogin}>
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderResetStep = () => {
    return (
      <View style={styles.formContainer}>
        <View style={styles.formFields}>
          <Text style={styles.sectionTitle}>Reset Password</Text>
          <Text style={styles.sectionSubtitle}>
            Enter the verification code sent to {email} and your new password.
          </Text>

          {errors.general ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          ) : null}

          {renderInput(
            'Verification Code',
            code,
            setCode,
            'code',
            'Enter 6-digit code',
            'numeric',
            false,
            false,
            false,
            undefined,
            6,
          )}

          {renderInput(
            'New Password',
            newPassword,
            setNewPassword,
            'newPassword',
            'Enter new password',
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
            'Confirm new password',
            'default',
            true,
            true,
            showConfirmPassword,
            () => setShowConfirmPassword(!showConfirmPassword),
          )}

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('request')}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={[]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Header Section - Dark Background */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../Asset/smartTutor.png')}
                style={styles.logoIcon}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>smartTutor Connect</Text>
            </View>
            <Text style={styles.headerTitle}>
              {step === 'request' ? 'Forgot Password' : 'Reset Password'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {step === 'request'
                ? "We'll help you reset your password"
                : 'Enter your verification code and new password'}
            </Text>
          </View>

          {/* Form Section */}
          {step === 'request' ? renderRequestStep() : renderResetStep()}
        </ScrollView>

        <Modal
          visible={showCodeSentModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCodeSentModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconWrap}>
                <Text style={styles.modalIcon}>@</Text>
              </View>
              <Text style={styles.modalTitle}>Code Sent</Text>
              <Text style={styles.modalBody}>
                We sent a password reset code to {email.trim()}.
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                activeOpacity={0.88}
                onPress={() => {
                  setShowCodeSentModal(false);
                  setStep('reset');
                }}>
                <Text style={styles.modalButtonText}>Enter Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showResetSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowResetSuccessModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={[styles.modalIconWrap, styles.modalSuccessIconWrap]}>
                <Ionicons name="checkmark-circle" size={30} color="#16A34A" />
              </View>
              <Text style={styles.modalTitle}>Password Reset</Text>
              <Text style={styles.modalBody}>
                Your password has been reset successfully.
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                activeOpacity={0.88}
                onPress={() => {
                  setShowResetSuccessModal(false);
                  onNavigateToLogin?.();
                }}>
                <Text style={styles.modalButtonText}>Go to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showResetErrorModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowResetErrorModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={[styles.modalIconWrap, styles.modalErrorIconWrap]}>
                <Ionicons name="alert-circle" size={30} color="#DC2626" />
              </View>
              <Text style={styles.modalTitle}>Reset Failed</Text>
              <Text style={styles.modalBody}>{resetErrorMessage}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                activeOpacity={0.88}
                onPress={() => setShowResetErrorModal(false)}>
                <Text style={styles.modalButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
  sectionTitle: {
    fontSize: 24,
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
  inputContainer: {
    gap: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
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
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  submitButton: {
    backgroundColor: '#0061cc',
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
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: '#0061cc',
    fontWeight: '500',
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalSuccessIconWrap: {
    backgroundColor: '#DCFCE7',
  },
  modalErrorIconWrap: {
    backgroundColor: '#FEE2E2',
  },
  modalIcon: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10284C',
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

export default ForgotPasswordScreen;

