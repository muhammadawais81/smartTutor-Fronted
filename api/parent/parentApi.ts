import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL, API_ENDPOINTS} from '../config';
import type {
  ParentLoginRequest,
  ParentLoginResponse,
  ParentChangePasswordRequest,
  ParentChangePasswordResponse,
  ParentProfile,
  ParentStudentLink,
  ParentAttendanceRecord,
  ParentMarksRecord,
  TeacherAddParentRequest,
  TeacherAddParentResponse,
} from './types';

const getAccessToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch (error) {
    console.error('[PARENT API] Error getting access token:', error);
    return null;
  }
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  let errorMessage = `Request failed with status ${response.status}`;

  try {
    const errorData = await response.json();
    if (errorData.errors && Array.isArray(errorData.errors)) {
      errorMessage = errorData.errors
        .map(
          (err: {field?: string; message?: string}) =>
            `${err.field || 'Error'}: ${err.message || 'Invalid'}`,
        )
        .join('\n');
    } else if (errorData.detail) {
      errorMessage =
        typeof errorData.detail === 'string'
          ? errorData.detail
          : JSON.stringify(errorData.detail);
    } else if (errorData.message) {
      errorMessage = errorData.message;
    }
  } catch {
    try {
      const text = await response.text();
      if (text) {
        errorMessage = text;
      }
    } catch {
      // keep default message
    }
  }

  if (response.status === 401) {
    errorMessage = 'Invalid email or password. Please check your credentials.';
  }

  return errorMessage;
};

const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[PARENT API] ${options.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
};

const authenticatedApiCall = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Authentication required. Please login first.');
  }

  return apiCall<T>(endpoint, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
};

export const loginParent = async (
  data: ParentLoginRequest,
): Promise<ParentLoginResponse> => {
  const response = await apiCall<ParentLoginResponse>(
    API_ENDPOINTS.PARENT_LOGIN,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );

  if (!response?.access_token || !response?.parent) {
    throw new Error('Invalid response from server. Missing parent credentials.');
  }

  try {
    await AsyncStorage.setItem('access_token', response.access_token);
    await AsyncStorage.setItem('user', JSON.stringify(response.parent));
    await AsyncStorage.setItem('user_role', 'parent');
  } catch (error) {
    console.warn('[PARENT API] Failed to store parent session:', error);
  }

  return response;
};

export const changeParentPassword = async (
  data: ParentChangePasswordRequest,
): Promise<ParentChangePasswordResponse> => {
  const response = await authenticatedApiCall<ParentChangePasswordResponse>(
    API_ENDPOINTS.PARENT_CHANGE_PASSWORD,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );

  try {
    await AsyncStorage.setItem('user', JSON.stringify(response));
  } catch (error) {
    console.warn('[PARENT API] Failed to update stored parent profile:', error);
  }

  return response;
};

export const getParentProfile = async (): Promise<ParentProfile> => {
  return authenticatedApiCall<ParentProfile>(API_ENDPOINTS.PARENT_PROFILE);
};

export const getParentStudents = async (): Promise<ParentStudentLink[]> => {
  const data = await authenticatedApiCall<ParentStudentLink[] | {students?: ParentStudentLink[]}>(
    API_ENDPOINTS.PARENT_MY_STUDENTS,
  );

  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.students) ? data.students : [];
};

export const getParentStudentAttendance = async (
  studentId: number,
): Promise<ParentAttendanceRecord[]> => {
  const data = await authenticatedApiCall<
    ParentAttendanceRecord[] | {records?: ParentAttendanceRecord[]}
  >(API_ENDPOINTS.PARENT_STUDENT_ATTENDANCE(studentId));

  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.records) ? data.records : [];
};

export const getParentStudentMarks = async (
  studentId: number,
): Promise<ParentMarksRecord[]> => {
  const data = await authenticatedApiCall<
    ParentMarksRecord[] | {records?: ParentMarksRecord[]}
  >(API_ENDPOINTS.PARENT_STUDENT_MARKS(studentId));

  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.records) ? data.records : [];
};

export const addStudentParent = async (
  data: TeacherAddParentRequest,
): Promise<TeacherAddParentResponse> => {
  return authenticatedApiCall<TeacherAddParentResponse>(
    API_ENDPOINTS.TEACHER_ADD_PARENT,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
};
