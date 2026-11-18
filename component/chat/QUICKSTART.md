# 🚀 Quick Start Guide - Smart Tutor Chat Integration

## ⚡ 5-Minute Integration

### Step 1: Update Your Navigation

Add these screens to your navigation stack:

```typescript
// App.tsx or your navigation file
import { ChatScreen } from './component/ChatScreen';
import { ConversationListScreen } from './component/chat/ConversationListScreen';

// In your Stack Navigator
<Stack.Screen
  name="Messages"
  component={ConversationListScreen}
  initialParams={{ token: userToken, userId: currentUserId }}
/>
<Stack.Screen
  name="ChatScreen"
  component={ChatScreen}
  options={{ headerShown: false }}
/>
```

### Step 2: Add Message Button to Teacher/Student Profiles

```typescript
// In TeacherDetailScreen.tsx or StudentProfileScreen.jsx
import { chatApi } from './api/chat';

const handleMessageUser = async () => {
  try {
    // Create or find conversation
    const conversation = await chatApi.createConversation(
      { other_user_id: teacherId, subject: 'Help Request' },
      userToken
    );
    
    navigation.navigate('ChatScreen', {
      conversationId: conversation.id,
      token: userToken,
      userId: currentUserId,
    });
  } catch (error) {
    Alert.alert('Error', 'Failed to start conversation');
  }
};

<TouchableOpacity onPress={handleMessageUser}>
  <Text>💬 Message</Text>
</TouchableOpacity>
```

### Step 3: Add to Dashboard

```typescript
// In StudentDashboard.jsx or TeacherDashboard.jsx
<TouchableOpacity
  onPress={() => navigation.navigate('Messages', {
    token: userToken,
    userId: currentUserId,
  })}
>
  <View>
    <Icon name="chat-bubble" />
    <Text>Messages</Text>
  </View>
</TouchableOpacity>
```

### Step 4: Test the Integration

```typescript
// Create a test conversation
import { chatApi } from './api/chat';

// In your component
useEffect(() => {
  const testChat = async () => {
    try {
      const stats = await chatApi.getUserStats(userToken);
      console.log('✅ Chat system working:', stats);
    } catch (error) {
      console.error('❌ Chat system error:', error);
    }
  };
  
  testChat();
}, []);
```

---

## 🎯 Complete Working Example

```typescript
// ChatIntegration.tsx - Drop this into your app
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ChatScreen } from './component/ChatScreen';
import { ConversationListScreen } from './component/chat/ConversationListScreen';
import { Conversation } from './api/chat/types';

interface Props {
  userToken: string;
  userId: number;
}

const ChatIntegration: React.FC<Props> = ({ userToken, userId }) => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  if (selectedConversation) {
    return (
      <ChatScreen
        conversationId={selectedConversation.id}
        token={userToken}
        userId={userId}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <ConversationListScreen
      token={userToken}
      userId={userId}
      onConversationPress={setSelectedConversation}
    />
  );
};

export default ChatIntegration;
```

### Usage:

```typescript
// In your navigation or main component
<ChatIntegration
  userToken={user.token}
  userId={user.id}
/>
```

---

## 📱 Add Unread Badge to Tab Icon

```typescript
// TabNavigator.tsx or similar
import { useState, useEffect } from 'react';
import { chatApi } from './api/chat';

const MessagesTabIcon = ({ token }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const summary = await chatApi.getUnreadSummary(token);
        setUnreadCount(summary.total_unread);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnread();
    // Refresh every 10 seconds
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <View>
      <Icon name="chat-bubble-outline" size={24} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#DC3545',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
```

---

## 🔧 Configuration Checklist

### ✅ Required Changes:

1. **api/config.ts** - ✅ Already updated with chat URLs
2. **Import components** - Use examples above
3. **Add to navigation** - Add stack screens
4. **Get user token** - From your auth system
5. **Get user ID** - From your user context

### 🎨 Optional Enhancements:

- Add push notifications for new messages
- Add deep linking support
- Customize colors/theme
- Add file upload support
- Add emoji picker

---

## 🐛 Quick Troubleshooting

### Issue: "Cannot connect to chat"
**Solution**: Check if backend is running on port 8080
```bash
# Test with curl
curl http://192.168.100.152:8080/health
```

### Issue: "Unauthorized" error
**Solution**: Verify token is valid
```typescript
console.log('Token:', userToken);
// Should be a valid JWT token
```

### Issue: WebSocket not connecting
**Solution**: Check WebSocket URL
```typescript
// Should be: ws://192.168.100.152:8080
// NOT: http://192.168.100.152:8080
```

### Issue: Messages not appearing
**Solution**: Check conversation ID and user permissions
```typescript
// Verify conversation exists
const conv = await chatApi.getConversationDetails(conversationId, {}, token);
console.log('Conversation:', conv);
```

---

## 📞 Support

**Need Help?**
1. Check [complete README](./README.md)
2. Review [ChatExamples.tsx](./ChatExamples.tsx)
3. Check console logs for errors
4. Verify backend is running and accessible

---

## ✨ You're Done!

The chat system is now fully integrated and ready to use! 

**Next Steps:**
- Test on physical device
- Add your custom styling
- Configure push notifications
- Deploy to production

**Happy Chatting! 💬**
