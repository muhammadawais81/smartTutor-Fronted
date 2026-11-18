import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config';
import type {
	ActiveWhiteboardResponse,
	CreateWhiteboardRoomRequest,
	CreateWhiteboardRoomResponse,
	EndWhiteboardRoomRequest,
	EndWhiteboardRoomResponse,
} from './types';

const getAccessToken = async (): Promise<string | null> => {
	try {
		return await AsyncStorage.getItem('access_token');
	} catch (error) {
		console.error('[WHITEBOARD API] Failed to read access token:', error);
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

export const createWhiteboardRoom = async (
	payload: CreateWhiteboardRoomRequest = {},
): Promise<CreateWhiteboardRoomResponse> => {
	const headers = await buildHeaders();
	const response = await fetch(`${API_BASE_URL}/api/v1/whiteboard/create`, {
		method: 'POST',
		headers,
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(await parseError(response));
	}

	return response.json();
};

export const endWhiteboardRoom = async (
	payload: EndWhiteboardRoomRequest,
): Promise<EndWhiteboardRoomResponse> => {
	const headers = await buildHeaders();
	const response = await fetch(`${API_BASE_URL}/api/v1/whiteboard/end`, {
		method: 'POST',
		headers,
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(await parseError(response));
	}

	return response.json();
};

export const getActiveWhiteboard = async (
	videoCallId?: number,
): Promise<ActiveWhiteboardResponse> => {
	const headers = await buildHeaders();
	const params = new URLSearchParams();
	if (videoCallId) {
		params.append('video_call_id', String(videoCallId));
	}
	const suffix = params.toString() ? `?${params.toString()}` : '';
	const response = await fetch(`${API_BASE_URL}/api/v1/whiteboard/active${suffix}`, {
		method: 'GET',
		headers,
	});

	if (!response.ok) {
		throw new Error(await parseError(response));
	}

	return response.json();
};
