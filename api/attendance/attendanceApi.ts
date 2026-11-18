import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config';
import type {
  AttendanceRecord,
  AttendanceStudent,
  AttendanceSummary,
  SubmitAttendanceRequest,
  UpdateAttendanceRequest,
} from './types';

const getAccessToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch (error) {
    console.error('[ATTENDANCE API] Error getting access token:', error);
    return null;
  }
};

const buildHeaders = async () => {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const getAttendanceStudentsBySubject = async (
  subjectId: number
): Promise<AttendanceStudent[]> => {
  const headers = await buildHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/attendance/teacher/subjects/${subjectId}/students`,
    {method: 'GET', headers}
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch attendance students: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const submitAttendance = async (
  payload: SubmitAttendanceRequest
): Promise<AttendanceRecord[]> => {
  const headers = await buildHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/attendance/teacher/submit`,
    {method: 'POST', headers, body: JSON.stringify(payload)}
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg =
      errorData.detail || errorData.message || `HTTP ${response.status}`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const updateAttendanceRecord = async (
  attendanceId: number,
  payload: UpdateAttendanceRequest
): Promise<AttendanceRecord> => {
  const headers = await buildHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/attendance/teacher/${attendanceId}`,
    {method: 'PUT', headers, body: JSON.stringify(payload)}
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg =
      errorData.detail || errorData.message || `HTTP ${response.status}`;
    throw new Error(errorMsg);
  }

  return response.json();
};

export const deleteAttendanceRecord = async (
  attendanceId: number
): Promise<void> => {
  const headers = await buildHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/attendance/teacher/${attendanceId}`,
    {method: 'DELETE', headers}
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg =
      errorData.detail || errorData.message || `HTTP ${response.status}`;
    throw new Error(errorMsg);
  }
};

export const getAttendanceRecordsBySubject = async (
  subjectId: number,
  sessionDate?: string
): Promise<AttendanceRecord[]> => {
  const headers = await buildHeaders();
  const query = sessionDate ? `?session_date=${encodeURIComponent(sessionDate)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/api/attendance/teacher/subject/${subjectId}${query}`,
    {method: 'GET', headers}
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch attendance records: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const getMyAttendanceRecords = async (
  subjectId?: number
): Promise<AttendanceRecord[]> => {
  const headers = await buildHeaders();
  const query = subjectId ? `?subject_id=${encodeURIComponent(subjectId)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/api/attendance/my${query}`,
    {method: 'GET', headers}
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch attendance records: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const getMyAttendanceSummary = async (): Promise<AttendanceSummary[]> => {
  const headers = await buildHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/attendance/my/summary`,
    {method: 'GET', headers}
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch attendance summary: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const getMyAttendanceSummaryBySubject = async (
  subjectId: number
): Promise<AttendanceSummary> => {
  const headers = await buildHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/attendance/my/summary/subject/${subjectId}`,
    {method: 'GET', headers}
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch attendance summary: ${response.status}`);
  }

  return response.json();
};
