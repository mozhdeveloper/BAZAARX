/**
 * Seller Marketing Store
 *
 * Manages seller-scoped marketing campaigns, email templates,
 * and customer insights for the seller marketing page.
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SellerCampaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: 'email_blast' | 'sms_blast' | 'multi_channel';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  segment_id: string | null;
  template_id: string | null;
  subject: string | null;
  content: string | null;
  sms_content: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  seller_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: string[];
  category: 'transactional' | 'marketing' | 'system';
  is_active: boolean;
  created_at: string;
}

export interface CustomerInsight {
  totalCustomers: number;
  repeatCustomers: number;
  avgOrderValue: number;
  totalRevenue: number;
  recentOrders: number;
}

// ---------------------------------------------------------------------------
// Pre-made campaign templates for sellers
// ---------------------------------------------------------------------------

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'promotion' | 'engagement' | 'retention' | 'announcement';
  subject: string;
  content: string;
  campaign_type: 'email_blast';
}

export const SELLER_CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'new-product-launch',
    name: 'New Product Launch',
    description: 'Announce a new product to your customers and drive early sales.',
    icon: '🚀',
    category: 'announcement',
    subject: '🆕 Just Arrived — Check Out Our Latest Product!',
    content: `Hi {{customer_name}},

We're excited to announce a brand new addition to our store!

**{{product_name}}** is now available — and as one of our valued customers, you get to see it first.

{{product_description}}

🛒 Shop now and be one of the first to get it!

Thank you for being a loyal customer.

Best regards,
{{store_name}}`,
    campaign_type: 'email_blast',
  },
  {
    id: 'flash-sale',
    name: 'Flash Sale Announcement',
    description: 'Create urgency with a limited-time flash sale notification.',
    icon: '⚡',
    category: 'promotion',
    subject: '⚡ FLASH SALE — Up to {{discount_percent}}% OFF for {{duration}}!',
    content: `Hi {{customer_name}},

🔥 **FLASH SALE ALERT** 🔥

For the next {{duration}} only, enjoy up to **{{discount_percent}}% OFF** on select items in our store!

Don't miss out — once it's over, it's over!

🛒 Shop the sale now at {{store_name}}.

Hurry, limited stock available!

Best,
{{store_name}}`,
    campaign_type: 'email_blast',
  },
  {
    id: 'thank-you-repeat',
    name: 'Thank You & Come Back',
    description: 'Show appreciation to recent buyers and encourage repeat purchases.',
    icon: '💝',
    category: 'retention',
    subject: 'Thank You for Your Order, {{customer_name}}! 🎉',
    content: `Hi {{customer_name}},

Thank you so much for your recent purchase from **{{store_name}}**! We truly appreciate your support.

We hope you love your order. If you have any questions or need assistance, don't hesitate to reach out.

As a token of our appreciation, enjoy **{{discount_code}}** for {{discount_percent}}% off your next order!

We look forward to serving you again.

Warm regards,
{{store_name}}`,
    campaign_type: 'email_blast',
  },
  {
    id: 'back-in-stock',
    name: 'Back in Stock Alert',
    description: 'Notify customers that a popular product is available again.',
    icon: '📦',
    category: 'announcement',
    subject: '📦 Back in Stock — {{product_name}} is Available Again!',
    content: `Hi {{customer_name}},

Great news! **{{product_name}}** is back in stock at **{{store_name}}**!

This item sold out quickly last time, so grab yours before it's gone again.

🛒 Shop now!

Best,
{{store_name}}`,
    campaign_type: 'email_blast',
  },
  {
    id: 'seasonal-sale',
    name: 'Seasonal / Holiday Sale',
    description: 'Promote a seasonal or holiday discount event for your store.',
    icon: '🎄',
    category: 'promotion',
    subject: '🎉 {{season_name}} Sale — Special Deals Just for You!',
    content: `Hi {{customer_name}},

The **{{season_name}} Sale** is HERE at **{{store_name}}**! 🎉

Enjoy amazing discounts on our best sellers:

• Up to **{{discount_percent}}% OFF** on selected items
• Free shipping on orders over ₱{{free_shipping_min}}
• Sale ends **{{end_date}}**

Don't miss this chance to save big!

Happy shopping,
{{store_name}}`,
    campaign_type: 'email_blast',
  },
  {
    id: 'loyalty-reward',
    name: 'Loyalty Reward',
    description: 'Reward your most loyal and repeat customers with an exclusive offer.',
    icon: '⭐',
    category: 'retention',
    subject: '⭐ You\'re a VIP — Here\'s an Exclusive Reward!',
    content: `Hi {{customer_name}},

You've been one of our most valued customers at **{{store_name}}**, and we want to say THANK YOU!

As a VIP customer, here's your exclusive reward:

🎁 Use code **{{discount_code}}** for **{{discount_percent}}% OFF** your next purchase!

This offer is just for you — valid until **{{expiry_date}}**.

Thank you for your continued support!

With gratitude,
{{store_name}}`,
    campaign_type: 'email_blast',
  },
  {
    id: 'review-request',
    name: 'Review Request',
    description: 'Ask recent buyers to leave a review and boost your store credibility.',
    icon: '📝',
    category: 'engagement',
    subject: 'How was your experience with {{store_name}}? ⭐',
    content: `Hi {{customer_name}},

We hope you're enjoying your recent purchase from **{{store_name}}**!

Your feedback means the world to us. Could you take a moment to leave a review?

⭐ Your honest review helps other shoppers and helps us improve.

Thank you for your time and support!

Best regards,
{{store_name}}`,
    campaign_type: 'email_blast',
  },
  {
    id: 'win-back',
    name: 'Win-Back Campaign',
    description: 'Re-engage customers who haven\'t purchased in a while.',
    icon: '👋',
    category: 'retention',
    subject: 'We Miss You, {{customer_name}}! Come Back for a Special Deal 💫',
    content: `Hi {{customer_name}},

It's been a while since your last visit to **{{store_name}}**, and we miss you!

To welcome you back, here's a special offer just for you:

🎁 Use code **{{discount_code}}** for **{{discount_percent}}% OFF** your next order!

We've added new products since your last visit — come see what's new!

Hope to see you soon,
{{store_name}}`,
    campaign_type: 'email_blast',
  },
];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface SellerMarketingState {
  // Campaigns
  campaigns: SellerCampaign[];
  campaignsLoading: boolean;
  fetchCampaigns: (sellerId: string) => Promise<void>;
  createCampaign: (sellerId: string, campaign: Partial<SellerCampaign>) => Promise<SellerCampaign | null>;
  updateCampaign: (id: string, sellerId: string, updates: Partial<SellerCampaign>) => Promise<boolean>;
  deleteCampaign: (id: string, sellerId: string) => Promise<boolean>;

  // Templates
  templates: EmailTemplate[];
  templatesLoading: boolean;
  fetchTemplates: () => Promise<void>;

  // Customer insights
  insights: CustomerInsight;
  insightsLoading: boolean;
  fetchInsights: (sellerId: string) => Promise<void>;
}

export const useSellerMarketing = create<SellerMarketingState>((set, get) => ({
  // ── Campaigns ─────────────────────────────────────────────────────────
  campaigns: [],
  campaignsLoading: false,

  fetchCampaigns: async (sellerId: string) => {
    set({ campaignsLoading: true });
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (!error && data) set({ campaigns: data as SellerCampaign[] });
    set({ campaignsLoading: false });
  },

  createCampaign: async (sellerId: string, campaign: Partial<SellerCampaign>) => {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert({ ...campaign, seller_id: sellerId, created_by: sellerId })
      .select()
      .single();

    if (error || !data) return null;
    set({ campaigns: [data as SellerCampaign, ...get().campaigns] });
    return data as SellerCampaign;
  },

  updateCampaign: async (id: string, sellerId: string, updates: Partial<SellerCampaign>) => {
    const { error } = await supabase
      .from('marketing_campaigns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('seller_id', sellerId);

    if (error) return false;
    set({
      campaigns: get().campaigns.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    });
    return true;
  },

  deleteCampaign: async (id: string, sellerId: string) => {
    const { error } = await supabase
      .from('marketing_campaigns')
      .delete()
      .eq('id', id)
      .eq('seller_id', sellerId);

    if (error) return false;
    set({ campaigns: get().campaigns.filter((c) => c.id !== id) });
    return true;
  },

  // ── Templates ─────────────────────────────────────────────────────────
  templates: [],
  templatesLoading: false,

  fetchTemplates: async () => {
    set({ templatesLoading: true });
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) set({ templates: data as EmailTemplate[] });
    set({ templatesLoading: false });
  },

  // ── Customer Insights ─────────────────────────────────────────────────
  insights: { totalCustomers: 0, repeatCustomers: 0, avgOrderValue: 0, totalRevenue: 0, recentOrders: 0 },
  insightsLoading: false,

  fetchInsights: async (sellerId: string) => {
    set({ insightsLoading: true });
    try {
      // Get all completed orders for this seller
      const { data: orders } = await supabase
        .from('seller_orders')
        .select('buyer_id, total_amount, created_at')
        .eq('seller_id', sellerId)
        .in('status', ['delivered', 'completed', 'confirmed', 'shipped', 'processing']);

      if (orders && orders.length > 0) {
        const uniqueBuyers = new Set(orders.map(o => o.buyer_id));
        const buyerOrderCounts: Record<string, number> = {};
        orders.forEach(o => {
          buyerOrderCounts[o.buyer_id] = (buyerOrderCounts[o.buyer_id] || 0) + 1;
        });
        const repeatCustomers = Object.values(buyerOrderCounts).filter(c => c > 1).length;
        const totalRevenue = orders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const recentOrders = orders.filter(o => o.created_at > thirtyDaysAgo).length;

        set({
          insights: {
            totalCustomers: uniqueBuyers.size,
            repeatCustomers,
            avgOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
            totalRevenue: Math.round(totalRevenue),
            recentOrders,
          },
        });
      }
    } catch {
      // Silently fail — insights are non-critical
    }
    set({ insightsLoading: false });
  },
}));
