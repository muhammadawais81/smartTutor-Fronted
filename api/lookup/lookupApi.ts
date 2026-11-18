import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL, API_ENDPOINTS} from '../config';
import type {
  Subject,
  City,
  EducationLevel,
  CreateSubjectRequest,
  CreateSubjectResponse,
  GetSubjectsResponse,
  CreateCityRequest,
  CreateCityResponse,
  GetCitiesResponse,
  CreateEducationLevelRequest,
  CreateEducationLevelResponse,
  GetEducationLevelsResponse,
  LookupData,
} from './types';

// ==================== Helper Functions ====================

// Helper function to get access token from AsyncStorage
const getAccessToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    return token;
  } catch (error) {
    console.error('[LOOKUP API] Error getting access token:', error);
    return null;
  }
};

// Generic API call function with authentication (for admin endpoints)
const authenticatedApiCall = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Authentication required. Please login first.');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[LOOKUP API] ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;

      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
        console.log(`[LOOKUP API] Error data:`, errorData);
      } catch (e) {
        try {
          const text = await response.text();
          console.log(`[LOOKUP API] Error response text:`, text);
          if (text) {
            errorMessage = text;
          }
        } catch (textError) {
          console.log(`[LOOKUP API] Could not read error response`);
        }
      }

      // Provide user-friendly error messages for common status codes
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (response.status === 403) {
        errorMessage = 'Admin access required to perform this action.';
      } else if (response.status === 400) {
        errorMessage = errorMessage || 'Invalid request. Please check your input.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[LOOKUP API] Success response:`, data);
    return data;
  } catch (error: any) {
    console.error(`[LOOKUP API] Network error:`, error);

    if (
      error.message.includes('Network request failed') ||
      error.message.includes('Failed to fetch')
    ) {
      throw new Error(
        `Network request failed. Please check:\n` +
          `1. Backend is running on ${API_BASE_URL}\n` +
          `2. Both devices are on the same network\n` +
          `3. Firewall allows connections\n` +
          `Original error: ${error.message}`,
      );
    }

    throw error;
  }
};

// Generic API call function without authentication (for public endpoints)
const publicApiCall = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[LOOKUP API] ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;

      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
        console.log(`[LOOKUP API] Error data:`, errorData);
      } catch (e) {
        try {
          const text = await response.text();
          console.log(`[LOOKUP API] Error response text:`, text);
          if (text) {
            errorMessage = text;
          }
        } catch (textError) {
          console.log(`[LOOKUP API] Could not read error response`);
        }
      }

      if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[LOOKUP API] Success response:`, data);
    return data;
  } catch (error: any) {
    console.error(`[LOOKUP API] Network error:`, error);

    if (
      error.message.includes('Network request failed') ||
      error.message.includes('Failed to fetch')
    ) {
      throw new Error(
        `Network request failed. Please check:\n` +
          `1. Backend is running on ${API_BASE_URL}\n` +
          `2. Both devices are on the same network\n` +
          `3. Firewall allows connections\n` +
          `Original error: ${error.message}`,
      );
    }

    throw error;
  }
};

// ==================== Subject APIs ====================

/**
 * Get all available subjects for dropdown/selection
 * @returns List of all active subjects
 */
export const getAllSubjects = async (): Promise<GetSubjectsResponse> => {
  return publicApiCall<GetSubjectsResponse>(API_ENDPOINTS.LOOKUP_SUBJECTS, {
    method: 'GET',
  });
};

/**
 * Add a new subject (Admin only)
 * @param data Subject data to create
 * @returns Created subject
 */
export const createSubject = async (
  data: CreateSubjectRequest,
): Promise<CreateSubjectResponse> => {
  return authenticatedApiCall<CreateSubjectResponse>(
    API_ENDPOINTS.LOOKUP_SUBJECTS,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
};

// ==================== City APIs ====================

/**
 * Get all available cities for dropdown/selection
 * @returns List of all active cities
 */
export const getAllCities = async (): Promise<GetCitiesResponse> => {
  return publicApiCall<GetCitiesResponse>(API_ENDPOINTS.LOOKUP_CITIES, {
    method: 'GET',
  });
};

/**
 * Add a new city (Admin only)
 * @param data City data to create
 * @returns Created city
 */
export const createCity = async (
  data: CreateCityRequest,
): Promise<CreateCityResponse> => {
  return authenticatedApiCall<CreateCityResponse>(API_ENDPOINTS.LOOKUP_CITIES, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// ==================== Education Level APIs ====================

/**
 * Get all education levels for dropdown/selection
 * @returns List of all active education levels (ordered by order_rank)
 */
export const getAllEducationLevels =
  async (): Promise<GetEducationLevelsResponse> => {
    return publicApiCall<GetEducationLevelsResponse>(
      API_ENDPOINTS.LOOKUP_EDUCATION_LEVELS,
      {
        method: 'GET',
      },
    );
  };

/**
 * Add a new education level (Admin only)
 * @param data Education level data to create
 * @returns Created education level
 */
export const createEducationLevel = async (
  data: CreateEducationLevelRequest,
): Promise<CreateEducationLevelResponse> => {
  return authenticatedApiCall<CreateEducationLevelResponse>(
    API_ENDPOINTS.LOOKUP_EDUCATION_LEVELS,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
};

// ==================== Utility Functions ====================

/**
 * Fetch all lookup data at once (for app initialization)
 * @returns Object containing subjects, cities, and education levels
 */
export const fetchAllLookupData = async (): Promise<LookupData> => {
  const [subjects, cities, educationLevels] = await Promise.all([
    getAllSubjects(),
    getAllCities(),
    getAllEducationLevels(),
  ]);

  return {
    subjects,
    cities,
    educationLevels,
  };
};

// ==================== Helper Constants ====================

/**
 * Day of week mapping for teacher availability
 */
export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/**
 * Get day name from day_of_week number
 * @param dayOfWeek 0-6 (0=Monday, 6=Sunday)
 * @returns Day name string
 */
export const getDayName = (dayOfWeek: number): string => {
  return DAYS_OF_WEEK[dayOfWeek] || 'Unknown';
};

/**
 * Format availability slot for display
 * @param slot Availability slot object
 * @returns Formatted string like "Monday: 17:00 - 19:00"
 */
export const formatAvailabilitySlot = (slot: {
  day_of_week: number;
  start_time: string;
  end_time: string;
}): string => {
  return `${getDayName(slot.day_of_week)}: ${slot.start_time} - ${slot.end_time}`;
};
