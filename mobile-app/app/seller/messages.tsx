import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import {
  ArrowLeft,
  Search,
  Send,
  ImageIcon,
  Paperclip,
  Ticket,
  X,
  MessageSquare,
  FileText,
  Play,
} from 'lucide-react-native';
import { Alert } from 'react-native';
import { chatService, Conversation as ChatConversation, Message as ChatMessage } from '../../src/services/chatService';
import { getMimeFromExtension, CHAT_MEDIA_LIMITS, ALL_PLACEHOLDERS, MEDIA_PLACEHOLDER_MAP, extractFileName, type ChatMediaType } from '../../src/utils/chatMediaUtils';
import { formatDateLabel, formatMessageTimestamp } from '../../src/utils/chatDateUtils';
import ChatMediaPreviewModal from '../../src/components/ChatMediaPreviewModal';
import ChatSendPreviewModal, { type SendPreviewAsset } from '../../src/components/ChatSendPreviewModal';
import { useAuthStore } from '../../src/stores/authStore';
import { useSellerStore } from '../../src/stores/sellerStore';
import { COLORS } from '../../src/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_W } = Dimensions.get('window');
const DOC_BUBBLE_W = SCREEN_W * 0.68; // explicit width so inner flex:1 text resolves correctly

type SellerListItem =
  | { type: 'message'; data: ChatMessage; id: string }
  | { type: 'date_sep'; label: string; id: string };

// ─── Shimmer skeleton row (shown while conversations are loading) ─────────────────
const SkeletonRow = ({ shimmer }: { shimmer: Animated.Value }) => {
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });
  return (
    <View style={{ flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12, height: 73, alignItems: 'center' }}>
      <Animated.View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB', opacity }} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Animated.View style={{ height: 14, borderRadius: 7, backgroundColor: '#E5E7EB', width: '55%', opacity }} />
          <Animated.View style={{ height: 12, borderRadius: 6, backgroundColor: '#E5E7EB', width: 36, opacity }} />
        </View>
        <Animated.View style={{ height: 13, borderRadius: 6, backgroundColor: '#F3F4F6', width: '80%', opacity }} />
      </View>
    </View>
  );
};
const SKELETON_COUNT = 7;



