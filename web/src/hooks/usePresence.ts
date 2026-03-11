import { useEffect } from 'react';
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

  useEffect(() => {
    if (!userId) return;

    // 1. Mark online immediately when they log in or load the page
    chatService.updateUserPresence(userId, 'online', userType);

    // 2. Listen for tab switching (minimizing browser, switching tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        chatService.updateUserPresence(userId, 'online', userType);
      } else {
        chatService.updateUserPresence(userId, 'offline', userType);
      }
    };

    // 3. Listen for closing the tab entirely
    const handleBeforeUnload = () => {
      chatService.updateUserPresence(userId, 'offline', userType);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Cleanup: mark offline if the component unmounts (e.g. they log out)
      chatService.updateUserPresence(userId, 'offline', userType);
    };
  }, [userId]);
}