import React, {useState, useEffect, useCallback, useRef} from 'react';
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
  Dimensions,
  Modal,
  Image,
  PermissionsAndroid,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ProfilePictureUpload} from '../upload/ProfilePictureUpload';
import {TeacherDocumentUpload} from '../upload/TeacherDocumentUpload';
import {WebView} from 'react-native-webview';
import Geolocation from 'react-native-geolocation-service';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  createTeacherProfile,
  getMyTeacherProfile,
  completeTeacherProfile,
  updateTeacherProfile,
  addTeacherSubjects,
  setTeacherAvailability,
} from '../../api/teacher';
import {fetchAllLookupData, getDayName, createCity, createSubject} from '../../api/lookup';
import type {
  TeacherDetailResponse,
  CompleteProfileRequest,
  TeachingMode,
  SessionType,
  Gender,
  AddSubjectItem,
  AvailabilitySlot,
} from '../../api/teacher/types';
import type {Subject, City, EducationLevel, LookupData} from '../../api/lookup/types';

const {width} = Dimensions.get('window');

// ==================== Types ====================

interface TeacherProfileWizardProps {
  userId: number;
  initialFullName?: string;
  onComplete: () => void;
  onBack?: () => void;
}

interface FormData {
  // Step 1: Basic Info
  full_name: string;
  phone: string;
  gender: Gender | '';
  date_of_birth: string;
  profile_picture: string;

  // Step 2: Professional Info
  highest_qualification: string;
  institute: string;
  experience_years: string;
  bio: string;

  // Step 3: Location & Teaching
  city_id: number | null;
  city_name: string; // For custom city input
  area: string;
  latitude: number | null;
  longitude: number | null;
  teaching_mode: TeachingMode;
  session_type: SessionType;
  physical_teaching_radius: string;

  // Step 4: Documents
  cnic: string;
  cnic_front_image: string;
  cnic_back_image: string;
  degree_certificate: string;
  other_certificate: string;
}

interface SubjectSelection {
  subject_id: number | null; // null if custom subject
  subject_name: string; // For custom subject input
  level_id: number | null;
  level_name: string; // For custom level input
  fee_per_month: string;
}

interface AvailabilitySelection {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

// ==================== Constants ====================

const STEPS = [
  {id: 1, title: 'Basic Info', icon: '👤'},
  {id: 2, title: 'Professional', icon: '🎓'},
  {id: 3, title: 'Location', icon: '📍'},
  {id: 4, title: 'Documents', icon: '📄'},
  {id: 5, title: 'Subjects', icon: '📚'},
  {id: 6, title: 'Availability', icon: '🗓️'},
];

const GENDER_OPTIONS: {value: Gender; label: string}[] = [
  {value: 'male', label: 'Male'},
  {value: 'female', label: 'Female'},
  {value: 'other', label: 'Other'},
];

const TEACHING_MODE_OPTIONS: {value: TeachingMode; label: string}[] = [
  {value: 'online', label: 'Online Only'},
  {value: 'physical', label: 'Physical Only'},
  {value: 'both', label: 'Both'},
];

const SESSION_TYPE_OPTIONS: {value: SessionType; label: string}[] = [
  {value: 'one_to_one', label: 'One-to-One'},
  {value: 'group', label: 'Group Sessions'},
  {value: 'both', label: 'Both'},
];

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00',
];

// ==================== Component ====================

