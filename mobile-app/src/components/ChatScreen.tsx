import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, ListRenderItemInfo,
  Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Store, User, Ticket, ImageIcon, FileText, Play, Paperclip } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';
import { chatService, Conversation, Message } from '../services/chatService';
import { getMimeFromExtension, detectMediaTypeFromExtension, CHAT_MEDIA_LIMITS, ALL_PLACEHOLDERS, MEDIA_PLACEHOLDER_MAP, type ChatMediaType } from '../utils/chatMediaUtils';
import type { RootStackParamList } from '../../App';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Strip timestamp prefix from filename: "1712345678_report.pdf" → "report.pdf"
const extractFileName = (url: string, fallback = 'Document.pdf') => {
  try {
    const raw = decodeURIComponent(url.split('/').pop()?.split('?')[0] || fallback);
    const match = raw.match(/^\d+_(.+)$/);
    return match ? match[1] : raw;
  } catch { return fallback; }
};

// ─── Typed list items ──────────────────────────────────────────────────────────
type MessageItem = { type: 'message'; data: Message; id: string };
type DateSepItem = { type: 'date_sep'; label: string; id: string };
type ListItem = MessageItem | DateSepItem;

// ─── Date label helper ─────────────────────────────────────────────────────
function formatDateLabel(dateKey: string): string {
  const todayString = new Date().toDateString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayString = yesterdayDate.toDateString();

  if (dateKey === todayString) return 'Today';
  if (dateKey === yesterdayString) return 'Yesterday';

  // Full format: "Friday, March 27, 2026"
  return new Date(dateKey).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ChatScreen({ conversation, currentUserId, userType, onBack }: any) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const flatListRef = useRef<FlatList<ListItem>>(null);
  const isScreen = route?.name === 'Chat';

  const effectiveConversation = isScreen ? route.params?.conversation : conversation;
  const effectiveUserId = isScreen ? route.params?.currentUserId : currentUserId;
  const effectiveUserType = isScreen ? route.params?.userType : userType;
  const handleBack = isScreen ? () => navigation.goBack() : onBack;

  const conversationId = effectiveConversation?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // ─── Build flat data array for inverted FlatList ──────────────────────────
  // Messages are kept in chronological order (oldest → newest).
  // We reverse them so index 0 == newest, which inverted FlatList places at
  // the bottom — the natural chat anchor point.
  // Date separators are interleaved so they appear above the first message of
  // each day (visually "above" = higher index in the inverted array).
  const listData = useMemo((): ListItem[] => {
    const sorted = [...messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const flat: ListItem[] = [];
    let lastDateKey = '';
    sorted.forEach((msg) => {
      const dateKey = new Date(msg.created_at).toDateString();
      if (dateKey !== lastDateKey) {
        flat.push({ type: 'date_sep', label: formatDateLabel(dateKey), id: `sep-${dateKey}` });
        lastDateKey = dateKey;
      }
      flat.push({ type: 'message', data: msg, id: msg.id });
    });

    // Reverse: newest message ends up at index 0 → renders at bottom with inverted
    return flat.reverse();
  }, [messages]);

  const displayName = effectiveUserType === 'buyer'
    ? effectiveConversation?.seller_store_name || 'Store'
    : effectiveConversation?.buyer_name || 'Customer';

  const avatarUrl = effectiveUserType === 'buyer'
    ? effectiveConversation?.seller_avatar
    : effectiveConversation?.buyer_avatar;

  // ─── Load initial messages ────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const msgs = await chatService.getMessages(conversationId);
      setMessages(msgs);
      await chatService.markAsRead(conversationId, effectiveUserId, effectiveUserType);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, effectiveUserId, effectiveUserType]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Auto-scroll to newest message whenever the list grows (initial load + new real-time messages).
  // offset 0 = the "top" of the inverted list, which renders as the bottom visually.
  useEffect(() => {
    if (listData.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: false }), 50);
    }
  }, [listData.length]);



  // ─── Real-time subscription ───────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = chatService.subscribeToMessages(conversationId, (newMsg) => {
      setMessages(prev => {
        // Deduplicate: skip if we already have this id (avoid echoing optimistic msg)
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // Auto-scroll to the new message (animated for incoming messages)
      setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
      if (newMsg.sender_type !== effectiveUserType) {
        chatService.markAsRead(conversationId, effectiveUserId, effectiveUserType);
      }
    });
    return unsubscribe; // teardown on unmount / conversationId change
  }, [conversationId, effectiveUserId, effectiveUserType]);

  // ─── Optimistic send ──────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId) return;
    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    // 1. Append a temporary optimistic message immediately
    const tempMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: effectiveUserId,
      sender_type: effectiveUserType,
      content: messageText,
      is_read: false,
      created_at: new Date().toISOString(),
      message_type: 'user',
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage('');

    try {
      const sentMsg = await chatService.sendMessage(
        conversationId, effectiveUserId, effectiveUserType, messageText
      );
      if (sentMsg) {
        setMessages(prev =>
          // If the realtime echo already added it, just drop the temp; otherwise swap
          prev.some(m => m.id === sentMsg.id)
            ? prev.filter(m => m.id !== tempId)
            : prev.map(m => m.id === tempId ? sentMsg : m)
        );
      }
    } catch (error) {
      // Rollback: remove temp message and restore input
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(messageText);
    }
  };

  // ─── Media Pickers ────────────────────────────────────────────────────────
  const pickMedia = async () => {
    if (!conversationId || !effectiveUserId) return;
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

    // Validate size
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    const maxSize = CHAT_MEDIA_LIMITS[mediaType].maxSize;
    if (fileInfo.exists && 'size' in fileInfo && fileInfo.size > maxSize) {
      Alert.alert('File too large', `Max ${maxSize / (1024 * 1024)} MB for ${mediaType}s`);
      return;
    }

    setUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      });
      const fileName = `${Date.now()}.${ext}`;
      const url = await chatService.uploadChatMedia(base64, conversationId, fileName, mime);
      if (!url) {
        Alert.alert('Upload failed', 'Could not upload the file. Please try again.');
        return;
      }

      const placeholder = MEDIA_PLACEHOLDER_MAP[mediaType];
      // Optimistic message
      const tempId = `temp-${Date.now()}`;
      const tempMsg: Message = {
        id: tempId, conversation_id: conversationId, sender_id: effectiveUserId,
        sender_type: effectiveUserType, content: placeholder, media_url: url,
        media_type: mediaType, is_read: false, created_at: new Date().toISOString(),
        message_type: mediaType,
      };
      setMessages(prev => [...prev, tempMsg]);

      const sentMsg = await chatService.sendMessage(
        conversationId, effectiveUserId, effectiveUserType, placeholder, undefined, url, mediaType
      );
      if (sentMsg) {
        setMessages(prev =>
          prev.some(m => m.id === sentMsg.id)
            ? prev.filter(m => m.id !== tempId)
            : prev.map(m => m.id === tempId ? sentMsg : m)
        );
      }
    } catch (err) {
      console.error('[ChatScreen] pickMedia error:', err);
    } finally {
      setUploading(false);
    }
  };

  const pickDocument = async () => {
    if (!conversationId || !effectiveUserId) return;
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

    setUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      });
      const fileName = asset.name || `${Date.now()}.pdf`;
      const url = await chatService.uploadChatMedia(base64, conversationId, fileName, 'application/pdf');
      if (!url) {
        Alert.alert('Upload failed', 'Could not upload the document. Please try again.');
        return;
      }

      const tempId = `temp-${Date.now()}`;
      const tempMsg: Message = {
        id: tempId, conversation_id: conversationId, sender_id: effectiveUserId,
        sender_type: effectiveUserType, content: '[Document]', media_url: url,
        media_type: 'document', is_read: false, created_at: new Date().toISOString(),
        message_type: 'document',
      };
      setMessages(prev => [...prev, tempMsg]);

      const sentMsg = await chatService.sendMessage(
        conversationId, effectiveUserId, effectiveUserType, '[Document]', undefined, url, 'document'
      );
      if (sentMsg) {
        setMessages(prev =>
          prev.some(m => m.id === sentMsg.id)
            ? prev.filter(m => m.id !== tempId)
            : prev.map(m => m.id === tempId ? sentMsg : m)
        );
      }
    } catch (err) {
      console.error('[ChatScreen] pickDocument error:', err);
    } finally {
      setUploading(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ─── FlatList render functions ────────────────────────────────────────────
  const renderItem = ({ item }: ListRenderItemInfo<ListItem>) => {
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

    if (msg.message_type === 'system') {
      return (
        <View style={styles.systemMessageWrapper}>
          <View style={styles.systemMessageDivider} />
          <Text style={styles.systemMessageText}>{msg.content || msg.message_content}</Text>
          <View style={styles.systemMessageDivider} />
        </View>
      );
    }

    const isMe = msg.sender_type === effectiveUserType;
    const isPending = msg.id.startsWith('temp-');
    const imgUrl = msg.media_url || msg.image_url;
    const hasMedia = !!msg.media_url;
    const isImage = msg.media_type === 'image' || msg.message_type === 'image' || (!msg.media_type && !!msg.image_url);
    const isVideo = msg.media_type === 'video' || msg.message_type === 'video';
    const isDoc = msg.media_type === 'document' || msg.message_type === 'document';
    const isPlaceholder = ALL_PLACEHOLDERS.includes(msg.content);
    const showText = msg.content && !(isPlaceholder && (hasMedia || !!msg.image_url));
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
        {/* Image — media_url or legacy image_url */}
        {imgUrl && isImage && (
          <Image source={{ uri: imgUrl }} style={styles.mediaBubbleImage} resizeMode="cover" />
        )}
        {/* Video */}
        {hasMedia && isVideo && (
          <Pressable onPress={() => msg.media_url && Linking.openURL(msg.media_url)} style={styles.videoThumb}>
            <Play size={28} color="#FFFFFF" />
            <Text style={styles.videoLabel}>Tap to play</Text>
          </Pressable>
        )}
        {hasMedia && isDoc && (
          <Pressable onPress={() => msg.media_url && Linking.openURL(msg.media_url)} style={[styles.docBubble, isMe ? styles.docBubbleMy : styles.docBubbleTheir]}>
            <FileText size={18} color={isMe ? '#FFFFFF' : COLORS.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.docText, isMe ? styles.docTextMy : styles.docTextTheir]} numberOfLines={1}>
                {extractFileName(msg.media_url!)}
              </Text>
              <Text style={[styles.docSubText, isMe ? styles.docSubTextMy : styles.docSubTextTheir]}>PDF · Tap to open</Text>
            </View>
          </Pressable>
        )}
        {/* Text (hide placeholders only when media is present) */}
        {showText && (
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
            {msg.content}
          </Text>
        )}
        <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.theirMessageTime]}>
          {isPending ? '·' : formatTime(msg.created_at)}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
        {/* 👈 NEW: Refactored headerInfo for Online/Offline UI */}
        <View style={styles.headerInfo}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : effectiveUserType === 'buyer' ? (
              <Store size={18} color={COLORS.primary} />
            ) : (
              <User size={18} color={COLORS.primary} />
            )}
            <View style={effectiveConversation?.is_online ? styles.tealOnlineIndicator : styles.offlineIndicator} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{displayName}</Text>
            <View style={styles.statusRow}>
              <View style={effectiveConversation?.is_online ? styles.statusDot : styles.statusDotOffline} />
              <Text style={styles.statusText}>
                {effectiveConversation?.is_online ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Pressable style={styles.menuButton} onPress={() => navigation.navigate('CreateTicket')}>
            <Ticket size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        /* inverted={true} anchors the list to the bottom natively.
           data is pre-reversed (newest = index 0) so the newest message
           renders at the bottom and new items animate in from there.
           keyboardDismissMode="interactive" gives a native swipe-to-dismiss. */
        <FlatList<ListItem>
          ref={flatListRef}
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted={true}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        />
      )}

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.inputBar}>
          <Pressable onPress={pickMedia} style={styles.attachButton} disabled={uploading}>
            {uploading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <ImageIcon size={22} color="#9CA3AF" />}
          </Pressable>
          <Pressable onPress={pickDocument} style={styles.attachButton} disabled={uploading}>
            <Paperclip size={22} color="#9CA3AF" />
          </Pressable>
          <TextInput style={styles.input} value={newMessage} onChangeText={setNewMessage} placeholder="Type a message..." multiline />
          <Pressable onPress={() => handleSend()} style={[styles.sendButton, (!newMessage.trim() || uploading) && styles.sendButtonDisabled]} disabled={!newMessage.trim() || uploading}>
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
  avatarContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 18 },
  tealOnlineIndicator: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#0D9488', borderWidth: 2, borderColor: COLORS.primary },
  // 👈 NEW: Offline Styles
  offlineIndicator: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#9CA3AF', borderWidth: 2, borderColor: COLORS.primary },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0D9488' },
  // 👈 NEW: Offline Styles
  statusDotOffline: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9CA3AF' },
  statusText: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  menuButton: { padding: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesContainer: { flex: 1, backgroundColor: '#F5F5F7' },
  messagesContent: { padding: 16, paddingBottom: 20, gap: 8 },
  systemMessageWrapper: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 20 },
  systemMessageDivider: { flex: 1, height: 1, backgroundColor: 'rgba(249, 115, 22, 0.2)' },
  systemMessageText: { marginHorizontal: 12, fontSize: 12, fontWeight: '700', color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.5 },
  messageBubble: { maxWidth: '75%', borderRadius: 16, padding: 12, marginVertical: 2 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#FFFFFF' },
  theirMessageText: { color: '#1F2937' },
  messageTime: { fontSize: 11, marginTop: 4 },
  myMessageTime: { color: 'rgba(255, 255, 255, 0.7)', textAlign: 'right' },
  theirMessageTime: { color: '#9CA3AF' },
  dateSepWrapper: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dateSepText: { marginHorizontal: 10, fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContainer: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  input: { flex: 1, backgroundColor: '#F2F2F2', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12, fontSize: 15, color: '#1F2937' },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#E5E7EB' },
  attachButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  mediaBubbleImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
  videoThumb: { width: 200, height: 140, borderRadius: 12, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  videoLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginTop: 6 },
  docBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 4 },
  docBubbleMy: { backgroundColor: 'rgba(255,255,255,0.15)' },
  docBubbleTheir: { backgroundColor: '#F3F4F6' },
  docText: { fontSize: 14, fontWeight: '600' },
  docTextMy: { color: '#FFFFFF' },
  docTextTheir: { color: COLORS.primary },
  docSubText: { fontSize: 11, marginTop: 1 },
  docSubTextMy: { color: 'rgba(255,255,255,0.6)' },
  docSubTextTheir: { color: '#9CA3AF' },
});