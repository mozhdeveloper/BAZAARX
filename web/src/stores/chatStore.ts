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
}

interface ChatStore {
  isOpen: boolean;
  isMiniMode: boolean;
  chatTarget: ChatTarget | null;
  unreadCount: number;
  position: { x: number; y: number };

  // Actions
  openChat: (target: ChatTarget) => void;
  closeChat: () => void;
  toggleChat: () => void;
  setMiniMode: (isMini: boolean) => void;
  setUnreadCount: (count: number) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  clearChatTarget: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  isOpen: false,
  isMiniMode: true,
  chatTarget: null,
  unreadCount: 0,
  position: { x: window.innerWidth - 80, y: window.innerHeight - 120 },

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
}));
