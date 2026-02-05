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
} from 'react-native';
import { ArrowLeft, Send, MoreVertical, Store, Ticket } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { chatService, Conversation, Message as ChatMessage } from '../services/chatService';
import { useAuthStore } from '../stores/authStore';

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
    const [inputText, setInputText] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);

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

    // Subscribe to new messages
    useEffect(() => {
        if (!conversation?.id) return;

        const unsubscribe = chatService.subscribeToMessages(
            conversation.id,
            (newMsg) => {
                // Prevent duplicate messages by checking if it already exists
                setRealMessages(prev => {
                    const exists = prev.some(m => m.id === newMsg.id);
                    if (exists) return prev;
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

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    // Send message handler
    const handleSend = async (text?: string) => {
        const messageText = text || inputText.trim();
        if (!messageText || !conversation || !user?.id || sending) {
            console.log('[StoreChatModal] Cannot send message:', { 
                hasMessage: !!messageText, 
                hasConversation: !!conversation, 
                hasUser: !!user?.id, 
                sending 
            });
            return;
        }

        console.log('[StoreChatModal] Sending message:', { conversationId: conversation.id, messageText: messageText.substring(0, 50) });
        setInputText('');
        setSending(true);

        try {
            const sentMessage = await chatService.sendMessage(
                conversation.id,
                user.id,
                'buyer',
                messageText
            );

            if (sentMessage) {
                console.log('[StoreChatModal] Message sent successfully, ID:', sentMessage.id);
                // Don't add manually - let the subscription handle it to avoid duplicates
                // The subscription will pick up the new message via real-time
            } else {
                console.error('[StoreChatModal] sendMessage returned null');
                setInputText(messageText); // Restore on error
            }
        } catch (error) {
            console.error('[StoreChatModal] Error sending message:', error);
            setInputText(messageText); // Restore on error
        } finally {
            setSending(false);
        }
    };

    const handleAction = (target: string) => {
        if (target === 'CreateTicket') {
            onClose();
            navigation.navigate('CreateTicket');
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                {/* Header - Store Brand Color */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <Pressable onPress={onClose} style={styles.backButton}>
                        <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </Pressable>

                    <View style={styles.headerInfo}>
                        <View style={styles.avatarContainer}>
                            <Store size={16} color="#FF5722" />
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
                        <Pressable style={styles.menuButton}>
                            <MoreVertical size={24} color="#FFFFFF" />
                        </Pressable>
                    </View>
                </View>

                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                >
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : !sellerId ? (
                        // No sellerId provided - cannot chat
                        <View style={styles.loadingContainer}>
                            <Text style={{ color: '#6B7280', textAlign: 'center' }}>
                                Unable to start chat. Store information unavailable.
                            </Text>
                        </View>
                    ) : !user?.id ? (
                        // Not logged in
                        <View style={styles.loadingContainer}>
                            <Text style={{ color: '#6B7280', textAlign: 'center' }}>
                                Please log in to chat with this store.
                            </Text>
                        </View>
                    ) : !conversation ? (
                        // Conversation not yet loaded
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={{ color: '#6B7280', marginTop: 12 }}>Starting conversation...</Text>
                        </View>
                    ) : (
                        // Real messages from database
                        <>
                            {realMessages.length === 0 && (
                                <View style={[styles.messageBubble, styles.storeBubble]}>
                                    <Text style={[styles.messageText, styles.storeText]}>
                                        {`Welcome to ${storeName}! 🛍️\nHow can we help you today?`}
                                    </Text>
                                </View>
                            )}
                            {realMessages.map((msg) => (
                                <View key={msg.id} style={[
                                    styles.messageBubble,
                                    msg.sender_type === 'buyer' ? styles.userBubble : styles.storeBubble,
                                ]}>
                                    <Text style={[
                                        styles.messageText,
                                        msg.sender_type === 'buyer' ? styles.userText : styles.storeText,
                                    ]}>
                                        {msg.content}
                                    </Text>
                                    <Text style={[
                                        styles.timestamp,
                                        msg.sender_type === 'buyer' ? styles.userTimestamp : styles.storeTimestamp
                                    ]}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            ))}
                        </>
                    )}
                    
                    {sending && (
                        <View style={styles.sendingIndicator}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        </View>
                    )}
                </ScrollView>

                {/* Suggestions */}
                {conversation && realMessages.length < 3 && (
                    <View style={styles.quickRepliesContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                            {quickReplies.map((reply, i) => (
                                <Pressable key={i} style={styles.replyChip} onPress={() => handleSend(reply)}>
                                    <Text style={styles.replyText}>{reply}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Input Area */}
                <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 12 }]}>
                    <View style={styles.inputBar}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
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
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F7',
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
    },
    messagesContent: {
        padding: 16,
        gap: 12,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 4,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    storeBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
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
    timestamp: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
        opacity: 0.7,
    },
    userTimestamp: {
        color: 'rgba(255,255,255,0.8)',
    },
    storeTimestamp: {
        color: '#9CA3AF',
    },
    typingIndicator: {
        flexDirection: 'row',
        gap: 4,
        padding: 4,
    },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#9CA3AF',
    },
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
    input: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: '#1F2937',
        maxHeight: 100,
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
    actionButton: {
        marginTop: 12,
        backgroundColor: '#10B981', // Success/Green
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // Removed gap for compatibility
        minHeight: 40,
    },
    actionButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 13,
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
