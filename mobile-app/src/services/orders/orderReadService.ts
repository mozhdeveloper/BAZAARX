import { orderService } from '@/services/orderService';
import type { OrderTrackingSnapshot, SellerOrderSnapshot } from '@/types/orders';
import { mapOrderRowToSellerSnapshot, mapTrackingRowToSnapshot } from '@/utils/orders/mappers';

interface GetSellerOrdersInput {
  sellerId: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

interface GetOrderTrackingInput {
  orderIdOrNumber: string;
  buyerId?: string;
}

class OrderReadService {
  async getSellerOrders({
    sellerId,
    startDate,
    endDate,
  }: GetSellerOrdersInput): Promise<SellerOrderSnapshot[]> {
    const rows = await orderService.getSellerOrders(sellerId, startDate, endDate);
    return (rows || []).map((row: any) => mapOrderRowToSellerSnapshot(row));
  }

  async getOrderTracking({
    orderIdOrNumber,
    buyerId,
  }: GetOrderTrackingInput): Promise<OrderTrackingSnapshot | null> {
    const snapshot = await orderService.getOrderTrackingSnapshot(orderIdOrNumber, buyerId);
    return mapTrackingRowToSnapshot(snapshot);
  }
}

export const orderReadService = new OrderReadService();
