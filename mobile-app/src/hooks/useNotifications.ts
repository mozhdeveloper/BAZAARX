import { useState, useCallback, useEffect, useRef } from 'react';
import { notificationService, type Notification } from '../services/notificationService';
import { useAuthStore } from '../stores/authStore';

interface UseNotificationsOptions {
  limit?: number;
  autoSubscribe?: boolean;
  userType?: 'buyer' | 'seller' | 'admin';
}

/**
 * Encapsulates notification fetching, realtime subscription,
 * unread counting, and mark-as-read logic.
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { limit = 50, autoSubscribe = true, userType = 'buyer' } = options;
  const { user, isGuest } = useAuthStore();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const loadNotifications = useCallback(async () => {
    if (!user?.id || isGuest) return;
    try {
      const data = await notificationService.getNotifications(user.id, userType, limit);
      setNotifications(data);
    } catch (err) {
      console.error('[useNotifications] load error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, isGuest, userType, limit]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
    );
    notificationService.markAsRead(notificationId, userType);
  }, [userType]);

  const markAllAsRead = useCallback(() => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    notificationService.markAllAsRead(user.id, userType);
  }, [user?.id, userType]);

  // Auto-fetch + realtime subscription
  useEffect(() => {
    loadNotifications();

    if (autoSubscribe && user?.id && !isGuest) {
      unsubRef.current = notificationService.subscribeToNotifications(
        user.id,
        userType,
        () => loadNotifications(),
      );
    }

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [user?.id, isGuest, autoSubscribe, userType]);

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    loadNotifications,
    onRefresh,
    markAsRead,
    markAllAsRead,
  };
}
