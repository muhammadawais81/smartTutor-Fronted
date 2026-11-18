// Auth API Types

export interface RegisterRequest {
  email: string;
  password: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

export interface RegisterResponse {
  message: string;
  user_id: number;
  role: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  role: string;
  must_reset_password: boolean;
  is_active: boolean;
  user_unique_id: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface GetCurrentUserResponse {
  id: number;
  user_unique_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  must_reset_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface LogoutResponse {
  message: string;
}

