/**
 * Return & Refund Service v2
 * Handles all return/refund database operations for buyers and sellers.
 * Supports 3 resolution paths, counter-offers, escalation, and return shipping.
 */
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { notificationService } from "./notificationService";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ORDER_ID_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RETURN_WINDOW_DAYS = 7;
const SELLER_DEADLINE_HOURS = 48;

// ---------------------------------------------------------------------------
// Enums / literal unions
// ---------------------------------------------------------------------------
export type ReturnStatus =
  | "pending"
  | "seller_review"
  | "counter_offered"
  | "approved"
  | "rejected"
  | "escalated"
  | "return_in_transit"
  | "return_received"
  | "refunded";

export type ReturnReason =
  | "damaged"
  | "wrong_item"
  | "not_as_described"
  | "defective"
  | "missing_parts"
  | "changed_mind"
  | "duplicate_order"
  | "other";

export type ReturnType = "return_refund" | "refund_only" | "replacement";

export type ResolutionPath = "instant" | "seller_review" | "return_required";

export const EVIDENCE_REQUIRED_REASONS: ReturnReason[] = [
  "damaged",
  "wrong_item",
  "not_as_described",
  "defective",
  "missing_parts",
];

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image?: string | null;
  reason?: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber?: string;
  buyerId?: string;
  buyerName?: string;
  buyerEmail?: string;
  isReturnable: boolean;
  returnWindowDays: number;
  returnReason: string | null;
  refundAmount: number | null;
  refundDate: string | null;
  createdAt: string;
  items?: Array<{
    productName: string;
    quantity: number;
    price: number;
    image: string | null;
  }>;
  orderStatus?: string;
  paymentStatus?: string;
  // --- v2 fields ---
  status: ReturnStatus;
  returnType: ReturnType | null;
  resolutionPath: ResolutionPath | null;
  itemsJson: ReturnItem[] | null;
  evidenceUrls: string[] | null;
  description: string | null;
  sellerNote: string | null;
  rejectedReason: string | null;
  counterOfferAmount: number | null;
  sellerDeadline: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  returnLabelUrl: string | null;
  returnTrackingNumber: string | null;
  buyerShippedAt: string | null;
  returnReceivedAt: string | null;
}

export interface SubmitReturnRequestParams {
  orderDbId?: string;
  /** @deprecated Use orderDbId */
  orderId?: string;
  reason: ReturnReason;
  returnType?: ReturnType;
  description?: string;
  refundAmount?: number;
  items?: ReturnItem[];
  evidenceUrls?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function computeResolutionPath(
  reason: ReturnReason,
  amount: number,
  hasEvidence: boolean,
): ResolutionPath {
  const instantReasons: ReturnReason[] = ["wrong_item", "not_as_described", "missing_parts"];
  if (amount < 500 && instantReasons.includes(reason) && hasEvidence) return "instant";
  if (amount >= 2000) return "return_required";
  return "seller_review";
}

export function getStatusLabel(status: ReturnStatus): string {
  const map: Record<ReturnStatus, string> = {
    pending: "Pending",
    seller_review: "Under Seller Review",
    counter_offered: "Counter Offer Sent",
    approved: "Approved",
    rejected: "Rejected",
    escalated: "Escalated to Admin",
    return_in_transit: "Return In Transit",
    return_received: "Return Received",
    refunded: "Refunded",
  };
  return map[status] || status;
}

export function getStatusColor(status: ReturnStatus): string {
  const map: Record<ReturnStatus, string> = {
    pending: "yellow",
    seller_review: "blue",
    counter_offered: "orange",
    approved: "green",
    rejected: "red",
    escalated: "purple",
    return_in_transit: "indigo",
    return_received: "teal",
    refunded: "green",
  };
  return map[status] || "gray";
}

class ReturnService {
  private isUuid(value: string): boolean {
    return ORDER_ID_UUID_REGEX.test(value);
  }

