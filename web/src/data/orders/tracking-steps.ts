import type { ShipmentStatus } from "@/types/database.types";

export interface TrackingStepDefinition {
  id: "confirmed" | "processing" | "shipped" | "delivered";
  title: string;
  description: string;
  reachedBy: ShipmentStatus[];
}

export const TRACKING_STEPS: TrackingStepDefinition[] = [
  {
    id: "confirmed",
    title: "Order Confirmed",
    description: "Your order has been confirmed and is being prepared",
    reachedBy: [
      "waiting_for_seller",
      "processing",
      "ready_to_ship",
      "shipped",
      "out_for_delivery",
      "delivered",
      "failed_to_deliver",
      "received",
      "returned",
    ],
  },
  {
    id: "processing",
    title: "Order Processing",
    description: "Your items are being prepared for shipment",
    reachedBy: [
      "processing",
      "ready_to_ship",
      "shipped",
      "out_for_delivery",
      "delivered",
      "failed_to_deliver",
      "received",
      "returned",
    ],
  },
  {
    id: "shipped",
    title: "Order Shipped",
    description: "Package is on its way",
    reachedBy: [
      "shipped",
      "out_for_delivery",
      "delivered",
      "failed_to_deliver",
      "received",
      "returned",
    ],
  },
  {
    id: "delivered",
    title: "Package Delivered",
    description: "Your order has been successfully delivered",
    reachedBy: ["delivered", "received"],
  },
];
