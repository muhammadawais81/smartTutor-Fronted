/**
 * CHAT SYSTEM INTEGRATION EXAMPLE
 * 
 * This file demonstrates how to integrate the chat system into your React Native app.
 * It shows complete examples of:
 * - Setting up chat navigation
 * - Using ConversationListScreen
 * - Using ChatScreen
 * - Creating new conversations
 * - Handling real-time updates
 */

import React, { useState } from 'react';
import { View, StyleSheet, Button, Alert } from 'react-native';
import { ChatScreen, ConversationListScreen } from './index';
import { chatApi } from '../../api/chat';
import { Conversation } from '../../api/chat/types';

// ============================================================================
// EXAMPLE 1: Simple Chat Integration with Navigation
// ============================================================================

interface ChatContainerProps {
  userToken: string;
  userId: number;
  userRole: 'student' | 'teacher';
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  userToken,
  userId,
  userRole,
}) => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  /**
   * Handle conversation selection from list
   */
  const handleConversationPress = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  /**
   * Handle back from chat screen
   */
  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  /**
   * Handle create new conversation
   */
  const handleCreateNewConversation = () => {
    // Navigate to user selection screen or show modal
    // For this example, we'll show an alert
    Alert.alert(
      'New Conversation',
      'Navigate to user selection screen to start a new conversation'
    );
  };

  return (
    <View style={styles.container}>
      {selectedConversation ? (
        // Show chat screen for selected conversation
        <ChatScreen
          conversationId={selectedConversation.id}
          token={userToken}
          userId={userId}
          onBack={handleBackToList}
        />
      ) : (
        // Show conversation list
        <ConversationListScreen
          token={userToken}
          userId={userId}
          onConversationPress={handleConversationPress}
          onCreateNewConversation={handleCreateNewConversation}
        />
      )}
    </View>
  );
};

// ============================================================================
// EXAMPLE 2: Create New Conversation with Another User
// ============================================================================

const createNewConversationExample = async (
  otherUserId: number,
  subject: string,
  token: string
) => {
  try {
    const conversation = await chatApi.createConversation(
      {
        other_user_id: otherUserId,
        subject: subject,
      },
      token
    );

    console.log('Conversation created:', conversation);
    
    // Navigate to chat screen with new conversation
    // navigation.navigate('ChatScreen', { conversationId: conversation.id });
    
    return conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    Alert.alert('Error', 'Failed to create conversation. Please try again.');
  }
};

// ============================================================================
// EXAMPLE 3: Standalone Conversation List (e.g., in Dashboard)
// ============================================================================

const DashboardWithConversations: React.FC<{
  userToken: string;
  userId: number;
  onNavigateToChat: (conversationId: number) => void;
}> = ({ userToken, userId, onNavigateToChat }) => {
  const handleConversationPress = (conversation: Conversation) => {
    onNavigateToChat(conversation.id);
  };

  return (
    <View style={styles.dashboard}>
      <ConversationListScreen
        token={userToken}
        userId={userId}
        onConversationPress={handleConversationPress}
      />
    </View>
  );
};

// ============================================================================
// EXAMPLE 4: Direct Chat Screen (from notification or deep link)
// ============================================================================

const DirectChatScreen: React.FC<{
  conversationId: number;
  userToken: string;
  userId: number;
  onClose: () => void;
}> = ({ conversationId, userToken, userId, onClose }) => {
  return (
    <ChatScreen
      conversationId={conversationId}
      token={userToken}
      userId={userId}
      onBack={onClose}
    />
  );
};

// ============================================================================
// EXAMPLE 5: Teacher List with "Message" Button
// ============================================================================

