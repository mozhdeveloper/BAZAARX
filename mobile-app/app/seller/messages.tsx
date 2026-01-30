import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import {
  ArrowLeft,
  Search,
  Send,
  Image as ImageIcon,
  Paperclip,
  Ticket,
  X,
  MessageSquare,
} from 'lucide-react-native';
import { Alert } from 'react-native';
import { chatService, Conversation as ChatConversation, Message as ChatMessage } from '../../src/services/chatService';
import { useAuthStore } from '../../src/stores/authStore';
import { useSellerStore } from '../../src/stores/sellerStore';

export default function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const seller = useSellerStore((state) => state.seller);
  
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  // Real conversations and messages from database
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load real conversations from database
  const loadConversations = useCallback(async () => {
    // Use seller.id from sellerStore (the seller's UUID), not user.id from authStore
    const sellerId = seller?.id;
    if (!sellerId) {
      console.log('[SellerMessages] No seller ID available');
      setLoading(false);
      return;
    }

    console.log('[SellerMessages] Loading conversations for seller:', sellerId);
    try {
      const convs = await chatService.getSellerConversations(sellerId);
      console.log('[SellerMessages] Loaded conversations:', convs.length);
      setConversations(convs);
    } catch (error) {
      console.error('[SellerMessages] Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [seller?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      const msgs = await chatService.getMessages(selectedConversation);
      setMessages(msgs);
      
      // Mark as read
      if (seller?.id) {
        await chatService.markAsRead(selectedConversation, seller.id, 'seller');
      }
    };

    loadMessages();
  }, [selectedConversation, seller?.id]);

  // Subscribe to new messages
  useEffect(() => {
    if (!selectedConversation) return;

    const unsubscribe = chatService.subscribeToMessages(
      selectedConversation,
      (newMsg) => {
        // Prevent duplicates
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMsg.id);
          if (exists) return prev;
          return [...prev, newMsg];
        });
        
        if (newMsg.sender_type === 'buyer' && seller?.id) {
          chatService.markAsRead(selectedConversation, seller.id, 'seller');
        }
      }
    );

    return unsubscribe;
  }, [selectedConversation, seller?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const activeConversation = conversations.find((c) => c.id === selectedConversation);

  const handleEscalate = () => {
    if (!activeConversation) return;

    Alert.alert(
        'Escalate to Support',
        'Do you want to report this buyer or create a support ticket from this conversation?',
        [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Escalate', 
                style: 'destructive',
                onPress: () => {
                    const buyerName = activeConversation.buyer_name || 'Buyer';
                    const transcript = messages
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                      .map(m => `[${new Date(m.created_at).toLocaleString()}] ${m.sender_type === 'seller' ? 'Me' : buyerName}: ${m.content}`)
                      .join('\n');

                    (navigation as any).navigate('CreateTicket', {
                        initialSubject: `Report Buyer: ${buyerName}`,
                        initialDescription: `I would like to report an issue with this buyer.\n\nConversation Transcript:\n${transcript}`
                    });
                }
            }
        ]
    );
  };
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !seller?.id) return;

    setSending(true);
    try {
      const result = await chatService.sendMessage(
        selectedConversation,
        seller.id,  // Use seller ID from sellerStore, not user.id from authStore
        'seller',
        newMessage.trim()
      );
      if (result) {
        setNewMessage('');
        // Message will be added via realtime subscription
      }
    } catch (error) {
      console.error('[SellerMessages] Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (!selectedConversation) {
    // Conversations List View
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={[styles.headerTop, { marginTop: insets.top }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                    <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
                </Pressable>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={{ marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 48 }}>
            <Search size={20} color="#9CA3AF" strokeWidth={2} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search messages..."
              placeholderTextColor="#9CA3AF"
              style={{ flex: 1, marginLeft: 8, fontSize: 15, color: '#111827' }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView 
          style={styles.conversationsList} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
          }
        >
          {loading && !refreshing ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading conversations...</Text>
            </View>
          ) : conversations.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <MessageSquare size={48} color="#D1D5DB" />
              <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 16 }}>No messages yet</Text>
              <Text style={{ marginTop: 4, color: '#9CA3AF', textAlign: 'center' }}>
                Messages from buyers will appear here
              </Text>
            </View>
          ) : (
            conversations.map((conv: any) => (
              <Pressable
                key={conv.id}
                style={styles.conversationItem}
                onPress={() => setSelectedConversation(conv.id)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getInitials(conv.buyer?.full_name || conv.buyer_name || 'B')}
                  </Text>
                </View>
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.buyerName}>
                      {conv.buyer?.full_name || conv.buyer_name || 'Buyer'}
                    </Text>
                    <Text style={styles.conversationTime}>
                      {formatTime(conv.last_message_at)}
                    </Text>
                  </View>
                  <View style={styles.conversationFooter}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {conv.last_message || 'No messages yet'}
                    </Text>
                    {conv.seller_unread_count > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{conv.seller_unread_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // Chat View
  const activeBuyerName = activeConversation?.buyer_name || 'Buyer';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Chat Header */}
      <View style={[styles.chatHeader, { paddingTop: insets.top + 16 }]}>
        <View style={styles.chatHeaderContent}>
          <View style={styles.chatHeaderLeft}>
            <Pressable
              style={styles.backButton}
              onPress={() => setSelectedConversation(null)}
            >
              <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <View style={styles.chatAvatar}>
              <Text style={styles.chatAvatarText}>
                {getInitials(activeBuyerName)}
              </Text>
            </View>
            <View>
              <Text style={styles.chatBuyerName}>{activeBuyerName}</Text>
              <View style={styles.onlineStatus}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          </View>
          <View style={styles.chatHeaderActions}>
            <Pressable 
              style={styles.iconButton}
              onPress={handleEscalate}
            >
              <Ticket size={20} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#9CA3AF' }}>No messages in this conversation</Text>
          </View>
        ) : (
          messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.sender_type === 'seller' ? styles.messageSeller : styles.messageBuyer,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.sender_type === 'seller' ? styles.messageTextSeller : styles.messageTextBuyer,
                ]}
              >
                {msg.content}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  msg.sender_type === 'seller' ? styles.messageTimeSeller : styles.messageTimeBuyer,
                ]}
              >
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable style={styles.attachButton}>
          <ImageIcon size={20} color="#6B7280" strokeWidth={2} />
        </Pressable>
        <Pressable style={styles.attachButton}>
          <Paperclip size={20} color="#6B7280" strokeWidth={2} />
        </Pressable>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          editable={!sending}
        />
        <Pressable
          style={[styles.sendButton, sending && { opacity: 0.6 }]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
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
  headerContainer: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: { 
      marginBottom: 10,
      justifyContent: 'center',
  },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  conversationsList: {
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF5722',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  conversationTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  unreadBadge: {
    backgroundColor: '#FF5722',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatHeader: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  chatHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatBuyerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  onlineText: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500',
  },
  chatHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 16,
    padding: 12,
  },
  messageSeller: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF5722',
    borderTopRightRadius: 4,
  },
  messageBuyer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextSeller: {
    color: '#FFFFFF',
  },
  messageTextBuyer: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  messageTimeSeller: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeBuyer: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  attachButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF5722',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});
