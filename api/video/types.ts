export interface GenerateVideoTokenRequest {
  channel_name: string;
  uid: number;
}

export interface GenerateVideoTokenResponse {
  token: string;
  channel_name: string;
  uid: number;
  expires_in: number;
}

export type VideoCallType = 'one_to_one' | 'group';

export interface InitiateVideoCallRequest {
  student_id?: number;
  student_ids?: number[];
  subject_id?: number;
  call_type: VideoCallType;
}

export interface InitiateVideoCallResponse {
  id: number;
  channel_name: string;
  call_type: VideoCallType;
  status: 'initiated' | 'ongoing' | 'ended' | 'cancelled';
  call_link: string;
  token: string;
  uid: number;
  message: string;
  token_status?: 'new' | 'reused'; // Optional - added by backend
  token_generated_at?: string; // Optional - ISO timestamp
  token_expires_at?: string; // Optional - ISO timestamp
  token_ttl_seconds?: number; // Optional - Time to live in seconds
}

export interface ActiveVideoCallResponse {
  id: number;
  channel_name: string;
  teacher_name: string;
  teacher_id: number;
  call_type: VideoCallType;
  call_link: string;
  status: 'initiated' | 'ongoing';
}

export interface JoinVideoCallRequest {
  video_call_id: number;
}

export interface JoinVideoCallResponse {
  token: string;
  channel_name: string;
  uid: number;
  teacher_id: number;
  status: 'ongoing';
  message: string;
  token_status?: 'new' | 'reused'; // Optional - added by backend
  token_generated_at?: string; // Optional - ISO timestamp
  token_expires_at?: string; // Optional - ISO timestamp
  token_ttl_seconds?: number; // Optional - Time to live in seconds
}

export interface VideoCallParticipant {
  id: number;
  user_id: number;
  student_id: number | null;
  uid: number;
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
}

export interface VideoCallDetailsResponse {
  id: number;
  teacher_id: number;
  subject_id: number | null;
  call_type: VideoCallType;
  channel_name: string;
  status: 'initiated' | 'ongoing' | 'ended' | 'cancelled';
  call_link: string;
  started_at: string | null;
  ended_at: string | null;
  participants: VideoCallParticipant[];
}

export interface LeaveVideoCallResponse {
  message: string;
  video_call_id: number;
}

export interface EndVideoCallResponse {
  message: string;
  video_call_id: number;
  status: 'ended';
}
