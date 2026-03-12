import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore, ChatMessage } from '@/stores/chatStore';
import type { Message } from '@/services/chatService';

/**
 * useChatRealtime – subscribes to INSERT events on the messages table
 * for a specific conversation and pushes them into the Zustand store.
 *
 * INTEGRATION POINT: call once per mounted chat component, e.g.:
 *   useChatRealtime(conversation?.id, (msg) => { /* side-effects *\/ });
 *
 * Safe to call unconditionally – the hook is a no-op when conversationId
 * is null/undefined (no Rules of Hooks violations).
 */
export function useChatRealtime(
  conversationId: string | null | undefined,
  onMessage?: (msg: ChatMessage) => void,
): void {
  const addMessage = useChatStore((state) => state.addMessage);

  // Ref pattern: keeps the callback pointer stable so the Supabase channel
  // is NOT recreated on every render (only when conversationId changes).
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    if (!conversationId) return;

    // INTEGRATION POINT: channel name is scoped per conversation to prevent
    // cross-conversation event leakage if multiple chats are mounted.
    const channel = supabase
      .channel(`chat:messages:${conversationId}`)
      .on<Message>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new;
          // Map DB row → shared ChatMessage shape before pushing to the store
          const chatMsg: ChatMessage = {
            id: incoming.id,
            sender: incoming.sender_type,
            message: incoming.content,
            timestamp: new Date(incoming.created_at),
            read: incoming.is_read,
          };
          addMessage(chatMsg);
          onMessageRef.current?.(chatMsg);
        },
      )
      .subscribe();

    // INTEGRATION POINT: removes the Supabase channel on unmount or when
    // conversationId changes, preventing memory leaks and duplicate handlers.
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, addMessage]); // onMessage intentionally omitted via ref pattern
}
