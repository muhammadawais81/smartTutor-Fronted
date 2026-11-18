import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getParentProfile, getParentStudents} from '../../api/parent';

interface ParentProfileScreenProps {
  onLogout: () => void;
  onChangePassword: () => void;
}

const ParentProfileScreen = ({onLogout, onChangePassword}: ParentProfileScreenProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [profileResponse, studentsResponse, storedUser] = await Promise.all([
        getParentProfile().catch(() => null),
        getParentStudents().catch(() => []),
        AsyncStorage.getItem('user'),
      ]);

      const fallbackProfile = storedUser ? JSON.parse(storedUser) : null;
      setProfile(profileResponse || fallbackProfile);
      setStudentCount(Array.isArray(studentsResponse) ? studentsResponse.length : 0);
    } catch (error: any) {
      Alert.alert('Parent Profile', error?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              'access_token',
              'refresh_token',
              'user',
              'user_role',
            ]);
          } catch (error) {
            console.warn('[PARENT PROFILE] Failed to clear auth state:', error);
          }
          onLogout();
        },
      },
    ]);
  };

  const parentName = profile?.name || 'Parent';
  const parentEmail = profile?.email || 'Not available';
  const parentPhone = profile?.phone || 'Not added';
  const initial = parentName.charAt(0).toUpperCase();

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar backgroundColor="#0B1B33" barStyle="light-content" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#46D9B1" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#0B1B33" barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#46D9B1" />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>My Profile</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.heroName}>{parentName}</Text>
          <Text style={styles.heroEmail}>{parentEmail}</Text>

          <View style={styles.heroBadge}>
            <Ionicons name="people-outline" size={14} color="#0B1B33" />
            <Text style={styles.heroBadgeText}>
              {studentCount} linked {studentCount === 1 ? 'student' : 'students'}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Account details</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={18} color="#46D9B1" />
            </View>
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>Full name</Text>
              <Text style={styles.infoValue}>{parentName}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={18} color="#46D9B1" />
            </View>
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{parentEmail}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={18} color="#46D9B1" />
            </View>
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{parentPhone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionCard}>
          <TouchableOpacity style={styles.actionRow} onPress={onChangePassword} activeOpacity={0.85}>
            <View style={styles.actionIcon}>
              <Ionicons name="key-outline" size={18} color="#0B1B33" />
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={styles.actionTitle}>Change password</Text>
              <Text style={styles.actionSubtitle}>Update your account password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9FB3C8" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#B42318" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F3F7FB'},
  content: {paddingBottom: 110, backgroundColor: '#F3F7FB'},
  loadingWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0B1B33'},
  loadingText: {marginTop: 12, color: '#C9D6E6', fontSize: 14, fontWeight: '600'},
  hero: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 22,
    borderRadius: 28,
    backgroundColor: '#0B1B33',
    alignItems: 'center',
  },
  heroKicker: {color: '#7FE9C9', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5},
  avatar: {width: 84, height: 84, borderRadius: 42, backgroundColor: '#46D9B1', alignItems: 'center', justifyContent: 'center', marginTop: 16},
  avatarText: {color: '#0B1B33', fontSize: 34, fontWeight: '900'},
  heroName: {color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 14},
  heroEmail: {color: '#C9D6E6', fontSize: 13, marginTop: 4},
  heroBadge: {flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DFF4EE', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginTop: 14},
  heroBadgeText: {color: '#0B1B33', fontSize: 12, fontWeight: '800'},
  infoCard: {marginHorizontal: 16, marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#E1EAF5'},
  cardTitle: {fontSize: 16, fontWeight: '900', color: '#10284C', marginBottom: 8},
  infoRow: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F8'},
  infoRowLast: {borderBottomWidth: 0},
  infoIcon: {width: 40, height: 40, borderRadius: 14, backgroundColor: '#E8F5F0', alignItems: 'center', justifyContent: 'center'},
  infoTextBlock: {flex: 1},
  infoLabel: {color: '#6B7C90', fontSize: 12, fontWeight: '700'},
  infoValue: {color: '#10284C', fontSize: 15, fontWeight: '800', marginTop: 3},
  actionCard: {marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 6, borderWidth: 1, borderColor: '#E1EAF5'},
  actionRow: {flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12},
  actionIcon: {width: 40, height: 40, borderRadius: 14, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center'},
  actionTextBlock: {flex: 1},
  actionTitle: {color: '#10284C', fontSize: 15, fontWeight: '800'},
  actionSubtitle: {color: '#6B7C90', fontSize: 12, marginTop: 3},
  logoutButton: {marginHorizontal: 16, marginTop: 18, backgroundColor: '#FDECEC', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  logoutText: {color: '#B42318', fontSize: 15, fontWeight: '800'},
});

export default ParentProfileScreen;
