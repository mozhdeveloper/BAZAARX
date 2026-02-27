/**
 * Return & Refund Service
 * Handles all return/refund database operations for buyers and sellers
 */
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const ORDER_ID_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RETURN_WINDOW_DAYS = 7;

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
}

export interface SubmitReturnRequestParams {
  orderDbId?: string;
  // Backward compatibility alias. Remove after buyer flow fully migrates.
  orderId?: string;
  reason: string;
  description?: string;
  refundAmount?: number;
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
      .map((shipment) => shipment?.delivered_at)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    const shipmentCreatedTimestamp = shipments
      .map((shipment) => shipment?.created_at)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    const baselineDate = new Date(deliveredTimestamp || shipmentCreatedTimestamp || order.created_at);
    const returnDeadline = new Date(baselineDate);
    returnDeadline.setDate(returnDeadline.getDate() + RETURN_WINDOW_DAYS);
    return returnDeadline;
  }

  // ============================================================================
  // BUYER: Submit Return Request
  // ============================================================================

  async submitReturnRequest(params: SubmitReturnRequestParams): Promise<ReturnRequest> {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase not configured");
    }

    try {
      const orderDbId = this.resolveOrderDbId(params);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          id,
          shipment_status,
          payment_status,
          created_at,
          shipments:order_shipments(
            delivered_at,
            created_at
          )
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

      const { data: existing, error: existingError } = await supabase
        .from("refund_return_periods")
        .select("id")
        .eq("order_id", orderDbId)
        .limit(1);

      if (existingError) throw existingError;

      if (existing && existing.length > 0) {
        throw new Error("A return request already exists for this order");
      }

      const { data: returnData, error: returnError } = await supabase
        .from("refund_return_periods")
        .insert({
          order_id: orderDbId,
          is_returnable: true,
          return_window_days: RETURN_WINDOW_DAYS,
          return_reason: params.reason + (params.description ? ` - ${params.description}` : ""),
          refund_amount: params.refundAmount || null,
        })
        .select()
        .single();

      if (returnError) throw returnError;

      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({ shipment_status: "returned", updated_at: new Date().toISOString() })
        .eq("id", orderDbId);

      if (orderUpdateError) throw orderUpdateError;

      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: orderDbId,
          status: "return_requested",
          note: params.reason,
          changed_by_role: "buyer",
        });

      if (historyError) throw historyError;

      return {
        id: returnData.id,
        orderId: returnData.order_id,
        isReturnable: returnData.is_returnable,
        returnWindowDays: returnData.return_window_days,
        returnReason: returnData.return_reason,
        refundAmount: returnData.refund_amount ? parseFloat(String(returnData.refund_amount)) : null,
        refundDate: returnData.refund_date,
        createdAt: returnData.created_at,
      };
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

      return (data || []).map((row: any) => ({
        id: row.id,
        orderId: row.order_id,
        orderNumber: row.order?.order_number,
        isReturnable: row.is_returnable,
        returnWindowDays: row.return_window_days,
        returnReason: row.return_reason,
        refundAmount: row.refund_amount ? parseFloat(String(row.refund_amount)) : null,
        refundDate: row.refund_date,
        createdAt: row.created_at,
        items: (row.order?.order_items || []).map((item: any) => ({
          productName: item.product_name,
          quantity: item.quantity,
          price: parseFloat(String(item.price)),
          image: item.primary_image_url,
        })),
        orderStatus: row.order?.shipment_status,
        paymentStatus: row.order?.payment_status,
      }));
    } catch (error) {
      console.error("Failed to get buyer return requests:", error);
      return [];
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

      return (data || [])
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
          const sellerItems = (row.order?.order_items || []).filter(
            (item: any) => item.product?.seller_id === sellerId,
          );

          return {
            id: row.id,
            orderId: row.order_id,
            orderNumber: row.order?.order_number,
            buyerId: row.order?.buyer_id,
            buyerName,
            buyerEmail: buyerProfile?.email || "",
            isReturnable: row.is_returnable,
            returnWindowDays: row.return_window_days,
            returnReason: row.return_reason,
            refundAmount: row.refund_amount ? parseFloat(String(row.refund_amount)) : null,
            refundDate: row.refund_date,
            createdAt: row.created_at,
            items: sellerItems.map((item: any) => ({
              productName: item.product_name,
              quantity: item.quantity,
              price: parseFloat(String(item.price)),
              image: item.primary_image_url,
            })),
            orderStatus: row.order?.shipment_status,
            paymentStatus: row.order?.payment_status,
          };
        });
    } catch (error) {
      console.error("Failed to get seller return requests:", error);
      return [];
    }
  }

  // ============================================================================
  // SELLER: Approve / Reject Refund
  // ============================================================================

  async approveReturn(returnId: string, orderId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");

    try {
      const { error: refundError } = await supabase
        .from("refund_return_periods")
        .update({ refund_date: new Date().toISOString() })
        .eq("id", returnId);

      if (refundError) throw refundError;

      const { error: orderError } = await supabase
        .from("orders")
        .update({ payment_status: "refunded", updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (orderError) throw orderError;

      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: orderId,
          status: "refund_approved",
          note: "Return approved and refund processed",
          changed_by_role: "seller",
        });

      if (historyError) throw historyError;
    } catch (error: any) {
      console.error("Failed to approve return:", error);
      throw new Error(error.message || "Failed to approve return");
    }
  }

  async rejectReturn(returnId: string, orderId: string, reason?: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error("Supabase not configured");

    try {
      const { error: refundError } = await supabase
        .from("refund_return_periods")
        .update({ is_returnable: false })
        .eq("id", returnId);

      if (refundError) throw refundError;

      const { error: orderError } = await supabase
        .from("orders")
        .update({ shipment_status: "delivered", updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (orderError) throw orderError;

      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: orderId,
          status: "return_rejected",
          note: reason || "Return request rejected by seller",
          changed_by_role: "seller",
        });

      if (historyError) throw historyError;
    } catch (error: any) {
      console.error("Failed to reject return:", error);
      throw new Error(error.message || "Failed to reject return");
    }
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
          created_at,
          shipment_status,
          shipments:order_shipments(
            delivered_at,
            created_at
          )
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
