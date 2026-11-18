// Teacher API Types
// Based on Teacher Profile & Admin API Documentation

// ==================== Enums ====================

export type TeachingMode = 'online' | 'physical' | 'both';
export type SessionType = 'one_to_one' | 'group' | 'both';
export type Gender = 'male' | 'female' | 'other';
export type ProfileStatus =
  | 'incomplete'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'suspended';

// ==================== Lookup Types ====================

export interface Subject {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface City {
  id: number;
  name: string;
  province: string | null;
  country: string;
  is_active: boolean;
  created_at: string;
}

export interface EducationLevel {
  id: number;
  name: string;
  description: string | null;
  order_rank: number;
  is_active: boolean;
  created_at: string;
}

// ==================== Teacher Subject Types ====================

export interface TeacherSubject {
  id: number;
  subject_id: number;
  level_id: number | null;
  fee_per_month: number | null;
  is_active: boolean;
  subject: Subject;
  level: EducationLevel | null;
}

export interface AddSubjectItem {
  subject_id: number;
  level_id?: number;
  fee_per_month?: number;
}

export interface AddSubjectsRequest {
  subjects: AddSubjectItem[];
}

// ==================== Teacher Availability Types ====================

export interface TeacherAvailability {
  id: number;
  day_of_week: number; // 0=Monday, 1=Tuesday, ... 6=Sunday
  start_time: string; // Format: "HH:MM" (24-hour)
  end_time: string; // Format: "HH:MM" (24-hour)
  is_active: boolean;
  created_at: string;
}

export interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface SetAvailabilityRequest {
  availability: AvailabilitySlot[];
}

// ==================== Teacher Profile Types ====================

export interface CreateTeacherRequest {
  user_id: number;
  full_name: string;
  phone?: string;
  teaching_mode?: TeachingMode;
}

export interface CompleteProfileRequest {
  full_name: string;
  profile_picture: string;
  gender?: Gender;
  date_of_birth?: string; // Format: YYYY-MM-DD
  phone: string;
  highest_qualification: string;
  institute: string;
  experience_years: number;
  teaching_mode: TeachingMode;
  bio: string; // 10-2000 chars
  session_type: SessionType;
  city_id: number;
  area?: string;
  latitude?: number;
  longitude?: number;
  physical_teaching_radius?: number; // in km
  cnic?: string;
  cnic_image?: string;
  degree_certificate?: string;
}

export interface UpdateTeacherRequest {
  full_name?: string;
  profile_picture?: string;
  gender?: Gender;
  date_of_birth?: string;
  phone?: string;
  highest_qualification?: string;
  institute?: string;
  experience_years?: number;
  teaching_mode?: TeachingMode;
  bio?: string;
  session_type?: SessionType;
  city_id?: number;
  area?: string;
  latitude?: number;
  longitude?: number;
  physical_teaching_radius?: number;
  cnic?: string;
  cnic_image?: string;
  degree_certificate?: string;
}

// ==================== Teacher Response Types ====================

export interface Teacher {
  teacher_id: number;
  user_id: number;
  full_name: string;
  profile_picture: string | null;
  gender: Gender | null;
  date_of_birth: string | null;
  phone: string | null;
  highest_qualification: string | null;
  institute: string | null;
  experience_years: number | null;
  teaching_mode: TeachingMode;
  bio: string | null;
  session_type: SessionType | null;
  city_id: number | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  physical_teaching_radius: number | null;
  profile_status: ProfileStatus;
  is_profile_complete: boolean;
  rating: number;
  total_reviews: number;
  total_students: number;
  created_at: string;
  updated_at: string;
  qualification: string | null; // Legacy field
  hourly_rate: number | null; // Legacy field
}

export interface TeacherListItem extends Teacher {
  subjects: TeacherSubject[];
  availability: TeacherAvailability[];
}

export interface TeacherDetailResponse extends Teacher {
  subjects: TeacherSubject[];
  availability: TeacherAvailability[];
  city: City | null;
  cnic: string | null;
  cnic_image?: string | null;
  cnic_back_image?: string | null;
  degree_certificate: string | null;
  approved_by: number | null;
  approval_date: string | null;
  rejection_reason: string | null;
}

// ==================== Query Parameters ====================

export interface GetTeachersQueryParams {
  skip?: number;
  limit?: number;
  city_id?: number;
  teaching_mode?: TeachingMode;
  min_rating?: number;
  search?: string;
  subject_id?: number;
}

export interface RemoveSubjectQueryParams {
  level_id?: number;
}

// ==================== Response Type Aliases ====================

export type CreateTeacherResponse = Teacher;
export type GetTeachersResponse = TeacherListItem[];
export type GetTeacherByIdResponse = TeacherDetailResponse;
export type GetTeacherByUserIdResponse = TeacherDetailResponse;
export type GetMyProfileResponse = TeacherDetailResponse;
export type CompleteProfileResponse = TeacherDetailResponse;
export type UpdateTeacherResponse = TeacherDetailResponse;
export type AddSubjectsResponse = TeacherSubject[];
export type GetSubjectsResponse = TeacherSubject[];
export type SetAvailabilityResponse = TeacherAvailability[];
export type GetAvailabilityResponse = TeacherAvailability[];