export default function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Real conversations and messages from database
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Ref for auto-scrolling the chat (inverted FlatList: scrollToOffset 0 = newest message)
  const chatFlatListRef = useRef<FlatList<SellerListItem>>(null);

  // Shimmer animation for skeleton loading rows in the conversations list
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

  // Tap-to-reveal timestamp
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null);

  // Media preview modal
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState<'image' | 'video' | 'document'>('image');
  const [previewFileName, setPreviewFileName] = useState('');

  // Send-preview modal
  const [sendPreviewAsset, setSendPreviewAsset] = useState<SendPreviewAsset | null>(null);
  const [sendPreviewVisible, setSendPreviewVisible] = useState(false);
  const pendingUpload = useRef<{ base64: string; fileName: string; mime: string; mediaType: ChatMediaType } | null>(null);

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

  // Real-time chatlist: lightweight subscription to messages table.
  // Updates conversation preview + unread badge instantly without async enrichment.
  useEffect(() => {
    if (!seller?.id) return;
    return chatService.subscribeToAllNewMessages((newMsg) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === newMsg.conversation_id);
        if (idx === -1) return prev; // not this seller's conversation

        const displayContent = newMsg.message_type === 'system'
          ? newMsg.message_content || ''
          : newMsg.content || '';

        const updated = {
          ...prev[idx],
          last_message: displayContent,
          last_message_at: newMsg.created_at,
          last_sender_type: newMsg.sender_type,
          // Increment badge only for messages from the buyer
          seller_unread_count: newMsg.sender_type === 'buyer'
            ? (prev[idx].seller_unread_count || 0) + 1
            : prev[idx].seller_unread_count,
        };

        const newList = [...prev];
        newList[idx] = updated;
        return newList.sort((a, b) =>
          new Date(b.last_message_at || b.updated_at).getTime() -
          new Date(a.last_message_at || a.updated_at).getTime()
        );
      });
    });
  }, [seller?.id]);

  // Silent refresh when returning to the chatlist from a conversation.
  // Syncs unread badges after markAsRead was called in the chat view.
  useFocusEffect(
    useCallback(() => {
      const sellerId = seller?.id;
      if (!sellerId || loading) return;
      chatService.getSellerConversations(sellerId)
        .then(convs => setConversations(convs))
        .catch(() => {});
    }, [seller?.id, loading])
  );


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
        setMessages(prev => {
          // Dedup: skip if already present
          if (prev.some(m => m.id === newMsg.id)) return prev;
          // Replace temp message if it matches
          const tempIdx = prev.findIndex(
            m => m.id.startsWith('temp-') &&
              m.sender_id === newMsg.sender_id &&
              m.content === newMsg.content
          );
          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = newMsg;
            return updated;
          }
          return [...prev, newMsg];
        });
        // Auto-scroll on new message
        chatFlatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        
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

  // Real-time presence: update buyer dot instantly without a full reload
  useEffect(() => {
    const unsubscribe = chatService.subscribeToPresenceUpdates((userId, isOnline) => {
      setConversations(prev =>
        prev.map(conv =>
          conv.buyer_id === userId ? { ...conv, is_online: isOnline } : conv
        )
      );
    });
    return unsubscribe;
  }, []);

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
  
  // ─── Optimistic send ──────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !seller?.id) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    // 1. Clear input + append temp message immediately
    const tempMsg: ChatMessage = {
      id: tempId,
      conversation_id: selectedConversation,
      sender_id: seller.id,
      sender_type: 'seller',
      content: messageText,
      is_read: false,
      created_at: new Date().toISOString(),
      message_type: 'user',
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage('');

    try {
      const result = await chatService.sendMessage(
        selectedConversation,
        seller.id,
        'seller',
        messageText
      );
      if (result) {
        setMessages(prev =>
          prev.some(m => m.id === result.id)
            ? prev.filter(m => m.id !== tempId)
            : prev.map(m => m.id === tempId ? result : m)
        );
      } else {
        // Rollback
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setNewMessage(messageText);
      }
    } catch (error) {
      console.error('[SellerMessages] Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(messageText);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  // ─── Media Pickers ────────────────────────────────────────────────────────
  const pickMedia = async () => {
    if (!selectedConversation || !seller?.id) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      videoMaxDuration: 120,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mediaType: ChatMediaType = asset.type === 'video' ? 'video' : 'image';
    const mime = getMimeFromExtension(ext);

    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    const maxSize = CHAT_MEDIA_LIMITS[mediaType].maxSize;
    if (fileInfo.exists && 'size' in fileInfo && fileInfo.size > maxSize) {
      Alert.alert('File too large', `Max ${maxSize / (1024 * 1024)} MB for ${mediaType}s`);
      return;
    }

    const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
    const fileName = asset.fileName || `${Date.now()}.${ext}`;
    pendingUpload.current = { base64, fileName, mime, mediaType };
    setSendPreviewAsset({
      uri: asset.uri,
      name: fileName,
      type: mediaType,
      size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : undefined,
    });
    setSendPreviewVisible(true);
  };

  const pickDocument = async () => {
    if (!selectedConversation || !seller?.id) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (asset.size && asset.size > CHAT_MEDIA_LIMITS.document.maxSize) {
      Alert.alert('File too large', 'Max 10 MB for documents');
      return;
    }

    const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
    const fileName = asset.name || `${Date.now()}.pdf`;
    pendingUpload.current = { base64, fileName, mime: 'application/pdf', mediaType: 'document' };
    setSendPreviewAsset({
      uri: asset.uri,
      name: fileName,
      type: 'document',
      size: asset.size ?? undefined,
    });
    setSendPreviewVisible(true);
  };

  const handleConfirmSend = async () => {
    if (!pendingUpload.current || !selectedConversation || !seller?.id) return;
    const { base64, fileName, mime, mediaType } = pendingUpload.current;
    setUploading(true);
    try {
      const url = await chatService.uploadChatMedia(base64, selectedConversation, fileName, mime);
      if (!url) {
        Alert.alert('Upload failed', 'Could not upload the file. Please try again.');
        return;
      }

      const placeholder = MEDIA_PLACEHOLDER_MAP[mediaType];
      const tempId = `temp-${Date.now()}`;
      const tempMsg: ChatMessage = {
        id: tempId, conversation_id: selectedConversation, sender_id: seller.id,
        sender_type: 'seller', content: placeholder, media_url: url,
        media_type: mediaType, is_read: false, created_at: new Date().toISOString(),
        message_type: mediaType,
      };
      setMessages(prev => [...prev, tempMsg]);
      setSendPreviewVisible(false);
      setSendPreviewAsset(null);
      pendingUpload.current = null;

      const sentMsg = await chatService.sendMessage(
        selectedConversation, seller.id, 'seller', placeholder, undefined, url, mediaType
      );
      if (sentMsg) {
        setMessages(prev =>
          prev.some(m => m.id === sentMsg.id)
            ? prev.filter(m => m.id !== tempId)
            : prev.map(m => m.id === tempId ? sentMsg : m)
        );
      }
    } catch (err) {
      console.error('[SellerMessages] upload error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancelSend = () => {
    setSendPreviewVisible(false);
    setSendPreviewAsset(null);
    pendingUpload.current = null;
  };

  // ─── Open media preview ───────────────────────────────────────────────
  const openPreview = (url: string, type: 'image' | 'video' | 'document') => {
    setPreviewUrl(url);
    setPreviewType(type);
    setPreviewFileName(extractFileName(url));
    setPreviewVisible(true);
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

  // ─── FlatList data: date separators + messages, newest first (inverted) ──────
  const listData = useMemo((): SellerListItem[] => {
    const sorted = [...messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const flat: SellerListItem[] = [];
    let lastDateKey = '';
    sorted.forEach((msg) => {
      const dateKey = new Date(msg.created_at).toDateString();
      if (dateKey !== lastDateKey) {
        flat.push({ type: 'date_sep', label: formatDateLabel(dateKey), id: `sep-${dateKey}` });
        lastDateKey = dateKey;
      }
      flat.push({ type: 'message', data: msg, id: msg.id });
    });
    return flat.reverse(); // inverted FlatList expects newest at index 0
  }, [messages]);

  // ─── Render a single FlatList row ─────────────────────────────────────────
  const renderListItem = useCallback(({ item }: { item: SellerListItem }) => {
    if (item.type === 'date_sep') {
      return (
        <View style={styles.dateSepWrapper}>
          <View style={styles.dateSepLine} />
          <Text style={styles.dateSepText}>{item.label}</Text>
          <View style={styles.dateSepLine} />
        </View>
      );
    }

    const msg = item.data;
    const isSeller = msg.sender_type === 'seller';
    const isPending = msg.id.startsWith('temp-');
    const imgUrl = msg.media_url || msg.image_url;
    const hasMedia = !!msg.media_url;
    const isImage = msg.media_type === 'image' || msg.message_type === 'image' || (!msg.media_type && !!msg.image_url);
    const isVideo = msg.media_type === 'video' || msg.message_type === 'video';
    const isDoc = msg.media_type === 'document' || msg.message_type === 'document';
    const isPlaceholder = ALL_PLACEHOLDERS.includes(msg.content);
    const isExpanded = expandedMsgId === msg.id;
    const hasAnyMedia = (imgUrl && isImage) || (hasMedia && isVideo) || (hasMedia && isDoc);
    const toggleTimestamp = () => setExpandedMsgId(prev => prev === msg.id ? null : msg.id);

    return (
      <View style={[styles.msgOuterWrapper, isSeller ? styles.msgOuterRight : styles.msgOuterLeft]}>
        <Pressable
          onPress={() => { if (!hasAnyMedia) toggleTimestamp(); }}
          onLongPress={toggleTimestamp}
          delayLongPress={400}
        >
          <View
            style={[
              styles.messageBubble,
              isSeller ? styles.messageSeller : styles.messageBuyer,
              isExpanded && (isSeller ? styles.messageSellerExpanded : styles.messageBuyerExpanded),
              isDoc && !(msg.content && !(isPlaceholder && (hasMedia || !!msg.image_url))) && styles.noPadBubble,
            ]}
          >
            {/* Image */}
            {imgUrl && isImage && (
              <Pressable onPress={() => openPreview(imgUrl!, 'image')} onLongPress={toggleTimestamp} delayLongPress={400}>
                <Image source={{ uri: imgUrl }} style={{ width: 200, height: 200, borderRadius: 12, marginBottom: 4 }} resizeMode="cover" />
              </Pressable>
            )}
            {/* Video */}
            {hasMedia && isVideo && (
              <Pressable onPress={() => openPreview(msg.media_url!, 'video')} onLongPress={toggleTimestamp} delayLongPress={400} style={{ width: 200, height: 140, borderRadius: 12, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                <Play size={28} color="#FFFFFF" />
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600', marginTop: 6 }}>Tap to play</Text>
              </Pressable>
            )}
            {/* Document — explicit width so inner flex:1 text always renders */}
            {hasMedia && isDoc && (
              <Pressable onPress={() => openPreview(msg.media_url!, 'document')} onLongPress={toggleTimestamp} delayLongPress={400} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, width: DOC_BUBBLE_W, backgroundColor: isSeller ? 'rgba(255,255,255,0.15)' : '#F3F4F6' }}>
                <View style={{ width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: isSeller ? 'rgba(255,255,255,0.15)' : '#FEF2F2' }}>
                  <FileText size={18} color={isSeller ? '#FFFFFF' : '#D97706'} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isSeller ? '#FFFFFF' : '#D97706' }} numberOfLines={1}>{extractFileName(msg.media_url!)}</Text>
                  <Text style={{ fontSize: 11, marginTop: 2, color: isSeller ? 'rgba(255,255,255,0.6)' : '#9CA3AF' }}>PDF · Tap to open</Text>
                </View>
              </Pressable>
            )}
            {/* Text (hide placeholders when media is present) */}
            {msg.content && !(isPlaceholder && (hasMedia || !!msg.image_url)) && (
              <Text style={[styles.messageText, isSeller ? styles.messageTextSeller : styles.messageTextBuyer]}>
                {msg.content}
              </Text>
            )}
          </View>
        </Pressable>
        {isExpanded && !isPending && (
          <Text style={[styles.messageTimeOutside, isSeller ? styles.messageTimeOutsideRight : styles.messageTimeOutsideLeft]}>
            {formatMessageTimestamp(msg.created_at)}
          </Text>
        )}
      </View>
    );
  }, [expandedMsgId, openPreview]);

  if (!selectedConversation) {
    // Conversations List View
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={[styles.headerTop, { marginTop: insets.top }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                    <ArrowLeft size={24} color="#1F2937" strokeWidth={2.5} />
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
            <View>
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <SkeletonRow key={i} shimmer={shimmer} />
              ))}
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
                onPress={() => {
                  // Instantly clear unread badge on tap
                  if ((conv.seller_unread_count || 0) > 0) {
                    setConversations(prev =>
                      prev.map(c => c.id === conv.id ? { ...c, seller_unread_count: 0 } : c)
                    );
                  }
                  setSelectedConversation(conv.id);
                }}
              >
                <View style={{ position: 'relative' }}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getInitials(conv.buyer?.full_name || conv.buyer_name || 'B')}
                    </Text>
                  </View>
                  <View style={conv.is_online ? styles.chatlistOnlineBadge : styles.chatlistOfflineBadge} />
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
      behavior="padding"
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
              <ArrowLeft size={24} color="#1F2937" strokeWidth={2.5} />
            </Pressable>
            <View style={styles.chatAvatar}>
              <Text style={styles.chatAvatarText}>
                {getInitials(activeBuyerName)}
              </Text>
            </View>
            <View>
              <Text style={styles.chatBuyerName}>{activeBuyerName}</Text>
              <View style={styles.onlineStatus}>
                <View style={activeConversation?.is_online ? styles.onlineDot : styles.offlineDotStyle} />
                <Text style={styles.onlineText}>
                  {activeConversation?.is_online ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.chatHeaderActions}>
            <Pressable 
              style={styles.iconButton}
              onPress={handleEscalate}
            >
              <Ticket size={20} color="#1F2937" strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Messages — inverted FlatList matches buyer keyboard behaviour; KAV handles push-up */}
      <FlatList<SellerListItem>
        ref={chatFlatListRef}
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderListItem}
        inverted={true}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center', transform: [{ scaleY: -1 }] }}>
            <Text style={{ color: '#9CA3AF' }}>No messages in this conversation</Text>
          </View>
        }
      />

      {/* Input Area */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable onPress={pickMedia} style={styles.attachButton} disabled={uploading}>
          {uploading ? <ActivityIndicator size="small" color="#D97706" /> : <ImageIcon size={20} color="#6B7280" strokeWidth={2} />}
        </Pressable>
        <Pressable onPress={pickDocument} style={styles.attachButton} disabled={uploading}>
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
          style={[styles.sendButton, (!newMessage.trim() || uploading) && { opacity: 0.5 }]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || uploading}
        >
          <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Media preview modal */}
      <ChatMediaPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        mediaUrl={previewUrl}
        mediaType={previewType}
        fileName={previewFileName}
      />

      {/* Send confirmation preview modal */}
      <ChatSendPreviewModal
        visible={sendPreviewVisible}
        onCancel={handleCancelSend}
        onSend={handleConfirmSend}
        asset={sendPreviewAsset}
        uploading={uploading}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF0',
  },
  headerContainer: {
    backgroundColor: '#FFF4EC',
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
        borderBottomRightRadius: 20,
    paddingBottom: 20,
    marginBottom: 10,
    elevation: 3,
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
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
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatlistOnlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatlistOfflineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#9CA3AF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
    backgroundColor: '#D97706',
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
    backgroundColor: '#FFF4EC',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 30,
        borderBottomRightRadius: 20,
    elevation: 3,
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
    backgroundColor: 'rgba(217, 119, 6, 0.15)', // Amber tint
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D97706',
  },
  chatBuyerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
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
  offlineDotStyle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
  },
  onlineText: {
    fontSize: 11,
    color: '#4B5563',
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
    backgroundColor: '#FFF4EC',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  // Date separators
  dateSepWrapper: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 8 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dateSepText: { marginHorizontal: 10, fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  msgOuterWrapper: {
    marginBottom: 2,
  },
  msgOuterRight: {
    alignItems: 'flex-end',
  },
  msgOuterLeft: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 16,
    padding: 12,
    overflow: 'hidden',
  },
  noPadBubble: { padding: 0 },
  messageSeller: {
    backgroundColor: '#D97706',
    borderTopRightRadius: 4,
  },
  messageBuyer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopLeftRadius: 4,
  },
  messageSellerExpanded: {
    backgroundColor: '#B45309',
  },
  messageBuyerExpanded: {
    backgroundColor: '#FFF7ED',
    borderColor: '#D97706',
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
  messageTimeOutside: {
    fontSize: 11,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  messageTimeOutsideRight: {
    color: '#9CA3AF',
    textAlign: 'right',
  },
  messageTimeOutsideLeft: {
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
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});
