import { create } from 'zustand';
import type { UserPresence } from '../types/database.types';

interface ChatState {
  // Seller presence tracking
  sellerPresence: Map<string, UserPresence>;
  setSellerPresence: (sellerId: string, presence: UserPresence | null) => void;
  getSellerOnlineStatus: (sellerId: string) => boolean;
  getSellerLastActive: (sellerId: string) => string | null;

  // System messages deduplication
  systemMessagesSent: Set<string>;
  hasSystemMessageBeenSent: (orderId: string, status: string) => boolean;
  markSystemMessageSent: (orderId: string, status: string) => void;
  clearSystemMessage: (orderId: string, status: string) => void;

  // Cleanup
  clearPresence: (sellerId: string) => void;
  cleanup: () => void;
}

const createDeduplicationKey = (orderId: string, status: string): string => {
  return `${orderId}:${status}`;
};

export const useChatStore = create<ChatState>((set, get) => ({
  sellerPresence: new Map(),
  systemMessagesSent: new Set(),

  setSellerPresence: (sellerId: string, presence: UserPresence | null) => {
    set((state) => {
      const newMap = new Map(state.sellerPresence);
      if (presence) {
        newMap.set(sellerId, presence);
      } else {
        newMap.delete(sellerId);
      }
      return { sellerPresence: newMap };
    });
  },

  getSellerOnlineStatus: (sellerId: string): boolean => {
    const state = get();
    const presence = state.sellerPresence.get(sellerId);
    return presence?.is_online || false;
  },

  getSellerLastActive: (sellerId: string): string | null => {
    const state = get();
    const presence = state.sellerPresence.get(sellerId);
    return presence?.last_active_at || null;
  },

  hasSystemMessageBeenSent: (orderId: string, status: string): boolean => {
    const state = get();
    const key = createDeduplicationKey(orderId, status);
    return state.systemMessagesSent.has(key);
  },

  markSystemMessageSent: (orderId: string, status: string) => {
    set((state) => {
      const newSet = new Set(state.systemMessagesSent);
      const key = createDeduplicationKey(orderId, status);
      newSet.add(key);
      return { systemMessagesSent: newSet };
    });
  },

  clearSystemMessage: (orderId: string, status: string) => {
    set((state) => {
      const newSet = new Set(state.systemMessagesSent);
      const key = createDeduplicationKey(orderId, status);
      newSet.delete(key);
      return { systemMessagesSent: newSet };
    });
  },

  clearPresence: (sellerId: string) => {
    set((state) => {
      const newMap = new Map(state.sellerPresence);
      newMap.delete(sellerId);
      return { sellerPresence: newMap };
    });
  },

  cleanup: () => {
    set({
      sellerPresence: new Map(),
      systemMessagesSent: new Set(),
    });
  },
}));
