import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL, API_ENDPOINTS} from '../config';
import type {
  CreateTeacherRequest,
  CreateTeacherResponse,
  GetTeachersQueryParams,
  GetTeachersResponse,
  GetTeacherByIdResponse,
  GetTeacherByUserIdResponse,
  GetMyProfileResponse,
  CompleteProfileRequest,
  CompleteProfileResponse,
  UpdateTeacherRequest,
  UpdateTeacherResponse,
  AddSubjectsRequest,
  AddSubjectsResponse,
  GetSubjectsResponse,
  RemoveSubjectQueryParams,
  SetAvailabilityRequest,
  SetAvailabilityResponse,
  GetAvailabilityResponse,
} from './types';

// ==================== Helper Functions ====================

// Helper function to get access token from AsyncStorage
const getAccessToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    return token;
  } catch (error) {
    console.error('[TEACHER API] Error getting access token:', error);
    return null;
  }
};

// Helper function to build query string from params
const buildQueryString = (params: Record<string, any>): string => {
  const queryParams: string[] = [];

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  });

  return queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
};

const normalizeErrorMessage = (message: unknown): string => {
  if (typeof message === 'string') {
    return message;
  }
  if (message instanceof Error && typeof message.message === 'string') {
    return message.message;
  }
  try {
    return JSON.stringify(message);
  } catch (e) {
    return String(message);
  }
};

// Generic API call function with authentication
const authenticatedApiCall = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = await getAccessToken();
  
  if (!token) {
    throw new Error('Authentication required. Please login first.');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[TEACHER API] ${options.method || 'GET'} ${url}`);

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
          errorMessage = normalizeErrorMessage(errorData.detail);
        } else if (errorData.message) {
          errorMessage = normalizeErrorMessage(errorData.message);
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
        console.log(`[TEACHER API] Error data:`, errorData);
      } catch (e) {
        try {
          const text = await response.text();
          console.log(`[TEACHER API] Error response text:`, text);
          if (text) {
            errorMessage = text;
          }
        } catch (textError) {
          console.log(`[TEACHER API] Could not read error response`);
        }
      }

      // Provide user-friendly error messages for common status codes
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (response.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (response.status === 404) {
        errorMessage = 'Teacher profile not found.';
      } else if (response.status === 400) {
        errorMessage = errorMessage || 'Invalid request. Please check your input.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      throw new Error(normalizeErrorMessage(errorMessage));
    }

    // Handle 204 No Content response (for DELETE)
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    console.log(`[TEACHER API] Success response:`, data);
    return data;
  } catch (error: any) {
    console.error(`[TEACHER API] Network error:`, error);

    const safeMessage = normalizeErrorMessage(error?.message ?? error);
    if (
      safeMessage.includes('Network request failed') ||
      safeMessage.includes('Failed to fetch')
    ) {
      throw new Error(
        `Network request failed. Please check:\n` +
          `1. Backend is running on ${API_BASE_URL}\n` +
          `2. Both devices are on the same network\n` +
          `3. Firewall allows connections\n` +
          `Original error: ${safeMessage}`,
      );
    }

    throw new Error(safeMessage);
  }
};

// Generic API call function without authentication (for public endpoints)
const publicApiCall = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[TEACHER API] ${options.method || 'GET'} ${url}`);

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
          errorMessage = normalizeErrorMessage(errorData.detail);
        } else if (errorData.message) {
          errorMessage = normalizeErrorMessage(errorData.message);
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
        console.log(`[TEACHER API] Error data:`, errorData);
      } catch (e) {
        try {
          const text = await response.text();
          console.log(`[TEACHER API] Error response text:`, text);
          if (text) {
            errorMessage = text;
          }
        } catch (textError) {
          console.log(`[TEACHER API] Could not read error response`);
        }
      }

      if (response.status === 404) {
        errorMessage = 'Teacher profile not found.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      throw new Error(normalizeErrorMessage(errorMessage));
    }

    const data = await response.json();
    console.log(`[TEACHER API] Success response:`, data);
    return data;
  } catch (error: any) {
    console.error(`[TEACHER API] Network error:`, error);

    const safeMessage = normalizeErrorMessage(error?.message ?? error);
    if (
      safeMessage.includes('Network request failed') ||
      safeMessage.includes('Failed to fetch')
    ) {
      throw new Error(
        `Network request failed. Please check:\n` +
          `1. Backend is running on ${API_BASE_URL}\n` +
          `2. Both devices are on the same network\n` +
          `3. Firewall allows connections\n` +
          `Original error: ${safeMessage}`,
      );
    }

    throw new Error(safeMessage);
  }
};

