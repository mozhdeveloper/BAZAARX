/**
 * Admin CRM Store
 *
 * Manages buyer segments, marketing campaigns, automation workflows,
 * and email templates for the admin CRM & Marketing page.
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuyerSegment {
  id: string;
  name: string;
  description: string | null;
  filter_criteria: Record<string, unknown>;
  buyer_count: number;
  is_dynamic: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaign {
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

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  channels: string[];
  delay_minutes: number;
  template_id: string | null;
  sms_template: string | null;
  is_enabled: boolean;
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

// ---------------------------------------------------------------------------
// Admin pre-made campaign templates (platform-level)
// ---------------------------------------------------------------------------

export interface AdminCampaignTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'platform' | 'seasonal' | 'growth' | 'retention';
  subject: string;
  content: string;
  campaign_type: 'email_blast';
}

export const ADMIN_CAMPAIGN_TEMPLATES: AdminCampaignTemplate[] = [
  {
    id: 'platform-welcome',
    name: 'Welcome to BazaarX',
    description: 'Welcome new buyers to the platform with an overview of features and current deals.',
    icon: '👋',
    category: 'growth',
    subject: 'Welcome to BazaarX — Start Shopping Today! 🎉',
    content: `Hi {{buyer_name}},

Welcome to **BazaarX**! 🎉 We're thrilled to have you join our marketplace.

Here's what you can do:
• Browse thousands of products from trusted sellers
• Enjoy secure payments and buyer protection
• Track your orders in real time

Start exploring now and discover amazing deals!

Happy shopping,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'platform-seasonal-sale',
    name: 'Platform-Wide Seasonal Sale',
    description: 'Announce a platform-wide seasonal or holiday sale event to all buyers.',
    icon: '🎄',
    category: 'seasonal',
    subject: '🎉 {{season_name}} SALE — Up to {{discount_percent}}% OFF Platform-Wide!',
    content: `Hi {{buyer_name}},

The **{{season_name}} Sale** is LIVE on BazaarX! 🔥

Hundreds of sellers are offering massive discounts:
• Up to **{{discount_percent}}% OFF** across all categories
• Free shipping on orders over ₱{{free_shipping_min}}
• Exclusive flash deals every hour
• Sale ends **{{end_date}}**

Don't miss out — shop the biggest sale of the season!

Best,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'platform-new-sellers',
    name: 'New Sellers Spotlight',
    description: 'Highlight newly verified sellers and their products to drive discovery.',
    icon: '🌟',
    category: 'platform',
    subject: '🌟 Discover New Sellers on BazaarX This Week!',
    content: `Hi {{buyer_name}},

We've got exciting new sellers joining BazaarX! Check out what's new:

🏪 **New Sellers This Week:**
{{seller_highlights}}

Each seller has been verified by our team to ensure quality and trustworthiness.

Browse their stores and discover unique products!

Happy shopping,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'platform-flash-deals',
    name: 'Flash Deals Alert',
    description: 'Notify buyers about time-limited flash deals across the platform.',
    icon: '⚡',
    category: 'platform',
    subject: '⚡ Flash Deals — Limited Time Only on BazaarX!',
    content: `Hi {{buyer_name}},

🔥 **FLASH DEALS** are happening NOW on BazaarX!

For the next {{duration}} only:
{{deal_highlights}}

These deals won't last — grab them before they're gone!

Shop now,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'platform-inactive-buyer',
    name: 'We Miss You!',
    description: 'Re-engage buyers who haven\'t been active for 30+ days.',
    icon: '💌',
    category: 'retention',
    subject: 'We Miss You, {{buyer_name}}! Come Back for Something Special 💫',
    content: `Hi {{buyer_name}},

It's been a while since you visited BazaarX, and we miss you!

Here's what you've been missing:
• {{new_products_count}}+ new products added
• {{active_sales_count}} active sales happening right now
• New sellers with exciting products

As a welcome-back gift, enjoy **{{discount_code}}** for {{discount_percent}}% off your next order!

Hope to see you soon,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'platform-category-spotlight',
    name: 'Category Spotlight',
    description: 'Promote a specific product category with top picks and deals.',
    icon: '🔍',
    category: 'platform',
    subject: '🔍 Top Picks in {{category_name}} — Curated Just for You!',
    content: `Hi {{buyer_name}},

We've curated the best **{{category_name}}** products on BazaarX just for you!

✨ **Our Top Picks:**
{{product_highlights}}

Whether you're looking for the best deals or the latest trends, we've got you covered.

Browse the collection now!

Best,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'platform-review-drive',
    name: 'Review Campaign',
    description: 'Encourage buyers to leave reviews for their recent purchases platform-wide.',
    icon: '⭐',
    category: 'growth',
    subject: '⭐ Your Review Matters — Share Your Experience on BazaarX!',
    content: `Hi {{buyer_name}},

Thank you for shopping on BazaarX! We'd love to hear about your experience.

Your reviews help:
• Other buyers make informed decisions
• Sellers improve their products and service
• Keep our marketplace trustworthy

It only takes a minute — leave a review for your recent purchases and help our community grow!

Thank you,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'platform-loyalty-program',
    name: 'Loyalty Program Announcement',
    description: 'Announce or promote a loyalty/rewards program to frequent buyers.',
    icon: '🏆',
    category: 'retention',
    subject: '🏆 You\'re a Top Buyer — Here\'s Your Exclusive Reward!',
    content: `Hi {{buyer_name}},

You're one of our most valued buyers on BazaarX, and we want to reward you! 🎉

As a top buyer, here's an exclusive offer:
🎁 Use code **{{discount_code}}** for **{{discount_percent}}% OFF** your next purchase!

This offer is exclusively for our VIP buyers — valid until **{{expiry_date}}**.

Thank you for being part of the BazaarX community!

With appreciation,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
];

interface AdminCRMState {
  // Segments
  segments: BuyerSegment[];
  segmentsLoading: boolean;
  fetchSegments: () => Promise<void>;
  createSegment: (segment: Partial<BuyerSegment>) => Promise<BuyerSegment | null>;
  updateSegment: (id: string, updates: Partial<BuyerSegment>) => Promise<boolean>;
  deleteSegment: (id: string) => Promise<boolean>;
  previewSegment: (criteria: Record<string, unknown>) => Promise<number>;

  // Campaigns
  campaigns: MarketingCampaign[];
  campaignsLoading: boolean;
  fetchCampaigns: () => Promise<void>;
  createCampaign: (campaign: Partial<MarketingCampaign>) => Promise<MarketingCampaign | null>;
  updateCampaign: (id: string, updates: Partial<MarketingCampaign>) => Promise<boolean>;
  deleteCampaign: (id: string) => Promise<boolean>;

  // Automation
  workflows: AutomationWorkflow[];
  workflowsLoading: boolean;
  fetchWorkflows: () => Promise<void>;
  createWorkflow: (workflow: Partial<AutomationWorkflow>) => Promise<AutomationWorkflow | null>;
  updateWorkflow: (id: string, updates: Partial<AutomationWorkflow>) => Promise<boolean>;
  toggleWorkflow: (id: string, enabled: boolean) => Promise<boolean>;
  deleteWorkflow: (id: string) => Promise<boolean>;

  // Email templates
  emailTemplates: EmailTemplate[];
  emailTemplatesLoading: boolean;
  fetchEmailTemplates: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAdminCRM = create<AdminCRMState>((set, get) => ({
  // ── Segments ──────────────────────────────────────────────────────────
  segments: [],
  segmentsLoading: false,

  fetchSegments: async () => {
    set({ segmentsLoading: true });
    const { data, error } = await supabase
      .from('buyer_segments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) set({ segments: data as BuyerSegment[] });
    set({ segmentsLoading: false });
  },

  createSegment: async (segment) => {
    const { data, error } = await supabase
      .from('buyer_segments')
      .insert(segment)
      .select()
      .single();

    if (error || !data) return null;
    set({ segments: [data as BuyerSegment, ...get().segments] });
    return data as BuyerSegment;
  },

  updateSegment: async (id, updates) => {
    const { error } = await supabase
      .from('buyer_segments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return false;
    set({
      segments: get().segments.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    });
    return true;
  },

  deleteSegment: async (id) => {
    const { error } = await supabase.from('buyer_segments').delete().eq('id', id);
    if (error) return false;
    set({ segments: get().segments.filter((s) => s.id !== id) });
    return true;
  },

  previewSegment: async (criteria) => {
    // Build a count query based on filter criteria
    const query = supabase
      .from('buyers')
      .select('id', { count: 'exact', head: true });

    if (criteria.min_orders) {
      // For complex queries, use RPC or count from orders
      // Simplified: just count all buyers for now
    }

    const { count } = await query;
    return count || 0;
  },

  // ── Campaigns ─────────────────────────────────────────────────────────
  campaigns: [],
  campaignsLoading: false,

  fetchCampaigns: async () => {
    set({ campaignsLoading: true });
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) set({ campaigns: data as MarketingCampaign[] });
    set({ campaignsLoading: false });
  },

  createCampaign: async (campaign) => {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert(campaign)
      .select()
      .single();

    if (error || !data) return null;
    set({ campaigns: [data as MarketingCampaign, ...get().campaigns] });
    return data as MarketingCampaign;
  },

  updateCampaign: async (id, updates) => {
    const { error } = await supabase
      .from('marketing_campaigns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return false;
    set({
      campaigns: get().campaigns.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    });
    return true;
  },

  deleteCampaign: async (id) => {
    const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id);
    if (error) return false;
    set({ campaigns: get().campaigns.filter((c) => c.id !== id) });
    return true;
  },

  // ── Automation Workflows ──────────────────────────────────────────────
  workflows: [],
  workflowsLoading: false,

  fetchWorkflows: async () => {
    set({ workflowsLoading: true });
    const { data, error } = await supabase
      .from('automation_workflows')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) set({ workflows: data as AutomationWorkflow[] });
    set({ workflowsLoading: false });
  },

  createWorkflow: async (workflow) => {
    const { data, error } = await supabase
      .from('automation_workflows')
      .insert(workflow)
      .select()
      .single();

    if (error || !data) return null;
    set({ workflows: [data as AutomationWorkflow, ...get().workflows] });
    return data as AutomationWorkflow;
  },

  updateWorkflow: async (id, updates) => {
    const { error } = await supabase
      .from('automation_workflows')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return false;
    set({
      workflows: get().workflows.map((w) =>
        w.id === id ? { ...w, ...updates } : w,
      ),
    });
    return true;
  },

  toggleWorkflow: async (id, enabled) => {
    return get().updateWorkflow(id, { is_enabled: enabled } as Partial<AutomationWorkflow>);
  },

  deleteWorkflow: async (id) => {
    const { error } = await supabase.from('automation_workflows').delete().eq('id', id);
    if (error) return false;
    set({ workflows: get().workflows.filter((w) => w.id !== id) });
    return true;
  },

  // ── Email Templates ───────────────────────────────────────────────────
  emailTemplates: [],
  emailTemplatesLoading: false,

  fetchEmailTemplates: async () => {
    set({ emailTemplatesLoading: true });
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name');

    if (!error && data) set({ emailTemplates: data as EmailTemplate[] });
    set({ emailTemplatesLoading: false });
  },
}));
