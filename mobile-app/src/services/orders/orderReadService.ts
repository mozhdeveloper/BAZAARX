import { orderService } from '@/services/orderService';
import { supabase } from '@/lib/supabase';
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

  async getReceiptPhotos(orderId: string): Promise<string[]> {
    const { data } = await supabase
      .from('order_status_history')
      .select('metadata')
      .eq('order_id', orderId)
      .eq('status', 'received')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) return [];
    const metadata = data[0].metadata as Record<string, unknown> | null;
    return (metadata?.receipt_photos as string[]) || [];
  }
}

export const orderReadService = new OrderReadService();
