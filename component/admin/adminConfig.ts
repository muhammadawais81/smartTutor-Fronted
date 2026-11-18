/**
 * Admin Module Configuration and Constants
 */

// Status types and definitions
export const TEACHER_STATUS = {
  INCOMPLETE: 'incomplete',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;

export type TeacherStatus = typeof TEACHER_STATUS[keyof typeof TEACHER_STATUS];

// Status colors for UI
export const STATUS_COLORS = {
  incomplete: '#FFA500',
  pending_approval: '#FFD700',
  approved: '#4CAF50',
  rejected: '#F44336',
  suspended: '#9E9E9E',
} as const;

// Status icons (emojis)
export const STATUS_ICONS = {
  incomplete: '⚠️',
  pending_approval: '⏳',
  approved: '✅',
  rejected: '❌',
  suspended: '🚫',
} as const;

// Status display labels
export const STATUS_LABELS = {
  incomplete: 'Incomplete Profile',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
} as const;

// Approval action types
export const APPROVAL_ACTIONS = {
  APPROVE: 'approved',
  REJECT: 'rejected',
  SUSPEND: 'suspended',
} as const;

// Day names for availability schedule
export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

// Teaching modes
export const TEACHING_MODES = {
  ONLINE: 'online',
  PHYSICAL: 'physical',
  BOTH: 'both',
} as const;

export const TEACHING_MODE_LABELS = {
  online: 'Online Only',
  physical: 'Physical Only',
  both: 'Both (Online & Physical)',
} as const;

// Session types
export const SESSION_TYPES = {
  ONE_TO_ONE: 'one_to_one',
  GROUP: 'group',
  BOTH: 'both',
} as const;

export const SESSION_TYPE_LABELS = {
  one_to_one: 'One-to-One',
  group: 'Group Sessions',
  both: 'Both',
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  DEFAULT_SKIP: 0,
  MAX_LIMIT: 100,
} as const;

// Validation rules
export const VALIDATION = {
  REJECTION_REASON_MIN_LENGTH: 10,
  REJECTION_REASON_MAX_LENGTH: 1000,
  SEARCH_MIN_LENGTH: 1,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Admin access required.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  INCOMPLETE_PROFILE: 'Cannot approve teacher with incomplete profile.',
  MISSING_REJECTION_REASON: 'Rejection reason is required.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  APPROVE: 'Teacher has been approved successfully!',
  REJECT: 'Teacher has been rejected.',
  SUSPEND: 'Teacher has been suspended.',
  PROFILE_UPDATED: 'Profile has been updated.',
} as const;

// API request/response config
export const API_CONFIG = {
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Filtering options
export const FILTER_OPTIONS = [
  { label: 'All Teachers', value: 'all', icon: '📊' },
  { label: 'Incomplete', value: 'incomplete', icon: '⚠️' },
  { label: 'Pending Approval', value: 'pending_approval', icon: '⏳' },
  { label: 'Approved', value: 'approved', icon: '✅' },
  { label: 'Rejected', value: 'rejected', icon: '❌' },
  { label: 'Suspended', value: 'suspended', icon: '🚫' },
] as const;

// Approval checklist items
export const APPROVAL_CHECKLIST = [
  {
    id: 'profile_complete',
    label: 'Profile Complete',
    key: 'is_profile_complete',
  },
  {
    id: 'degree_certificate',
    label: 'Degree Certificate',
    key: 'degree_certificate',
  },
  {
    id: 'cnic_verified',
    label: 'CNIC Verified',
    key: 'cnic',
  },
  {
    id: 'subjects_added',
    label: 'Subjects Added',
    check: (teacher: any) => teacher.subjects && teacher.subjects.length > 0,
  },
  {
    id: 'availability_set',
    label: 'Availability Set',
    check: (teacher: any) => teacher.availability && teacher.availability.length > 0,
  },
] as const;

/**
 * Get color for a teacher status
 */
export function getStatusColor(status: TeacherStatus): string {
  return STATUS_COLORS[status] || '#757575';
}

/**
 * Get icon for a teacher status
 */
export function getStatusIcon(status: TeacherStatus): string {
  return STATUS_ICONS[status] || '❓';
}

/**
 * Get label for a teacher status
 */
export function getStatusLabel(status: TeacherStatus): string {
  return STATUS_LABELS[status] || status;
}

/**
 * Get day name from day index
 */
export function getDayName(dayIndex: number): string {
  return DAY_NAMES[dayIndex] || 'Unknown';
}

/**
 * Get teaching mode label
 */
export function getTeachingModeLabel(mode: string): string {
  return TEACHING_MODE_LABELS[mode as keyof typeof TEACHING_MODE_LABELS] || mode;
}

/**
 * Get session type label
 */
export function getSessionTypeLabel(type: string): string {
  return SESSION_TYPE_LABELS[type as keyof typeof SESSION_TYPE_LABELS] || type;
}

/**
 * Validate rejection reason
 */
export function validateRejectionReason(reason: string): { valid: boolean; error?: string } {
  if (!reason || reason.trim().length === 0) {
    return {
      valid: false,
      error: 'Rejection reason is required.',
    };
  }

  if (reason.length < VALIDATION.REJECTION_REASON_MIN_LENGTH) {
    return {
      valid: false,
      error: `Reason must be at least ${VALIDATION.REJECTION_REASON_MIN_LENGTH} characters.`,
    };
  }

  if (reason.length > VALIDATION.REJECTION_REASON_MAX_LENGTH) {
    return {
      valid: false,
      error: `Reason cannot exceed ${VALIDATION.REJECTION_REASON_MAX_LENGTH} characters.`,
    };
  }

  return { valid: true };
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return 'N/A';
  return phone;
}

/**
 * Format date for display
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: string | null | undefined): string {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Get approval badge color
 */
export function getApprovalBadgeColor(status: TeacherStatus): {
  backgroundColor: string;
  textColor: string;
} {
  const statusColors = {
    incomplete: { backgroundColor: '#FFF3E0', textColor: '#E65100' },
    pending_approval: { backgroundColor: '#FFFDE7', textColor: '#F57F17' },
    approved: { backgroundColor: '#E8F5E9', textColor: '#2E7D32' },
    rejected: { backgroundColor: '#FFEBEE', textColor: '#C62828' },
    suspended: { backgroundColor: '#F5F5F5', textColor: '#424242' },
  };

  return statusColors[status] || { backgroundColor: '#E0E0E0', textColor: '#424242' };
}

/**
 * Check if teacher status allows approval action
 */
export function canApproveTeacher(status: TeacherStatus, isProfileComplete: boolean): boolean {
  return status === 'pending_approval' && isProfileComplete;
}

/**
 * Check if teacher status allows rejection
 */
export function canRejectTeacher(status: TeacherStatus): boolean {
  return status === 'pending_approval';
}

/**
 * Check if teacher can be suspended
 */
export function canSuspendTeacher(status: TeacherStatus): boolean {
  return status === 'approved';
}

/**
 * Get available actions for teacher status
 */
export function getAvailableActions(
  status: TeacherStatus,
  isProfileComplete: boolean
): ('approve' | 'reject' | 'suspend')[] {
  const actions: ('approve' | 'reject' | 'suspend')[] = [];

  if (canApproveTeacher(status, isProfileComplete)) {
    actions.push('approve');
  }

  if (canRejectTeacher(status)) {
    actions.push('reject');
  }

  if (canSuspendTeacher(status)) {
    actions.push('suspend');
  }

  return actions;
}
