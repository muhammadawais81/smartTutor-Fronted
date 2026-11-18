export {default as AdminDashboard} from './AdminDashboard';
export {default as ManageTeachersScreen} from './ManageTeachersScreen';
export {default as TeacherDetailScreen} from './TeacherDetailScreen';
export {default as TeacherApprovalScreen} from './TeacherApprovalScreen';
export {default as AllTeachersScreen} from './AllTeachersScreen';

// New Admin Screens (Students, Enrollments, Attendance, Marks)
export {default as StudentListScreen} from './StudentListScreen';
export {default as EnrollmentListScreen} from './EnrollmentListScreen';
export {default as AttendanceListScreen} from './AttendanceListScreen';
export {default as MarksListScreen} from './MarksListScreen';

// Theme & Design System
export {
  ADMIN_COLORS,
  ADMIN_SPACING,
  ADMIN_SHADOW,
  ADMIN_RADII,
  getStatusColor as getThemeStatusColor,
  getStatusIcon as getThemeStatusIcon,
  getStatusLabel as getThemeStatusLabel,
} from './adminTheme';

// Hooks and utilities
export {
  useTeacherList,
  usePendingTeachers,
  useTeacherStats,
  useTeacherApproval,
  formatStatus,
  getStatusColor,
  getStatusIcon,
} from './useAdminHooks';

// Configuration and constants
export {
  TEACHER_STATUS,
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_LABELS,
  APPROVAL_ACTIONS,
  DAY_NAMES,
  TEACHING_MODES,
  TEACHING_MODE_LABELS,
  SESSION_TYPES,
  SESSION_TYPE_LABELS,
  PAGINATION,
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  API_CONFIG,
  FILTER_OPTIONS,
  APPROVAL_CHECKLIST,
  getStatusColor as getConfigStatusColor,
  getStatusIcon as getConfigStatusIcon,
  getStatusLabel,
  getDayName,
  getTeachingModeLabel,
  getSessionTypeLabel,
  validateRejectionReason,
  formatPhoneNumber,
  formatDate,
  formatDateTime,
  getApprovalBadgeColor,
  canApproveTeacher,
  canRejectTeacher,
  canSuspendTeacher,
  getAvailableActions,
} from './adminConfig';

export type { TeacherStatus } from './adminConfig';
