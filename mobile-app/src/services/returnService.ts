/**
 * Return & Refund Service v2 (Mobile)
 * Full redesign: per-item returns, evidence, smart resolution paths,
 * counter-offers, seller deadlines, escalation, return shipping.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { notificationService } from './notificationService';

const RETURN_WINDOW_DAYS = 7;
const SELLER_DEADLINE_HOURS = 48;
const INSTANT_REFUND_THRESHOLD = 500; // ₱500

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReturnStatus =
  | 'pending'
  | 'seller_review'
  | 'counter_offered'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'return_in_transit'
  | 'return_received'
  | 'refunded';

export type ReturnType = 'return_refund' | 'refund_only' | 'replacement';

export type ResolutionPath = 'instant' | 'seller_review' | 'return_required';

export type ReturnReason =
  | 'damaged'
  | 'wrong_item'
  | 'not_as_described'
  | 'defective'
  | 'missing_parts'
  | 'changed_mind'
  | 'duplicate_order'
  | 'other';

export const EVIDENCE_REQUIRED_REASONS: ReturnReason[] = [
  'damaged',
  'wrong_item',
  'not_as_described',
  'defective',
  'missing_parts',
];

export interface ReturnItem {
  orderItemId: string;
  productName: string;
  quantity: number;
  returnQuantity: number;
  price: number;
  image: string | null;
  variantLabel?: string;
}

export interface MobileReturnRequest {
  id: string;
  orderId: string;
  orderNumber?: string;
  buyerId?: string;
  isReturnable: boolean;
  returnWindowDays: number;
  returnReason: string | null;
  refundAmount: number | null;
  refundDate: string | null;
  createdAt: string;
  status: ReturnStatus;
  returnType: ReturnType;
  resolutionPath: ResolutionPath;
  description: string | null;
  evidenceUrls: string[];
  itemsJson: ReturnItem[] | null;
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
  // Joined fields
  orderStatus?: string;
  paymentStatus?: string;
  buyerName?: string;
  buyerEmail?: string;
  items?: Array<{ productName: string; quantity: number; price: number; image: string | null }>;
}

export interface SubmitReturnParams {
  orderDbId: string;
  reason: ReturnReason;
  returnType: ReturnType;
  description?: string;
  refundAmount?: number;
  items: ReturnItem[];
  evidenceUrls?: string[];
}

// ─── Resolution Path Calculator ──────────────────────────────────────────────

export function computeResolutionPath(
  reason: ReturnReason,
  totalAmount: number,
  hasEvidence: boolean,
): ResolutionPath {
  const instantReasons: ReturnReason[] = ['wrong_item', 'not_as_described', 'missing_parts'];
  if (totalAmount < INSTANT_REFUND_THRESHOLD && instantReasons.includes(reason) && hasEvidence) {
    return 'instant';
  }
  if (totalAmount >= 2000) {
    return 'return_required';
  }
  return 'seller_review';
}

export function getEstimatedResolutionDate(path: ResolutionPath): Date {
  const now = new Date();
  switch (path) {
    case 'instant':
      now.setHours(now.getHours() + 2);
      return now;
    case 'seller_review':
      now.setHours(now.getHours() + SELLER_DEADLINE_HOURS);
      return now;
    case 'return_required':
      now.setDate(now.getDate() + 7);
      return now;
  }
}

export function getStatusLabel(status: ReturnStatus): string {
  const labels: Record<ReturnStatus, string> = {
    pending: 'Pending',
    seller_review: 'Under Seller Review',
    counter_offered: 'Counter Offer Sent',
    approved: 'Approved',
    rejected: 'Rejected',
    escalated: 'Escalated to Admin',
    return_in_transit: 'Return In Transit',
    return_received: 'Return Received',
    refunded: 'Refunded',
  };
  return labels[status] || status;
}

export function getStatusColor(status: ReturnStatus): string {
  const colors: Record<ReturnStatus, string> = {
    pending: '#D97706',
    seller_review: '#D97706',
    counter_offered: '#7C3AED',
    approved: '#10B981',
    rejected: '#DC2626',
    escalated: '#DC2626',
    return_in_transit: '#3B82F6',
    return_received: '#3B82F6',
    refunded: '#10B981',
  };
  return colors[status] || '#6B7280';
}

// ─── Service ─────────────────────────────────────────────────────────────────

class ReturnService {
  // ──────────────────────────────────────────────────────────────────────────
  // BUYER: Upload evidence photos to Supabase Storage
  // ──────────────────────────────────────────────────────────────────────────
  async uploadEvidence(orderId: string, localUris: string[]): Promise<string[]> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const urls: string[] = [];

    for (let i = 0; i < localUris.length; i++) {
      const uri = localUris[i];
      const ext = uri.split('.').pop() || 'jpg';
      const fileName = `returns/${orderId}/${Date.now()}_${i}.${ext}`;

      try {
        const response = await fetch(uri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
          .from('return-evidence')
          .upload(fileName, blob, { contentType: `image/${ext}`, upsert: false });

        if (error) {
          console.warn(`[ReturnService] Failed to upload evidence ${i}:`, error.message);
          continue;
        }

        const { data: publicUrl } = supabase.storage
          .from('return-evidence')
          .getPublicUrl(data.path);

        urls.push(publicUrl.publicUrl);
      } catch (err) {
        console.warn(`[ReturnService] Upload error ${i}:`, err);
      }
    }

    return urls;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BUYER: Submit a return request (v2 — per-item, evidence, smart path)
  // ──────────────────────────────────────────────────────────────────────────
  async submitReturnRequest(params: SubmitReturnParams): Promise<MobileReturnRequest> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { orderDbId, reason, returnType, description, refundAmount, items, evidenceUrls } = params;

    // 1. Verify order is delivered / received
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, shipment_status, payment_status, created_at, order_shipments(delivered_at, created_at)')
      .eq('id', orderDbId)
      .single();

    if (orderError || !order) throw new Error('Order not found. Please refresh and try again.');

    if (order.shipment_status !== 'delivered' && order.shipment_status !== 'received') {
      throw new Error('Only delivered or received orders can be returned');
    }

    // 2. Check return window
    const shipments: Array<{ delivered_at?: string | null; created_at?: string | null }> =
      (order as any).order_shipments ?? [];
    const deliveredAt = shipments
      .map((s) => s.delivered_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
    const shipmentCreatedAt = shipments
      .map((s) => s.created_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
    const baseline = new Date(deliveredAt || shipmentCreatedAt || order.created_at);
    const deadline = new Date(baseline);
    deadline.setDate(deadline.getDate() + RETURN_WINDOW_DAYS);

    if (new Date() > deadline) throw new Error('Return window has expired (7 days from delivery).');

    // 3. Prevent duplicates
    const { data: existing } = await supabase
      .from('refund_return_periods')
      .select('id')
      .eq('order_id', orderDbId)
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error('A return request already exists for this order.');
    }

    // 4. Compute resolution path
    const totalAmount = refundAmount ?? items.reduce((sum, i) => sum + i.price * i.returnQuantity, 0);
    const hasEvidence = (evidenceUrls?.length ?? 0) > 0;
    const isReplacement = returnType === 'replacement';
    const resolutionPath = computeResolutionPath(reason, totalAmount, hasEvidence);

    // 5. Initial status (instant auto-approve doesn't apply to replacements)
    const isInstant = resolutionPath === 'instant' && !isReplacement;
    const initialStatus: ReturnStatus = isInstant ? 'approved' : 'seller_review';

    // 6. Seller deadline (48h)
    const sellerDeadline = new Date();
    sellerDeadline.setHours(sellerDeadline.getHours() + SELLER_DEADLINE_HOURS);

    // 7. Insert
    const insertPayload: Record<string, any> = {
      order_id: orderDbId,
      is_returnable: true,
      return_window_days: RETURN_WINDOW_DAYS,
      return_reason: reason + (description ? ` - ${description}` : ''),
      refund_amount: isReplacement ? null : totalAmount,
      status: initialStatus,
      return_type: returnType || 'return_refund',
      resolution_path: resolutionPath,
      items_json: items,
      evidence_urls: evidenceUrls ?? [],
      description: description || null,
      seller_deadline: isInstant ? null : sellerDeadline.toISOString(),
    };

    if (isInstant) {
      insertPayload.refund_date = new Date().toISOString();
      insertPayload.resolved_at = new Date().toISOString();
      insertPayload.resolved_by = 'system';
    }

    const { data: returnData, error: returnError } = await supabase
      .from('refund_return_periods')
      .insert(insertPayload)
      .select()
      .single();

    if (returnError) throw returnError;

    // 8. Update order
    const orderUpdate: Record<string, any> = {
      shipment_status: 'returned',
      updated_at: new Date().toISOString(),
    };
    if (isInstant) orderUpdate.payment_status = 'refunded';

    await supabase.from('orders').update(orderUpdate).eq('id', orderDbId);

    // 9. History
    await supabase.from('order_status_history').insert({
      order_id: orderDbId,
      status: isInstant ? 'refund_approved' : 'return_requested',
      note: isInstant
        ? `Instant refund approved (${resolutionPath})`
        : `Return submitted – ${resolutionPath}`,
      changed_by_role: isInstant ? 'system' : 'buyer',
    });

    // 10. Notify seller(s) — only for non-instant returns (instant = auto-approved, no action needed)
    if (resolutionPath !== 'instant') {
      try {
        const { data: orderDetails } = await supabase
          .from('orders')
          .select('order_number, buyer_id, order_items(products(seller_id))')
          .eq('id', orderDbId)
          .single();

        let buyerName = 'A buyer';
        if (orderDetails?.buyer_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', orderDetails.buyer_id)
            .single();
          if (profile?.full_name) buyerName = profile.full_name;
        }

        const sellerIds = new Set<string>();
        ((orderDetails as any)?.order_items ?? []).forEach((item: any) => {
          const sid = item?.products?.seller_id;
          if (sid) sellerIds.add(sid);
        });

        await Promise.all(
          [...sellerIds].map((sellerId) =>
            notificationService.notifySellerReturnRequest({
              sellerId,
              orderId: orderDbId,
              returnId: returnData.id,
              orderNumber: (orderDetails as any)?.order_number ?? 'N/A',
              buyerName,
              reason,
            })
          )
        );
      } catch (err) {
        console.warn('[ReturnService] Failed to send return notification:', err);
      }
    }

    return this.transform(returnData);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BUYER: Fetch all return requests
  // ──────────────────────────────────────────────────────────────────────────
  async getReturnRequestsByBuyer(buyerId: string): Promise<MobileReturnRequest[]> {
    if (!isSupabaseConfigured()) return [];

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

    if (error) {
      console.error('[ReturnService] getReturnRequestsByBuyer error:', error);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      ...this.transform(row),
      orderNumber: row.order?.order_number,
      orderStatus: row.order?.shipment_status,
      paymentStatus: row.order?.payment_status,
      items: (row.order?.order_items ?? []).map((i: any) => ({
        productName: i.product_name,
        quantity: i.quantity,
        price: parseFloat(i.price),
        image: i.primary_image_url ?? null,
      })),
    }));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Fetch a single return request by ID
  // ──────────────────────────────────────────────────────────────────────────
  async getReturnRequestById(id: string): Promise<MobileReturnRequest | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('refund_return_periods')
      .select(`
        *,
        order:orders!inner(
          id, order_number, buyer_id, shipment_status, payment_status,
          order_items(product_name, quantity, price, primary_image_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      ...this.transform(data),
      orderNumber: (data as any).order?.order_number,
      orderStatus: (data as any).order?.shipment_status,
      paymentStatus: (data as any).order?.payment_status,
      items: ((data as any).order?.order_items ?? []).map((i: any) => ({
        productName: i.product_name,
        quantity: i.quantity,
        price: parseFloat(i.price),
        image: i.primary_image_url ?? null,
      })),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Fetch return for a specific order (seller view)
  // ──────────────────────────────────────────────────────────────────────────
  async getReturnForOrder(orderId: string): Promise<MobileReturnRequest | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('refund_return_periods')
      .select(`
        *,
        order:orders!inner(
          id, order_number, buyer_id, shipment_status, payment_status,
          order_items(product_name, quantity, price, primary_image_url)
        )
      `)
      .eq('order_id', orderId)
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const row = data[0] as any;
    return {
      ...this.transform(row),
      orderNumber: row.order?.order_number,
      orderStatus: row.order?.shipment_status,
      paymentStatus: row.order?.payment_status,
      items: (row.order?.order_items ?? []).map((i: any) => ({
        productName: i.product_name,
        quantity: i.quantity,
        price: parseFloat(i.price),
        image: i.primary_image_url ?? null,
      })),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SELLER: Get all return requests for their store
  // ──────────────────────────────────────────────────────────────────────────
  async getReturnRequestsBySeller(sellerId: string): Promise<MobileReturnRequest[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('refund_return_periods')
      .select(`
        *,
        order:orders!inner(
          id, order_number, buyer_id, shipment_status, payment_status,
          buyer:buyers(id, profiles:profiles(first_name, last_name, email)),
          order_items!inner(product_name, quantity, price, primary_image_url, product:products(seller_id))
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ReturnService] getReturnRequestsBySeller error:', error);
      return [];
    }

    return (data ?? [])
      .filter((row: any) => {
        const items = row.order?.order_items ?? [];
        return items.some((item: any) => item.product?.seller_id === sellerId);
      })
      .map((row: any) => {
        const buyerProfile = row.order?.buyer?.profiles;
        const buyerName = buyerProfile
          ? `${buyerProfile.first_name || ''} ${buyerProfile.last_name || ''}`.trim()
          : 'Unknown';
        return {
          ...this.transform(row),
          orderNumber: row.order?.order_number,
          orderStatus: row.order?.shipment_status,
          paymentStatus: row.order?.payment_status,
          buyerName,
          buyerEmail: buyerProfile?.email || '',
          items: (row.order?.order_items ?? []).map((i: any) => ({
            productName: i.product_name,
            quantity: i.quantity,
            price: parseFloat(i.price),
            image: i.primary_image_url ?? null,
          })),
        };
      });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SELLER: Approve return (full refund)
  // ──────────────────────────────────────────────────────────────────────────
  async approveReturn(returnId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { data: ret } = await supabase
      .from('refund_return_periods')
      .select('id, order_id, return_type')
      .eq('id', returnId)
      .single();

    const isReplacement = ret?.return_type === 'replacement';
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('refund_return_periods')
      .update({
        status: 'approved',
        ...(isReplacement ? {} : { refund_date: now }),
        resolved_at: now,
        resolved_by: 'seller',
      })
      .eq('id', returnId);

    if (error) throw error;

    if (ret?.order_id) {
      if (isReplacement) {
        // For replacement: mark order as processing replacement (keep payment status as-is)
        await supabase
          .from('orders')
          .update({ shipment_status: 'processing', updated_at: now })
          .eq('id', ret.order_id);
        await supabase.from('order_status_history').insert({
          order_id: ret.order_id,
          status: 'replacement_approved',
          note: 'Replacement approved — seller will ship a new item',
          changed_by_role: 'seller',
        });
      } else {
        // For refund: process refund as before
        await supabase
          .from('orders')
          .update({ payment_status: 'refunded', updated_at: now })
          .eq('id', ret.order_id);
        await supabase.from('order_status_history').insert({
          order_id: ret.order_id,
          status: 'refund_approved',
          note: 'Return approved and refund processed by seller',
          changed_by_role: 'seller',
        });
      }

      // Notify Buyer
      await this.notifyBuyerOfReturnUpdate(returnId, ret.order_id, 'approved');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SELLER: Reject return
  // ──────────────────────────────────────────────────────────────────────────
  async rejectReturn(returnId: string, reason?: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { data: ret } = await supabase
      .from('refund_return_periods')
      .select('id, order_id')
      .eq('id', returnId)
      .single();

    const { error } = await supabase
      .from('refund_return_periods')
      .update({
        status: 'rejected',
        is_returnable: false,
        rejected_reason: reason || null,
        resolved_at: new Date().toISOString(),
        resolved_by: 'seller',
      })
      .eq('id', returnId);

    if (error) throw error;

    if (ret?.order_id) {
      await supabase
        .from('orders')
        .update({ shipment_status: 'received', updated_at: new Date().toISOString() })
        .eq('id', ret.order_id);
      await supabase.from('order_status_history').insert({
        order_id: ret.order_id,
        status: 'return_rejected',
        note: reason || 'Return request rejected by seller',
        changed_by_role: 'seller',
      });

      // Notify Buyer
      await this.notifyBuyerOfReturnUpdate(returnId, ret.order_id, 'rejected', reason);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SELLER: Counter-offer (partial refund)
  // ──────────────────────────────────────────────────────────────────────────
  async counterOfferReturn(returnId: string, amount: number, note: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { data: ret } = await supabase
      .from('refund_return_periods')
      .select('id, order_id')
      .eq('id', returnId)
      .single();

    const { error } = await supabase
      .from('refund_return_periods')
      .update({ status: 'counter_offered', counter_offer_amount: amount, seller_note: note })
      .eq('id', returnId);

    if (error) throw error;

    if (ret?.order_id) {
      await supabase.from('order_status_history').insert({
        order_id: ret.order_id,
        status: 'counter_offer_sent',
        note: `Counter-offer: ₱${amount.toLocaleString()} — ${note}`,
        changed_by_role: 'seller',
      });

      // Notify Buyer
      await this.notifyBuyerOfReturnUpdate(returnId, ret.order_id, 'counter_offered');
    }
  }

  /**
   * Helper to notify buyer of return status update
   */
  private async notifyBuyerOfReturnUpdate(returnId: string, orderId: string, status: any, message?: string) {
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('order_number, buyer_id')
        .eq('id', orderId)
        .single();

      if (order?.buyer_id) {
        await notificationService.notifyBuyerReturnStatus({
          buyerId: order.buyer_id,
          orderId,
          returnId,
          orderNumber: order.order_number,
          status,
          message,
        });
      }
    } catch (err) {
      console.warn('Failed to notify buyer of return update:', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BUYER: Accept counter-offer
  // ──────────────────────────────────────────────────────────────────────────
  async acceptCounterOffer(returnId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { data: ret } = await supabase
      .from('refund_return_periods')
      .select('id, order_id, counter_offer_amount')
      .eq('id', returnId)
      .single();

    const { error } = await supabase
      .from('refund_return_periods')
      .update({
        status: 'approved',
        refund_amount: ret?.counter_offer_amount,
        refund_date: new Date().toISOString(),
        resolved_at: new Date().toISOString(),
        resolved_by: 'buyer',
      })
      .eq('id', returnId);

    if (error) throw error;

    if (ret?.order_id) {
      await supabase
        .from('orders')
        .update({ payment_status: 'partially_refunded', updated_at: new Date().toISOString() })
        .eq('id', ret.order_id);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BUYER: Decline counter-offer → escalate
  // ──────────────────────────────────────────────────────────────────────────
  async declineCounterOffer(returnId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { data: ret } = await supabase
      .from('refund_return_periods')
      .select('id, order_id')
      .eq('id', returnId)
      .single();

    const { error } = await supabase
      .from('refund_return_periods')
      .update({ status: 'escalated', escalated_at: new Date().toISOString() })
      .eq('id', returnId);

    if (error) throw error;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BUYER: Escalate a rejected return
  // ──────────────────────────────────────────────────────────────────────────
  async escalateReturn(returnId: string, reason?: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { data: ret } = await supabase
      .from('refund_return_periods')
      .select('id, order_id')
      .eq('id', returnId)
      .single();

    const { error } = await supabase
      .from('refund_return_periods')
      .update({ status: 'escalated', escalated_at: new Date().toISOString() })
      .eq('id', returnId);

    if (error) throw error;

    if (ret?.order_id) {
      await supabase.from('order_status_history').insert({
        order_id: ret.order_id,
        status: 'return_escalated',
        note: reason || 'Buyer escalated return to admin',
        changed_by_role: 'buyer',
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SELLER: Request item back
  // ──────────────────────────────────────────────────────────────────────────
  async requestItemBack(returnId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { data: ret } = await supabase
      .from('refund_return_periods')
      .select('id, order_id')
      .eq('id', returnId)
      .single();

    const mockLabelUrl = `https://bazaar.ph/return-labels/${returnId}.pdf`;
    const mockTrackingNumber = `RTN-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabase
      .from('refund_return_periods')
      .update({
        status: 'return_in_transit',
        resolution_path: 'return_required',
        return_label_url: mockLabelUrl,
        return_tracking_number: mockTrackingNumber,
      })
      .eq('id', returnId);

    if (error) throw error;

    if (ret?.order_id) {
      await supabase.from('order_status_history').insert({
        order_id: ret.order_id,
        status: 'return_label_generated',
        note: `Return label generated. Tracking: ${mockTrackingNumber}`,
        changed_by_role: 'seller',
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BUYER: Confirm return shipment
  // ──────────────────────────────────────────────────────────────────────────
  async confirmReturnShipment(returnId: string, trackingNumber: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('refund_return_periods')
      .update({
        status: 'return_in_transit',
        buyer_shipped_at: new Date().toISOString(),
        return_tracking_number: trackingNumber,
      })
      .eq('id', returnId);

    if (error) throw error;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SELLER: Confirm return received → auto-refund
  // ──────────────────────────────────────────────────────────────────────────
  async confirmReturnReceived(returnId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { data: ret } = await supabase
      .from('refund_return_periods')
      .select('id, order_id, return_type')
      .eq('id', returnId)
      .single();

    const isReplacement = ret?.return_type === 'replacement';
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('refund_return_periods')
      .update({
        status: 'refunded',
        return_received_at: now,
        ...(isReplacement ? {} : { refund_date: now }),
        resolved_at: now,
        resolved_by: 'seller',
      })
      .eq('id', returnId);

    if (error) throw error;

    if (ret?.order_id) {
      if (isReplacement) {
        // Replacement: mark order for re-shipping, keep payment untouched
        await supabase
          .from('orders')
          .update({ shipment_status: 'processing', updated_at: now })
          .eq('id', ret.order_id);
        await supabase.from('order_status_history').insert({
          order_id: ret.order_id,
          status: 'replacement_approved',
          note: 'Return received — replacement item will be shipped',
          changed_by_role: 'seller',
        });
      } else {
        // Refund: process money-back
        await supabase
          .from('orders')
          .update({ payment_status: 'refunded', updated_at: now })
          .eq('id', ret.order_id);
        await supabase.from('order_status_history').insert({
          order_id: ret.order_id,
          status: 'refund_approved',
          note: 'Return received, refund processed',
          changed_by_role: 'seller',
        });
      }

      // Notify Buyer
      await this.notifyBuyerOfReturnUpdate(returnId, ret.order_id, isReplacement ? 'approved' : 'refunded');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Deadline helpers
  // ──────────────────────────────────────────────────────────────────────────
  getDeadlineRemainingMs(sellerDeadline: string | null): number {
    if (!sellerDeadline) return 0;
    return Math.max(0, new Date(sellerDeadline).getTime() - Date.now());
  }

  formatDeadlineRemaining(sellerDeadline: string | null): string {
    const ms = this.getDeadlineRemainingMs(sellerDeadline);
    if (ms <= 0) return 'Expired';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UTILITY: Check return window
  // ──────────────────────────────────────────────────────────────────────────
  async isWithinReturnWindow(orderDbId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('created_at, shipment_status, shipments:order_shipments(delivered_at, created_at)')
        .eq('id', orderDbId)
        .single();

      if (error || !data) return false;
      if (data.shipment_status !== 'delivered' && data.shipment_status !== 'received') return false;

      const shipments: Array<{ delivered_at?: string | null; created_at?: string | null }> =
        (data as any).shipments ?? [];
      const deliveredAt = shipments
        .map((s) => s.delivered_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
      const shipmentCreatedAt = shipments
        .map((s) => s.created_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
      const baseline = new Date(deliveredAt || shipmentCreatedAt || data.created_at);
      const deadline = new Date(baseline);
      deadline.setDate(deadline.getDate() + RETURN_WINDOW_DAYS);

      return new Date() <= deadline;
    } catch {
      return false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Transform DB row → MobileReturnRequest
  // ──────────────────────────────────────────────────────────────────────────
  private transform(row: any, orderObj?: any): MobileReturnRequest {
    const order = orderObj || row.order;
    let status: ReturnStatus = row.status || 'pending';
    if (!row.status || row.status === 'pending') {
      if (row.refund_date) status = 'refunded';
      else if (row.is_returnable === false) status = 'rejected';
    }

    return {
      id: row.id,
      orderId: row.order_id,
      buyerId: order?.buyer_id,
      isReturnable: row.is_returnable ?? true,
      returnWindowDays: row.return_window_days ?? RETURN_WINDOW_DAYS,
      returnReason: row.return_reason ?? null,
      refundAmount: row.refund_amount ? parseFloat(String(row.refund_amount)) : null,
      refundDate: row.refund_date ?? null,
      createdAt: row.created_at,
      status,
      returnType: row.return_type || 'return_refund',
      resolutionPath: row.resolution_path || 'seller_review',
      description: row.description ?? null,
      evidenceUrls: row.evidence_urls ?? [],
      itemsJson: row.items_json ?? null,
      sellerNote: row.seller_note ?? null,
      rejectedReason: row.rejected_reason ?? null,
      counterOfferAmount: row.counter_offer_amount ? parseFloat(String(row.counter_offer_amount)) : null,
      sellerDeadline: row.seller_deadline ?? null,
      escalatedAt: row.escalated_at ?? null,
      resolvedAt: row.resolved_at ?? null,
      resolvedBy: row.resolved_by ?? null,
      returnLabelUrl: row.return_label_url ?? null,
      returnTrackingNumber: row.return_tracking_number ?? null,
      buyerShippedAt: row.buyer_shipped_at ?? null,
      returnReceivedAt: row.return_received_at ?? null,
    };
  }
}

export const returnService = new ReturnService();
