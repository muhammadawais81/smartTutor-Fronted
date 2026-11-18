// component/TeacherDetailScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  TextInput,
  Linking,
  Share,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import Geolocation from 'react-native-geolocation-service';
import { getTeacherById } from '../../api/teacher';
import { getDayName } from '../../api/lookup';
import { chatApi } from '../../api/chat';
import { useEnrollment } from '../../hooks/useEnrollment';
import type { TeacherSubject } from '../../api/enrollment';
import {
  getTeacherReviews,
  getStudentReviewEligibility,
  submitStudentReview,
} from '../../api/reviews';
import type { TeacherReviewsResponse, ReviewEligibility } from '../../api/reviews';
import StarRating from '../reviews/StarRating';
import ReviewCard from '../reviews/ReviewCard';
import WriteReviewModal from '../reviews/WriteReviewModal';

const REVIEWS_PAGE_SIZE = 2;

interface TeacherDetailScreenProps {
  teacherId: number;
  onBack: () => void;
  onChatCreated?: (
    conversationId: number,
    teacherName?: string,
    teacherAvatar?: string | null,
  ) => void;
}

const TeacherDetailScreen: React.FC<TeacherDetailScreenProps> = ({
  teacherId,
  onBack,
  onChatCreated,
}) => {
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [token, setToken] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [reviewsData, setReviewsData] = useState<TeacherReviewsResponse | null>(null);
  const [reviewEligibility, setReviewEligibility] = useState<ReviewEligibility | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<TeacherSubject | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapType, setMapType] = useState<'osm' | 'satellite'>('osm');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const latitude = Number(teacher?.latitude);
  const longitude = Number(teacher?.longitude);
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapUrl = hasLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${
        longitude - 0.01
      },${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&marker=${
        latitude
      },${longitude}&layer=mapnik`
    : '';

  const mapHtml = hasLocation
    ? `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const teacherLat = ${latitude};
      const teacherLng = ${longitude};
      const userLat = ${userLocation?.latitude ?? 'null'};
      const userLng = ${userLocation?.longitude ?? 'null'};

      const osmLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }
      );
      const satelliteLayer = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: 'Tiles &copy; Esri' }
      );

      const map = L.map('map', { zoomControl: false });
      let activeLayer = ${mapType === 'satellite' ? 'satelliteLayer' : 'osmLayer'};
      activeLayer.addTo(map);

      const teacherMarker = L.marker([teacherLat, teacherLng]).addTo(map);
      if (userLat !== null && userLng !== null) {
        L.circleMarker([userLat, userLng], {
          radius: 8,
          color: '#1E88E5',
          fillColor: '#1E88E5',
          fillOpacity: 0.9,
        }).addTo(map);
      }

      const bounds = [];
      bounds.push([teacherLat, teacherLng]);
      if (userLat !== null && userLng !== null) {
        bounds.push([userLat, userLng]);
      }
      map.fitBounds(bounds, { padding: [40, 40] });

      window.setZoom = function(delta) {
        map.setZoom(map.getZoom() + delta);
      };
      window.recenter = function() {
        map.setView([teacherLat, teacherLng], 15);
      };
      window.setMarker = function(lat, lng) {
        if (!marker) {
          marker = L.marker([lat, lng]).addTo(map);
        } else {
          marker.setLatLng([lat, lng]);
        }
        map.setView([lat, lng], 15);
      };
    </script>
  </body>
