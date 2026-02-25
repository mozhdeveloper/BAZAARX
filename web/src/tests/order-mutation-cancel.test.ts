import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { orderService } from "@/services/orderService";
import { orderMutationService } from "@/services/orders/orderMutationService";

describe("orderMutationService.cancelOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls cancel_order_atomic RPC when supabase is configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as any);

    const result = await orderMutationService.cancelOrder({
      orderId: "00000000-0000-0000-0000-000000000001",
      reason: "Changed my mind",
      cancelledBy: "00000000-0000-0000-0000-000000000002",
      changedByRole: "buyer",
    });

    expect(result).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith("cancel_order_atomic", {
      p_order_id: "00000000-0000-0000-0000-000000000001",
      p_reason: "Changed my mind",
      p_cancelled_by: "00000000-0000-0000-0000-000000000002",
      p_changed_by_role: "buyer",
    });
  });

  it("falls back to legacy service when supabase is not configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const cancelSpy = vi.spyOn(orderService, "cancelOrder").mockResolvedValue(true);

    const result = await orderMutationService.cancelOrder({
      orderId: "order-legacy",
      reason: "Other",
      cancelledBy: "user-1",
      changedByRole: "buyer",
    });

    expect(result).toBe(true);
    expect(cancelSpy).toHaveBeenCalledWith("order-legacy", "Other", "user-1");
  });
});
