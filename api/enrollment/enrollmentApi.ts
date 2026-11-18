import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config';
import type {
  TeacherSubject,
  EnrollmentResponse,
  CreateEnrollmentRequest,
  GetTeacherSubjectsParams,
  ApproveEnrollmentResponse,
  RejectEnrollmentResponse,
} from './types';

// Helper function to get access token from AsyncStorage
const getAccessToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    return token;
  } catch (error) {
    console.error('[ENROLLMENT API] Error getting access token:', error);
    return null;
  }
};

// Helper function to build headers with auth token
const buildHeaders = async () => {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Get teacher's subject offerings
 * GET /subjects/teacher/{teacher_id}
 */
export const getTeacherSubjects = async (
  teacherId: number,
  params?: GetTeacherSubjectsParams
): Promise<TeacherSubject[]> => {
  try {
    const headers = await buildHeaders();
    let url = `${API_BASE_URL}/subjects/teacher/${teacherId}`;

    if (params) {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.skip) queryParams.append('skip', params.skip.toString());
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch teacher subjects: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ENROLLMENT API] Error getting teacher subjects:', error);
    throw error;
  }
};

/**
 * Create enrollment request
 * POST /enrollments
 */
export const createEnrollment = async (
  enrollmentData: CreateEnrollmentRequest
): Promise<EnrollmentResponse> => {
  try {
    const headers = await buildHeaders();

    const response = await fetch(`${API_BASE_URL}/enrollments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(enrollmentData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg =
        errorData.detail || errorData.message || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[ENROLLMENT API] Error creating enrollment:', error);
    throw error;
  }
};

/**
 * Get student's enrollments
 * GET /enrollments/my
 */
export const getMyEnrollments = async (): Promise<EnrollmentResponse[]> => {
  try {
    const headers = await buildHeaders();

    const response = await fetch(`${API_BASE_URL}/enrollments/my`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch enrollments: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ENROLLMENT API] Error getting enrollments:', error);
    throw error;
  }
};

/**
 * Get pending enrollments for teacher
 * GET /enrollments/pending
 */
export const getPendingEnrollments = async (): Promise<EnrollmentResponse[]> => {
  try {
    const headers = await buildHeaders();

    const response = await fetch(`${API_BASE_URL}/enrollments/pending`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pending enrollments: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ENROLLMENT API] Error getting pending enrollments:', error);
    throw error;
  }
};

/**
 * Get pending enrollments for a specific subject
 * GET /enrollments/pending/subject/{subject_id}
 */
export const getPendingEnrollmentsBySubject = async (
  subjectId: number
): Promise<EnrollmentResponse[]> => {
  try {
    const headers = await buildHeaders();

    const response = await fetch(
      `${API_BASE_URL}/enrollments/pending/subject/${subjectId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch pending enrollments for subject: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ENROLLMENT API] Error getting pending enrollments by subject:', error);
    throw error;
  }
};

/**
 * Get all enrollments for teacher (all statuses)
 * GET /enrollments/teacher/all
 */
export const getAllTeacherEnrollments = async (): Promise<EnrollmentResponse[]> => {
  try {
    const headers = await buildHeaders();

    const response = await fetch(`${API_BASE_URL}/enrollments/teacher/all`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch all enrollments: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ENROLLMENT API] Error getting all enrollments:', error);
    throw error;
  }
};

/**
 * Approve enrollment (teacher only)
 * POST /enrollments/{id}/approve
 */
export const approveEnrollment = async (
  enrollmentId: string
): Promise<ApproveEnrollmentResponse> => {
  try {
    const headers = await buildHeaders();

    const response = await fetch(
      `${API_BASE_URL}/enrollments/${enrollmentId}/approve`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to approve enrollment: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[ENROLLMENT API] Error approving enrollment:', error);
    throw error;
  }
};

/**
 * Reject enrollment (teacher only)
 * POST /enrollments/{id}/reject
 */
export const rejectEnrollment = async (
  enrollmentId: string
): Promise<RejectEnrollmentResponse> => {
  try {
    const headers = await buildHeaders();

    const response = await fetch(
      `${API_BASE_URL}/enrollments/${enrollmentId}/reject`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to reject enrollment: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[ENROLLMENT API] Error rejecting enrollment:', error);
    throw error;
  }
};
