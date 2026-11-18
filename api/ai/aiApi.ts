/**
 * AI Assistant API Service
 *
 * Talks to the teacher assistant agent.
 * Endpoint: POST /api/ai/chat  body: { message: string }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL, API_ENDPOINTS} from '../config';
import {AiChatRequest, AiChatResponse, AiApiError} from './types';

const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch (error) {
    console.error('[AI] Failed to read auth token:', error);
    return null;
  }
};

/**
 * Pull the assistant's text reply out of whatever response shape we get back.
 */
const extractReply = (data: AiChatResponse | string | null): string => {
  if (!data) {
    return '';
  }

  if (typeof data === 'string') {
    return data;
  }

  const directKeys = ['response', 'reply', 'answer', 'message', 'content', 'text'];
  for (const key of directKeys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  // Nested under `data`
  if (data.data) {
    if (typeof data.data === 'string') {
      return data.data;
    }
    const nested = data.data;
    for (const key of ['response', 'reply', 'answer', 'content']) {
      const value = (nested as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
  }

  return '';
};

/**
 * Send a message to the teacher assistant agent and get the reply text.
 */
export const sendAiMessage = async (message: string): Promise<string> => {
  const token = await getToken();
  const url = `${API_BASE_URL}${API_ENDPOINTS.AI_CHAT}`;
  const body: AiChatRequest = {message};

  try {
    console.log(`[AI] POST ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = `Request failed (${response.status})`;
      if (data) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail
            .map((d: any) => d?.msg || d?.message || '')
            .filter(Boolean)
            .join(', ');
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      throw new AiApiError(errorMessage, response.status, data);
    }

    const reply = extractReply(data);
    if (!reply) {
      return 'I received an empty response. Please try asking again.';
    }
    return reply;
  } catch (error) {
    if (error instanceof AiApiError) {
      throw error;
    }
    console.error('[AI] Network error:', error);
    throw new AiApiError(
      'Network request failed. Please check your connection and try again.',
      0,
    );
  }
};