const TeacherProfileWithChat: React.FC<{
  teacherId: number;
  teacherName: string;
  userToken: string;
  userId: number;
  onChatCreated: (conversationId: number) => void;
}> = ({ teacherId, teacherName, userToken, userId, onChatCreated }) => {
  const [loading, setLoading] = useState(false);

  const handleMessageTeacher = async () => {
    setLoading(true);
    
    try {
      // Check if conversation already exists
      const conversationsList = await chatApi.listConversations(
        { limit: 100, status: 'all' },
        userToken
      );

      // Find existing conversation with this teacher
      const existingConversation = conversationsList.conversations.find(
        conv => conv.teacher_id === teacherId || conv.student_id === teacherId
      );

      if (existingConversation) {
        // Open existing conversation
        onChatCreated(existingConversation.id);
      } else {
        // Create new conversation
        const newConversation = await chatApi.createConversation(
          {
            other_user_id: teacherId,
            subject: `Chat with ${teacherName}`,
          },
          userToken
        );
        
        onChatCreated(newConversation.id);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.profileActions}>
      <Button
        title={loading ? 'Loading...' : 'Message Teacher'}
        onPress={handleMessageTeacher}
        disabled={loading}
      />
    </View>
  );
};

// ============================================================================
// EXAMPLE 6: Using WebSocket Service Directly
// ============================================================================

import { webSocketService } from '../../services/WebSocketService';

const DirectWebSocketExample = () => {
  const connectToConversation = (conversationId: number, token: string, userId: number) => {
    webSocketService.connect(conversationId, token, {
      onMessage: (messageData) => {
        console.log('New message received:', messageData);
        
        // Update UI with new message
        // If message is not from current user, mark as read
        if (messageData.sender_id !== userId) {
          webSocketService.sendReadReceipt(messageData.id);
        }
      },
      
      onTyping: (typingData) => {
        console.log('User typing:', typingData);
        // Show/hide typing indicator
      },
      
      onUserJoined: (userData) => {
        console.log('User joined:', userData);
        // Update online status
      },
      
      onUserLeft: (userData) => {
        console.log('User left:', userData);
        // Update online status
      },
      
      onOpen: () => {
        console.log('WebSocket connected successfully');
      },
      
      onClose: () => {
        console.log('WebSocket disconnected');
      },
      
      onError: (error) => {
        console.error('WebSocket error:', error);
      },
    });
  };

  const sendMessage = (messageText: string) => {
    webSocketService.sendMessage({
      message_type: 'text',
      content: messageText,
    });
  };

  const notifyTyping = () => {
    webSocketService.sendTyping();
  };

  const disconnect = () => {
    webSocketService.close();
  };

  return {
    connectToConversation,
    sendMessage,
    notifyTyping,
    disconnect,
  };
};

// ============================================================================
// EXAMPLE 7: Chat Statistics in Dashboard
// ============================================================================

import { useEffect, useState } from 'react';
import { ChatStats } from '../../api/chat/types';

const ChatStatisticsWidget: React.FC<{ userToken: string }> = ({ userToken }) => {
  const [stats, setStats] = useState<ChatStats | null>(null);

  useEffect(() => {
    loadStats();

    // Refresh every minute
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const chatStats = await chatApi.getUserStats(userToken);
      setStats(chatStats);
    } catch (error) {
      console.error('Error loading chat stats:', error);
    }
  };

  if (!stats) return null;

  return (
    <View style={styles.statsWidget}>
      <Text>Total Conversations: {stats.total_conversations}</Text>
      <Text>Active: {stats.active_conversations}</Text>
      <Text>Unread Messages: {stats.unread_messages}</Text>
      <Text>Total Messages: {stats.total_messages}</Text>
    </View>
  );
};

// ============================================================================
// EXAMPLE 8: Unread Badge for Tab Navigation
// ============================================================================

const UnreadBadgeExample: React.FC<{ userToken: string }> = ({ userToken }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();

    // Refresh every 10 seconds
    const interval = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const summary = await chatApi.getUnreadSummary(userToken);
      setUnreadCount(summary.total_unread);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  return (
    <View style={styles.badge}>
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dashboard: {
    flex: 1,
  },
  profileActions: {
    padding: 16,
  },
  statsWidget: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    margin: 16,
  },
  badge: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#DC3545',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ChatContainer,
  createNewConversationExample,
  DashboardWithConversations,
  DirectChatScreen,
  TeacherProfileWithChat,
  DirectWebSocketExample,
  ChatStatisticsWidget,
  UnreadBadgeExample,
};
