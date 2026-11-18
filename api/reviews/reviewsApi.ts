import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL, API_ENDPOINTS} from '../config';
import type {
  Review,
  ReviewEligibility,
  StudentReviewRequest,
  ParentReviewRequest,
  TeacherReviewsResponse,
} from './types';

const getAccessToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch (error) {
    console.error('[REVIEWS API] Error getting access token:', error);
    return null;
  }
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  let message = `Request failed with status ${response.status}`;
  try {
    const data = await response.json();
    if (data?.detail) {
      message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } else if (data?.message) {
      message = data.message;
    }
  } catch {
    // keep default message
  }

  if (response.status === 401) {
    message = 'Your session has expired. Please log in again.';
  } else if (response.status === 403) {
    message = 'You are not allowed to perform this action.';
  }

  return message;
};

const request = async <T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth = true,
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (requireAuth) {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Authentication required. Please login first.');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[REVIEWS API] ${options.method || 'GET'} ${url}`);

  const response = await fetch(url, {...options, headers});

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
};

// Api #1 - student eligibility to review a teacher
export const getStudentReviewEligibility = async (
  teacherId: number,
): Promise<ReviewEligibility> => {
  return request<ReviewEligibility>(
    API_ENDPOINTS.REVIEW_STUDENT_ELIGIBILITY(teacherId),
  );
};

// Api #2 - student submits a review
export const submitStudentReview = async (
  data: StudentReviewRequest,
): Promise<Review> => {
  return request<Review>(API_ENDPOINTS.REVIEW_STUDENT_SUBMIT, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Api #3 - parent eligibility to review a teacher for one child
export const getParentReviewEligibility = async (
  teacherId: number,
  studentId: number,
): Promise<ReviewEligibility> => {
  return request<ReviewEligibility>(
    API_ENDPOINTS.REVIEW_PARENT_ELIGIBILITY(teacherId, studentId),
  );
};

// Api #4 - parent submits a review for one child
export const submitParentReview = async (
  data: ParentReviewRequest,
): Promise<Review> => {
  return request<Review>(API_ENDPOINTS.REVIEW_PARENT_SUBMIT, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Api #5 - public teacher reviews (average + list)
export const getTeacherReviews = async (
  teacherId: number,
): Promise<TeacherReviewsResponse> => {
  return request<TeacherReviewsResponse>(
    API_ENDPOINTS.REVIEW_TEACHER(teacherId),
    {},
    false,
  );
};
