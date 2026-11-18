export interface MarksStudent {
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

export interface MarksRecord {
  id: number;
  teacher_id: number;
  student_id: number;
  subject_id: number;
  exam_name: string;
  marks_obtained: number;
  total_marks: number;
  exam_date: string;
  class_section?: string | null;
  created_at: string;
}

export type MarksMode = 'single' | 'group';

export interface SubmitMarksRecord {
  student_id: number;
  marks_obtained: number;
  total_marks?: number;
}

export interface SubmitMarksRequest {
  subject_id: number;
  exam_name: string;
  exam_date: string;
  class_section?: string;
  total_marks: number;
  mode?: MarksMode;
  records: SubmitMarksRecord[];
}

export interface UpdateMarksRequest {
  marks_obtained?: number;
  total_marks?: number;
  exam_name?: string;
  exam_date?: string;
  class_section?: string;
}
