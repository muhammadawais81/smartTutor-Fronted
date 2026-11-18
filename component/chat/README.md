# 📱 Smart Tutor Chat System - Complete Integration Guide

## 🎯 Overview

A production-ready real-time chat system for React Native with comprehensive features including WebSocket support, typing indicators, read receipts, online status, and message pagination.

**Backend Server**: `http://192.168.100.152:8080`  
**WebSocket URL**: `ws://192.168.100.152:8080`

---

## 📂 Project Structure

```
smarttutor/
├── api/
│   ├── config.ts                     # API configuration with chat URLs
│   └── chat/
│       ├── index.ts                  # Chat API exports
│       ├── types.ts                  # TypeScript type definitions
│       └── chatApi.ts                # Chat API service (12 endpoints)
├── services/
│   └── WebSocketService.ts           # Real-time WebSocket service
└── component/
    ├── ChatScreen.tsx                # Main chat interface
    └── chat/
        ├── index.ts                  # Component exports
        ├── ConversationListScreen.tsx # Conversation list with filters
        ├── MessageItem.tsx           # Individual message component
        ├── ConversationItem.tsx      # Conversation list item
        ├── TypingIndicator.tsx       # Animated typing indicator
        ├── OnlineStatus.tsx          # Online/offline indicator
        ├── ChatEmptyState.tsx        # Empty state component
        └── ChatExamples.tsx          # Integration examples
```

---

## 🚀 Quick Start

### 1. Import Components

```typescript
import { ChatScreen, ConversationListScreen } from './component/chat';
import { chatApi } from './api/chat';
```

### 2. Basic Implementation

```typescript
import React, { useState } from 'react';
import { View } from 'react-native';
import { ChatScreen, ConversationListScreen } from './component/chat';
import { Conversation } from './api/chat/types';

const ChatApp = ({ userToken, userId }) => {
  const [selectedConversation, setSelectedConversation] = useState(null);

  return (
    <View style={{ flex: 1 }}>
      {selectedConversation ? (
        <ChatScreen
          conversationId={selectedConversation.id}
          token={userToken}
          userId={userId}
          onBack={() => setSelectedConversation(null)}
        />
      ) : (
        <ConversationListScreen
          token={userToken}
          userId={userId}
          onConversationPress={setSelectedConversation}
        />
      )}
    </View>
  );
};
```

---

## 🔧 API Configuration

The chat system uses separate URLs for main API and chat:

```typescript
// api/config.ts

// Main API (port 8000)
export const API_BASE_URL = 'http://192.168.100.152:8000';

// Chat API (port 8080)
export const CHAT_API_BASE_URL = 'http://192.168.100.152:8080';

// WebSocket (port 8080)
export const WS_BASE_URL = 'ws://192.168.100.152:8080';
```

---

## 📚 Available Components

### ConversationListScreen

Displays all conversations for the current user.

**Props:**
- `token` (string): JWT authentication token
- `userId` (number): Current user ID
- `onConversationPress` (function): Callback when conversation is selected
- `onCreateNewConversation?` (function): Optional callback for creating new conversation

**Features:**
- Pull-to-refresh
- Pagination (load more)
- Filter by status (active/archived/all)
- Real-time unread counts
- Long-press to archive/unarchive

```typescript
<ConversationListScreen
  token={userToken}
  userId={userId}
  onConversationPress={(conversation) => {
    console.log('Selected:', conversation.id);
  }}
  onCreateNewConversation={() => {
    // Navigate to user selection
  }}
/>
```

---

### ChatScreen

Main chat interface with real-time messaging.

**Props:**
- `conversationId` (number): ID of the conversation
- `token` (string): JWT authentication token
- `userId` (number): Current user ID
- `onBack?` (function): Optional callback for back navigation

**Features:**
- Real-time WebSocket communication
- Message history with pagination
- Typing indicators
- Read receipts (✓ sent, ✓✓ read)
- Online/offline status
- Auto-scroll to latest message
- Automatic reconnection on disconnect

```typescript
<ChatScreen
  conversationId={1}
  token={userToken}
  userId={userId}
  onBack={() => navigation.goBack()}
/>
```

---

### UI Components

#### MessageItem
Renders individual message bubbles.

```typescript
<MessageItem
  message={messageObject}
  isOwnMessage={message.sender_id === userId}
  onLongPress={(msg) => console.log('Long press:', msg)}
/>
```

#### ConversationItem
Renders conversation in list.

