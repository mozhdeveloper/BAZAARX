import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { COLORS } from '../../src/constants/theme';
import { TicketService } from '../../services/TicketService';
import type { Ticket, TicketMessage } from '../types/ticketTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'TicketDetail'>;

export default function TicketDetailScreen({ route, navigation }: Props) {
  const { ticketId } = route.params;
  const insets = useSafeAreaInsets();
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
        const data = await TicketService.getTicketDetails(ticketId);
        setTicket(data);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleSend = async () => {
      if (!messageText.trim()) return;
      
      setSending(true);
      try {
          const newMsg = await TicketService.sendMessage(ticketId, messageText);
          if (ticket) {
              setTicket({
                  ...ticket,
                  messages: [...ticket.messages, newMsg]
              });
          }
          setMessageText('');
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (err) {
          console.error(err);
      } finally {
          setSending(false);
      }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'open': return '#3B82F6';
        case 'in_progress': return '#F59E0B';
        case 'resolved': return '#10B981';
        case 'closed': return '#6B7280';
        default: return '#6B7280';
    }
  };

  if (loading) {
      return (
          <View style={[styles.container, styles.center]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
      );
  }

  if (!ticket) {
      return (
          <View style={[styles.container, styles.center]}>
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
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1F2937" />
                </Pressable>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{ticket.subject}</Text>
                    <Text style={styles.headerSubtitle}>#{ticket.id}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
                    <Text style={styles.statusText}>{ticket.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
            </View>

            <ScrollView 
                ref={scrollViewRef}
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {/* Original Issue Card */}
                <View style={styles.issueCard}>
                    <Text style={styles.label}>Description</Text>
                    <Text style={styles.description}>{ticket.description}</Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaText}>{ticket.category}</Text>
                        <Text style={styles.metaText}>{new Date(ticket.createdAt).toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.line} />
                    <Text style={styles.dividerText}>Messages</Text>
                    <View style={styles.line} />
                </View>

                {/* Messages */}
                {ticket.messages.map((msg) => {
                    const isMe = msg.senderName === 'You';
                    return (
                        <View key={msg.id} style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
                            {!isMe && (
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{msg.senderName.charAt(0)}</Text>
                                </View>
                            )}
                            <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
                                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                                    {msg.message}
                                </Text>
                                <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Input Area */}
            {ticket.status !== 'closed' && (
                <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10 }]}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        value={messageText}
                        onChangeText={setMessageText}
                        multiline
                    />
                    <Pressable 
                        style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]} 
                        onPress={handleSend}
                        disabled={!messageText.trim() || sending}
                    >
                        {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={20} color="#FFF" />}
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
    backgroundColor: '#F3F4F6',
  },
  center: {
      justifyContent: 'center',
      alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
      flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
      fontSize: 12,
      color: '#6B7280',
  },
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
  },
  statusText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '700',
  },
  content: {
      flex: 1,
  },
  contentContainer: {
      padding: 16,
  },
  issueCard: {
      backgroundColor: '#FFF',
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
  },
  label: {
      fontSize: 12,
      fontWeight: '600',
      color: '#9CA3AF',
      marginBottom: 4,
      textTransform: 'uppercase',
  },
  description: {
      fontSize: 16,
      color: '#374151',
      lineHeight: 24,
      marginBottom: 12,
  },
  metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  metaText: {
      fontSize: 12,
      color: '#9CA3AF',
  },
  divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
  },
  line: {
      flex: 1,
      height: 1,
      backgroundColor: '#E5E7EB',
  },
  dividerText: {
      marginHorizontal: 10,
      color: '#9CA3AF',
      fontSize: 12,
      fontWeight: '600',
  },
  messageRow: {
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'flex-end',
      maxWidth: '85%',
  },
  myMessageRow: {
      alignSelf: 'flex-end',
      justifyContent: 'flex-end',
  },
  otherMessageRow: {
      alignSelf: 'flex-start',
  },
  avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#E5E7EB',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
  },
  avatarText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#6B7280',
  },
  messageBubble: {
      padding: 12,
      borderRadius: 16,
      minWidth: 100,
  },
  myBubble: {
      backgroundColor: COLORS.primary,
      borderBottomRightRadius: 4,
  },
  otherBubble: {
      backgroundColor: '#FFF',
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: '#E5E7EB',
  },
  messageText: {
      fontSize: 15,
      lineHeight: 22,
  },
  myMessageText: {
      color: '#FFF',
  },
  otherMessageText: {
      color: '#111827',
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
      color: '#9CA3AF',
  },
  errorText: {
      fontSize: 16,
      color: '#DC2626',
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      backgroundColor: '#FFF',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
  },
  input: {
      flex: 1,
      backgroundColor: '#F9FAFB',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxHeight: 100,
      marginRight: 10,
      fontSize: 16,
  },
  sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
  },
  sendButtonDisabled: {
      backgroundColor: '#D1D5DB',
  },
});
