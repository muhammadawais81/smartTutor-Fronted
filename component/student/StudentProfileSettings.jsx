import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {getStudentByUserId} from '../../api/student';

const StudentProfileSettings = ({onBack, userId, onLogout, onEditProfile}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      // Get user data from storage
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
      }

      // Get student profile
      if (userId) {
        const profile = await getStudentByUserId(userId);
        setStudentProfile(profile);
      }
    } catch (err) {
      console.log('[PROFILE] Error loading profile:', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    onLogout?.();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion API call
            Alert.alert('Info', 'Account deletion will be available soon.');
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#10284C" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const userName = studentProfile?.full_name || user?.first_name || 'Student';
  const userEmail = user?.email || 'email@example.com';
  const gradeLevel = studentProfile?.grade_level || 'Student';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#10284C" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        
        {/* Header with curved background */}
        <View style={styles.headerBackground}>
          {/* Top Row: Menu & Bell */}
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="menu" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={22} color="#10284C" />
            </TouchableOpacity>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {studentProfile?.profile_picture ? (
                <Image
                  source={{uri: studentProfile.profile_picture}}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={60} color="#999" />
                </View>
              )}
              {/* Edit Button */}
              <TouchableOpacity 
                style={styles.editAvatarBtn} 
                onPress={onEditProfile}
                activeOpacity={0.8}>
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Name */}
            <Text style={styles.userName}>{userName}</Text>
            
            {/* Grade Level */}
            <Text style={styles.gradeLevel}>{gradeLevel}</Text>
            
            {/* Email with verified badge */}
            <View style={styles.emailRow}>
              <Text style={styles.userEmail}>{userEmail}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
              </View>
            </View>
          </View>
        </View>

        {/* Content - White Card */}
        <View style={styles.content}>
          <View style={styles.menuCard}>
            {/* Edit Personal Information */}
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={onEditProfile}
              activeOpacity={0.7}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="card-outline" size={22} color="#333" />
              </View>
              <Text style={styles.menuText}>Edit Personal Information</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Log Out */}
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={handleLogout}
              activeOpacity={0.7}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="log-out-outline" size={22} color="#333" />
              </View>
              <Text style={styles.menuText}>Log Out</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Delete Account */}
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={handleDeleteAccount}
              activeOpacity={0.7}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
              </View>
              <Text style={[styles.menuText, styles.deleteText]}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutCard}>
            <View style={styles.logoutIconWrap}>
              <Ionicons name="log-out-outline" size={22} color="#DC2626" />
            </View>
            <Text style={styles.logoutTitle}>Log Out</Text>
            <Text style={styles.logoutMessage}>
              Are you sure you want to log out?
            </Text>

            <View style={styles.logoutActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.85}
                onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutBtn}
                activeOpacity={0.85}
                onPress={confirmLogout}>
                <Text style={styles.logoutBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },

  // Header Background
  headerBackground: {
    backgroundColor: '#10284C',
    paddingTop: 16,
    paddingBottom: 80,
  },

  // Top Row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gradeLevel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  verifiedBadge: {
    marginLeft: 4,
  },

  // Content
  content: {
    paddingHorizontal: 20,
    marginTop: -50,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  menuIconContainer: {
    width: 32,
    marginRight: 14,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  deleteText: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
  },
  logoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoutCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  logoutIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoutTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#10284C',
  },
  logoutMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
  },
  logoutActions: {
    marginTop: 18,
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  cancelBtnText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 11,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default StudentProfileSettings;


