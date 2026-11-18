export interface ParentProfile {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  must_change_password: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ParentLoginRequest {
  email: string;
  password: string;
}

export interface ParentLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  must_change_password: boolean;
  parent: ParentProfile;
}

export interface ParentChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ParentChangePasswordResponse extends ParentProfile {}

export interface ParentStudentProfile {
  student_id: number;
  user_id?: number;
  full_name?: string;
  name?: string;
  phone?: string;
  city?: string;
  parent_id?: number | null;
  grade_level?: string;
  profile_picture?: string | null;
  created_at?: string;
}

export interface ParentStudentLink {
  id: number;
  parent_id: number;
  student_id: number;
  relationship?: string;
  created_at?: string;
  student?: ParentStudentProfile;
}

export interface ParentAttendanceRecord {
  id: number;
  teacher_id: number;
  student_id: number;
  subject_id: number;
  session_date: string;
  status: 'present' | 'absent' | string;
  class_section?: string | null;
  created_at?: string;
}

export interface ParentMarksRecord {
  id: number;
  teacher_id: number;
  student_id: number;
  subject_id: number;
  exam_name: string;
  marks_obtained: number;
  total_marks: number;
  exam_date: string;
  class_section?: string | null;
  created_at?: string;
}

export interface TeacherAddParentRequest {
  student_id: number;
  name: string;
  email: string;
  phone?: string;
  relationship?: string;
  /** Required only when creating a brand-new parent account */
  temporary_password?: string;
}

export interface TeacherAddParentResponse {
  message: string;
  email: string;
  /** Present when a new parent account was created */
  temporary_password?: string;
  /** Whether backend created a new parent or linked an existing one */
  action?: 'created' | 'linked';
  parent_id?: number;
  student_id?: number;
  is_new_parent?: boolean;
}
