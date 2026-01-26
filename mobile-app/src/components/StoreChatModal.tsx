import React, { useState, useRef, useEffect } from 'react';
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
    Image,
    Dimensions,
} from 'react-native';
import { ArrowLeft, Send, MoreVertical, Store, CheckCircle2, Ticket } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width } = Dimensions.get('window');

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
    action?: {
        label: string;
        target: 'CreateTicket';
    };
}

interface StoreChatModalProps {
    visible: boolean;
    onClose: () => void;
    storeName: string;
}

const quickReplies = [
    'Is this available?',
    'Can I see real photos?',
    'Do you offer discounts?',
    'When will you ship?',
];

export default function StoreChatModal({ visible, onClose, storeName }: StoreChatModalProps) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: `Welcome to ${storeName}! 🛍️\nHow can we help you today? We usually reply within minutes.`,
            isUser: false,
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (visible) {
            scrollToBottom();
        }
    }, [messages, visible]);

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const handleSend = (text?: string) => {
        const messageText = text || inputText.trim();
        if (messageText) {
            const userMessage: Message = {
                id: Date.now().toString(),
                text: messageText,
                isUser: true,
                timestamp: new Date(),
            };

            setMessages([...messages, userMessage]);
            setInputText('');
            setIsTyping(true);

            // Simulate Store typing and response
            setTimeout(() => {
                setIsTyping(false);
                const response = getAutoResponse(messageText);
                const autoResponse: Message = {
                    id: (Date.now() + 1).toString(),
                    text: response.text,
                    isUser: false,
                    timestamp: new Date(),
                    action: response.action,
                };
                setMessages((prev) => [...prev, autoResponse]);
            }, 1500);
        }
    };

    const getAutoResponse = (input: string): { text: string, action?: { label: string, target: 'CreateTicket' } } => {
        const lower = input.toLowerCase();
        
        // Smart Redirect Logic
        // Smart Redirect Logic
        const ticketKeywords = ['ticket', 'refund', 'return', 'complaint', 'broken', 'missing', 'damaged', 'received wrong', 'bad quality', 'support', 'technical error', 'app bug'];
        if (ticketKeywords.some(keyword => lower.includes(keyword))) {
            return {
                text: "We're sorry to hear you're having trouble. For issues like this, it's best to open an official support ticket so we can track and resolve it properly.",
                action: {
                    label: 'Create a Ticket',
                    target: 'CreateTicket'
                }
            };
        }

        if (lower.includes('available')) return { text: "Yes, this item is in stock and ready to ship! 📦" };
        if (lower.includes('real photo') || lower.includes('picture')) return { text: "Sending you actual photos shortly... 📸" };
        if (lower.includes('discount') || lower.includes('price')) return { text: "You can claim our store vouchers for extra savings! 💰" };
        if (lower.includes('ship')) return { text: "We ship daily at 4PM. Orders placed before then ship today! 🚚" };
        
        return { text: "Thanks for your message! Our staff will get back to you shortly." };
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
                <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
                    {messages.map((message) => (
                        <View key={message.id} style={[
                            styles.messageBubble,
                            message.isUser ? styles.userBubble : styles.storeBubble,
                        ]}>
                            <Text style={[
                                styles.messageText,
                                message.isUser ? styles.userText : styles.storeText,
                            ]}>
                                {message.text}
                            </Text>
                            <Text style={[
                                styles.timestamp,
                                message.isUser ? styles.userTimestamp : styles.storeTimestamp
                            ]}>
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>

                            {/* Action Button */}
                            {message.action && (
                                <Pressable 
                                    style={styles.actionButton}
                                    onPress={() => message.action && handleAction(message.action.target)}
                                >
                                    <Text style={styles.actionButtonText}>{message.action.label}</Text>
                                    <View style={{ marginLeft: 6 }}>
                                        <ArrowLeft size={16} color="#FFF" style={{ transform: [{ rotate: '180deg' }] }} />
                                    </View>
                                </Pressable>
                            )}
                        </View>
                    ))}

                    {isTyping && (
                        <View style={[styles.messageBubble, styles.storeBubble]}>
                            <View style={styles.typingIndicator}>
                                <View style={styles.typingDot} />
                                <View style={styles.typingDot} />
                                <View style={styles.typingDot} />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Suggestions */}
                {messages.length < 3 && (
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
                                !inputText.trim() && styles.sendButtonDisabled,
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
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#FF5722',
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
        backgroundColor: '#FF5722',
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
        backgroundColor: '#FF5722',
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
});
