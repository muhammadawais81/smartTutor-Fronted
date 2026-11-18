/**
 * Chat API Service
 * 
 * Provides a comprehensive service layer for all chat-related API operations.
 * All methods handle authentication, error handling, and response parsing.
 * 
 * Base URL: http://192.168.100.152:8080
 */

import { CHAT_API_BASE_URL, CHAT_ENDPOINTS } from '../config';
import {
  Conversation,
  ConversationListResponse,
  CreateConversationRequest,
  UpdateConversationRequest,
  Message,
  MessageListResponse,
  SendMessageRequest,
  UnreadSummary,
  ChatStats,
  OnlineUsersResponse,
  MarkReadResponse,
  ConversationListParams,
  MessageListParams,
  ConversationDetailParams,
  SearchMessagesParams,
  ChatApiError,
} from './types';

// ============================================================================
// CHAT API SERVICE CLASS
// ============================================================================

class ChatApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = CHAT_API_BASE_URL;
  }

  /**
   * Generic request handler with authentication and error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization token if provided
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      console.log(`[ChatAPI] Request: ${options.method || 'GET'} ${this.baseUrl}${endpoint}`);
      if (options.body) {
        console.log('[ChatAPI] Request body:', options.body);
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      // Parse response body
      const data = await response.json().catch(() => null);
      
      console.log('[ChatAPI] Response status:', response.status);
      console.log('[ChatAPI] Response data:', JSON.stringify(data));

      // Handle error responses
      if (!response.ok) {
        // Extract error message properly - log full error for debugging
        console.error('[ChatAPI] Full error response:', JSON.stringify(data, null, 2));
        
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        if (data) {
          if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (Array.isArray(data.detail)) {
            // FastAPI validation errors come as array - extract field info
            errorMessage = data.detail.map((d: any) => {
              const field = d.loc ? d.loc.join('.') : '';
              const msg = d.msg || d.message || '';
              return field ? `${field}: ${msg}` : msg;
            }).join(', ');
          } else if (typeof data.detail === 'object') {
            errorMessage = JSON.stringify(data.detail);
          } else if (data.message) {
            errorMessage = data.message;
          }
        }
        
        throw new ChatApiError(
          errorMessage,
          response.status,
          data
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof ChatApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ChatApiError(
        error instanceof Error ? error.message : 'Network request failed',
        0
      );
    }
  }

  // ==========================================================================
  // CONVERSATION ENDPOINTS
  // ==========================================================================

  /**
   * API #1: Create a new conversation
   * 
   * POST /api/chat/conversations
   * Creates a conversation between current user and another user
   * 
   * @param data - Conversation creation data
   * @param token - JWT authentication token
   * @returns Created conversation object
   */
  async createConversation(
    data: CreateConversationRequest,
    token: string
  ): Promise<Conversation> {
    // Log the exact request being sent
    console.log('[ChatAPI] Creating conversation with teacher_id:', data.teacher_id);
    console.log('[ChatAPI] Request data:', JSON.stringify(data));
    console.log('[ChatAPI] Token present:', !!token);
    
    return this.request<Conversation>(
      CHAT_ENDPOINTS.CONVERSATIONS,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token
    );
  }

  /**
   * API #2: List all conversations for current user
   * 
   * GET /api/chat/conversations
   * Retrieves paginated list of conversations with filters
   * 
   * @param params - Query parameters for filtering and pagination
   * @param token - JWT authentication token
   * @returns List of conversations with total count
   */
  async listConversations(
    params: ConversationListParams = {},
    token: string
  ): Promise<ConversationListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);

    const queryString = queryParams.toString();
    const endpoint = queryString 
      ? `${CHAT_ENDPOINTS.CONVERSATIONS}?${queryString}`
      : CHAT_ENDPOINTS.CONVERSATIONS;

    return this.request<ConversationListResponse>(
      endpoint,
      { method: 'GET' },
      token
    );
  }

  /**
   * API #3: Get conversation details with recent messages
   * 
   * GET /api/chat/conversations/{conversation_id}
   * Retrieves full conversation details including recent messages
   * 
   * @param conversationId - ID of the conversation
   * @param params - Query parameters (limit for recent messages)
   * @param token - JWT authentication token
   * @returns Conversation details with recent messages
   */
  async getConversationDetails(
    conversationId: number,
    params: ConversationDetailParams = {},
    token: string
  ): Promise<Conversation> {
    const queryParams = new URLSearchParams();
    
    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `${CHAT_ENDPOINTS.CONVERSATION_DETAIL(conversationId)}?${queryString}`
      : CHAT_ENDPOINTS.CONVERSATION_DETAIL(conversationId);

    return this.request<Conversation>(
      endpoint,
      { method: 'GET' },
      token
    );
  }

  /**
   * API #4: Update conversation details
   * 
   * PUT /api/chat/conversations/{conversation_id}
   * Updates conversation subject or status
   * 
   * @param conversationId - ID of the conversation
   * @param data - Update data (subject, status)
   * @param token - JWT authentication token
   * @returns Updated conversation object
   */
  async updateConversation(
    conversationId: number,
    data: UpdateConversationRequest,
    token: string
  ): Promise<Conversation> {
    return this.request<Conversation>(
      CHAT_ENDPOINTS.CONVERSATION_DETAIL(conversationId),
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      token
    );
  }

  // ==========================================================================
  // MESSAGE ENDPOINTS
  // ==========================================================================

  /**
   * API #5: Send a message in a conversation
   * 
   * POST /api/chat/conversations/{conversation_id}/messages
   * Sends a new message to a conversation
   * 
   * @param conversationId - ID of the conversation
   * @param data - Message data (type, content, file_url)
   * @param token - JWT authentication token
   * @returns Created message object
   */
  async sendMessage(
    conversationId: number,
    data: SendMessageRequest,
    token: string
  ): Promise<Message> {
    return this.request<Message>(
      CHAT_ENDPOINTS.CONVERSATION_MESSAGES(conversationId),
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token
    );
  }

  /**
   * API #6: Get message history for a conversation
   * 
   * GET /api/chat/conversations/{conversation_id}/messages
   * Retrieves paginated message history
   * 
   * @param conversationId - ID of the conversation
   * @param params - Pagination parameters
   * @param token - JWT authentication token
   * @returns List of messages with total count
   */
  async getMessageHistory(
    conversationId: number,
    params: MessageListParams = {},
    token: string
  ): Promise<MessageListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `${CHAT_ENDPOINTS.CONVERSATION_MESSAGES(conversationId)}?${queryString}`
      : CHAT_ENDPOINTS.CONVERSATION_MESSAGES(conversationId);

    return this.request<MessageListResponse>(
      endpoint,
      { method: 'GET' },
      token
    );
  }

  /**
   * API #7: Mark a single message as read
   * 
   * PUT /api/chat/messages/{message_id}/read
   * Marks a specific message as read
   * 
   * @param messageId - ID of the message
   * @param token - JWT authentication token
   * @returns Updated message object
   */
  async markMessageAsRead(
    messageId: number,
    token: string
  ): Promise<Message> {
    return this.request<Message>(
      CHAT_ENDPOINTS.MESSAGE_READ(messageId),
      {
        method: 'PUT',
        body: JSON.stringify({}),
      },
      token
    );
  }

  /**
   * API #8: Mark all messages in a conversation as read
   * 
   * PUT /api/chat/conversations/{conversation_id}/mark-read
   * Marks all unread messages in conversation as read
   * 
   * @param conversationId - ID of the conversation
   * @param token - JWT authentication token
   * @returns Count of marked messages
   */
  async markAllAsRead(
    conversationId: number,
    token: string
  ): Promise<MarkReadResponse> {
    return this.request<MarkReadResponse>(
      CHAT_ENDPOINTS.CONVERSATION_MARK_READ(conversationId),
      {
        method: 'PUT',
        body: JSON.stringify({}),
      },
      token
    );
  }

  /**
   * API #9: Search messages in a conversation
   * 
   * GET /api/chat/conversations/{conversation_id}/search
   * Searches for messages containing specific text
   * 
   * @param conversationId - ID of the conversation
   * @param params - Search query and pagination
   * @param token - JWT authentication token
   * @returns Matching messages with total count
   */
  async searchMessages(
    conversationId: number,
    params: SearchMessagesParams,
    token: string
  ): Promise<MessageListResponse> {
    const queryParams = new URLSearchParams();
    
    queryParams.append('query', params.query);
    if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

    return this.request<MessageListResponse>(
      `${CHAT_ENDPOINTS.CONVERSATION_SEARCH(conversationId)}?${queryParams.toString()}`,
      { method: 'GET' },
      token
    );
  }

  // ==========================================================================
  // USER & STATISTICS ENDPOINTS
  // ==========================================================================

  /**
   * API #10: Get unread message summary
   * 
   * GET /api/chat/unread/summary
   * Gets count of unread messages per conversation
   * 
   * @param token - JWT authentication token
   * @returns Unread counts by conversation
   */
  async getUnreadSummary(token: string): Promise<UnreadSummary> {
    return this.request<UnreadSummary>(
      CHAT_ENDPOINTS.UNREAD_SUMMARY,
      { method: 'GET' },
      token
    );
  }

  /**
   * API #11: Get user chat statistics
   * 
   * GET /api/chat/stats
   * Retrieves comprehensive chat statistics for user
   * 
   * @param token - JWT authentication token
   * @returns User's chat statistics
   */
  async getUserStats(token: string): Promise<ChatStats> {
    return this.request<ChatStats>(
      CHAT_ENDPOINTS.CHAT_STATS,
      { method: 'GET' },
      token
    );
  }

  /**
   * API #12: Get online users in a conversation
   * 
   * GET /api/chat/conversations/{conversation_id}/online-users
   * Gets list of currently online users
   * 
   * @param conversationId - ID of the conversation
   * @param token - JWT authentication token
   * @returns List of online users
   */
  async getOnlineUsers(
    conversationId: number,
    token: string
  ): Promise<OnlineUsersResponse> {
    return this.request<OnlineUsersResponse>(
      CHAT_ENDPOINTS.CONVERSATION_ONLINE_USERS(conversationId),
      { method: 'GET' },
      token
    );
  }
}

// Export singleton instance
export const chatApi = new ChatApiService();

// Export class for testing or custom instances
export default ChatApiService;
