import type { PaymentStatus, ShipmentStatus } from "@/types/database.types";
import type { OrderUiStatus, SellerOrderSnapshot } from "@/types/orders";

export const mapNormalizedToLegacyStatus = (
  paymentStatus?: PaymentStatus | null,
  shipmentStatus?: ShipmentStatus | null,
): string => {
  if (shipmentStatus === "delivered" || shipmentStatus === "received") {
    return "delivered";
  }
  if (shipmentStatus === "shipped" || shipmentStatus === "out_for_delivery") {
    return "shipped";
  }
  if (shipmentStatus === "processing" || shipmentStatus === "ready_to_ship") {
    return "processing";
  }
  if (shipmentStatus === "returned" || shipmentStatus === "failed_to_deliver") {
    return "cancelled";
  }
  if (paymentStatus === "refunded" || paymentStatus === "partially_refunded") {
    return "cancelled";
  }
  return "pending_payment";
};

export const mapNormalizedToBuyerUiStatus = (
  paymentStatus?: PaymentStatus | null,
  shipmentStatus?: ShipmentStatus | null,
  hasCancellationRecord?: boolean,
  isReviewed?: boolean,
): OrderUiStatus => {
  if (isReviewed) {
    return "reviewed";
  }

  if (shipmentStatus === "delivered" || shipmentStatus === "received") {
    return "delivered";
  }

  if (shipmentStatus === "shipped" || shipmentStatus === "out_for_delivery") {
    return "shipped";
  }

  if (shipmentStatus === "processing" || shipmentStatus === "ready_to_ship") {
    return "confirmed";
  }

  if (shipmentStatus === "failed_to_deliver") {
    return "cancelled";
  }

  if (shipmentStatus === "returned") {
    return hasCancellationRecord ? "cancelled" : "returned";
  }

  if (paymentStatus === "refunded" || paymentStatus === "partially_refunded") {
    return hasCancellationRecord ? "cancelled" : "returned";
  }

  return "pending";
};

export const mapNormalizedToSellerUiStatus = (
  paymentStatus?: PaymentStatus | null,
  shipmentStatus?: ShipmentStatus | null,
): SellerOrderSnapshot["status"] => {
  if (shipmentStatus === "delivered" || shipmentStatus === "received") {
    return "delivered";
  }
  if (shipmentStatus === "shipped" || shipmentStatus === "out_for_delivery") {
    return "shipped";
  }
  if (shipmentStatus === "processing" || shipmentStatus === "ready_to_ship") {
    return "confirmed";
  }
  if (shipmentStatus === "returned" || shipmentStatus === "failed_to_deliver") {
    return "cancelled";
  }
  if (paymentStatus === "refunded" || paymentStatus === "partially_refunded") {
    return "cancelled";
  }
  return "pending";
};

export const mapNormalizedToSellerPaymentStatus = (
  paymentStatus?: PaymentStatus | null,
): SellerOrderSnapshot["paymentStatus"] => {
  if (paymentStatus === "paid") return "paid";
  if (paymentStatus === "refunded" || paymentStatus === "partially_refunded") {
    return "refunded";
  }
  return "pending";
};
