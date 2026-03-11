import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { chatService } from '../services/chatService';
import { useAuthStore } from '../stores/authStore';
import { useSellerStore } from '../stores/sellerStore';

export function usePresence() {
  const { user } = useAuthStore();
  const { seller } = useSellerStore();

  // Prefer seller ID (seller session); fall back to buyer/auth user ID
  const userId = seller?.id || user?.id;

  // Holds the pending "go offline" timer so it can be cancelled if the user returns
  const offlineTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Set initial state based on whether the app is already in the foreground
    const initialStatus = AppState.currentState === 'active' ? 'online' : 'offline';
    chatService.updateUserPresence(userId, initialStatus, 'mobile');

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App foregrounded — cancel the pending offline countdown and go online immediately
        if (offlineTimeoutRef.current) {
          clearTimeout(offlineTimeoutRef.current);
          offlineTimeoutRef.current = null;
        }
        chatService.updateUserPresence(userId, 'online', 'mobile');
      } else if (nextAppState.match(/inactive|background/)) {
        // App hidden — wait 15 s before marking offline to avoid flickering
        // (e.g. iOS control centre swipe, brief interruption from a phone call)
        offlineTimeoutRef.current = setTimeout(() => {
          chatService.updateUserPresence(userId, 'offline', 'mobile');
        }, 15000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      // Clear any pending timeout to prevent memory leaks
      if (offlineTimeoutRef.current) {
        clearTimeout(offlineTimeoutRef.current);
      }
      // Mark offline on explicit unmount (logout / auth state cleared)
      chatService.updateUserPresence(userId, 'offline', 'mobile');
    };
  }, [userId]);
}
