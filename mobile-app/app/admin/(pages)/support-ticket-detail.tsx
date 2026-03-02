import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, ShieldCheck, User, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { COLORS } from '../../../src/constants/theme';
import { TicketService } from '../../../services/TicketService';
import { useAuthStore } from '../../../src/stores/authStore';
import { supabase } from '../../../src/lib/supabase';
import { notificationService } from '../../../src/services/notificationService';
import type { Ticket, TicketMessage, TicketStatus } from '../../types/ticketTypes';

type Props = {
  route: { params: { ticketId: string } };
  navigation: any;
};

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

export default function AdminSupportTicketDetail({ route, navigation }: Props) {
  const { ticketId } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadTicket = useCallback(async () => {
    try {
      const data = await TicketService.getTicketDetails(ticketId);
      setTicket(data);
    } catch (err) {
      console.error('Admin ticket load error:', err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleReply = async () => {
    if (!replyText.trim()) return;

    let adminId = user?.id;
    if (!adminId) {
      const { data: { session } } = await supabase.auth.getSession();
      adminId = session?.user?.id;
    }
    if (!adminId) return;

    setSending(true);
    try {
      const msg = await TicketService.sendAdminMessage(ticketId, adminId, replyText.trim());
      if (msg && ticket) {
        setTicket({
          ...ticket,
          status: ticket.status === 'open' ? 'in_progress' : ticket.status,
          messages: [...ticket.messages, msg],
        });

        // Notify the buyer that an agent replied
        try {
          await notificationService.notifyBuyerTicketReply({
            buyerId: ticket.userId,
            ticketId: ticket.id,
            ticketSubject: ticket.subject,
            replyPreview: replyText.trim(),
          });
        } catch (notifErr) {
          console.error('[AdminTicket] Buyer notification error:', notifErr);
        }
      }
      setReplyText('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert('Error', 'Failed to send reply. Please try again.');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    setUpdatingStatus(true);
    try {
      await TicketService.updateTicketStatus(ticketId, newStatus);
      setTicket({ ...ticket, status: newStatus });
    } catch (err) {
      Alert.alert('Error', 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const quickActions: Array<{ label: string; status: TicketStatus; color: string }> = [
    { label: 'In Progress', status: 'in_progress', color: '#F59E0B' },
    { label: 'Waiting', status: 'waiting_response', color: '#8B5CF6' },
    { label: 'Resolve', status: 'resolved', color: '#10B981' },
    { label: 'Close', status: 'closed', color: '#6B7280' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Ticket not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#1F2937" />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{ticket.subject}</Text>
            <Text style={styles.headerSub}>#{ticket.id.substring(0, 8).toUpperCase()}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: getStatusColor(ticket.status) }]}>
            {updatingStatus
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.statusPillText}>{ticket.status.replace(/_/g, ' ')}</Text>
            }
          </View>
        </View>

        {/* Quick Status Actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsRow}
        >
          {quickActions.map((action) => (
            <Pressable
              key={action.status}
              style={[
                styles.quickActionChip,
                ticket.status === action.status && { backgroundColor: action.color },
              ]}
              onPress={() => handleStatusChange(action.status)}
              disabled={ticket.status === action.status || updatingStatus}
            >
              <Text
                style={[
                  styles.quickActionText,
                  ticket.status === action.status && styles.quickActionTextActive,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          ref={scrollRef}
          style={styles.content}
          contentContainerStyle={styles.contentPad}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Ticket Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>{ticket.categoryName || 'General'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Priority</Text>
              <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>{ticket.priority}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>
                {new Date(ticket.createdAt).toLocaleString()}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Description</Text>
            </View>
            <Text style={styles.descriptionText}>{ticket.description}</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>Conversation</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Messages */}
          {ticket.messages.length === 0 ? (
            <View style={styles.noMessages}>
              <Text style={styles.noMessagesText}>No messages yet. Reply below to start.</Text>
            </View>
          ) : (
            ticket.messages.map((msg) => {
              const isAdmin = msg.senderType === 'admin';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.msgRow,
                    isAdmin ? styles.msgRowAdmin : styles.msgRowUser,
                  ]}
                >
                  <View style={[styles.msgAvatar, isAdmin ? styles.msgAvatarAdmin : styles.msgAvatarUser]}>
                    {isAdmin
                      ? <ShieldCheck size={14} color="#FFF" />
                      : <User size={14} color="#FFF" />}
                  </View>
                  <View style={[styles.msgBubble, isAdmin ? styles.msgBubbleAdmin : styles.msgBubbleUser]}>
                    <Text style={styles.msgSender}>{isAdmin ? 'Support Agent (Admin)' : 'Customer'}</Text>
                    <Text style={[styles.msgText, isAdmin && styles.msgTextAdmin]}>
                      {msg.message}
                    </Text>
                    <Text style={[styles.msgTime, isAdmin && styles.msgTimeAdmin]}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Reply Box */}
        {ticket.status !== 'closed' ? (
          <View style={[styles.replyBox, { paddingBottom: insets.bottom + 10 }]}>
            <View style={styles.replyInputWrapper}>
              <ShieldCheck size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.replyInput}
                placeholder="Reply as Support Agent…"
                placeholderTextColor="#9CA3AF"
                value={replyText}
                onChangeText={setReplyText}
                multiline
                maxLength={2000}
              />
            </View>
            <Pressable
              style={[styles.sendBtn, (!replyText.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleReply}
              disabled={!replyText.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Send size={20} color="#FFF" />}
            </Pressable>
          </View>
        ) : (
          <View style={[styles.closedBanner, { paddingBottom: insets.bottom + 10 }]}>
            <XCircle size={16} color="#6B7280" />
            <Text style={styles.closedText}>This ticket is closed.</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, color: '#DC2626' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  statusPillText: { fontSize: 10, fontWeight: '700', color: '#FFF', textTransform: 'capitalize' },
  quickActionsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  quickActionChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  quickActionText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  quickActionTextActive: { color: '#FFF' },
  content: { flex: 1 },
  contentPad: { padding: 16, gap: 12 },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  descriptionText: { fontSize: 13, color: '#374151', lineHeight: 20, marginTop: 6 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  msgRowAdmin: { flexDirection: 'row-reverse' },
  msgRowUser: {},
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  msgAvatarAdmin: { backgroundColor: COLORS.primary },
  msgAvatarUser: { backgroundColor: '#6B7280' },
  msgBubble: {
    maxWidth: '78%',
    borderRadius: 14,
    padding: 12,
  },
  msgBubbleAdmin: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  msgBubbleUser: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  msgSender: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  msgText: { fontSize: 14, lineHeight: 20, color: '#111827' },
  msgTextAdmin: { color: '#FFF' },
  msgTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },
  msgTimeAdmin: { color: 'rgba(255,255,255,0.6)' },
  noMessages: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  noMessagesText: { fontSize: 14, color: '#9CA3AF' },
  replyBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  replyInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  replyInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    maxHeight: 100,
    paddingTop: 2,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closedText: { fontSize: 14, color: '#6B7280' },
});