```typescript
<ConversationItem
  conversation={conversationObject}
  onPress={(conv) => console.log('Selected:', conv)}
  onLongPress={(conv) => console.log('Long press:', conv)}
/>
```

#### TypingIndicator
Animated typing indicator.

```typescript
<TypingIndicator
  userName="John Doe"
  showUserName={true}
/>
```

#### OnlineStatus
Online/offline indicator.

```typescript
<OnlineStatus
  isOnline={true}
  showText={true}
  size="medium"
/>
```

---

## 🌐 API Service Usage

### Chat API Service

All 12 backend endpoints are implemented in `chatApi.ts`:

```typescript
import { chatApi } from './api/chat';

// 1. Create conversation
const conversation = await chatApi.createConversation(
  { other_user_id: 2, subject: 'Math Help' },
  token
);

// 2. List conversations
const { conversations, total } = await chatApi.listConversations(
  { skip: 0, limit: 20, status: 'active' },
  token
);

// 3. Get conversation details
const details = await chatApi.getConversationDetails(1, { limit: 10 }, token);

// 4. Update conversation
const updated = await chatApi.updateConversation(
  1,
  { subject: 'New Subject', status: 'active' },
  token
);

// 5. Send message
const message = await chatApi.sendMessage(
  1,
  { message_type: 'text', content: 'Hello!' },
  token
);

// 6. Get message history
const { messages } = await chatApi.getMessageHistory(
  1,
  { skip: 0, limit: 50 },
  token
);

// 7. Mark message as read
const readMessage = await chatApi.markMessageAsRead(5, token);

// 8. Mark all as read
const result = await chatApi.markAllAsRead(1, token);

// 9. Search messages
const searchResults = await chatApi.searchMessages(
  1,
  { query: 'algebra', skip: 0, limit: 20 },
  token
);

// 10. Get unread summary
const unreadSummary = await chatApi.getUnreadSummary(token);

// 11. Get user stats
const stats = await chatApi.getUserStats(token);

// 12. Get online users
const onlineUsers = await chatApi.getOnlineUsers(1, token);
```

---

## 🔌 WebSocket Service

### Basic Usage

```typescript
import { webSocketService } from './services/WebSocketService';

// Connect to conversation
webSocketService.connect(conversationId, token, {
  onMessage: (messageData) => {
    console.log('New message:', messageData);
  },
  onTyping: (typingData) => {
    console.log('User typing:', typingData);
  },
  onUserJoined: (userData) => {
    console.log('User joined:', userData);
  },
  onUserLeft: (userData) => {
    console.log('User left:', userData);
  },
  onOpen: () => {
    console.log('Connected');
  },
  onClose: () => {
    console.log('Disconnected');
  },
});

// Send message
webSocketService.sendMessage({
  message_type: 'text',
  content: 'Hello!',
});

// Send typing indicator
webSocketService.sendTyping();

// Send read receipt
webSocketService.sendReadReceipt(messageId);

// Close connection
webSocketService.close();
```

### Advanced Features

**Auto-reconnection with exponential backoff:**
- Automatically reconnects on disconnect
- Max 5 attempts with increasing delays
- Configurable in `WebSocketService.ts`

**Keep-alive pings:**
- Sends ping every 30 seconds
- Prevents connection timeout

**Connection status:**
```typescript
const isConnected = webSocketService.isConnected();
const state = webSocketService.getReadyState();
```

---

## 💡 Common Use Cases

### 1. Teacher List with Message Button

```typescript
const MessageTeacherButton = ({ teacherId, token }) => {
  const handleMessage = async () => {
    // Create or find existing conversation
    const conversations = await chatApi.listConversations({ limit: 100 }, token);
    const existing = conversations.conversations.find(
      c => c.teacher_id === teacherId
    );

    if (existing) {
      // Navigate to existing conversation
      navigation.navigate('ChatScreen', { conversationId: existing.id });
    } else {
      // Create new conversation
      const newConv = await chatApi.createConversation(
        { other_user_id: teacherId },
        token
      );
      navigation.navigate('ChatScreen', { conversationId: newConv.id });
    }
  };

  return <Button title="Message" onPress={handleMessage} />;
};
```

### 2. Unread Badge on Tab