const TeacherProfileWizard: React.FC<TeacherProfileWizardProps> = ({
  userId,
  initialFullName = '',
  onComplete,
  onBack,
}) => {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<TeacherDetailResponse | null>(null);
  const [lookupData, setLookupData] = useState<LookupData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollView>(null);
  const shouldScrollToEnd = useRef(false);

  // Form data
  const [formData, setFormData] = useState<FormData>({
    full_name: initialFullName.trim(),
    phone: '',
    gender: '',
    date_of_birth: '',
    profile_picture: '',
    highest_qualification: '',
    institute: '',
    experience_years: '',
    bio: '',
    city_id: null,
    city_name: '',
    area: '',
    latitude: null,
    longitude: null,
    teaching_mode: 'both',
    session_type: 'both',
    physical_teaching_radius: '',
    cnic: '',
    cnic_front_image: '',
    cnic_back_image: '',
    degree_certificate: '',
    other_certificate: '',
  });

  // Subjects selection
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectSelection[]>([]);

  // Availability selection
  const [selectedAvailability, setSelectedAvailability] = useState<AvailabilitySelection[]>([]);

  // Add new city/subject modals
  const [showAddCityModal, setShowAddCityModal] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newCityProvince, setNewCityProvince] = useState('');
  const [isCityFocused, setIsCityFocused] = useState(false);
  
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectIndex, setNewSubjectIndex] = useState<number | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCategory, setNewSubjectCategory] = useState('');
  const [focusedSubjectIndex, setFocusedSubjectIndex] = useState<number | null>(null);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isFetchingCurrentLocation, setIsFetchingCurrentLocation] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [isCreatingItem, setIsCreatingItem] = useState(false);

  // ==================== Effects ====================

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({y: 0, animated: false});
  }, [currentStep]);


  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load lookup data
      const lookup = await fetchAllLookupData();
      setLookupData(lookup);

      // Try to load existing profile
      try {
        const profile = await getMyTeacherProfile();
        setTeacherProfile(profile);
        populateFormFromProfile(profile);
      } catch (err) {
        // Profile doesn't exist yet, that's okay
        console.log('[WIZARD] No existing profile found');
      }
    } catch (error: any) {
      console.error('[WIZARD] Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const populateFormFromProfile = (profile: TeacherDetailResponse) => {
    setFormData({
      full_name: profile.full_name || initialFullName.trim(),
      phone: profile.phone || '',
      gender: (profile.gender as Gender) || '',
      date_of_birth: profile.date_of_birth || '',
      profile_picture: profile.profile_picture || '',
      highest_qualification: profile.highest_qualification || '',
      institute: profile.institute || '',
      experience_years: profile.experience_years?.toString() || '',
      bio: profile.bio || '',
      city_id: profile.city_id,
      city_name: profile.city?.name || '',
      area: profile.area || '',
      latitude: profile.latitude ?? null,
      longitude: profile.longitude ?? null,
      teaching_mode: profile.teaching_mode || 'both',
      session_type: profile.session_type || 'both',
      physical_teaching_radius: profile.physical_teaching_radius?.toString() || '',
      cnic: profile.cnic || '',
      cnic_front_image: profile.cnic_image || '', // Backend uses cnic_image
      cnic_back_image: profile.cnic_back_image || '',
      degree_certificate: profile.degree_certificate || '',
      other_certificate: '',
    });

    // Populate subjects
    if (profile.subjects && profile.subjects.length > 0) {
      setSelectedSubjects(
        profile.subjects.map(s => ({
          subject_id: s.subject_id,
          subject_name: s.subject?.name || '',
          level_id: s.level_id,
          level_name: s.level?.name || '',
          fee_per_month: s.fee_per_month?.toString() || '',
        })),
      );
    }

    // Populate availability
    if (profile.availability && profile.availability.length > 0) {
      setSelectedAvailability(
        profile.availability.map(a => ({
          day_of_week: a.day_of_week,
          start_time: a.start_time,
          end_time: a.end_time,
        })),
      );
    }
  };

  // ==================== Validation ====================

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic Info
        if (!formData.full_name.trim()) {
          newErrors.full_name = 'Full name is required';
        }
        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        }
        if (!formData.profile_picture.trim()) {
          newErrors.profile_picture = 'Profile picture URL is required';
        }
        break;

      case 2: // Professional Info
        if (!formData.highest_qualification.trim()) {
          newErrors.highest_qualification = 'Qualification is required';
        }
        if (!formData.institute.trim()) {
          newErrors.institute = 'Institute is required';
        }
        if (!formData.experience_years.trim()) {
          newErrors.experience_years = 'Experience is required';
        } else if (isNaN(Number(formData.experience_years)) || Number(formData.experience_years) < 0) {
          newErrors.experience_years = 'Invalid experience years';
        }
        if (!formData.bio.trim()) {
          newErrors.bio = 'Bio is required';
        } else if (formData.bio.trim().length < 10) {
          newErrors.bio = 'Bio must be at least 10 characters';
        }
        break;

      case 3: // Location
        if (!formData.city_name.trim() && !formData.city_id) {
          newErrors.city_name = 'City is required';
        }
        if (!formData.latitude || !formData.longitude) {
          newErrors.location = 'Please pin your location on the map';
        }
        break;

      case 4: // Documents
        if (!formData.cnic_front_image.trim()) {
          newErrors.cnic_front_image = 'CNIC front image is required';
        }
        if (!formData.cnic_back_image.trim()) {
          newErrors.cnic_back_image = 'CNIC back image is required';
        }
        if (!formData.cnic.trim()) {
          newErrors.cnic = 'CNIC number is required';
        }
        if (!formData.degree_certificate.trim()) {
          newErrors.degree_certificate = 'Degree certificate is required';
        }
        break;

      case 5: // Subjects
        if (selectedSubjects.length === 0) {
          newErrors.subjects = 'Please add at least one subject';
        } else {
          // Check if all subjects have names
          const hasEmptySubject = selectedSubjects.some(s => !s.subject_name.trim());
          if (hasEmptySubject) {
            newErrors.subjects = 'Please enter a name for all subjects';
          }
        }
        break;

      case 6: // Availability
        if (selectedAvailability.length === 0) {
          newErrors.availability = 'Please set at least one availability slot';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== Navigation ====================

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleSaveAndSubmit = async () => {
    if (!validateStep(currentStep)) return;

    // Find city_id from typed city_name if not already set
    let cityIdToUse = formData.city_id;
    if (!cityIdToUse && formData.city_name) {
      const cityLower = formData.city_name.toLowerCase().trim();
      // Use partial/substring matching (case-insensitive)
      const matchingCity = lookupData?.cities.find(
        c => c.name.toLowerCase().includes(cityLower) || cityLower.includes(c.name.toLowerCase())
      );
      if (matchingCity) {
        cityIdToUse = matchingCity.id;
      }
    }

    // Validate that we have a valid city
    if (!cityIdToUse) {
      Alert.alert(
        'City Not Found',
        `City "${formData.city_name}" not found in the system. Please select a city from the suggestions above or check the spelling.`,
      );
      return;
    }

    // Validate subjects have valid IDs or find matching ones
    const validatedSubjects = selectedSubjects.map(s => {
      let subjectId = s.subject_id;
      let levelId = s.level_id;

      // Try to find matching subject by name if no ID (partial matching)
      if (!subjectId && s.subject_name) {
        const subjLower = s.subject_name.toLowerCase().trim();
        const matchingSubject = lookupData?.subjects.find(
          sub => sub.name.toLowerCase().includes(subjLower) || subjLower.includes(sub.name.toLowerCase())
        );
        if (matchingSubject) {
          subjectId = matchingSubject.id;
        }
      }

      // Try to find matching level by name if no ID (partial matching)
      if (!levelId && s.level_name) {
        const levelLower = s.level_name.toLowerCase().trim();
        const matchingLevel = lookupData?.educationLevels.find(
          lev => lev.name.toLowerCase().includes(levelLower) || levelLower.includes(lev.name.toLowerCase())
        );
        if (matchingLevel) {
          levelId = matchingLevel.id;
        }
      }

      return {
        ...s,
        subject_id: subjectId,
        level_id: levelId,
      };
    });

    // Check if any subjects don't have valid IDs
    const invalidSubjects = validatedSubjects.filter(s => !s.subject_id);
    if (invalidSubjects.length > 0) {
      const invalidNames = invalidSubjects
        .filter(s => s.subject_name)
        .map(s => `"${s.subject_name}"`)
        .join(', ');
      Alert.alert(
        'Subjects Not Found',
        `${invalidNames} not found in the system. Please select from the quick-select suggestions or check the spelling.`,
      );
      return;
    }

    setIsSaving(true);
    try {
      // Step 1: Complete profile
      const profileData: CompleteProfileRequest = {
        full_name: formData.full_name.trim(),
        profile_picture: formData.profile_picture.trim(),
        gender: formData.gender as Gender || undefined,
        date_of_birth: formatDateForAPI(formData.date_of_birth),
        phone: formData.phone.trim(),
        highest_qualification: formData.highest_qualification.trim(),
        institute: formData.institute.trim(),
        experience_years: Number(formData.experience_years),
        teaching_mode: formData.teaching_mode,
        bio: formData.bio.trim(),
        session_type: formData.session_type,
        city_id: cityIdToUse,
        area: formData.area.trim() || undefined,
        latitude: formData.latitude ?? undefined,
        longitude: formData.longitude ?? undefined,
        physical_teaching_radius: formData.physical_teaching_radius 
          ? Number(formData.physical_teaching_radius) 
          : undefined,
        cnic: formData.cnic.trim() || undefined,
        cnic_image: formData.cnic_front_image.trim() || undefined, // Use front CNIC image as primary
        degree_certificate: formData.degree_certificate.trim() || undefined,
      };

      let teacherId = teacherProfile?.teacher_id;
      if (!teacherId) {
        const createdProfile = await createTeacherProfile({
          user_id: userId,
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          teaching_mode: formData.teaching_mode,
        });
        teacherId = createdProfile.teacher_id;
      }

      if (!teacherId) {
        throw new Error('Teacher profile could not be created. Please try again.');
      }

      const updatedProfile = teacherProfile
        ? await updateTeacherProfile(teacherId, profileData)
        : await completeTeacherProfile(teacherId, profileData);

      // Step 2: Add subjects
      if (validatedSubjects.length > 0) {
        const subjectsData: AddSubjectItem[] = validatedSubjects.map(s => ({
          subject_id: s.subject_id!,
          level_id: s.level_id || undefined,
          fee_per_month: s.fee_per_month ? Number(s.fee_per_month) : undefined,
        }));

        await addTeacherSubjects(updatedProfile.teacher_id, {subjects: subjectsData});
      }

      // Step 3: Set availability
      if (selectedAvailability.length > 0) {
        const availabilityData: AvailabilitySlot[] = selectedAvailability.map(a => ({
          day_of_week: a.day_of_week,
          start_time: a.start_time,
          end_time: a.end_time,
        }));

        await setTeacherAvailability(updatedProfile.teacher_id, {
          availability: availabilityData,
        });
      }

      Alert.alert(
        'Success',
        'Your profile has been submitted for approval. You will be notified once it is reviewed.',
        [{text: 'OK', onPress: onComplete}],
      );
    } catch (error: any) {
      console.error('[WIZARD] Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== Add New City/Subject Handlers ====================

  const handleAddNewCity = async () => {
    if (!newCityName.trim()) {
      Alert.alert('Error', 'Please enter a city name');
      return;
    }

    setIsCreatingItem(true);
    try {
      const newCity = await createCity({
        name: newCityName.trim(),
        province: newCityProvince.trim() || undefined,
        country: 'Pakistan',
      });

      // Use the new city
      updateFormData('city_name', newCity.name);
      updateFormData('city_id', newCity.id);
      
      // Refresh lookup data to include new city
      const updatedLookup = await fetchAllLookupData();
      setLookupData(updatedLookup);

      // Close modal and reset
      setShowAddCityModal(false);
      setNewCityName('');
      setNewCityProvince('');

      Alert.alert('Success', `"${newCity.name}" added and selected!`);
    } catch (error: any) {
      console.error('[WIZARD] Add city error:', error);
      Alert.alert('Error', error.message || 'Failed to add city. Please try again.');
    } finally {
      setIsCreatingItem(false);
    }
  };

  const handleAddNewSubject = async () => {
    if (newSubjectIndex === null) return;
    
    if (!newSubjectName.trim()) {
      Alert.alert('Error', 'Please enter a subject name');
      return;
    }

    setIsCreatingItem(true);
    try {
      const newSubject = await createSubject({
        name: newSubjectName.trim(),
        category: newSubjectCategory.trim() || undefined,
      });

      // Use the new subject
      updateSubject(newSubjectIndex, 'subject_name', newSubject.name);
      updateSubject(newSubjectIndex, 'subject_id', newSubject.id);
      
      // Refresh lookup data to include new subject
      const updatedLookup = await fetchAllLookupData();
      setLookupData(updatedLookup);

      // Close modal and reset
      setShowAddSubjectModal(false);
      setNewSubjectIndex(null);
      setNewSubjectName('');
      setNewSubjectCategory('');

      Alert.alert('Success', `"${newSubject.name}" added and selected!`);
    } catch (error: any) {
      console.error('[WIZARD] Add subject error:', error);
      Alert.alert('Error', error.message || 'Failed to add subject. Please try again.');
    } finally {
      setIsCreatingItem(false);
    }
  };

  // ==================== Date Format Helper ====================

  const formatDateForAPI = (dateStr: string): string | undefined => {
    if (!dateStr || !dateStr.trim()) return undefined;
    
    // Parse the date input (could be YYYY-M-D or YYYY-MM-DD or similar)
    const parts = dateStr.trim().split('-');
    if (parts.length !== 3) return dateStr; // Return as-is if format is unexpected
    
    const year = parts[0];
    const month = parts[1]?.padStart(2, '0');
    const day = parts[2]?.padStart(2, '0');
    
    // Validate year is 4 digits and reasonable
    if (!year || year.length !== 4 || isNaN(Number(year))) return dateStr;
    if (!month || isNaN(Number(month)) || Number(month) < 1 || Number(month) > 12) return dateStr;
    if (!day || isNaN(Number(day)) || Number(day) < 1 || Number(day) > 31) return dateStr;
    
    return `${year}-${month}-${day}`;
  };

  // ==================== Form Handlers ====================

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({...prev, [field]: value}));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addSubject = () => {
    setSelectedSubjects(prev => [
      ...prev,
      {subject_id: null, subject_name: '', level_id: null, level_name: '', fee_per_month: ''},
    ]);
    shouldScrollToEnd.current = true;
  };

  const handleContentSizeChange = useCallback(() => {
    if (shouldScrollToEnd.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({animated: true});
        shouldScrollToEnd.current = false;
      });
    }
  }, []);

  const updateSubject = (index: number, field: keyof SubjectSelection, value: any) => {
    setSelectedSubjects(prev => {
      const updated = [...prev];
      updated[index] = {...updated[index], [field]: value};
      return updated;
    });
  };

  const removeSubject = (index: number) => {
    setSelectedSubjects(prev => prev.filter((_, i) => i !== index));
  };

  const addAvailability = () => {
    setSelectedAvailability(prev => [
      ...prev,
      {day_of_week: 0, start_time: '09:00', end_time: '17:00'},
    ]);
  };

  const updateAvailability = (
    index: number,
    field: keyof AvailabilitySelection,
    value: any,
  ) => {
    setSelectedAvailability(prev => {
      const updated = [...prev];
      updated[index] = {...updated[index], [field]: value};
      return updated;
    });
  };

  const removeAvailability = (index: number) => {
    setSelectedAvailability(prev => prev.filter((_, i) => i !== index));
  };

  // ==================== Render Helpers ====================

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Image
          source={require('../../Asset/smartTutor.png')}
          style={styles.logoIcon}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>SmartTutor Connect</Text>
      </View>
      
      {/* Progress Bar Line */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {width: `${(currentStep / STEPS.length) * 100}%`},
          ]}
        />
      </View>
      
      {/* Step Icons */}
      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => (
          <View key={step.id} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= step.id && styles.stepCircleActive,
                currentStep === step.id && styles.stepCircleCurrent,
              ]}>
              <Text
                style={[
                  styles.stepIcon,
                  currentStep >= step.id && styles.stepIconActive,
                  currentStep === step.id && styles.stepIconCurrent,
                ]}>
                {step.icon}
              </Text>
            </View>
            <Text
              style={[
                styles.stepTitle,
                currentStep >= step.id && styles.stepTitleActive,
                currentStep === step.id && styles.stepTitleCurrent,
              ]}
              numberOfLines={2}>
              {step.title}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderInput = (
    label: string,
    field: keyof FormData,
    placeholder: string,
    options?: {
      keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
      multiline?: boolean;
      numberOfLines?: number;
      required?: boolean;
    },
  ) => {
    const {keyboardType = 'default', multiline = false, numberOfLines = 1, required = false} =
      options || {};

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            errors[field] && styles.inputError,
          ]}
          value={String(formData[field] || '')}
          onChangeText={value => updateFormData(field, value)}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
      </View>
    );
  };

  const renderSelector = <T extends string>(
    label: string,
    field: keyof FormData,
    options: {value: T; label: string}[],
    required: boolean = false,
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={styles.selectorContainer}>
        {options.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.selectorOption,
              formData[field] === option.value && styles.selectorOptionActive,
            ]}
            onPress={() => updateFormData(field, option.value)}>
            <Text
              style={[
                styles.selectorOptionText,
                formData[field] === option.value && styles.selectorOptionTextActive,
              ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const handleSearchLocation = async () => {
    const query = mapSearchQuery.trim();
    if (!query) {
      Alert.alert('Search', 'Please enter a place to search.');
      return;
    }

    setIsSearchingLocation(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SmartTutorApp/1.0 (support@smarttutor.app)',
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

      updateFormData('latitude', newLat);
      updateFormData('longitude', newLng);
      setErrors(prev => {
        const next = {...prev};
        delete next.location;
        return next;
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to search location. Please check your internet and try again.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'Allow access to use your current location.',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handleUseCurrentLocation = async () => {
    setIsFetchingCurrentLocation(true);
    try {
      const allowed = await requestLocationPermission();
      if (!allowed) {
        Alert.alert('Permission', 'Location permission is required.');
        return;
      }

      Geolocation.getCurrentPosition(
        position => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;
          updateFormData('latitude', newLat);
          updateFormData('longitude', newLng);
          setErrors(prev => {
            const next = {...prev};
            delete next.location;
            return next;
          });
        },
        () => {
          Alert.alert('Error', 'Unable to get current location.');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    } finally {
      setIsFetchingCurrentLocation(false);
    }
  };

  const getMapHtml = (lat: number | null, lng: number | null) => {
    const centerLat = lat ?? 31.4187;
    const centerLng = lng ?? 73.0791;
    const markerScript = lat && lng
      ? `var marker = L.marker([${lat}, ${lng}]).addTo(map);`
      : 'var marker = null;';

    return `<!DOCTYPE html>
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
      var map = L.map('map').setView([${centerLat}, ${centerLng}], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      ${markerScript}

      map.on('click', function(e) {
        if (!marker) {
          marker = L.marker(e.latlng).addTo(map);
        } else {
          marker.setLatLng(e.latlng);
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        }));
      });
    </script>
  </body>
</html>`;
  };

  const renderCitySelector = () => {
    const cityQuery = formData.city_name.trim().toLowerCase();
    const filteredCities = lookupData?.cities
      ? lookupData.cities.filter(city =>
          cityQuery ? city.name.toLowerCase().includes(cityQuery) : true,
        )
      : [];

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          City<Text style={styles.required}> *</Text>
        </Text>
        <View style={styles.cityInputRow}>
          <TextInput
            style={[styles.input, styles.flexInput, errors.city_name && styles.inputError]}
            value={formData.city_name}
            onChangeText={(text) => {
              updateFormData('city_name', text);
              if (formData.city_id) {
                updateFormData('city_id', null);
              }
            }}
            onFocus={() => setIsCityFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsCityFocused(false), 120);
            }}
            placeholder="Type city name (e.g., Lahore)"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={styles.addNewButton}
            onPress={() => setShowAddCityModal(true)}>
            <Text style={styles.addNewButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {isCityFocused && filteredCities.length > 0 && (
          <View style={styles.cityDropdown}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredCities.map((city, index) => (
                <TouchableOpacity
                  key={city.id}
                  style={[
                    styles.cityOptionRow,
                    index === filteredCities.length - 1 && styles.cityOptionRowLast,
                  ]}
                  onPress={() => {
                    updateFormData('city_name', city.name);
                    updateFormData('city_id', city.id);
                    setIsCityFocused(false);
                  }}>
                  <Text style={styles.cityOptionText}>{city.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {errors.city_name && <Text style={styles.errorText}>{errors.city_name}</Text>}
      </View>
    );
  };

  // ==================== Step Renders ====================

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepHeader}>Basic Information</Text>
      <Text style={styles.stepDescription}>
        Let's start with your basic details
      </Text>

      <ProfilePictureUpload
        currentImageUrl={formData.profile_picture}
        onUploadSuccess={(url) => {
          setFormData(prev => ({...prev, profile_picture: url}));
        }}
      />

      {renderInput('Full Name', 'full_name', 'Enter your full name', {required: true})}
      {renderInput('Phone Number', 'phone', '+923001234567', {
        keyboardType: 'phone-pad',
        required: true,
      })}
      {renderSelector('Gender', 'gender', GENDER_OPTIONS)}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Date of Birth</Text>
        <TouchableOpacity
          style={styles.dateInputButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.dateInputText}>
            {formData.date_of_birth || 'Select date (YYYY-MM-DD)'}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={formData.date_of_birth ? new Date(formData.date_of_birth) : new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, selectedDate) => {
              setShowDatePicker(false);
              if (!selectedDate) return;
              const year = selectedDate.getFullYear();
              const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const day = String(selectedDate.getDate()).padStart(2, '0');
              updateFormData('date_of_birth', `${year}-${month}-${day}`);
            }}
            maximumDate={new Date()}
          />
        )}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepHeader}>Professional Information</Text>
      <Text style={styles.stepDescription}>
        Tell us about your qualifications and experience
      </Text>

      {renderInput('Highest Qualification', 'highest_qualification', 'e.g., BS Computer Science', {
        required: true,
      })}
      {renderInput('Institute', 'institute', 'e.g., University of Lahore', {required: true})}
      {renderInput('Years of Experience', 'experience_years', '5', {
        keyboardType: 'numeric',
        required: true,
      })}
      {renderInput('Bio', 'bio', 'Tell students about yourself and your teaching style...', {
        multiline: true,
        numberOfLines: 4,
        required: true,
      })}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepHeader}>Location & Teaching Mode</Text>
      <Text style={styles.stepDescription}>
        Where and how do you teach?
      </Text>

      {renderCitySelector()}
      {renderInput('Area', 'area', 'e.g., Johar Town')}

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Pin Location<Text style={styles.required}> *</Text>
        </Text>
        <View style={styles.mapSearchRow}>
          <TextInput
            style={[styles.input, styles.flexInput]}
            value={mapSearchQuery}
            onChangeText={setMapSearchQuery}
            placeholder="Search location (e.g., NTU Faisalabad)"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.mapSearchButton, isSearchingLocation && styles.buttonDisabled]}
            onPress={handleSearchLocation}
            disabled={isSearchingLocation}
          >
            {isSearchingLocation ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.mapSearchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapSearchButton, isFetchingCurrentLocation && styles.buttonDisabled]}
            onPress={handleUseCurrentLocation}
            disabled={isFetchingCurrentLocation}
          >
            {isFetchingCurrentLocation ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.mapSearchButtonText}>My Location</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.mapWrapper}>
          <WebView
            source={{html: getMapHtml(formData.latitude, formData.longitude)}}
            style={styles.mapView}
            originWhitelist={['*']}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                const newLat = Number(data?.latitude);
                const newLng = Number(data?.longitude);
                if (Number.isFinite(newLat) && Number.isFinite(newLng)) {
                  updateFormData('latitude', newLat);
                  updateFormData('longitude', newLng);
                  setErrors(prev => {
                    const next = {...prev};
                    delete next.location;
                    return next;
                  });
                }
              } catch (err) {
                // Ignore invalid message payloads
              }
            }}
          />
        </View>
        <Text style={styles.mapHint}>
          {formData.latitude && formData.longitude
            ? `Selected: ${formData.latitude.toFixed(5)}, ${formData.longitude.toFixed(5)}`
            : 'Tap on the map to drop a pin'}
        </Text>
        {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
      </View>

      {renderSelector('Teaching Mode', 'teaching_mode', TEACHING_MODE_OPTIONS, true)}
      {renderSelector('Session Type', 'session_type', SESSION_TYPE_OPTIONS, true)}
      {formData.teaching_mode !== 'online' &&
        renderInput('Teaching Radius (km)', 'physical_teaching_radius', '10', {
          keyboardType: 'numeric',
        })}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepHeader}>Upload Documents</Text>
      <Text style={styles.stepDescription}>
        Upload your verification documents (required for profile approval)
      </Text>

      <TeacherDocumentUpload
        initialDocs={{
          cnicFront: formData.cnic_front_image,
          cnicBack: formData.cnic_back_image,
          degree: formData.degree_certificate,
          certificate: formData.other_certificate,
        }}
        onDocumentsChange={(docs) => {
          setFormData(prev => ({
            ...prev,
            cnic_front_image: docs.cnicFront || '',
            cnic_back_image: docs.cnicBack || '',
            degree_certificate: docs.degree || '',
            other_certificate: docs.certificate || '',
          }));
        }}
      />

      {/* CNIC Number Input */}
      {renderInput('CNIC Number', 'cnic', '35201-1234567-1', {
        keyboardType: 'numeric',
        required: true,
      })}
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepHeader}>Subjects You Teach</Text>
      <Text style={styles.stepDescription}>
        Add subjects with their levels and fees
      </Text>

      {errors.subjects && (
        <Text style={[styles.errorText, styles.centerError]}>{errors.subjects}</Text>
      )}

      {selectedSubjects.map((subject, index) => (
        <View key={index} style={styles.subjectCard}>
          <View style={styles.subjectHeader}>
            <Text style={styles.subjectIndex}>Subject {index + 1}</Text>
            <TouchableOpacity onPress={() => removeSubject(index)}>
              <Text style={styles.removeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Subject Name Input */}
          <Text style={styles.inputLabel}>Subject Name *</Text>
          <View style={styles.subjectInputRow}>
            <TextInput
              style={[styles.input, styles.flexInput]}
              value={subject.subject_name}
              onChangeText={value => {
                updateSubject(index, 'subject_name', value);
                const valueLower = value.toLowerCase().trim();
                const matchingSubject = lookupData?.subjects.find(
                  s => s.name.toLowerCase().includes(valueLower) || valueLower.includes(s.name.toLowerCase())
                );
                if (matchingSubject) {
                  updateSubject(index, 'subject_id', matchingSubject.id);
                } else {
                  updateSubject(index, 'subject_id', null);
                }
              }}
              onFocus={() => setFocusedSubjectIndex(index)}
              placeholder="Type subject (e.g., Math, Physics, English)"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.addNewButton}
              onPress={() => {
                setShowAddSubjectModal(true);
                setNewSubjectIndex(index);
              }}>
              <Text style={styles.addNewButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {focusedSubjectIndex === index && lookupData?.subjects && lookupData.subjects.length > 0 && (
            <View style={styles.subjectDropdown}>
              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {lookupData.subjects
                  .filter(s => {
                    const query = subject.subject_name.trim().toLowerCase();
                    return query ? s.name.toLowerCase().includes(query) : true;
                  })
                  .map((s, idx, arr) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.subjectOptionRow,
                        idx === arr.length - 1 && styles.subjectOptionRowLast,
                      ]}
                      onPress={() => {
                        updateSubject(index, 'subject_name', s.name);
                        updateSubject(index, 'subject_id', s.id);
                        setFocusedSubjectIndex(null);
                      }}>
                      <Text style={styles.subjectOptionText}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          )}

          {/* Education Level Input */}
          <Text style={[styles.inputLabel, {marginTop: 12}]}>Education Level</Text>
          <TextInput
            style={styles.input}
            value={subject.level_name}
            onChangeText={value => {
              updateSubject(index, 'level_name', value);
              // Find matching level from lookup (partial match)
              const valueLower = value.toLowerCase().trim();
              const matchingLevel = lookupData?.educationLevels.find(
                l => l.name.toLowerCase().includes(valueLower) || valueLower.includes(l.name.toLowerCase())
              );
              if (matchingLevel) {
                updateSubject(index, 'level_id', matchingLevel.id);
              } else {
                updateSubject(index, 'level_id', null);
              }
            }}
            placeholder="Type level (e.g., Mat, Inter, FSc, BS)"
            placeholderTextColor="#999"
          />
          <Text style={styles.helperText}>💡 Type partial name to match education levels</Text>
          {/* Quick select from levels */}
          {lookupData?.educationLevels && lookupData.educationLevels.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 8}}>
              <View style={styles.optionsRow}>
                {lookupData.educationLevels.map(l => (
                  <TouchableOpacity
                    key={l.id}
                    style={[
                      styles.quickCityChip,
                      subject.level_name === l.name && styles.quickCityChipActive,
                    ]}
                    onPress={() => {
                      updateSubject(index, 'level_name', l.name);
                      updateSubject(index, 'level_id', l.id);
                    }}>
                    <Text
                      style={[
                        styles.quickCityChipText,
                        subject.level_name === l.name && styles.quickCityChipTextActive,
                      ]}>
                      {l.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Fee Input */}
          <Text style={[styles.inputLabel, {marginTop: 12}]}>Monthly Fee (PKR)</Text>
          <TextInput
            style={styles.input}
            value={subject.fee_per_month}
            onChangeText={value => updateSubject(index, 'fee_per_month', value)}
            placeholder="5000"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={addSubject}>
        <Text style={styles.addButtonText}>+ Add Subject</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep6 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepHeader}>Your Availability</Text>
      <Text style={styles.stepDescription}>
        Set your available time slots for teaching
      </Text>

      {errors.availability && (
        <Text style={[styles.errorText, styles.centerError]}>{errors.availability}</Text>
      )}

      {selectedAvailability.map((slot, index) => (
        <View key={index} style={styles.availabilityCard}>
          <View style={styles.subjectHeader}>
            <Text style={styles.subjectIndex}>Slot {index + 1}</Text>
            <TouchableOpacity onPress={() => removeAvailability(index)}>
              <Text style={styles.removeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Day Selection */}
          <Text style={styles.inputLabel}>Day *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionsRow}>
              {[0, 1, 2, 3, 4, 5, 6].map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.chipOption,
                    slot.day_of_week === day && styles.chipOptionActive,
                  ]}
                  onPress={() => updateAvailability(index, 'day_of_week', day)}>
                  <Text
                    style={[
                      styles.chipOptionText,
                      slot.day_of_week === day && styles.chipOptionTextActive,
                    ]}>
                    {getDayName(day).substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Time Selection */}
          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={[styles.inputLabel, {marginTop: 12}]}>Start Time *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.optionsRow}>
                  {TIME_SLOTS.map(time => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeChip,
                        slot.start_time === time && styles.chipOptionActive,
                      ]}
                      onPress={() => updateAvailability(index, 'start_time', time)}>
                      <Text
                        style={[
                          styles.chipOptionText,
                          slot.start_time === time && styles.chipOptionTextActive,
                        ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={[styles.inputLabel, {marginTop: 12}]}>End Time *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.optionsRow}>
                  {TIME_SLOTS.map(time => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeChip,
                        slot.end_time === time && styles.chipOptionActive,
                      ]}
                      onPress={() => updateAvailability(index, 'end_time', time)}>
                      <Text
                        style={[
                          styles.chipOptionText,
                          slot.end_time === time && styles.chipOptionTextActive,
                        ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={addAvailability}>
        <Text style={styles.addButtonText}>+ Add Time Slot</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      default:
        return null;
    }
  };

  // ==================== Main Render ====================

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={Platform.OS === 'ios' ? ['top', 'left', 'right', 'bottom'] : ['left', 'right', 'bottom']}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={Platform.OS === 'android' ? 'transparent' : '#10284C'}
          translucent={Platform.OS === 'android'}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10284C" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={Platform.OS === 'ios' ? ['top', 'left', 'right', 'bottom'] : ['left', 'right', 'bottom']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Platform.OS === 'android' ? 'transparent' : '#10284C'}
        translucent={Platform.OS === 'android'}
      />

      {/* Keyboard Avoiding View */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardViewContainer}
        enabled={true}>
        <View style={styles.contentWrapper}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={handleContentSizeChange}>
            {/* Progress Bar - Inside ScrollView */}
            {renderProgressBar()}

            {/* Content */}
            {renderCurrentStep()}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            {currentStep === 1 && onBack && (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
                <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
              </TouchableOpacity>
            )}

            {currentStep < STEPS.length ? (
              <TouchableOpacity
                style={[styles.primaryButton, currentStep === 1 && styles.fullWidthButton]}
                onPress={handleNext}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, isSaving && styles.buttonDisabled]}
                onPress={handleSaveAndSubmit}
                disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit for Approval</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Add City Modal */}
      <Modal
        visible={showAddCityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddCityModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Add New City</Text>
            
            <Text style={styles.modalInputLabel}>City Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={newCityName}
              onChangeText={setNewCityName}
              placeholder="e.g., Islamabad"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalInputLabel}>Province (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={newCityProvince}
              onChangeText={setNewCityProvince}
              placeholder="e.g., Federal"
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowAddCityModal(false);
                  setNewCityName('');
                  setNewCityProvince('');
                }}>
                <Text style={[styles.modalButtonText, styles.modalButtonCancelText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButtonCreate, isCreatingItem && styles.buttonDisabled]}
                onPress={handleAddNewCity}
                disabled={isCreatingItem}>
                {isCreatingItem ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, styles.modalButtonCreateText]}>Add City</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Subject Modal */}
      <Modal
        visible={showAddSubjectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddSubjectModal(false);
          setNewSubjectIndex(null);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Add New Subject</Text>
            
            <Text style={styles.modalInputLabel}>Subject Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={newSubjectName}
              onChangeText={setNewSubjectName}
              placeholder="e.g., Advanced Mathematics"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalInputLabel}>Category (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={newSubjectCategory}
              onChangeText={setNewSubjectCategory}
              placeholder="e.g., Science, Humanities"
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowAddSubjectModal(false);
                  setNewSubjectIndex(null);
                  setNewSubjectName('');
                  setNewSubjectCategory('');
                }}>
                <Text style={[styles.modalButtonText, styles.modalButtonCancelText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButtonCreate, isCreatingItem && styles.buttonDisabled]}
                onPress={handleAddNewSubject}
                disabled={isCreatingItem}>
                {isCreatingItem ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, styles.modalButtonCreateText]}>Add Subject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ==================== Styles ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfbfb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10284C',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  backArrow: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    backgroundColor: '#10284C',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  progressBar: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2.5,
    marginHorizontal: 4,
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepCircleCurrent: {
    backgroundColor: '#FFFFFF',
  },
  stepIcon: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
  },
  stepIconActive: {
    color: 'rgba(255,255,255,0.9)',
  },
  stepIconCurrent: {
    color: '#10284C',
  },
  stepTitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontWeight: '400',
  },
  stepTitleActive: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  stepTitleCurrent: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  keyboardViewContainer: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  stepContent: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    minHeight: 400,
    paddingBottom: 80,
  },
  stepHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  dateInputButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: '#333',
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: 14,
  },
  inputError: {
    borderColor: '#F44336',
  },
  mapWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  mapView: {
    height: 220,
    width: '100%',
  },
  mapHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  mapSearchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  mapSearchButton: {
    backgroundColor: '#10284C',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapSearchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  centerError: {
    textAlign: 'center',
    marginBottom: 16,
  },
  selectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectorOptionActive: {
    backgroundColor: '#10284C',
    borderColor: '#10284C',
  },
  selectorOptionText: {
    fontSize: 14,
    color: '#666',
  },
  selectorOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  cityContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  cityDropdown: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 220,
    overflow: 'hidden',
  },
  cityOptionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  cityOptionRowLast: {
    borderBottomWidth: 0,
  },
  cityOptionText: {
    fontSize: 14,
    color: '#333',
  },
  subjectDropdown: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 220,
    overflow: 'hidden',
  },
  subjectOptionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  subjectOptionRowLast: {
    borderBottomWidth: 0,
  },
  subjectOptionText: {
    fontSize: 14,
    color: '#333',
  },
  cityOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    minWidth: 100,
  },
  cityOptionActive: {
    backgroundColor: '#10284C',
    borderColor: '#10284C',
  },
  cityOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  cityOptionTextActive: {
    color: '#FFFFFF',
  },
  cityProvince: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  cityProvinceActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  availabilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectIndex: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10284C',
  },
  removeButton: {
    fontSize: 18,
    color: '#F44336',
    fontWeight: 'bold',
    padding: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chipOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipOptionActive: {
    backgroundColor: '#10284C',
    borderColor: '#10284C',
  },
  chipOptionText: {
    fontSize: 13,
    color: '#666',
  },
  chipOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timeRow: {
    flexDirection: 'row',
  },
  timeCol: {
    flex: 1,
  },
  addButton: {
    borderWidth: 2,
    borderColor: '#10284C',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: '#10284C',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#10284C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fullWidthButton: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#10284C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10284C',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#10284C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Quick select styles for city and subject
  quickSelectLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  quickCityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  quickCityChipActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#10284C',
  },
  quickCityChipText: {
    fontSize: 13,
    color: '#666',
  },
  quickCityChipTextActive: {
    color: '#10284C',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 11,
    color: '#10284C',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Input row with button styles
  cityInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  subjectInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  flexInput: {
    flex: 1,
  },
  addNewButton: {
    backgroundColor: '#10284C',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 50,
  },
  addNewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonCreate: {
    flex: 1,
    backgroundColor: '#10284C',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonCreateText: {
    color: '#FFFFFF',
  },
  modalButtonCancelText: {
    color: '#333',
  },
});

export default TeacherProfileWizard;
