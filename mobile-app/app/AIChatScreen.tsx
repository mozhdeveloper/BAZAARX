import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ArrowLeft,
    X,
    Send,
    Bot,
    User,
    Phone,
} from 'lucide-react-native';
import { COLORS } from '../src/constants/theme';
import { aiChatService, ProductContext, StoreContext } from '../src/services/aiChatService';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'AIChat'>;

interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    message: string;
    timestamp: Date;
    isTyping?: boolean;
}

export default function AIChatScreen({ route, navigation }: Props) {
    const { product, store } = route.params;
    const insets = useSafeAreaInsets();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [quickReplies, setQuickReplies] = useState<string[]>([]);
    const [showTalkToSeller, setShowTalkToSeller] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);

    // Initialize quick replies and welcome message
    useEffect(() => {
        if (messages.length === 0 && (product || store)) {
            const context = { product, store };
            const welcomeMessage: ChatMessage = {
                id: 'welcome',
                sender: 'ai',
                message: aiChatService.getWelcomeMessage(context),
                timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
            setQuickReplies(aiChatService.getQuickReplies(context));
        }
    }, [product, store]);

    // Scroll to bottom when messages change
    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const handleSendMessage = async (text?: string) => {
        const messageText = text || inputText.trim();
        if (!messageText || isAiTyping) return;

        // Add user message
        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            sender: 'user',
            message: messageText,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsAiTyping(true);

        // Add typing indicator
        const typingMessage: ChatMessage = {
            id: 'typing',
            sender: 'ai',
            message: '',
            timestamp: new Date(),
            isTyping: true,
        };
        setMessages(prev => [...prev, typingMessage]);

        try {
            const { response, suggestTalkToSeller } = await aiChatService.sendMessage(
                messageText,
                { product, store }
            );

            // Remove typing indicator and add AI response
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== 'typing');
                return [...filtered, {
                    id: `ai-${Date.now()}`,
                    sender: 'ai',
                    message: response,
                    timestamp: new Date(),
                }];
            });

            if (suggestTalkToSeller) {
                setShowTalkToSeller(true);
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== 'typing');
                return [...filtered, {
                    id: `ai-error-${Date.now()}`,
                    sender: 'ai',
                    message: "Sorry, I'm having trouble. Please try again or talk to the seller.",
                    timestamp: new Date(),
                }];
            });
            setShowTalkToSeller(true);
        } finally {
            setIsAiTyping(false);
        }
    };

    const handleQuickReply = (reply: string) => {
        handleSendMessage(reply);
        setQuickReplies([]);
    };

    const handleTalkToSeller = () => {
        // Navigate back and trigger talk to seller if needed, 
        // but typically we can just close or navigate to chat
        navigation.goBack();
        // Potentially trigger a callback or navigate to Chat screen
    };

    const handleNewChat = () => {
        aiChatService.resetConversation();
        setMessages([]);
        setShowTalkToSeller(false);
        const context = { product, store };
        const welcomeMessage: ChatMessage = {
            id: 'welcome',
            sender: 'ai',
            message: aiChatService.getWelcomeMessage(context),
            timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        setQuickReplies(aiChatService.getQuickReplies(context));
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDateSeparator = (date: Date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    // Group messages by date
    const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
    messages.forEach(msg => {
        const dateKey = msg.timestamp.toDateString();
        const lastGroup = groupedMessages[groupedMessages.length - 1];

        if (lastGroup && new Date(lastGroup.messages[0].timestamp).toDateString() === dateKey) {
            lastGroup.messages.push(msg);
        } else {
            groupedMessages.push({ date: dateKey, messages: [msg] });
        }
    });

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={COLORS.primary} strokeWidth={2.5} />
                </Pressable>

                <View style={styles.headerInfo}>
                    <View style={styles.avatarContainer}>
                        <Bot size={20} color={COLORS.primary} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>BazBot</Text>
                        <View style={styles.statusRow}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>AI Assistant</Text>
                        </View>
                    </View>
                </View>

                <Pressable onPress={handleNewChat} style={styles.newChatButton}>
                    <Text style={styles.newChatText}>New Chat</Text>
                </Pressable>
            </View>

            {/* Product Context Bar */}
            {product && (
                <View style={styles.contextBar}>
                    <Text style={styles.contextText} numberOfLines={1}>
                        💬 Chatting about: {product.name}
                    </Text>
                </View>
            )}

            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
            >
                {groupedMessages.map((group, groupIdx) => (
                    <View key={groupIdx}>
                        {/* Date separator */}
                        <View style={styles.dateSeparator}>
                            <View style={styles.dateLine} />
                            <Text style={styles.dateText}>
                                {formatDateSeparator(group.messages[0].timestamp)}
                            </Text>
                            <View style={styles.dateLine} />
                        </View>

                        {group.messages.map((msg) => {
                            const isMe = msg.sender === 'user';

                            return (
                                <View
                                    key={msg.id}
                                    style={[
                                        styles.messageBubble,
                                        isMe ? styles.myMessage : styles.theirMessage,
                                    ]}
                                >
                                    {msg.isTyping ? (
                                        <View style={styles.typingIndicator}>
                                            <ActivityIndicator size="small" color={COLORS.primary} />
                                            <Text style={styles.typingText}>BazBot is typing...</Text>
                                        </View>
                                    ) : (
                                        <>
                                            <Text style={[
                                                styles.messageText,
                                                isMe ? styles.myMessageText : styles.theirMessageText,
                                            ]}>
                                                {msg.message}
                                            </Text>
                                            <Text style={[
                                                styles.messageTime,
                                                isMe ? styles.myMessageTime : styles.theirMessageTime,
                                            ]}>
                                                {formatTime(msg.timestamp)}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                ))}

                {/* Talk to Seller Button */}
                {showTalkToSeller && (
                    <Pressable
                        style={styles.talkToSellerButton}
                        onPress={handleTalkToSeller}
                    >
                        <Phone size={18} color="#fff" />
                        <Text style={styles.talkToSellerText}>Talk to Seller</Text>
                    </Pressable>
                )}
            </ScrollView>

            {/* Quick Replies */}
            {quickReplies.length > 0 && !isAiTyping && (
                <View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.quickRepliesContainer}
                        contentContainerStyle={styles.quickRepliesContent}
                    >
                        {quickReplies.map((reply, index) => (
                            <Pressable
                                key={index}
                                style={styles.quickReplyButton}
                                onPress={() => handleQuickReply(reply)}
                            >
                                <Text style={styles.quickReplyText}>{reply}</Text>
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
                        placeholder="Ask BazBot anything..."
                        placeholderTextColor="#9CA3AF"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />
                    <Pressable
                        style={[
                            styles.sendButton,
                            (!inputText.trim() || isAiTyping) && styles.sendButtonDisabled
                        ]}
                        onPress={() => handleSendMessage()}
                        disabled={!inputText.trim() || isAiTyping}
                    >
                        <Send size={20} color={COLORS.primary} strokeWidth={2.5} />
                    </Pressable>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footerContainer}>
                <Text style={styles.footerText}>
                    Powered by Gemini AI • BazaarX
                </Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFE5CC',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    backButton: {
        padding: 4,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4ADE80',
    },
    statusText: {
        fontSize: 14,
        color: '#1F2937',
        opacity: 0.9,
    },
    newChatButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 12,
    },
    newChatText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.primary,
    },
    contextBar: {
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#FDBA74',
    },
    contextText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '500',
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 100, // Space for floating input
        gap: 8,
    },
    dateSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
        gap: 12,
    },
    dateLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dateText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    messageBubble: {
        maxWidth: '75%',
        borderRadius: 16,
        padding: 12,
        marginVertical: 2,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#FFFFFF',
    },
    theirMessageText: {
        color: '#1F2937',
    },
    messageTime: {
        fontSize: 11,
        marginTop: 4,
    },
    myMessageTime: {
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'right',
    },
    theirMessageTime: {
        color: '#9CA3AF',
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    typingText: {
        fontSize: 14,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    talkToSellerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#10B981',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        alignSelf: 'center',
        marginTop: 12,
    },
    talkToSellerText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    quickRepliesContainer: {
        maxHeight: 50,
    },
    quickRepliesContent: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
    },
    quickReplyButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    quickReplyText: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '500',
    },
    inputContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 8,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: '#F2F2F2',
        borderRadius: 999,
        paddingHorizontal: 20,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1F2937',
        maxHeight: 100,
        letterSpacing: -0.1,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFE5CC',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FFE5CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 6,
    },
    sendButtonDisabled: {
        backgroundColor: '#FFE5CC',
        shadowColor: '#000',
        shadowOpacity: 0.1,
    },
    footerContainer: {
        backgroundColor: '#fff',
        paddingBottom: 8,
    },
    footerText: {
        textAlign: 'center',
        fontSize: 11,
        color: '#9CA3AF',
    },
});
