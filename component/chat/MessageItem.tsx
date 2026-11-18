/**
 * Message Item Component
 * 
 * Displays an individual message in the chat interface.
 * Supports different message types (text, file, image, audio).
 * Shows read status, timestamp, and sender information.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Message } from '../../api/chat/types';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
  onLongPress?: (message: Message) => void;
  onFilePress?: (fileUrl: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwnMessage,
  onLongPress,
  onFilePress,
}) => {
  /**
   * Format timestamp for display
   */
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Render message content based on type
   */
  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <Text style={[
            styles.messageText,
            isOwnMessage && styles.ownMessageText,
          ]}>
            {message.content}
          </Text>
        );

      case 'image':
        return (
          <TouchableOpacity
            onPress={() => message.file_url && onFilePress?.(message.file_url)}
          >
            {message.file_url ? (
              <Image
                source={{ uri: message.file_url }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.messageText}>{message.content}</Text>
            )}
          </TouchableOpacity>
        );

      case 'file':
      case 'audio':
        return (
          <TouchableOpacity
            onPress={() => message.file_url && onFilePress?.(message.file_url)}
            style={styles.fileContainer}
          >
            <Text style={[
              styles.fileName,
              isOwnMessage && styles.ownMessageText,
            ]}>
              📎 {message.content}
            </Text>
            {message.file_url && (
              <Text style={[
                styles.fileAction,
                isOwnMessage && styles.ownMessageText,
              ]}>
                Tap to open
              </Text>
            )}
          </TouchableOpacity>
        );

      default:
        return (
          <Text style={[
            styles.messageText,
            isOwnMessage && styles.ownMessageText,
          ]}>
            {message.content}
          </Text>
        );
    }
  };

  return (
    <TouchableOpacity
      onLongPress={() => onLongPress?.(message)}
      style={[
        styles.container,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
      ]}
      activeOpacity={0.7}
    >
      <View style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
      ]}>
        {/* Message Content */}
        {renderMessageContent()}

        {/* Message Footer: Time and Read Status */}
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            isOwnMessage && styles.ownMessageTime,
          ]}>
            {formatTime(message.created_at)}
          </Text>

          {/* Read Status (only for own messages) */}
          {isOwnMessage && (
            <Text style={styles.readStatus}>
              {message.is_read ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 8,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  ownMessageBubble: {
    backgroundColor: '#007AFF', // Blue for own messages
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF', // White for other messages
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#FFFFFF', // White text on blue
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#888',
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  readStatus: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  fileContainer: {
    paddingVertical: 4,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  fileAction: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});

export default MessageItem;
