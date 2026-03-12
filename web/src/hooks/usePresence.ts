import { useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';

// Import whichever stores you use to get the current logged-in user
import { useBuyerStore } from '../stores/buyerStore';
import { useAuthStore } from '../stores/sellerStore'; 

export function usePresence() {
  // Grab the user ID depending on if they are logged in as a buyer or seller
  const buyerProfile = useBuyerStore((state) => state.profile);
  const sellerProfile = useAuthStore((state) => state.seller);
  const userId = buyerProfile?.id || sellerProfile?.id;
  const userType: 'buyer' | 'seller' = buyerProfile?.id ? 'buyer' : 'seller';

  // Holds the pending "go offline" timer so it can be cancelled if the user returns
  const offlineTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const syncPresence = () => {
      if (document.visibilityState === 'visible') {
        // User returned — cancel the pending offline countdown and go online immediately
        if (offlineTimeoutRef.current) {
          clearTimeout(offlineTimeoutRef.current);
          offlineTimeoutRef.current = null;
        }
        chatService.updateUserPresence(userId, 'online');
      } else {
        // Tab hidden — wait 15 s before marking offline to avoid flickering
        offlineTimeoutRef.current = setTimeout(() => {
          chatService.updateUserPresence(userId, 'offline');
        }, 15000);
      }
    };

    // Tab/window is actually closing — skip the grace period and go offline immediately
    const handleBeforeUnload = () => {
      if (offlineTimeoutRef.current) {
        clearTimeout(offlineTimeoutRef.current);
      }
      chatService.updateUserPresence(userId, 'offline');
    };

    // Set initial state based on whether the tab is already visible
    syncPresence();

    document.addEventListener('visibilitychange', syncPresence);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', syncPresence);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Clear any pending timeout to prevent memory leaks
      if (offlineTimeoutRef.current) {
        clearTimeout(offlineTimeoutRef.current);
      }
      // Mark offline on explicit unmount (logout / route change)
      chatService.updateUserPresence(userId, 'offline');
    };
  }, [userId]);
}