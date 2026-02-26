/**
 * Return & Refund Service
 * Handles all return/refund database operations for buyers and sellers
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  // Joined data
  items?: Array<{
    productName: string;
    quantity: number;
    price: number;
    image: string | null;
  }>;
  orderStatus?: string;
  paymentStatus?: string;
}

class ReturnService {
  // ============================================================================
  // BUYER: Submit Return Request
  // ============================================================================

  async submitReturnRequest(params: {
    orderId: string;
    reason: string;
    description?: string;
    refundAmount?: number;
  }): Promise<ReturnRequest> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      // 1. Check if order exists and is eligible for return
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, shipment_status, payment_status, created_at')
        .eq('id', params.orderId)
        .single();

      if (orderError || !order) throw new Error('Order not found');

      if (order.shipment_status !== 'delivered' && order.shipment_status !== 'received') {
        throw new Error('Only delivered or received orders can be returned');
      }

      // 2. Check return window (7 days from delivery)
      // We use order updated_at as proxy for delivery date, or created_at + 7 days
      const deliveryDate = new Date(order.created_at);
      const returnDeadline = new Date(deliveryDate);
      returnDeadline.setDate(returnDeadline.getDate() + 7);
      if (new Date() > returnDeadline) {
        throw new Error('Return window has expired (7 days from delivery)');
      }

      // 3. Check if return already submitted
      const { data: existing } = await supabase
        .from('refund_return_periods')
        .select('id')
        .eq('order_id', params.orderId)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error('A return request already exists for this order');
      }

      // 4. Insert return request
      const { data: returnData, error: returnError } = await supabase
        .from('refund_return_periods')
        .insert({
          order_id: params.orderId,
          is_returnable: true,
          return_window_days: 7,
          return_reason: params.reason + (params.description ? ` — ${params.description}` : ''),
          refund_amount: params.refundAmount || null,
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // 5. Update order shipment status to 'returned'
      await supabase
        .from('orders')
        .update({ shipment_status: 'returned', updated_at: new Date().toISOString() })
        .eq('id', params.orderId);

      // 6. Add to order status history
      await supabase
        .from('order_status_history')
        .insert({
          order_id: params.orderId,
          status: 'return_requested',
          note: params.reason,
          changed_by_role: 'buyer',
        });

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
      console.error('Failed to submit return request:', error);
      throw new Error(error.message || 'Failed to submit return request');
    }
  }

  // ============================================================================
  // BUYER: Get Return Requests
  // ============================================================================

  async getReturnRequestsByBuyer(buyerId: string): Promise<ReturnRequest[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('refund_return_periods')
        .select(`
          *,
          order:orders!inner(
            id, order_number, buyer_id, shipment_status, payment_status,
            order_items(product_name, quantity, price, primary_image_url)
          )
        `)
        .eq('order.buyer_id', buyerId)
        .order('created_at', { ascending: false });

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
      console.error('Failed to get buyer return requests:', error);
      return [];
    }
  }

  // ============================================================================
  // SELLER: Get Return Requests for My Products
  // ============================================================================

  async getReturnRequestsBySeller(sellerId: string): Promise<ReturnRequest[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      // Get orders containing this seller's products that have return requests
      const { data, error } = await supabase
        .from('refund_return_periods')
        .select(`
          *,
          order:orders!inner(
            id, order_number, buyer_id, shipment_status, payment_status,
            buyer:buyers(id, profiles(first_name, last_name, email)),
            order_items!inner(product_name, quantity, price, primary_image_url, product:products(seller_id))
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter to only include orders with this seller's products
      return (data || [])
        .filter((row: any) => {
          const items = row.order?.order_items || [];
          return items.some((item: any) => item.product?.seller_id === sellerId);
        })
        .map((row: any) => {
          const buyer = row.order?.buyer;
          const buyerProfile = buyer?.profiles;
          const buyerName = buyerProfile
            ? `${buyerProfile.first_name || ''} ${buyerProfile.last_name || ''}`.trim()
            : 'Unknown';
          const sellerItems = (row.order?.order_items || []).filter(
            (item: any) => item.product?.seller_id === sellerId
          );

          return {
            id: row.id,
            orderId: row.order_id,
            orderNumber: row.order?.order_number,
            buyerId: row.order?.buyer_id,
            buyerName,
            buyerEmail: buyerProfile?.email || '',
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
      console.error('Failed to get seller return requests:', error);
      return [];
    }
  }

  // ============================================================================
  // SELLER: Approve / Reject Refund
  // ============================================================================

  async approveReturn(returnId: string, orderId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    try {
      // Update the refund record with refund date
      const { error: refundError } = await supabase
        .from('refund_return_periods')
        .update({ refund_date: new Date().toISOString() })
        .eq('id', returnId);

      if (refundError) throw refundError;

      // Update order payment status to refunded
      const { error: orderError } = await supabase
        .from('orders')
        .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Add to order status history
      await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: 'refund_approved',
          note: 'Return approved and refund processed',
          changed_by_role: 'seller',
        });
    } catch (error: any) {
      console.error('Failed to approve return:', error);
      throw new Error(error.message || 'Failed to approve return');
    }
  }

  async rejectReturn(returnId: string, orderId: string, reason?: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    try {
      // Mark as not returnable
      const { error: refundError } = await supabase
        .from('refund_return_periods')
        .update({ is_returnable: false })
        .eq('id', returnId);

      if (refundError) throw refundError;

      // Revert order shipment status back to delivered
      const { error: orderError } = await supabase
        .from('orders')
        .update({ shipment_status: 'delivered', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Add to order status history
      await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: 'return_rejected',
          note: reason || 'Return request rejected by seller',
          changed_by_role: 'seller',
        });
    } catch (error: any) {
      console.error('Failed to reject return:', error);
      throw new Error(error.message || 'Failed to reject return');
    }
  }

  // ============================================================================
  // UTILITY: Check return window
  // ============================================================================

  async isWithinReturnWindow(orderId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('created_at, shipment_status')
        .eq('id', orderId)
        .single();

      if (error || !data) return false;
      if (data.shipment_status !== 'delivered' && data.shipment_status !== 'received') return false;

      const deliveryDate = new Date(data.created_at);
      const returnDeadline = new Date(deliveryDate);
      returnDeadline.setDate(returnDeadline.getDate() + 7);
      return new Date() <= returnDeadline;
    } catch {
      return false;
    }
  }
}

export const returnService = new ReturnService();
