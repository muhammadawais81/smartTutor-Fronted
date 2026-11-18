// Teacher Review & Rating API Types

export type ReviewerType = 'student' | 'parent';

export interface Review {
  id: number;
  teacher_id: number;
  reviewer_type: ReviewerType;
  student_id: number | null;
  parent_id: number | null;
  rating: number;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewEligibility {
  can_review: boolean;
  already_reviewed: boolean;
  reason: string | null;
  existing_review: Review | null;
}

export interface StudentReviewRequest {
  teacher_id: number;
  rating: number;
  feedback?: string;
}

export interface ParentReviewRequest {
  teacher_id: number;
  student_id: number;
  rating: number;
  feedback?: string;
}

export interface TeacherReviewsResponse {
  teacher_id: number;
  average_rating: number;
  total_reviews: number;
  reviews: Review[];
}
