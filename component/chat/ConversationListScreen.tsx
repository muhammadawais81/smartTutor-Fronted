/**
 * Conversation List Screen
 * 
 * Displays a list of all conversations for the current user.
 * Features:
 * - Pull-to-refresh
 * - Pagination with load more
 * - Unread message counts
 * - Filter by status (active/archived)
 * - Real-time updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { chatApi } from '../../api/chat/chatApi';
import { Conversation, UnreadSummary } from '../../api/chat/types';
import ConversationItem from './ConversationItem';
import ChatEmptyState from './ChatEmptyState';
import { attachLastMessages } from './chatUserProfile';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface ConversationListScreenProps {
  token: string;
  userId: number;
  onConversationPress: (conversation: Conversation) => void;
  onCreateNewConversation?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const ConversationListScreen: React.FC<ConversationListScreenProps> = ({
  token,
  userId,
  onConversationPress,
  onCreateNewConversation,
}) => {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('active');
  
  // Pagination
  const [skip, setSkip] = useState<number>(0);
  const limit = 20;

  /**
   * Load conversations from API
   */
  const loadConversations = useCallback(async (resetList: boolean = false) => {
    try {
      const currentSkip = resetList ? 0 : skip;

      const response = await chatApi.listConversations(
        {
          skip: currentSkip,
          limit,
          status: filter,
          sort_by: 'last_message_at',
        },
        token
      );

      // List only returns last_message_at, so fetch the actual last message text.
      const withPreviews = await attachLastMessages(
        response.conversations,
        id => chatApi.getConversationDetails(id, { limit: 1 }, token),
      );

      if (resetList) {
        setConversations(withPreviews);
        setSkip(limit);
      } else {
        setConversations(prev => [...prev, ...withPreviews]);
        setSkip(prev => prev + limit);
      }

      // Check if there are more conversations to load
      setHasMore(response.conversations.length === limit);
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load conversations. Please try again.');
    }
  }, [token, filter, skip, userId]);

  /**
   * Load unread message summary
   */
  const loadUnreadSummary = useCallback(async () => {
    try {
      const summary = await chatApi.getUnreadSummary(token);
      setUnreadCounts(summary.conversations);
    } catch (error) {
      console.error('Error loading unread summary:', error);
    }
  }, [token]);

  /**
   * Initial load
   */
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([
        loadConversations(true),
        loadUnreadSummary(),
      ]);
      setLoading(false);
    };

    initialize();
  }, [filter]); // Reload when filter changes

  /**
   * Auto-refresh unread counts every 10 seconds
   */
  useEffect(() => {
    const interval = setInterval(() => {
      loadUnreadSummary();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadUnreadSummary]);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    setSkip(0);
    await Promise.all([
      loadConversations(true),
      loadUnreadSummary(),
    ]);
    setRefreshing(false);
  };

  /**
   * Handle load more (pagination)
   */
  const handleLoadMore = async () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      await loadConversations(false);
      setLoadingMore(false);
    }
  };

  /**
   * Handle conversation long press (show options)
   */
  const handleConversationLongPress = (conversation: Conversation) => {
    Alert.alert(
      conversation.subject || 'Conversation',
      'Choose an action',
      [
        {
          text: conversation.status === 'archived' ? 'Unarchive' : 'Archive',
          onPress: () => handleArchiveConversation(conversation),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  /**
   * Archive/Unarchive conversation
   */
  const handleArchiveConversation = async (conversation: Conversation) => {
    try {
      const newStatus = conversation.status === 'archived' ? 'active' : 'archived';
      
      await chatApi.updateConversation(
        conversation.id,
        { status: newStatus },
        token
      );

      // Refresh list
      await handleRefresh();
    } catch (error) {
      console.error('Error updating conversation:', error);
      Alert.alert('Error', 'Failed to update conversation.');
    }
  };

  /**
   * Render conversation item
   */
  const renderConversation = ({ item }: { item: Conversation }) => {
    // Merge unread count from summary
    const conversationWithUnread = {
      ...item,
      unread_count: unreadCounts[item.id.toString()] || item.unread_count || 0,
    };

    return (
      <ConversationItem
        conversation={conversationWithUnread}
        currentUserId={userId}
        onPress={onConversationPress}
        onLongPress={handleConversationLongPress}
      />
    );
  };

  /**
   * Render loading footer
   */
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  /**
   * Render filter tabs
   */
  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterTab, filter === 'active' ? styles.filterTabActive : null]}
        onPress={() => setFilter('active')}
      >
        <Text style={[styles.filterText, filter === 'active' ? styles.filterTextActive : null]}>
          Active
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterTab, filter === 'all' ? styles.filterTabActive : null]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterText, filter === 'all' ? styles.filterTextActive : null]}>
          All
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterTab, filter === 'archived' ? styles.filterTabActive : null]}
        onPress={() => setFilter('archived')}
      >
        <Text style={[styles.filterText, filter === 'archived' ? styles.filterTextActive : null]}>
          Archived
        </Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render empty state
   */
  if (!loading && conversations.length === 0) {
    return (
      <View style={styles.container}>
        {renderFilterTabs()}
        <ChatEmptyState type="no-conversations" />
        {onCreateNewConversation && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={onCreateNewConversation}
          >
            <Text style={styles.createButtonText}>Start New Conversation</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Conversation List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          contentContainerStyle={conversations.length === 0 && styles.emptyList}
        />
      )}

      {/* Floating Action Button for New Conversation */}
      {onCreateNewConversation && (
        <TouchableOpacity
          style={styles.fab}
          onPress={onCreateNewConversation}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
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
    backgroundColor: '#F5F5F5',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  filterTabActive: {
    backgroundColor: '#10284C',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyList: {
    flex: 1,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 40,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10284C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});

export default ConversationListScreen;