// Create Teacher Profile
export const createTeacherProfile = async (
  data: CreateTeacherRequest,
): Promise<CreateTeacherResponse> => {
  return authenticatedApiCall<CreateTeacherResponse>(API_ENDPOINTS.TEACHERS, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Complete Teacher Profile (Mandatory)
export const completeTeacherProfile = async (
  teacherId: number,
  data: CompleteProfileRequest,
): Promise<CompleteProfileResponse> => {
  return authenticatedApiCall<CompleteProfileResponse>(
    API_ENDPOINTS.TEACHER_COMPLETE_PROFILE(teacherId),
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
};

// Get All Approved Teachers (Public Search)
export const getAllTeachers = async (
  params?: GetTeachersQueryParams,
): Promise<GetTeachersResponse> => {
  const queryString = params ? buildQueryString(params) : '';
  return publicApiCall<GetTeachersResponse>(
    `${API_ENDPOINTS.TEACHERS}${queryString}`,
    {
      method: 'GET',
    },
  );
};

// Get My Teacher Profile
export const getMyTeacherProfile =
  async (): Promise<GetMyProfileResponse> => {
    return authenticatedApiCall<GetMyProfileResponse>(API_ENDPOINTS.TEACHER_ME, {
      method: 'GET',
    });
  };

// Get Teacher by ID
export const getTeacherById = async (
  teacherId: number,
): Promise<GetTeacherByIdResponse> => {
  return publicApiCall<GetTeacherByIdResponse>(
    API_ENDPOINTS.TEACHER_BY_ID(teacherId),
    {
      method: 'GET',
    },
  );
};

// Get Teacher by User ID
export const getTeacherByUserId = async (
  userId: number,
): Promise<GetTeacherByUserIdResponse> => {
  return publicApiCall<GetTeacherByUserIdResponse>(
    API_ENDPOINTS.TEACHER_BY_USER_ID(userId),
    {
      method: 'GET',
    },
  );
};

// Update Teacher Profile
export const updateTeacherProfile = async (
  teacherId: number,
  data: UpdateTeacherRequest,
): Promise<UpdateTeacherResponse> => {
  return authenticatedApiCall<UpdateTeacherResponse>(
    API_ENDPOINTS.TEACHER_BY_ID(teacherId),
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  );
};

// Delete Teacher Profile
export const deleteTeacherProfile = async (
  teacherId: number,
): Promise<void> => {
  await authenticatedApiCall<void>(API_ENDPOINTS.TEACHER_BY_ID(teacherId), {
    method: 'DELETE',
  });
};

// ==================== Teacher Subjects APIs ====================

// Add Subjects to Teacher
export const addTeacherSubjects = async (
  teacherId: number,
  data: AddSubjectsRequest,
): Promise<AddSubjectsResponse> => {
  return authenticatedApiCall<AddSubjectsResponse>(
    API_ENDPOINTS.TEACHER_SUBJECTS(teacherId),
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
};

// Get Teacher's Subjects
export const getTeacherSubjects = async (
  teacherId: number,
): Promise<GetSubjectsResponse> => {
  return publicApiCall<GetSubjectsResponse>(
    API_ENDPOINTS.TEACHER_SUBJECTS(teacherId),
    {
      method: 'GET',
    },
  );
};

// Remove Subject from Teacher
export const removeTeacherSubject = async (
  teacherId: number,
  subjectId: number,
  params?: RemoveSubjectQueryParams,
): Promise<void> => {
  const queryString = params ? buildQueryString(params) : '';
  await authenticatedApiCall<void>(
    `${API_ENDPOINTS.TEACHER_SUBJECT_REMOVE(teacherId, subjectId)}${queryString}`,
    {
      method: 'DELETE',
    },
  );
};

// ==================== Teacher Availability APIs ====================

// Set Teacher Availability (Replaces all existing slots)
export const setTeacherAvailability = async (
  teacherId: number,
  data: SetAvailabilityRequest,
): Promise<SetAvailabilityResponse> => {
  return authenticatedApiCall<SetAvailabilityResponse>(
    API_ENDPOINTS.TEACHER_AVAILABILITY(teacherId),
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  );
};

// Get Teacher Availability
export const getTeacherAvailability = async (
  teacherId: number,
): Promise<GetAvailabilityResponse> => {
  return publicApiCall<GetAvailabilityResponse>(
    API_ENDPOINTS.TEACHER_AVAILABILITY(teacherId),
    {
      method: 'GET',
    },
  );
};