</html>`
    : '';

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'Allow access to show your location on the map.',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const loadUserLocation = async () => {
    const allowed = await requestLocationPermission();
    if (!allowed) return;

    Geolocation.getCurrentPosition(
      position => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setUserLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const handleMapOpen = () => {
    if (!hasLocation) return;
    loadUserLocation();
    setShowMapModal(true);
  };

  const handleMapClose = () => {
    setShowMapModal(false);
  };

  const handleZoom = (delta: number) => {
    webViewRef.current?.injectJavaScript(`window.setZoom(${delta}); true;`);
  };

  const handleRecenter = () => {
    webViewRef.current?.injectJavaScript('window.recenter(); true;');
  };

  const handleDirections = async () => {
    if (!hasLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open directions.');
    }
  };

  const handleShare = async () => {
    if (!hasLocation) return;
    const shareUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;
    try {
      await Share.share({
        message: `${teacher?.full_name || 'Teacher'} location: ${shareUrl}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share location.');
    }
  };

  const toggleMapType = () => {
    setMapType(prev => (prev === 'osm' ? 'satellite' : 'osm'));
  };

  const handleMapSearch = async () => {
    const query = mapSearchQuery.trim();
    if (!query) {
      Alert.alert('Search', 'Please enter a place to search.');
      return;
    }

    setIsSearchingMap(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        Alert.alert('Not found', 'No location found. Try a different search.');
        return;
      }

      const result = results[0];
      const newLat = Number(result?.lat);
      const newLng = Number(result?.lon);
      if (!Number.isFinite(newLat) || !Number.isFinite(newLng)) {
        Alert.alert('Search', 'Invalid location result.');
        return;
      }

      webViewRef.current?.injectJavaScript(
        `window.setMarker(${newLat}, ${newLng}); true;`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to search location. Please try again.');
    } finally {
      setIsSearchingMap(false);
    }
  };

  const webViewRef = React.useRef<WebView>(null);

  // Enrollment hook
  const {
    subjects,
    loadingTeacherSubjects,
    loadingEnrollment,
    error: enrollmentError,
    fetchTeacherSubjects,
    enrollInSubject,
    clearError,
  } = useEnrollment();

  useEffect(() => {
    setShowAllReviews(false);
    loadTeacherDetails();
    loadUserData();
    loadReviews();
  }, [teacherId]);

  const loadUserData = async () => {
    const userStr = await AsyncStorage.getItem('user');
    const accessToken = await AsyncStorage.getItem('access_token');
    const storedRole = await AsyncStorage.getItem('user_role');
    let role = storedRole || '';
    if (userStr) {
      const userData = JSON.parse(userStr);
      setCurrentUserId(userData.id);
      if (!role && userData.role) {
        role = String(userData.role).toLowerCase();
      }
    }
    if (accessToken) {
      setToken(accessToken);
    }
    setUserRole(role.toLowerCase());
    if (role.toLowerCase() === 'student') {
      loadStudentEligibility();
    }
  };

  const loadTeacherDetails = async () => {
    try {
      const data = await getTeacherById(teacherId);
      setTeacher(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load teacher details');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const data = await getTeacherReviews(teacherId);
      setReviewsData(data);
    } catch (error) {
      console.log('[TeacherDetail] Failed to load reviews:', error);
    }
  };

  const loadStudentEligibility = async () => {
    try {
      const eligibility = await getStudentReviewEligibility(teacherId);
      setReviewEligibility(eligibility);
    } catch (error) {
      console.log('[TeacherDetail] Failed to load review eligibility:', error);
    }
  };

  const handleSubmitReview = async (rating: number, feedback: string) => {
    setSubmittingReview(true);
    try {
      await submitStudentReview({
        teacher_id: teacherId,
        rating,
        feedback: feedback || undefined,
      });
      setShowReviewModal(false);
      Alert.alert('Thank you', 'Your review has been submitted.');
      await Promise.all([loadReviews(), loadStudentEligibility()]);
    } catch (error: any) {
      Alert.alert('Review Failed', error?.message || 'Could not submit your review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenEnrollment = async () => {
    if (!token || !currentUserId) {
      Alert.alert('Error', 'Please login to enroll in courses');
      return;
    }
    
    setShowEnrollmentModal(true);
    // Load teacher subjects when modal opens
    try {
      await fetchTeacherSubjects(teacherId);
    } catch (err) {
      console.error('[TeacherDetail] Error loading subjects:', err);
    }
  };

  const handleSelectSubject = (subject: TeacherSubject) => {
    setSelectedSubject(subject);
  };

  const handleConfirmEnrollment = async () => {
    if (!selectedSubject) {
      Alert.alert('Error', 'Please select a subject');
      return;
    }

    try {
      await enrollInSubject({
        teacher_id: teacherId,
        subject_id: selectedSubject.subject_id,
        level_id: selectedSubject.level_id,
      });

      Alert.alert(
        'Success',
        'Enrollment request submitted! Your teacher will review and approve it shortly.'
      );
      setShowEnrollmentModal(false);
      setSelectedSubject(null);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to enroll';
      Alert.alert('Error', errorMsg);
    }
  };

  const handleCloseModal = () => {
    setShowEnrollmentModal(false);
    setSelectedSubject(null);
    clearError();
  };

  const handleStartChat = async () => {
    if (!token || !currentUserId) {
      Alert.alert('Error', 'Please login to start chat');
      return;
    }

    // Chat API expects teachers.teacher_id (profile PK), not the auth user id.
    const teacherProfileId = teacher?.teacher_id ?? teacherId;
    const teacherUserId = teacher?.user_id;

    if (!teacherProfileId) {
      Alert.alert('Error', 'Teacher information is incomplete. Cannot start chat.');
      return;
    }

    setChatLoading(true);
    try {
      const conversationsList = await chatApi.listConversations(
        { limit: 100, status: 'active' },
        token
      );

      console.log('[TeacherDetail] Conversations:', conversationsList.conversations);

      // Try multiple matching strategies
      const existingConversation = conversationsList.conversations.find(
        (conv: any) => {
          // Match by teacher user ID
          if (teacherUserId && conv.teacher_id === teacherUserId) return true;
          // Match by teacher profile ID (in case API uses profile IDs)
          if (teacherProfileId && conv.teacher_id === teacherProfileId) return true;
          // Match by other_user ID
          if (teacherUserId && conv.other_user?.id === teacherUserId) return true;
          // Match by teacher name in subject
          if (teacher?.full_name && conv.subject?.includes(teacher.full_name)) return true;
          return false;
        }
      );

      if (existingConversation) {
        console.log('[TeacherDetail] Found existing conversation:', existingConversation.id);
        if (onChatCreated) {
          onChatCreated(
            existingConversation.id,
            teacher?.full_name,
            teacher?.profile_picture,
          );
        }
      } else {
        console.log('[TeacherDetail] Creating new conversation with teacher_id:', teacherProfileId);

        const newConversation = await chatApi.createConversation(
          {
            teacher_id: teacherProfileId,
            subject: `Chat with ${teacher.full_name || 'Teacher'}`,
          },
          token
        );
        
        console.log('[TeacherDetail] Created conversation:', newConversation);
        
        if (onChatCreated) {
          onChatCreated(
            newConversation.id,
            teacher?.full_name,
            teacher?.profile_picture,
          );
        }
      }
    } catch (error: any) {
      console.error('[TeacherDetail] Error starting chat:', error);
      let errorMessage = 'Failed to start chat. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setChatLoading(false);
    }
  };

  const displayRating = reviewsData?.average_rating ?? teacher?.rating ?? 0;
  const totalReviewCount = reviewsData?.total_reviews ?? teacher?.total_reviews ?? 0;
  const allReviews = reviewsData?.reviews ?? [];

  const ratingBreakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    allReviews.forEach(review => {
      const star = Math.round(review.rating);
      if (star >= 1 && star <= 5) {
        counts[star - 1] += 1;
      }
    });
    const total = allReviews.length || 1;
    return [5, 4, 3, 2, 1].map(star => ({
      star,
      count: counts[star - 1],
      percent: Math.round((counts[star - 1] / total) * 100),
    }));
  }, [allReviews]);

  const visibleReviews = useMemo(() => {
    if (showAllReviews) {
      return allReviews;
    }
    return allReviews.slice(0, REVIEWS_PAGE_SIZE);
  }, [allReviews, showAllReviews]);

  const hasMoreReviews = allReviews.length > REVIEWS_PAGE_SIZE;
  const remainingReviews = Math.max(allReviews.length - REVIEWS_PAGE_SIZE, 0);

  const locationLabel = [
    teacher?.city?.name || teacher?.city,
    teacher?.area,
  ]
    .filter(Boolean)
    .join(', ');

  const teachingModeLabel = teacher?.teaching_mode
    ? teacher.teaching_mode.charAt(0).toUpperCase() + teacher.teaching_mode.slice(1)
    : 'Both';

  const sessionTypeLabel =
    teacher?.session_type === 'one_to_one'
      ? 'One-to-One'
      : teacher?.session_type === 'group'
        ? 'Group'
        : 'Flexible';

  const hasReviews = totalReviewCount > 0 && allReviews.length > 0;
  const studentCanInteractWithReviews =
    userRole === 'student' &&
    !!reviewEligibility &&
    (reviewEligibility.can_review || !!reviewEligibility.existing_review);
  // Hide the whole ratings & reviews block for teachers with no reviews,
  // unless the logged-in student is eligible to write the first one.
  const showReviewsSection = hasReviews || studentCanInteractWithReviews;

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar backgroundColor="#10284C" barStyle="light-content" translucent={false} />
        <SafeAreaView style={styles.headerSafeArea} edges={['top']} />
        <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E88E5" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor="#10284C" barStyle="light-content" translucent={false} />
      <SafeAreaView style={styles.headerSafeArea} edges={['top']} />
      <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* Profile hero */}
          <View style={styles.header}>
            <View style={styles.headerGlow} />
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.profileHero}>
              {teacher?.profile_picture ? (
                <Image source={{uri: teacher.profile_picture}} style={styles.profileImageLarge} />
              ) : (
                <View style={styles.profileImageLargePlaceholder}>
                  <Text style={styles.profileImageLargeText}>
                    {teacher?.full_name?.charAt(0).toUpperCase() || 'T'}
                  </Text>
                </View>
              )}
              <Text style={styles.profileName}>{teacher?.full_name || 'Teacher'}</Text>
              <Text style={styles.profileSubtitle} numberOfLines={2}>
                {teacher?.highest_qualification || teacher?.qualification || 'Professional Tutor'}
              </Text>

              {hasReviews ? (
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={15} color="#FFC44D" />
                  <Text style={styles.ratingPillText}>{displayRating.toFixed(1)}</Text>
                  <Text style={styles.ratingPillDot}>•</Text>
                  <Text style={styles.ratingPillMeta}>
                    {totalReviewCount} {totalReviewCount === 1 ? 'review' : 'reviews'}
                  </Text>
                </View>
              ) : null}

              {locationLabel ? (
                <View style={styles.locationPill}>
                  <Ionicons name="location-outline" size={14} color="#C9D6E6" />
                  <Text style={styles.locationPillText} numberOfLines={1}>{locationLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.formContainer}>
            {/* Primary actions */}
            <View style={styles.actionStack}>
              <TouchableOpacity
                style={[styles.chatButton, chatLoading && styles.buttonDisabled]}
                onPress={handleStartChat}
                disabled={chatLoading}
                activeOpacity={0.9}>
                {chatLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
                    <Text style={styles.chatButtonText}>Message Teacher</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.enrollButton}
                onPress={handleOpenEnrollment}
                activeOpacity={0.9}>
                <Ionicons name="school-outline" size={20} color="#10284C" />
                <Text style={styles.enrollButtonText}>Enroll Now</Text>
              </TouchableOpacity>
            </View>

            {/* Quick info */}
            <View style={styles.infoGrid}>
              <View style={styles.infoTile}>
                <Ionicons name="briefcase-outline" size={18} color="#10284C" />
                <Text style={styles.infoTileValue}>{teacher?.experience_years || 0}+</Text>
                <Text style={styles.infoTileLabel}>Years</Text>
              </View>
              <View style={styles.infoTile}>
                <Ionicons name="people-outline" size={18} color="#10284C" />
                <Text style={styles.infoTileValue}>{teacher?.total_students || 0}</Text>
                <Text style={styles.infoTileLabel}>Students</Text>
              </View>
              <View style={styles.infoTile}>
                <Ionicons name="videocam-outline" size={18} color="#10284C" />
                <Text style={styles.infoTileValue}>{teachingModeLabel}</Text>
                <Text style={styles.infoTileLabel}>Mode</Text>
              </View>
              <View style={styles.infoTile}>
                <Ionicons name="time-outline" size={18} color="#10284C" />
                <Text style={styles.infoTileValue}>{sessionTypeLabel}</Text>
                <Text style={styles.infoTileLabel}>Session</Text>
              </View>
            </View>

            {(teacher?.highest_qualification || teacher?.qualification) && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="school-outline" size={18} color="#10284C" />
                  <Text style={styles.sectionTitle}>Qualification</Text>
                </View>
                <Text style={styles.sectionBody}>
                  {teacher.highest_qualification || teacher.qualification}
                  {teacher.institute ? ` — ${teacher.institute}` : ''}
                </Text>
              </View>
            )}

            {teacher?.bio ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person-circle-outline" size={18} color="#10284C" />
                  <Text style={styles.sectionTitle}>About</Text>
                </View>
                <Text style={styles.sectionBody}>{teacher.bio}</Text>
              </View>
            ) : null}

            {teacher?.subjects && teacher.subjects.length > 0 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="book-outline" size={18} color="#10284C" />
                  <Text style={styles.sectionTitle}>Subjects</Text>
                </View>
                <View style={styles.subjectsWrap}>
                  {teacher.subjects.map((s: any, idx: number) => (
                    <View key={idx} style={styles.subjectPill}>
                      <Text style={styles.subjectPillText}>
                        {s.subject?.name || s.name}
                        {s.level ? ` · ${s.level.name}` : ''}
                      </Text>
                      {s.fee_per_month ? (
                        <Text style={styles.subjectPillFee}>Rs {s.fee_per_month}/mo</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {teacher?.availability && teacher.availability.length > 0 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar-outline" size={18} color="#10284C" />
                  <Text style={styles.sectionTitle}>Availability</Text>
                </View>
                <View style={styles.availabilityGrid}>
                  {teacher.availability.map((slot: any, idx: number) => (
                    <View key={idx} style={styles.availabilityPill}>
                      <Text style={styles.availabilityDayText}>{getDayName(slot.day_of_week)}</Text>
                      <Text style={styles.availabilityTimeText}>
                        {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Map */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="map-outline" size={18} color="#10284C" />
                <Text style={styles.sectionTitle}>Location</Text>
              </View>
              {hasLocation ? (
                <>
                  <TouchableOpacity style={styles.mapPreviewCard} activeOpacity={0.92} onPress={handleMapOpen}>
                    <WebView
                      source={{uri: mapUrl}}
                      style={styles.mapPreview}
                      scrollEnabled={false}
                      pointerEvents="none"
                    />
                    <View style={styles.mapPinOverlay}>
                      <View style={styles.mapPinBubble}>
                        <Ionicons name="location" size={22} color="#FFFFFF" />
                      </View>
                    </View>
                    <View style={styles.mapExpandBadge}>
                      <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                      <Text style={styles.mapExpandText}>Full map</Text>
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.mapAddress} numberOfLines={2}>
                    {locationLabel || 'Teacher location'}
                  </Text>
                  <View style={styles.mapActionRow}>
                    <TouchableOpacity style={styles.mapActionChip} onPress={handleMapOpen} activeOpacity={0.85}>
                      <Ionicons name="map-outline" size={16} color="#10284C" />
                      <Text style={styles.mapActionChipText}>Open map</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.mapActionChipPrimary} onPress={handleDirections} activeOpacity={0.85}>
                      <Ionicons name="navigate-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.mapActionChipPrimaryText}>Directions</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.mapEmptyCard}>
                  <Ionicons name="location-outline" size={32} color="#9FB3C8" />
                  <Text style={styles.mapEmptyTitle}>Location not shared</Text>
                  <Text style={styles.mapEmptySub}>This teacher has not added a map location yet.</Text>
                </View>
              )}
            </View>

            {/* Reviews */}
            {showReviewsSection ? (
            <View style={styles.reviewsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="star-outline" size={18} color="#10284C" />
                <Text style={styles.sectionTitle}>Ratings &amp; Reviews</Text>
              </View>

              {hasReviews ? (
              <View style={styles.reviewsSummaryCard}>
                <View style={styles.reviewsScoreCol}>
                  <Text style={styles.reviewsBigScore}>
                    {displayRating > 0 ? displayRating.toFixed(1) : '—'}
                  </Text>
                  <StarRating rating={displayRating} size={18} />
                  <Text style={styles.reviewsTotalLabel}>
                    {totalReviewCount} {totalReviewCount === 1 ? 'review' : 'reviews'}
                  </Text>
                </View>
                <View style={styles.reviewsBarsCol}>
                  {ratingBreakdown.map(row => (
                    <View key={row.star} style={styles.ratingBarRow}>
                      <Text style={styles.ratingBarStar}>{row.star}</Text>
                      <Ionicons name="star" size={11} color="#FFC44D" />
                      <View style={styles.ratingBarTrack}>
                        <View style={[styles.ratingBarFill, {width: `${row.percent}%`}]} />
                      </View>
                      <Text style={styles.ratingBarCount}>{row.count}</Text>
                    </View>
                  ))}
                </View>
              </View>
              ) : null}

              {userRole === 'student' && reviewEligibility ? (
                reviewEligibility.existing_review ? (
                  <View style={styles.reviewMineBox}>
                    <View style={styles.reviewMineHeader}>
                      <Ionicons name="checkmark-circle" size={16} color="#0B7A5B" />
                      <Text style={styles.reviewMineTitle}>Your review</Text>
                      <StarRating rating={reviewEligibility.existing_review.rating} size={14} />
                    </View>
                    {reviewEligibility.existing_review.feedback ? (
                      <Text style={styles.reviewMineFeedback}>
                        {reviewEligibility.existing_review.feedback}
                      </Text>
                    ) : null}
                  </View>
                ) : reviewEligibility.can_review ? (
                  <TouchableOpacity
                    style={styles.writeReviewButton}
                    onPress={() => setShowReviewModal(true)}
                    activeOpacity={0.85}>
                    <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.writeReviewText}>Write a review</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.reviewReasonBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#B7791F" />
                    <Text style={styles.reviewReasonText}>
                      {reviewEligibility.reason || 'Review not available yet.'}
                    </Text>
                  </View>
                )
              ) : null}

              {hasReviews ? (
                <View style={styles.reviewsList}>
                  {visibleReviews.map(review => (
                    <ReviewCard key={review.id} review={review} variant="profile" />
                  ))}
                  {hasMoreReviews ? (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={() => setShowAllReviews(prev => !prev)}
                      activeOpacity={0.85}>
                      <Text style={styles.loadMoreText}>
                        {showAllReviews
                          ? 'Show less'
                          : `Load more (${remainingReviews} more)`}
                      </Text>
                      <Ionicons
                        name={showAllReviews ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#10284C"
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Enrollment Modal */}
      <EnrollmentModal
        visible={showEnrollmentModal}
        subjects={subjects}
        selectedSubject={selectedSubject}
        loading={loadingTeacherSubjects}
        enrolling={loadingEnrollment}
        error={enrollmentError}
        onSelectSubject={handleSelectSubject}
        onConfirm={handleConfirmEnrollment}
        onClose={handleCloseModal}
      />

      {/* Write Review Modal */}
      <WriteReviewModal
        visible={showReviewModal}
        title={`Review ${teacher?.full_name || 'Teacher'}`}
        subtitle="Your rating helps other students choose the right tutor."
        submitting={submittingReview}
        onSubmit={handleSubmitReview}
        onClose={() => setShowReviewModal(false)}
      />

      <Modal
        visible={showMapModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.fullscreenContainer}>
          <StatusBar backgroundColor="#0B1E33" barStyle="light-content" />
          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={handleMapClose} style={styles.mapHeaderButton}>
              <Text style={styles.mapHeaderText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.mapHeaderTitle}>Teacher Location</Text>
            <View style={styles.mapHeaderSpacer} />
          </View>

          <View style={styles.mapSearchBar}>
            <View style={styles.mapSearchInputWrap}>
              <Text style={styles.mapSearchIcon}>🔍</Text>
              <TextInput
                style={styles.mapSearchInput}
                value={mapSearchQuery}
                onChangeText={setMapSearchQuery}
                placeholder="Search location"
                placeholderTextColor="rgba(255,255,255,0.6)"
              />
            </View>
            <TouchableOpacity
              style={[styles.mapSearchButton, isSearchingMap && styles.buttonDisabled]}
              onPress={handleMapSearch}
              disabled={isSearchingMap}
            >
              {isSearchingMap ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.mapSearchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

          {hasLocation ? (
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: mapHtml }}
              style={styles.fullscreenMap}
            />
          ) : null}

          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.mapControlButton} onPress={() => handleZoom(1)}>
              <Text style={styles.mapControlText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapControlButton} onPress={() => handleZoom(-1)}>
              <Text style={styles.mapControlText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapControlButton} onPress={handleRecenter}>
              <Text style={styles.mapControlText}>Center</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapActionBar}>
            <TouchableOpacity style={styles.mapActionButton} onPress={toggleMapType}>
              <Text style={styles.mapActionText}>
                {mapType === 'osm' ? 'Satellite' : 'Streets'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapActionButton} onPress={handleDirections}>
              <Text style={styles.mapActionText}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapActionButton} onPress={handleShare}>
              <Text style={styles.mapActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  headerSafeArea: {
    backgroundColor: '#10284C',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },

  scrollContent: {
    paddingBottom: 32,
    backgroundColor: '#F4F7FB',
  },

  // Header / profile hero
  header: {
    backgroundColor: '#0B1B33',
    paddingTop: 12,
    paddingBottom: 36,
    paddingHorizontal: 20,
    overflow: 'hidden',
    alignItems: 'center',
  },
  headerGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(70,217,177,0.15)',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  profileHero: {
    alignItems: 'center',
    marginTop: 36,
    width: '100%',
  },
  profileImageLarge: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  profileImageLargePlaceholder: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#174A78',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#46D9B1',
  },
  profileImageLargeText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  profileSubtitle: {
    fontSize: 14,
    color: '#C9D6E6',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 14,
  },
  ratingPillText: {color: '#FFFFFF', fontSize: 14, fontWeight: '800'},
  ratingPillDot: {color: 'rgba(255,255,255,0.5)', fontSize: 12},
  ratingPillMeta: {color: '#C9D6E6', fontSize: 12, fontWeight: '600'},
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    maxWidth: '90%',
  },
  locationPillText: {color: '#C9D6E6', fontSize: 13},

  // Form body
  formContainer: {
    backgroundColor: '#F4F7FB',
    marginTop: -20,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  actionStack: {gap: 10, marginBottom: 16},
  chatButton: {
    backgroundColor: '#10284C',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#10284C',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 4,
  },
  chatButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '800'},
  enrollButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#D9E3F0',
  },
  enrollButtonText: {color: '#10284C', fontSize: 15, fontWeight: '800'},
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  infoTile: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EEF5',
    alignItems: 'flex-start',
    gap: 6,
  },
  infoTileValue: {fontSize: 16, fontWeight: '900', color: '#10284C', marginTop: 4},
  infoTileLabel: {fontSize: 11, color: '#6B7C90', fontWeight: '700'},
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EEF5',
  },
  sectionHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12},
  sectionTitle: {fontSize: 16, fontWeight: '900', color: '#10284C'},
  sectionBody: {fontSize: 14, color: '#4A5568', lineHeight: 22},
  subjectsWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  subjectPill: {
    backgroundColor: '#F0F7FF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D3E4FF',
    minWidth: '45%',
    flexGrow: 1,
  },
  subjectPillText: {fontSize: 13, fontWeight: '800', color: '#1D4A87'},
  subjectPillFee: {fontSize: 11, color: '#6B7C90', marginTop: 4, fontWeight: '600'},
  availabilityGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  availabilityPill: {
    backgroundColor: '#F7FAFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E1ECF9',
    minWidth: '45%',
    flexGrow: 1,
  },
  availabilityDayText: {fontSize: 13, fontWeight: '800', color: '#324054'},
  availabilityTimeText: {fontSize: 12, color: '#6B7C90', marginTop: 4},

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E9F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#10284C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#5F6B7A',
  },

  // Details Section
  detailsSection: {
    marginBottom: 24,
  },
  highlightRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: '#0E6BA8',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    shadowColor: '#0E6BA8',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  highlightCardAlt: {
    flex: 1,
    backgroundColor: '#F3F7FF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D7E5FF',
  },
  highlightLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  highlightValue: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 8,
  },
  highlightHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
  },
  highlightLabelDark: {
    fontSize: 12,
    color: '#5B6B7C',
    fontWeight: '600',
  },
  highlightValueDark: {
    fontSize: 20,
    color: '#10284C',
    fontWeight: '700',
    marginTop: 8,
  },
  highlightHintDark: {
    fontSize: 12,
    color: '#7C8BA1',
    marginTop: 6,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#1E2A3A',
    fontWeight: '600',
  },
  detailBox: {
    borderWidth: 1,
    borderColor: '#E4ECF6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F9FBFF',
  },
  detailValue: {
    fontSize: 14,
    color: '#3A4757',
    lineHeight: 21,
  },

  // Subjects
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectChip: {
    backgroundColor: '#EEF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D3E4FF',
  },
  subjectChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4A87',
  },
  subjectFee: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  // Availability
  availabilityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  availabilitySlot: {
    backgroundColor: '#F7FAFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E1ECF9',
  },
  availabilityDay: {
    fontSize: 13,
    fontWeight: '600',
    color: '#324155',
  },
  availabilityTime: {
    fontSize: 12,
    color: '#6B7A90',
  },

  // Buttons
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  mapPreviewCard: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 200,
    backgroundColor: '#E8EEF5',
    position: 'relative',
  },
  mapPreview: {width: '100%', height: '100%'},
  mapPinOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  mapPinBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10284C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  mapExpandBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16,40,76,0.85)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapExpandText: {color: '#FFFFFF', fontSize: 11, fontWeight: '700'},
  mapAddress: {fontSize: 13, color: '#4A5568', marginTop: 12, lineHeight: 19, fontWeight: '600'},
  mapActionRow: {flexDirection: 'row', gap: 10, marginTop: 12},
  mapActionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F4FA',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D9E3F0',
  },
  mapActionChipText: {color: '#10284C', fontSize: 13, fontWeight: '800'},
  mapActionChipPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10284C',
    borderRadius: 12,
    paddingVertical: 12,
  },
  mapActionChipPrimaryText: {color: '#FFFFFF', fontSize: 13, fontWeight: '800'},
  mapEmptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#F7FAFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4ECF6',
  },
  mapEmptyTitle: {fontSize: 15, fontWeight: '800', color: '#10284C', marginTop: 10},
  mapEmptySub: {fontSize: 12, color: '#6B7C90', marginTop: 6, textAlign: 'center', paddingHorizontal: 20},
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#0B1E33',
  },
  mapHeader: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B1E33',
  },
  mapHeaderButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  mapHeaderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  mapHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  mapHeaderSpacer: {
    width: 54,
  },
  mapSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 8,
  },
  mapSearchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mapSearchIcon: {
    marginRight: 6,
  },
  mapSearchInput: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
  },
  mapSearchButton: {
    backgroundColor: '#1E88E5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  mapSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fullscreenMap: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 14,
    top: 80,
    gap: 8,
  },
  mapControlButton: {
    backgroundColor: 'rgba(12,28,47,0.9)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  mapControlText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapActionBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 20,
    flexDirection: 'row',
    gap: 10,
  },
  mapActionButton: {
    flex: 1,
    backgroundColor: '#10284C',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  mapActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonContentOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  outlineButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Reviews
  reviewsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EEF5',
  },
  reviewsSummaryCard: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#F7FAFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4ECF6',
    marginBottom: 16,
  },
  reviewsScoreCol: {alignItems: 'center', justifyContent: 'center', minWidth: 96},
  reviewsBigScore: {fontSize: 42, fontWeight: '900', color: '#10284C', lineHeight: 46},
  reviewsTotalLabel: {fontSize: 11, color: '#6B7C90', fontWeight: '700', marginTop: 6},
  reviewsBarsCol: {flex: 1, justifyContent: 'center', gap: 5},
  ratingBarRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  ratingBarStar: {width: 10, fontSize: 12, fontWeight: '800', color: '#10284C', textAlign: 'right'},
  ratingBarTrack: {flex: 1, height: 8, backgroundColor: '#E8EEF5', borderRadius: 999, overflow: 'hidden'},
  ratingBarFill: {height: '100%', backgroundColor: '#FFC44D', borderRadius: 999},
  ratingBarCount: {width: 18, fontSize: 11, color: '#90A0B3', fontWeight: '700', textAlign: 'right'},
  writeReviewButton: {
    backgroundColor: '#0B1B33',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  writeReviewText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  reviewMineBox: {
    backgroundColor: '#EAF7F1',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CDEBDF',
    marginBottom: 16,
  },
  reviewMineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewMineTitle: {
    flex: 1,
    color: '#0B7A5B',
    fontSize: 13,
    fontWeight: '800',
  },
  reviewMineFeedback: {
    color: '#33514A',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  reviewReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF6E7',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F6E3BC',
    marginBottom: 16,
  },
  reviewReasonText: {
    flex: 1,
    color: '#8A6A1F',
    fontSize: 12,
    lineHeight: 18,
  },
  reviewsList: {marginTop: 4},
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: '#F0F4FA',
    borderWidth: 1,
    borderColor: '#D9E3F0',
  },
  loadMoreText: {fontSize: 14, fontWeight: '800', color: '#10284C'},
  reviewsEmptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#F7FAFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4ECF6',
  },
  reviewsEmptyTitle: {fontSize: 15, fontWeight: '800', color: '#10284C', marginTop: 10},
  reviewsEmptySub: {
    fontSize: 12,
    color: '#6B7C90',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});

