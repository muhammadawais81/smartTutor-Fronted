export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface AttendanceStudent {
  student_id: number;
  user_id: number;
  full_name: string;
  phone?: string | null;
  city?: string | null;
  parent_id?: number | null;
  grade_level?: string | null;
  profile_picture?: string | null;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  teacher_id: number;
  student_id: number;
  subject_id: number;
  session_date: string;
  status: AttendanceStatus;
  class_section?: string | null;
  created_at: string;
}

export interface AttendanceSummary {
  subject_id: number;
  total_sessions: number;
  present_sessions: number;
  attendance_percentage: number;
}

export type AttendanceMode = 'single' | 'group' | 'full';

export interface SubmitAttendanceRecord {
  student_id: number;
  status: AttendanceStatus;
}

export interface SubmitAttendanceRequest {
  subject_id: number;
  session_date: string;
  class_section?: string;
  mode?: AttendanceMode;
  records: SubmitAttendanceRecord[];
}

export interface UpdateAttendanceRequest {
  status?: AttendanceStatus;
  session_date?: string;
  class_section?: string;
}
