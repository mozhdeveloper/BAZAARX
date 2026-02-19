import type { PaymentStatus, ShipmentStatus } from '@/types/database.types';
import type { BuyerUiStatus, SellerPaymentUiStatus, SellerUiStatus } from '@/types/orders';

export const mapNormalizedToBuyerUiStatus = (
  paymentStatus?: PaymentStatus | null,
  shipmentStatus?: ShipmentStatus | null,
  hasCancellationRecord?: boolean,
  isReviewed?: boolean,
): BuyerUiStatus => {
  if (isReviewed) {
    return 'reviewed';
  }

  if (shipmentStatus === 'delivered' || shipmentStatus === 'received') {
    return 'delivered';
  }

  if (shipmentStatus === 'shipped' || shipmentStatus === 'out_for_delivery') {
    return 'shipped';
  }

  if (shipmentStatus === 'processing' || shipmentStatus === 'ready_to_ship') {
    return 'confirmed';
  }

  if (shipmentStatus === 'failed_to_deliver') {
    return 'cancelled';
  }

  if (shipmentStatus === 'returned') {
    return hasCancellationRecord ? 'cancelled' : 'returned';
  }

  if (paymentStatus === 'refunded' || paymentStatus === 'partially_refunded') {
    return hasCancellationRecord ? 'cancelled' : 'returned';
  }

  return 'pending';
};

export const mapNormalizedToSellerUiStatus = (
  paymentStatus?: PaymentStatus | null,
  shipmentStatus?: ShipmentStatus | null,
): SellerUiStatus => {
  if (shipmentStatus === 'delivered' || shipmentStatus === 'received') {
    return 'delivered';
  }

  if (shipmentStatus === 'shipped' || shipmentStatus === 'out_for_delivery') {
    return 'shipped';
  }

  if (shipmentStatus === 'processing' || shipmentStatus === 'ready_to_ship') {
    return 'confirmed';
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
    confirmed: 'processing',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled',
  };

  return statusMap[status];
};
