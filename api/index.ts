// Export all API modules
export * from './auth';
export * from './config';
export * from './teacher';
export * from './lookup';
export * from './admin';
export * from './video';
export * from './attendance';
export * from './marks';
export * from './whiteboard';
export * from './parent';
export * from './reviews';
export * from './ai';

// Re-export common types for convenience
export type {
  // Teacher types
  Teacher,
  TeacherDetailResponse,
  TeacherListItem,
  TeacherSubject,
  TeacherAvailability,
  TeachingMode,
  SessionType,
  Gender,
  ProfileStatus,
  GetTeachersQueryParams,
  CreateTeacherRequest,
  CompleteProfileRequest,
  UpdateTeacherRequest,
  AddSubjectsRequest,
  SetAvailabilityRequest,
} from './teacher';

export type {
  // Lookup types
  Subject,
  City,
  EducationLevel,
  LookupData,
} from './lookup';

export type {
  // Admin types
  TeacherStatistics,
  ApprovalResponse,
  AdminStatusFilter,
  ApproveRejectRequest,
} from './admin';
