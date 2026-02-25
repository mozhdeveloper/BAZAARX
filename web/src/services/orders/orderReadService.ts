import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { orderService } from "@/services/orderService";
import type {
  BuyerOrderSnapshot,
  OrderDetailSnapshot,
  OrderTrackingSnapshot,
  SellerOrderSnapshot,
} from "@/types/orders";
import {
  mapOrderRowToBuyerSnapshot,
  mapOrderRowToOrderDetailSnapshot,
  mapOrderRowToSellerSnapshot,
  mapTrackingSnapshot,
} from "@/utils/orders/mappers";

interface GetBuyerOrdersInput {
  buyerId: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

// 1. Updated interface to include optional date filters
interface GetSellerOrdersInput {
  sellerId: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

interface GetOrderTrackingInput {
  orderIdOrNumber: string;
  buyerId?: string;
}

interface GetOrderDetailInput {
  orderIdOrNumber: string;
  buyerId?: string;
}

export class OrderReadService {
  async getBuyerOrders({ buyerId, startDate, endDate }: GetBuyerOrdersInput): Promise<BuyerOrderSnapshot[]> {
    const rows = await orderService.getBuyerOrders(buyerId, startDate, endDate); // Pass parameters
    return rows.map((row: any) => mapOrderRowToBuyerSnapshot(row));
  }

  // 2. Updated method to pass date filters to orderService
  async getSellerOrders({
    sellerId,
    startDate,
    endDate
  }: GetSellerOrdersInput): Promise<SellerOrderSnapshot[]> {
    const rows = await orderService.getSellerOrders(sellerId, startDate, endDate);
    return rows.map((row: any) => mapOrderRowToSellerSnapshot(row));
  }

  async getOrderTracking({
    orderIdOrNumber,
    buyerId,
  }: GetOrderTrackingInput): Promise<OrderTrackingSnapshot | null> {
    const snapshot = await orderService.getOrderTrackingSnapshot(orderIdOrNumber, buyerId);
    return mapTrackingSnapshot(snapshot);
  }

  async getOrderDetail({
    orderIdOrNumber,
    buyerId,
  }: GetOrderDetailInput): Promise<OrderDetailSnapshot | null> {
    if (!isSupabaseConfigured()) {
      const fallback = await orderService.getOrderById(orderIdOrNumber);
      if (!fallback) return null;

      return mapOrderRowToOrderDetailSnapshot({
        ...fallback,
        order_items: (fallback as any).order_items || [],
        seller_id: (fallback as any).seller_id || null,
        store_name: (fallback as any).store_name || "Seller",
      });
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdOrNumber);

    // 3. FIXED: Removed .maybeSingle() from the initial assignment to allow further chaining
    let query = supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          variant:product_variants(id, variant_name, size, color, sku, price, thumbnail_url),
          product:products(id, name)
        ),
        recipient:order_recipients (
          first_name,
          last_name,
          phone,
          email
        ),
        shipping_address:shipping_addresses (
          label,
          address_line_1,
          address_line_2,
          barangay,
          city,
          province,
          region,
          postal_code,
          landmark,
          delivery_instructions
        ),
        shipments:order_shipments (
          id,
          status,
          tracking_number,
          shipped_at,
          delivered_at,
          created_at
        ),
        cancellations:order_cancellations (
          id,
          reason,
          cancelled_at,
          cancelled_by,
          created_at
        ),
        reviews (
          id,
          product_id,
          buyer_id,
          order_id,
          order_item_id,
          variant_snapshot,
          rating,
          comment,
          is_hidden,
          created_at,
          updated_at,
          review_images (
            id,
            image_url,
            sort_order,
            uploaded_at
          )
        ),
        order_discounts (
          discount_amount
        ),
        order_vouchers (
          discount_amount
        )
      `)
      .eq(isUuid ? "id" : "order_number", orderIdOrNumber);

    if (buyerId) {
      query = query.eq("buyer_id", buyerId);
    }

    // 4. FIXED: Call .maybeSingle() here after all filters are applied
    const { data: orderData, error } = await query.maybeSingle();

    if (error) {
      throw error;
    }

    if (!orderData) {
      return null;
    }

    let sellerId: string | null = null;
    let storeName = "Seller";

    const firstItem = (orderData as any).order_items?.[0];
    if (firstItem?.product_id) {
      const { data: productData } = await supabase
        .from("products")
        .select("seller_id, seller:sellers(id, store_name)")
        .eq("id", firstItem.product_id)
        .maybeSingle();

      if ((productData as any)?.seller) {
        sellerId = (productData as any).seller.id;
        storeName = (productData as any).seller.store_name || "Seller";
      } else if ((productData as any)?.seller_id) {
        sellerId = (productData as any).seller_id;
        const { data: sellerData } = await supabase
          .from("sellers")
          .select("store_name")
          .eq("id", (productData as any).seller_id)
          .maybeSingle();
        if (sellerData?.store_name) {
          storeName = sellerData.store_name;
        }
      }
    }

    const normalized = {
      ...(orderData as any),
      seller_id: sellerId,
      store_name: storeName,
    };

    return mapOrderRowToOrderDetailSnapshot(normalized);
  }
}

export const orderReadService = new OrderReadService();
