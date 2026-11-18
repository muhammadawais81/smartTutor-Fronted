import {API_BASE_URL} from './config';

export type AgoraTokenResponse = {
  appId?: string;
  channel?: string;
  channel_name?: string;
  uid: number;
  token: string;
  expires_in: number;
};

const parseError = async (response: Response) => {
  try {
    const data = await response.json();
    return data?.detail || data?.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const fetchAgoraToken = async (
  channelName: string,
  uid: number,
): Promise<AgoraTokenResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/agora/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel_name: channelName,
      uid,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};
