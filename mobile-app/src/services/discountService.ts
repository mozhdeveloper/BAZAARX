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
  ActiveDiscount,
  DiscountType
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
            starts_at: campaign.startsAt?.toISOString(),
            ends_at: campaign.endsAt?.toISOString(),
            badge_text: campaign.badgeText,
            badge_color: campaign.badgeColor || '#FF6A00',
            priority: campaign.priority || 0,
            claim_limit: campaign.claimLimit,
            per_customer_limit: campaign.perCustomerLimit || 1,
            applies_to: campaign.appliesTo || 'specific_products'
          } as any
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
          starts_at: updates.startsAt?.toISOString(),
          ends_at: updates.endsAt?.toISOString(),
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
          product:products (
            id,
            name,
            price,
            seller_id,
            images:product_images (image_url, is_primary, sort_order),
            variants:product_variants (stock),
            seller:sellers!products_seller_id_fkey (id, store_name, verified_at),
            category:categories!products_category_id_fkey (name)
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
   * Get all active flash sale products across all active flash sale campaigns
   */
  async getFlashSaleProducts(): Promise<any[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      // 1. Fetch active flash sale campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('discount_campaigns')
        .select('*')
        .eq('campaign_type', 'flash_sale')
        .eq('status', 'active')
        .lte('starts_at', new Date().toISOString())
        .gte('ends_at', new Date().toISOString())
        .order('priority', { ascending: false });

      if (campaignsError) throw campaignsError;
      if (!campaigns || campaigns.length === 0) return [];

      const campaignIds = campaigns.map(c => c.id);

      // 2. Fetch products in these campaigns
      const { data: productDiscounts, error: pError } = await supabase
        .from('product_discounts')
        .select(`
          *,
          campaign:discount_campaigns(*),
          product:products (
            id,
            name,
            price,
            seller_id,
            images:product_images (image_url, is_primary, sort_order),
            variants:product_variants (stock, price),
            seller:sellers!products_seller_id_fkey (id, store_name, verified_at),
            category:categories!products_category_id_fkey (name)
          )
        `)
        .in('campaign_id', campaignIds);

      if (pError) throw pError;

      // Fetch real sold counts from the product_sold_counts view
      const productIds = (productDiscounts || []).map((pd: any) => pd.product?.id).filter(Boolean);
      const soldCountsMap = new Map<string, number>();
      if (productIds.length > 0) {
        const { data: soldData } = await supabase
          .from('product_sold_counts')
          .select('product_id, sold_count')
          .in('product_id', productIds);
        (soldData || []).forEach((row: any) => {
          soldCountsMap.set(row.product_id, row.sold_count || 0);
        });
      }

      // 3. Transform into generic product objects for UI
      return (productDiscounts || []).map(pd => {
        const p = pd.product as any;
        const c = pd.campaign as any;

        // Lowest price across product and all its variants (mirrors web behavior)
        // This shows the "starting from" price on the card, same as web
        let basePrice = Number(p.price) || 0;
        if (p.variants && p.variants.length > 0) {
          const variantPrices = (p.variants as any[])
            .map((v: any) => Number(v.price))
            .filter((vp: number) => !isNaN(vp) && vp > 0);
          if (variantPrices.length > 0) {
            basePrice = Math.min(basePrice, ...variantPrices);
          }
        }

        // Calculate discounted price — NO maxDiscountAmount cap applied here
        // (matches web formula exactly; cap is only shown as a tooltip)
        const dType = pd.discount_type || c.discount_type;
        const dValue = Number(pd.discount_value || c.discount_value);
        let discountedPrice = basePrice;

        if (dType === 'percentage') {
          discountedPrice = Math.round(basePrice * (1 - dValue / 100));
          // Note: c.max_discount_amount is intentionally NOT applied — web doesn't apply it
        } else if (dType === 'fixed_amount') {
          discountedPrice = Math.max(0, basePrice - dValue);
        }

        // Tooltip text for max cap (display only, not used in price math)
        const discountBadgePercent = dType === 'percentage' ? Math.round(dValue) : undefined;
        const discountBadgeTooltip = (dType === 'percentage' && c.max_discount_amount)
          ? `Up to ₱${Number(c.max_discount_amount).toLocaleString()} off`
          : undefined;

        // Get primary image
        const images = p.images || [];
        const primaryImg = images.find((i: any) => i.is_primary)?.image_url || images[0]?.image_url || '';

        const totalStock = (p.variants || []).reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
        const campaignSold = (pd.sold_count as number) || 0;
        const soldCount = soldCountsMap.get(p.id) || campaignSold || 0;

        return {
          id: p.id,
          name: p.name,
          price: discountedPrice,
          originalPrice: basePrice,
          image: primaryImg,
          images: images.map((i: any) => i.image_url),
          seller: p.seller?.store_name || 'Generic Store',
          sellerId: p.seller_id,
          sellerVerified: !!p.seller?.verified_at,
          category: p.category?.name || 'General',
          stock: totalStock,
          sold: soldCount,
          campaignSold: campaignSold,
          campaignBadge: c.badge_text,
          campaignBadgeColor: c.badge_color,
          campaignName: c.name,
          campaignEndsAt: c.ends_at,
          campaignDiscountType: dType,
          campaignDiscountValue: discountBadgePercent,
          discountBadgePercent,
          discountBadgeTooltip,
        };
      });
    } catch (error) {
      console.error('Error fetching flash sale products:', error);
      return [];
    }
  }

  /**
   * Get all active global flash sale products (from global_flash_sale_slots and approved submissions)
   * This is the CORRECT method that matches admin data
   */
  async getGlobalFlashSaleProducts(): Promise<any[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const now = new Date().toISOString();

      // 1. Fetch active global slots
      const { data: slots, error: slotsError } = await supabase
        .from('global_flash_sale_slots')
        .select('*')
        .eq('status', 'active')
        .lte('start_time', now)
        .gte('end_time', now);

      if (slotsError) throw slotsError;
      if (!slots || slots.length === 0) return [];

      const slotIds = slots.map((s: any) => s.id);

      // 2. Fetch approved submissions for these slots
      const { data: submissions, error: subError } = await supabase
        .from('flash_sale_submissions')
        .select(`
          *,
          product:products (
            id,
            name,
            price,
            seller_id,
            images:product_images (image_url, is_primary, sort_order),
            variants:product_variants (stock, price),
            seller:sellers!products_seller_id_fkey (id, store_name, verified_at),
            category:categories!products_category_id_fkey (name)
          )
        `)
        .in('slot_id', slotIds)
        .eq('status', 'approved');

      if (subError) throw subError;

      // 3. Fetch real sold counts from the product_sold_counts view
      const productIds = (submissions || [])
        .map((sub: any) => sub.product?.id)
        .filter(Boolean);
      const soldCountsMap = new Map<string, number>();
      if (productIds.length > 0) {
        const { data: soldData } = await supabase
          .from('product_sold_counts')
          .select('product_id, sold_count')
          .in('product_id', productIds);
        (soldData || []).forEach((row: any) => {
          soldCountsMap.set(row.product_id, row.sold_count || 0);
        });
      }

      // 4. Map to product display objects
      const slotMap = new Map(slots.map((s: any) => [s.id, s]));

      return (submissions || []).map((sub: any) => {
        const p = sub.product as any;
        const slot = slotMap.get(sub.slot_id) as any;
        const basePrice = Number(sub.submitted_price) || Number(p?.price) || 0;
        const originalPrice = Number(p?.price) || 0;
        const discountPct = originalPrice > 0 ? Math.round((1 - basePrice / originalPrice) * 100) : 0;

        // Get primary image
        const images = p?.images || [];
        const primaryImg = images.find((i: any) => i.is_primary)?.image_url || images[0]?.image_url || '';

        const totalStock = (p?.variants || []).reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
        const soldCount = soldCountsMap.get(p?.id) || 0;

        return {
          id: p?.id,
          name: p?.name,
          price: basePrice,
          originalPrice,
          image: primaryImg,
          images: images.map((i: any) => i.image_url),
          seller: p?.seller?.store_name || 'Store',
          sellerId: p?.seller_id,
          sellerVerified: !!p?.seller?.verified_at,
          category: p?.category?.name || 'General',
          stock: totalStock,
          sold: soldCount,
          campaignId: sub.slot_id,
          campaignName: slot?.name || 'Flash Sale',
          campaignBadgeColor: '#FF6A00',
          campaignEndsAt: slot?.end_time,
          campaignDiscountType: discountPct > 0 ? 'percentage' : undefined,
          campaignDiscountValue: discountPct > 0 ? discountPct : undefined,
          discountBadgePercent: discountPct > 0 ? discountPct : undefined,
          // Include activeCampaignDiscount so ProductDetail can apply it to cart
          activeCampaignDiscount: discountPct > 0 ? {
            campaignId: sub.slot_id,
            campaignName: slot?.name || 'Flash Sale',
            discountType: 'percentage' as const,
            discountValue: discountPct,
            discountedPrice: basePrice,
            originalPrice: originalPrice,
            badgeText: `${discountPct}% OFF`,
            badgeColor: '#FF6A00',
            endsAt: new Date(slot?.end_time || Date.now())
          } : undefined,
        };
      });
    } catch (error) {
      console.error('Error fetching global flash sale products:', error);
      return [];
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

      // Pre-compute the discounted price WITHOUT applying the max_discount_amount cap
      // (matches web's calculateLineDiscount which never applies the cap).
      const originalPrice = parseFloat(String(discount.original_price));
      const discountValue = parseFloat(String(discount.discount_value));
      const discountType = discount.discount_type;
      let discountedPrice = originalPrice;
      if (discountType === 'percentage') {
        discountedPrice = Math.round(originalPrice * (1 - discountValue / 100));
      } else if (discountType === 'fixed_amount') {
        discountedPrice = Math.max(0, originalPrice - discountValue);
      }

      return {
        campaignId: discount.campaign_id,
        campaignName: discount.campaign_name,
        discountType: discountType as DiscountType,
        discountValue: discountValue,
        maxDiscountAmount: campaignMeta?.max_discount_amount != null
          ? parseFloat(String(campaignMeta.max_discount_amount))
          : undefined,
        discountedPrice: discountedPrice,
        originalPrice: originalPrice,
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

    // NOTE: maxDiscountAmount is stored on the object for tooltip display only.
    // It is NOT applied here so that price computation matches the web exactly.
    const discountPerUnit = Math.min(normalizedUnitPrice, Math.max(0, rawDiscountPerUnit));
    const discountedUnitPrice = Math.round(Math.max(0, normalizedUnitPrice - discountPerUnit));
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
      const { data, error } = await (supabase as any)
        .from('discount_usage')
        .insert([
          {
            campaign_id: usage.campaignId,
            product_discount_id: usage.productDiscountId,
            buyer_id: usage.buyerId,
            order_id: usage.orderId,
            product_id: usage.productId,
            discount_amount: usage.discountAmount,
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
      const { data, error } = await (supabase as any)
        .from('discount_usage')
        .select('*')
        .eq('campaign_id', campaignId);

      if (error) throw error;

      const totalUsage = data?.length || 0;
      const totalRevenue = (data || []).reduce((sum: number, usage: any) => sum + parseFloat(usage.discounted_price) * usage.quantity, 0);
      const totalDiscount = (data || []).reduce((sum: number, usage: any) => sum + parseFloat(usage.discount_amount) * usage.quantity, 0);
      const uniqueCustomers = new Set((data || []).map((usage: any) => usage.buyer_id)).size;

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
