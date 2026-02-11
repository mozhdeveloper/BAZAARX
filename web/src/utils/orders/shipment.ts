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
}

export const buildTrackingSteps = (
  shipmentStatus: ShipmentStatus,
  createdAt?: Date,
  shippedAt?: Date,
  deliveredAt?: Date,
  trackingNumber?: string | null,
): TrackingStep[] => {
  const isReturned = shipmentStatus === "returned" || shipmentStatus === "failed_to_deliver";

  return TRACKING_STEPS.map((step) => {
    const completed = step.reachedBy.includes(shipmentStatus);

    if (step.id === "shipped") {
      return {
        id: step.id,
        title: step.title,
        description: trackingNumber
          ? `Package is on its way (Tracking: ${trackingNumber})`
          : step.description,
        completed,
        current: shipmentStatus === "shipped" || shipmentStatus === "out_for_delivery",
        time: completed ? formatTime(shippedAt || createdAt) : null,
      };
    }

    if (step.id === "delivered") {
      return {
        id: step.id,
        title: isReturned ? "Delivery Update" : step.title,
        description: isReturned
          ? "Delivery was unsuccessful or the package was returned"
          : step.description,
        completed,
        time: completed ? formatTime(deliveredAt) : null,
      };
    }

    return {
      id: step.id,
      title: step.title,
      description: step.description,
      completed,
      current:
        step.id === "processing" &&
        (shipmentStatus === "processing" || shipmentStatus === "ready_to_ship"),
      time: completed ? formatTime(createdAt) : null,
    };
  });
};
