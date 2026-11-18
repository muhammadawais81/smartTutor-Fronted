// Student API Types

export interface CreateStudentRequest {
  user_id: number;
  full_name: string;
  phone?: string;
  city?: string;
  parent_id?: number;
  grade_level?: string;
  profile_picture?: string;
}

export interface Student {
  student_id: number;
  user_id: number;
  full_name: string;
  phone?: string;
  city?: string;
  parent_id?: number;
  grade_level?: string;
  profile_picture?: string;
  created_at: string;
}

export interface CreateStudentResponse extends Student {}

export interface GetStudentsQueryParams {
  skip?: number;
  limit?: number;
  city?: string;
  grade_level?: string;
  parent_id?: number;
  search?: string;
}

export interface GetStudentsResponse extends Array<Student> {}

export interface GetStudentByIdResponse extends Student {}

export interface GetStudentByUserIdResponse extends Student {}

export interface UpdateStudentRequest {
  full_name?: string;
  phone?: string;
  city?: string;
  parent_id?: number;
  grade_level?: string;
  profile_picture?: string;
}

export interface UpdateStudentResponse extends Student {}


