/**
 * ReturnMessageThread (mobile)
 * Inline buyer↔seller chat for a return case.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';

// Supabase DB types predate migration 037 (return_messages). Cast to any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { COLORS } from '@/constants/theme';

interface ReturnMessage {
  id: string;
  return_id: string;
  sender_id: string | null;
  sender_role: 'buyer' | 'seller' | 'admin' | 'system';
  body: string;
  created_at: string;
}

interface ReturnMessageThreadProps {
  returnId: string;
  senderRole: 'buyer' | 'seller' | 'admin';
}

export function ReturnMessageThread({ returnId, senderRole }: ReturnMessageThreadProps) {
  const [messages, setMessages] = useState<ReturnMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  // ── initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await db
        .from('return_messages')
        .select('*')
        .eq('return_id', returnId)
        .order('created_at', { ascending: true });
      if (mounted) {
        setMessages((data as ReturnMessage[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [returnId]);

  // ── realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = db
      .channel(`rmt_${returnId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'return_messages',
          filter: `return_id=eq.${returnId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as ReturnMessage).id)) return prev;
            return [...prev, payload.new as ReturnMessage];
          });
          listRef.current?.scrollToEnd({ animated: true });
        }
      )
      .subscribe();

    return () => { db.removeChannel(channel); };
  }, [returnId]);

  // ── send ───────────────────────────────────────────────────────────────────
  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    const { data: { user } } = await db.auth.getUser();
    if (!user) return;

    setSending(true);
    Keyboard.dismiss();
    try {
      const { error } = await db.from('return_messages').insert({
        return_id: returnId,
        sender_id: user.id,
        sender_role: senderRole,
        body,
      });
      if (!error) setDraft('');
    } finally {
      setSending(false);
    }
  }

  // ── render helpers ─────────────────────────────────────────────────────────
  function renderMessage({ item }: { item: ReturnMessage }) {
    if (item.sender_role === 'system') {
      return (
        <Text style={styles.systemMsg}>{item.body}</Text>
      );
    }
    const isOwn = item.sender_role === senderRole;
    return (
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
          {item.body}
        </Text>
        <Text style={[styles.timestamp, isOwn ? styles.timestampOwn : styles.timestampOther]}>
          {item.sender_role === 'admin' ? 'BazaarX Support' : item.sender_role} ·{' '}
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading messages…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.container}>
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No messages yet. Start the conversation below.</Text>
          }
        />

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor="#9CA3AF"
            multiline
            style={styles.input}
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim() || sending}
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.sendBtnText}>→</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  loadingText: { fontSize: 13, color: '#6B7280' },
  list: { maxHeight: 220 },
  listContent: { padding: 12, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
  emptyText: { textAlign: 'center', fontSize: 13, color: '#9CA3AF', paddingVertical: 20 },
  systemMsg: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginVertical: 4,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 2,
  },
  bubbleOwn: {
    alignSelf: 'flex-end',
    backgroundColor: '#D97706',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextOwn: { color: '#FFF' },
  bubbleTextOther: { color: '#111827' },
  timestamp: { fontSize: 10, marginTop: 3 },
  timestampOwn: { color: 'rgba(255,255,255,0.75)', textAlign: 'right' },
  timestampOther: { color: '#9CA3AF' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 96,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#FCD34D' },
  sendBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});
