import { orderService } from '@/services/orderService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { CreatePOSOrderInput, POSOrderCreateResult, NormalizedShippingAddress } from '@/types/orders';

interface UpdateOrderStatusInput {
  orderId: string;
  nextStatus: string;
  actorId?: string;
  actorRole?: string;
  note?: string;
}

interface MarkOrderShippedInput {
  orderId: string;
  sellerId: string;
  trackingNumber: string;
}

interface MarkOrderDeliveredInput {
  orderId: string;
  sellerId: string;
}

interface CancelOrderInput {
  orderId: string;
  reason?: string;
  cancelledBy?: string;
  changedByRole?: string | null;
}

interface UpdatePendingOrderDetailsInput {
  orderId: string;
  updates: {
    shippingAddress?: NormalizedShippingAddress;
    paymentMethod?: string;
    updatedVariant?: Array<{
      itemId: string;
      variantId?: string;
      personalized_options?: Record<string, unknown>;
    }>;
  };
}

class OrderMutationService {
  async updateOrderStatus({
    orderId,
    nextStatus,
    actorId,
    actorRole,
    note,
  }: UpdateOrderStatusInput): Promise<boolean> {
    return orderService.updateOrderStatus(orderId, nextStatus, note, actorId, actorRole);
  }

  async markOrderShipped({
    orderId,
    sellerId,
    trackingNumber,
  }: MarkOrderShippedInput): Promise<boolean> {
    return orderService.markOrderAsShipped(orderId, trackingNumber, sellerId);
  }

  async markOrderDelivered({ orderId, sellerId }: MarkOrderDeliveredInput): Promise<boolean> {
    return orderService.markOrderAsDelivered(orderId, sellerId);
  }

  async cancelOrder({ orderId, reason, cancelledBy, changedByRole }: CancelOrderInput): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return orderService.cancelOrder(orderId, reason, cancelledBy);
    }

    const { data, error } = await supabase.rpc('cancel_order_atomic', {
      p_order_id: orderId,
      p_reason: reason?.trim() || undefined,
      p_cancelled_by: cancelledBy || undefined,
      p_changed_by_role: changedByRole || undefined,
    });

    if (error) {
      console.error('Error cancelling order through RPC:', error);
      throw new Error('Failed to cancel order');
    }

    return Boolean(data);
  }

  async confirmOrderReceived(orderId: string, buyerId: string, receiptPhotoUrls?: string[]): Promise<boolean> {
    return orderService.confirmOrderReceived(orderId, buyerId, receiptPhotoUrls);
  }

  async createPOSOrder(input: CreatePOSOrderInput): Promise<POSOrderCreateResult | null> {
    return orderService.createPOSOrder(
      input.sellerId,
      input.sellerName,
      input.items,
      input.total,
      input.note,
      input.buyerEmail,
      input.paymentMethod,
    );
  }

  async updatePendingOrderDetails({
    orderId,
    updates,
  }: UpdatePendingOrderDetailsInput): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    // Query the orders table to verify current shipment status is 'waiting_for_seller' (pending)
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select('shipment_status')
      .eq('id', orderId)
      .single();

    if (fetchError || !orderData) {
      throw new Error(`Failed to fetch order: ${fetchError?.message || 'Order not found'}`);
    }

    if (orderData.shipment_status !== 'waiting_for_seller') {
      throw new Error('Order can no longer be edited.');
    }

    // Update orders table if shipping address or payment method provided
    if (updates.shippingAddress || updates.paymentMethod) {
      const updatePayload: Record<string, unknown> = {};

      if (updates.shippingAddress) {
        updatePayload.shipping_address = updates.shippingAddress;
      }

      if (updates.paymentMethod) {
        updatePayload.payment_method = updates.paymentMethod;
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order details:', updateError);
        throw new Error('Failed to update order details');
      }
    }

    // Update order_items table if variant updates provided
    if (updates.updatedVariant && updates.updatedVariant.length > 0) {
      for (const variant of updates.updatedVariant) {
        const itemUpdatePayload: Record<string, unknown> = {};

        if (variant.variantId) {
          itemUpdatePayload.variant_id = variant.variantId;
        }

        if (variant.personalized_options) {
          itemUpdatePayload.personalized_options = variant.personalized_options;
        }

        if (Object.keys(itemUpdatePayload).length > 0) {
          const { error: itemUpdateError } = await supabase
            .from('order_items')
            .update(itemUpdatePayload)
            .eq('id', variant.itemId)
            .eq('order_id', orderId);

          if (itemUpdateError) {
            console.error(`Error updating order item ${variant.itemId}:`, itemUpdateError);
            throw new Error(`Failed to update order item ${variant.itemId}`);
          }
        }
      }
    }

    return true;
  }
}

export const orderMutationService = new OrderMutationService();
