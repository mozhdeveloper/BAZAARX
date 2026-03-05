import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Send,
  Store,
  User,
  Image as ImageIcon,
  Ticket,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';
import { chatService, Conversation, Message } from '../services/chatService';
import { presenceService } from '../services/presenceService';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import SystemMessageBubble from './SystemMessageBubble';
import type { RootStackParamList } from '../../App';

interface ChatScreenProps {
  conversation: Conversation;
  currentUserId: string;
  userType: 'buyer' | 'seller';
  onBack: () => void;
}

export default function ChatScreen({
  conversation,
  currentUserId,
  userType,
  onBack,
}: ChatScreenProps | any) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();

  const isScreen = route?.name === 'Chat';
  const effectiveConversation = isScreen ? route.params?.conversation : conversation;
  const effectiveUserId = isScreen ? route.params?.currentUserId : currentUserId;
  const effectiveUserType = isScreen ? route.params?.userType : userType;
  const handleBack = isScreen ? () => navigation.goBack() : onBack;

  const conversationId = effectiveConversation?.id;
  const conversationData = effectiveConversation;
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);

  const displayName = effectiveUserType === 'buyer'
    ? conversationData?.seller_store_name || 'Store'
    : conversationData?.buyer_name || 'Customer';

  const avatarUrl = effectiveUserType === 'buyer'
    ? conversationData?.seller_avatar
    : conversationData?.buyer_avatar;

  const otherUserId = effectiveUserType === 'buyer' 
    ? conversationData?.seller_id 
    : conversationData?.buyer_id;

  // Listen to the other user's presence (presence is initialized globally in App.tsx)
  useEffect(() => {
    if (!otherUserId) return;
    
    const unsubscribe = presenceService.subscribeToPresence(
      otherUserId,
      (presence) => {
        setIsOtherUserOnline(presence?.is_online || false);
      }
    );

    // Initial check from cache if available
    const cached = presenceService.getPresenceFromCache(otherUserId);
    if (cached) setIsOtherUserOnline(cached.is_online);

    return unsubscribe;
  }, [otherUserId]);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const msgs = await chatService.getMessages(conversationId);
      setMessages(msgs);
      await chatService.markAsRead(conversationId, effectiveUserId, effectiveUserType);
    } catch (error) {
      console.error('[ChatScreen] Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, effectiveUserId, effectiveUserType]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = chatService.subscribeToMessages(
      conversationId,
      (newMsg) => {
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMsg.id);
          if (exists) return prev;
          return [...prev, newMsg];
        });

        if (newMsg.sender_type !== effectiveUserType) {
          setIsOtherUserOnline(true); // Optimistic UI update
          chatService.markAsRead(conversationId, effectiveUserId, effectiveUserType);
        }
      }
    );

    return unsubscribe;
  }, [conversationId, effectiveUserId, effectiveUserType]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const sentMsg = await chatService.sendMessage(
        conversationId,
        effectiveUserId,
        effectiveUserType,
        messageText
      );

      if (sentMsg) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === sentMsg.id);
          if (exists) return prev;
          return [...prev, sentMsg];
        });
      }
    } catch (error) {
      console.error('[ChatScreen] Error sending message:', error);
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const dateKey = new Date(msg.created_at).toDateString();
    const lastGroup = groupedMessages[groupedMessages.length - 1];

    if (lastGroup && new Date(lastGroup.messages[0].created_at).toDateString() === dateKey) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        <View style={styles.headerInfo}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : effectiveUserType === 'buyer' ? (
              <Store size={18} color={COLORS.primary} />
            ) : (
              <User size={18} color={COLORS.primary} />
            )}
          </View>
          <View>
            <Text style={styles.headerTitle}>{displayName}</Text>
            <OnlineStatusIndicator
              isOnline={isOtherUserOnline}
              size="sm"
              showLabel={true}
              showIcon={false}
              showBorder={true}
              showAnimation={true}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row' }}>
          <Pressable style={styles.menuButton} onPress={() => navigation.navigate('CreateTicket')}>
            <Ticket size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {groupedMessages.map((group, groupIdx) => (
            <View key={groupIdx}>
              <View style={styles.dateSeparator}>
                <View style={styles.dateLine} />
                <Text style={styles.dateText}>
                  {formatDateSeparator(group.messages[0].created_at)}
                </Text>
                <View style={styles.dateLine} />
              </View>

              {group.messages.map((msg) => {
                const systemMsg = msg as Message & { is_system_message?: boolean; metadata?: Record<string, any> };

                if (systemMsg.is_system_message) {
                  return (
                    <SystemMessageBubble
                      key={systemMsg.id}
                      content={systemMsg.content}
                      metadata={systemMsg.metadata}
                      createdAt={systemMsg.created_at}
                    />
                  );
                }

                const isMe = msg.sender_type === effectiveUserType;

                return (
                  <View
                    key={msg.id}
                    style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}
                  >
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                      {msg.content}
                    </Text>
                    <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.theirMessageTime]}>
                      {formatTime(msg.created_at)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
          />
          <Pressable
            onPress={() => handleSend()}
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            disabled={!newMessage.trim()}
          >
            <Send size={20} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { padding: 8 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8, gap: 12 },
  avatarContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  menuButton: { padding: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesContainer: { flex: 1, backgroundColor: '#F5F5F7' },
  messagesContent: { padding: 16, paddingBottom: 20, gap: 8 },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  dateLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dateText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  messageBubble: { maxWidth: '75%', borderRadius: 16, padding: 12, marginVertical: 2 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#FFFFFF' },
  theirMessageText: { color: '#1F2937' },
  messageTime: { fontSize: 11, marginTop: 4 },
  myMessageTime: { color: 'rgba(255, 255, 255, 0.7)', textAlign: 'right' },
  theirMessageTime: { color: '#9CA3AF' },
  inputContainer: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  input: { flex: 1, backgroundColor: '#F2F2F2', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12, fontSize: 15, color: '#1F2937', maxHeight: 100, letterSpacing: -0.1 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#E5E7EB' },
});