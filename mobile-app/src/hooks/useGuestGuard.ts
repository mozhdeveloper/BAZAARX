import { useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

/**
 * Manages guest user authentication gating.
 * Provides a `requireAuth` guard and modal state for GuestLoginModal.
 * Used in 9+ screens to protect auth-required actions.
 */
export function useGuestGuard() {
  const { user, isGuest } = useAuthStore();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestModalMessage, setGuestModalMessage] = useState('Please sign up or log in to continue.');

  const isAuthenticated = !isGuest && !!user?.id;

  /** Returns true if user is authenticated. If guest, opens the modal and returns false. */
  const requireAuth = useCallback((message?: string): boolean => {
    if (isGuest || !user?.id) {
      if (message) setGuestModalMessage(message);
      setShowGuestModal(true);
      return false;
    }
    return true;
  }, [isGuest, user?.id]);

  const dismissGuestModal = useCallback(() => {
    setShowGuestModal(false);
  }, []);

  return {
    user,
    isGuest,
    isAuthenticated,
    showGuestModal,
    guestModalMessage,
    requireAuth,
    dismissGuestModal,
  };
}
