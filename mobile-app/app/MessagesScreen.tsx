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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bot,
  ChevronLeft,
  MessageSquare,
  Search,
  Store,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../src/constants/theme';
import AIChatModal from '../src/components/AIChatModal';
import OnlineStatusIndicator from '../src/components/OnlineStatusIndicator';
import { useAuthStore } from '../src/stores/authStore';
import { chatService, Conversation } from '../src/services/chatService';
import { presenceService } from '../src/services/presenceService';
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
  
  const [sellerPresence, setSellerPresence] = useState<Map<string, boolean>>(new Map());

  const loadConversations = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const convs = await chatService.getBuyerConversations(user.id);
      setConversations(convs);
    } catch (error) {
      console.error('[MessagesScreen] Error loading conversations:', error);
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

  // Subscribe to all sellers' presence
  useEffect(() => {
    if (!conversations || conversations.length === 0) return;

    const unsubscribers: Array<() => void> = [];

    conversations.forEach((conv) => {
      if (!conv.seller_id) return;
      const currentSellerId = conv.seller_id as string; 

      const unsubscribe = presenceService.subscribeToPresence(
        currentSellerId,
        (presence) => {
          setSellerPresence((prev) => {
            const newMap = new Map(prev);
            newMap.set(currentSellerId, presence?.is_online || false);
            return newMap;
          });
        }
      );

      unsubscribers.push(unsubscribe);
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [conversations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const uniqueConversations = React.useMemo(() => {
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

  // Memoized: avoids re-filtering on every keystroke-unrelated re-render
  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return uniqueConversations.filter(conv =>
      (conv.seller_store_name || '').toLowerCase().includes(q) ||
      (conv.last_message || '').toLowerCase().includes(q)
    );
  }, [uniqueConversations, searchQuery]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.headerContainer, { paddingTop: insets.top + 5, backgroundColor: COLORS.background }]}>
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
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <MessageSquare size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>
              Start chatting with sellers by visiting their store or product page!
            </Text>
            <Pressable style={styles.startChatButton} onPress={() => setShowAIChat(true)}>
              <Bot size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.startChatText}>Ask AI Assistant</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.conversationsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          {filteredConversations.map(conv => {
            const isSellerOnline = conv.seller_id ? sellerPresence.get(conv.seller_id) || false : false;
            
            return (
              <Pressable
                key={conv.id}
                style={styles.conversationItem}
                onPress={() => {
                  navigation.navigate('Chat', {
                    conversation: conv,
                    currentUserId: user?.id || '',
                    userType: 'buyer',
                  });
                }}
              >
                {/* Avatar with overlaid Online Indicator */}
                <View style={styles.avatarWrapper}>
                  <View style={styles.avatar}>
                    {conv.seller_avatar ? (
                      <Image source={{ uri: conv.seller_avatar }} style={styles.avatarImage} />
                    ) : (
                      <Store size={20} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.onlineIndicatorContainer}>
                    <OnlineStatusIndicator
                      isOnline={isSellerOnline}
                      size="sm"
                      showLabel={false}
                      showIcon={false}
                      showBorder={true}
                      showAnimation={isSellerOnline}
                    />
                  </View>
                </View>

                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <View style={styles.storeNameContainer}>
                      <Text style={styles.storeName} numberOfLines={1}>
                        {conv.seller_store_name || 'Store'}
                      </Text>
                    </View>
                    <Text style={styles.conversationTime}>
                      {formatTime(conv.last_message_at || new Date().toISOString())}
                    </Text>
                  </View>
                  <View style={styles.conversationFooter}>
                    <Text
                      style={[
                        styles.lastMessage,
                        (conv.buyer_unread_count || 0) > 0 && styles.unreadMessage,
                      ]}
                      numberOfLines={1}
                    >
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
            );
          })}
        </ScrollView>
      )}
      <AIChatModal visible={showAIChat} onClose={() => setShowAIChat(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: { paddingHorizontal: 20, paddingBottom: 4, zIndex: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative', height: 40 },
  headerIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 2, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyState: { alignItems: 'center', maxWidth: 280 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  startChatButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, elevation: 2, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  startChatText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  conversationsList: { flex: 1 },
  conversationItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6', gap: 12 },
  
  /* UPDATED AVATAR STYLES */
  avatarWrapper: { position: 'relative', width: 48, height: 48 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  onlineIndicatorContainer: { position: 'absolute', bottom: -2, right: -2, zIndex: 10 },
  
  conversationContent: { flex: 1, gap: 4 },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeNameContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  storeName: { fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  conversationTime: { fontSize: 12, color: '#9CA3AF' },
  conversationFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#6B7280', flex: 1, marginRight: 8 },
  unreadMessage: { fontWeight: '600', color: '#1F2937' },
  unreadBadge: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadCount: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
});