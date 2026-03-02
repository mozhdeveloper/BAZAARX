import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Bot, User, Headphones } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { COLORS } from '../src/constants/theme';
import { TicketService } from '../services/TicketService';
import { useAuthStore } from '../src/stores/authStore';
import { supabase } from '../src/lib/supabase';
import { notificationService } from '../src/services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatSupport'>;

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
  quickReplies?: string[];
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────

const KNOWLEDGE_BASE: Array<{ keywords: string[]; answer: string }> = [
  // Orders
  {
    keywords: ['track', 'tracking', 'where is my order', 'order status', 'where is my package'],
    answer:
      'You can track your order by going to the **Orders** tab in the app and tapping on your order. You\'ll see the real-time status and estimated delivery date there.',
  },
  {
    keywords: ['cancel', 'cancellation', 'cancel order'],
    answer:
      'Orders can be cancelled **within 24 hours** of placing them. Go to Orders → Order Details → tap "Cancel Order". Once cancelled, refunds are processed within **5–7 business days** to your original payment method.',
  },
  {
    keywords: ['return', 'refund', 'return policy', 'money back', 'exchange'],
    answer:
      'Bazaar accepts returns within **7 days** of delivery for most items. Products must be **unused, in original packaging** with tags attached. Here\'s how:\n\n1. Go to Orders → Order Details\n2. Tap "Request Return"\n3. Choose a reason and upload photos\n4. Drop off the item at the courier\n\nRefunds are processed within **5–7 business days** after the item is received and inspected.',
  },
  {
    keywords: ['damaged', 'defective', 'broken', 'wrong item', 'missing item', 'wrong product'],
    answer:
      'We\'re sorry about this! For damaged, defective, or wrong items:\n\n1. Take clear photos of the item and packaging\n2. Go to Orders → Report a Problem\n3. Submit within **48 hours** of delivery\n\nYou\'ll be eligible for a full refund or replacement at no additional cost.',
  },
  // Payments
  {
    keywords: ['payment', 'pay', 'payment method', 'how to pay', 'payment options'],
    answer:
      'Bazaar accepts the following payment methods:\n\n• Credit/Debit Cards (Visa, Mastercard, Amex)\n• GCash\n• PayMaya (Maya)\n• Bank Transfer\n• Cash on Delivery (COD) — available in select areas\n\nAll payments are secured with SSL encryption.',
  },
  {
    keywords: ['secure', 'safe', 'security', 'card safe', 'data safe', 'privacy'],
    answer:
      'Your payment and personal information is fully protected. We use **industry-standard SSL/TLS encryption** for all transactions. We **never store** your full card details — only tokenised references through our payment processor. Your data is never sold to third parties.',
  },
  {
    keywords: ['refund', 'refund status', 'when will i get refund', 'refund time'],
    answer:
      'Refund timelines depend on your payment method:\n\n• **GCash / Maya:** 1–3 business days\n• **Credit/Debit Card:** 5–7 business days\n• **Bank Transfer:** 3–5 business days\n• **COD (store credit):** Instant as Bazcoins\n\nYou\'ll receive an email confirmation once the refund is processed.',
  },
  // Shipping
  {
    keywords: ['shipping', 'delivery', 'how long', 'delivery time', 'how many days'],
    answer:
      'Estimated delivery times:\n\n• **Metro Manila:** 2–5 business days\n• **Provincial Areas:** 5–10 business days\n• **Express Shipping:** 1–2 business days (select areas)\n\nDelivery times may be longer during peak seasons (Christmas, sale events).',
  },
  {
    keywords: ['free shipping', 'shipping fee', 'delivery fee', 'shipping cost'],
    answer:
      'Bazaar offers **free shipping** on:\n\n• Orders above **₱500** within Metro Manila\n• Select provincial orders above **₱1,000**\n\nShipping fees for other orders are calculated at checkout based on your location and the seller\'s warehouse.',
  },
  {
    keywords: ['cod', 'cash on delivery', 'pay cash'],
    answer:
      'Cash on Delivery (COD) is available in **select areas**. You can check eligibility at checkout by entering your address. COD orders must be paid in exact change to the courier upon delivery.',
  },
  // Sellers
  {
    keywords: ['sell', 'become a seller', 'seller', 'open shop', 'start selling', 'selling'],
    answer:
      'To become a Bazaar seller:\n\n1. Tap **Profile → Become a Seller**\n2. Fill in your shop name, description, and category\n3. Submit valid government ID for verification\n4. Your shop goes live within **24 hours** of approval\n\nBazaar charges a **5% platform fee** per successful transaction. There are no monthly fees.',
  },
  {
    keywords: ['seller fee', 'commission', 'platform fee', 'how much does bazaar charge'],
    answer:
      'Bazaar charges a **5% platform fee** on each completed sale. This covers payment processing, platform maintenance, and buyer protection. There are **no listing fees** and **no monthly charges**.',
  },
  {
    keywords: ['banned item', 'prohibited', 'not allowed', 'illegal', 'prohibited items', 'what can i sell'],
    answer:
      'The following items are **prohibited** on Bazaar:\n\n🚫 Weapons, firearms, and explosives\n🚫 Drugs and controlled substances\n🚫 Counterfeit or fake goods\n🚫 Stolen merchandise\n🚫 Pornographic content\n🚫 Pirated software or media\n🚫 Endangered animal products\n\nViolating these rules results in immediate account suspension. If you see a prohibited listing, please report it.',
  },
  {
    keywords: ['seller suspended', 'shop banned', 'account suspended', 'appeal'],
    answer:
      'If your seller account was suspended, you can appeal by:\n\n1. Emailing **sellers@bazaar.ph** with your shop name and reason\n2. Appeals are reviewed within **3–5 business days**\n\nCommon reasons for suspension: policy violations, high dispute rate, or payment issues.',
  },
  // Account
  {
    keywords: ['password', 'reset password', 'forgot password', 'change password'],
    answer:
      'To reset your password:\n\n• **From Settings:** Profile → Account Security → Change Password\n• **From login screen:** Tap "Forgot Password" → Enter your email → Check your inbox for a reset link\n\nReset links expire after **1 hour**.',
  },
  {
    keywords: ['account', 'delete account', 'close account', 'deactivate'],
    answer:
      'To delete your Bazaar account, go to **Settings → Account → Delete Account**. Note that:\n\n• Pending orders must be completed first\n• This action is **irreversible**\n• Any unused Bazcoins will be forfeited\n\nFor assistance, email support@bazaar.ph.',
  },
  {
    keywords: ['bazcoin', 'bazcoins', 'coins', 'loyalty', 'rewards', 'points'],
    answer:
      'Bazcoins are Bazaar\'s loyalty currency:\n\n• Earn **1 Bazcoin per ₱10 spent**\n• Use Bazcoins as discount on checkout\n• **100 Bazcoins = ₱10 discount**\n• Bazcoins expire **12 months** after earning\n\nCheck your balance in Profile → My Bazcoins.',
  },
  {
    keywords: ['register', 'sign up', 'create account', 'new account'],
    answer:
      'Creating a Bazaar account is free! Tap **Sign Up** on the welcome screen and enter your name, email, and password. You\'ll receive a verification email — confirm it to activate your account.',
  },
  // Disputes / Issues
  {
    keywords: ['dispute', 'complaint', 'problem with seller', 'scam', 'fraud', 'seller not responding'],
    answer:
      'If you have an issue with a seller:\n\n1. First, message the seller through the **Chat** feature\n2. If unresolved within 48 hours, open a dispute via **Orders → Report a Problem**\n3. Bazaar\'s team will mediate and resolve within **3–5 business days**\n\nFor suspected fraud, email urgent@bazaar.ph immediately.',
  },
  {
    keywords: ['ticket', 'support ticket', 'raise ticket', 'submit ticket'],
    answer:
      'To submit a support ticket, tap **"Submit a Support Ticket"** on the Help Center screen, or I can escalate this chat. Our support team typically responds within **24 hours** (Mon–Sat, 8AM–8PM).',
  },
  // General Bazaar info
  {
    keywords: ['bazaar', 'what is bazaar', 'about bazaar', 'marketplace'],
    answer:
      'Bazaar is a Filipino online marketplace connecting buyers and sellers across the Philippines. We support local businesses and make shopping safe, easy, and rewarding with features like buyer protection, Bazcoins rewards, and verified sellers.',
  },
  {
    keywords: ['contact', 'email', 'phone', 'reach', 'support'],
    answer:
      'You can reach Bazaar support through:\n\n• 📧 **Email:** support@bazaar.ph\n• 🎫 **Support Ticket:** Help Center → Submit a Ticket\n• ⏰ **Hours:** Mon–Sat 8AM–8PM | Sun 9AM–6PM\n\nAverage response time is under **4 hours** during business hours.',
  },
  {
    keywords: ['discount', 'promo', 'coupon', 'voucher', 'sale', 'code'],
    answer:
      'To use a discount code or voucher:\n\n1. Add items to your cart\n2. At checkout, tap **"Apply Voucher"**\n3. Enter your code and tap Apply\n\nVouchers are one-time use and may have minimum spend requirements. Check the Promos section in the app for active offers.',
  },
  {
    keywords: ['notification', 'alert', 'push notification', 'email notification'],
    answer:
      'Manage your notifications in **Settings → Notification Settings**. You can toggle:\n\n• Order updates\n• Promotions and sales\n• New messages\n• Price drops on wishlist items',
  },
];