  private resolveOrderDbId(params: SubmitReturnRequestParams): string {
    const candidate = params.orderDbId || params.orderId;
    if (!candidate) {
      throw new Error("Order reference is missing. Please refresh your orders and try again.");
    }
    if (params.orderId && !params.orderDbId) {
      console.warn("[ReturnService] submitReturnRequest(orderId) is deprecated. Use orderDbId.");
    }
    if (!this.isUuid(candidate)) {
      throw new Error("Invalid order reference. Please refresh your orders and try again.");
    }
    return candidate;
  }

  private resolveReturnDeadline(order: {
    created_at: string;
    shipments?: Array<{ delivered_at?: string | null; created_at?: string | null }>;
  }): Date {
    const shipments = Array.isArray(order.shipments) ? order.shipments : [];
    const deliveredTimestamp = shipments
      .map((s) => s?.delivered_at)
      .filter((v): v is string => Boolean(v))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    const shipmentCreatedTimestamp = shipments
      .map((s) => s?.created_at)
      .filter((v): v is string => Boolean(v))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    const baselineDate = new Date(deliveredTimestamp || shipmentCreatedTimestamp || order.created_at);
    const deadline = new Date(baselineDate);
    deadline.setDate(deadline.getDate() + RETURN_WINDOW_DAYS);
    return deadline;
  }

  /** Transform a DB row into a ReturnRequest. */
  private transform(row: any, orderObj?: any): ReturnRequest {
    const order = orderObj || row.order;
    let parsedItems: ReturnItem[] | null = null;
    if (row.items_json) {
      try {
        parsedItems = typeof row.items_json === "string" ? JSON.parse(row.items_json) : row.items_json;
      } catch {
        parsedItems = null;
      }
    }
    const parseNum = (v: any) => (v != null ? parseFloat(String(v)) : null);

    // Derive status: prefer the new column, fall back to old-style inference
    let status: ReturnStatus = (row.status as ReturnStatus) || "pending";
    if (!row.status) {
      if (row.refund_date) status = "refunded";
      else if (row.payment_status === "refunded" || order?.payment_status === "refunded") status = "refunded";
      else if (!row.is_returnable) status = "rejected";
      else status = "pending";
    }

    return {
      id: row.id,
      orderId: row.order_id,
      orderNumber: order?.order_number,
      buyerId: order?.buyer_id,
      buyerName: undefined,
      buyerEmail: undefined,
      isReturnable: row.is_returnable,
      returnWindowDays: row.return_window_days,
      returnReason: row.return_reason,
      refundAmount: parseNum(row.refund_amount),
      refundDate: row.refund_date,
      createdAt: row.created_at,
      items: (order?.order_items || []).map((item: any) => ({
        productName: item.product_name,
        quantity: item.quantity,
        price: parseFloat(String(item.price)),
        image: item.primary_image_url,
      })),
      orderStatus: order?.shipment_status,
      paymentStatus: order?.payment_status,
      // v2 fields
      status,
      returnType: row.return_type || null,
      resolutionPath: row.resolution_path || null,
      itemsJson: parsedItems,
      evidenceUrls: row.evidence_urls || null,
      description: row.description || null,
      sellerNote: row.seller_note || null,
      rejectedReason: row.rejected_reason || null,
      counterOfferAmount: parseNum(row.counter_offer_amount),
      sellerDeadline: row.seller_deadline || null,
      escalatedAt: row.escalated_at || null,
      resolvedAt: row.resolved_at || null,
      resolvedBy: row.resolved_by || null,
      returnLabelUrl: row.return_label_url || null,
      returnTrackingNumber: row.return_tracking_number || null,
      buyerShippedAt: row.buyer_shipped_at || null,
      returnReceivedAt: row.return_received_at || null,
    };
  }

  // ============================================================================
  // BUYER: Upload Evidence
  // ============================================================================

