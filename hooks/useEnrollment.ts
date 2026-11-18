import {useState, useCallback} from 'react';
import {
  getTeacherSubjects,
  createEnrollment,
  getMyEnrollments,
  getPendingEnrollments,
  approveEnrollment,
  rejectEnrollment,
} from '../api/enrollment';
import type {TeacherSubject, EnrollmentResponse, CreateEnrollmentRequest} from '../api/enrollment/types';

interface UseEnrollmentReturn {
  subjects: TeacherSubject[];
  enrollments: EnrollmentResponse[];
  loading: boolean;
  error: string | null;
  loadingTeacherSubjects: boolean;
  loadingEnrollment: boolean;
  fetchTeacherSubjects: (teacherId: number) => Promise<void>;
  enrollInSubject: (enrollmentData: CreateEnrollmentRequest) => Promise<EnrollmentResponse>;
  fetchMyEnrollments: () => Promise<void>;
  getPendingEnrollments: () => Promise<EnrollmentResponse[]>;
  approveEnrollment: (enrollmentId: string) => Promise<any>;
  rejectEnrollment: (enrollmentId: string) => Promise<any>;
  clearError: () => void;
}

export const useEnrollment = (): UseEnrollmentReturn => {
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTeacherSubjects, setLoadingTeacherSubjects] = useState(false);
  const [loadingEnrollment, setLoadingEnrollment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchTeacherSubjects = useCallback(async (teacherId: number) => {
    setLoadingTeacherSubjects(true);
    setError(null);
    try {
      const data = await getTeacherSubjects(teacherId);
      setSubjects(data);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to load teacher subjects';
      setError(errorMsg);
      console.error('[useEnrollment] Error fetching teacher subjects:', err);
    } finally {
      setLoadingTeacherSubjects(false);
    }
  }, []);

  const enrollInSubject = useCallback(async (enrollmentData: CreateEnrollmentRequest) => {
    setLoadingEnrollment(true);
    setError(null);
    try {
      const response = await createEnrollment(enrollmentData);
      // Refresh enrollments after successful enrollment
      await fetchMyEnrollments();
      return response;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to enroll in subject';
      setError(errorMsg);
      throw err;
    } finally {
      setLoadingEnrollment(false);
    }
  }, []);

  const fetchMyEnrollments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyEnrollments();
      setEnrollments(data);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to load enrollments';
      setError(errorMsg);
      console.error('[useEnrollment] Error fetching enrollments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    subjects,
    enrollments,
    loading,
    error,
    loadingTeacherSubjects,
    loadingEnrollment,
    fetchTeacherSubjects,
    enrollInSubject,
    fetchMyEnrollments,
    getPendingEnrollments: useCallback(async () => {
      setError(null);
      try {
        const data = await getPendingEnrollments();
        return data;
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to load pending enrollments';
        setError(errorMsg);
        throw err;
      }
    }, []),
    approveEnrollment: useCallback(async (enrollmentId: string) => {
      setError(null);
      try {
        const response = await approveEnrollment(enrollmentId);
        return response;
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to approve enrollment';
        setError(errorMsg);
        throw err;
      }
    }, []),
    rejectEnrollment: useCallback(async (enrollmentId: string) => {
      setError(null);
      try {
        const response = await rejectEnrollment(enrollmentId);
        return response;
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to reject enrollment';
        setError(errorMsg);
        throw err;
      }
    }, []),
    clearError,
  };
};
