import { orderService } from '@/services/orderService';
import type { CreatePOSOrderInput, POSOrderCreateResult } from '@/types/orders';

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

  async cancelOrder({ orderId, reason, cancelledBy }: CancelOrderInput): Promise<boolean> {
    return orderService.cancelOrder(orderId, reason, cancelledBy);
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
}

export const orderMutationService = new OrderMutationService();
