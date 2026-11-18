// Admin API Types
// Based on Teacher Profile & Admin API Documentation

import type {TeacherDetailResponse, ProfileStatus} from '../teacher/types';
import type {Student, UpdateStudentRequest} from '../student/types';
import type {EnrollmentResponse} from '../enrollment/types';
import type {AttendanceRecord} from '../attendance/types';
import type {MarksRecord} from '../marks/types';

// ==================== Query Parameters ====================

export type AdminStatusFilter =
  | 'incomplete'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface GetAdminTeachersQueryParams {
  skip?: number;
  limit?: number;
  status_filter?: AdminStatusFilter;
}

export interface GetPendingTeachersQueryParams {
  skip?: number;
  limit?: number;
}

export interface GetAdminStudentsQueryParams {
  skip?: number;
  limit?: number;
  city?: string;
  grade_level?: string;
  parent_id?: number;
  search?: string;
}

export interface GetAdminEnrollmentsQueryParams {
  skip?: number;
  limit?: number;
  status_filter?: 'pending' | 'approved' | 'rejected';
  teacher_id?: number;
  student_id?: number;
  subject_id?: number;
  level_id?: number;
}

export interface GetAdminTeacherEnrolledStudentsQueryParams {
  status_filter?: 'pending' | 'approved' | 'rejected';
  subject_id?: number;
  level_id?: number;
  skip?: number;
  limit?: number;
}

export interface GetAdminAttendanceQueryParams {
  skip?: number;
  limit?: number;
  teacher_id?: number;
  student_id?: number;
  subject_id?: number;
  session_date?: string;
  status_filter?: 'present' | 'absent';
}

export interface GetAdminMarksQueryParams {
  skip?: number;
  limit?: number;
  teacher_id?: number;
  student_id?: number;
  subject_id?: number;
  exam_name?: string;
  exam_date?: string;
}

// ==================== Approval Types ====================

export type ApprovalStatus = 'approved' | 'rejected' | 'suspended';

export interface ApproveRejectRequest {
  status: ApprovalStatus;
  rejection_reason?: string | null;
}

export interface ApprovalResponse {
  teacher_id: number;
  profile_status: ProfileStatus;
  approved_by: number | null;
  approval_date: string | null;
  rejection_reason: string | null;
  message: string;
}

// ==================== Statistics Types ====================

export interface TeacherStatistics {
  total_teachers: number;
  incomplete_profiles: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  suspended: number;
}

export interface StudentStatistics {
  total_students: number;
  with_parent_id: number;
  without_parent_id: number;
}

// ==================== Response Type Aliases ====================

export type GetAdminTeachersResponse = TeacherDetailResponse[];
export type GetPendingTeachersResponse = TeacherDetailResponse[];
export type GetAdminTeacherByIdResponse = TeacherDetailResponse;
export type SuspendTeacherResponse = ApprovalResponse;
export type GetTeacherStatisticsResponse = TeacherStatistics;
export type GetAdminStudentsResponse = Student[];
export type GetAdminStudentByIdResponse = Student;
export type UpdateAdminStudentRequest = UpdateStudentRequest;
export type UpdateAdminStudentResponse = Student;
export type GetStudentStatisticsResponse = StudentStatistics;
export type GetAdminEnrollmentsResponse = EnrollmentResponse[];
export type GetAdminEnrollmentByIdResponse = EnrollmentResponse;
export interface AdminTeacherEnrolledStudent {
  enrollment_id: string;
  student_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  teacher_subject: {
    id: number;
    teacher_id: number;
    subject_id: number;
    level_id: number | null;
    fee_per_month: number | null;
    is_active: boolean;
    subject: {
      id: number;
      name: string;
      description: string | null;
    };
  };
  student: {
    student_id: number;
    full_name: string;
    profile_picture: string | null;
    phone?: string | null;
    city?: string | null;
    grade_level?: string | null;
  };
}

export type GetAdminTeacherEnrolledStudentsResponse = AdminTeacherEnrolledStudent[];
export type GetAdminAttendanceResponse = AttendanceRecord[];
export type GetAdminAttendanceByIdResponse = AttendanceRecord;
export type GetAdminMarksResponse = MarksRecord[];
export type GetAdminMarksByIdResponse = MarksRecord;
