// Lookup API Types
// Based on Teacher Profile & Admin API Documentation

// ==================== Subject Types ====================

export interface Subject {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateSubjectRequest {
  name: string;
  description?: string;
  category?: string;
}

export type CreateSubjectResponse = Subject;
export type GetSubjectsResponse = Subject[];

// ==================== City Types ====================

export interface City {
  id: number;
  name: string;
  province: string | null;
  country: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateCityRequest {
  name: string;
  province?: string;
  country?: string; // Default: "Pakistan"
}

export type CreateCityResponse = City;
export type GetCitiesResponse = City[];

// ==================== Education Level Types ====================

export interface EducationLevel {
  id: number;
  name: string;
  description: string | null;
  order_rank: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateEducationLevelRequest {
  name: string;
  description?: string;
  order_rank?: number;
}

export type CreateEducationLevelResponse = EducationLevel;
export type GetEducationLevelsResponse = EducationLevel[];

// ==================== Lookup Data Bundle ====================

export interface LookupData {
  subjects: Subject[];
  cities: City[];
  educationLevels: EducationLevel[];
}
