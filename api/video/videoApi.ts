import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config';
import type {
  ActiveVideoCallResponse,
  EndVideoCallResponse,
  GenerateVideoTokenRequest,
  GenerateVideoTokenResponse,
  InitiateVideoCallRequest,
  InitiateVideoCallResponse,
  JoinVideoCallRequest,
  JoinVideoCallResponse,
  LeaveVideoCallResponse,
  VideoCallDetailsResponse,
} from './types';

const getAccessToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch (error) {
    console.error('[VIDEO API] Failed to read access token:', error);
    return null;
  }
};

const buildHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseError = async (response: Response) => {
  try {
    const data = await response.json();
    return data?.detail || data?.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const generateAgoraToken = async (
  payload: GenerateVideoTokenRequest,
): Promise<GenerateVideoTokenResponse> => {
  const headers = await buildHeaders();
  const response = await fetch(`${API_BASE_URL}/api/video/token`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const initiateVideoCall = async (
  payload: InitiateVideoCallRequest,
): Promise<InitiateVideoCallResponse> => {
  const headers = await buildHeaders();
  
  console.log('[VIDEO API] Initiating video call...');
  console.log('[VIDEO API] Endpoint:', `${API_BASE_URL}/api/video/initiate`);
  console.log('[VIDEO API] Payload:', JSON.stringify(payload, null, 2));
  console.log('[VIDEO API] Headers:', headers);
  
  const response = await fetch(`${API_BASE_URL}/api/video/initiate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await parseError(response);
    console.error('[VIDEO API] Initiate failed:', error);
    throw new Error(error);
  }

  const data = await response.json();
  console.log('[VIDEO API] Initiate success:', JSON.stringify(data, null, 2));
  console.log('[VIDEO API] ✅ Token Details:');
  console.log('[VIDEO API]   Token:', data.token?.substring(0, 30) + '...');
  if (data.token_status) console.log('[VIDEO API]   Status:', data.token_status);
  if (data.token_generated_at) console.log('[VIDEO API]   Generated:', data.token_generated_at);
  if (data.token_expires_at) console.log('[VIDEO API]   Expires:', data.token_expires_at);
  if (data.token_ttl_seconds) console.log('[VIDEO API]   TTL (seconds):', data.token_ttl_seconds);
  console.log('[VIDEO API]   Channel:', data.channel_name);
  console.log('[VIDEO API]   UID:', data.uid);
  console.log('[VIDEO API]   Call ID:', data.id);
  return data;
};

export const getActiveVideoCall = async (): Promise<ActiveVideoCallResponse | null> => {
  const headers = await buildHeaders();
  const response = await fetch(`${API_BASE_URL}/api/video/active`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const joinVideoCall = async (
  payload: JoinVideoCallRequest,
): Promise<JoinVideoCallResponse> => {
  const headers = await buildHeaders();
  
  console.log('[VIDEO API] Student joining video call...');
  console.log('[VIDEO API] Endpoint:', `${API_BASE_URL}/api/video/join`);
  console.log('[VIDEO API] Payload:', JSON.stringify(payload, null, 2));
  console.log('[VIDEO API] Headers Authorization:', headers.Authorization?.substring(0, 30) + '...');
  
  const response = await fetch(`${API_BASE_URL}/api/video/join`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await parseError(response);
    console.error('[VIDEO API] Join failed:', error);
    throw new Error(error);
  }

  const data = await response.json();
  console.log('[VIDEO API] Join success:', JSON.stringify(data, null, 2));
  console.log('[VIDEO API] ✅ Token Details:');
  console.log('[VIDEO API]   Token:', data.token?.substring(0, 30) + '...');
  if (data.token_status) console.log('[VIDEO API]   Status:', data.token_status);
  if (data.token_generated_at) console.log('[VIDEO API]   Generated:', data.token_generated_at);
  if (data.token_expires_at) console.log('[VIDEO API]   Expires:', data.token_expires_at);
  if (data.token_ttl_seconds) console.log('[VIDEO API]   TTL (seconds):', data.token_ttl_seconds);
  console.log('[VIDEO API]   Channel:', data.channel_name);
  console.log('[VIDEO API]   UID:', data.uid);
  console.log('[VIDEO API]   Teacher ID:', data.teacher_id);
  console.log('[VIDEO API]   Call Status:', data.status);
  return data;
};

export const getVideoCallDetails = async (
  videoCallId: number,
): Promise<VideoCallDetailsResponse> => {
  const headers = await buildHeaders();
  const response = await fetch(`${API_BASE_URL}/api/video/${videoCallId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const leaveVideoCall = async (
  videoCallId: number,
): Promise<LeaveVideoCallResponse> => {
  const headers = await buildHeaders();
  const response = await fetch(`${API_BASE_URL}/api/video/${videoCallId}/leave`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const endVideoCall = async (
  videoCallId: number,
): Promise<EndVideoCallResponse> => {
  const headers = await buildHeaders();
  const response = await fetch(`${API_BASE_URL}/api/video/${videoCallId}/end`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};
