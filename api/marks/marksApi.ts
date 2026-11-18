import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config';
import type {
  MarksRecord,
  MarksStudent,
  SubmitMarksRequest,
  UpdateMarksRequest,
} from './types';

const getAccessToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch (error) {
    console.error('[MARKS API] Error getting access token:', error);
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

export const getMarksStudentsBySubject = async (
  subjectId: number
): Promise<MarksStudent[]> => {
  const headers = await buildHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/marks/teacher/subjects/${subjectId}/students`,
    {method: 'GET', headers}
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch marks students: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const submitMarks = async (
  payload: SubmitMarksRequest
): Promise<MarksRecord[]> => {
  const headers = await buildHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/marks/teacher/submit`,
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

export const updateMarksRecord = async (
  marksId: number,
  payload: UpdateMarksRequest
): Promise<MarksRecord> => {
  const headers = await buildHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/marks/teacher/${marksId}`,
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

export const deleteMarksRecord = async (marksId: number): Promise<void> => {
  const headers = await buildHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/marks/teacher/${marksId}`,
    {method: 'DELETE', headers}
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg =
      errorData.detail || errorData.message || `HTTP ${response.status}`;
    throw new Error(errorMsg);
  }
};

export const getMarksRecordsBySubject = async (
  subjectId: number,
  examName?: string
): Promise<MarksRecord[]> => {
  const headers = await buildHeaders();
  const query = examName ? `?exam_name=${encodeURIComponent(examName)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/api/marks/teacher/subject/${subjectId}${query}`,
    {method: 'GET', headers}
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch marks records: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const getMyMarksRecords = async (
  subjectId?: number
): Promise<MarksRecord[]> => {
  const headers = await buildHeaders();
  const query = subjectId ? `?subject_id=${encodeURIComponent(subjectId)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/api/marks/my${query}`,
    {method: 'GET', headers}
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch marks records: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};
