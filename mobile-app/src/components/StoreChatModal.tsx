import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
    TouchableWithoutFeedback,
    Dimensions,
    Image,
    Linking,
    Alert,
    Keyboard,
} from 'react-native';
import { ChevronLeft, Send, Store, Ticket, FileText, Play, ImageIcon, Paperclip, ChevronRight, ArrowDown, Reply, X as XIcon, MessageSquare } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { chatService, Conversation, Message as ChatMessage } from '../services/chatService';
import { getMimeFromExtension, CHAT_MEDIA_LIMITS, ALL_PLACEHOLDERS, MEDIA_PLACEHOLDER_MAP, extractFileName, type ChatMediaType } from '../utils/chatMediaUtils';
import { formatDateLabel, formatMessageTimestamp } from '../utils/chatDateUtils';
import ChatMediaPreviewModal from './ChatMediaPreviewModal';
import ChatSendPreviewModal, { type SendPreviewAsset } from './ChatSendPreviewModal';
import { useAuthStore } from '../stores/authStore';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

const { height: SCREEN_HEIGHT, width: SCREEN_W } = Dimensions.get('window');
const DOC_BUBBLE_W = SCREEN_W * 0.68; // explicit width so inner flex:1 text resolves



interface StoreChatModalProps {
    visible: boolean;
    onClose: () => void;
    storeName: string;
    sellerId?: string; // Required for real chat
}

const quickReplies = [
    'Is this available?',
    'Can I see real photos?',
    'Do you offer discounts?',
    'When will you ship?',
];

