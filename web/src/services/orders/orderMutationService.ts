import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { orderService } from "@/services/orderService";

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
    return orderService.markOrderAsShipped(orderId, trackingNumber, sellerId);
  }

  async markOrderDelivered({
    orderId,
    sellerId,
  }: MarkOrderDeliveredInput): Promise<boolean> {
    return orderService.markOrderAsDelivered(orderId, sellerId);
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
}

export const orderMutationService = new OrderMutationService();