```typescript
const ChatTabIcon = ({ token }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnread = async () => {
      const summary = await chatApi.getUnreadSummary(token);
      setUnreadCount(summary.total_unread);
    };

    loadUnread();
    const interval = setInterval(loadUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View>
      <Icon name="chat" />
      {unreadCount > 0 && (
        <Badge value={unreadCount} />
      )}
    </View>
  );
};
```

### 3. Dashboard Statistics

```typescript
const ChatStats = ({ token }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    chatApi.getUserStats(token).then(setStats);
  }, []);

  return (
    <View>
      <Text>Conversations: {stats?.total_conversations}</Text>
      <Text>Unread: {stats?.unread_messages}</Text>
    </View>
  );
};
```

---

## 🎨 Customization

### Styling

All components use StyleSheet. Customize by:

1. **Modify component styles directly**
2. **Pass custom style props** (add to component props)
3. **Use theme provider** (wrap in context)

Example theme colors used:
- Primary Blue: `#007AFF`
- Success Green: `#28A745`
- Danger Red: `#DC3545`
- Gray Text: `#6C757D`
- Background: `#F8F9FA`

### Message Types

Support for multiple message types:
- `text`: Plain text messages
- `image`: Image with preview
- `file`: File attachments
- `audio`: Audio messages

Add custom types in `types.ts` and update `MessageItem.tsx`.

---

## 🔒 Error Handling

All API calls include comprehensive error handling:

```typescript
try {
  const data = await chatApi.sendMessage(conversationId, messageData, token);
} catch (error) {
  if (error.status === 401) {
    // Handle unauthorized - refresh token or logout
  } else if (error.status === 404) {
    // Handle not found
  } else {
    // Handle other errors
    Alert.alert('Error', error.message);
  }
}
```

---

## 📱 Integration with Existing App

### Add to Navigation

```typescript
// In your navigation stack
import { ChatScreen, ConversationListScreen } from './component/chat';

<Stack.Screen
  name="Conversations"
  component={ConversationListScreen}
  options={{ title: 'Messages' }}
/>
<Stack.Screen
  name="Chat"
  component={ChatScreen}
  options={{ title: 'Chat', headerShown: false }}
/>
```

### Add to Student Dashboard

```typescript
<TouchableOpacity
  onPress={() => navigation.navigate('Conversations')}
>
  <Text>Messages</Text>
  <UnreadBadge token={userToken} />
</TouchableOpacity>
```

---

## 🧪 Testing

### Test API Connection

```typescript
import { chatApi } from './api/chat';

const testConnection = async (token) => {
  try {
    const stats = await chatApi.getUserStats(token);
    console.log('✅ API connected:', stats);
  } catch (error) {
    console.error('❌ API error:', error);
  }
};
```

### Test WebSocket

```typescript
import { webSocketService } from './services/WebSocketService';

const testWebSocket = (conversationId, token) => {
  webSocketService.connect(conversationId, token, {
    onOpen: () => console.log('✅ WebSocket connected'),
    onError: (err) => console.error('❌ WebSocket error:', err),
  });
};
```

---

## 🐛 Troubleshooting

### WebSocket Not Connecting

1. Check network connectivity
2. Verify backend is running on port 8080
3. Ensure token is valid
4. Check firewall settings

### Messages Not Appearing

1. Verify WebSocket is connected
2. Check console for errors
3. Ensure conversation ID is correct
4. Verify user has permission

### Typing Indicator Not Showing

1. Check WebSocket connection
2. Verify `onTyping` callback is set
3. Ensure other user is sending typing events

---

## 📄 License

Part of Smart Tutor project.

---

## 🤝 Support

For issues or questions:
1. Check `ChatExamples.tsx` for implementation examples
2. Review API documentation in this README
3. Check console logs for errors
4. Verify backend connectivity

---

## 🔄 Updates & Maintenance

**Current Version**: 1.0.0

### Changelog

**v1.0.0** - Initial Release
- Full chat system implementation
- 12 REST API endpoints
- WebSocket real-time messaging
- Typing indicators & read receipts
- Online status tracking
- Message pagination
- Conversation filtering
- Production-ready error handling

---

## 📋 Checklist for Integration

- [ ] Update `api/config.ts` with correct URLs
- [ ] Import components in your app
- [ ] Add navigation screens
- [ ] Test API connectivity
- [ ] Test WebSocket connection
- [ ] Implement authentication flow
- [ ] Add unread badge to tab navigation
- [ ] Test on physical device
- [ ] Handle deep linking (optional)
- [ ] Add push notifications (optional)

---

**Happy Coding! 🚀**
