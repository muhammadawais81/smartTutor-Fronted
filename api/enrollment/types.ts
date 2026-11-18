// Enrollment API Types

export interface Subject {
  id: number;
  name: string;
  description?: string;
}

export interface TeacherSubject {
  id: number;
  teacher_id: number;
  subject_id: number;
  level_id?: number;
  fee_per_month: number;
  is_active: boolean;
  subject: Subject;
}

export interface EnrollmentResponse {
  id: string;
  student_id: number;
  teacher_subject_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  teacher_subject: TeacherSubject;
}

export interface CreateEnrollmentRequest {
  teacher_id: number;
  subject_id: number;
  level_id?: number;
}

export interface GetTeacherSubjectsParams {
  limit?: number;
  skip?: number;
}

export interface ApproveEnrollmentResponse {
  id: string;
  status: 'approved';
  message: string;
}

export interface RejectEnrollmentResponse {
  id: string;
  status: 'rejected';
  message: string;
}
