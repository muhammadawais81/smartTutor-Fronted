/**
 * Chat API Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the chat system.
 * These types match the backend API response structures.
 */

// ============================================================================
// USER TYPES
// ============================================================================

export interface OtherUser {
  id: number;
  email: string;
  full_name: string;
  role: 'student' | 'teacher';
  profile_picture?: string | null;
}

export interface OnlineUser {
  user_id: number;
  email: string;
  full_name: string;
  status: 'online' | 'offline';
}

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export interface Conversation {
  id: number;
  student_id: number;
  teacher_id: number;
  student_name?: string;
  teacher_name?: string;
  student_profile_picture?: string | null;
  teacher_profile_picture?: string | null;
  subject: string;
  status: 'active' | 'archived' | 'closed';
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  message_count?: number;
  unread_count?: number;
  recent_messages?: Message[];
  last_message?: Message | null;
  // Present on the conversation detail response only:
  other_user_id?: number;
  other_user_name?: string;
  other_user_email?: string;
  other_user_profile_picture?: string | null;
  // Legacy/optional nested shape (kept for backward compatibility):
  other_user?: OtherUser;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total_count?: number;
  page?: number;
  page_size?: number;
  // Legacy field name:
  total?: number;
}

export interface CreateConversationRequest {
  teacher_id: number;
  subject?: string;
}

export interface UpdateConversationRequest {
  subject?: string;
  status?: 'active' | 'archived' | 'closed';
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export type MessageType = 'text' | 'file' | 'image' | 'audio';

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  message_type: MessageType;
  content: string;
  file_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageListResponse {
  total: number;
  messages: Message[];
}

export interface SendMessageRequest {
  message_type: MessageType;
  content: string;
  file_url?: string | null;
}

// ============================================================================
// STATISTICS & SUMMARY TYPES
// ============================================================================

export interface UnreadSummary {
  total_unread: number;
  conversations: {
    [conversationId: string]: number;
  };
}

export interface ChatStats {
  total_conversations: number;
  active_conversations: number;
  archived_conversations: number;
  total_messages: number;
  unread_messages: number;
  average_response_time_seconds: number;
}

export interface OnlineUsersResponse {
  online_users: OnlineUser[];
  total: number;
}

export interface MarkReadResponse {
  marked_count: number;
  message: string;
}

// ============================================================================
// WEBSOCKET MESSAGE TYPES
// ============================================================================

export type WebSocketMessageType = 
  | 'message' 
  | 'typing' 
  | 'read' 
  | 'ping' 
  | 'pong' 
  | 'user_joined' 
  | 'user_left' 
  | 'error';

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  data: T;
}

// WebSocket - Outgoing message data types
export interface WSMessageData {
  message_type: MessageType;
  content: string;
  file_url?: string | null;
}

export interface WSReadData {
  message_id: number;
}

export interface WSTypingData {
  // Empty object for typing indicator
}

export interface WSPingData {
  // Empty object for ping
}

// WebSocket - Incoming message data types
export interface WSIncomingMessageData extends Message {
  // Same as Message type
}

export interface WSUserJoinedData {
  user_id: number;
  email: string;
  full_name: string;
}

export interface WSUserLeftData {
  user_id: number;
  email: string;
}

export interface WSTypingIndicatorData {
  user_id: number;
  is_typing: boolean;
}

export interface WSReadReceiptData {
  user_id: number;
  message_id: number;
}

export interface WSErrorData {
  message: string;
  code: number;
}

export interface WSPongData {
  // Empty object for pong
}

// ============================================================================
// API REQUEST QUERY PARAMETERS
// ============================================================================

export interface ConversationListParams {
  skip?: number;
  limit?: number;
  status?: 'all' | 'active' | 'archived' | 'closed';
  sort_by?: 'last_message_at' | 'created_at';
}

export interface MessageListParams {
  skip?: number;
  limit?: number;
}

export interface ConversationDetailParams {
  limit?: number;
}

export interface SearchMessagesParams {
  query: string;
  skip?: number;
  limit?: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApiError {
  status: number;
  message: string;
  detail?: any;
}

export class ChatApiError extends Error {
  status: number;
  detail?: any;

  constructor(message: string, status: number, detail?: any) {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
    this.detail = detail;
  }
}
