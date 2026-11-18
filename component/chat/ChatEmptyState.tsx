/**
 * Empty State Component for Chat
 * 
 * Displays appropriate empty states for different scenarios:
 * - No conversations
 * - No messages in conversation
 * - Search with no results
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface ChatEmptyStateProps {
  type: 'no-conversations' | 'no-messages' | 'no-search-results';
  message?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ type, message }) => {
  const getContent = () => {
    switch (type) {
      case 'no-conversations':
        return {
          icon: '💬',
          title: 'No Conversations Yet',
          description: message || 'Start a conversation with a teacher or student to begin chatting.',
        };
      case 'no-messages':
        return {
          icon: '✉️',
          title: 'No Messages',
          description: message || 'Send a message to start the conversation.',
        };
      case 'no-search-results':
        return {
          icon: '🔍',
          title: 'No Results Found',
          description: message || 'Try searching with different keywords.',
        };
      default:
        return {
          icon: '📭',
          title: 'Nothing Here',
          description: message || '',
        };
    }
  };

  const content = getContent();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{content.icon}</Text>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.description}>{content.description}</Text>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10284C',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ChatEmptyState;
