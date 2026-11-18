import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  getAdminTeachers,
  getPendingTeachers,
  approveTeacher,
  rejectTeacher,
  suspendTeacher,
  getTeacherStatistics,
} from '../../api/admin';
import type { TeacherDetailResponse } from '../../api/teacher/types';
import type { TeacherStatistics } from '../../api/admin/types';

/**
 * Hook for managing teacher list with pagination and filtering
 */
export const useTeacherList = () => {
  const [teachers, setTeachers] = useState<TeacherDetailResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeachers = useCallback(
    async (skip = 0, limit = 50, statusFilter?: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdminTeachers({
          skip,
          limit,
          status_filter: statusFilter as any,
        });
        setTeachers(data);
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to load teachers';
        setError(errorMsg);
        Alert.alert('Error', errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { teachers, loading, error, loadTeachers };
};

/**
 * Hook for managing pending teachers list
 */
export const usePendingTeachers = () => {
  const [teachers, setPendingTeachers] = useState<TeacherDetailResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPendingTeachers = useCallback(async (skip = 0, limit = 50) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPendingTeachers({ skip, limit });
      setPendingTeachers(data);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load pending teachers';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { teachers, loading, error, loadPendingTeachers };
};

/**
 * Hook for managing teacher statistics
 */
export const useTeacherStats = () => {
  const [stats, setStats] = useState<TeacherStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTeacherStatistics();
      setStats(data);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load statistics';
      setError(errorMsg);
      console.error('Stats error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, loadStats };
};

/**
 * Hook for teacher approval/rejection actions
 */
export const useTeacherApproval = () => {
  const [processing, setProcessing] = useState(false);

  const handleApprove = useCallback(async (teacherId: number): Promise<boolean> => {
    setProcessing(true);
    try {
      await approveTeacher(teacherId);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve teacher');
      return false;
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleReject = useCallback(
    async (teacherId: number, reason: string): Promise<boolean> => {
      setProcessing(true);
      try {
        await rejectTeacher(teacherId, reason);
        return true;
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to reject teacher');
        return false;
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  const handleSuspend = useCallback(async (teacherId: number, reason?: string): Promise<boolean> => {
    setProcessing(true);
    try {
      await suspendTeacher(teacherId, reason);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to suspend teacher');
      return false;
    } finally {
      setProcessing(false);
    }
  }, []);

  return { processing, handleApprove, handleReject, handleSuspend };
};

/**
 * Utility function to format status for display
 */
export const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ').toLowerCase().split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Utility function to get status color
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    incomplete: '#FFA500',
    pending_approval: '#FFD700',
    approved: '#4CAF50',
    rejected: '#F44336',
    suspended: '#9E9E9E',
  };
  return colors[status] || '#757575';
};

/**
 * Utility function to get status icon
 */
export const getStatusIcon = (status: string): string => {
  const icons: Record<string, string> = {
    incomplete: '⚠️',
    pending_approval: '⏳',
    approved: '✅',
    rejected: '❌',
    suspended: '🚫',
  };
  return icons[status] || '❓';
};
