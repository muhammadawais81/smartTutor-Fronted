import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, StatusBar } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConversationListScreen from '../chat/ConversationListScreen';
import { Conversation } from '../../api/chat/types';
import { getOtherParticipant } from '../chat/chatUserProfile';

type Props = {
  onBack: () => void;
  onOpenChat: (
    conversationId: number,
    otherUserName?: string,
    otherUserAvatar?: string | null,
  ) => void;
};

const TeacherMessagesScreen: React.FC<Props> = ({ onBack, onOpenChat }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('access_token');
      const u = await AsyncStorage.getItem('user');
      setToken(t);
      setUserId(u ? JSON.parse(u).id : null);
      setLoading(false);
    })();
  }, []);

  if (loading || !token || !userId) {
    return (
      <View style={styles.screen}>
        <StatusBar backgroundColor="#10284C" barStyle="light-content" translucent={false} />
        <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Messages</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
        <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1E88E5" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor="#10284C" barStyle="light-content" translucent={false} />
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right', 'bottom']}>

        <ConversationListScreen
          token={token}
          userId={userId}
          onConversationPress={(conv: Conversation) => {
          // Teacher is viewing - show student name
          // Check if current user is the teacher, then show student name
          let displayName: string | undefined;
          
          if (userId === conv.teacher_id) {
            // Current user is teacher, show student name
            displayName = conv.student_name;
          } else if (userId === conv.student_id) {
            // Current user is student, show teacher name
            displayName = conv.teacher_name;
          }
          
          // Fallback to other fields
          if (!displayName) {
            displayName = conv.student_name || conv.teacher_name || conv.other_user?.full_name;
          }
          
          if (!displayName && conv.subject) {
            const chatWithMatch = conv.subject.match(/^Chat with (.+)$/i);
            if (chatWithMatch && chatWithMatch[1]) {
              displayName = chatWithMatch[1];
            }
          }
          
          onOpenChat(
            conv.id,
            displayName || 'Chat',
            getOtherParticipant(conv, userId).picture,
          );
          }}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10284C' },
  headerSafeArea: { backgroundColor: '#10284C' },
  contentSafeArea: { flex: 1, backgroundColor: '#10284C' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10284C' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 54,
    backgroundColor: '#10284C',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  backButtonText: { fontSize: 28, color: '#FFFFFF' },
  headerTitle: { flex: 1, textAlign: 'left', marginLeft: 6, fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  headerSpacer: { width: 40 },
});

export default TeacherMessagesScreen;