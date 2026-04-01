import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  RefreshControl,
  StatusBar,
  FlatList,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bot, ChevronLeft, MessageSquare, Search, Store, X } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../src/constants/theme';
import AIChatModal from '../src/components/AIChatModal';
import { useAuthStore } from '../src/stores/authStore';
import { chatService, Conversation } from '../src/services/chatService';
import type { RootStackParamList } from '../App';

// ---------------------------------------------------------------------------
// Skeleton shimmer row â€” shown while conversations are loading
// ---------------------------------------------------------------------------
const SkeletonRow = memo(({ shimmer }: { shimmer: Animated.Value }) => {
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });
  return (
    <View style={styles.conversationItem}>
      <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Animated.View style={[styles.skeletonName, { opacity }]} />
          <Animated.View style={[styles.skeletonTime, { opacity }]} />
        </View>
        <Animated.View style={[styles.skeletonMessage, { opacity }]} />
      </View>
    </View>
  );
});

const SKELETON_COUNT = 7;

// ---------------------------------------------------------------------------
// Memoized single conversation row â€” prevents re-renders of unchanged rows
// ---------------------------------------------------------------------------
type ConversationRowProps = {
  conv: Conversation;
  userId: string;
  onPress: (conv: Conversation) => void;
  formatTime: (s: string) => string;
};

const ConversationRow = memo(({ conv, userId, onPress, formatTime }: ConversationRowProps) => (
  <Pressable
    style={({ pressed }) => [styles.conversationItem, pressed && styles.conversationItemPressed]}
    onPress={() => onPress(conv)}
  >
    <View style={styles.avatar}>
      {conv.seller_avatar ? (
        <Image source={{ uri: conv.seller_avatar }} style={styles.avatarImage} contentFit="cover" />
      ) : (
        <Store size={20} color="#FFFFFF" />
      )}
      <View style={conv.is_online ? styles.onlineDot : styles.offlineDot} />
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
          {conv.last_sender_type === 'buyer' ? <Text style={styles.youPrefix}>You: </Text> : null}
          {conv.last_message || 'Start a conversation'}
        </Text>
        {(conv.buyer_unread_count || 0) > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>
              {(conv.buyer_unread_count || 0) > 99 ? '99+' : conv.buyer_unread_count}
            </Text>
          </View>
        )}
      </View>
    </View>
  </Pressable>
));

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [showAIChat, setShowAIChat] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadConversations = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const convs = await chatService.getBuyerConversations(user.id);
      setConversations(convs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!user?.id) return;
    return chatService.subscribeToAllNewMessages((newMsg) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === newMsg.conversation_id);
        if (idx === -1) return prev;

        const displayContent = newMsg.message_type === 'system'
          ? newMsg.message_content || ''
          : newMsg.content || '';

        const updated = {
          ...prev[idx],
          last_message: displayContent,
          last_message_at: newMsg.created_at,
          last_sender_type: newMsg.sender_type,
          buyer_unread_count: newMsg.sender_type === 'seller'
            ? (prev[idx].buyer_unread_count || 0) + 1
            : prev[idx].buyer_unread_count,
        };

        const newList = [...prev];
        newList[idx] = updated;
        return newList.sort((a, b) =>
          new Date(b.last_message_at || b.updated_at).getTime() -
          new Date(a.last_message_at || a.updated_at).getTime()
        );
      });
    });
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || loading) return;
      chatService.getBuyerConversations(user.id)
        .then(convs => setConversations(convs))
        .catch(() => { });
    }, [user?.id, loading])
  );


  // Real-time: presence dots
  useEffect(() => {
    return chatService.subscribeToPresenceUpdates((userId, isOnline) => {
      setConversations(prev =>
        prev.map(c => c.seller_id === userId ? { ...c, is_online: isOnline } : c)
      );
    });
  }, []);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  const uniqueConversations = useMemo(() => {
    const seen = new Set<string>();
    return conversations.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    if (!debouncedQuery) return uniqueConversations;
    const q = debouncedQuery.toLowerCase();
    return uniqueConversations.filter(c =>
      (c.seller_store_name || '').toLowerCase().includes(q) ||
      (c.last_message || '').toLowerCase().includes(q)
    );
  }, [uniqueConversations, debouncedQuery]);

  const handlePress = useCallback((conv: Conversation) => {
    if ((conv.buyer_unread_count || 0) > 0) {
      setConversations(prev =>
        prev.map(c => c.id === conv.id ? { ...c, buyer_unread_count: 0 } : c)
      );
    }
    navigation.navigate('Chat', { conversation: conv, currentUserId: user?.id || '', userType: 'buyer' });
  }, [navigation, user?.id]);

  const renderItem = useCallback(({ item }: { item: Conversation }) => (
    <ConversationRow conv={item} userId={user?.id || ''} onPress={handlePress} formatTime={formatTime} />
  ), [user?.id, handlePress, formatTime]);

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  const ListEmpty = useMemo(() => (
    <View style={styles.emptyState}>
      <View style={styles.iconContainer}>
        <MessageSquare size={48} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>Visit a store to start chatting with a seller</Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
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

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Skeleton while loading */}
      {loading ? (
        <View style={{ flex: 1 }}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonRow key={i} shimmer={shimmer} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={ListEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadConversations(); }} tintColor={COLORS.primary} />}
          // Virtualization tuning
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          // Fixed row height for getItemLayout â€” avoids layout measurement on every scroll
          getItemLayout={(_, index) => ({ length: 73, offset: 73 * index, index })}
          contentContainerStyle={filteredConversations.length === 0 ? styles.emptyContent : undefined}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AIChatModal visible={showAIChat} onClose={() => setShowAIChat(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: { paddingHorizontal: 20, paddingBottom: 4, backgroundColor: COLORS.background },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40 },
  headerIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline },

  searchContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  searchInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 2, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937', paddingVertical: 10 },

  // Skeleton styles
  skeletonAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB' },
  skeletonName: { height: 14, borderRadius: 7, backgroundColor: '#E5E7EB', width: '55%' },
  skeletonTime: { height: 12, borderRadius: 6, backgroundColor: '#E5E7EB', width: 36 },
  skeletonMessage: { height: 13, borderRadius: 6, backgroundColor: '#F3F4F6', width: '80%', marginTop: 4 },

  // Conversation row (fixed height 73 â€” must match getItemLayout)
  conversationItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6', gap: 12, height: 73, alignItems: 'center' },
  conversationItemPressed: { backgroundColor: '#FFF7ED' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 24 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#0D9488', borderWidth: 2, borderColor: '#FFFFFF' },
  offlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#9CA3AF', borderWidth: 2, borderColor: '#FFFFFF' },
  conversationContent: { flex: 1, justifyContent: 'center', gap: 4 },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeName: { fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  conversationTime: { fontSize: 12, color: '#9CA3AF' },
  conversationFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#6B7280', flex: 1, marginRight: 8 },
  unreadMessage: { fontWeight: '600', color: '#1F2937' },
  youPrefix: { fontWeight: '700', color: '#6B7280' },
  unreadBadge: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadCount: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  emptyContent: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
});
