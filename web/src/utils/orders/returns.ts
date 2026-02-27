import type { ReturnRequest } from "@/services/returnService";
import type { BuyerOrderSnapshot } from "@/types/orders";

const RETURN_REASON_SEPARATOR = /\s+-\s+/;
const RETURN_WINDOW_DAYS = 7;

export interface BuyerReturnSubmissionPayload {
  localOrderId: string;
  orderDbId?: string;
  reason: string;
  solution: string;
  comments: string;
  files: File[];
  refundAmount: number;
}

export const validateBuyerReturnSubmissionPayload = (
  payload: Partial<BuyerReturnSubmissionPayload>,
): string | null => {
  if (!payload.localOrderId) {
    return "Unable to identify the selected order. Please refresh and try again.";
  }

  if (!payload.orderDbId) {
    return "This order is missing its database ID. Please refresh your orders and try again.";
  }

  return null;
};

export const splitPersistedReturnReason = (
  value: string | null | undefined,
): { reason: string; comments: string } => {
  if (!value) {
    return { reason: "Return requested", comments: "" };
  }

  const parts = value.split(RETURN_REASON_SEPARATOR);
  if (parts.length <= 1) {
    return { reason: value, comments: "" };
  }

  const reason = parts.shift() || "Return requested";
  return {
    reason,
    comments: parts.join(" - ").trim(),
  };
};

export const mapDbReturnRequestToBuyerReturnRequest = (
  request: ReturnRequest,
  fallbackRefundAmount: number,
): NonNullable<BuyerOrderSnapshot["returnRequest"]> => {
  const { reason, comments } = splitPersistedReturnReason(request.returnReason);

  let status: 'pending' | 'approved' | 'rejected' = 'pending';
  if (request.refundDate) {
    status = 'approved';
  } else if (request.isReturnable === false) {
    status = 'rejected';
  }

  return {
    reason,
    solution: "return_refund",
    comments,
    files: [],
    refundAmount: request.refundAmount ?? fallbackRefundAmount,
    submittedAt: new Date(request.createdAt),
    status,
  };
};

export const mergeBuyerOrdersWithReturnRequests = (
  orders: BuyerOrderSnapshot[],
  returnRequests: ReturnRequest[],
): BuyerOrderSnapshot[] => {
  if (returnRequests.length === 0) {
    return orders;
  }

  const byOrderId = new Map(returnRequests.map((request) => [request.orderId, request]));

  return orders.map((order) => {
    const request = byOrderId.get(order.dbId);
    if (!request) {
      return order;
    }

    return {
      ...order,
      returnRequest: mapDbReturnRequestToBuyerReturnRequest(request, order.total),
    };
  });
};

export const isBuyerOrderWithinReturnWindow = (
  order: Pick<BuyerOrderSnapshot, "shipmentStatus" | "deliveryDate" | "deliveredAt" | "createdAt">,
  now: Date = new Date(),
): boolean => {
  if (order.shipmentStatus !== "delivered" && order.shipmentStatus !== "received") {
    return false;
  }

  const referenceDate = order.deliveryDate || order.deliveredAt || order.createdAt;
  if (!(referenceDate instanceof Date) || Number.isNaN(referenceDate.getTime())) {
    return false;
  }

  const elapsedDays = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  return elapsedDays >= 0 && elapsedDays <= RETURN_WINDOW_DAYS;
};
