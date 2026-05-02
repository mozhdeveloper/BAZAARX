import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { orderService } from "@/services/orderService";
import { notificationService } from "@/services/notificationService";

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

interface ConfirmOrderReceivedInput {
  orderId: string;
  buyerId: string;
  receiptPhotoUrls?: string[];
}

interface CancelOrderInput {
  orderId: string;
  reason?: string;
  cancelledBy?: string;
  changedByRole?: string | null;
}

interface SubmitOrderReviewInput {
  orderId: string;
  buyerId: string;
  reviews: {
    productId: string;
    orderItemId?: string;
    rating: number;
    comment: string;
    images?: string[];
    imageFiles?: File[];
    isAnonymous?: boolean;
  }[];
}

interface CreatePOSOrderInput {
  sellerId: string;
  sellerName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image: string;
    selectedVariantLabel1?: string;
    selectedVariantLabel2?: string;
  }[];
  total: number;
  note?: string;
  buyerEmail?: string;
  paymentMethod?: 'cash' | 'card' | 'ewallet' | 'bank_transfer';
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
    try {
      // 1. Update the main orders table (Shipment Status)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .update({ shipment_status: 'shipped', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select('buyer_id, order_number')
        .single();

      if (orderError) throw new Error(`Failed to update order status: ${orderError.message}`);

      // 2. Update the isolated order_shipments table
      const { error: shipmentError } = await supabase
        .from('order_shipments')
        .update({
          tracking_number: trackingNumber,
          status: 'shipped',
          shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .eq('seller_id', sellerId);

      if (shipmentError) throw new Error(`Failed to save tracking number: ${shipmentError.message}`);

      // 3. Drop an immutable Audit Log
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'shipped',
        note: `Parcel shipped via courier. Tracking: ${trackingNumber}`,
        changed_by: sellerId,
        changed_by_role: 'seller'
      });

      // 4. Trigger Real-time Buyer Notification
      if (orderData?.buyer_id) {
        await notificationService.notifyBuyerOrderShipped({
          buyerId: orderData.buyer_id,
          orderId: orderId,
          orderNumber: orderData.order_number || orderId,
          trackingNumber: trackingNumber
        });
      }

      return true;
    } catch (error) {
      console.error('[Mutation] markOrderShipped error:', error);
      throw error;
    }
  }

  async markOrderDelivered({ orderId, sellerId }: MarkOrderDeliveredInput): Promise<boolean> {
    return orderService.markOrderAsDelivered(orderId, sellerId);
  }

  async confirmOrderReceived({
    orderId,
    buyerId,
    receiptPhotoUrls,
  }: ConfirmOrderReceivedInput): Promise<boolean> {
    try {
      // 1. Update the main orders table
      const updateData: any = { 
        shipment_status: 'received', 
        updated_at: new Date().toISOString() 
      };

      if (receiptPhotoUrls && receiptPhotoUrls.length > 0) {
        updateData.proof_image_url = receiptPhotoUrls[0];
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('buyer_id', buyerId);

      if (orderError) throw new Error(`Failed to confirm delivery: ${orderError.message}`);

      // 2. Update the isolated order_shipments table
      await supabase
        .from('order_shipments')
        .update({ 
          status: 'delivered', 
          delivered_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        })
        .eq('order_id', orderId);

      // 3. Drop Audit Log with embedded JSON metadata for the receipt photos
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'received',
        note: 'Buyer confirmed receipt of delivery.',
        changed_by: buyerId,
        changed_by_role: 'buyer',
        metadata: receiptPhotoUrls && receiptPhotoUrls.length > 0 
          ? { receipt_photos: receiptPhotoUrls } 
          : {}
      });

      return true;
    } catch (error) {
      console.error('[Mutation] confirmOrderReceived error:', error);
      throw error;
    }
  }

  async cancelOrder({
    orderId,
    reason,
    cancelledBy,
    changedByRole,
  }: CancelOrderInput): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return orderService.cancelOrder(orderId, reason, cancelledBy);
    }

    const { data, error } = await supabase.rpc("cancel_order_atomic", {
      p_order_id: orderId,
      p_reason: reason?.trim() || null,
      p_cancelled_by: cancelledBy || null,
      p_changed_by_role: changedByRole || null,
    });

    if (error) {
      console.error("Error cancelling order through RPC:", error);
      throw new Error("Failed to cancel order");
    }

    if (data && changedByRole === "buyer" && cancelledBy) {
      const { data: orderRow, error: orderFetchError } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          buyer_id,
          order_items (
            product:products!order_items_product_id_fkey (
              seller_id
            )
          )
        `,
        )
        .eq("id", orderId)
        .single();

      if (orderFetchError) {
        console.error("Failed to fetch order after buyer cancellation:", orderFetchError);
      } else {
        const sellerId = orderRow.order_items?.find((item: any) => item.product?.seller_id)?.product?.seller_id;

        if (sellerId) {
          const { data: buyerProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", cancelledBy)
            .maybeSingle();

          const buyerName = [buyerProfile?.first_name, buyerProfile?.last_name]
            .filter(Boolean)
            .join(" ");

          void notificationService.notifySellerOrderCancelled({
            sellerId,
            orderId,
            orderNumber: orderRow.order_number || orderId,
            buyerName,
            reason: reason?.trim() || null,
          }).catch((notifyError) => {
            console.error("Failed to notify seller after buyer cancellation:", notifyError);
          });
        }
      }
    }

    return Boolean(data);
  }

  async submitOrderReview({
    orderId,
    buyerId,
    reviews,
  }: SubmitOrderReviewInput): Promise<boolean> {
    return orderService.submitOrderReview(
      orderId,
      buyerId,
      reviews,
    );
  }

  async createPOSOrder({
    sellerId,
    sellerName,
    items,
    total,
    note,
    buyerEmail,
    paymentMethod,
  }: CreatePOSOrderInput): Promise<{
    orderId: string;
    orderNumber: string;
    buyerLinked?: boolean;
  } | null> {
    return orderService.createPOSOrder(
      sellerId,
      sellerName,
      items,
      total,
      note,
      buyerEmail,
      paymentMethod,
    );
  }

  /**
   * Update customer details and/or delivery notes for a POS (OFFLINE) order.
   * Name/email are saved to the order_recipients table (linked via orders.recipient_id).
   * Notes are saved directly to orders.notes.
   */
  async updatePOSOrderCustomer({
    orderId,
    buyerName,
    buyerEmail,
    notes,
  }: {
    orderId: string;
    buyerName?: string;
    buyerEmail?: string;
    notes?: string;
  }): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;

    const updateOrderData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) updateOrderData.notes = notes;

    if (buyerName !== undefined || buyerEmail !== undefined) {
      const { data: orderRow, error: fetchError } = await supabase
        .from("orders")
        .select("recipient_id")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      const nameParts = (buyerName || "").trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || "Walk-in";
      const lastName = nameParts.slice(1).join(" ") || "Customer";

      if (orderRow?.recipient_id) {
        const recipientUpdate: Record<string, unknown> = {};
        if (buyerName !== undefined) {
          recipientUpdate.first_name = firstName;
          recipientUpdate.last_name = lastName;
        }
        if (buyerEmail !== undefined) {
          recipientUpdate.email = buyerEmail || null;
        }

        if (Object.keys(recipientUpdate).length > 0) {
          const { error } = await supabase
            .from("order_recipients")
            .update(recipientUpdate)
            .eq("id", orderRow.recipient_id);
          if (error) throw error;
        }
      } else {
        const { data: newRecipient, error: insertError } = await supabase
          .from("order_recipients")
          .insert({
            first_name: firstName,
            last_name: lastName,
            email: buyerEmail || null,
            phone: null,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        if (newRecipient) updateOrderData.recipient_id = newRecipient.id;
      }
    }

    const { error } = await supabase
      .from("orders")
      .update(updateOrderData)
      .eq("id", orderId);

    if (error) throw error;
    return true;
  }
}

export const orderMutationService = new OrderMutationService();
