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
    try {
     // 1. Update the Address & Recipient Tables (Normalized Schema)
      if (updates.shippingAddress) {
        // Fetch the order to get links AND validation data
        const { data: orderData, error: orderFetchError } = await supabase
          .from('orders')
          .select('address_id, recipient_id, created_at, shipment_status')
          .eq('id', orderId)
          .single();

        if (orderFetchError || !orderData) {
          console.error('Could not find links for order:', orderFetchError);
          throw new Error('Failed to find order data');
        }

        // === QA VALIDATION BLOCK (BX-06-011) ===
        // 1. Time Limit Validation (1 Hour)
        const orderAgeMs = new Date().getTime() - new Date(orderData.created_at).getTime();
        if (orderAgeMs > 3600000) { // 1 hour in ms
          throw new Error('Address change period has expired. Orders can only be updated within 1 hour of placement.');
        }

        // 2. Shipment Arrangement Validation
        const validStatuses = ['pending', 'processing', 'waiting_for_seller'];
        if (orderData.shipment_status && !validStatuses.includes(orderData.shipment_status)) {
          throw new Error('Shipment preparation already started. Order is no longer eligible for address change.');
        }

        // 3. One-Time Change Validation (Check History Audit)
        const { data: historyCheck } = await supabase
          .from('order_status_history')
          .select('id')
          .eq('order_id', orderId)
          .eq('note', 'Address Updated')
          .limit(1);

        if (historyCheck && historyCheck.length > 0) {
          throw new Error('Address change already used for this order. Only one change is allowed.');
        }

        // 4. Shipping Fee Increase Validation (City/Province Lock)
        if (orderData.address_id) {
          const { data: currentAddress } = await supabase
            .from('shipping_addresses')
            .select('province, city')
            .eq('id', orderData.address_id)
            .single();

          if (currentAddress) {
            if (
              updates.shippingAddress.province !== currentAddress.province ||
              updates.shippingAddress.city !== currentAddress.city
            ) {
              throw new Error('Updated address increases shipping fee or is outside coverage. You can only modify the street or barangay within the same city/province.');
            }
          }
        }
        // === END QA VALIDATION ===

        // 1A. Update the Location (shipping_addresses table)
        if (orderData.address_id) {
          const { error: addressUpdateError } = await supabase
            .from('shipping_addresses')
            .update({
              address_line_1: updates.shippingAddress.street || (updates.shippingAddress as any).address,
              city: updates.shippingAddress.city,
              province: updates.shippingAddress.province,
              region: updates.shippingAddress.region || updates.shippingAddress.province,
              postal_code: updates.shippingAddress.postalCode,
              barangay: updates.shippingAddress.barangay || null,
            })
            .eq('id', orderData.address_id);

          if (addressUpdateError) {
            console.error('Failed to update location:', addressUpdateError);
            throw new Error('Failed to update shipping address');
          }
        }

        // 1B. Update the Person (order_recipients table)
        if (orderData.recipient_id) {
          const { error: recipientUpdateError } = await supabase
            .from('order_recipients')
            .update({
              first_name: updates.shippingAddress.fullName,
              last_name: '', // Safe default required by schema
              phone: updates.shippingAddress.phone,
            })
            .eq('id', orderData.recipient_id);

          if (recipientUpdateError) {
            console.error('Failed to update person:', recipientUpdateError);
            throw new Error('Failed to update recipient details');
          }
        }

        // 1C. Log the "One-Time Change" Audit
        await supabase
          .from('order_status_history')
          .insert({
            order_id: orderId,
            status: orderData.shipment_status || 'pending',
            note: 'Address Updated', // This exact string acts as our "already changed" lock!
          });
      }

      // 2. Update regular order details (like payment method)
      const updatePayload: Record<string, unknown> = {};
      if (updates.paymentMethod) {
        updatePayload.payment_method = updates.paymentMethod;
      }

      if (Object.keys(updatePayload).length > 0) {
        const { error: updateError } = await supabase
          .from('orders')
          .update(updatePayload)
          .eq('id', orderId);

        if (updateError) {
          console.error('Error updating order details:', updateError);
          throw new Error('Failed to update order details');
        }
      }

      // 3. Update order_items table if variant updates provided
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
    } catch (error) {
      console.error('Error in updatePendingOrderDetails:', error);
      throw error;
    }
  }
      }
    
  

export const orderMutationService = new OrderMutationService();
