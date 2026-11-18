/**
 * Teacher Assistant Screen
 *
 * A ChatGPT-style chatbot for teachers, powered by POST /api/ai/chat.
 * Assistant replies are rendered as rich markdown.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Keyboard,
  Platform,
  ActivityIndicator,
  StatusBar,
  ListRenderItemInfo,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {sendAiMessage, AiApiError} from '../../api/ai';
import MarkdownText from '../common/MarkdownText';

interface TeacherAssistantScreenProps {
  onBack?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  error?: boolean;
}

const SUGGESTIONS = [
  'Create a 5-question quiz on Web Development',
  'Write a lesson plan for fractions (Grade 5)',
  'Give feedback ideas for a struggling student',
  'Give me attandance and Marks Report for the students',
];

const PRIMARY = '#10284C';
const ACCENT = '#2563EB';

const TeacherAssistantScreen: React.FC<TeacherAssistantScreenProps> = ({onBack}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const keyboardUp = keyboardHeight > 0;

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, e => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({animated: true});
    });
  }, []);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || sending) {
        return;
      }

      const userMessage: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text,
      };

      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setSending(true);
      scrollToEnd();

      try {
        const reply = await sendAiMessage(text);
        setMessages(prev => [
          ...prev,
          {id: `a-${Date.now()}`, role: 'assistant', text: reply},
        ]);
      } catch (error) {
        const message =
          error instanceof AiApiError
            ? error.message
            : 'Something went wrong. Please try again.';
        setMessages(prev => [
          ...prev,
          {id: `e-${Date.now()}`, role: 'assistant', text: message, error: true},
        ]);
      } finally {
        setSending(false);
        scrollToEnd();
      }
    },
    [input, sending, scrollToEnd],
  );

  const renderMessage = ({item}: ListRenderItemInfo<ChatMessage>) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.assistantRow}>
        <View style={styles.assistantAvatar}>
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        </View>
        <View
          style={[
            styles.assistantBubble,
            item.error ? styles.errorBubble : null,
          ]}>
          {item.error ? (
            <Text style={styles.errorText}>{item.text}</Text>
          ) : (
            <MarkdownText content={item.text} />
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.heroAvatar}>
        <Ionicons name="sparkles" size={34} color="#FFFFFF" />
      </View>
      <Text style={styles.heroTitle}>Teacher Assistant</Text>
      <Text style={styles.heroSubtitle}>
        Your AI helper for lesson plans, quizzes, grading ideas and more. Ask me
        anything to get started.
      </Text>

      <View style={styles.suggestionsWrap}>
        {SUGGESTIONS.map(s => (
          <TouchableOpacity
            key={s}
            style={styles.suggestionChip}
            activeOpacity={0.8}
            onPress={() => handleSend(s)}>
            <Ionicons
              name="bulb-outline"
              size={16}
              color={ACCENT}
              style={{marginRight: 8}}
            />
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.screen,
        {marginBottom: keyboardUp ? 0 : -insets.bottom},
      ]}>
      <StatusBar backgroundColor={PRIMARY} barStyle="light-content" />
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          {onBack ? (
            <TouchableOpacity
              style={styles.headerBack}
              onPress={onBack}
              activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBack} />
          )}
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerAvatar}>
              <Ionicons name="sparkles" size={18} color={PRIMARY} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Teacher Assistant</Text>
              <Text style={styles.headerStatus}>
                {sending ? 'Typing\u2026' : 'AI \u2022 Online'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerBack}
            onPress={() => setMessages([])}
            activeOpacity={0.7}>
            <Ionicons name="create-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={[styles.flex, {paddingBottom: keyboardHeight}]}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={
            messages.length === 0 ? styles.listEmpty : styles.listContent
          }
          ListEmptyComponent={renderEmpty}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            sending ? (
              <View style={styles.assistantRow}>
                <View style={styles.assistantAvatar}>
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                </View>
                <View style={[styles.assistantBubble, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text style={styles.typingText}>{'Thinking\u2026'}</Text>
                </View>
              </View>
            ) : null
          }
        />

        <View
          style={[
            styles.inputBar,
            {paddingBottom: keyboardUp ? 10 : insets.bottom + 10},
          ]}>
          <TextInput
            style={styles.input}
            placeholder={'Ask the assistant\u2026'}
            placeholderTextColor="#94A3B8"
            value={input}
            onChangeText={setInput}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !input.trim() || sending ? styles.sendButtonDisabled : null,
            ]}
            onPress={() => handleSend()}
            disabled={!input.trim() || sending}
            activeOpacity={0.8}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  flex: {
    flex: 1,
  },
  headerSafeArea: {
    backgroundColor: PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: PRIMARY,
  },
  headerBack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerStatus: {
    color: '#A7C0E8',
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    padding: 14,
    paddingBottom: 20,
  },
  listEmpty: {
    flexGrow: 1,
  },
  userRow: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  userBubble: {
    maxWidth: '85%',
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 24,
  },
  assistantAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  assistantBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0,
    alignSelf: 'flex-start',
  },
  typingText: {
    marginLeft: 8,
    color: '#64748B',
    fontSize: 14,
  },
  errorBubble: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  suggestionsWrap: {
    width: '100%',
    gap: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  suggestionText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    color: '#0F172A',
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
});

export default TeacherAssistantScreen;
