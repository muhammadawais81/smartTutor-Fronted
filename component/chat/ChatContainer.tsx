import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatScreen from './ChatScreen';

type Props = {
  conversationId: number;
  otherUserName?: string;
  otherUserAvatar?: string | null;
  onBack: () => void;
};

const ChatContainer: React.FC<Props> = ({
  conversationId,
  otherUserName,
  otherUserAvatar,
  onBack,
}) => {
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
      <SafeAreaView style={styles.center} edges={['top', 'left', 'right']}>
        <StatusBar backgroundColor="#10284C" barStyle="light-content" />
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <ChatScreen
      conversationId={conversationId}
      token={token}
      userId={userId}
      otherUserName={otherUserName}
      otherUserAvatar={otherUserAvatar}
      onBack={onBack}
    />
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10284C' },
});

export default ChatContainer;