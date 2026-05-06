import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  ChevronRight,
  Ticket,
  X,
  MessageSquare,
  FileText,
  Play,
  ArrowDown,
  Reply,
  Ban,
  AlertTriangle,
} from 'lucide-react-native';
import { Alert, Keyboard } from 'react-native';
import { chatService, Conversation as ChatConversation, Message as ChatMessage } from '../../src/services/chatService';
import { getMimeFromExtension, normalizeMimeType, CHAT_MEDIA_LIMITS, ALL_PLACEHOLDERS, MEDIA_PLACEHOLDER_MAP, extractFileName, type ChatMediaType } from '../../src/utils/chatMediaUtils';
import { formatDateLabel, formatMessageTimestamp } from '../../src/utils/chatDateUtils';
import { isMessagingBlocked, type MessagingAccountStatus } from '../../src/utils/messagingAccountStatus';
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
const SELLER_CHATLIST_STALE_MS = 30_000;

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
  const [chatLoading, setChatLoading] = useState(false);
  const conversationsRef = useRef<ChatConversation[]>([]);
  const pendingConversationLoadsRef = useRef<Set<string>>(new Set());
  const lastConversationsLoadAtRef = useRef(0);

  // Real conversations and messages from database
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Search filtering — buyer name only
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter(conv => {
      const name = (conv.buyer?.full_name || conv.buyer_name || '').toLowerCase();
      return name.includes(q);
    });
  }, [conversations, searchQuery]);

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

  // Attachment panel — auto-hides when typing, expand-only chevron
  const [showAttachments, setShowAttachments] = useState(true);

  // Reply-to state (Step 9)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Jump-to-latest button
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const jumpButtonOpacity = useRef(new Animated.Value(0)).current;
  const showJumpRef = useRef(false);
  const [sellerMessagingStatus, setSellerMessagingStatus] = useState<MessagingAccountStatus>('active');

  const handleInputChange = (text: string) => {
    setNewMessage(text);
    if (text.length > 0 && showAttachments) setShowAttachments(false);
    if (text.length === 0) setShowAttachments(true);
  };

  // Smooth keyboard padding animation
  const bottomPadAnim = useRef(new Animated.Value(Math.max(insets.bottom, 8))).current;
  useEffect(() => {
    const onShow = () => Animated.timing(bottomPadAnim, {
      toValue: 8, duration: 220, useNativeDriver: false,
    }).start();
    const onHide = () => Animated.timing(bottomPadAnim, {
      toValue: Math.max(insets.bottom, 8), duration: 220, useNativeDriver: false,
    }).start();
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onShow
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onHide
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Load real conversations from database
  const loadConversations = useCallback(async (options?: { force?: boolean; silent?: boolean }) => {
    // Use seller.id from sellerStore (the seller's UUID), not user.id from authStore
    const sellerId = seller?.id;
    if (!sellerId) {
      console.log('[SellerMessages] No seller ID available');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const force = options?.force === true;
    const silent = options?.silent === true;
    const now = Date.now();
    const hasExistingData = conversationsRef.current.length > 0;
    const isFresh = hasExistingData && (now - lastConversationsLoadAtRef.current) < SELLER_CHATLIST_STALE_MS;

    if (!force && isFresh) {
      if (!silent) setRefreshing(false);
      return;
    }

    const startedAt = now;

    console.log('[SellerMessages] Loading conversations for seller:', sellerId);
    try {
      const convs = await chatService.getSellerConversations(sellerId);
      console.log('[SellerMessages] Loaded conversations:', convs.length);
      setConversations(convs);
      lastConversationsLoadAtRef.current = Date.now();
    } catch (error) {
      console.error('[SellerMessages] Error loading conversations:', error);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);

      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log(`[Perf][SellerMessages] Chatlist load: ${Date.now() - startedAt}ms`);
      }
    }
  }, [seller?.id]);

  const fetchAndMergeMissingConversation = useCallback(async (conversationId: string) => {
    const sellerId = seller?.id;
    if (!sellerId) return;
    if (pendingConversationLoadsRef.current.has(conversationId)) return;

    pendingConversationLoadsRef.current.add(conversationId);
    try {
      const conv = await chatService.getSellerConversationById(conversationId, sellerId);
      if (!conv) return;

      setConversations(prev => {
        const merged = [conv, ...prev.filter(c => c.id !== conv.id)];
        return merged.sort((a, b) =>
          new Date(b.last_message_at || b.updated_at).getTime() -
          new Date(a.last_message_at || a.updated_at).getTime()
        );
      });
      lastConversationsLoadAtRef.current = Date.now();
    } catch (error) {
      console.error('[SellerMessages] Error merging realtime conversation:', error);
    } finally {
      pendingConversationLoadsRef.current.delete(conversationId);
    }
  }, [seller?.id]);

  useEffect(() => {
    void loadConversations({ force: true });
  }, [loadConversations]);

  useEffect(() => {
    if (!seller?.id) {
      setSellerMessagingStatus('active');
      return;
    }

    let active = true;
    chatService.getSellerMessagingStatusById(seller.id)
      .then((status) => {
        if (active) setSellerMessagingStatus(status);
      })
      .catch((error) => {
        console.error('[SellerMessages] Error loading seller messaging status:', error);
      });

    return () => {
      active = false;
    };
  }, [seller?.id]);

  // Real-time chatlist: lightweight subscription to messages table.
  // Updates conversation preview + unread badge instantly without async enrichment.
  useEffect(() => {
    if (!seller?.id) return;
    return chatService.subscribeToAllNewMessages((newMsg) => {
      const existsInList = conversationsRef.current.some(c => c.id === newMsg.conversation_id);
      const buyerMetadata = typeof newMsg.message_content === 'string' ? newMsg.message_content : '';
      const likelyTargetsThisSeller = newMsg.sender_type === 'buyer' && buyerMetadata.includes(seller.id);
      const isOwnSellerMessage = newMsg.sender_type === 'seller' && newMsg.sender_id === seller.id;

      if (!existsInList) {
        if (likelyTargetsThisSeller || isOwnSellerMessage) {
          void fetchAndMergeMissingConversation(newMsg.conversation_id);
        }
        return;
      }

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
      lastConversationsLoadAtRef.current = Date.now();
    });
  }, [seller?.id, fetchAndMergeMissingConversation]);

  // Silent refresh when returning to the chatlist from a conversation.
  // Syncs unread badges after markAsRead was called in the chat view.
  useFocusEffect(
    useCallback(() => {
      const sellerId = seller?.id;
      if (!sellerId || loading) return;
      void loadConversations({ silent: true });
    }, [seller?.id, loading, loadConversations])
  );


  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      setChatLoading(true);
      const startedAt = Date.now();
      try {
        const msgs = await chatService.getMessages(selectedConversation);
        setMessages(msgs);
        // Scroll to latest (offset 0 = newest in inverted FlatList)
        setTimeout(() => {
          chatFlatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }, 100);
        // Mark as read in the background so message render is not delayed.
        if (seller?.id) {
          void chatService
            .markAsRead(selectedConversation, seller.id, 'seller')
            .catch((error) => {
              console.error('[SellerMessages] markAsRead failed:', error);
            });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setChatLoading(false);

        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log(`[Perf][SellerMessages] Thread load: ${Date.now() - startedAt}ms`);
        }
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
            // Step 4: carry over reply preview from temp message
            if (newMsg.reply_to_message_id && !newMsg.reply_to_content) {
              newMsg.reply_to_content = prev[tempIdx].reply_to_content;
              newMsg.reply_to_sender_type = prev[tempIdx].reply_to_sender_type;
            }
            const updated = [...prev];
            updated[tempIdx] = newMsg;
            return updated;
          }
          // Step 4: resolve reply content for incoming replies
          if (newMsg.reply_to_message_id && !newMsg.reply_to_content) {
            const original = prev.find(m => m.id === newMsg.reply_to_message_id);
            if (original) {
              newMsg.reply_to_content = original.content;
              newMsg.reply_to_sender_type = original.sender_type;
            }
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
    void loadConversations({ force: true, silent: true });
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

  const sellerRestrictionHeaderText = useMemo(() => {
    if (sellerMessagingStatus === 'suspended') return 'Your Account is Suspended';
    if (sellerMessagingStatus === 'restricted') return 'Your Account is Restricted';
    return null;
  }, [sellerMessagingStatus]);

  const sellerRestrictionBodyText = useMemo(() => {
    if (sellerMessagingStatus === 'suspended') return 'You are not able to message while account is suspended.';
    if (sellerMessagingStatus === 'restricted') return 'You are not able to message while account is restricted.';
    return null;
  }, [sellerMessagingStatus]);

  const guardSellerSendBlocked = useCallback(() => {
    if (!isMessagingBlocked(sellerMessagingStatus) || !sellerRestrictionBodyText) return false;
    Alert.alert(sellerRestrictionHeaderText || 'Unable to message', sellerRestrictionBodyText);
    return true;
  }, [sellerMessagingStatus, sellerRestrictionBodyText, sellerRestrictionHeaderText]);

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
    if (guardSellerSendBlocked()) return;

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
      reply_to_message_id: replyingTo?.id || null,
      reply_to_content: replyingTo?.content,
      reply_to_sender_type: replyingTo?.sender_type,
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage('');
    setReplyingTo(null);

    try {
      const result = await chatService.sendMessage(
        selectedConversation,
        seller.id,
        'seller',
        messageText,
        undefined, undefined, undefined, replyingTo?.id
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
    const rawMime = asset.mimeType || getMimeFromExtension(ext);
    const mime = normalizeMimeType(rawMime, mediaType);

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
    // Write to temp file so WebView can render natively
    const tempUri = `${FileSystem.cacheDirectory}sendpreview_${Date.now()}.pdf`;
    await FileSystem.writeAsStringAsync(tempUri, base64, { encoding: 'base64' });
    pendingUpload.current = { base64, fileName, mime: 'application/pdf', mediaType: 'document' };
    setSendPreviewAsset({
      uri: tempUri,
      name: fileName,
      type: 'document',
      size: asset.size ?? undefined,
    });
    setSendPreviewVisible(true);
  };

  const handleConfirmSend = async () => {
    if (!pendingUpload.current || !selectedConversation || !seller?.id) return;
    if (guardSellerSendBlocked()) return;
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
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        Alert.alert('Send failed', 'Message was not saved. Please try again.');
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
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
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
        {/* Horizontal row — reply icon beside bubble */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          {/* Seller (sent): reply icon LEFT of bubble */}
          {isSeller && !isPending && msg.message_type !== 'system' && (
            <Pressable onPress={() => setReplyingTo(msg)} hitSlop={8} style={{ padding: 2 }}>
              <Reply size={14} color="#9CA3AF" />
            </Pressable>
          )}
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
              {/* Replied-to preview (Step 9) */}
              {msg.reply_to_message_id && (
                <Pressable
                  onPress={() => {
                    const idx = listData.findIndex(i => i.id === msg.reply_to_message_id);
                    if (idx >= 0) chatFlatListRef.current?.scrollToIndex({ index: idx, animated: true });
                  }}
                  style={{ padding: 8, borderRadius: 8, marginBottom: 6, borderLeftWidth: 3, backgroundColor: isSeller ? 'rgba(255,255,255,0.15)' : '#F3F4F6', borderLeftColor: isSeller ? 'rgba(255,255,255,0.5)' : COLORS.primary }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isSeller ? 'rgba(255,255,255,0.8)' : COLORS.primary }} numberOfLines={1}>
                    {msg.reply_to_sender_type === 'seller' ? 'You' : (activeConversation?.buyer_name || 'Buyer')}
                  </Text>
                  <Text style={{ fontSize: 12, lineHeight: 16, color: isSeller ? 'rgba(255,255,255,0.6)' : '#6B7280' }} numberOfLines={2}>
                    {msg.reply_to_content || '...'}
                  </Text>
                </Pressable>
              )}
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
              {/* Document */}
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
              {/* Text */}
              {msg.content && !(isPlaceholder && (hasMedia || !!msg.image_url)) && (
                <Text style={[styles.messageText, isSeller ? styles.messageTextSeller : styles.messageTextBuyer]}>
                  {msg.content}
                </Text>
              )}
            </View>
          </Pressable>
          {/* Buyer (received): reply icon RIGHT of bubble */}
          {!isSeller && !isPending && msg.message_type !== 'system' && (
            <Pressable onPress={() => setReplyingTo(msg)} hitSlop={8} style={{ padding: 2 }}>
              <Reply size={14} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
        {isExpanded && !isPending && (
          <Text style={[styles.messageTimeOutside, isSeller ? styles.messageTimeOutsideRight : styles.messageTimeOutsideLeft]}>
            {formatMessageTimestamp(msg.created_at)}
          </Text>
        )}
      </View>
    );
  }, [expandedMsgId, openPreview]);

  const renderConversationItem = ({ item: conv }: { item: ChatConversation }) => (
    <Pressable
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
            {formatTime(conv.last_message_at || new Date().toISOString())}
          </Text>
        </View>
        <View style={styles.conversationFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {conv.last_message || 'No messages yet'}
          </Text>
          {(conv.seller_unread_count || 0) > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{conv.seller_unread_count || 0}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  if (!selectedConversation) {
    // Conversations List View
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          {/* Step 9: lowered header with centered title */}
          <View style={[styles.headerTop, { paddingTop: insets.top + 10 }]}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
              <ArrowLeft size={24} color="#1F2937" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>Messages</Text>
            {/* Spacer to balance back button and center title */}
            <View style={{ width: 32 }} />
          </View>

          {/* Search Bar */}
          <View style={{ marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 48 }}>
            <Search size={20} color="#9CA3AF" strokeWidth={2} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search Conversation"
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

        {loading && !refreshing ? (
          <View style={styles.conversationsList}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonRow key={i} shimmer={shimmer} />
            ))}
          </View>
        ) : (
          <FlatList
            style={styles.conversationsList}
            data={filteredConversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversationItem}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 120 }}>
                <MessageSquare size={48} color="#D1D5DB" />
                <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 16 }}>
                  {searchQuery.trim() ? 'No buyers found' : 'No messages yet'}
                </Text>
                <Text style={{ marginTop: 4, color: '#9CA3AF', textAlign: 'center' }}>
                  {searchQuery.trim()
                    ? `No conversations match "${searchQuery}"`
                    : 'Messages from buyers will appear here'}
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
            }
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews
            contentContainerStyle={filteredConversations.length === 0 ? styles.emptyConversationsContent : undefined}
            showsVerticalScrollIndicator={false}
          />
        )}
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

      {sellerRestrictionHeaderText && (
        <View style={styles.accountRestrictionBannerWrap}>
          <View style={styles.accountRestrictionBanner}>
            {sellerMessagingStatus === 'suspended' ? (
              <Ban size={13} color="#9B1C1C" />
            ) : (
              <AlertTriangle size={13} color="#9B1C1C" />
            )}
            <Text style={styles.accountRestrictionText}>{sellerRestrictionHeaderText}</Text>
          </View>
        </View>
      )}

      {/* Messages — inverted FlatList */}
      {chatLoading ? (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24, backgroundColor: '#F5F5F7' }}>
          {[{ align: 'flex-start' as const, w: 0.65 }, { align: 'flex-end' as const, w: 0.50 }, { align: 'flex-start' as const, w: 0.45 }, { align: 'flex-end' as const, w: 0.70 }, { align: 'flex-start' as const, w: 0.55 }, { align: 'flex-end' as const, w: 0.40 }, { align: 'flex-start' as const, w: 0.60 }, { align: 'flex-end' as const, w: 0.55 }].map((item, i) => (
            <View key={i} style={{ alignSelf: item.align, marginVertical: 6 }}>
              <View style={{ width: Dimensions.get('window').width * item.w - 32, height: 44, borderRadius: 16, backgroundColor: '#D1D5DB' }} />
            </View>
          ))}
        </View>
      ) : (
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
            <MessageSquare size={48} color="#D1D5DB" />
            <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 16, fontWeight: '600' }}>Start Messaging</Text>
            <Text style={{ marginTop: 4, color: '#9CA3AF', textAlign: 'center' }}>Send your first message to this buyer</Text>
          </View>
        }
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const scrolledAway = offsetY > 200;
          if (scrolledAway && !showJumpRef.current) {
            showJumpRef.current = true;
            setShowJumpToLatest(true);
            Animated.timing(jumpButtonOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
          } else if (!scrolledAway && showJumpRef.current) {
            showJumpRef.current = false;
            Animated.timing(jumpButtonOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowJumpToLatest(false));
          }
        }}
        scrollEventThrottle={16}
      />
      )}

      {/* Jump to latest button — always rendered for smooth fade */}
      <Animated.View
        style={{ position: 'absolute', right: 16, bottom: 90, zIndex: 100, opacity: jumpButtonOpacity }}
        pointerEvents={showJumpToLatest ? 'auto' : 'none'}
      >
        <Pressable
          onPress={() => chatFlatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 }}
        >
          <ArrowDown size={18} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </Animated.View>

      {/* Reply preview bar (Step 9) */}
      {replyingTo && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F3F4F6', gap: 10 }}>
          <View style={{ width: 3, height: '100%' as any, backgroundColor: COLORS.primary, borderRadius: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>
              Replying to {replyingTo.sender_type === 'seller' ? 'yourself' : (activeConversation?.buyer_name || 'Buyer')}
            </Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }} numberOfLines={2}>
              {replyingTo.content}
            </Text>
          </View>
          <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
            <X size={18} color="#9CA3AF" />
          </Pressable>
        </View>
      )}

      {/* Input Area */}
      <Animated.View style={[styles.inputContainer, { paddingBottom: bottomPadAnim }]}>
        {/* Expand toggle — only shown when attachment icons are hidden */}
        {!showAttachments && (
          <Pressable onPress={() => setShowAttachments(true)} style={styles.attachButton}>
            <ChevronRight size={20} color="#6B7280" strokeWidth={2} />
          </Pressable>
        )}
        {/* Attachment icons */}
        {showAttachments && (
          <>
            <Pressable onPress={pickMedia} style={styles.attachButton} disabled={uploading}>
              {uploading ? <ActivityIndicator size="small" color="#D97706" /> : <ImageIcon size={20} color="#6B7280" strokeWidth={2} />}
            </Pressable>
            <Pressable onPress={pickDocument} style={styles.attachButton} disabled={uploading}>
              <Paperclip size={20} color="#6B7280" strokeWidth={2} />
            </Pressable>
          </>
        )}
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={newMessage}
          onChangeText={handleInputChange}
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!newMessage.trim() || uploading) && { opacity: 0.5 }]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || uploading}
        >
          <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </Animated.View>

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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerIconButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#1F2937', textAlign: 'center' },
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
  emptyConversationsContent: {
    flexGrow: 1,
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
  accountRestrictionBannerWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF4EC',
  },
  accountRestrictionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  accountRestrictionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9B1C1C',
    textAlign: 'center',
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
    maxWidth: Dimensions.get('window').width * 0.75 - 32,
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
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    fontSize: 14,
    maxHeight: 130,
    minHeight: 40,
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