// ─── Quick Reply Suggestions ──────────────────────────────────────────────────

const QUICK_REPLIES_INITIAL = [
  'Track my order 📦',
  'Return & refund policy',
  'Payment methods',
  'Become a seller',
  'Free shipping info',
  'Bazcoins rewards',
];

// ─── Bot Logic ────────────────────────────────────────────────────────────────

function getBotResponse(input: string): string {
  const lower = input.toLowerCase();

  for (const entry of KNOWLEDGE_BASE) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.answer;
    }
  }

  // Greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|hola)\b/.test(lower)) {
    return 'Hello! 👋 How can I help you today? You can ask me about orders, payments, shipping, returns, seller policies, or anything about Bazaar!';
  }

  // Thank you
  if (/thank|thanks|thank you/.test(lower)) {
    return 'You\'re welcome! 😊 Is there anything else I can help you with?';
  }

  // Fallback
  return 'I\'m not sure about that one. Here are some things I can help with:\n\n• Order tracking & cancellations\n• Returns & refunds\n• Payment methods\n• Shipping & delivery\n• Seller policies\n• Account & Bazcoins\n\nOr tap **"Talk to an Agent"** below to submit a support ticket.';
}

function formatText(text: string): React.ReactNode {
  // Simple bold formatter: **word** → bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={{ fontWeight: '700' }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={i}>{part}</Text>;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatSupportScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { user } = useAuthStore();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [escalating, setEscalating] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      sender: 'bot',
      text: 'Hi there! 👋 I\'m Baz, your Bazaar support assistant. I can answer questions about orders, payments, shipping, returns, and more.\n\nWhat can I help you with today?',
      timestamp: new Date(),
      quickReplies: QUICK_REPLIES_INITIAL,
    },
  ]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addUserMessage = useCallback((text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate bot thinking delay (600–1200ms)
    const delay = 600 + Math.random() * 600;
    setTimeout(() => {
      const answer = getBotResponse(text);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: answer,
        timestamp: new Date(),
        quickReplies: answer.includes("I'm not sure") ? ['Track my order 📦', 'Return & refund policy', 'Talk to an Agent 🎫'] : undefined,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, delay);
  }, []);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    addUserMessage(text);
  }, [inputText, addUserMessage]);

  const escalateToAgent = useCallback(async () => {
    setEscalating(true);
    try {
      let userId = user?.id;
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }
      if (!userId) {
        Alert.alert('Sign in required', 'Please sign in to talk to a support agent.');
        return;
      }

      // Build transcript from conversation
      const transcript = messages
        .filter((m) => m.sender === 'user' || m.sender === 'bot')
        .map((m) => `[${m.sender === 'user' ? 'You' : 'Baz Bot'}] ${m.text}`)
        .join('\n\n');

      const description =
        `**Chat transcript from Baz Support Bot:**\n\n${transcript}\n\n---\nEscalated to human agent from in-app chat.`;

      const ticket = await TicketService.createTicket(userId, {
        subject: 'Live Chat — Escalated to Agent',
        description,
        priority: 'normal',
        categoryId: null,
      });

      // Notify all admins about the new support ticket
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
        const buyerName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'A buyer' : 'A buyer';

        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin');

        if (admins?.length) {
          await Promise.allSettled(
            admins.map((admin: { id: string }) =>
              notificationService.notifyAdminNewTicket({
                adminId: admin.id,
                ticketId: ticket.id,
                ticketSubject: 'Live Chat — Escalated to Agent',
                buyerName,
              })
            )
          );
        }
      } catch (adminNotifErr) {
        console.error('[ChatSupport] Admin notification error:', adminNotifErr);
      }

      // Bot confirms escalation
      const confirmMsg: Message = {
        id: (Date.now() + 2).toString(),
        sender: 'bot',
        text: '✅ You\'ve been connected to a support agent! Your chat history has been shared with them. An agent will respond to your ticket shortly.\n\nOpening your ticket now…',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);

      setTimeout(() => {
        navigation.navigate('TicketDetail', { ticketId: ticket.id });
      }, 1800);
    } catch (err) {
      console.error('Escalation error:', err);
      Alert.alert('Error', 'Could not connect to an agent. Please try submitting a support ticket manually.');
    } finally {
      setEscalating(false);
    }
  }, [messages, user, navigation]);

  const handleQuickReply = useCallback((reply: string) => {
    if (reply === 'Talk to an Agent 🎫') {
      escalateToAgent();
      return;
    }
    addUserMessage(reply);
  }, [addUserMessage, escalateToAgent]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <ChevronLeft size={24} color="#FFF" strokeWidth={2.5} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.botAvatar}>
            <Bot size={20} color="#FFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Baz — Support Chat</Text>
            <Text style={styles.headerSubtitle}>🟢 Active now</Text>
          </View>
        </View>
        <Pressable
          style={styles.ticketBtn}
          onPress={escalateToAgent}
          hitSlop={8}
          disabled={escalating}
        >
          {escalating
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Headphones size={20} color="#FFF" />}
        </Pressable>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <View key={msg.id}>
              <View
                style={[
                  styles.messageBubbleRow,
                  msg.sender === 'user' && styles.messageBubbleRowUser,
                ]}
              >
                {msg.sender === 'bot' && (
                  <View style={styles.avatarSmall}>
                    <Bot size={14} color="#FFF" />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    msg.sender === 'user' ? styles.bubbleUser : styles.bubbleBot,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      msg.sender === 'user' && styles.bubbleTextUser,
                    ]}
                  >
                    {formatText(msg.text)}
                  </Text>
                  <Text style={[styles.timestamp, msg.sender === 'user' && styles.timestampUser]}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {msg.sender === 'user' && (
                  <View style={[styles.avatarSmall, styles.avatarUser]}>
                    <User size={14} color="#FFF" />
                  </View>
                )}
              </View>

              {/* Quick replies */}
              {msg.quickReplies && msg.quickReplies.length > 0 && (
                <View style={styles.quickRepliesContainer}>
                  {msg.quickReplies.map((qr) => (
                    <Pressable
                      key={qr}
                      style={({ pressed }) => [
                        styles.quickReplyChip,
                        qr === 'Talk to an Agent 🎫' && styles.quickReplyChipAgent,
                        pressed && styles.quickReplyChipPressed,
                      ]}
                      onPress={() => handleQuickReply(qr)}
                    >
                      <Text
                        style={[
                          styles.quickReplyText,
                          qr === 'Talk to an Agent 🎫' && styles.quickReplyTextAgent,
                        ]}
                      >
                        {qr}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <View style={styles.messageBubbleRow}>
              <View style={styles.avatarSmall}>
                <Bot size={14} color="#FFF" />
              </View>
              <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={[styles.bubbleText, { marginLeft: 8 }]}>Baz is typing…</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Talk to Agent Banner */}
        <Pressable
          style={[styles.agentBanner, escalating && styles.agentBannerDisabled]}
          onPress={escalateToAgent}
          disabled={escalating}
        >
          {escalating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Headphones size={16} color="#FFF" />
          )}
          <Text style={styles.agentBannerText}>
            {escalating ? 'Connecting to agent…' : 'Talk to an Agent'}
          </Text>
        </Pressable>

        {/* Input Bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message…"
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Pressable
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Send size={20} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flex: { flex: 1 },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  ticketBtn: {
    padding: 4,
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    padding: 16,
    gap: 12,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  messageBubbleRowUser: {
    flexDirection: 'row-reverse',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarUser: {
    backgroundColor: '#6B7280',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleBot: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1F2937',
  },
  bubbleTextUser: {
    color: '#FFF',
  },
  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampUser: {
    color: 'rgba(255,255,255,0.7)',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 36,
    marginTop: 4,
    marginBottom: 8,
  },
  quickReplyChip: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFFBF0',
  },
  quickReplyChipAgent: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  quickReplyChipPressed: {
    opacity: 0.7,
  },
  quickReplyText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickReplyTextAgent: {
    color: '#D97706',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  agentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
  },
  agentBannerDisabled: {
    backgroundColor: '#A78BFA',
  },
  agentBannerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
