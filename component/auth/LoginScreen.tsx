import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {login} from '../../api/auth';

interface LoginSuccessOptions {
  mustChangePassword?: boolean;
}

interface LoginScreenProps {
  onNavigateToSignup?: () => void;
  onNavigateToForgotPassword?: () => void;
  onNavigateToParentPortal?: () => void;
  onLoginSuccess?: (userId: number, userRole: string, options?: LoginSuccessOptions) => void;
}

const LoginScreen = ({
  onNavigateToSignup,
  onNavigateToForgotPassword,
  onNavigateToParentPortal,
  onLoginSuccess,
}: LoginScreenProps) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSavedPicker, setShowSavedPicker] = useState(false);
  const [rememberedEmail, setRememberedEmail] = useState('');
  const [rememberedPassword, setRememberedPassword] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  useEffect(() => {
    const loadRemembered = async () => {
      try {
        const rememberFlag = await AsyncStorage.getItem('remember_me');
        if (rememberFlag !== 'true') return;
        const savedEmail = await AsyncStorage.getItem('remembered_email');
        const savedPassword = await AsyncStorage.getItem('remembered_password');
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberedEmail(savedEmail);
        }
        if (savedPassword) {
          setPassword(savedPassword);
          setRememberedPassword(savedPassword);
        }
        setRememberMe(true);
      } catch (err) {
        // Ignore storage errors
      }
    };

    loadRemembered();
  }, []);

  const handleLogin = async (override?: {email: string; password: string}) => {
    // Validate inputs
    const emailToUse = override?.email ?? email;
    const passwordToUse = override?.password ?? password;

    if (!emailToUse.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!passwordToUse.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await login({email: emailToUse.trim(), password: passwordToUse});
      // Login successful - tokens are stored automatically
      console.log('User logged in:', response.user);

      if (rememberMe) {
        await AsyncStorage.multiSet([
          ['remember_me', 'true'],
          ['remembered_email', emailToUse.trim()],
          ['remembered_password', passwordToUse],
        ]);
      } else {
        await AsyncStorage.multiRemove([
          'remember_me',
          'remembered_email',
          'remembered_password',
        ]);
      }

      // Navigate based on user role
      if (onLoginSuccess && response.user) {
        const userRole = response.user.role?.toLowerCase() || '';
        if (userRole === 'teacher' || userRole === 'student' || userRole === 'admin' || userRole === 'parent') {
          onLoginSuccess(response.user.id, userRole, {
            mustChangePassword:
              userRole === 'parent' ? !!response.user.must_reset_password : false,
          });
        } else {
          // For other roles, show success message
          Alert.alert('Success', 'Login successful!', [
            {
              text: 'OK',
              onPress: () => {
                console.log('User role:', userRole);
              },
            },
          ]);
        }
      } else {
        Alert.alert('Success', 'Login successful!');
      }
    } catch (err: any) {
      const errorMessage = err.message || err.toString() || 'Login failed. Please try again.';
      console.error('[LOGIN SCREEN] Login error:', err);
      setError(errorMessage);
      setErrorModalMessage(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Handle Google login logic here
    console.log('Google login pressed');
  };

  return (
    // <SafeAreaView style={styles.container}>
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
            <Text style={styles.headerTitle}>Get Started now</Text>
            <Text style={styles.headerSubtitle}>
              Create an account or log in to explore about our smarttutor app
            </Text>
          </View>

          {/* Form Section - White Background */}
          <View style={styles.formContainer}>
            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'login' && styles.tabActive,
                ]}
                onPress={() => setActiveTab('login')}>
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'login' && styles.tabTextActive,
                  ]}>
                  Log In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'signup' && styles.tabActive,
                ]}
                onPress={() => {
                  setActiveTab('signup');
                  onNavigateToSignup?.();
                }}>
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'signup' && styles.tabTextActive,
                  ]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.formFields}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => {
                    if (rememberedEmail) {
                      setShowSavedPicker(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSavedPicker(false), 120);
                  }}
                />
                {showSavedPicker && rememberedEmail ? (
                  <View style={styles.savedPillRow}>
                    <TouchableOpacity
                      style={styles.savedPill}
                      onPress={() => {
                        setEmail(rememberedEmail);
                        if (rememberedPassword) {
                          setPassword(rememberedPassword);
                        }
                        setShowSavedPicker(false);
                        handleLogin({email: rememberedEmail, password: rememberedPassword});
                      }}
                    >
                      <Text style={styles.savedPillText}>{rememberedEmail}</Text>
                      <Text style={styles.savedPillSub}>••••••</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.savedPillAction}
                      onPress={() => {
                        setEmail(rememberedEmail);
                        if (rememberedPassword) {
                          setPassword(rememberedPassword);
                        }
                        setShowSavedPicker(false);
                        handleLogin({email: rememberedEmail, password: rememberedPassword});
                      }}
                    >
                      <Text style={styles.savedPillActionText}>Login</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => {
                      if (rememberedEmail) {
                        setShowSavedPicker(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSavedPicker(false), 120);
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}>
                    <Text style={styles.eyeIconText}>
                      {showPassword ? '👁' : '👁‍🗨'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me & Forgot Password */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}>
                  <View style={styles.checkbox}>
                    {rememberMe && <View style={styles.checkboxInner} />}
                  </View>
                  <Text style={styles.checkboxLabel}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onNavigateToForgotPassword}>
                  <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                onPress={() => handleLogin()}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Log In</Text>
                )}
              </TouchableOpacity>

              

              {/* Divider */}
              {/* <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or</Text>
                <View style={styles.dividerLine} />
              </View> */}

              {/* Social Login Buttons */}
              {/* <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleLogin}>
                <View style={styles.socialIconContainer}>
                  <Text style={styles.googleIcon}>G</Text>
                </View>
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </TouchableOpacity> */}
            </View>
          </View>

              <TouchableOpacity
                style={styles.parentPortalButton}
                onPress={onNavigateToParentPortal}
                activeOpacity={0.85}>
                <Ionicons name="people-outline" size={16} color="#10284C" />
                <Text style={styles.parentPortalButtonText}>Parent Portal</Text>
              </TouchableOpacity>
        </ScrollView>

        <Modal
          visible={showErrorModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowErrorModal(false)}>
          <View style={styles.errorModalOverlay}>
            <View style={styles.errorModalCard}>
              <View style={styles.errorModalIconWrap}>
                <Ionicons name="alert-circle-outline" size={30} color="#DC2626" />
              </View>
              <Text style={styles.errorModalTitle}>Login Failed</Text>
              <Text style={styles.errorModalMessage}>{errorModalMessage}</Text>
              <TouchableOpacity
                style={styles.errorModalButton}
                activeOpacity={0.85}
                onPress={() => setShowErrorModal(false)}>
                <Text style={styles.errorModalButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    // </SafeAreaView>
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
    paddingBottom: 24,
  },
  header: {
    backgroundColor: '#10284C',
    paddingTop: 38,
    paddingBottom: 44,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  formFields: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  savedPillRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedPill: {
    flex: 1,
    backgroundColor: '#101820',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1F2A36',
  },
  savedPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  savedPillSub: {
    color: '#9CB0C6',
    fontSize: 12,
    marginTop: 2,
  },
  savedPillAction: {
    backgroundColor: '#0B6EF0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedPillActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#0151ba',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: '#0c68df',
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#096ef0',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#096ef0',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  parentPortalButton: {
    marginTop: 12,
    backgroundColor: '#EAF2FF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  parentPortalButtonText: {
    color: '#10284C',
    fontSize: 14,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#999999',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  socialIconContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  
  socialButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#C62828',
    fontSize: 13,
    textAlign: 'left',
    lineHeight: 18,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorModalIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10284C',
    textAlign: 'center',
  },
  errorModalMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorModalButton: {
    marginTop: 16,
    alignSelf: 'stretch',
    backgroundColor: '#10284C',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  errorModalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LoginScreen;

