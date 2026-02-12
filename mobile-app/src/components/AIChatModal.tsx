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
import { ArrowLeft, Send, Bot, MoreVertical, Scale } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  specs: { label: string; value: string }[];
}

interface ProductComparison {
  title: string;
  products: [Product, Product];
}

interface Message {
  id: string;
  text?: string;
  isUser: boolean;
  timestamp: Date;
  comparison?: ProductComparison;

}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
}

const suggestedQuestions = [
  'Compare wireless earbuds',
  'Find best gaming laptops',
  'Track my order',
  'Show me phone deals',
];

export default function AIChatModal({ visible, onClose }: AIChatModalProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! 👋 I\'m your BazaarX AI shopping assistant. I can help you find products, compare items, track orders, and answer questions. How can I assist you today?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
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

      // Simulate AI typing and response
      setTimeout(() => {
        setIsTyping(false);
        const aiResponse = getDummyResponse(messageText);
        if (aiResponse) {
          setMessages((prev) => [...prev, aiResponse]);
        }
      }, 1500);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: '1',
        text: 'Hi! 👋 I\'m your BazaarX AI shopping assistant. I can help you find products, compare items, track orders, and answer questions. How can I assist you today?',
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    setSelectedProduct(null);
  };

  const renderProductComparison = (comparison: ProductComparison) => {
    return (
      <View style={styles.comparisonCard}>
        <View style={styles.comparisonHeader}>
          <Scale size={18} color={COLORS.primary} strokeWidth={2.5} />
          <Text style={styles.comparisonTitle}>{comparison.title}</Text>
        </View>

        <View style={styles.comparisonGrid}>
          {comparison.products.map((product) => (
            <Pressable
              key={product.id}
              style={[
                styles.productColumn,
                selectedProduct === product.id && styles.productColumnSelected,
              ]}
              onPress={() => setSelectedProduct(product.id)}
            >
              <Image source={{ uri: product.image }} style={styles.productImage} />
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.productPrice}>${product.price}</Text>

              <View style={styles.specsContainer}>
                {product.specs.map((spec, index) => (
                  <View key={index} style={styles.specRow}>
                    <Text style={styles.specLabel}>{spec.label}:</Text>
                    <Text style={styles.specValue}>{spec.value}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const getDummyResponse = (input: string): Message | null => {
    const lowerInput = input.toLowerCase();

    // Smart Redirect Logic


    if (lowerInput.includes('compare') && (lowerInput.includes('earbud') || lowerInput.includes('headphone'))) {
      return {
        id: (Date.now() + 1).toString(),
        text: 'I found two popular wireless earbuds for you. Here\'s a detailed comparison:',
        isUser: false,
        timestamp: new Date(),
        comparison: {
          title: 'Wireless Earbuds Comparison',
          products: [
            {
              id: 'prod1',
              name: 'Sony WF-1000XM5 Premium Noise Cancelling',
              price: 299.99,
              image: 'https://images.unsplash.com/photo-1606220838315-056192d5e927?w=300',
              specs: [
                { label: 'Connection', value: 'Bluetooth 5.3' },
                { label: 'Battery Life', value: '24 hours' },
                { label: 'Noise Cancelling', value: 'Premium ANC' },
                { label: 'Water Resistant', value: 'IPX4' },
              ],
            },
            {
              id: 'prod2',
              name: 'Apple AirPods Pro (2nd Gen) with MagSafe',
              price: 249.99,
              image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=300',
              specs: [
                { label: 'Connection', value: 'Bluetooth 5.3' },
                { label: 'Battery Life', value: '30 hours' },
                { label: 'Noise Cancelling', value: 'Active ANC' },
                { label: 'Water Resistant', value: 'IPX4' },
              ],
            },
          ],
        },
      };
    } else if (lowerInput.includes('compare') && lowerInput.includes('laptop')) {
      return {
        id: (Date.now() + 1).toString(),
        text: 'Here are two excellent gaming laptops to compare:',
        isUser: false,
        timestamp: new Date(),
        comparison: {
          title: 'Gaming Laptop Comparison',
          products: [
            {
              id: 'prod3',
              name: 'ASUS ROG Strix G16 Gaming Laptop',
              price: 1499.99,
              image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=300',
              specs: [
                { label: 'Processor', value: 'Intel i9-13980HX' },
                { label: 'RAM', value: '32GB DDR5' },
                { label: 'Graphics', value: 'RTX 4070 8GB' },
                { label: 'Display', value: '16" QHD 240Hz' },
              ],
            },
            {
              id: 'prod4',
              name: 'MSI Raider GE78 HX Gaming Laptop',
              price: 1799.99,
              image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300',
              specs: [
                { label: 'Processor', value: 'Intel i9-13950HX' },
                { label: 'RAM', value: '32GB DDR5' },
                { label: 'Graphics', value: 'RTX 4080 12GB' },
                { label: 'Display', value: '17" QHD 240Hz' },
              ],
            },
          ],
        },
      };
    } else if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
      return {
        id: (Date.now() + 1).toString(),
        text: 'Hello! 😊 How can I assist you with your shopping today? Try asking me to compare products!',
        isUser: false,
        timestamp: new Date(),
      };
    } else if (lowerInput.includes('order') || lowerInput.includes('track')) {
      return {
        id: (Date.now() + 1).toString(),
        text: 'You can track your orders in the "Orders" tab. 📦 I can show you real-time delivery updates with precise location tracking!',
        isUser: false,
        timestamp: new Date(),
      };
    } else if (lowerInput.includes('phone') || lowerInput.includes('deal')) {
      return {
        id: (Date.now() + 1).toString(),
        text: 'We have amazing phone deals right now! 📱 Check out our Flash Sale section for up to 40% off on flagship smartphones. Would you like me to compare specific models?',
        isUser: false,
        timestamp: new Date(),
      };
    } else {
      return {
        id: (Date.now() + 1).toString(),
        text: 'I understand! 💡 I can help you find products, compare items side-by-side, or answer questions. Try asking me to "compare wireless earbuds" or "find gaming laptops"!',
        isUser: false,
        timestamp: new Date(),
      };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Universal Header - Edge to Edge Orange */}
        <View style={[styles.header, { paddingTop: 16 }]}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.primary} strokeWidth={2.5} />
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
              {/* Text Message */}
              {message.text && (
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
              )}

              {/* Product Comparison Widget */}
              {message.comparison && (
                <View style={styles.comparisonWrapper}>
                  {renderProductComparison(message.comparison)}
                </View>
              )}
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
              <Send size={20} color={COLORS.primary} strokeWidth={2.5} />
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
  // Universal Header - Edge to Edge Orange
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFE5CC',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
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
    color: '#1F2937',
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
  // Product Comparison Card
  comparisonWrapper: {
    marginBottom: 16,
    alignSelf: 'flex-start',
    maxWidth: '95%',
    marginLeft: 40,
  },
  comparisonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  productColumn: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  productColumnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5F0',
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  specsContainer: {
    gap: 6,
  },
  specRow: {
    flexDirection: 'column',
    gap: 2,
  },
  specLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
    letterSpacing: -0.1,
  },
  // Floating Input Area
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

});
