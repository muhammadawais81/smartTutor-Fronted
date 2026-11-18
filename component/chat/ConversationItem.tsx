/**
 * Conversation Item Component
 * 
 * Displays a conversation item in the conversation list.
 * Shows conversation subject, last message preview, unread count, and online status.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Conversation } from '../../api/chat/types';
import { getConversationLastMessage, getOtherParticipant } from './chatUserProfile';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId?: number;
  onPress: (conversation: Conversation) => void;
  onLongPress?: (conversation: Conversation) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  currentUserId,
  onPress,
  onLongPress,
}) => {
  /**
   * Get display name for the other user
   * Uses student_name or teacher_name based on who the current user is
   */
  const getDisplayName = (): string => {
    // If current user is the teacher, show student name
    if (currentUserId === conversation.teacher_id && conversation.student_name) {
      return conversation.student_name;
    }
    
    // If current user is the student, show teacher name
    if (currentUserId === conversation.student_id && conversation.teacher_name) {
      return conversation.teacher_name;
    }
    
    // Fallback: try student_name first (for teacher view), then teacher_name
    if (conversation.student_name) {
      return conversation.student_name;
    }
    
    if (conversation.teacher_name) {
      return conversation.teacher_name;
    }
    
    // Try other_user.full_name
    if (conversation.other_user?.full_name) {
      return conversation.other_user.full_name;
    }
    
    // Try to extract name from subject like "Chat with John Doe"
    if (conversation.subject) {
      const chatWithMatch = conversation.subject.match(/^Chat with (.+)$/i);
      if (chatWithMatch && chatWithMatch[1]) {
        return chatWithMatch[1];
      }
    }
    
    return 'Unknown User';
  };

  /**
   * Format last message timestamp
   */
  const formatLastMessageTime = (timestamp: string | null): string => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  /**
   * Get last message preview text
   */
  const getLastMessagePreview = (): string => {
    const lastMessage = getConversationLastMessage(conversation);
    if (!lastMessage) {
      return 'No messages yet';
    }

    switch (lastMessage.message_type) {
      case 'text':
        return lastMessage.content.length > 50
          ? `${lastMessage.content.substring(0, 50)}...`
          : lastMessage.content;
      case 'image':
        return '📷 Image';
      case 'file':
        return '📎 File';
      case 'audio':
        return '🎵 Audio';
      default:
        return lastMessage.content;
    }
  };

  const hasMessages = !!getConversationLastMessage(conversation);
  const profilePicture = getOtherParticipant(conversation, currentUserId).picture;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(conversation)}
      onLongPress={() => onLongPress?.(conversation)}
      activeOpacity={0.7}
    >
      {/* Avatar (profile picture or initial) */}
      <View style={styles.avatarContainer}>
        {profilePicture ? (
          <Image source={{ uri: profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getDisplayName().charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Online Status Indicator - could be enhanced with real online status */}
        {conversation.status === 'active' && (
          <View style={styles.onlineIndicator} />
        )}
      </View>

      {/* Conversation Details */}
      <View style={styles.detailsContainer}>
        {/* Top Row: Name and Time */}
        <View style={styles.topRow}>
          <Text
            style={[
              styles.name,
              conversation.unread_count && conversation.unread_count > 0 ? styles.unreadText : null,
            ]}
            numberOfLines={1}
          >
            {getDisplayName()}
          </Text>
          
          {conversation.last_message_at ? (
            <Text style={styles.time}>
              {formatLastMessageTime(conversation.last_message_at)}
            </Text>
          ) : null}
        </View>

        {/* Middle Row: Subject - only show if different from name */}
        {conversation.subject && !conversation.subject.toLowerCase().startsWith('chat with') ? (
          <Text style={styles.subject} numberOfLines={1}>
            {conversation.subject}
          </Text>
        ) : null}

        {/* Bottom Row: Last Message Preview */}
        <Text
          style={[
            styles.lastMessage,
            !hasMessages ? styles.noMessage : null,
            conversation.unread_count && conversation.unread_count > 0 ? styles.unreadText : null,
          ]}
          numberOfLines={1}
        >
          {getLastMessagePreview()}
        </Text>
      </View>

      {/* Unread Badge */}
      {conversation.unread_count && conversation.unread_count > 0 ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>
            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10284C',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  detailsContainer: {
    flex: 1,
    marginRight: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10284C',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  subject: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#888',
  },
  noMessage: {
    fontStyle: 'italic',
    color: '#AAA',
  },
  unreadText: {
    fontWeight: '700',
    color: '#10284C',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ConversationItem;
