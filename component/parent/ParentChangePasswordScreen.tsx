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
  Modal,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {changeParentPassword} from '../../api/parent';

interface ParentChangePasswordScreenProps {
  onComplete: () => void;
  onBackToLogin: () => void;
}

const ParentChangePasswordScreen = ({onComplete, onBackToLogin}: ParentChangePasswordScreenProps) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await changeParentPassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      const errorMessage = err?.message || 'Unable to change password.';
      setError(errorMessage);
      Alert.alert('Password Update Failed', errorMessage, [{text: 'OK'}]);
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
            <Text style={styles.heroKicker}>Security check</Text>
            <Text style={styles.heroTitle}>Set your permanent password</Text>
            <Text style={styles.heroSubtitle}>
              Temporary passwords are only for first login. Replace it now so the portal stays secure.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter old password"
                  placeholderTextColor="#8A97AA"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry={!showOldPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowOldPassword(prev => !prev)} style={styles.eyeButton}>
                  <Ionicons name={showOldPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#5E6A7D" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter new password"
                  placeholderTextColor="#8A97AA"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNewPassword(prev => !prev)} style={styles.eyeButton}>
                  <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#5E6A7D" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="#8A97AA"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(prev => !prev)} style={styles.eyeButton}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#5E6A7D" />
                </TouchableOpacity>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} activeOpacity={0.9} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Update Password</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={onBackToLogin} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Back to login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark-circle" size={34} color="#16A34A" />
            </View>
            <Text style={styles.modalTitle}>Password Updated</Text>
            <Text style={styles.modalBody}>
              Your password has been updated successfully. You can continue to your parent dashboard.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.88}
              onPress={() => {
                setShowSuccessModal(false);
                onComplete();
              }}>
              <Text style={styles.modalButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  heroKicker: {color: '#8FB2E8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10},
  heroTitle: {color: '#FFFFFF', fontSize: 28, fontWeight: '800', lineHeight: 34},
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
  inputGroup: {marginBottom: 16},
  inputLabel: {fontSize: 13, fontWeight: '600', color: '#324054', marginBottom: 8},
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
  },
  primaryButtonText: {color: '#FFFFFF', fontSize: 15, fontWeight: '800'},
  secondaryButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
  },
  secondaryButtonText: {color: '#10284C', fontSize: 14, fontWeight: '700'},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
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
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ParentChangePasswordScreen;
