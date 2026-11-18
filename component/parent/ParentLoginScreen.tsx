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
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {loginParent} from '../../api/parent';

interface ParentLoginScreenProps {
  onLoginSuccess: (parentId: number, mustChangePassword?: boolean) => void;
  onNavigateToChangePassword: () => void;
  onBackToLogin?: () => void;
}

const ParentLoginScreen = ({
  onLoginSuccess,
  onNavigateToChangePassword,
  onBackToLogin,
}: ParentLoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await loginParent({email: email.trim(), password});

      const mustChangePassword = !!(
        response.must_change_password || response.parent?.must_change_password
      );

      if (mustChangePassword) {
        onNavigateToChangePassword();
        return;
      }

      onLoginSuccess(response.parent.id, false);
    } catch (err: any) {
      const errorMessage = err?.message || 'Parent login failed. Please try again.';
      setError(errorMessage);
      Alert.alert('Login Failed', errorMessage, [{text: 'OK'}]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor="#10284C" barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <TouchableOpacity style={styles.backButton} onPress={onBackToLogin} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={20} color="#DCE8F8" />
              <Text style={styles.backButtonText}>Back to login</Text>
            </TouchableOpacity>
            <View style={styles.heroBadge}>
              <Ionicons name="people-outline" size={18} color="#10284C" />
              <Text style={styles.heroBadgeText}>Parent Portal</Text>
            </View>
            <Text style={styles.heroTitle}>Stay connected to your child&apos;s progress</Text>
            <Text style={styles.heroSubtitle}>
              Use the temporary password shared by the teacher, then switch to your own password.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>Parent Sign In</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter parent email"
                placeholderTextColor="#8A97AA"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Temporary Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter temporary password"
                  placeholderTextColor="#8A97AA"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(prev => !prev)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#5E6A7D" />
                </TouchableOpacity>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} activeOpacity={0.9} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Open Parent Portal</Text>}
            </TouchableOpacity>

            <View style={styles.helperCard}>
              <Text style={styles.helperTitle}>What happens next</Text>
              <Text style={styles.helperText}>1. Parent logs in with the temporary credentials.
2. If required, the password is changed immediately.
3. The portal shows linked students, attendance, and marks.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#10284C'},
  keyboardView: {flex: 1},
  content: {flexGrow: 1, backgroundColor: '#F4F7FB', paddingBottom: 32},
  hero: {
    backgroundColor: '#10284C',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  backButtonText: {color: '#DCE8F8', fontSize: 13, fontWeight: '600'},
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: '#DFF4EE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
  },
  heroBadgeText: {color: '#10284C', fontSize: 12, fontWeight: '700'},
  heroTitle: {color: '#FFFFFF', fontSize: 28, fontWeight: '800', lineHeight: 34, maxWidth: 320},
  heroSubtitle: {color: 'rgba(255,255,255,0.84)', fontSize: 14, lineHeight: 20, marginTop: 10},
  formCard: {
    marginHorizontal: 16,
    marginTop: -18,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 8},
    elevation: 4,
  },
  sectionLabel: {fontSize: 13, fontWeight: '800', color: '#10284C', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.4},
  inputGroup: {marginBottom: 16},
  inputLabel: {fontSize: 13, fontWeight: '600', color: '#324054', marginBottom: 8},
  input: {
    borderWidth: 1,
    borderColor: '#D9E3F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#10284C',
    backgroundColor: '#F9FBFD',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9E3F0',
    borderRadius: 14,
    backgroundColor: '#F9FBFD',
  },
  passwordInput: {flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#10284C'},
  eyeButton: {paddingHorizontal: 14, paddingVertical: 12},
  errorText: {color: '#B42318', fontSize: 13, fontWeight: '600', marginBottom: 14},
  primaryButton: {
    backgroundColor: '#10284C',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {color: '#FFFFFF', fontSize: 15, fontWeight: '800'},
  helperCard: {
    marginTop: 16,
    backgroundColor: '#EAF2FF',
    borderRadius: 16,
    padding: 14,
  },
  helperTitle: {color: '#10284C', fontSize: 13, fontWeight: '800', marginBottom: 8},
  helperText: {color: '#38506F', fontSize: 13, lineHeight: 19},
});

export default ParentLoginScreen;
