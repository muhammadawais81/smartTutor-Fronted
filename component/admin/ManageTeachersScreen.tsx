import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {getPendingTeachers, approveTeacher, rejectTeacher} from '../../api/admin';
import type {TeacherDetailResponse} from '../../api/teacher/types';
import { ADMIN_COLORS, ADMIN_SPACING, ADMIN_SHADOW, ADMIN_RADII } from './adminTheme';

interface ManageTeachersScreenProps {
  onBack?: () => void;
}

const ManageTeachersScreen: React.FC<ManageTeachersScreenProps> = ({onBack}) => {
  const [pendingTeachers, setPendingTeachers] = useState<TeacherDetailResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  
  // Modal state for rejection reason
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTeacherId, setRejectTeacherId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedTeacherId, setExpandedTeacherId] = useState<number | null>(null);
  
  // Modal state for image viewing
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{uri: string; title: string} | null>(null);
  const [imageLoadingStates, setImageLoadingStates] = useState<{[key: string]: boolean}>({});
  const [imageErrorStates, setImageErrorStates] = useState<{[key: string]: boolean}>({});

  const loadAdminInfo = async () => {
    setIsLoading(true);
    try {
      // Check user role
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const role = user.role?.toLowerCase() || '';
        setUserRole(role);
        const isAdmin = role === 'admin';
        setHasAdminAccess(isAdmin);
        
        console.log('[MANAGE TEACHERS] User role:', role, 'Is Admin:', isAdmin);

        if (!isAdmin) {
          Alert.alert(
            'Access Denied',
            `This feature is only available to admin users.\nYour role: ${role}`,
            [{
              text: 'OK',
              onPress: () => {
                if (onBack) onBack();
              }
            }]
          );
          setIsLoading(false);
          return;
        }
      }

      // Load pending teachers only if admin
      await loadPendingTeachers();
    } catch (error: any) {
      console.error('[MANAGE TEACHERS] Error checking admin status:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminInfo();
  }, []);

  const loadPendingTeachers = async () => {
    setIsLoading(true);
    try {
      const response = await getPendingTeachers({skip: 0, limit: 50});
      setPendingTeachers(response);
    } catch (error: any) {
      console.error('[MANAGE TEACHERS] Error loading pending teachers:', error);
      
      // Better error messages
      let errorMsg = error.message || 'Failed to load pending teachers';
      if (error.message.includes('Admin access required')) {
        errorMsg = 'Your account does not have admin permissions. Please use an admin account.';
      }
      
      Alert.alert('Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (teacherId: number, teacherName: string) => {
    Alert.alert(
      'Approve Teacher',
      `Are you sure you want to approve ${teacherName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await approveTeacher(teacherId);
              Alert.alert('Success', `${teacherName} has been approved!`);
              // Refresh the list
              await loadPendingTeachers();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve teacher');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  const handleRejectPress = (teacherId: number) => {
    setRejectTeacherId(teacherId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const openImageModal = (imageUri: string, title: string) => {
    if (imageUri && imageUri.trim()) {
      setSelectedImage({uri: imageUri, title});
      setShowImageModal(true);
    } else {
      Alert.alert('No Image', `${title} image URL not available or is empty`);
    }
  };

  const handleImageLoadStart = (key: string) => {
    setImageLoadingStates(prev => ({...prev, [key]: true}));
  };

  const handleImageLoadEnd = (key: string) => {
    setImageLoadingStates(prev => ({...prev, [key]: false}));
  };

  const handleImageError = (key: string, error?: any) => {
    setImageErrorStates(prev => ({...prev, [key]: true}));
    setImageLoadingStates(prev => ({...prev, [key]: false}));
  };

  const handleConfirmReject = async () => {
    if (!rejectTeacherId) return;
    
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Please enter a rejection reason');
      return;
    }

    setIsProcessing(true);
    try {
      const teacher = pendingTeachers.find(t => t.teacher_id === rejectTeacherId);
      await rejectTeacher(rejectTeacherId, rejectReason);
      Alert.alert('Success', `${teacher?.full_name} has been rejected with reason provided.`);
      
      setShowRejectModal(false);
      setRejectTeacherId(null);
      setRejectReason('');
      
      // Refresh the list
      await loadPendingTeachers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject teacher');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTeacherCard = ({item: teacher}: {item: TeacherDetailResponse}) => (
    <View style={styles.teacherCard}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() =>
          setExpandedTeacherId(
            expandedTeacherId === teacher.teacher_id ? null : teacher.teacher_id,
          )
        }>
        <View style={styles.cardTitleSection}>
          <Text style={styles.teacherName}>{teacher.full_name}</Text>
          <Text style={styles.teacherEmail}>{teacher.phone}</Text>
        </View>
        <Text style={styles.expandIcon}>
          {expandedTeacherId === teacher.teacher_id ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>

      {expandedTeacherId === teacher.teacher_id && (
        <View style={styles.cardDetails}>
          {/* Basic Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{teacher.user_id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{teacher.phone || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender:</Text>
              <Text style={styles.infoValue}>{teacher.gender || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>DOB:</Text>
              <Text style={styles.infoValue}>{teacher.date_of_birth || 'N/A'}</Text>
            </View>
          </View>

          {/* Professional Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Professional Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Qualification:</Text>
              <Text style={styles.infoValue}>{teacher.highest_qualification || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Institute:</Text>
              <Text style={styles.infoValue}>{teacher.institute || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Experience:</Text>
              <Text style={styles.infoValue}>{teacher.experience_years || 0} years</Text>
            </View>
          </View>

          {/* Location Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Location & Teaching</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City:</Text>
              <Text style={styles.infoValue}>{teacher.city?.name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Area:</Text>
              <Text style={styles.infoValue}>{teacher.area || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teaching Mode:</Text>
              <Text style={styles.infoValue}>{teacher.teaching_mode || 'N/A'}</Text>
            </View>
          </View>

          {/* Subjects */}
          {teacher.subjects && teacher.subjects.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Subjects</Text>
              {teacher.subjects.map((subject, idx) => (
                <View key={idx} style={styles.subjectItem}>
                  <Text style={styles.subjectName}>{subject.subject.name}</Text>
                  {subject.level && <Text style={styles.subjectLevel}>{subject.level.name}</Text>}
                  {subject.fee_per_month && (
                    <Text style={styles.subjectFee}>Rs. {subject.fee_per_month}/month</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Bio */}
          {teacher.bio && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Bio</Text>
              <Text style={styles.bioText}>{teacher.bio}</Text>
            </View>
          )}

          {/* Images & Documents */}
          {(teacher.profile_picture || teacher.cnic_image || teacher.degree_certificate) && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Images & Documents</Text>
              <View style={styles.imagesGrid}>
                {/* Profile Picture */}
                {teacher.profile_picture && (
                  <View style={styles.imageCard}>
                    <TouchableOpacity
                      style={styles.imageThumbnailContainer}
                      onPress={() => openImageModal(teacher.profile_picture!, 'Profile Picture')}
                      disabled={!teacher.profile_picture || !teacher.profile_picture.trim()}>
                      {imageErrorStates[`profile-${teacher.teacher_id}`] ? (
                        <View style={[styles.imageThumbnail, styles.imageErrorState]}>
                          <Text style={styles.imageErrorIcon}>⚠</Text>
                        </View>
                      ) : (
                        <>
                          {imageLoadingStates[`profile-${teacher.teacher_id}`] && (
                            <ActivityIndicator
                              style={styles.imageThumbnail}
                              size="small"
                              color={ADMIN_COLORS.accent}
                            />
                          )}
                          <Image
                            source={{uri: teacher.profile_picture}}
                            style={styles.imageThumbnail}
                            onLoadStart={() => handleImageLoadStart(`profile-${teacher.teacher_id}`)}
                            onLoadEnd={() => handleImageLoadEnd(`profile-${teacher.teacher_id}`)}
                            onError={(e) => handleImageError(`profile-${teacher.teacher_id}`, e)}
                          />
                        </>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.imageLabel}>Profile</Text>
                  </View>
                )}

                {/* CNIC Image */}
                {teacher.cnic_image && (
                  <View style={styles.imageCard}>
                    <TouchableOpacity
                      style={styles.imageThumbnailContainer}
                      onPress={() => openImageModal(teacher.cnic_image!, 'CNIC')}
                      disabled={!teacher.cnic_image || !teacher.cnic_image.trim()}>
                      {imageErrorStates[`cnic-${teacher.teacher_id}`] ? (
                        <View style={[styles.imageThumbnail, styles.imageErrorState]}>
                          <Text style={styles.imageErrorIcon}>⚠</Text>
                        </View>
                      ) : (
                        <>
                          {imageLoadingStates[`cnic-${teacher.teacher_id}`] && (
                            <ActivityIndicator
                              style={styles.imageThumbnail}
                              size="small"
                              color={ADMIN_COLORS.accent}
                            />
                          )}
                          <Image
                            source={{uri: teacher.cnic_image}}
                            style={styles.imageThumbnail}
                            onLoadStart={() => handleImageLoadStart(`cnic-${teacher.teacher_id}`)}
                            onLoadEnd={() => handleImageLoadEnd(`cnic-${teacher.teacher_id}`)}
                            onError={(e) => handleImageError(`cnic-${teacher.teacher_id}`, e)}
                          />
                        </>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.imageLabel}>CNIC</Text>
                  </View>
                )}

                {/* Degree Certificate */}
                {teacher.degree_certificate && (
                  <View style={styles.imageCard}>
                    <TouchableOpacity
                      style={styles.imageThumbnailContainer}
                      onPress={() => openImageModal(teacher.degree_certificate!, 'Degree Certificate')}
                      disabled={!teacher.degree_certificate || !teacher.degree_certificate.trim()}>
                      {imageErrorStates[`degree-${teacher.teacher_id}`] ? (
                        <View style={[styles.imageThumbnail, styles.imageErrorState]}>
                          <Text style={styles.imageErrorIcon}>⚠</Text>
                        </View>
                      ) : (
                        <>
                          {imageLoadingStates[`degree-${teacher.teacher_id}`] && (
                            <ActivityIndicator
                              style={styles.imageThumbnail}
                              size="small"
                              color={ADMIN_COLORS.accent}
                            />
                          )}
                          <Image
                            source={{uri: teacher.degree_certificate}}
                            style={styles.imageThumbnail}
                            onLoadStart={() => handleImageLoadStart(`degree-${teacher.teacher_id}`)}
                            onLoadEnd={() => handleImageLoadEnd(`degree-${teacher.teacher_id}`)}
                            onError={(e) => handleImageError(`degree-${teacher.teacher_id}`, e)}
                          />
                        </>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.imageLabel}>Degree Cert</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(teacher.teacher_id, teacher.full_name)}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>✓ Approve</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRejectPress(teacher.teacher_id)}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>✕ Reject</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor={ADMIN_COLORS.brand} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Manage Teachers</Text>
          <Text style={styles.headerRole}>Role: {userRole?.toUpperCase() || 'UNKNOWN'}</Text>
        </View>
        <View style={[
          styles.roleBadge,
          {backgroundColor: hasAdminAccess ? ADMIN_COLORS.success : ADMIN_COLORS.danger}
        ]}>
          <Text style={styles.roleBadgeText}>
            {hasAdminAccess ? '✓ ADMIN' : '✕ NO ACCESS'}
          </Text>
        </View>
      </View>

      {/* Count Badge */}
      {!isLoading && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {pendingTeachers.length} pending approval{pendingTeachers.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ADMIN_COLORS.accent} />
          <Text style={styles.loadingText}>Loading pending teachers...</Text>
        </View>
      ) : pendingTeachers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>No Pending Teachers</Text>
          <Text style={styles.emptyMessage}>All teacher profiles have been reviewed!</Text>
        </View>
      ) : (
        <FlatList
          data={pendingTeachers}
          renderItem={renderTeacherCard}
          keyExtractor={item => item.teacher_id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Reject Reason Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rejection Reason</Text>
            <Text style={styles.modalDescription}>
              Please provide a reason for rejecting this teacher's profile.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter rejection reason..."
              placeholderTextColor="#999"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRejectModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectModal]}
                onPress={handleConfirmReject}
                disabled={isProcessing || !rejectReason.trim()}>
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, {color: '#FFFFFF'}]}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowImageModal(false)}>
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageModalHeader}>
            <TouchableOpacity
              onPress={() => setShowImageModal(false)}
              style={styles.imageCloseButton}>
              <Text style={styles.imageCloseIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.imageModalTitle}>{selectedImage?.title}</Text>
            <View style={{width: 40}} />
          </View>

          <View style={styles.imageModalContent}>
            {selectedImage?.uri && selectedImage.uri.trim() ? (
              <Image
                source={{uri: selectedImage.uri}}
                style={styles.fullImage}
                resizeMode="contain"
                onError={() => {
                  Alert.alert(
                    'Error Loading Image',
                    'Failed to load the image. Please check if the image storage is accessible.',
                  );
                }}
              />
            ) : (
              <View style={styles.noImageContainer}>
                <Text style={styles.noImageIcon}>📄</Text>
                <Text style={styles.noImageTitle}>No Image Available</Text>
                <Text style={styles.noImageMessage}>
                  The image URL is not available or invalid
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.surfaceAlt,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ADMIN_COLORS.brand,
    paddingHorizontal: ADMIN_SPACING.lg,
    paddingVertical: ADMIN_SPACING.md,
    ...ADMIN_SHADOW,
  },
  backButton: {
    padding: ADMIN_SPACING.sm,
  },
  backArrow: {
    fontSize: 24,
    color: ADMIN_COLORS.surface,
  },
  headerContent: {
    flex: 1,
    marginHorizontal: ADMIN_SPACING.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ADMIN_COLORS.surface,
    marginBottom: 2,
  },
  headerRole: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ADMIN_RADII.pill,
    minWidth: 80,
    alignItems: 'center',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholderIcon: {
    width: 40,
  },
  countBadge: {
    backgroundColor: 'rgba(7, 94, 84, 0.10)',
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.surfaceAlt,
    paddingHorizontal: ADMIN_SPACING.lg,
    paddingVertical: ADMIN_SPACING.sm,
  },
  countText: {
    fontSize: 13,
    color: ADMIN_COLORS.brand,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: ADMIN_SPACING.md,
    fontSize: 14,
    color: ADMIN_COLORS.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: ADMIN_SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
    marginBottom: ADMIN_SPACING.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: ADMIN_COLORS.textMuted,
  },
  listContent: {
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.md,
  },
  teacherCard: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: ADMIN_RADII.card,
    marginBottom: ADMIN_SPACING.md,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.surfaceAlt,
    overflow: 'hidden',
    ...ADMIN_SHADOW,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ADMIN_SPACING.lg,
    paddingVertical: ADMIN_SPACING.md,
  },
  cardTitleSection: {
    flex: 1,
  },
  teacherName: {
    fontSize: 15,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
    marginBottom: ADMIN_SPACING.xs,
  },
  teacherEmail: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
  },
  expandIcon: {
    fontSize: 14,
    color: ADMIN_COLORS.brand,
    marginLeft: ADMIN_SPACING.sm,
  },
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.surfaceAlt,
    paddingHorizontal: ADMIN_SPACING.lg,
    paddingVertical: ADMIN_SPACING.md,
  },
  infoSection: {
    marginBottom: ADMIN_SPACING.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.brand,
    marginBottom: ADMIN_SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: ADMIN_SPACING.xs,
  },
  infoLabel: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    flex: 1,
  },
  infoValue: {
    fontSize: 12,
    color: ADMIN_COLORS.text,
    fontWeight: '500',
    flex: 1.5,
    textAlign: 'right',
  },
  subjectItem: {
    backgroundColor: ADMIN_COLORS.surfaceAlt,
    borderRadius: ADMIN_RADII.input,
    paddingHorizontal: ADMIN_SPACING.sm,
    paddingVertical: ADMIN_SPACING.sm,
    marginBottom: ADMIN_SPACING.xs,
  },
  subjectName: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
  },
  subjectLevel: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
    marginTop: ADMIN_SPACING.xs,
  },
  subjectFee: {
    fontSize: 11,
    color: ADMIN_COLORS.success,
    marginTop: ADMIN_SPACING.xs,
    fontWeight: '500',
  },
  bioText: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    lineHeight: 18,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ADMIN_SPACING.md,
  },
  imageCard: {
    flex: 1,
    minWidth: '31%',
    backgroundColor: ADMIN_COLORS.surfaceAlt,
    borderRadius: ADMIN_RADII.input,
    padding: ADMIN_SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.surfaceAlt,
  },
  imageThumbnailContainer: {
    width: '100%',
    height: 100,
    borderRadius: ADMIN_RADII.input,
    marginBottom: ADMIN_SPACING.xs,
    overflow: 'hidden',
  },
  imageThumbnail: {
    width: '100%',
    height: 100,
    borderRadius: ADMIN_RADII.input,
    marginBottom: ADMIN_SPACING.xs,
    backgroundColor: ADMIN_COLORS.surfaceAlt,
  },
  imageErrorState: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.10)',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.danger,
  },
  imageErrorIcon: {
    fontSize: 32,
    color: ADMIN_COLORS.danger,
  },
  imageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: ADMIN_SPACING.sm,
    marginTop: ADMIN_SPACING.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: ADMIN_SPACING.sm,
    borderRadius: ADMIN_RADII.input,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: ADMIN_COLORS.success,
  },
  rejectButton: {
    backgroundColor: ADMIN_COLORS.danger,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: ADMIN_COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: ADMIN_SPACING.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
    marginBottom: ADMIN_SPACING.sm,
  },
  modalDescription: {
    fontSize: 13,
    color: ADMIN_COLORS.textMuted,
    marginBottom: ADMIN_SPACING.md,
  },
  modalInput: {
    backgroundColor: ADMIN_COLORS.surfaceAlt,
    borderRadius: ADMIN_RADII.input,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.surfaceAlt,
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.sm,
    fontSize: 13,
    color: ADMIN_COLORS.text,
    marginBottom: ADMIN_SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: ADMIN_SPACING.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: ADMIN_SPACING.md,
    borderRadius: ADMIN_RADII.input,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: ADMIN_COLORS.surfaceAlt,
  },
  rejectModal: {
    backgroundColor: ADMIN_COLORS.danger,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: ADMIN_SPACING.lg,
    paddingVertical: ADMIN_SPACING.md,
    paddingTop: ADMIN_SPACING.lg,
  },
  imageCloseButton: {
    padding: ADMIN_SPACING.sm,
    width: 40,
    alignItems: 'center',
  },
  imageCloseIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  imageModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ADMIN_COLORS.surface,
    flex: 1,
    textAlign: 'center',
  },
  imageModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ADMIN_SPACING.md,
    paddingVertical: ADMIN_SPACING.md,
  },
  fullImage: {
    width: Dimensions.get('window').width - 24,
    height: Dimensions.get('window').height - 100,
  },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageIcon: {
    fontSize: 60,
    marginBottom: ADMIN_SPACING.md,
  },
  noImageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ADMIN_COLORS.surface,
    marginBottom: ADMIN_SPACING.sm,
    textAlign: 'center',
  },
  noImageMessage: {
    fontSize: 14,
    color: '#BDBDBD',
    textAlign: 'center',
    paddingHorizontal: ADMIN_SPACING.lg,
  },
});

export default ManageTeachersScreen;
