/**
 * AIChatBubble - Floating AI chat assistant for product pages
 * Features:
 * - AI-powered chat using Gemini 2.5 Flash
 * - Product context awareness
 * - Quick reply suggestions
 * - Smooth animations
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Phone,
  ChevronDown,
} from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { aiChatService, ProductContext, StoreContext } from '../services/aiChatService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  message: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface AIChatBubbleProps {
  product?: ProductContext;
  store?: StoreContext;
  onTalkToSeller?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function AIChatBubble({ product, store, onTalkToSeller }: AIChatBubbleProps) {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [showTalkToSeller, setShowTalkToSeller] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for the floating button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Open/close animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [isOpen]);

  // Initialize quick replies and welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0 && (product || store)) {
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
  }, [isOpen, product, store]);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

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
    setIsOpen(false);
    onTalkToSeller?.();
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

  return (
    <>
      {/* Floating Button */}
      <Animated.View 
        style={[
          styles.floatingButton,
          { 
            bottom: insets.bottom + 80,
            transform: [{ scale: isOpen ? 0 : pulseAnim }],
            opacity: isOpen ? 0 : 1,
          }
        ]}
      >
        <Pressable onPress={handleOpen} style={styles.floatingButtonInner}>
          <View style={styles.sparkleContainer}>
            <Sparkles size={14} color="#fff" />
          </View>
          <Bot size={28} color="#fff" />
        </Pressable>
      </Animated.View>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <Pressable style={styles.modalOverlay} onPress={handleClose} />
          
          <Animated.View 
            style={[
              styles.chatContainer,
              { 
                paddingBottom: insets.bottom || 16,
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.aiAvatar}>
                  <Bot size={20} color="#fff" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>BazBot</Text>
                  <Text style={styles.headerSubtitle}>AI Shopping Assistant</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                <Pressable onPress={handleNewChat} style={styles.newChatButton}>
                  <Text style={styles.newChatText}>New Chat</Text>
                </Pressable>
                <Pressable onPress={handleClose} style={styles.closeButton}>
                  <X size={24} color="#6B7280" />
                </Pressable>
              </View>
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
              {messages.map((msg) => (
                <View 
                  key={msg.id} 
                  style={[
                    styles.messageBubble,
                    msg.sender === 'user' ? styles.userMessage : styles.aiMessage
                  ]}
                >
                  {msg.sender === 'ai' && (
                    <View style={styles.messageAvatar}>
                      <Bot size={16} color={COLORS.primary} />
                    </View>
                  )}
                  <View style={[
                    styles.messageContent,
                    msg.sender === 'user' ? styles.userContent : styles.aiContent
                  ]}>
                    {msg.isTyping ? (
                      <View style={styles.typingIndicator}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={styles.typingText}>BazBot is typing...</Text>
                      </View>
                    ) : (
                      <Text style={[
                        styles.messageText,
                        msg.sender === 'user' ? styles.userText : styles.aiText
                      ]}>
                        {msg.message}
                      </Text>
                    )}
                  </View>
                  {msg.sender === 'user' && (
                    <View style={[styles.messageAvatar, styles.userAvatar]}>
                      <User size={16} color="#fff" />
                    </View>
                  )}
                </View>
              ))}

              {/* Talk to Seller Button */}
              {showTalkToSeller && onTalkToSeller && (
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
            )}

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Ask BazBot anything..."
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                onSubmitEditing={() => handleSendMessage()}
              />
              <Pressable 
                style={[
                  styles.sendButton,
                  (!inputText.trim() || isAiTyping) && styles.sendButtonDisabled
                ]}
                onPress={() => handleSendMessage()}
                disabled={!inputText.trim() || isAiTyping}
              >
                <Send size={20} color={inputText.trim() && !isAiTyping ? '#fff' : '#9CA3AF'} />
              </Pressable>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              Powered by Gemini AI • BazaarX
            </Text>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  floatingButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  chatContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newChatButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },
  newChatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  closeButton: {
    padding: 4,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    backgroundColor: COLORS.primary,
  },
  messageContent: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userContent: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  aiContent: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#1F2937',
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
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quickRepliesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  quickReplyButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickReplyText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    color: '#1F2937',
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
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    paddingBottom: 8,
  },
});

export default AIChatBubble;