  async uploadEvidence(orderId: string, files: File[]): Promise<string[]> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `returns/${orderId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("return-evidence").upload(path, file);
      if (error) {
        console.error("Evidence upload failed:", error);
        continue;
      }
      const { data: urlData } = supabase.storage.from("return-evidence").getPublicUrl(path);
      if (urlData?.publicUrl) urls.push(urlData.publicUrl);
    }
    return urls;
  }

  // ============================================================================
  // BUYER: Submit Return Request (v2)
  // ============================================================================

  async submitReturnRequest(params: SubmitReturnRequestParams): Promise<ReturnRequest> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");

    try {
      const orderDbId = this.resolveOrderDbId(params);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          id, shipment_status, payment_status, created_at,
          shipments:order_shipments(delivered_at, created_at)
        `)
        .eq("id", orderDbId)
        .single();

      if (orderError || !order) throw new Error("Order not found");

      if (order.shipment_status !== "delivered" && order.shipment_status !== "received") {
        throw new Error("Only delivered or received orders can be returned");
      }

      const returnDeadline = this.resolveReturnDeadline(order);
      if (new Date() > returnDeadline) {
        throw new Error("Return window has expired (7 days from delivery)");
      }

      const { data: existing } = await supabase
        .from("refund_return_periods")
        .select("id")
        .eq("order_id", orderDbId)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error("A return request already exists for this order");
      }

      const amount = params.refundAmount || 0;
      const hasEvidence = (params.evidenceUrls?.length ?? 0) > 0;
      const resolutionPath = computeResolutionPath(params.reason, amount, hasEvidence);

      const sellerDeadline = new Date();
      sellerDeadline.setHours(sellerDeadline.getHours() + SELLER_DEADLINE_HOURS);

      const isInstant = resolutionPath === "instant";

      const insertPayload: Record<string, any> = {
        order_id: orderDbId,
        is_returnable: true,
        return_window_days: RETURN_WINDOW_DAYS,
        return_reason: params.reason + (params.description ? ` - ${params.description}` : ""),
        refund_amount: params.refundAmount || null,
        status: isInstant ? "approved" : "seller_review",
        return_type: params.returnType || "refund_only",
        resolution_path: resolutionPath,
        description: params.description || null,
        items_json: params.items ? JSON.stringify(params.items) : null,
        evidence_urls: params.evidenceUrls || null,
        seller_deadline: isInstant ? null : sellerDeadline.toISOString(),
      };

      if (isInstant) {
        insertPayload.refund_date = new Date().toISOString();
        insertPayload.resolved_at = new Date().toISOString();
        insertPayload.resolved_by = "system";
      }

      const { data: returnData, error: returnError } = await supabase
        .from("refund_return_periods")
        .insert(insertPayload)
        .select()
        .single();

      if (returnError) throw returnError;

      // Update order
      const orderUpdate: Record<string, any> = {
        shipment_status: "returned",
        updated_at: new Date().toISOString(),
      };
      if (isInstant) orderUpdate.payment_status = "refunded";

      await supabase.from("orders").update(orderUpdate).eq("id", orderDbId);

      await supabase.from("order_status_history").insert({
        order_id: orderDbId,
        status: isInstant ? "refund_approved" : "return_requested",
        note: isInstant
          ? `Instant refund approved (${resolutionPath})`
          : `Return submitted – ${resolutionPath}`,
        changed_by_role: isInstant ? "system" : "buyer",
      });

      // Notify the seller(s) of the return request (non-blocking)
      if (!isInstant) {
        try {
          const { data: orderDetails } = await supabase
            .from("orders")
            .select(`
              buyer:buyer_id(profiles:id(first_name, last_name)),
              order_items(product:products(seller_id))
            `)
            .eq("id", orderDbId)
            .single();

          const sellerIds = [
            ...new Set(
              ((orderDetails as any)?.order_items || [])
                .map((item: any) => item.product?.seller_id)
                .filter(Boolean) as string[]
            ),
          ];

          const buyerProfile = (orderDetails as any)?.buyer?.profiles;
          const buyerName = buyerProfile
            ? `${buyerProfile.first_name || ""} ${buyerProfile.last_name || ""}`.trim() || "A buyer"
            : "A buyer";

          for (const sellerId of sellerIds) {
            await notificationService.notifySellerReturnRequest({
              sellerId,
              buyerName,
              orderId: orderDbId,
              returnId: returnData.id,
              orderNumber: (orderDetails as any)?.order_number ?? "N/A",
              reason: params.reason,
            });
          }
        } catch (err) {
          console.warn("[ReturnService] Failed to send return notification:", err);
        }
      }

      return this.transform(returnData);
    } catch (error: any) {
      console.error("Failed to submit return request:", error);
      throw new Error(error.message || "Failed to submit return request");
    }
  }

  // ============================================================================
  // BUYER: Get Return Requests
  // ============================================================================

  async getReturnRequestsByBuyer(buyerId: string): Promise<ReturnRequest[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("refund_return_periods")
        .select(`
          *,
          order:orders!inner(
            id, order_number, buyer_id, shipment_status, payment_status,
            order_items(product_name, quantity, price, primary_image_url)
          )
        `)
        .eq("order.buyer_id", buyerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((row: any) => this.transform(row));
    } catch (error) {
      console.error("Failed to get buyer return requests:", error);
      return [];
    }
  }

  // ============================================================================
  // BUYER: Get Single Return
  // ============================================================================

  async getReturnRequestById(returnId: string): Promise<ReturnRequest | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from("refund_return_periods")
        .select(`
          *,
          order:orders(
            id, order_number, buyer_id, shipment_status, payment_status,
            order_items(product_name, quantity, price, primary_image_url)
          )
        `)
        .eq("id", returnId)
        .single();
      if (error || !data) return null;
      return this.transform(data);
    } catch {
      return null;
    }
  }

  // ============================================================================
  // SELLER: Get Return Requests for My Products
  // ============================================================================

  async getReturnRequestsBySeller(sellerId: string): Promise<ReturnRequest[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("refund_return_periods")
        .select(`
          *,
          order:orders!inner(
            id, order_number, buyer_id, shipment_status, payment_status,
            buyer:buyers(id, profiles(first_name, last_name, email)),
            order_items!inner(product_name, quantity, price, primary_image_url, product:products(seller_id))
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || [])
        .filter((row: any) => {
          const items = row.order?.order_items || [];
          return items.some((item: any) => item.product?.seller_id === sellerId);
        })
        .map((row: any) => {
          const buyer = row.order?.buyer;
          const buyerProfile = buyer?.profiles;
          const buyerName = buyerProfile
            ? `${buyerProfile.first_name || ""} ${buyerProfile.last_name || ""}`.trim()
            : "Unknown";

          const req = this.transform(row);
          req.buyerName = buyerName;
          req.buyerEmail = buyerProfile?.email || "";

          // Filter items to seller's only
          const sellerItems = (row.order?.order_items || []).filter(
            (item: any) => item.product?.seller_id === sellerId,
          );
          req.items = sellerItems.map((item: any) => ({
            productName: item.product_name,
            quantity: item.quantity,
            price: parseFloat(String(item.price)),
            image: item.primary_image_url,
          }));

          return req;
        });

      // Deduplicate: order_items!inner join produces one row per item,
      // so the same return can appear multiple times when an order has multiple items
      const seen = new Set<string>();
      return mapped.filter((req) => {
        if (seen.has(req.id)) return false;
        seen.add(req.id);
        return true;
      });
    } catch (error) {
      console.error("Failed to get seller return requests:", error);
      return [];
    }
  }

  // ============================================================================
  // SELLER: Approve Return
  // ============================================================================

  async approveReturn(returnId: string, orderId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
    try {
      const now = new Date().toISOString();
      const { error: refundError } = await supabase
        .from("refund_return_periods")
        .update({
          status: "approved",
          refund_date: now,
          resolved_at: now,
          resolved_by: "seller",
        })
        .eq("id", returnId);
      if (refundError) throw refundError;

      await supabase
        .from("orders")
        .update({ payment_status: "refunded", updated_at: now })
        .eq("id", orderId);

      await supabase.from("order_status_history").insert({
        order_id: orderId,
        status: "refund_approved",
        note: "Return approved and refund processed",
        changed_by_role: "seller",
      });

      // Notify Buyer
      await this.notifyBuyerOfReturnUpdate(orderId, "approved");
    } catch (error: any) {
      console.error("Failed to approve return:", error);
      throw new Error(error.message || "Failed to approve return");
    }
  }

  // ============================================================================
  // SELLER: Reject Return
  // ============================================================================

  async rejectReturn(returnId: string, orderId: string, reason?: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
    try {
      const { error: refundError } = await supabase
        .from("refund_return_periods")
        .update({
          status: "rejected",
          is_returnable: false,
          rejected_reason: reason || null,
          resolved_at: new Date().toISOString(),
          resolved_by: "seller",
        })
        .eq("id", returnId);
      if (refundError) throw refundError;

      await supabase
        .from("orders")
        .update({ shipment_status: "received", updated_at: new Date().toISOString() })
        .eq("id", orderId);

      await supabase.from("order_status_history").insert({
        order_id: orderId,
        status: "return_rejected",
        note: reason || "Return request rejected by seller",
        changed_by_role: "seller",
      });

      // Notify Buyer
      await this.notifyBuyerOfReturnUpdate(orderId, "rejected", reason);
    } catch (error: any) {
      console.error("Failed to reject return:", error);
      throw new Error(error.message || "Failed to reject return");
    }
  }

  // ============================================================================
  // SELLER: Counter-Offer
  // ============================================================================

  async counterOfferReturn(returnId: string, amount: number, note: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
    const { error } = await supabase
      .from("refund_return_periods")
      .update({
        status: "counter_offered",
        counter_offer_amount: amount,
        seller_note: note,
      })
      .eq("id", returnId);
    if (error) throw new Error(error.message || "Failed to send counter offer");

    // Notifications
    const { data: ret } = await supabase
      .from("refund_return_periods")
      .select("order_id")
      .eq("id", returnId)
      .single();

    if (ret?.order_id) {
      await supabase.from("order_status_history").insert({
        order_id: ret.order_id,
        status: "counter_offer_sent",
        note: `Counter-offer: ₱${amount.toLocaleString()} — ${note}`,
        changed_by_role: "seller",
      });

      // Notify Buyer
      await this.notifyBuyerOfReturnUpdate(ret.order_id, "counter_offered");
    }
  }

  // ============================================================================
  // BUYER: Accept / Decline Counter-Offer
  // ============================================================================

  async acceptCounterOffer(returnId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
    const { data: ret } = await supabase
      .from("refund_return_periods")
      .select("counter_offer_amount, order_id")
      .eq("id", returnId)
      .single();

    const now = new Date().toISOString();
    await supabase
      .from("refund_return_periods")
      .update({
        status: "approved",
        refund_amount: ret?.counter_offer_amount,
        refund_date: now,
        resolved_at: now,
        resolved_by: "buyer",
      })
      .eq("id", returnId);

    if (ret?.order_id) {
      await supabase
        .from("orders")
        .update({ payment_status: "partially_refunded", updated_at: now })
        .eq("id", ret.order_id);
    }
  }

  async declineCounterOffer(returnId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
    await supabase
      .from("refund_return_periods")
      .update({ status: "escalated", escalated_at: new Date().toISOString() })
      .eq("id", returnId);
  }

  // ============================================================================
  // ESCALATION
  // ============================================================================

  async escalateReturn(returnId: string, reason?: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
    const { data: ret } = await supabase
      .from("refund_return_periods")
      .select("order_id")
      .eq("id", returnId)
      .single();

    await supabase
      .from("refund_return_periods")
      .update({ status: "escalated", escalated_at: new Date().toISOString() })
      .eq("id", returnId);

    if (ret?.order_id) {
      await supabase.from("order_status_history").insert({
        order_id: ret.order_id,
        status: "return_escalated",
        note: reason || "Buyer escalated return to admin",
        changed_by_role: "buyer",
      });
    }
  }

  // ============================================================================
  // SELLER: Request Item Back (return_required path)
  // ============================================================================

  async requestItemBack(returnId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
    const mockTrackingNumber = `RTN-${Date.now().toString(36).toUpperCase()}`;
    const mockLabelUrl = `https://bazaar.ph/return-labels/${returnId}.pdf`;

    await supabase
      .from("refund_return_periods")
      .update({
        status: "return_in_transit",
        resolution_path: "return_required",
        return_tracking_number: mockTrackingNumber,
        return_label_url: mockLabelUrl,
      })
      .eq("id", returnId);
  }

  // ============================================================================
  // BUYER: Confirm Return Shipment
  // ============================================================================

  async confirmReturnShipment(returnId: string, trackingNumber: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
    await supabase
      .from("refund_return_periods")
      .update({
        status: "return_in_transit",
        return_tracking_number: trackingNumber,
        buyer_shipped_at: new Date().toISOString(),
      })
      .eq("id", returnId);
  }

  // ============================================================================
  // SELLER: Confirm Return Received & Refund
  // ============================================================================

  async confirmReturnReceived(returnId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");

    const now = new Date().toISOString();
    const { data: ret } = await supabase
      .from("refund_return_periods")
      .select("order_id")
      .eq("id", returnId)
      .single();

    await supabase
      .from("refund_return_periods")
      .update({
        status: "refunded",
        return_received_at: now,
        refund_date: now,
        resolved_at: now,
        resolved_by: "seller",
      })
      .eq("id", returnId);

    if (ret?.order_id) {
      await supabase
        .from("orders")
        .update({ payment_status: "refunded", updated_at: now })
        .eq("id", ret.order_id);

      await supabase.from("order_status_history").insert({
        order_id: ret.order_id,
        status: "refund_approved",
        note: "Return received, refund processed",
        changed_by_role: "seller",
      });

      // Notify Buyer
      await this.notifyBuyerOfReturnUpdate(ret.order_id, "refunded");
    }
  }

  /**
   * Helper to notify buyer of return status update
   */
  private async notifyBuyerOfReturnUpdate(orderId: string, status: any, message?: string) {
    try {
      const { data: order } = await supabase
        .from("orders")
        .select("order_number, buyer_id")
        .eq("id", orderId)
        .single();

      if (order?.buyer_id) {
        await notificationService.notifyBuyerReturnStatus({
          buyerId: order.buyer_id,
          orderId,
          orderNumber: order.order_number,
          status,
          message
        });
      }
    } catch (err) {
      console.warn("Failed to notify buyer of return update:", err);
    }
  }

  // ============================================================================
  // UTILITY: Deadline helpers
  // ============================================================================

  getDeadlineRemainingMs(deadline: string | null): number {
    if (!deadline) return 0;
    return Math.max(0, new Date(deadline).getTime() - Date.now());
  }

  formatDeadlineRemaining(deadline: string | null): string {
    const ms = this.getDeadlineRemainingMs(deadline);
    if (ms <= 0) return "Expired";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  }

  // ============================================================================
  // UTILITY: Check return window
  // ============================================================================

  async isWithinReturnWindow(orderDbId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    if (!this.isUuid(orderDbId)) return false;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          created_at, shipment_status,
          shipments:order_shipments(delivered_at, created_at)
        `)
        .eq("id", orderDbId)
        .single();

      if (error || !data) return false;
      if (data.shipment_status !== "delivered" && data.shipment_status !== "received") return false;

      const returnDeadline = this.resolveReturnDeadline(data);
      return new Date() <= returnDeadline;
    } catch {
      return false;
    }
  }
}

export const returnService = new ReturnService();
