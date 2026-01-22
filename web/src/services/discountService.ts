import { supabase } from '@/lib/supabase';
import type {
  DiscountCampaign,
  ProductDiscount,
  DiscountUsage,
  ActiveDiscount
} from '@/types/discount';

// ============================================================================
// DISCOUNT CAMPAIGNS
// ============================================================================

export const discountService = {
  // Create a new campaign
  async createCampaign(campaign: Partial<DiscountCampaign>) {
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
    return this.transformCampaign(data);
  },

  // Get all campaigns for a seller
  async getCampaignsBySeller(sellerId: string) {
    const { data, error } = await supabase
      .from('discount_campaigns')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.transformCampaign);
  },

  // Get active campaigns
  async getActiveCampaigns(sellerId: string) {
    const { data, error } = await supabase
      .from('discount_campaigns')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .eq('status', 'active')
      .order('priority', { ascending: false });

    if (error) throw error;
    return data.map(this.transformCampaign);
  },

  // Update campaign
  async updateCampaign(campaignId: string, updates: Partial<DiscountCampaign>) {
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
    return this.transformCampaign(data);
  },

  // Delete campaign
  async deleteCampaign(campaignId: string) {
    const { error } = await supabase
      .from('discount_campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) throw error;
  },

  // Pause/Resume campaign
  async toggleCampaignStatus(campaignId: string, pause: boolean) {
    const { data, error } = await supabase
      .from('discount_campaigns')
      .update({ status: pause ? 'paused' : 'active' })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) throw error;
    return this.transformCampaign(data);
  },

  // ============================================================================
  // PRODUCT DISCOUNTS
  // ============================================================================

  // Add products to campaign
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
  ) {
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
    return data.map(this.transformProductDiscount);
  },

  // Get products in campaign
  async getProductsInCampaign(campaignId: string) {
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
    return data.map(this.transformProductDiscountWithProduct);
  },

  // Remove product from campaign
  async removeProductFromCampaign(productDiscountId: string) {
    const { error } = await supabase
      .from('product_discounts')
      .delete()
      .eq('id', productDiscountId);

    if (error) throw error;
  },

  // Get active discount for a product
  async getActiveProductDiscount(productId: string): Promise<ActiveDiscount | null> {
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
  },

  // ============================================================================
  // DISCOUNT USAGE TRACKING
  // ============================================================================

  // Record discount usage
  async recordUsage(usage: Partial<DiscountUsage>) {
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
  },

  // Get usage statistics for a campaign
  async getCampaignUsageStats(campaignId: string) {
    const { data, error } = await supabase
      .from('discount_usage')
      .select('*')
      .eq('campaign_id', campaignId);

    if (error) throw error;

    const totalUsage = data.length;
    const totalRevenue = data.reduce((sum, usage) => sum + parseFloat(usage.discounted_price) * usage.quantity, 0);
    const totalDiscount = data.reduce((sum, usage) => sum + parseFloat(usage.discount_amount) * usage.quantity, 0);
    const uniqueCustomers = new Set(data.map(usage => usage.buyer_id)).size;

    return {
      totalUsage,
      totalRevenue,
      totalDiscount,
      uniqueCustomers
    };
  },

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  transformCampaign(data: any): DiscountCampaign {
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
  },

  transformProductDiscount(data: any): ProductDiscount {
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
  },

  transformProductDiscountWithProduct(data: any): ProductDiscount {
    const base = this.transformProductDiscount(data);
    return {
      ...base,
      campaign: data.campaign ? this.transformCampaign(data.campaign) : undefined,
      productName: data.product?.name,
      productImage: data.product?.primary_image,
      productPrice: data.product?.price ? parseFloat(data.product.price) : undefined
    };
  }
};
