import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Headphones, User, Store, Clock } from 'lucide-react-native';
import { COLORS } from '../../src/constants/theme';
import { TicketService } from '../../services/TicketService';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import type { Ticket } from '../types/ticketTypes';

function getStatusColor(status: string) {
  switch (status) {
    case 'open': return '#3B82F6';
    case 'in_progress': return '#F59E0B';
    case 'waiting_response': return '#8B5CF6';
    case 'resolved': return '#10B981';
    case 'closed': return '#6B7280';
    default: return '#6B7280';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'open': return 'Open';
    case 'in_progress': return 'In Progress';
    case 'waiting_response': return 'Waiting';
    case 'resolved': return 'Resolved';
    case 'closed': return 'Closed';
    default: return status;
  }
}

type Props = {
  route: { params: { ticketId: string } };
  navigation: any;
};

export default function TicketDetailScreen({ route, navigation }: Props) {
  const { ticketId } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    setLoading(true);
    try {
      let userId = user?.id;
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }
      const data = await TicketService.getTicketDetails(ticketId, userId);
      setTicket(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim()) return;
    let userId = user?.id;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }
    if (!userId) return;
    setSending(true);
    try {
      const newMsg = await TicketService.sendMessage(ticketId, userId, messageText);
      if (ticket && newMsg) {
        setTicket({ ...ticket, messages: [...ticket.messages, newMsg] });
      }
      setMessageText('');
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <Text style={styles.errorText}>Ticket not found</Text>
      </View>
    );
  }

  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={[styles.container, { paddingTop: insets.top }]}>

        {/* Branded Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={26} color="#FFF" />
          </Pressable>
          <View style={styles.headerAvatar}>
            <Headphones size={20} color="#FFF" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{ticket.subject}</Text>
            <Text style={styles.headerSubtitle}>#{ticket.id.substring(0, 8).toUpperCase()}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: getStatusColor(ticket.status) }]}>
            <Text style={styles.statusPillText}>{getStatusLabel(ticket.status)}</Text>
          </View>
        </View>

        {/* Info Strip */}
        <View style={styles.infoStrip}>
          <View style={styles.infoItem}>
            <Clock size={12} color={COLORS.primary} />
            <Text style={styles.infoText}>{new Date(ticket.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={styles.infoDot} />
          <Text style={styles.infoText}>{ticket.categoryName || 'General'}</Text>
          {ticket.sellerStoreName && (
            <>
              <View style={styles.infoDot} />
              <Store size={12} color={COLORS.primary} />
              <Text style={styles.infoText} numberOfLines={1}>{ticket.sellerStoreName}</Text>
            </>
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Description Card */}
          <View style={styles.issueCard}>
            <Text style={styles.label}>YOUR REQUEST</Text>
            <Text style={styles.description}>{ticket.description}</Text>
          </View>

          {/* Conversation Divider */}
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>Conversation</Text>
            <View style={styles.line} />
          </View>

          {/* Empty state */}
          {ticket.messages.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Headphones size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>Waiting for an agent</Text>
              <Text style={styles.emptySubtitle}>Our support team typically responds within 1–2 business days.</Text>
            </View>
          )}

          {/* Messages */}
          {ticket.messages.map((msg) => {
            const isMe = msg.senderName === 'You';
            const isAgent = msg.senderType === 'admin';
            return (
              <View key={msg.id} style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
                {!isMe && (
                  <View style={[styles.avatar, isAgent ? styles.agentAvatar : styles.supportAvatar]}>
                    {isAgent
                      ? <Headphones size={14} color="#FFF" />
                      : <User size={14} color="#FFF" />
                    }
                  </View>
                )}
                <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
                  {!isMe && (
                    <Text style={[styles.senderLabel, isAgent && styles.agentLabel]}>
                      {isAgent ? 'Support Agent' : msg.senderName}
                    </Text>
                  )}
                  <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                    {msg.message}
                  </Text>
                  <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {isMe && (
                  <View style={styles.myAvatar}>
                    <User size={14} color="#FFF" />
                  </View>
                )}
              </View>
            );
          })}

          {/* Closed Banner */}
          {isClosed && (
            <View style={styles.closedBanner}>
              <Text style={styles.closedBannerText}>
                This ticket is {ticket.status}. Open a new ticket if you need further assistance.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        {!isClosed && (
          <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              style={styles.input}
              placeholder="Reply to support..."
              placeholderTextColor={COLORS.textMuted}
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            <Pressable
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!messageText.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Send size={18} color="#FFF" />
              }
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    padding: 4,
    marginRight: 6,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  statusPillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  // --- Info Strip ---
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primarySoft,
    gap: 6,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.gray900,
  },
  // --- Scroll Content ---
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  // --- Description Card ---
  issueCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  description: {
    fontSize: 15,
    color: COLORS.gray900,
    lineHeight: 22,
  },
  // --- Divider ---
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0E6D3',
  },
  dividerText: {
    marginHorizontal: 10,
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // --- Empty State ---
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 19,
  },
  // --- Messages ---
  messageRow: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '88%',
  },
  myMessageRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  agentAvatar: {
    backgroundColor: COLORS.primary,
  },
  supportAvatar: {
    backgroundColor: COLORS.gray400,
  },
  myAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gray400,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  messageBubble: {
    padding: 11,
    borderRadius: 16,
    flex: 1,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F0E6D3',
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 3,
  },
  agentLabel: {
    color: COLORS.primary,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFF',
  },
  otherMessageText: {
    color: COLORS.gray900,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTime: {
    color: COLORS.textMuted,
  },
  // --- Closed Banner ---
  closedBanner: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FDE8C8',
  },
  closedBannerText: {
    fontSize: 13,
    color: COLORS.gray900,
    textAlign: 'center',
    lineHeight: 18,
  },
  // --- Input ---
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0E6D3',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FDE8C8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 10,
    fontSize: 15,
    color: COLORS.gray900,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
  },
});
