/**
 * Chat Screen Component
 * 
 * Main chat interface for real-time messaging.
 * Features:
 * - Real-time WebSocket communication
 * - Message history with pagination
 * - Typing indicators
 * - Read receipts
 * - Online status
 * - File/image support
 * - Auto-scroll to latest message
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Text,
  Keyboard,
  StatusBar,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatApi } from '../../api/chat/chatApi';
import { webSocketService } from '../../services/WebSocketService';
import {
  Conversation,
  Message,
  WSIncomingMessageData,
  WSTypingIndicatorData,
  WSUserJoinedData,
  WSUserLeftData,
} from '../../api/chat/types';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';
import OnlineStatus from './OnlineStatus';
import ChatEmptyState from './ChatEmptyState';
import { getOtherParticipant } from './chatUserProfile';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface ChatScreenProps {
  conversationId: number;
  token: string;
  userId: number;
  otherUserName?: string;
  otherUserAvatar?: string | null;
  onBack?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const ChatScreen: React.FC<ChatScreenProps> = ({
  conversationId,
  token,
  userId,
  otherUserName,
  otherUserAvatar,
  onBack,
}) => {
  // State
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [skip, setSkip] = useState<number>(0);
  const [otherUserAvatarUrl, setOtherUserAvatarUrl] = useState<string | null>(
    otherUserAvatar ?? null,
  );

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limit = 50;

  /**
   * Initialize: Load conversation details and connect WebSocket
   */
  useEffect(() => {
    initializeChat();

    return () => {
      // Cleanup: Close WebSocket connection
      webSocketService.close();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  /**
   * Initialize chat
   */
  const initializeChat = async () => {
    try {
      setLoading(true);

      // Load conversation details
      const conversationData = await chatApi.getConversationDetails(
        conversationId,
        { limit: 10 },
        token
      );
      setConversation(conversationData);

      // The detail response includes other_user_profile_picture directly.
      const participant = getOtherParticipant(conversationData, userId);
      setOtherUserAvatarUrl(otherUserAvatar ?? participant.picture ?? null);

      // Load message history
      await loadMessages(true);

      // Mark all messages as read
      await chatApi.markAllAsRead(conversationId, token);

      // Connect WebSocket
      connectWebSocket();

      setLoading(false);
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to load chat. Please try again.');
      setLoading(false);
    }
  };

  /**
   * Connect to WebSocket for real-time messaging
   */
  const connectWebSocket = () => {
    webSocketService.connect(conversationId, token, {
      onMessage: handleIncomingMessage,
      onTyping: handleTypingIndicator,
      onUserJoined: handleUserJoined,
      onUserLeft: handleUserLeft,
      onOpen: () => {
        console.log('WebSocket connected');
        setIsOnline(true);
      },
      onClose: () => {
        console.log('WebSocket disconnected');
        setIsOnline(false);
      },
      onReconnecting: () => {
        console.log('WebSocket reconnecting...');
        setIsOnline(false);
      },
      onReconnected: () => {
        console.log('WebSocket reconnected');
        setIsOnline(true);
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
      },
    });
  };

  /**
   * Load message history
   */
  const loadMessages = async (reset: boolean = false) => {
    try {
      const currentSkip = reset ? 0 : skip;

      const response = await chatApi.getMessageHistory(
        conversationId,
        { skip: currentSkip, limit },
        token
      );

      // For non-inverted FlatList:
      // - First item in array appears at TOP of screen
      // - Last item in array appears at BOTTOM of screen
      // 
      // We want oldest at top, newest at bottom (chronological order)
      // So keep messages in ascending order (oldest first)
      
      // Check if API returns descending order (newest first)
      // If so, we need to reverse so oldest is at index 0
      const messagesInCorrectOrder = response.messages.length > 1 && 
        new Date(response.messages[0].created_at) > new Date(response.messages[response.messages.length - 1].created_at)
        ? [...response.messages].reverse()  // API sent newest first, reverse it
        : response.messages;                 // API sent oldest first, keep it
      
      if (reset) {
        setMessages(messagesInCorrectOrder);
        setSkip(limit);
      } else {
        // Prepend older messages at the beginning
        setMessages(prev => [...messagesInCorrectOrder, ...prev]);
        setSkip(prev => prev + limit);
      }

      setHasMore(response.messages.length === limit);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  /**
   * Handle incoming WebSocket message
   */
  const handleIncomingMessage = (messageData: WSIncomingMessageData) => {
    const newMessage: Message = {
      ...messageData,
    };

    // Add new message at the end (non-inverted list shows last item at bottom)
    setMessages(prev => [...prev, newMessage]);

    // Mark as read if not own message
    if (messageData.sender_id !== userId) {
      webSocketService.sendReadReceipt(messageData.id);
      chatApi.markMessageAsRead(messageData.id, token).catch(console.error);
    }

    // Scroll to end to show newest message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  /**
   * Handle typing indicator
   */
  const handleTypingIndicator = (data: WSTypingIndicatorData) => {
    if (!data || data.user_id === undefined) {
      console.warn('Invalid typing data:', data);
      return;
    }
    if (data.user_id !== userId) {
      setIsTyping(data.is_typing);

      // Auto-hide typing indicator after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (data.is_typing) {
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 3000);
      }
    }
  };

  /**
   * Handle user joined
   */
  const handleUserJoined = (data: WSUserJoinedData) => {
    if (!data || data.user_id === undefined) {
      console.warn('Invalid user_joined data:', data);
      return;
    }
    if (data.user_id !== userId) {
      setIsOnline(true);
    }
  };

  /**
   * Handle user left
   */
  const handleUserLeft = (data: WSUserLeftData) => {
    if (!data || data.user_id === undefined) {
      console.warn('Invalid user_left data:', data);
      return;
    }
    if (data.user_id !== userId) {
      setIsOnline(false);
    }
  };

  /**
   * Send message
   */
  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const messageContent = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      // Send via REST API for persistence
      const sentMessage = await chatApi.sendMessage(
        conversationId,
        {
          message_type: 'text',
          content: messageContent,
        },
        token
      );

      // Also send via WebSocket for real-time delivery
      webSocketService.sendMessage({
        message_type: 'text',
        content: messageContent,
      });

      // Add to end since list is non-inverted (oldest first, newest last)
      setMessages(prev => [...prev, sentMessage]);

      // Scroll to end to show newest message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setInputText(messageContent); // Restore message
    } finally {
      setSending(false);
    }
  };

  /**
   * Handle input text change
   */
  const handleInputChange = (text: string) => {
    setInputText(text);

    // Send typing indicator
    if (text.length > 0) {
      webSocketService.sendTyping();
    }
  };

  /**
   * Load more messages (pagination)
   */
  const handleLoadMore = async () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      await loadMessages(false);
      setLoadingMore(false);
    }
  };

  /**
   * Handle message long press
   */
  const handleMessageLongPress = (message: Message) => {
    // Future: Show options like copy, delete, forward, etc.
    Alert.alert('Message Options', 'Feature coming soon!');
  };

  /**
   * Render message item
   */
  const renderMessage = ({ item }: { item: Message }) => (
    <MessageItem
      message={item}
      isOwnMessage={item.sender_id === userId}
      onLongPress={handleMessageLongPress}
    />
  );

  /**
   * Render header loading (shown at bottom in inverted list = top visually when scrolling up)
   */
  const renderHeaderLoader = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.headerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadMoreText}>Loading older messages...</Text>
      </View>
    );
  };

  /**
   * Render typing indicator (shown at bottom in non-inverted list)
   */
  const renderTypingFooter = () => {
    if (!isTyping) return null;
    return (
      <View style={styles.typingContainer}>
        <TypingIndicator
          userName={otherParticipantName}
          showUserName={false}
        />
      </View>
    );
  };

  const otherParticipantName =
    otherUserName ||
    (conversation ? getOtherParticipant(conversation, userId).name : undefined) ||
    'Chat';

  /**
   * Render the message composer / input bar
   */
  const renderInputBar = () => {
    const canSend = !!inputText.trim() && !sending;

    return (
      <View style={styles.inputWrapper}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#8696A0"
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" style={styles.sendIcon} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Render header avatar (profile picture or initial)
   */
  const renderHeaderAvatar = () => {
    const displayName = otherParticipantName || 'U';

    if (otherUserAvatarUrl) {
      return (
        <Image source={{ uri: otherUserAvatarUrl }} style={styles.avatarPlaceholder} />
      );
    }

    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>
          {displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  };

  /**
   * Render empty state
   */
  if (!loading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar backgroundColor="#10284C" barStyle="light-content" />
        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* WhatsApp-style Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {renderHeaderAvatar()}
            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>
                {otherParticipantName}
              </Text>
              <OnlineStatus isOnline={isOnline} showText={true} size="small" />
            </View>
          </View>

          {/* Chat Area with Background */}
          <View style={styles.chatBackground}>
            <ChatEmptyState type="no-messages" />
          </View>

          {/* Input Area */}
          {renderInputBar()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#10284C" barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* WhatsApp-style Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {renderHeaderAvatar()}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherParticipantName}
            </Text>
            <OnlineStatus isOnline={isOnline} showText={true} size="small" />
          </View>
        </View>

        {/* Messages List with WhatsApp background */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <View style={styles.chatBackground}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              contentContainerStyle={[styles.messagesList, messages.length === 0 && styles.emptyList]}
              onStartReached={handleLoadMore}
              onStartReachedThreshold={0.3}
              ListHeaderComponent={renderHeaderLoader}
              ListFooterComponent={renderTypingFooter}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onContentSizeChange={() => {
                // Auto scroll to end when messages load
                if (messages.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
              }}
            />
          </View>
        )}

        {/* Input Area */}
        {renderInputBar()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10284C', // Dark blue for status bar area
  },
  flex1: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light gray chat background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#10284C', // Dark blue header
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 37,
    height: 37,
    borderRadius: 21,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatBackground: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light gray background
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  messagesList: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyList: {
    justifyContent: 'flex-start',
  },
  headerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadMoreText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#888',
  },
  typingContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF3',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 26,
    paddingHorizontal: 6,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E4E8EE',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    color: '#10284C',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 8,
    backgroundColor: '#10284C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10284C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#C2C9D4',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendIcon: {
    marginLeft: 2, // optically center the send glyph
  },
});

export default ChatScreen;
