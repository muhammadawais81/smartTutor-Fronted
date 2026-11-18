import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Image, Alert} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ADMIN_COLORS, ADMIN_SPACING, ADMIN_SHADOW, ADMIN_RADII} from './adminTheme';
import {getAdminStudentById} from '../../api/admin/adminApi';

interface StudentDetailProps {
  studentId: number;
  onBack?: () => void;
}

const StudentDetailScreen: React.FC<StudentDetailProps> = ({studentId, onBack}) => {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getAdminStudentById(studentId);
        if (mounted) setStudent(data);
      } catch (err: any) {
        console.log('[StudentDetail] error', err);
        Alert.alert('Error', err.message || 'Failed to load student');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [studentId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ADMIN_COLORS.brand} />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.center}>
        <Text style={{color: ADMIN_COLORS.textMuted}}>Student not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding: ADMIN_SPACING.md}}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={ADMIN_COLORS.surface} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Student Detail</Text>
        <View style={{width: 40}} />
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          {student.profile_picture ? (
            <Image source={{uri: student.profile_picture}} style={styles.avatar} />
          ) : (
            <MaterialCommunityIcons name="account-circle" size={72} color={ADMIN_COLORS.brand} />
          )}
          <View style={{flex: 1, marginLeft: ADMIN_SPACING.md}}>
            <Text style={styles.name}>{student.full_name}</Text>
            <Text style={styles.sub}>{student.phone || 'N/A'}</Text>
            <Text style={styles.sub}>{student.city || ''}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Student ID</Text>
          <Text style={styles.value}>{student.student_id}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Grade</Text>
          <Text style={styles.value}>{student.grade_level || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Parent Linked</Text>
          <Text style={styles.value}>{student.parent_id ? 'Yes' : 'No'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Added</Text>
          <Text style={styles.value}>{student.created_at}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: ADMIN_COLORS.surfaceAlt},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {
    backgroundColor: ADMIN_COLORS.brand,
    padding: ADMIN_SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...ADMIN_SHADOW,
  },
  backButton: {padding: ADMIN_SPACING.sm},
  title: {color: ADMIN_COLORS.surface, fontWeight: '700', fontSize: 18},
  card: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: ADMIN_RADII.card,
    padding: ADMIN_SPACING.md,
    marginTop: ADMIN_SPACING.md,
    ...ADMIN_SHADOW,
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  avatar: {width: 72, height: 72, borderRadius: 36, backgroundColor: ADMIN_COLORS.surfaceAlt},
  name: {fontSize: 18, fontWeight: '700', color: ADMIN_COLORS.text},
  sub: {fontSize: 12, color: ADMIN_COLORS.textMuted, marginTop: 4},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', marginTop: ADMIN_SPACING.md},
  label: {color: ADMIN_COLORS.textMuted, fontSize: 12},
  value: {color: ADMIN_COLORS.text, fontWeight: '600'},
});

export default StudentDetailScreen;
