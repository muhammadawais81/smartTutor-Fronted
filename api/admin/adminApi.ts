import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL, API_ENDPOINTS} from '../config';
import type {
  GetAdminTeachersQueryParams,
  GetAdminTeachersResponse,
  GetPendingTeachersQueryParams,
  GetPendingTeachersResponse,
  GetAdminTeacherByIdResponse,
  ApproveRejectRequest,
  ApprovalResponse,
  SuspendTeacherResponse,
  GetTeacherStatisticsResponse,
  GetAdminStudentsQueryParams,
  GetAdminStudentsResponse,
  GetAdminStudentByIdResponse,
  UpdateAdminStudentRequest,
  UpdateAdminStudentResponse,
  GetStudentStatisticsResponse,
  GetAdminEnrollmentsQueryParams,
  GetAdminEnrollmentsResponse,
  GetAdminTeacherEnrolledStudentsQueryParams,
  GetAdminTeacherEnrolledStudentsResponse,
  GetAdminEnrollmentByIdResponse,
  GetAdminAttendanceQueryParams,
  GetAdminAttendanceResponse,
  GetAdminAttendanceByIdResponse,
  GetAdminMarksQueryParams,
  GetAdminMarksResponse,
  GetAdminMarksByIdResponse,
} from './types';

// ==================== Helper Functions ====================