// ============================================================================
// Enrollment Modal Component
// ============================================================================

interface EnrollmentModalProps {
  visible: boolean;
  subjects: TeacherSubject[];
  selectedSubject: TeacherSubject | null;
  loading: boolean;
  enrolling: boolean;
  error: string | null;
  onSelectSubject: (subject: TeacherSubject) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  visible,
  subjects,
  selectedSubject,
  loading,
  enrolling,
  error,
  onSelectSubject,
  onConfirm,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={enrollmentModalStyles.container}>
        <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
        
        {/* Overlay */}
        <TouchableOpacity
          style={enrollmentModalStyles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Modal Content */}
        <View style={enrollmentModalStyles.modalContent}>
          {/* Header */}
          <View style={enrollmentModalStyles.header}>
            <Text style={enrollmentModalStyles.headerTitle}>
              Select Subject to Enroll
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={enrollmentModalStyles.closeButton}
            >
              <Text style={enrollmentModalStyles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error && (
            <View style={enrollmentModalStyles.errorContainer}>
              <Text style={enrollmentModalStyles.errorText}>{error}</Text>
            </View>
          )}

          {/* Loading State */}
          {loading ? (
            <View style={enrollmentModalStyles.loadingContainer}>
              <ActivityIndicator size="large" color="#28a745" />
              <Text style={enrollmentModalStyles.loadingText}>Loading subjects...</Text>
            </View>
          ) : subjects.length === 0 ? (
            <View style={enrollmentModalStyles.emptyContainer}>
              <Text style={enrollmentModalStyles.emptyText}>
                No subjects available at this time
              </Text>
            </View>
          ) : (
            <>
              {/* Subjects List */}
              <FlatList
                data={subjects}
                keyExtractor={(item) => `${item.id}`}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      enrollmentModalStyles.subjectItem,
                      selectedSubject?.id === item.id &&
                        enrollmentModalStyles.subjectItemSelected,
                    ]}
                    onPress={() => onSelectSubject(item)}
                  >
                    <View style={enrollmentModalStyles.subjectItemContent}>
                      <Text style={enrollmentModalStyles.subjectName}>
                        {item.subject.name}
                      </Text>
                      {item.subject.description && (
                        <Text style={enrollmentModalStyles.subjectDescription}>
                          {item.subject.description}
                        </Text>
                      )}
                      {item.level_id && (
                        <Text style={enrollmentModalStyles.subjectLevel}>
                          Level ID: {item.level_id}
                        </Text>
                      )}
                    </View>
                    <View style={enrollmentModalStyles.subjectFeeContainer}>
                      <Text style={enrollmentModalStyles.subjectFeeLabel}>Fee</Text>
                      <Text style={enrollmentModalStyles.subjectFee}>
                        Rs. {item.fee_per_month}
                      </Text>
                      <Text style={enrollmentModalStyles.subjectFeePerMonth}>/month</Text>
                    </View>
                    {selectedSubject?.id === item.id && (
                      <View style={enrollmentModalStyles.checkmark}>
                        <Text style={enrollmentModalStyles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />

              {/* Selected Subject Summary */}
              {selectedSubject && (
                <View style={enrollmentModalStyles.summaryContainer}>
                  <Text style={enrollmentModalStyles.summaryLabel}>Selected:</Text>
                  <Text style={enrollmentModalStyles.summaryValue}>
                    {selectedSubject.subject.name}
                  </Text>
                  <View style={enrollmentModalStyles.summaryFee}>
                    <Text style={enrollmentModalStyles.summaryFeeLabel}>
                      Monthly Fee:
                    </Text>
                    <Text style={enrollmentModalStyles.summaryFeeValue}>
                      Rs. {selectedSubject.fee_per_month}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Action Buttons */}
          <View style={enrollmentModalStyles.buttonContainer}>
            <TouchableOpacity
              style={enrollmentModalStyles.cancelButton}
              onPress={onClose}
            >
              <Text style={enrollmentModalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                enrollmentModalStyles.confirmButton,
                (!selectedSubject || enrolling) &&
                  enrollmentModalStyles.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={!selectedSubject || enrolling}
            >
              {enrolling ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={enrollmentModalStyles.confirmButtonText}>
                  Confirm Enrollment
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const enrollmentModalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666666',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  loadingContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  subjectItemSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#28a745',
  },
  subjectItemContent: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  subjectDescription: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  subjectLevel: {
    fontSize: 12,
    color: '#999999',
  },
  subjectFeeContainer: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  subjectFeeLabel: {
    fontSize: 11,
    color: '#999999',
  },
  subjectFee: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  subjectFeePerMonth: {
    fontSize: 11,
    color: '#999999',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  summaryFee: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#28a745',
  },
  summaryFeeLabel: {
    fontSize: 13,
    color: '#666666',
  },
  summaryFeeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#28a745',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
});

export default TeacherDetailScreen;
