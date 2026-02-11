import type { PaymentStatus, ShipmentStatus } from "@/types/database.types";
import type { OrderUiStatus } from "@/types/orders";

export const LEGACY_STATUS_MAP: Record<
  string,
  { payment_status: PaymentStatus; shipment_status: ShipmentStatus }
> = {
  pending_payment: {
    payment_status: "pending_payment",
    shipment_status: "waiting_for_seller",
  },
  payment_failed: {
    payment_status: "pending_payment",
    shipment_status: "waiting_for_seller",
  },
  paid: { payment_status: "paid", shipment_status: "processing" },
  processing: { payment_status: "paid", shipment_status: "processing" },
  ready_to_ship: { payment_status: "paid", shipment_status: "ready_to_ship" },
  shipped: { payment_status: "paid", shipment_status: "shipped" },
  out_for_delivery: {
    payment_status: "paid",
    shipment_status: "out_for_delivery",
  },
  delivered: { payment_status: "paid", shipment_status: "delivered" },
  failed_delivery: {
    payment_status: "paid",
    shipment_status: "failed_to_deliver",
  },
  cancelled: { payment_status: "refunded", shipment_status: "returned" },
  refunded: { payment_status: "refunded", shipment_status: "returned" },
  completed: { payment_status: "paid", shipment_status: "received" },
};

export const BUYER_STATUS_LABEL: Record<OrderUiStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  reviewed: "Reviewed",
};
