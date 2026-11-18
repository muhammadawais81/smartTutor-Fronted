import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL, API_ENDPOINTS} from '../config';
import type {
  RegisterRequest,
  RegisterResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from './types';

// Helper function to get AsyncStorage
const getAsyncStorage = async () => {
  try {
    return AsyncStorage;
  } catch (error) {
    console.error('[STORAGE] AsyncStorage not available:', error);
    return null;
  }
};

// Generic API call function
const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;

      try {
        const errorData = await response.json();
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors
            .map(
              (err: any) =>
                `${err.field || 'Error'}: ${err.message || 'Invalid'}`,
            )
            .join('\n');
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
        console.log(`[API] Error data:`, errorData);
      } catch (e) {
        // If response is not JSON, try to get text
        try {
          const text = await response.text();
          console.log(`[API] Error response text:`, text);
          if (text) {
            errorMessage = text;
          }
        } catch (textError) {
          console.log(`[API] Could not read error response`);
        }
      }

      // Provide user-friendly error messages for common status codes
      if (response.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (response.status === 404) {
        errorMessage = 'Endpoint not found. Please check the API configuration.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[API] Success response:`, data);
    return data;
  } catch (error: any) {
    console.error(`[API] Network error:`, error);

    // Provide more specific error messages
    if (
      error.message.includes('Network request failed') ||
      error.message.includes('Failed to fetch')
    ) {
      throw new Error(
        `Network request failed. Please check:\n` +
          `1. Backend is running on ${API_BASE_URL}\n` +
          `2. Both devices are on the same network\n` +
          `3. Firewall allows connections on port 8080\n` +
          `4. Backend is configured to accept connections from network (host=0.0.0.0)\n` +
          `Original error: ${error.message}`,
      );
    }

    throw error;
  }
};

// Register user
export const register = async (
  data: RegisterRequest,
): Promise<RegisterResponse> => {
  return apiCall<RegisterResponse>(API_ENDPOINTS.REGISTER, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Verify email
export const verifyEmail = async (
  data: VerifyEmailRequest,
): Promise<VerifyEmailResponse> => {
  return apiCall<VerifyEmailResponse>(API_ENDPOINTS.VERIFY_EMAIL, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Login
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  try {
    console.log('[LOGIN] Attempting login for:', data.email);

    const response = await apiCall<LoginResponse>(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    console.log('[LOGIN] Login API call successful');

    // Validate response structure
    if (!response || !response.access_token || !response.refresh_token) {
      console.error('[LOGIN] Invalid response structure:', response);
      throw new Error('Invalid response from server. Missing tokens.');
    }

    // Store tokens (non-blocking - login succeeds even if storage fails)
    try {
      const storage = await getAsyncStorage();
      if (storage && storage.setItem) {
        await storage.setItem('access_token', response.access_token);
        await storage.setItem('refresh_token', response.refresh_token);
        if (response.user) {
          await storage.setItem('user', JSON.stringify(response.user));
        }
        console.log('[LOGIN] Tokens stored successfully');
      } else {
        console.warn('[LOGIN] AsyncStorage not available, tokens not stored');
      }
    } catch (storageError: any) {
      // Don't fail login if storage fails - just log it
      console.error(
        '[LOGIN] Error storing tokens (non-critical):',
        storageError,
      );
      console.warn('[LOGIN] Login succeeded but tokens could not be stored');
    }

    console.log('[LOGIN] Login completed successfully');
    return response;
  } catch (error: any) {
    console.error('[LOGIN] Login failed:', error);
    throw error;
  }
};

// Forgot password
export const forgotPassword = async (
  data: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> => {
  return apiCall<ForgotPasswordResponse>(API_ENDPOINTS.FORGOT_PASSWORD, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Reset password
export const resetPassword = async (
  data: ResetPasswordRequest,
): Promise<ResetPasswordResponse> => {
  return apiCall<ResetPasswordResponse>(API_ENDPOINTS.RESET_PASSWORD, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
