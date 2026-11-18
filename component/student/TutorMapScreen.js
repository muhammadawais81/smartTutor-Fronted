import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import MapView, {Marker, UrlTile} from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import {API_BASE_URL, API_ENDPOINTS} from '../../api/config';

const API_URL = `${API_BASE_URL}${API_ENDPOINTS.TEACHERS}`;

const INITIAL_REGION = {
  latitude: 31.4187,
  longitude: 73.0791,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const TutorMapScreen = ({onBack}) => {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const init = async () => {
      await requestLocationPermission();
      getCurrentLocation();
      fetchTutors();
    };

    init();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'We need your location to show it on the map.',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      return false;
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        // Keep map usable if location fails.
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const fetchTutors = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch tutors');
      }
      const data = await response.json();
      setTutors(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      Alert.alert('Error', 'Unable to load tutors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderTutorMarkers = () => {
    return tutors
      .map((tutor) => {
        const latitude = Number(tutor?.latitude);
        const longitude = Number(tutor?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        const subjectLabel =
          tutor?.subjects?.[0]?.subject?.name ||
          tutor?.subjects?.[0]?.name ||
          tutor?.subject ||
          tutor?.subject_name ||
          'Subject';

        return (
          <Marker
            key={tutor?.id || `${latitude}-${longitude}`}
            coordinate={{latitude, longitude}}
            title={tutor?.full_name || tutor?.name || 'Tutor'}
            description={subjectLabel}
          />
        );
      })
      .filter(Boolean);
  };

  return (
    <View style={styles.container}>
      {onBack ? (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      ) : null}
      <MapView
        style={styles.map}
        initialRegion={INITIAL_REGION}
        mapType="none"
        showsUserLocation={false}
      >
        <UrlTile
          urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />

        {renderTutorMarkers()}

        {userLocation ? (
          <Marker
            coordinate={userLocation}
            title="You"
            pinColor="blue"
          />
        ) : null}
      </MapView>

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1E88E5" />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  backButton: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 10,
    backgroundColor: 'rgba(16,40,76,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  backText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default TutorMapScreen;
