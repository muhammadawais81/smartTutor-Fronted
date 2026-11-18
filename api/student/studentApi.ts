import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL, API_ENDPOINTS} from '../config';
import type {
  CreateStudentRequest,
  CreateStudentResponse,
  GetStudentsQueryParams,
  GetStudentsResponse,
  GetStudentByIdResponse,
  GetStudentByUserIdResponse,
  UpdateStudentRequest,
  UpdateStudentResponse,
} from './types';

// Helper function to get access token from AsyncStorage
const getAccessToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    return token;
  } catch (error) {
    console.error('[STUDENT API] Error getting access token:', error);
    return null;
  }
};

// Helper function to build query string from params
const buildQueryString = (params: GetStudentsQueryParams): string => {
  const queryParams: string[] = [];

  if (params.skip !== undefined) {
    queryParams.push(`skip=${params.skip}`);
  }
  if (params.limit !== undefined) {
    queryParams.push(`limit=${params.limit}`);
  }
  if (params.city) {
    queryParams.push(`city=${encodeURIComponent(params.city)}`);
  }
  if (params.grade_level) {
    queryParams.push(`grade_level=${encodeURIComponent(params.grade_level)}`);
  }
  if (params.parent_id !== undefined) {
    queryParams.push(`parent_id=${params.parent_id}`);
  }
  if (params.search) {
    queryParams.push(`search=${encodeURIComponent(params.search)}`);
  }

  return queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
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
  console.log(`[STUDENT API] ${options.method || 'GET'} ${url}`);

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
        console.log(`[STUDENT API] Error data:`, errorData);
      } catch (e) {
        try {
          const text = await response.text();
          console.log(`[STUDENT API] Error response text:`, text);
          if (text) {
            errorMessage = text;
          }
        } catch (textError) {
          console.log(`[STUDENT API] Could not read error response`);
        }
      }

      // Provide user-friendly error messages for common status codes
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (response.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (response.status === 404) {
        errorMessage = 'Student profile not found.';
      } else if (response.status === 400) {
        errorMessage = errorMessage || 'Invalid request. Please check your input.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      throw new Error(errorMessage);
    }

    // Handle 204 No Content response (for DELETE)
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    console.log(`[STUDENT API] Success response:`, data);
    return data;
  } catch (error: any) {
    console.error(`[STUDENT API] Network error:`, error);

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
  console.log(`[STUDENT API] ${options.method || 'GET'} ${url}`);

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
        console.log(`[STUDENT API] Error data:`, errorData);
      } catch (e) {
        try {
          const text = await response.text();
          console.log(`[STUDENT API] Error response text:`, text);
          if (text) {
            errorMessage = text;
          }
        } catch (textError) {
          console.log(`[STUDENT API] Could not read error response`);
        }
      }

      if (response.status === 404) {
        errorMessage = 'Student profile not found.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[STUDENT API] Success response:`, data);
    return data;
  } catch (error: any) {
    console.error(`[STUDENT API] Network error:`, error);

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

// Create Student Profile
export const createStudentProfile = async (
  data: CreateStudentRequest,
): Promise<CreateStudentResponse> => {
  return authenticatedApiCall<CreateStudentResponse>(
    API_ENDPOINTS.STUDENTS,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
};

// Get All Students
export const getAllStudents = async (
  params?: GetStudentsQueryParams,
): Promise<GetStudentsResponse> => {
  const queryString = params ? buildQueryString(params) : '';
  return publicApiCall<GetStudentsResponse>(
    `${API_ENDPOINTS.STUDENTS}${queryString}`,
    {
      method: 'GET',
    },
  );
};

// Get Student by ID
export const getStudentById = async (
  studentId: number,
): Promise<GetStudentByIdResponse> => {
  return publicApiCall<GetStudentByIdResponse>(
    `${API_ENDPOINTS.STUDENTS}/${studentId}`,
    {
      method: 'GET',
    },
  );
};

// Get Student by User ID
export const getStudentByUserId = async (
  userId: number,
): Promise<GetStudentByUserIdResponse> => {
  return publicApiCall<GetStudentByUserIdResponse>(
    `${API_ENDPOINTS.STUDENTS}/user/${userId}`,
    {
      method: 'GET',
    },
  );
};

// Update Student Profile
export const updateStudentProfile = async (
  studentId: number,
  data: UpdateStudentRequest,
): Promise<UpdateStudentResponse> => {
  return authenticatedApiCall<UpdateStudentResponse>(
    `${API_ENDPOINTS.STUDENTS}/${studentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  );
};

// Delete Student Profile
export const deleteStudentProfile = async (
  studentId: number,
): Promise<void> => {
  await authenticatedApiCall<void>(
    `${API_ENDPOINTS.STUDENTS}/${studentId}`,
    {
      method: 'DELETE',
    },
  );
};


