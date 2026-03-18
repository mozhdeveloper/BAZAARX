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
  Dimensions,
} from 'react-native';
import { ChevronLeft, Send, Bot } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { aiChatService } from '../services/aiChatService';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
}

const suggestedQuestions = [
  'What products are trending on BazaarX?',
  'How do I track my order?',
  'What is the return policy?',
  'What payment methods are accepted?',
];

export default function AIChatModal({ visible, onClose }: AIChatModalProps) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '👋 Hello! I\'m BazBot, your AI shopping assistant for BazaarX.\n\nI can help you with product information, store details, shipping policies, returns, and more.\n\nHow may I assist you today?',
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

  // Reset conversation when modal closes
  useEffect(() => {
    if (!visible) {
      aiChatService.resetConversation();
    }
  }, [visible]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // Call the real AI service — no product context since this is the general assistant
      const { response } = await aiChatService.sendAIMessage(messageText, {});

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: 'I\'m having trouble right now. Please try again in a moment.',
        isUser: false,
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    aiChatService.resetConversation();
    setMessages([
      {
        id: '1',
        text: '👋 Hello! I\'m BazBot, your AI shopping assistant for BazaarX.\n\nI can help you with product information, store details, shipping policies, returns, and more.\n\nHow may I assist you today?',
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header - Edge to Edge Primary Orange */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Pressable onPress={handleClearChat} style={styles.menuButton}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>

        {/* Messages - Light Grey Background */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.length === 1 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Try asking me:</Text>
              {suggestedQuestions.map((question, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSend(question)}
                  style={styles.suggestionChip}
                >
                  <Text style={styles.suggestionText}>{question}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {messages.map((message) => (
            <View key={message.id}>
              <View
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.userBubble : styles.aiBubble,
                ]}
              >
                {!message.isUser && (
                  <View style={styles.aiAvatar}>
                    <Bot size={18} color={COLORS.primary} strokeWidth={2.5} />
                  </View>
                )}
                <View
                  style={[
                    styles.messageContent,
                    message.isUser ? styles.userMessageContent : styles.aiMessageContent,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.isUser ? styles.userText : styles.aiText,
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <View style={styles.aiAvatar}>
                <Bot size={18} color={COLORS.primary} strokeWidth={2.5} />
              </View>
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Floating Input Area */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me anything..."
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
    backgroundColor: '#FFFFFF',
  },
  // Header - Edge to Edge Primary Orange
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginHorizontal: 16,
  },
  menuButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  clearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  // Messages Area
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 100,
  },
  suggestionsContainer: {
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestionText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  messageContent: {
    flex: 1,
  },
  userMessageContent: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  aiMessageContent: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  aiText: {
    color: '#1A1A1A',
    fontWeight: '400',
  },
  typingIndicator: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  // Floating Input Area
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
    paddingHorizontal: 20,
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

});
