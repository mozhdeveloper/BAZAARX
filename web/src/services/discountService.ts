/**
 * Discount Service
 * Handles all discount-related database operations
 * Adheres to the Class-based Service Layer Architecture
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  DiscountCampaign,
  ProductDiscount,
  DiscountUsage,
  ActiveDiscount
} from '@/types/discount';

export class DiscountService {
  private static instance: DiscountService;

  private constructor() { }

  public static getInstance(): DiscountService {
    if (!DiscountService.instance) {
      DiscountService.instance = new DiscountService();
    }
    return DiscountService.instance;
  }

  // ============================================================================
  // DISCOUNT CAMPAIGNS
  // ============================================================================

  /**
   * Create a new campaign
   */
  async createCampaign(campaign: Partial<DiscountCampaign>): Promise<DiscountCampaign> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot create campaign');
    }

    try {
      const { data, error } = await supabase
        .from('discount_campaigns')
        .insert([
          {
            seller_id: campaign.sellerId,
            name: campaign.name,
            description: campaign.description,
            campaign_type: campaign.campaignType,
            discount_type: campaign.discountType,
            discount_value: campaign.discountValue,
            max_discount_amount: campaign.maxDiscountAmount,
            min_purchase_amount: campaign.minPurchaseAmount || 0,
            starts_at: campaign.startsAt,
            ends_at: campaign.endsAt,
            badge_text: campaign.badgeText,
            badge_color: campaign.badgeColor || '#FF6A00',
            priority: campaign.priority || 0,
            claim_limit: campaign.claimLimit,
            per_customer_limit: campaign.perCustomerLimit || 1,
            applies_to: campaign.appliesTo || 'specific_products'
          }
        ])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned upon campaign creation');

      return this.transformCampaign(data);
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create campaign.');
    }
  }

  /**
   * Get all campaigns for a seller
   */
  async getCampaignsBySeller(sellerId: string): Promise<DiscountCampaign[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch campaigns');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('discount_campaigns')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => this.transformCampaign(item));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw new Error('Failed to fetch campaigns.');
    }
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(sellerId: string): Promise<DiscountCampaign[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('discount_campaigns')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('status', 'active')
        .order('priority', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => this.transformCampaign(item));
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
      throw new Error('Failed to fetch active campaigns.');
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(campaignId: string, updates: Partial<DiscountCampaign>): Promise<DiscountCampaign> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot update campaign');
    }

    try {
      const { data, error } = await supabase
        .from('discount_campaigns')
        .update({
          name: updates.name,
          description: updates.description,
          campaign_type: updates.campaignType,
          discount_type: updates.discountType,
          discount_value: updates.discountValue,
          max_discount_amount: updates.maxDiscountAmount,
          min_purchase_amount: updates.minPurchaseAmount,
          starts_at: updates.startsAt,
          ends_at: updates.endsAt,
          status: updates.status,
          badge_text: updates.badgeText,
          badge_color: updates.badgeColor,
          priority: updates.priority,
          claim_limit: updates.claimLimit,
          per_customer_limit: updates.perCustomerLimit,
          applies_to: updates.appliesTo
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned upon campaign update');

      return this.transformCampaign(data);
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update campaign.');
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot delete campaign');
    }

    try {
      const { error } = await supabase
        .from('discount_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw new Error('Failed to delete campaign.');
    }
  }

  /**
   * Pause/Resume campaign
   */
  async toggleCampaignStatus(campaignId: string, pause: boolean): Promise<DiscountCampaign> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .from('discount_campaigns')
        .update({ status: pause ? 'paused' : 'active' })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned upon status toggle');

      return this.transformCampaign(data);
    } catch (error) {
      console.error('Error toggling campaign status:', error);
      throw new Error('Failed to update campaign status.');
    }
  }

  /**
   * Deactivate campaign (soft stop)
   */
  async deactivateCampaign(campaignId: string): Promise<DiscountCampaign> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .from('discount_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned upon campaign deactivation');

      return this.transformCampaign(data);
    } catch (error) {
      console.error('Error deactivating campaign:', error);
      throw new Error('Failed to deactivate campaign.');
    }
  }

  // ============================================================================
  // PRODUCT DISCOUNTS
  // ============================================================================

  /**
   * Add products to campaign
   */
  async addProductsToCampaign(
    campaignId: string,
    _sellerId: string,
    productIds: string[],
    overrides?: {
      productId: string;
      discountType?: string;
      discountValue?: number;
      discountedStock?: number;
    }[]
  ): Promise<ProductDiscount[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      // First, remove existing products for this campaign to avoid unique constraint errors
      await supabase
        .from('product_discounts')
        .delete()
        .eq('campaign_id', campaignId);

      // If no products selected, just return empty
      if (!productIds || productIds.length === 0) {
        return [];
      }

      const productDiscounts = productIds.map(productId => {
        const override = overrides?.find(o => o.productId === productId);
        return {
          campaign_id: campaignId,
          product_id: productId,
          // Deployed schema supports `discount_type`/`discount_value` only.
          // `discounted_stock`, override columns, and `seller_id` are not present.
          discount_type: override?.discountType ?? null,
          discount_value: override?.discountValue ?? null
        };
      });

      const { data, error } = await supabase
        .from('product_discounts')
        .insert(productDiscounts)
        .select();

      if (error) throw error;
      return (data || []).map(item => this.transformProductDiscount(item));
    } catch (error) {
      console.error('Error adding products to campaign:', error);
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message)
          : 'Failed to add products to campaign.';
      throw new Error(message);
    }
  }

  /**
   * Get products in campaign
   */
  async getProductsInCampaign(campaignId: string): Promise<ProductDiscount[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('product_discounts')
        .select(`
          *,
          campaign:discount_campaigns(*),
          product:products(
            id,
            name,
            price,
            product_images(image_url, is_primary, sort_order)
          )
        `)
        .eq('campaign_id', campaignId);

      if (error) throw error;
      return (data || []).map(item => this.transformProductDiscountWithProduct(item));
    } catch (error) {
      console.error('Error fetching products in campaign:', error);
      throw new Error('Failed to fetch campaign products.');
    }
  }

  /**
   * Remove product from campaign
   */
  async removeProductFromCampaign(productDiscountId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      const { error } = await supabase
        .from('product_discounts')
        .delete()
        .eq('id', productDiscountId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing product from campaign:', error);
      throw new Error('Failed to remove product from campaign.');
    }
  }

  /**
   * Get active discount for a product
   */
  async getActiveProductDiscount(productId: string): Promise<ActiveDiscount | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_active_product_discount', { p_product_id: productId });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const discount = data[0];
      const { data: campaignMeta } = await supabase
        .from('discount_campaigns')
        .select('max_discount_amount')
        .eq('id', discount.campaign_id)
        .maybeSingle();

      return {
        campaignId: discount.campaign_id,
        campaignName: discount.campaign_name,
        discountType: discount.discount_type,
        discountValue: parseFloat(discount.discount_value),
        maxDiscountAmount: campaignMeta?.max_discount_amount != null
          ? parseFloat(String(campaignMeta.max_discount_amount))
          : undefined,
        discountedPrice: parseFloat(discount.discounted_price),
        originalPrice: parseFloat(discount.original_price),
        badgeText: discount.badge_text,
        badgeColor: discount.badge_color,
        endsAt: new Date(discount.ends_at)
      };
    } catch (error) {
      console.error('Error fetching product discount:', error);
      throw new Error('Failed to get product discount.');
    }
  }

  /**
   * Get active discounts for multiple products.
   * Uses per-product RPC calls and returns only products with active discounts.
   */
  async getActiveDiscountsForProducts(productIds: string[]): Promise<Record<string, ActiveDiscount>> {
    const uniqueProductIds = [...new Set(productIds.filter(Boolean))];
    if (uniqueProductIds.length === 0) {
      return {};
    }

    const entries = await Promise.all(
      uniqueProductIds.map(async (productId) => {
        try {
          const discount = await this.getActiveProductDiscount(productId);
          return [productId, discount] as const;
        } catch (error) {
          console.warn(`Failed to fetch active discount for product ${productId}:`, error);
          return [productId, null] as const;
        }
      })
    );

    return entries.reduce<Record<string, ActiveDiscount>>((acc, [productId, discount]) => {
      if (discount) {
        acc[productId] = discount;
      }
      return acc;
    }, {});
  }

  /**
   * Calculate campaign line discount for a unit price and quantity.
   */
  calculateLineDiscount(
    unitPrice: number,
    quantity: number,
    activeDiscount: ActiveDiscount | null
  ): {
    discountPerUnit: number;
    discountTotal: number;
    discountedUnitPrice: number;
  } {
    const normalizedUnitPrice = Math.max(0, Number(unitPrice) || 0);
    const normalizedQty = Math.max(0, Number(quantity) || 0);

    if (!activeDiscount || normalizedUnitPrice <= 0 || normalizedQty <= 0) {
      return {
        discountPerUnit: 0,
        discountTotal: 0,
        discountedUnitPrice: normalizedUnitPrice
      };
    }

    let rawDiscountPerUnit = 0;
    if (activeDiscount.discountType === 'percentage') {
      rawDiscountPerUnit = (normalizedUnitPrice * activeDiscount.discountValue) / 100;
    } else if (activeDiscount.discountType === 'fixed_amount') {
      rawDiscountPerUnit = activeDiscount.discountValue;
    }

    if (
      activeDiscount.discountType === 'percentage' &&
      typeof activeDiscount.maxDiscountAmount === 'number'
    ) {
      rawDiscountPerUnit = Math.min(rawDiscountPerUnit, Math.max(0, activeDiscount.maxDiscountAmount));
    }

    const discountPerUnit = Math.min(normalizedUnitPrice, Math.max(0, rawDiscountPerUnit));
    const discountedUnitPrice = Math.max(0, normalizedUnitPrice - discountPerUnit);
    const discountTotal = discountPerUnit * normalizedQty;

    return {
      discountPerUnit,
      discountTotal,
      discountedUnitPrice
    };
  }

  // ============================================================================
  // DISCOUNT USAGE TRACKING
  // ============================================================================

  /**
   * Record discount usage
   */
  async recordUsage(usage: Partial<DiscountUsage>): Promise<Record<string, unknown> | null> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .from('discount_usage')
        .insert([
          {
            campaign_id: usage.campaignId,
            product_discount_id: usage.productDiscountId,
            buyer_id: usage.buyerId,
            order_id: usage.orderId,
            product_id: usage.productId,
            discount_amount: usage.discountAmount,
            original_price: usage.originalPrice,
            discounted_price: usage.discountedPrice,
            quantity: usage.quantity || 1
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording discount usage:', error);
      throw new Error('Failed to record discount usage.');
    }
  }

  /**
   * Get usage statistics for a campaign
   */
  async getCampaignUsageStats(campaignId: string): Promise<{
    totalUsage: number;
    totalRevenue: number;
    totalDiscount: number;
    uniqueCustomers: number;
  }> {
    if (!isSupabaseConfigured()) {
      return { totalUsage: 0, totalRevenue: 0, totalDiscount: 0, uniqueCustomers: 0 };
    }

    try {
      const { data, error } = await supabase
        .from('discount_usage')
        .select('*')
        .eq('campaign_id', campaignId);

      if (error) throw error;

      const totalUsage = data?.length || 0;
      const totalRevenue = (data || []).reduce((sum, usage) => sum + parseFloat(usage.discounted_price) * usage.quantity, 0);
      const totalDiscount = (data || []).reduce((sum, usage) => sum + parseFloat(usage.discount_amount) * usage.quantity, 0);
      const uniqueCustomers = new Set((data || []).map(usage => usage.buyer_id)).size;

      return {
        totalUsage,
        totalRevenue,
        totalDiscount,
        uniqueCustomers
      };
    } catch (error) {
      console.error('Error fetching campaign usage stats:', error);
      throw new Error('Failed to fetch campaign stats.');
    }
  }

  // ============================================================================
  // ADMIN FLASH SALES
  // ============================================================================

  /**
   * Get all flash sale campaigns (admin use — no seller filter)
   */
  async getAllFlashSales(): Promise<DiscountCampaign[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('discount_campaigns')
        .select('*')
        .eq('campaign_type', 'flash_sale')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => this.transformCampaign(item));
    } catch (error) {
      console.error('Error fetching flash sales:', error);
      throw new Error('Failed to fetch flash sales.');
    }
  }

  // ============================================================================
  // PRIVATE HELPER FUNCTIONS
  // ============================================================================

  private transformCampaign(data: Record<string, unknown>): DiscountCampaign {
    return {
      id: data.id as string,
      sellerId: data.seller_id as string,
      name: data.name as string,
      description: (data.description as string | null) || undefined,
      campaignType: data.campaign_type as DiscountCampaign['campaignType'],
      discountType: data.discount_type as DiscountCampaign['discountType'],
      discountValue: parseFloat(String(data.discount_value)),
      maxDiscountAmount: data.max_discount_amount ? parseFloat(String(data.max_discount_amount)) : undefined,
      minPurchaseAmount: parseFloat(String(data.min_purchase_amount || 0)),
      startsAt: new Date(data.starts_at as string),
      endsAt: new Date(data.ends_at as string),
      status: data.status as DiscountCampaign['status'],
      badgeText: (data.badge_text as string | null) || undefined,
      badgeColor: data.badge_color as string,
      priority: (data.priority as number) || 0,
      claimLimit: (data.claim_limit as number | null) || undefined,
      perCustomerLimit: (data.per_customer_limit as number) || 1,
      usageCount: (data.usage_count as number | undefined) ?? 0,
      appliesTo: data.applies_to as DiscountCampaign['appliesTo'],
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string)
    };
  }

  private transformProductDiscount(data: Record<string, unknown>): ProductDiscount {
    return {
      id: data.id as string,
      campaignId: data.campaign_id as string,
      productId: data.product_id as string,
      sellerId: '',
      overrideDiscountType: (data.discount_type as ProductDiscount['overrideDiscountType']) || undefined,
      overrideDiscountValue: data.discount_value ? parseFloat(String(data.discount_value)) : undefined,
      discountedStock: undefined,
      soldCount: (data.sold_count as number) || 0,
      priority: (data.priority as number) || 0,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string)
    };
  }

  private transformProductDiscountWithProduct(data: Record<string, unknown>): ProductDiscount {
    const base = this.transformProductDiscount(data);
    const product = data.product as {
      name?: string;
      price?: string | number;
      product_images?: { image_url?: string; is_primary?: boolean; sort_order?: number }[];
    } | undefined;

    const sortedImages = (product?.product_images || [])
      .slice()
      .sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
      });
    const productImage = sortedImages[0]?.image_url;

    return {
      ...base,
      campaign: data.campaign ? this.transformCampaign(data.campaign as Record<string, unknown>) : undefined,
      productName: product?.name,
      productImage,
      productPrice: product?.price ? parseFloat(String(product.price)) : undefined
    };
  }
}

export const discountService = DiscountService.getInstance();
