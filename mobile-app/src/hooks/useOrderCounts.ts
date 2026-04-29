import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export interface OrderCounts {
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
}

export const useOrderCounts = () => {
  const { user } = useAuthStore();
  const [counts, setCounts] = useState<OrderCounts>({
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      /**
       * To match the "My Orders" screen tabs exactly, we need to fetch all orders
       * for the user and apply the same mapping logic (mapBuyerUiStatusFromNormalized).
       * We fetch only the columns required for the mapping to save bandwidth.
       */
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          payment_status, 
          shipment_status, 
          reviews:reviews(id),
          return_requests:refund_return_periods(id),
          cancellations:order_cancellations(id)
        `)
        .eq('buyer_id', user.id);

      if (error) throw error;

      const newCounts: OrderCounts = {
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
      };

      (orders || []).forEach((order: any) => {
        const paymentStatus = order.payment_status;
        const shipmentStatus = order.shipment_status;
        const hasReturnRequest = order.return_requests && order.return_requests.length > 0;
        const isReviewed = order.reviews && order.reviews.length > 0;
        const hasCancellationRecord = order.cancellations && order.cancellations.length > 0;

        /**
         * Logic matching mapBuyerUiStatusFromNormalized in OrdersScreen.tsx:
         * This determines which tab the order belongs to.
         */
        let buyerUiStatus: string;

        if (hasReturnRequest) {
          buyerUiStatus = 'returned';
        } else if (isReviewed) {
          buyerUiStatus = 'reviewed';
        } else if (shipmentStatus === 'received') {
          buyerUiStatus = 'received';
        } else if (shipmentStatus === 'delivered') {
          buyerUiStatus = 'delivered';
        } else if (shipmentStatus === 'shipped' || shipmentStatus === 'out_for_delivery') {
          buyerUiStatus = 'shipped';
        } else if (shipmentStatus === 'processing' || shipmentStatus === 'ready_to_ship') {
          buyerUiStatus = 'processing';
        } else if (paymentStatus === 'paid' && shipmentStatus === 'waiting_for_seller') {
          buyerUiStatus = 'processing';
        } else if (shipmentStatus === 'waiting_for_seller' || paymentStatus === 'pending_payment' || paymentStatus === 'pending') {
          buyerUiStatus = 'pending';
        } else if (shipmentStatus === 'failed_to_deliver') {
          buyerUiStatus = 'cancelled';
        } else if (shipmentStatus === 'returned' || paymentStatus === 'refunded' || paymentStatus === 'partially_refunded') {
          buyerUiStatus = hasCancellationRecord ? 'cancelled' : 'returned';
        } else {
          buyerUiStatus = 'pending';
        }

        // Increment counts based on the resulting status
        if (buyerUiStatus === 'pending') newCounts.pending++;
        else if (buyerUiStatus === 'processing') newCounts.processing++;
        else if (buyerUiStatus === 'shipped') newCounts.shipped++;
        else if (buyerUiStatus === 'delivered') newCounts.delivered++;
      });
      
      setCounts(newCounts);
    } catch (error) {
      console.error('Error in useOrderCounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { counts, isLoading, refresh: fetchCounts };
};
