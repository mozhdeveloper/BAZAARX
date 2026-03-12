/**
 * Chat Store - Manages global chat bubble state
 */

import { create } from 'zustand';

export interface ChatTarget {
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  // Seller-initiated chat fields (from order details)
  buyerId?: string;
  buyerName?: string;
  orderId?: string;
}

// INTEGRATION POINT: shared UI message type – import this in any component
// that renders or manipulates chat messages (e.g., ChatBubble, useChatRealtime)
export interface ChatMessage {
  id: string;
  sender: 'buyer' | 'seller' | 'system';
  message: string;
  timestamp: Date;
  read: boolean;
}

interface ChatStore {
  isOpen: boolean;
  isMiniMode: boolean;
  chatTarget: ChatTarget | null;
  unreadCount: number;
  position: { x: number; y: number };
  // INTEGRATION POINT: messages is the single source of truth for chat history
  messages: ChatMessage[];

  // Actions
  openChat: (target: ChatTarget) => void;
  closeChat: () => void;
  toggleChat: () => void;
  setMiniMode: (isMini: boolean) => void;
  setUnreadCount: (count: number) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  clearChatTarget: () => void;
  // INTEGRATION POINT: message actions – prefer these over local useState
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  clearMessages: () => void;
  replaceMessage: (id: string, msg: ChatMessage) => void;
  removeMessage: (id: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  isOpen: false,
  isMiniMode: true,
  chatTarget: null,
  unreadCount: 0,
  position: { x: window.innerWidth - 80, y: window.innerHeight - 120 },
  messages: [],

  openChat: (target) => set({
    isOpen: true,
    isMiniMode: false,
    chatTarget: target
  }),

  closeChat: () => set({
    isOpen: false,
    isMiniMode: true
  }),

  toggleChat: () => set((state) => ({
    isOpen: !state.isOpen,
    isMiniMode: state.isOpen ? true : false
  })),

  setMiniMode: (isMini) => set({ isMiniMode: isMini }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  setPosition: (pos) => set({ position: pos }),

  clearChatTarget: () => set({ chatTarget: null }),

  // INTEGRATION POINT: immutable append – deduplicates by id to prevent
  // double-render when an optimistic update and a realtime event both fire.
  addMessage: (msg) =>
    set((state) => ({
      messages: state.messages.some((m) => m.id === msg.id)
        ? state.messages
        : [...state.messages, msg],
    })),

  setMessages: (msgs) => set({ messages: msgs }),

  clearMessages: () => set({ messages: [] }),

  replaceMessage: (id, msg) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? msg : m)),
    })),

  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),
}));
