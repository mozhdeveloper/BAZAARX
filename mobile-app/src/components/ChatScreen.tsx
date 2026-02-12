/**
 * ChatScreen - Handles real-time messaging between buyer and seller
 */

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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
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
}: ChatScreenProps | any) { // Relaxed type to support usage as Screen
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>(); // Simple route access

  // Resolve props from route params if available (when pushed as screen)
  const isScreen = route?.name === 'Chat';
  const effectiveConversation = isScreen ? route.params?.conversation : conversation;
  const effectiveUserId = isScreen ? route.params?.currentUserId : currentUserId;
  const effectiveUserType = isScreen ? route.params?.userType : userType;
  const handleBack = isScreen ? () => navigation.goBack() : onBack;

  // Use effective values
  const conversationId = effectiveConversation?.id;
  const conversationData = effectiveConversation;
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const displayName = effectiveUserType === 'buyer'
    ? conversationData?.seller_store_name || 'Store'
    : conversationData?.buyer_name || 'Customer';

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const msgs = await chatService.getMessages(conversationId);
      setMessages(msgs);

      // Mark as read
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

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = chatService.subscribeToMessages(
      conversationId,
      (newMsg) => {
        // Only add if message doesn't already exist (prevent duplicates from optimistic updates)
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMsg.id);
          if (exists) return prev;
          return [...prev, newMsg];
        });

        // Mark as read if from other party
        if (newMsg.sender_type !== effectiveUserType) {
          chatService.markAsRead(conversationId, effectiveUserId, effectiveUserType);
        }
      }
    );

    return unsubscribe;
  }, [conversationId, effectiveUserId, effectiveUserType]);

  // ... rest of the component ...

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await chatService.sendMessage(
        conversationId,
        effectiveUserId,
        effectiveUserType,
        messageText
      );

      // Real-time subscription will add the message automatically
    } catch (error) {
      console.error('[ChatScreen] Error sending message:', error);
      // Restore message if failed
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

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Group messages by date
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.primary} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.headerInfo}>
          <View style={styles.avatarContainer}>
            {effectiveUserType === 'buyer' ? (
              <Store size={20} color={COLORS.primary} />
            ) : (
              <User size={16} color={COLORS.primary} />
            )}
          </View>
          <View>
            <Text style={styles.headerTitle}>{displayName}</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.ticketButton}
          onPress={() => {
            handleBack();
            navigation.navigate('CreateTicket');
          }}
        >
          <Ticket size={22} color={COLORS.primary} />
        </Pressable>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {groupedMessages.map((group, groupIdx) => (
            <View key={groupIdx}>
              {/* Date separator */}
              <View style={styles.dateSeparator}>
                <View style={styles.dateLine} />
                <Text style={styles.dateText}>
                  {formatDateSeparator(group.messages[0].created_at)}
                </Text>
                <View style={styles.dateLine} />
              </View>

              {group.messages.map((msg) => {
                const isMe = msg.sender_type === effectiveUserType;

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageBubble,
                      isMe ? styles.myMessage : styles.theirMessage,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isMe ? styles.myMessageText : styles.theirMessageText,
                      ]}
                    >
                      {msg.content}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        isMe ? styles.myMessageTime : styles.theirMessageTime,
                      ]}
                    >
                      {formatTime(msg.created_at)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input Area */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable style={styles.attachButton}>
          <ImageIcon size={20} color="#6B7280" strokeWidth={2} />
        </Pressable>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={20} color={COLORS.primary} strokeWidth={2.5} style={{ marginLeft: 2 }} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5CC',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    padding: 4,
    color: COLORS.primary,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  statusText: {
    fontSize: 14,
    color: '#1F2937',
    opacity: 0.9,
  },
  ticketButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 100, // Add space for floating input
    gap: 8,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
    marginVertical: 2,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  theirMessageTime: {
    color: '#9CA3AF',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 32,
    gap: 12,
    borderTopWidth: 0,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  attachButton: {
    padding: 10,
    marginBottom: 2, // Align with input text
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Light Gray
    borderRadius: 24, // Fully rounded
    paddingHorizontal: 20,
    paddingVertical: 12, // More padding
    fontSize: 15,
    color: '#1F2937',
    maxHeight: 100,
  },
  sendButton: {
    width: 48, // Larger button
    height: 48,
    borderRadius: 24, // Circular
    backgroundColor: '#FFE5CC', // Peach background
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for button
    shadowColor: '#FFE5CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0,
    elevation: 0,
  },
});