// Helper function to get access token from AsyncStorage
const getAccessToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    return token;
  } catch (error) {
    console.error('[ADMIN API] Error getting access token:', error);
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

// Generic API call function with authentication (admin endpoints require auth)
const authenticatedApiCall = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Authentication required. Please login first.');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[ADMIN API] ${options.method || 'GET'} ${url}`);

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
        console.log(`[ADMIN API] Error data:`, errorData);
      } catch (e) {
        try {
          const text = await response.text();
          console.log(`[ADMIN API] Error response text:`, text);
          if (text) {
            errorMessage = text;
          }
        } catch (textError) {
          console.log(`[ADMIN API] Could not read error response`);
        }
      }

      // Provide user-friendly error messages for common status codes
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (response.status === 403) {
        errorMessage = 'Admin access required to perform this action.';
      } else if (response.status === 404) {
        errorMessage = 'Teacher not found.';
      } else if (response.status === 400) {
        errorMessage = errorMessage || 'Invalid request. Please check your input.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[ADMIN API] Success response:`, data);
    return data;
  } catch (error: any) {
    console.error(`[ADMIN API] Network error:`, error);

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

// ==================== Admin Teacher APIs ====================

/**
 * Get all teachers including unapproved ones (Admin only)
 * @param params Query parameters for filtering and pagination
 * @returns List of teachers with all details
 */
export const getAdminTeachers = async (
  params?: GetAdminTeachersQueryParams,
): Promise<GetAdminTeachersResponse> => {
  const queryString = params ? buildQueryString(params) : '';
  return authenticatedApiCall<GetAdminTeachersResponse>(
    `${API_ENDPOINTS.ADMIN_TEACHERS}${queryString}`,
    {
      method: 'GET',
    },
  );
};

/**
 * Get all teachers pending approval (Admin only)
 * @param params Query parameters for pagination
 * @returns List of teachers with pending_approval status
 */
export const getPendingTeachers = async (
  params?: GetPendingTeachersQueryParams,
): Promise<GetPendingTeachersResponse> => {
  const queryString = params ? buildQueryString(params) : '';
  return authenticatedApiCall<GetPendingTeachersResponse>(
    `${API_ENDPOINTS.ADMIN_TEACHERS_PENDING}${queryString}`,
    {
      method: 'GET',
    },
  );
};

/**
 * Get detailed teacher information for admin review (Admin only)
 * @param teacherId Teacher ID to get details for
 * @returns Full teacher details including verification documents
 */
export const getAdminTeacherById = async (
  teacherId: number,
): Promise<GetAdminTeacherByIdResponse> => {
  return authenticatedApiCall<GetAdminTeacherByIdResponse>(
    API_ENDPOINTS.ADMIN_TEACHER_BY_ID(teacherId),
    {
      method: 'GET',
    },
  );
};

/**
 * Get students under a specific teacher (Admin only)
 */
export const getAdminTeacherStudents = async (
  teacherId: number,
): Promise<GetAdminStudentsResponse> => {
  return authenticatedApiCall<GetAdminStudentsResponse>(
    API_ENDPOINTS.ADMIN_TEACHER_STUDENTS(teacherId),
    { method: 'GET' },
  );
};

/**
 * Get enrolled students for a specific teacher (Admin only)
 */
export const getAdminTeacherEnrolledStudents = async (
  teacherId: number,
  params?: GetAdminTeacherEnrolledStudentsQueryParams,
): Promise<GetAdminTeacherEnrolledStudentsResponse> => {
  const queryString = params ? buildQueryString(params) : '';
  return authenticatedApiCall<GetAdminTeacherEnrolledStudentsResponse>(
    `${API_ENDPOINTS.ADMIN_TEACHER_ENROLLED_STUDENTS(teacherId)}${queryString}`,
    { method: 'GET' },
  );
};

/**
 * Approve or reject a teacher's profile (Admin only)
 * @param teacherId Teacher ID to approve/reject
 * @param data Approval status and optional rejection reason
 * @returns Approval response with updated status
 */
export const approveRejectTeacher = async (
  teacherId: number,
  data: ApproveRejectRequest,
): Promise<ApprovalResponse> => {
  return authenticatedApiCall<ApprovalResponse>(
    API_ENDPOINTS.ADMIN_TEACHER_APPROVE(teacherId),
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
};

/**
 * Approve a teacher's profile (Admin only)
 * Convenience wrapper for approveRejectTeacher
 * @param teacherId Teacher ID to approve
 * @returns Approval response
 */
export const approveTeacher = async (
  teacherId: number,
): Promise<ApprovalResponse> => {
  return approveRejectTeacher(teacherId, {
    status: 'approved',
    rejection_reason: null,
  });
};

/**
 * Reject a teacher's profile (Admin only)
 * Convenience wrapper for approveRejectTeacher
 * @param teacherId Teacher ID to reject
 * @param reason Rejection reason (required)
 * @returns Approval response
 */
export const rejectTeacher = async (
  teacherId: number,
  reason: string,
): Promise<ApprovalResponse> => {
  if (!reason || reason.trim() === '') {
    throw new Error('Rejection reason is required when rejecting a teacher.');
  }

  return approveRejectTeacher(teacherId, {
    status: 'rejected',
    rejection_reason: reason,
  });
};

/**
 * Suspend an approved teacher's profile (Admin only)
 * @param teacherId Teacher ID to suspend
 * @param reason Optional suspension reason
 * @returns Suspension response
 */
export const suspendTeacher = async (
  teacherId: number,
  reason?: string,
): Promise<SuspendTeacherResponse> => {
  const queryString = reason
    ? `?reason=${encodeURIComponent(reason)}`
    : '';

  return authenticatedApiCall<SuspendTeacherResponse>(
    `${API_ENDPOINTS.ADMIN_TEACHER_SUSPEND(teacherId)}${queryString}`,
    {
      method: 'POST',
    },
  );
};

/**
 * Get teacher statistics for admin dashboard (Admin only)
 * @returns Statistics object with counts by status
 */
export const getTeacherStatistics =
  async (): Promise<GetTeacherStatisticsResponse> => {
    return authenticatedApiCall<GetTeacherStatisticsResponse>(
      API_ENDPOINTS.ADMIN_STATS_TEACHERS,
      {
        method: 'GET',
      },
    );
  };

// ==================== Admin Student APIs ====================

/**
 * Get all students (Admin only)
 */
export const getAdminStudents = async (
  params?: GetAdminStudentsQueryParams,
): Promise<GetAdminStudentsResponse> => {
  const queryString = params ? buildQueryString(params) : '';
  return authenticatedApiCall<GetAdminStudentsResponse>(
    `${API_ENDPOINTS.ADMIN_STUDENTS}${queryString}`,
    { method: 'GET' },
  );
};

/**
 * Get student details by ID (Admin only)
 */
export const getAdminStudentById = async (
  studentId: number,
): Promise<GetAdminStudentByIdResponse> => {
  return authenticatedApiCall<GetAdminStudentByIdResponse>(
    API_ENDPOINTS.ADMIN_STUDENT_BY_ID(studentId),
    { method: 'GET' },
  );
};

/**
 * Update a student profile (Admin only)
 */
export const updateAdminStudent = async (
  studentId: number,
  data: UpdateAdminStudentRequest,
): Promise<UpdateAdminStudentResponse> => {
  return authenticatedApiCall<UpdateAdminStudentResponse>(
    API_ENDPOINTS.ADMIN_STUDENT_BY_ID(studentId),
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
};

/**
 * Delete a student profile (Admin only)
 */
export const deleteAdminStudent = async (studentId: number): Promise<void> => {
  await authenticatedApiCall<void>(API_ENDPOINTS.ADMIN_STUDENT_BY_ID(studentId), {
    method: 'DELETE',
  });
};

/**
 * Get student statistics (Admin only)
 */
export const getStudentStatistics = async (): Promise<GetStudentStatisticsResponse> => {
  return authenticatedApiCall<GetStudentStatisticsResponse>(
    API_ENDPOINTS.ADMIN_STATS_STUDENTS,
    { method: 'GET' },
  );
};

// ==================== Admin Enrollment APIs ====================

/**
 * Get all enrollments (Admin only)
 */
export const getAdminEnrollments = async (
  params?: GetAdminEnrollmentsQueryParams,
): Promise<GetAdminEnrollmentsResponse> => {
  const queryString = params ? buildQueryString(params) : '';
  return authenticatedApiCall<GetAdminEnrollmentsResponse>(
    `${API_ENDPOINTS.ADMIN_ENROLLMENTS}${queryString}`,
    { method: 'GET' },
  );
};

/**
 * Get enrollment details by ID (Admin only)
 */
export const getAdminEnrollmentById = async (
  enrollmentId: string,
): Promise<GetAdminEnrollmentByIdResponse> => {
  return authenticatedApiCall<GetAdminEnrollmentByIdResponse>(
    API_ENDPOINTS.ADMIN_ENROLLMENT_BY_ID(enrollmentId),
    { method: 'GET' },
  );
};

/**
 * Approve enrollment (Admin only)
 */
export const approveAdminEnrollment = async (enrollmentId: string) => {
  return authenticatedApiCall(
    API_ENDPOINTS.ADMIN_ENROLLMENT_APPROVE(enrollmentId),
    { method: 'POST' },
  );
};

/**
 * Reject enrollment (Admin only)
 */
export const rejectAdminEnrollment = async (enrollmentId: string) => {
  return authenticatedApiCall(
    API_ENDPOINTS.ADMIN_ENROLLMENT_REJECT(enrollmentId),
    { method: 'POST' },
  );
};

// ==================== Admin Attendance APIs ====================

/**
 * List attendance records (Admin only)
 */
export const getAdminAttendance = async (
  params?: GetAdminAttendanceQueryParams,
): Promise<GetAdminAttendanceResponse> => {
  const queryString = params ? buildQueryString(params) : '';
  return authenticatedApiCall<GetAdminAttendanceResponse>(
    `${API_ENDPOINTS.ADMIN_ATTENDANCE}${queryString}`,
    { method: 'GET' },
  );
};

/**
 * Get attendance record by ID (Admin only)
 */
export const getAdminAttendanceById = async (
  attendanceId: number,
): Promise<GetAdminAttendanceByIdResponse> => {
  return authenticatedApiCall<GetAdminAttendanceByIdResponse>(
    API_ENDPOINTS.ADMIN_ATTENDANCE_BY_ID(attendanceId),
    { method: 'GET' },
  );
};

// ==================== Admin Marks APIs ====================

/**
 * List marks records (Admin only)
 */
export const getAdminMarks = async (
  params?: GetAdminMarksQueryParams,
): Promise<GetAdminMarksResponse> => {
  const queryString = params ? buildQueryString(params) : '';
  return authenticatedApiCall<GetAdminMarksResponse>(
    `${API_ENDPOINTS.ADMIN_MARKS}${queryString}`,
    { method: 'GET' },
  );
};

/**
 * Get marks record by ID (Admin only)
 */
export const getAdminMarksById = async (
  marksId: number,
): Promise<GetAdminMarksByIdResponse> => {
  return authenticatedApiCall<GetAdminMarksByIdResponse>(
    API_ENDPOINTS.ADMIN_MARKS_BY_ID(marksId),
    { method: 'GET' },
  );
};

// ==================== Utility Functions ====================

/**
 * Valid status filter options for admin teacher list
 */
export const VALID_STATUS_FILTERS = [
  'incomplete',
  'pending_approval',
  'approved',
  'rejected',
  'suspended',
] as const;

/**
 * Check if a status filter value is valid
 * @param status Status string to validate
 * @returns Boolean indicating if status is valid
 */
export const isValidStatusFilter = (status: string): boolean => {
  return VALID_STATUS_FILTERS.includes(status as any);
};

/**
 * Get human-readable status label
 * @param status Profile status
 * @returns Formatted status label
 */
export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    incomplete: 'Incomplete',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    suspended: 'Suspended',
  };

  return labels[status] || status;
};

/**
 * Get status color for UI display
 * @param status Profile status
 * @returns Color string for the status
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    incomplete: '#FFA500', // Orange
    pending_approval: '#FFD700', // Gold
    approved: '#4CAF50', // Green
    rejected: '#F44336', // Red
    suspended: '#9E9E9E', // Gray
  };

  return colors[status] || '#757575';
};
