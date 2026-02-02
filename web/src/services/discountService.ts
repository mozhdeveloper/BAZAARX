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
            total_usage_limit: campaign.totalUsageLimit,
            per_customer_limit: campaign.perCustomerLimit || 1,
            applies_to: campaign.appliesTo || 'specific_products',
            applicable_categories: campaign.applicableCategories || []
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
        .eq('is_active', true)
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
          is_active: updates.isActive,
          badge_text: updates.badgeText,
          badge_color: updates.badgeColor,
          priority: updates.priority,
          total_usage_limit: updates.totalUsageLimit,
          per_customer_limit: updates.perCustomerLimit,
          applies_to: updates.appliesTo,
          applicable_categories: updates.applicableCategories
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

  // ============================================================================
  // PRODUCT DISCOUNTS
  // ============================================================================

  /**
   * Add products to campaign
   */
  async addProductsToCampaign(
    campaignId: string,
    sellerId: string,
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
      const productDiscounts = productIds.map(productId => {
        const override = overrides?.find(o => o.productId === productId);
        return {
          campaign_id: campaignId,
          product_id: productId,
          seller_id: sellerId,
          override_discount_type: override?.discountType,
          override_discount_value: override?.discountValue,
          discounted_stock: override?.discountedStock
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
      throw new Error('Failed to add products to campaign.');
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
          product:products(id, name, price, primary_image)
        `)
        .eq('campaign_id', campaignId)
        .eq('is_active', true);

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
      return {
        campaignId: discount.campaign_id,
        campaignName: discount.campaign_name,
        discountType: discount.discount_type,
        discountValue: parseFloat(discount.discount_value),
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

  // ============================================================================
  // DISCOUNT USAGE TRACKING
  // ============================================================================

  /**
   * Record discount usage
   */
  async recordUsage(usage: Partial<DiscountUsage>): Promise<any> {
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
  // PRIVATE HELPER FUNCTIONS
  // ============================================================================

  private transformCampaign(data: any): DiscountCampaign {
    return {
      id: data.id,
      sellerId: data.seller_id,
      name: data.name,
      description: data.description,
      campaignType: data.campaign_type,
      discountType: data.discount_type,
      discountValue: parseFloat(data.discount_value),
      maxDiscountAmount: data.max_discount_amount ? parseFloat(data.max_discount_amount) : undefined,
      minPurchaseAmount: parseFloat(data.min_purchase_amount || 0),
      startsAt: new Date(data.starts_at),
      endsAt: new Date(data.ends_at),
      status: data.status,
      isActive: data.is_active,
      badgeText: data.badge_text,
      badgeColor: data.badge_color,
      priority: data.priority,
      totalUsageLimit: data.total_usage_limit,
      perCustomerLimit: data.per_customer_limit,
      usageCount: data.usage_count,
      appliesTo: data.applies_to,
      applicableCategories: data.applicable_categories,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private transformProductDiscount(data: any): ProductDiscount {
    return {
      id: data.id,
      campaignId: data.campaign_id,
      productId: data.product_id,
      sellerId: data.seller_id,
      overrideDiscountType: data.override_discount_type,
      overrideDiscountValue: data.override_discount_value ? parseFloat(data.override_discount_value) : undefined,
      discountedStock: data.discounted_stock,
      soldCount: data.sold_count,
      priority: data.priority,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private transformProductDiscountWithProduct(data: any): ProductDiscount {
    const base = this.transformProductDiscount(data);
    return {
      ...base,
      campaign: data.campaign ? this.transformCampaign(data.campaign) : undefined,
      productName: data.product?.name,
      productImage: data.product?.primary_image,
      productPrice: data.product?.price ? parseFloat(data.product.price) : undefined
    };
  }
}

export const discountService = DiscountService.getInstance();
