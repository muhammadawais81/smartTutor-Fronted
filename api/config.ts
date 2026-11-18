// API Configuration
// For physical device: use your computer's IP address
// For Android emulator: use http://10.0.2.2:8000
// For iOS simulator: use http://localhost:8000 or http://127.0.0.1:8000
// For physical device: use http://YOUR_COMPUTER_IP:8000

import {API_BASE_URL as configuredApiBaseUrl} from '@env';

const apiBaseUrl = configuredApiBaseUrl.trim().replace(/\/+$/, '');

if (!apiBaseUrl) {
  throw new Error(
    'API_BASE_URL is not configured. Add it to the root .env file.',
  );
}

// All API clients use the same backend URL configured in the root .env file.
export const API_BASE_URL = apiBaseUrl;
export const CHAT_API_BASE_URL = apiBaseUrl;
export const WS_BASE_URL = apiBaseUrl.replace(/^http/, 'ws');

export const API_ENDPOINTS = {
  // Auth endpoints
  REGISTER: '/api/auth/register',
  VERIFY_EMAIL: '/api/auth/verify-email',
  LOGIN: '/api/auth/login',
  REFRESH_TOKEN: '/api/auth/refresh',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',
  GET_CURRENT_USER: '/api/auth/me',
  LOGOUT: '/api/auth/logout',

  // Teacher endpoints
  TEACHERS: '/api/teachers',
  TEACHER_BY_ID: (teacherId: number) => `/api/teachers/${teacherId}`,
  TEACHER_BY_USER_ID: (userId: number) => `/api/teachers/user/${userId}`,
  TEACHER_ME: '/api/teachers/me',
  TEACHER_COMPLETE_PROFILE: (teacherId: number) =>
    `/api/teachers/${teacherId}/complete-profile`,
  TEACHER_SUBJECTS: (teacherId: number) => `/api/teachers/${teacherId}/subjects`,
  TEACHER_SUBJECT_REMOVE: (teacherId: number, subjectId: number) =>
    `/api/teachers/${teacherId}/subjects/${subjectId}`,
  TEACHER_AVAILABILITY: (teacherId: number) =>
    `/api/teachers/${teacherId}/availability`,

  // Lookup endpoints
  LOOKUP_SUBJECTS: '/api/teachers/lookup/subjects',
  LOOKUP_CITIES: '/api/teachers/lookup/cities',
  LOOKUP_EDUCATION_LEVELS: '/api/teachers/lookup/education-levels',

  // Admin endpoints
  ADMIN_TEACHERS: '/api/admin/teachers',
  ADMIN_TEACHERS_PENDING: '/api/admin/teachers/pending',
  ADMIN_TEACHER_BY_ID: (teacherId: number) => `/api/admin/teachers/${teacherId}`,
  ADMIN_TEACHER_APPROVE: (teacherId: number) =>
    `/api/admin/teachers/${teacherId}/approve`,
  ADMIN_TEACHER_SUSPEND: (teacherId: number) =>
    `/api/admin/teachers/${teacherId}/suspend`,
  ADMIN_TEACHER_STUDENTS: (teacherId: number) =>
    `/api/admin/teachers/${teacherId}/students`,
  ADMIN_TEACHER_ENROLLED_STUDENTS: (teacherId: number) =>
    `/api/admin/teachers/${teacherId}/enrolled-students`,
  ADMIN_STATS_TEACHERS: '/api/admin/stats/teachers',
  ADMIN_STUDENTS: '/api/admin/students',
  ADMIN_STUDENT_BY_ID: (studentId: number) => `/api/admin/students/${studentId}`,
  ADMIN_STATS_STUDENTS: '/api/admin/stats/students',
  ADMIN_ENROLLMENTS: '/api/admin/enrollments',
  ADMIN_ENROLLMENT_BY_ID: (enrollmentId: string) =>
    `/api/admin/enrollments/${enrollmentId}`,
  ADMIN_ENROLLMENT_APPROVE: (enrollmentId: string) =>
    `/api/admin/enrollments/${enrollmentId}/approve`,
  ADMIN_ENROLLMENT_REJECT: (enrollmentId: string) =>
    `/api/admin/enrollments/${enrollmentId}/reject`,
  ADMIN_ATTENDANCE: '/api/admin/attendance',
  ADMIN_ATTENDANCE_BY_ID: (attendanceId: number) =>
    `/api/admin/attendance/${attendanceId}`,
  ADMIN_MARKS: '/api/admin/marks',
  ADMIN_MARKS_BY_ID: (marksId: number) => `/api/admin/marks/${marksId}`,

  // Student endpoints
  STUDENTS: '/api/students',

  // Parent endpoints
  PARENT_LOGIN: '/api/parent/login',
  PARENT_CHANGE_PASSWORD: '/api/parent/change-password',
  PARENT_PROFILE: '/api/parent/profile',
  PARENT_MY_STUDENTS: '/api/parent/my-students',
  PARENT_STUDENT_ATTENDANCE: (studentId: number) =>
    `/api/parent/student/${studentId}/attendance`,
  PARENT_STUDENT_MARKS: (studentId: number) =>
    `/api/parent/student/${studentId}/marks`,

  // Teacher parent-management endpoint
  TEACHER_ADD_PARENT: '/api/teacher/add-parent',

  // Review & rating endpoints
  REVIEW_STUDENT_ELIGIBILITY: (teacherId: number) =>
    `/api/reviews/student/eligibility/${teacherId}`,
  REVIEW_STUDENT_SUBMIT: '/api/reviews/student',
  REVIEW_PARENT_ELIGIBILITY: (teacherId: number, studentId: number) =>
    `/api/reviews/parent/eligibility/${teacherId}?student_id=${studentId}`,
  REVIEW_PARENT_SUBMIT: '/api/reviews/parent',
  REVIEW_TEACHER: (teacherId: number) => `/api/reviews/teacher/${teacherId}`,

  // AI assistant endpoints
  AI_CHAT: '/api/ai/chat',

  // Health check
  HEALTH: '/health',
  ROOT: '/',
};

// Chat API Endpoints (port 8080)
export const CHAT_ENDPOINTS = {
  // Conversation endpoints
  CONVERSATIONS: '/api/chat/conversations',
  CONVERSATION_DETAIL: (id: number) => `/api/chat/conversations/${id}`,
  CONVERSATION_MESSAGES: (id: number) => `/api/chat/conversations/${id}/messages`,
  CONVERSATION_MARK_READ: (id: number) => `/api/chat/conversations/${id}/mark-read`,
  CONVERSATION_SEARCH: (id: number) => `/api/chat/conversations/${id}/search`,
  CONVERSATION_ONLINE_USERS: (id: number) => `/api/chat/conversations/${id}/online-users`,
  
  // Message endpoints
  MESSAGE_READ: (messageId: number) => `/api/chat/messages/${messageId}/read`,
  
  // User endpoints
  UNREAD_SUMMARY: '/api/chat/unread/summary',
  CHAT_STATS: '/api/chat/stats',
  
  // WebSocket endpoint
  WS_CONVERSATION: (conversationId: number) => `/ws/conversations/${conversationId}`,
};
