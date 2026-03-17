import { useState, useEffect, useRef } from 'react';
import { useDeliveryStore } from '../stores/deliveryStore';
import { supabase } from '../lib/supabase';

interface OrderStatusEntry {
  status: string;
  description?: string;
  timestamp: string;
  location?: string;
}

/**
 * Encapsulates delivery tracking state + realtime order-status subscription.
 * Used by DeliveryTrackingScreen and OrderDetailScreen.
 */
export function useDeliveryTracking(orderId: string | undefined) {
  const fetchTrackingByOrderId = useDeliveryStore((s) => s.fetchTrackingByOrderId);
  const deliveryStoreTracking = useDeliveryStore((s) => s.tracking);

  const [deliveryInfo, setDeliveryInfo] = useState(deliveryStoreTracking);
  const [timeline, setTimeline] = useState<OrderStatusEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isDelivered = deliveryInfo?.currentStatus === 'delivered';

  // Fetch tracking on mount
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchTrackingByOrderId(orderId)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId, fetchTrackingByOrderId]);

  // Sync from store
  useEffect(() => {
    if (deliveryStoreTracking) {
      setDeliveryInfo(deliveryStoreTracking);
    }
  }, [deliveryStoreTracking]);

  // Realtime order status subscription
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order_status_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_history',
          filter: `order_id=eq.${orderId}`,
        },
        (payload: any) => {
          const entry: OrderStatusEntry = {
            status: payload.new.status,
            description: payload.new.description,
            timestamp: payload.new.created_at,
            location: payload.new.location,
          };
          setTimeline((prev) => [...prev, entry]);
        },
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      channel.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [orderId]);

  return {
    deliveryInfo,
    timeline,
    isDelivered,
    loading,
  };
}
