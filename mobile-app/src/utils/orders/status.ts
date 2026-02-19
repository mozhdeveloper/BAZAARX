import type { PaymentStatus, ShipmentStatus } from '@/types/database.types';
import type { SellerPaymentUiStatus, SellerUiStatus } from '@/types/orders';

export const mapNormalizedToSellerUiStatus = (
  paymentStatus?: PaymentStatus | null,
  shipmentStatus?: ShipmentStatus | null,
): SellerUiStatus => {
  if (shipmentStatus === 'delivered' || shipmentStatus === 'received') {
    return 'completed';
  }

  if (shipmentStatus === 'shipped' || shipmentStatus === 'out_for_delivery') {
    return 'shipped';
  }

  if (shipmentStatus === 'processing' || shipmentStatus === 'ready_to_ship') {
    return 'to-ship';
  }

  if (shipmentStatus === 'returned' || shipmentStatus === 'failed_to_deliver') {
    return 'cancelled';
  }

  if (paymentStatus === 'refunded' || paymentStatus === 'partially_refunded') {
    return 'cancelled';
  }

  return 'pending';
};

export const mapNormalizedToSellerPaymentStatus = (
  paymentStatus?: PaymentStatus | null,
): SellerPaymentUiStatus => {
  if (paymentStatus === 'paid') return 'paid';
  if (paymentStatus === 'refunded' || paymentStatus === 'partially_refunded') {
    return 'refunded';
  }
  return 'pending';
};

export const mapSellerUiToNormalizedStatus = (status: SellerUiStatus): string => {
  const statusMap: Record<SellerUiStatus, string> = {
    pending: 'waiting_for_seller',
    'to-ship': 'processing',
    shipped: 'shipped',
    completed: 'delivered',
    cancelled: 'cancelled',
  };

  return statusMap[status];
};
