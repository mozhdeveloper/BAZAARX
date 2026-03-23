import type { ShipmentStatus } from "@/types/database.types";
import { TRACKING_STEPS } from "@/data/orders/tracking-steps";

export const getLatestShipment = <T extends Record<string, any>>(
  shipments: T[],
): T | null => {
  if (!Array.isArray(shipments) || shipments.length === 0) return null;

  const sorted = [...shipments].sort((a, b) => {
    const aDate = new Date(a.delivered_at || a.shipped_at || a.created_at || 0).getTime();
    const bDate = new Date(b.delivered_at || b.shipped_at || b.created_at || 0).getTime();
    return bDate - aDate;
  });

  return sorted[0] || null;
};

export const getLatestCancellation = <T extends Record<string, any>>(
  cancellations: T[],
): T | null => {
  if (!Array.isArray(cancellations) || cancellations.length === 0) return null;

  const sorted = [...cancellations].sort((a, b) => {
    const aDate = new Date(a.cancelled_at || a.created_at || 0).getTime();
    const bDate = new Date(b.cancelled_at || b.created_at || 0).getTime();
    return bDate - aDate;
  });

  return sorted[0] || null;
};

const formatTime = (date?: Date | null) => {
  if (!date) return null;
  return date.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
};

export interface TrackingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current?: boolean;
  time: string | null;
  date: Date | null;
}

export const buildTrackingSteps = (
  shipmentStatus: ShipmentStatus,
  createdAt?: Date,
  shippedAt?: Date,
  deliveredAt?: Date,
  trackingNumber?: string | null,
): TrackingStep[] => {
  const isReturned = shipmentStatus === "returned" || shipmentStatus === "failed_to_deliver";

  const allSteps: TrackingStep[] = [];

  // 1. Order Placed (Always completed if we are here)
  allSteps.push({
    id: "placed",
    title: "Order Placed",
    description: "Your order has been successfully placed",
    completed: true,
    time: formatTime(createdAt),
    date: createdAt || null,
  });

  // 2. Map existing tracking steps
  TRACKING_STEPS.forEach((step) => {
    const completed = step.reachedBy.includes(shipmentStatus);
    let dateObj: Date | null = null;
    let description = step.description;

    if (step.id === "confirmed") {
      dateObj = createdAt || null;
    } else if (step.id === "processing") {
      dateObj = createdAt || null;
    } else if (step.id === "shipped") {
      dateObj = shippedAt || createdAt || null;
      if (trackingNumber) {
        description = `Package is on its way (Tracking: ${trackingNumber})`;
      }
    } else if (step.id === "delivered") {
      dateObj = deliveredAt || null;
      if (isReturned) {
        description = "Delivery was unsuccessful or the package was returned";
      }
    }

    allSteps.push({
      id: step.id,
      title: step.id === "delivered" && isReturned ? "Delivery Update" : step.title,
      description,
      completed,
      current:
        (step.id === "shipped" && (shipmentStatus === "shipped" || shipmentStatus === "out_for_delivery")) ||
        (step.id === "processing" && (shipmentStatus === "processing" || shipmentStatus === "ready_to_ship")),
      time: completed ? formatTime(dateObj) : null,
      date: completed ? dateObj : null,
    });
  });

  return allSteps;
};
