import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
  Phone,
  Video,
  MoreVertical,
} from 'lucide-react-native';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
}

interface Conversation {
  id: string;
  buyerName: string;
  buyerImage?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
}

export default function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();
  const [selectedConversation, setSelectedConversation] = useState<string | null>('1');
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock Data matching web
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      buyerName: 'Juan Dela Cruz',
      lastMessage: 'Is this item still available?',
      lastMessageTime: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
      unreadCount: 1,
      messages: [
        {
          id: 'm1',
          senderId: 'buyer',
          text: 'Hi, I saw your listing for the Wireless Earbuds.',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          isRead: true,
        },
        {
          id: 'm2',
          senderId: 'buyer',
          text: 'Is this item still available?',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          isRead: false,
        },
      ],
    },
    {
      id: '2',
      buyerName: 'Maria Santos',
      lastMessage: 'Thank you for the fast delivery!',
      lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      unreadCount: 0,
      messages: [
        {
          id: 'm3',
          senderId: 'seller',
          text: 'Your order has been shipped!',
          timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000),
          isRead: true,
        },
        {
          id: 'm4',
          senderId: 'buyer',
          text: 'Thank you for the fast delivery!',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          isRead: true,
        },
      ],
    },
  ]);

  const activeConversation = conversations.find((c) => c.id === selectedConversation);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const updatedConversations = conversations.map((c) => {
      if (c.id === selectedConversation) {
        return {
          ...c,
          lastMessage: newMessage,
          lastMessageTime: new Date(),
          messages: [
            ...c.messages,
            {
              id: `m${Date.now()}`,
              senderId: 'seller',
              text: newMessage,
              timestamp: new Date(),
              isRead: true,
            },
          ],
        };
      }
      return c;
    });

    setConversations(updatedConversations);
    setNewMessage('');
  };

  const formatTime = (date: Date) => {
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
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Messages</Text>
              <Text style={styles.headerSubtitle}>Customer chats</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={18} color="#9CA3AF" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
          {conversations.map((conv) => (
            <Pressable
              key={conv.id}
              style={styles.conversationItem}
              onPress={() => setSelectedConversation(conv.id)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(conv.buyerName)}</Text>
              </View>
              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.buyerName}>{conv.buyerName}</Text>
                  <Text style={styles.conversationTime}>{formatTime(conv.lastMessageTime)}</Text>
                </View>
                <View style={styles.conversationFooter}>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {conv.lastMessage}
                  </Text>
                  {conv.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{conv.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Chat View
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
                {getInitials(activeConversation?.buyerName || '')}
              </Text>
            </View>
            <View>
              <Text style={styles.chatBuyerName}>{activeConversation?.buyerName}</Text>
              <View style={styles.onlineStatus}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          </View>
          <View style={styles.chatHeaderActions}>
            <Pressable style={styles.iconButton}>
              <Phone size={20} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <Video size={20} color="#FFFFFF" strokeWidth={2.5} />
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
        {activeConversation?.messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.senderId === 'seller' ? styles.messageSeller : styles.messageBuyer,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.senderId === 'seller' ? styles.messageTextSeller : styles.messageTextBuyer,
              ]}
            >
              {msg.text}
            </Text>
            <Text
              style={[
                styles.messageTime,
                msg.senderId === 'seller' ? styles.messageTimeSeller : styles.messageTimeBuyer,
              ]}
            >
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}
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
        />
        <Pressable
          style={styles.sendButton}
          onPress={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
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
    backgroundColor: '#FF5722',
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500',
  },
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
