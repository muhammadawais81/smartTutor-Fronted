/**
 * WebSocket Service for Real-Time Chat
 * 
 * Manages WebSocket connections for real-time bidirectional communication.
 * Handles connection lifecycle, message sending/receiving, and reconnection.
 * 
 * WebSocket URL: ws://192.168.100.152:8080/ws/conversations/{conversation_id}?token={JWT_TOKEN}
 */

import { WS_BASE_URL, CHAT_ENDPOINTS } from '../api/config';
import {
  WebSocketMessage,
  WSMessageData,
  WSReadData,
  WSTypingData,
  WSPingData,
  WSIncomingMessageData,
  WSUserJoinedData,
  WSUserLeftData,
  WSTypingIndicatorData,
  WSReadReceiptData,
  WSErrorData,
  WSPongData,
} from '../api/chat/types';

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

export type WebSocketEventCallback<T = any> = (data: T) => void;

export interface WebSocketEventHandlers {
  onMessage?: WebSocketEventCallback<WSIncomingMessageData>;
  onTyping?: WebSocketEventCallback<WSTypingIndicatorData>;
  onRead?: WebSocketEventCallback<WSReadReceiptData>;
  onUserJoined?: WebSocketEventCallback<WSUserJoinedData>;
  onUserLeft?: WebSocketEventCallback<WSUserLeftData>;
  onPong?: WebSocketEventCallback<WSPongData>;
  onError?: WebSocketEventCallback<WSErrorData>;
  onOpen?: () => void;
  onClose?: () => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
}

// ============================================================================
// WEBSOCKET SERVICE CLASS
// ============================================================================

export class WebSocketService {
  private ws: WebSocket | null = null;
  private conversationId: number | null = null;
  private token: string | null = null;
  private eventHandlers: WebSocketEventHandlers = {};
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000; // Start with 2 seconds
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isIntentionallyClosed: boolean = false;

  /**
   * Connect to WebSocket for a specific conversation
   * 
   * @param conversationId - ID of the conversation to connect to
   * @param token - JWT authentication token
   * @param eventHandlers - Event callback handlers
   */
  connect(
    conversationId: number,
    token: string,
    eventHandlers: WebSocketEventHandlers = {}
  ): void {
    // Close existing connection if any
    if (this.ws) {
      this.close();
    }

    this.conversationId = conversationId;
    this.token = token;
    this.eventHandlers = eventHandlers;
    this.isIntentionallyClosed = false;

    this.establishConnection();
  }

  /**
   * Establish WebSocket connection
   */
  private establishConnection(): void {
    if (!this.conversationId || !this.token) {
      console.error('Cannot connect: missing conversationId or token');
      return;
    }

    const wsUrl = `${WS_BASE_URL}${CHAT_ENDPOINTS.WS_CONVERSATION(this.conversationId)}?token=${this.token}`;

    try {
      this.ws = new WebSocket(wsUrl);

      // Connection opened
      this.ws.onopen = () => {
        console.log(`WebSocket connected to conversation ${this.conversationId}`);
        this.reconnectAttempts = 0;
        this.reconnectDelay = 2000; // Reset delay
        
        // Start ping interval to keep connection alive
        this.startPingInterval();
        
        if (this.eventHandlers.onOpen) {
          this.eventHandlers.onOpen();
        }

        // If this was a reconnection
        if (this.reconnectAttempts > 0 && this.eventHandlers.onReconnected) {
          this.eventHandlers.onReconnected();
        }
      };

      // Message received
      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleIncomingMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      // Connection error
      this.ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
      };

      // Connection closed
      this.ws.onclose = (event: CloseEvent) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        
        this.stopPingInterval();

        if (this.eventHandlers.onClose) {
          this.eventHandlers.onClose();
        }

        // Attempt reconnection if not intentionally closed
        if (!this.isIntentionallyClosed) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleIncomingMessage(message: WebSocketMessage): void {
    // Guard against malformed messages
    if (!message || !message.type) {
      console.warn('Received invalid WebSocket message:', message);
      return;
    }

    switch (message.type) {
      case 'message':
        if (this.eventHandlers.onMessage && message.data) {
          this.eventHandlers.onMessage(message.data as WSIncomingMessageData);
        }
        break;

      case 'typing':
        if (this.eventHandlers.onTyping && message.data) {
          this.eventHandlers.onTyping(message.data as WSTypingIndicatorData);
        }
        break;

      case 'read':
        if (this.eventHandlers.onRead && message.data) {
          this.eventHandlers.onRead(message.data as WSReadReceiptData);
        }
        break;

      case 'user_joined':
        if (this.eventHandlers.onUserJoined && message.data) {
          this.eventHandlers.onUserJoined(message.data as WSUserJoinedData);
        }
        break;

      case 'user_left':
        if (this.eventHandlers.onUserLeft && message.data) {
          this.eventHandlers.onUserLeft(message.data as WSUserLeftData);
        }
        break;

      case 'pong':
        if (this.eventHandlers.onPong) {
          this.eventHandlers.onPong(message.data as WSPongData);
        }
        break;

      case 'error':
        if (this.eventHandlers.onError && message.data) {
          this.eventHandlers.onError(message.data as WSErrorData);
        }
        console.error('WebSocket error message:', message.data);
        break;

      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  /**
   * Send a chat message
   * 
   * @param messageData - Message data to send
   */
  sendMessage(messageData: WSMessageData): void {
    this.send({
      type: 'message',
      data: messageData,
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(): void {
    this.send({
      type: 'typing',
      data: {},
    });
  }

  /**
   * Send read receipt for a message
   * 
   * @param messageId - ID of the message to mark as read
   */
  sendReadReceipt(messageId: number): void {
    this.send({
      type: 'read',
      data: { message_id: messageId },
    });
  }

  /**
   * Send ping to keep connection alive
   */
  sendPing(): void {
    this.send({
      type: 'ping',
      data: {},
    });
  }

  /**
   * Generic send method
   * 
   * @param message - WebSocket message to send
   */
  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval(); // Clear any existing interval
    
    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 30000);
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    
    if (this.eventHandlers.onReconnecting) {
      this.eventHandlers.onReconnecting();
    }

    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.establishConnection();
      // Exponential backoff: double the delay (max 30 seconds)
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    }, this.reconnectDelay);
  }

  /**
   * Close WebSocket connection
   */
  close(): void {
    this.isIntentionallyClosed = true;
    
    this.stopPingInterval();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.conversationId = null;
    this.token = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection state
   */
  getReadyState(): number | null {
    return this.ws ? this.ws.readyState : null;
  }

  /**
   * Update event handlers
   * 
   * @param handlers - New event handlers to merge
   */
  updateEventHandlers(handlers: Partial<WebSocketEventHandlers>): void {
    this.eventHandlers = {
      ...this.eventHandlers,
      ...handlers,
    };
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();

// Export class for multiple instances
export default WebSocketService;
