// Discount Campaign Types
export type CampaignType = 
  | 'flash_sale'
  | 'seasonal_sale'
  | 'clearance'
  | 'buy_more_save_more'
  | 'limited_time_offer'
  | 'new_arrival_promo'
  | 'bundle_deal';

export type CampaignStatus = 
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'ended'
  | 'cancelled';

export type DiscountType = 'percentage' | 'fixed_amount';

export type AppliesTo = 'all_products' | 'specific_products' | 'specific_categories';

export interface DiscountCampaign {
  id: string;
  sellerId: string;
  name: string;
  description?: string;
  campaignType: CampaignType;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minPurchaseAmount?: number;
  startsAt: Date;
  endsAt: Date;
  status: CampaignStatus;
  badgeText?: string;
  badgeColor?: string;
  priority: number;
  claimLimit?: number;
  perCustomerLimit: number;
  usageCount: number;
  appliesTo: AppliesTo;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDiscount {
  id: string;
  campaignId: string;
  productId: string;
  sellerId: string;
  overrideDiscountType?: DiscountType;
  overrideDiscountValue?: number;
  discountedStock?: number;
  soldCount: number;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  campaign?: DiscountCampaign;
  productName?: string;
  productImage?: string;
  productPrice?: number;
}

export interface DiscountUsage {
  id: string;
  campaignId: string;
  productDiscountId?: string;
  buyerId: string;
  orderId?: string;
  productId: string;
  discountAmount: number;
  originalPrice: number;
  discountedPrice: number;
  quantity: number;
  usedAt: Date;
}

export interface ActiveDiscount {
  campaignId: string;
  campaignName: string;
  discountType: DiscountType;
  discountValue: number;
  discountedPrice: number;
  originalPrice: number;
  badgeText?: string;
  badgeColor?: string;
  endsAt: Date;
}

// Form types
export interface CreateCampaignFormData {
  name: string;
  description: string;
  campaignType: CampaignType;
  discountType: DiscountType;
  discountValue: string;
  maxDiscountAmount: string;
  minPurchaseAmount: string;
  startsAt: string;
  endsAt: string;
  badgeText: string;
  badgeColor: string;
  claimLimit: string;
  perCustomerLimit: string;
  appliesTo: AppliesTo;
  selectedProducts: string[];
}

export const campaignTypeLabels: Record<CampaignType, string> = {
  flash_sale: 'Flash Sale',
  seasonal_sale: 'Seasonal Sale',
  clearance: 'Clearance',
  buy_more_save_more: 'Buy More Save More',
  limited_time_offer: 'Limited Time Offer',
  new_arrival_promo: 'New Arrival Promo',
  bundle_deal: 'Bundle Deal'
};

export const campaignStatusLabels: Record<CampaignStatus, string> = {
  scheduled: 'Scheduled',
  active: 'Active',
  paused: 'Paused',
  ended: 'Ended',
  cancelled: 'Cancelled'
};

export const campaignStatusColors: Record<CampaignStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  ended: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700'
};
