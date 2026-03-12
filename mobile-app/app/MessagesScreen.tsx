import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bot, ChevronLeft, MessageSquare, Search, Store, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../src/constants/theme';
import AIChatModal from '../src/components/AIChatModal';
import { useAuthStore } from '../src/stores/authStore';
import { chatService, Conversation } from '../src/services/chatService';
import type { RootStackParamList } from '../App';

export default function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [showAIChat, setShowAIChat] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const convs = await chatService.getBuyerConversations(user.id);
      setConversations(convs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = chatService.subscribeToConversations(
      user.id,
      'buyer',
      (updatedConv) => {
        setConversations(prev =>
          prev.map(c => c.id === updatedConv.id ? { ...c, ...updatedConv } : c)
        );
      }
    );
    return unsubscribe;
  }, [user?.id]);

  // Real-time presence: update seller dot instantly without a full reload
  useEffect(() => {
    const unsubscribe = chatService.subscribeToPresenceUpdates((userId, isOnline) => {
      setConversations(prev =>
        prev.map(conv =>
          conv.seller_id === userId ? { ...conv, is_online: isOnline } : conv
        )
      );
    });
    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const uniqueConversations = useMemo(() => {
    const uniqueIds = new Set();
    const unique: Conversation[] = [];
    conversations.forEach(conv => {
      if (!uniqueIds.has(conv.id)) {
        uniqueIds.add(conv.id);
        unique.push(conv);
      }
    });
    return unique;
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return uniqueConversations.filter(conv =>
      (conv.seller_store_name || '').toLowerCase().includes(q) ||
      (conv.last_message || '').toLowerCase().includes(q)
    );
  }, [uniqueConversations, searchQuery]);

  // Extract online users for the horizontal list
  const onlineUsers = useMemo(() => uniqueConversations.filter(c => c.is_online), [uniqueConversations]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.headerContainer, { paddingTop: insets.top + 5 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <ChevronLeft size={28} color={COLORS.textHeadline} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Messages</Text>
          <Pressable onPress={() => setShowAIChat(true)} style={styles.headerIcon}>
            <Bot size={24} color={COLORS.primary} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filteredConversations.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <MessageSquare size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.conversationsList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          
          {/* Active Online Users Horizontal List */}
          {onlineUsers.length > 0 && (
            <View style={styles.activeUsersContainer}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={onlineUsers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.activeUserItem}
                    onPress={() => navigation.navigate('Chat', { conversation: item, currentUserId: user?.id || '', userType: 'buyer' })}
                  >
                    <View style={styles.activeAvatarWrapper}>
                      {item.seller_avatar ? (
                        <Image source={{ uri: item.seller_avatar }} style={styles.activeAvatar} />
                      ) : (
                        <View style={[styles.activeAvatar, styles.placeholderAvatar]}>
                          <Store size={20} color="#FFFFFF" />
                        </View>
                      )}
                      <View style={styles.tealOnlineIndicator} />
                    </View>
                    <Text style={styles.activeUserName} numberOfLines={1}>
                      {item.seller_store_name?.split(' ')[0] || 'Store'}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          )}

          {filteredConversations.map(conv => (
            <Pressable
              key={conv.id}
              style={styles.conversationItem}
              onPress={() => navigation.navigate('Chat', { conversation: conv, currentUserId: user?.id || '', userType: 'buyer' })}
            >
              <View style={styles.avatar}>
                {conv.seller_avatar ? (
                  <Image source={{ uri: conv.seller_avatar }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Store size={20} color="#FFFFFF" />
                )}
                {/* 👈 NEW: Conditional check for Offline/Online dot */}
                <View style={conv.is_online ? styles.tealOnlineIndicatorSmall : styles.offlineIndicatorSmall} />
              </View>

              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.storeName} numberOfLines={1}>
                    {conv.seller_store_name || 'Store'}
                  </Text>
                  <Text style={styles.conversationTime}>
                    {formatTime(conv.last_message_at || new Date().toISOString())}
                  </Text>
                </View>
                <View style={styles.conversationFooter}>
                  <Text
                    style={[styles.lastMessage, (conv.buyer_unread_count || 0) > 0 && styles.unreadMessage]}
                    numberOfLines={1}
                  >
                    {conv.last_sender_type === 'buyer' && (
                      <Text style={styles.youPrefix}>You: </Text>
                    )}
                    {conv.last_message || 'Start a conversation'}
                  </Text>
                  {(conv.buyer_unread_count || 0) > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>
                        {(conv.buyer_unread_count || 0) > 99 ? '99+' : (conv.buyer_unread_count || 0)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <AIChatModal visible={showAIChat} onClose={() => setShowAIChat(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: { paddingHorizontal: 20, paddingBottom: 4, zIndex: 10, backgroundColor: COLORS.background },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40 },
  headerIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  searchInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 2, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyState: { alignItems: 'center', maxWidth: 280 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  
  // Active Users List
  activeUsersContainer: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFFFFF' },
  activeUserItem: { alignItems: 'center', width: 64 },
  activeAvatarWrapper: { position: 'relative', marginBottom: 6 },
  activeAvatar: { width: 56, height: 56, borderRadius: 28 },
  placeholderAvatar: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  tealOnlineIndicator: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#0D9488', borderWidth: 2, borderColor: '#FFFFFF' },
  activeUserName: { fontSize: 12, color: '#4B5563', textAlign: 'center' },
  
  conversationsList: { flex: 1 },
  conversationItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 24 },
  tealOnlineIndicatorSmall: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#0D9488', borderWidth: 2, borderColor: '#FFFFFF' },
  offlineIndicatorSmall: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#9CA3AF', borderWidth: 2, borderColor: '#FFFFFF' },
  conversationContent: { flex: 1, gap: 4 },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeName: { fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  conversationTime: { fontSize: 12, color: '#9CA3AF' },
  conversationFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#6B7280', flex: 1, marginRight: 8 },
  unreadMessage: { fontWeight: '600', color: '#1F2937' },
  youPrefix: { fontWeight: '700', color: '#6B7280' },
  unreadBadge: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadCount: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
});