import { describe, it, expect } from "vitest";
import {
  mapNormalizedToBuyerUiStatus,
  mapNormalizedToLegacyStatus,
  mapNormalizedToSellerPaymentStatus,
  mapNormalizedToSellerUiStatus,
} from "@/utils/orders/status";

describe("order status mappers", () => {
  it("maps buyer status with reviewed precedence", () => {
    const result = mapNormalizedToBuyerUiStatus("paid", "delivered", false, true);
    expect(result).toBe("reviewed");
  });

  it("maps buyer returned vs cancelled based on cancellation record", () => {
    expect(mapNormalizedToBuyerUiStatus("refunded", "returned", true, false)).toBe("cancelled");
    expect(mapNormalizedToBuyerUiStatus("refunded", "returned", false, false)).toBe("returned");
  });

  it("maps seller ui/payment statuses", () => {
    expect(mapNormalizedToSellerUiStatus("paid", "processing")).toBe("confirmed");
    expect(mapNormalizedToSellerUiStatus("paid", "shipped")).toBe("shipped");
    expect(mapNormalizedToSellerUiStatus("refunded", "returned")).toBe("cancelled");

    expect(mapNormalizedToSellerPaymentStatus("paid")).toBe("paid");
    expect(mapNormalizedToSellerPaymentStatus("refunded")).toBe("refunded");
    expect(mapNormalizedToSellerPaymentStatus("pending_payment")).toBe("pending");
  });

  it("maps normalized statuses back to legacy values", () => {
    expect(mapNormalizedToLegacyStatus("paid", "processing")).toBe("processing");
    expect(mapNormalizedToLegacyStatus("paid", "shipped")).toBe("shipped");
    expect(mapNormalizedToLegacyStatus("refunded", "returned")).toBe("cancelled");
  });
});
