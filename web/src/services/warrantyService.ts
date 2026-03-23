/**
 * Warranty Service for BazaarX
 * Handles warranty calculations, claims, and business logic
 */

import { supabase } from '@/lib/supabase';
import type {
  WarrantyClaim,
  WarrantyActionLog,
  WarrantyClaimType,
  WarrantyClaimStatus,
  WarrantyActionType,
  Product,
  OrderItem,
} from '@/types/database.types';

// ============================================================================
// TYPES
// ============================================================================

export interface WarrantyInfo {
  hasWarranty: boolean;
  warrantyType: string;
  warrantyDurationMonths: number;
  warrantyProviderName: string | null;
  warrantyProviderContact: string | null;
  warrantyProviderEmail: string | null;
  warrantyTermsUrl: string | null;
  warrantyPolicy: string | null;
}

export interface WarrantyStatus {
  isActive: boolean;
  isExpired: boolean;
  startDate: string | null;
  expirationDate: string | null;
  daysRemaining: number | null;
  warrantyType: string | null;
  canClaim: boolean;
}

export interface CreateWarrantyClaimInput {
  orderItemId: string;
  reason: string;
  description?: string;
  claimType: WarrantyClaimType;
  evidenceUrls?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface UpdateWarrantyClaimInput {
  claimId: string;
  status?: WarrantyClaimStatus;
  sellerResponse?: string;
  resolutionType?: WarrantyClaimType;
  resolutionDescription?: string;
  resolutionAmount?: number;
  returnTrackingNumber?: string;
  returnShippingCarrier?: string;
  replacementTrackingNumber?: string;
  replacementShippingCarrier?: string;
  adminNotes?: string;
}

export interface WarrantyClaimFilter {
  buyerId?: string;
  sellerId?: string;
  status?: WarrantyClaimStatus;
  claimType?: WarrantyClaimType;
  orderItemId?: string;
  page?: number;
  limit?: number;
}

export interface WarrantyActionInput {
  warrantyClaimId?: string;
  orderItemId?: string;
  actionType: WarrantyActionType;
  actorId: string | null;
  actorRole: 'buyer' | 'seller' | 'admin' | 'system';
  description?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const WARRANTY_TYPE_LABELS: Record<string, string> = {
  local_manufacturer: 'Local Manufacturer Warranty',
  international_manufacturer: 'International Manufacturer Warranty',
  shop_warranty: 'Shop Warranty',
  no_warranty: 'No Warranty',
};

export const WARRANTY_CLAIM_STATUS_LABELS: Record<WarrantyClaimStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  repair_in_progress: 'Repair in Progress',
  replacement_sent: 'Replacement Sent',
  refund_processed: 'Refund Processed',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

export const WARRANTY_CLAIM_TYPE_LABELS: Record<WarrantyClaimType, string> = {
  repair: 'Repair',
  replacement: 'Replacement',
  refund: 'Refund',
  technical_support: 'Technical Support',
};

// ============================================================================
// WARRANTY SERVICE
// ============================================================================

export const warrantyService = {
  // --------------------------------------------------------------------------
  // Product Warranty Information
  // --------------------------------------------------------------------------

  /**
   * Get warranty information for a product
   */
  async getProductWarranty(productId: string): Promise<WarrantyInfo | null> {


    const { data, error } = await supabase
      .from('products')
      .select(`
        has_warranty,
        warranty_type,
        warranty_duration_months,
        warranty_provider_name,
        warranty_provider_contact,
        warranty_provider_email,
        warranty_terms_url,
        warranty_policy
      `)
      .eq('id', productId)
      .single();

    if (error || !data) {
      console.error('Error fetching product warranty:', error);
      return null;
    }

    return {
      hasWarranty: data.has_warranty,
      warrantyType: data.warranty_type,
      warrantyDurationMonths: data.warranty_duration_months,
      warrantyProviderName: data.warranty_provider_name,
      warrantyProviderContact: data.warranty_provider_contact,
      warrantyProviderEmail: data.warranty_provider_email,
      warrantyTermsUrl: data.warranty_terms_url,
      warrantyPolicy: data.warranty_policy,
    };
  },

  /**
   * Get warranty information for multiple products
   */
  async getProductsWarranty(productIds: string[]): Promise<Map<string, WarrantyInfo>> {

    const warrantyMap = new Map<string, WarrantyInfo>();

    if (productIds.length === 0) return warrantyMap;

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        has_warranty,
        warranty_type,
        warranty_duration_months,
        warranty_provider_name,
        warranty_provider_contact,
        warranty_provider_email,
        warranty_terms_url,
        warranty_policy
      `)
      .in('id', productIds);

    if (error) {
      console.error('Error fetching products warranty:', error);
      return warrantyMap;
    }

    data.forEach((product) => {
      warrantyMap.set(product.id, {
        hasWarranty: product.has_warranty,
        warrantyType: product.warranty_type,
        warrantyDurationMonths: product.warranty_duration_months,
        warrantyProviderName: product.warranty_provider_name,
        warrantyProviderContact: product.warranty_provider_contact,
        warrantyProviderEmail: product.warranty_provider_email,
        warrantyTermsUrl: product.warranty_terms_url,
        warrantyPolicy: product.warranty_policy,
      });
    });

    return warrantyMap;
  },

  // --------------------------------------------------------------------------
  // Order Item Warranty Status
  // --------------------------------------------------------------------------

  /**
   * Calculate warranty status for an order item
   */
  async getOrderItemWarrantyStatus(orderItemId: string): Promise<WarrantyStatus | null> {


    const { data, error } = await supabase
      .from('order_items')
      .select(`
        warranty_start_date,
        warranty_expiration_date,
        warranty_type,
        warranty_duration_months
      `)
      .eq('id', orderItemId)
      .single();

    if (error || !data) {
      console.error('Error fetching order item warranty:', error);
      return null;
    }

    // No warranty
    if (!data.warranty_type || data.warranty_type === 'no_warranty' || !data.warranty_expiration_date) {
      return {
        isActive: false,
        isExpired: false,
        startDate: null,
        expirationDate: null,
        daysRemaining: null,
        warrantyType: null,
        canClaim: false,
      };
    }

    const now = new Date();
    const expirationDate = new Date(data.warranty_expiration_date);
    const startDate = data.warranty_start_date ? new Date(data.warranty_start_date) : null;
    const isExpired = now > expirationDate;
    const isActive = !isExpired && startDate !== null && now >= startDate;

    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (isActive) {
      const diffTime = expirationDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Can claim if warranty is active and not expired
    const canClaim = isActive && !isExpired;

    return {
      isActive,
      isExpired,
      startDate: data.warranty_start_date,
      expirationDate: data.warranty_expiration_date,
      daysRemaining,
      warrantyType: data.warranty_type,
      canClaim,
    };
  },

  /**
   * Get warranty status for multiple order items
   */
  async getOrderItemsWarrantyStatus(orderItemIds: string[]): Promise<Map<string, WarrantyStatus>> {

    const statusMap = new Map<string, WarrantyStatus>();

    if (orderItemIds.length === 0) return statusMap;

    const { data, error } = await supabase
      .from('order_items')
      .select(`
        id,
        warranty_start_date,
        warranty_expiration_date,
        warranty_type,
        warranty_duration_months
      `)
      .in('id', orderItemIds);

    if (error) {
      console.error('Error fetching order items warranty:', error);
      return statusMap;
    }

    const now = new Date();

    data.forEach((item) => {
      if (!item.warranty_type || item.warranty_type === 'no_warranty' || !item.warranty_expiration_date) {
        statusMap.set(item.id, {
          isActive: false,
          isExpired: false,
          startDate: null,
          expirationDate: null,
          daysRemaining: null,
          warrantyType: null,
          canClaim: false,
        });
        return;
      }

      const expirationDate = new Date(item.warranty_expiration_date);
      const startDate = item.warranty_start_date ? new Date(item.warranty_start_date) : null;
      const isExpired = now > expirationDate;
      const isActive = !isExpired && startDate !== null && now >= startDate;

      let daysRemaining: number | null = null;
      if (isActive) {
        const diffTime = expirationDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      statusMap.set(item.id, {
        isActive,
        isExpired,
        startDate: item.warranty_start_date,
        expirationDate: item.warranty_expiration_date,
        daysRemaining,
        warrantyType: item.warranty_type,
        canClaim: isActive && !isExpired,
      });
    });

    return statusMap;
  },

  // --------------------------------------------------------------------------
  // Warranty Claims Management
  // --------------------------------------------------------------------------

  /**
   * Create a new warranty claim
   */
  async createWarrantyClaim(
    input: CreateWarrantyClaimInput,
    buyerId: string
  ): Promise<{ success: boolean; claim?: WarrantyClaim; error?: string }> {


    try {
      // Get order item details to fetch seller_id
      const { data: orderItem, error: orderItemError } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          warranty_type,
          warranty_expiration_date,
          warranty_claimed
        `)
        .eq('id', input.orderItemId)
        .single();

      if (orderItemError || !orderItem) {
        return { success: false, error: 'Order item not found' };
      }

      // Check if warranty already claimed
      if (orderItem.warranty_claimed) {
        return { success: false, error: 'Warranty already claimed for this item' };
      }

      // Check warranty status
      const warrantyStatus = await this.getOrderItemWarrantyStatus(input.orderItemId);
      if (!warrantyStatus?.canClaim) {
        return {
          success: false,
          error: warrantyStatus?.isExpired
            ? 'Warranty has expired'
            : 'Warranty is not active yet',
        };
      }

      // Get seller_id from the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('seller_id')
        .eq('id', orderItem.order_id)
        .single();

      if (orderError || !order?.seller_id) {
        return { success: false, error: 'Failed to get seller information' };
      }

      // Create the warranty claim
      const { data: claim, error: claimError } = await supabase
        .from('warranty_claims')
        .insert({
          order_item_id: input.orderItemId,
          buyer_id: buyerId,
          seller_id: order.seller_id,
          reason: input.reason,
          description: input.description,
          claim_type: input.claimType,
          evidence_urls: input.evidenceUrls || [],
          priority: input.priority || 'normal',
          status: 'pending',
        })
        .select(`
          *,
          order_item:order_items(*),
          buyer:buyers(*, profiles:profiles(*)),
          seller:sellers(*)
        `)
        .single();

      if (claimError) {
        console.error('Error creating warranty claim:', claimError);
        return { success: false, error: claimError.message };
      }

      // Update order item to mark as claimed
      await supabase
        .from('order_items')
        .update({
          warranty_claimed: true,
          warranty_claimed_at: new Date().toISOString(),
          warranty_claim_status: 'pending',
          warranty_claim_reason: input.reason,
        })
        .eq('id', input.orderItemId);

      // Log the action
      await this.logWarrantyAction({
        warrantyClaimId: claim.id,
        actionType: 'claim_created',
        actorId: buyerId,
        actorRole: 'buyer',
        description: `Warranty claim created: ${input.reason}`,
        metadata: { claimType: input.claimType, priority: input.priority || 'normal' },
      });

      return { success: true, claim };
    } catch (error) {
      console.error('Unexpected error creating warranty claim:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get warranty claim by ID
   */
  async getWarrantyClaim(claimId: string): Promise<WarrantyClaim | null> {


    const { data, error } = await supabase
      .from('warranty_claims')
      .select(`
        *,
        order_item:order_items(*),
        buyer:buyers(*, profiles:profiles(*)),
        seller:sellers(*)
      `)
      .eq('id', claimId)
      .single();

    if (error || !data) {
      console.error('Error fetching warranty claim:', error);
      return null;
    }

    return data as WarrantyClaim;
  },

  /**
   * Get warranty claims with filters
   */
  async getWarrantyClaims(
    filter: WarrantyClaimFilter
  ): Promise<{ claims: WarrantyClaim[]; total: number }> {

    let query = supabase.from('warranty_claims').select(`
      *,
      order_item:order_items(*),
      buyer:buyers(*, profiles:profiles(*)),
      seller:sellers(*)
    `, { count: 'exact' });

    if (filter.buyerId) {
      query = query.eq('buyer_id', filter.buyerId);
    }

    if (filter.sellerId) {
      query = query.eq('seller_id', filter.sellerId);
    }

    if (filter.status) {
      query = query.eq('status', filter.status);
    }

    if (filter.claimType) {
      query = query.eq('claim_type', filter.claimType);
    }

    if (filter.orderItemId) {
      query = query.eq('order_item_id', filter.orderItemId);
    }

    // Pagination
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching warranty claims:', error);
      return { claims: [], total: 0 };
    }

    return { claims: data as WarrantyClaim[], total: count || 0 };
  },

  /**
   * Update warranty claim (for sellers and admins)
   */
  async updateWarrantyClaim(
    input: UpdateWarrantyClaimInput,
    updaterId: string,
    updaterRole: 'seller' | 'admin'
  ): Promise<{ success: boolean; claim?: WarrantyClaim; error?: string }> {


    try {
      const updateData: Partial<WarrantyClaim> = {};

      if (input.status !== undefined) updateData.status = input.status;
      if (input.sellerResponse !== undefined) {
        updateData.seller_response = input.sellerResponse;
        updateData.seller_response_at = new Date().toISOString();
      }
      if (input.resolutionType !== undefined) updateData.resolution_type = input.resolutionType;
      if (input.resolutionDescription !== undefined)
        updateData.resolution_description = input.resolutionDescription;
      if (input.resolutionAmount !== undefined) updateData.resolution_amount = input.resolutionAmount;
      if (input.returnTrackingNumber !== undefined)
        updateData.return_tracking_number = input.returnTrackingNumber;
      if (input.returnShippingCarrier !== undefined)
        updateData.return_shipping_carrier = input.returnShippingCarrier;
      if (input.replacementTrackingNumber !== undefined)
        updateData.replacement_tracking_number = input.replacementTrackingNumber;
      if (input.replacementShippingCarrier !== undefined)
        updateData.replacement_shipping_carrier = input.replacementShippingCarrier;
      if (input.adminNotes !== undefined) updateData.admin_notes = input.adminNotes;

      if (input.status === 'resolved' || input.status === 'refund_processed') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = updaterRole === 'admin' ? updaterId : null;
      }

      const { data: claim, error: updateError } = await supabase
        .from('warranty_claims')
        .update(updateData)
        .eq('id', input.claimId)
        .select(`
          *,
          order_item:order_items(*),
          buyer:buyers(*, profiles:profiles(*)),
          seller:sellers(*)
        `)
        .single();

      if (updateError) {
        console.error('Error updating warranty claim:', updateError);
        return { success: false, error: updateError.message };
      }

      // Log the action
      let actionType: WarrantyActionType = 'claim_reviewed';
      if (input.status === 'approved') actionType = 'claim_approved';
      if (input.status === 'rejected') actionType = 'claim_rejected';
      if (input.status === 'repair_in_progress') actionType = 'repair_started';
      if (input.status === 'replacement_sent') actionType = 'replacement_shipped';
      if (input.status === 'refund_processed') actionType = 'refund_initiated';
      if (input.status === 'resolved') actionType = 'claim_resolved';

      await this.logWarrantyAction({
        warrantyClaimId: input.claimId,
        actionType,
        actorId: updaterId,
        actorRole: updaterRole,
        description: `Claim ${input.status || 'updated'} by ${updaterRole}`,
        metadata: { resolutionType: input.resolutionType, resolutionAmount: input.resolutionAmount },
      });

      return { success: true, claim };
    } catch (error) {
      console.error('Unexpected error updating warranty claim:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Cancel a warranty claim (buyer can cancel their pending claims)
   */
  async cancelWarrantyClaim(
    claimId: string,
    buyerId: string
  ): Promise<{ success: boolean; error?: string }> {


    // Verify the claim belongs to the buyer
    const { data: claim, error: fetchError } = await supabase
      .from('warranty_claims')
      .select('buyer_id, status')
      .eq('id', claimId)
      .single();

    if (fetchError || !claim) {
      return { success: false, error: 'Claim not found' };
    }

    if (claim.buyer_id !== buyerId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Can only cancel pending or under_review claims
    if (!['pending', 'under_review'].includes(claim.status)) {
      return { success: false, error: 'Cannot cancel claim in current status' };
    }

    const { error: updateError } = await supabase
      .from('warranty_claims')
      .update({
        status: 'cancelled',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', claimId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Log the action
    await this.logWarrantyAction({
      warrantyClaimId: claimId,
      actionType: 'claim_cancelled',
      actorId: buyerId,
      actorRole: 'buyer',
      description: 'Claim cancelled by buyer',
    });

    // Update order item
    await supabase
      .from('order_items')
      .update({
        warranty_claimed: false,
        warranty_claimed_at: null,
        warranty_claim_status: null,
        warranty_claim_reason: null,
      })
      .eq('id', claimId);

    return { success: true };
  },

  // --------------------------------------------------------------------------
  // Warranty Actions Log
  // --------------------------------------------------------------------------

  /**
   * Log a warranty action
   */
  async logWarrantyAction(input: WarrantyActionInput): Promise<{ success: boolean; error?: string }> {


    const { error } = await supabase.from('warranty_actions_log').insert({
      warranty_claim_id: input.warrantyClaimId,
      order_item_id: input.orderItemId,
      action_type: input.actionType,
      actor_id: input.actorId,
      actor_role: input.actorRole,
      description: input.description,
      metadata: input.metadata || {},
    });

    if (error) {
      console.error('Error logging warranty action:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Get warranty actions for a claim
   */
  async getWarrantyActions(
    warrantyClaimId: string
  ): Promise<{ actions: WarrantyActionLog[]; error?: string }> {


    const { data, error } = await supabase
      .from('warranty_actions_log')
      .select('*')
      .eq('warranty_claim_id', warrantyClaimId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching warranty actions:', error);
      return { actions: [], error: error.message };
    }

    return { actions: data as WarrantyActionLog[] };
  },

  // --------------------------------------------------------------------------
  // Warranty Analytics
  // --------------------------------------------------------------------------

  /**
   * Get warranty statistics for a seller
   */
  async getSellerWarrantyStats(sellerId: string): Promise<{
    totalClaims: number;
    pendingClaims: number;
    approvedClaims: number;
    rejectedClaims: number;
    resolvedClaims: number;
    avgResolutionDays: number | null;
  }> {


    // Get total claims
    const { count: totalClaims } = await supabase
      .from('warranty_claims')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId);

    // Get claims by status
    const { count: pendingClaims } = await supabase
      .from('warranty_claims')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'pending');

    const { count: approvedClaims } = await supabase
      .from('warranty_claims')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'approved');

    const { count: rejectedClaims } = await supabase
      .from('warranty_claims')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'rejected');

    const { count: resolvedClaims } = await supabase
      .from('warranty_claims')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'resolved');

    // Calculate average resolution days
    const { data: resolvedData } = await supabase
      .from('warranty_claims')
      .select('created_at, resolved_at')
      .eq('seller_id', sellerId)
      .eq('status', 'resolved')
      .not('resolved_at', 'is', null);

    let avgResolutionDays: number | null = null;
    if (resolvedData && resolvedData.length > 0) {
      const totalDays = resolvedData.reduce((acc, claim) => {
        const created = new Date(claim.created_at);
        const resolved = new Date(claim.resolved_at!);
        const diffTime = resolved.getTime() - created.getTime();
        return acc + Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }, 0);
      avgResolutionDays = Math.round(totalDays / resolvedData.length);
    }

    return {
      totalClaims: totalClaims || 0,
      pendingClaims: pendingClaims || 0,
      approvedClaims: approvedClaims || 0,
      rejectedClaims: rejectedClaims || 0,
      resolvedClaims: resolvedClaims || 0,
      avgResolutionDays,
    };
  },

  /**
   * Check if order items have active warranties (bulk check)
   */
  async checkActiveWarranties(orderItemIds: string[]): Promise<Map<string, boolean>> {
    const statusMap = await this.getOrderItemsWarrantyStatus(orderItemIds);
    const activeMap = new Map<string, boolean>();

    statusMap.forEach((status, itemId) => {
      activeMap.set(itemId, status.canClaim);
    });

    return activeMap;
  },

  /**
   * Get expiring warranties for a buyer (within 30 days)
   */
  async getExpiringWarranties(buyerId: string, daysThreshold: number = 30): Promise<{
    orderItems: Array<{
      orderItemId: string;
      productName: string;
      expirationDate: string;
      daysRemaining: number;
    }>;
  }> {

    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const { data, error } = await supabase
      .from('order_items')
      .select(`
        id,
        product_name,
        warranty_expiration_date,
        order_id
      `)
      .in(
        'order_id',
        supabase
          .from('orders')
          .select('id')
          .eq('buyer_id', buyerId)
      )
      .not('warranty_expiration_date', 'is', null)
      .gte('warranty_expiration_date', now.toISOString())
      .lte('warranty_expiration_date', thresholdDate.toISOString())
      .eq('warranty_claimed', false);

    if (error) {
      console.error('Error fetching expiring warranties:', error);
      return { orderItems: [] };
    }

    const orderItems = data.map((item) => {
      const expirationDate = new Date(item.warranty_expiration_date!);
      const diffTime = expirationDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        orderItemId: item.id,
        productName: item.product_name,
        expirationDate: item.warranty_expiration_date!,
        daysRemaining,
      };
    });

    return { orderItems };
  },
};

export default warrantyService;