export default function StoreChatModal({ visible, onClose, storeName, sellerId }: StoreChatModalProps) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { user } = useAuthStore();

    // Real chat state
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [realMessages, setRealMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [inputText, setInputText] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);

    // Reply-to state (Step 9)
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

    // Quick reply cooldown state (Step 10)
    const [usedQuickReplies, setUsedQuickReplies] = useState<Record<string, number>>({});

    // Jump-to-latest for ScrollView (Step 14)
    const [showJumpToLatest, setShowJumpToLatest] = useState(false);
    const jumpButtonOpacity = useRef(new Animated.Value(0)).current;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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

    // Attachment panel: shown by default, auto-hides when user starts typing
    const [showAttachments, setShowAttachments] = useState(true);

    // Track keyboard visibility with smooth animation
    const bottomPadAnim = useRef(new Animated.Value(insets.bottom + 12)).current;
    useEffect(() => {
        const onShow = () => Animated.timing(bottomPadAnim, {
            toValue: 8, duration: 220, useNativeDriver: false,
        }).start();
        const onHide = () => Animated.timing(bottomPadAnim, {
            toValue: insets.bottom + 12, duration: 220, useNativeDriver: false,
        }).start();
        const show = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onShow
        );
        const hide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onHide
        );
        return () => { show.remove(); hide.remove(); };
    }, []);

    const handleInputChange = (text: string) => {
        setInputText(text);
        if (text.length > 0 && showAttachments) setShowAttachments(false);
        if (text.length === 0) setShowAttachments(true);
    };

    // Load real conversation if sellerId is provided
    const loadConversation = useCallback(async () => {
        if (!sellerId || !user?.id) {
            console.log('[StoreChatModal] Cannot load conversation:', { sellerId, userId: user?.id });
            return;
        }

        console.log('[StoreChatModal] Loading conversation for:', { sellerId, storeName, userId: user.id });
        setLoading(true);
        try {
            const conv = await chatService.getOrCreateConversation(user.id, sellerId);
            console.log('[StoreChatModal] Conversation result:', conv);

            if (conv) {
                setConversation(conv);
                const msgs = await chatService.getMessages(conv.id);
                console.log('[StoreChatModal] Loaded messages:', msgs.length);
                setRealMessages(msgs);

                // Mark as read
                await chatService.markAsRead(conv.id, user.id, 'buyer');

                // Immediate scroll for initial load
                scrollToBottom(false);
            } else {
                console.error('[StoreChatModal] Failed to get/create conversation');
            }
        } catch (error) {
            console.error('[StoreChatModal] Error loading conversation:', error);
        } finally {
            setLoading(false);
        }
    }, [sellerId, user?.id, storeName]);

    useEffect(() => {
        if (visible && sellerId && user?.id) {
            loadConversation();
        }
    }, [visible, sellerId, user?.id, loadConversation]);

    // Animation trigger
    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            slideAnim.setValue(SCREEN_HEIGHT);
        }
    }, [visible]);

    const handleCloseInternal = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
        ]).start(() => onClose());
    };

    // Subscribe to new messages
    useEffect(() => {
        if (!conversation?.id) return;

        const unsubscribe = chatService.subscribeToMessages(
            conversation.id,
            (newMsg) => {
                setRealMessages(prev => {
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
                if (newMsg.sender_type === 'seller' && user?.id) {
                    chatService.markAsRead(conversation.id, user.id, 'buyer');
                }
            }
        );

        return unsubscribe;
    }, [conversation?.id, user?.id]);

    useEffect(() => {
        if (visible) {
            scrollToBottom();
        }
    }, [realMessages, visible]);

    const scrollToBottom = (animated = true) => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated });
        }, 200);
    };

    // Optimistic send message handler
    const handleSend = async (text?: string) => {
        const messageText = text || inputText.trim();
        if (!messageText || !conversation || !user?.id || sending) {
            return;
        }

        const tempId = `temp-${Date.now()}`;
        const tempMsg: ChatMessage = {
            id: tempId,
            conversation_id: conversation.id,
            sender_id: user.id,
            sender_type: 'buyer',
            content: messageText,
            is_read: false,
            created_at: new Date().toISOString(),
            message_type: 'user',
            reply_to_message_id: replyingTo?.id || null,
            reply_to_content: replyingTo?.content,
            reply_to_sender_type: replyingTo?.sender_type,
        };
        setRealMessages(prev => [...prev, tempMsg]);
        setInputText('');
        setReplyingTo(null);

        try {
            const sentMessage = await chatService.sendMessage(
                conversation.id,
                user.id,
                'buyer',
                messageText,
                undefined,
                undefined,
                undefined,
                replyingTo?.id,
                { targetSellerId: sellerId }
            );

            if (!sentMessage) {
                // Rollback
                setRealMessages(prev => prev.filter(m => m.id !== tempId));
                setInputText(messageText);
            } else {
                setRealMessages(prev =>
                    prev.some(m => m.id === sentMessage.id)
                        ? prev.filter(m => m.id !== tempId)
                        : prev.map(m => m.id === tempId ? sentMessage : m)
                );
            }
        } catch (error) {
            console.error('[StoreChatModal] Error sending message:', error);
            setRealMessages(prev => prev.filter(m => m.id !== tempId));
            setInputText(messageText);
        }
    };

    // ─── Media Pickers ────────────────────────────────────────────────────────
    const pickMedia = async () => {
        if (!conversation?.id || !user?.id) return;
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
        if (!conversation?.id || !user?.id) return;
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
        // Write to a temp file so WebView can render it natively
        const tempUri = `${FileSystem.cacheDirectory}sendpreview_${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(tempUri, base64, { encoding: 'base64' });
        pendingUpload.current = { base64, fileName, mime: 'application/pdf', mediaType: 'document' };
        setSendPreviewAsset({
            uri: tempUri,  // ← temp file URI
            name: fileName,
            type: 'document',
            size: asset.size ?? undefined,
        });
        setSendPreviewVisible(true);
    };

    const handleConfirmSend = async () => {
        if (!pendingUpload.current || !conversation?.id || !user?.id) return;
        const { base64, fileName, mime, mediaType } = pendingUpload.current;
        setUploading(true);
        try {
            const url = await chatService.uploadChatMedia(base64, conversation.id, fileName, mime);
            if (!url) {
                Alert.alert('Upload failed', 'Could not upload the file. Please try again.');
                return;
            }

            const placeholder = MEDIA_PLACEHOLDER_MAP[mediaType];
            const tempId = `temp-${Date.now()}`;
            const tempMsg: ChatMessage = {
                id: tempId, conversation_id: conversation.id, sender_id: user.id,
                sender_type: 'buyer', content: placeholder, media_url: url,
                media_type: mediaType, is_read: false, created_at: new Date().toISOString(),
                message_type: mediaType,
            };
            setRealMessages(prev => [...prev, tempMsg]);
            setSendPreviewVisible(false);
            setSendPreviewAsset(null);
            pendingUpload.current = null;

            const sentMsg = await chatService.sendMessage(
                conversation.id,
                user.id,
                'buyer',
                placeholder,
                undefined,
                url,
                mediaType,
                undefined,
                { targetSellerId: sellerId }
            );
            if (sentMsg) {
                setRealMessages(prev =>
                    prev.some(m => m.id === sentMsg.id)
                        ? prev.filter(m => m.id !== tempId)
                        : prev.map(m => m.id === tempId ? sentMsg : m)
                );
            } else {
                setRealMessages(prev => prev.filter(m => m.id !== tempId));
                Alert.alert('Send failed', 'Message was not saved. Please try again.');
            }
        } catch (err) {
            console.error('[StoreChatModal] upload error:', err);
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

    const handleAction = (target: string) => {
        if (target === 'CreateTicket') {
            handleCloseInternal();
            navigation.navigate('CreateTicket');
        }
    };

    // ─── Build date-separated message list ────────────────────────────────
    const renderMessages = () => {
        if (realMessages.length === 0) {
            return (
                <View style={{ padding: 40, alignItems: 'center' }}>
                    <MessageSquare size={48} color="#D1D5DB" />
                    <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 16, fontWeight: '600' }}>Start Messaging</Text>
                    <Text style={{ marginTop: 4, color: '#9CA3AF', textAlign: 'center' }}>Send your first message to {storeName}</Text>
                </View>
            );
        }

        const sorted = [...realMessages].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const elements: React.ReactNode[] = [];
        let lastDateKey = '';

        sorted.forEach((msg) => {
            const dateKey = new Date(msg.created_at).toDateString();
            if (dateKey !== lastDateKey) {
                elements.push(
                    <View key={`sep-${dateKey}`} style={styles.dateSepWrapper}>
                        <View style={styles.dateSepLine} />
                        <Text style={styles.dateSepText}>{formatDateLabel(dateKey)}</Text>
                        <View style={styles.dateSepLine} />
                    </View>
                );
                lastDateKey = dateKey;
            }

            const isBuyer = msg.sender_type === 'buyer';
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

            elements.push(
                <View key={msg.id} style={[styles.msgOuterWrapper, isBuyer ? styles.msgOuterRight : styles.msgOuterLeft]}>
                    <Pressable
                        onPress={() => { if (!hasAnyMedia) toggleTimestamp(); }}
                        onLongPress={toggleTimestamp}
                        delayLongPress={400}
                    >
                        <View style={[
                            styles.messageBubble,
                            isBuyer ? styles.userBubble : styles.storeBubble,
                            isExpanded && (isBuyer ? styles.userBubbleExpanded : styles.storeBubbleExpanded),
                            isDoc && !(msg.content && !(isPlaceholder && (hasMedia || !!msg.image_url))) && styles.noPadBubble,
                        ]}>
                            {/* Replied-to preview (Step 9) */}
                            {msg.reply_to_message_id && (
                                <Pressable style={{ padding: 8, borderRadius: 8, marginBottom: 6, borderLeftWidth: 3, backgroundColor: isBuyer ? 'rgba(255,255,255,0.15)' : '#F3F4F6', borderLeftColor: isBuyer ? 'rgba(255,255,255,0.5)' : COLORS.primary }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: isBuyer ? 'rgba(255,255,255,0.8)' : COLORS.primary }} numberOfLines={1}>
                                        {msg.reply_to_sender_type === 'buyer' ? 'You' : storeName}
                                    </Text>
                                    <Text style={{ fontSize: 12, lineHeight: 16, color: isBuyer ? 'rgba(255,255,255,0.6)' : '#6B7280' }} numberOfLines={2}>
                                        {msg.reply_to_content || '...'}
                                    </Text>
                                </Pressable>
                            )}
                            {imgUrl && isImage && (
                                <Pressable onPress={() => openPreview(imgUrl!, 'image')} onLongPress={toggleTimestamp} delayLongPress={400}>
                                    <Image source={{ uri: imgUrl }} style={{ width: 200, height: 200, borderRadius: 12, marginBottom: 4 }} resizeMode="cover" />
                                </Pressable>
                            )}
                            {hasMedia && isVideo && (
                                <Pressable onPress={() => openPreview(msg.media_url!, 'video')} onLongPress={toggleTimestamp} delayLongPress={400} style={{ width: 200, height: 140, borderRadius: 12, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                                    <Play size={28} color="#FFFFFF" />
                                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600', marginTop: 6 }}>Tap to play</Text>
                                </Pressable>
                            )}
                            {hasMedia && isDoc && (
                                <Pressable onPress={() => openPreview(msg.media_url!, 'document')} onLongPress={toggleTimestamp} delayLongPress={400} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, width: DOC_BUBBLE_W, backgroundColor: isBuyer ? 'rgba(255,255,255,0.15)' : '#F3F4F6' }}>
                                    {/* Fixed-size icon box — never compresses filename text */}
                                    <View style={{ width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: isBuyer ? 'rgba(255,255,255,0.15)' : '#FEF2F2' }}>
                                        <FileText size={18} color={isBuyer ? '#FFFFFF' : COLORS.primary} />
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: isBuyer ? '#FFFFFF' : COLORS.primary }} numberOfLines={1}>{extractFileName(msg.media_url!)}</Text>
                                        <Text style={{ fontSize: 11, marginTop: 2, color: isBuyer ? 'rgba(255,255,255,0.6)' : '#9CA3AF' }}>PDF · Tap to open</Text>
                                    </View>
                                </Pressable>
                            )}
                            {msg.content && !(isPlaceholder && (hasMedia || !!msg.image_url)) && (
                                <Text style={[
                                    styles.messageText,
                                    isBuyer ? styles.userText : styles.storeText,
                                ]}>
                                    {msg.content}
                                </Text>
                            )}
                        </View>
                    </Pressable>
                    {/* Reply button (Step 9) */}
                    {!isPending && msg.message_type !== 'system' && (
                        <Pressable
                            onPress={() => setReplyingTo(msg)}
                            style={{ padding: 4, marginTop: -2, alignSelf: isBuyer ? 'flex-end' : 'flex-start' }}
                            hitSlop={8}
                        >
                            <Reply size={14} color="#9CA3AF" />
                        </Pressable>
                    )}
                    {/* Timestamp — OUTSIDE bubble, shown on tap/long-press */}
                    {isExpanded && !isPending && (
                        <Text style={[styles.timestampOutside, isBuyer ? styles.timestampOutsideRight : styles.timestampOutsideLeft]}>
                            {formatMessageTimestamp(msg.created_at)}
                        </Text>
                    )}
                </View>
            );
        });

        return elements;
    };

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent={true}
            onRequestClose={handleCloseInternal}
            statusBarTranslucent={true}
        >
            <View style={{ flex: 1 }}>
                {/* Static Background Overlay (Fade animation) */}
                <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]} />

                <Animated.View style={[styles.modalAnimContainer, { transform: [{ translateY: slideAnim }] }]}>
                    <KeyboardAvoidingView
                        style={styles.container}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        {/* Header - Edge to Edge */}
                        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
                            <Pressable onPress={handleCloseInternal} style={styles.backButton}>
                                <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
                            </Pressable>

                            <View style={styles.headerInfo}>
                                <View style={styles.avatarContainer}>
                                    {conversation?.seller_avatar ? (
                                        <Image
                                            source={{ uri: conversation.seller_avatar }}
                                            style={styles.avatarImage}
                                        />
                                    ) : (
                                        <Store size={18} color={COLORS.primary} />
                                    )}
                                </View>
                                <View>
                                    <Text style={styles.headerTitle}>{storeName}</Text>
                                    <View style={styles.statusRow}>
                                        <View style={styles.statusDot} />
                                        <Text style={styles.statusText}>Online</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row' }}>
                                <Pressable
                                    style={styles.menuButton}
                                    onPress={() => handleAction('CreateTicket')}
                                >
                                    <Ticket size={24} color="#FFFFFF" />
                                </Pressable>
                            </View>
                        </View>

                        {/* Messages */}
                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.messagesContainer}
                            contentContainerStyle={styles.messagesContent}
                            onContentSizeChange={() => scrollToBottom(true)}
                            onLayout={() => scrollToBottom(false)}
                            onScroll={(event) => {
                                const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                                const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
                                const scrolledAway = distanceFromBottom > 300;
                                if (scrolledAway && !showJumpToLatest) {
                                    setShowJumpToLatest(true);
                                    Animated.timing(jumpButtonOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
                                } else if (!scrolledAway && showJumpToLatest) {
                                    Animated.timing(jumpButtonOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowJumpToLatest(false));
                                }
                            }}
                            scrollEventThrottle={16}
                        >
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={COLORS.primary} />
                                </View>
                            ) : !sellerId ? (
                                <View style={styles.loadingContainer}>
                                    <Text style={{ color: '#6B7280', textAlign: 'center' }}>
                                        Unable to start chat. Store information unavailable.
                                    </Text>
                                </View>
                            ) : !user?.id ? (
                                <View style={styles.loadingContainer}>
                                    <Text style={{ color: '#6B7280', textAlign: 'center' }}>
                                        Please log in to chat with this store.
                                    </Text>
                                </View>
                            ) : !conversation ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={COLORS.primary} />
                                    <Text style={{ color: '#6B7280', marginTop: 12 }}>Starting conversation...</Text>
                                </View>
                            ) : (
                                <>{renderMessages()}</>
                            )}
                        </ScrollView>

                        {/* Jump to latest button (Step 14) */}
                        {showJumpToLatest && (
                            <Animated.View style={{ position: 'absolute', right: 16, bottom: 120, zIndex: 100, opacity: jumpButtonOpacity }}>
                                <Pressable
                                    onPress={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 }}
                                >
                                    <ArrowDown size={18} color="#FFFFFF" strokeWidth={2.5} />
                                </Pressable>
                            </Animated.View>
                        )}

                        {/* Reply preview bar (Step 9) */}
                        {replyingTo && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F3F4F6', gap: 10 }}>
                                <View style={{ width: 3, height: '100%' as any, backgroundColor: COLORS.primary, borderRadius: 2 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>
                                        Replying to {replyingTo.sender_type === 'buyer' ? 'yourself' : storeName}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }} numberOfLines={2}>
                                        {ALL_PLACEHOLDERS.includes(replyingTo.content) ? (MEDIA_PLACEHOLDER_MAP as any)[replyingTo.media_type || 'image'] || replyingTo.content : replyingTo.content}
                                    </Text>
                                </View>
                                <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
                                    <XIcon size={18} color="#9CA3AF" />
                                </Pressable>
                            </View>
                        )}

                        {/* Quick reply chips with cooldown (Step 10) */}
                        {conversation && (() => {
                            const now = Date.now();
                            const ONE_HOUR = 3600000;
                            const available = quickReplies.filter(r => {
                                const usedAt = usedQuickReplies[r];
                                if (!usedAt) return true;
                                return (now - usedAt) > ONE_HOUR;
                            });
                            if (available.length === 0) return null;
                            return (
                                <View style={styles.quickRepliesContainer}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                                        {available.map((reply, i) => (
                                            <Pressable key={i} style={styles.replyChip} onPress={() => {
                                                setUsedQuickReplies(prev => ({ ...prev, [reply]: Date.now() }));
                                                handleSend(reply);
                                            }}>
                                                <Text style={styles.replyText}>{reply}</Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            );
                        })()}

                        {/* Input Area */}
                        <Animated.View style={[styles.inputContainer, { paddingBottom: bottomPadAnim }]}>
                            <View style={styles.inputBar}>
                                {/* Expand toggle — only shown when attachment icons are hidden */}
                                {!showAttachments && (
                                    <Pressable
                                        onPress={() => setShowAttachments(true)}
                                        style={styles.attachButton}
                                    >
                                        <ChevronRight size={22} color="#9CA3AF" />
                                    </Pressable>
                                )}
                                {/* Attachment icons — only shown when expanded */}
                                {showAttachments && (
                                    <>
                                        <Pressable onPress={pickMedia} style={styles.attachButton} disabled={uploading}>
                                            {uploading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <ImageIcon size={22} color="#9CA3AF" />}
                                        </Pressable>
                                        <Pressable onPress={pickDocument} style={styles.attachButton} disabled={uploading}>
                                            <Paperclip size={22} color="#9CA3AF" />
                                        </Pressable>
                                    </>
                                )}
                                <TextInput
                                    style={styles.input}
                                    value={inputText}
                                    onChangeText={handleInputChange}
                                    placeholder="Type a message..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    maxLength={500}
                                />
                                <Pressable
                                    onPress={() => handleSend()}
                                    style={[
                                        styles.sendButton,
                                        (!inputText.trim() || sending) && styles.sendButtonDisabled,
                                    ]}
                                    disabled={!inputText.trim()}
                                >
                                    <Send size={20} color="#FFFFFF" strokeWidth={2.5} />
                                </Pressable>
                            </View>
                        </Animated.View>
                    </KeyboardAvoidingView>
                </Animated.View>
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
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalAnimContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: COLORS.primary,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    backButton: {
        padding: 8,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    avatarContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4ADE80',
    },
    statusText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    },
    menuButton: {
        padding: 8,
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: '#F5F5F7',
    },
    messagesContent: {
        flexGrow: 1,
        padding: 16,
        gap: 12,
        paddingBottom: 20,
    },
    msgOuterWrapper: {
        marginBottom: 4,
    },
    msgOuterRight: {
        alignItems: 'flex-end',
    },
    msgOuterLeft: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    noPadBubble: { padding: 0 },
    userBubble: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    storeBubble: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    userBubbleExpanded: {
        backgroundColor: '#C2631A',
    },
    storeBubbleExpanded: {
        backgroundColor: '#FFF7ED',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    userText: {
        color: '#FFF',
    },
    storeText: {
        color: '#1F2937',
    },
    timestampOutside: {
        fontSize: 11,
        marginTop: 4,
        paddingHorizontal: 4,
    },
    timestampOutsideRight: {
        color: '#9CA3AF',
        textAlign: 'right',
    },
    timestampOutsideLeft: {
        color: '#9CA3AF',
        textAlign: 'left',
    },
    // Date separators
    dateSepWrapper: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 8 },
    dateSepLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
    dateSepText: { marginHorizontal: 10, fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
    quickRepliesContainer: {
        paddingVertical: 12,
    },
    replyChip: {
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    replyText: {
        fontSize: 13,
        color: '#4B5563',
    },
    inputContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
    },
    attachButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 22,
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 4,
        fontSize: 15,
        color: '#1F2937',
        maxHeight: 130,
        minHeight: 40,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    sendingIndicator: {
        alignSelf: 'flex-end',
        marginTop: 8,
    },
});
