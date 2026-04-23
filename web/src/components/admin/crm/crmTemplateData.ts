// ─── CRM Template Types & Data ───────────────────────────────────────────────
// Separated from CRMTemplateModal.tsx so Vite fast refresh works correctly.
// (Fast refresh requires files to only export React components.)

export type TemplateSection = 'campaign' | 'segment' | 'automation';

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  subject: string;
  content: string;
  campaign_type: string;
}

export interface SegmentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  filter_criteria: Record<string, unknown>;
}

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  trigger_event: string;
  channels: string[];
  delay_minutes: number;
}

export type AnyTemplate = CampaignTemplate | SegmentTemplate | AutomationTemplate;

// ─── Campaign Templates ──────────────────────────────────────────────────────

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'tpl-camp-welcome',
    name: 'Welcome New Buyers',
    description: 'Greet new buyers with a warm introduction to the platform, key features, and a first-purchase discount.',
    icon: '👋',
    category: 'growth',
    subject: 'Welcome to BazaarX — Start Shopping Today! 🎉',
    content: `Hi {{buyer_name}},

Welcome to BazaarX! We're thrilled to have you join the Philippines' fastest-growing marketplace.

Here's what's waiting for you:
• Thousands of products from verified sellers
• Secure payments with buyer protection
• Real-time order tracking
• Easy returns and refunds

As a welcome gift, use code WELCOME10 for 10% off your first order!

Happy shopping,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'tpl-camp-seasonal',
    name: 'Seasonal Sale Blast',
    description: 'Announce a platform-wide seasonal sale event with discount highlights and urgency.',
    icon: '🎄',
    category: 'seasonal',
    subject: '🎉 BIG SALE — Up to 50% OFF Platform-Wide!',
    content: `Hi {{buyer_name}},

The biggest sale of the season is LIVE on BazaarX! 🔥

What's on offer:
• Up to 50% OFF across all categories
• Free shipping on orders over ₱999
• Hourly flash deals — new items every 60 minutes
• Sale runs through this Sunday

Don't miss these limited-time deals. Shop now before stocks run out!

Best,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'tpl-camp-flash',
    name: 'Flash Deals Alert',
    description: 'Time-sensitive flash deal notification designed to drive immediate conversions.',
    icon: '⚡',
    category: 'platform',
    subject: '⚡ Flash Deals — 24 Hours Only on BazaarX!',
    content: `Hi {{buyer_name}},

FLASH DEALS are live NOW on BazaarX!

For the next 24 hours only:
• Electronics — up to 40% OFF
• Fashion & Apparel — Buy 1 Get 1
• Home & Living — starts at ₱99
• Beauty — extra 15% with code FLASH15

These deals expire at midnight. Don't wait!

Shop now,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'tpl-camp-reengagement',
    name: 'Win-Back Campaign',
    description: 'Re-engage inactive buyers with personalized offers and a comeback discount code.',
    icon: '💌',
    category: 'retention',
    subject: "We Miss You, {{buyer_name}}! Here's 15% Off 💫",
    content: `Hi {{buyer_name}},

It's been a while since you visited BazaarX, and we miss you!

Here's what's new since your last visit:
• 500+ new products added this month
• 12 active sales happening right now
• New trusted sellers with unique collections

Come back and enjoy 15% OFF with code MISSYOU15 — valid for 7 days.

See you soon,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'tpl-camp-sellers',
    name: 'New Sellers Spotlight',
    description: 'Feature newly verified sellers to drive store discovery and product exploration.',
    icon: '🌟',
    category: 'platform',
    subject: "🌟 Meet This Week's New Sellers on BazaarX!",
    content: `Hi {{buyer_name}},

Exciting new sellers have joined BazaarX this week! Each one is verified by our team for quality and trust.

Featured new stores:
• Fresh Finds PH — Handcrafted home decor
• TechEdge Manila — Gadgets and accessories
• StyleBox Co. — Trendy fashion at great prices

Visit their stores and discover something new. Support local sellers!

Happy shopping,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'tpl-camp-category',
    name: 'Category Spotlight',
    description: 'Promote a specific product category with curated picks and special pricing.',
    icon: '🏷️',
    category: 'platform',
    subject: '🏷️ Electronics Week — Top Picks Under ₱2,000!',
    content: `Hi {{buyer_name}},

It's Electronics Week on BazaarX! We've curated the best deals just for you:

Top picks under ₱2,000:
1. Wireless Earbuds — ₱899 (was ₱1,499)
2. Portable Charger 20,000mAh — ₱1,299
3. Bluetooth Speaker — ₱749 (was ₱1,200)
4. Phone Case Bundle (3-pack) — ₱399

Plus, free shipping on all electronics this week!

Shop the collection,
The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'tpl-camp-review',
    name: 'Review Drive',
    description: 'Encourage buyers to leave reviews on recent purchases to boost social proof.',
    icon: '⭐',
    category: 'growth',
    subject: 'How was your order? Leave a review & earn rewards! ⭐',
    content: `Hi {{buyer_name}},

We hope you're enjoying your recent purchase from BazaarX!

Your feedback matters — it helps other buyers make informed decisions and helps sellers improve.

Leave a review and get:
• 50 BazaarX reward points per review
• Chance to win a ₱500 shopping voucher (monthly draw)
• Your review featured on our homepage

It takes less than 2 minutes. Thank you for being part of our community!

The BazaarX Team`,
    campaign_type: 'email_blast',
  },
  {
    id: 'tpl-camp-loyalty',
    name: 'Loyalty Rewards',
    description: 'Announce loyalty program perks, VIP tiers, and exclusive member benefits.',
    icon: '🏆',
    category: 'retention',
    subject: "🏆 You're a BazaarX VIP — Exclusive Perks Inside!",
    content: `Hi {{buyer_name}},

Thank you for being a loyal BazaarX shopper! You've earned VIP status.

Your exclusive VIP perks:
• Early access to all flash sales (2 hours before everyone else)
• Free shipping on every order — no minimum
• Priority customer support
• Monthly exclusive coupons
• Birthday month surprise discount

Your current points balance: {{points_balance}}

Keep shopping and unlock even more rewards!

The BazaarX Team`,
    campaign_type: 'email_blast',
  },
];

// ─── Segment Templates ───────────────────────────────────────────────────────

export const SEGMENT_TEMPLATES: SegmentTemplate[] = [
  {
    id: 'tpl-seg-highvalue',
    name: 'High-Value Buyers',
    description: 'Buyers with total lifetime spending exceeding ₱10,000. Ideal for premium offers and loyalty campaigns.',
    icon: '💎',
    category: 'revenue',
    filter_criteria: { min_total_spent: 10000, status: 'active' },
  },
  {
    id: 'tpl-seg-new',
    name: 'New Buyers (7 Days)',
    description: 'Buyers who registered within the last 7 days. Perfect for onboarding sequences and welcome offers.',
    icon: '🆕',
    category: 'lifecycle',
    filter_criteria: { registered_within_days: 7 },
  },
  {
    id: 'tpl-seg-inactive',
    name: 'Inactive 30+ Days',
    description: 'Buyers with no orders in 30+ days. Target with re-engagement and win-back campaigns.',
    icon: '😴',
    category: 'lifecycle',
    filter_criteria: { inactive_days: 30, has_previous_orders: true },
  },
  {
    id: 'tpl-seg-repeat',
    name: 'Repeat Buyers',
    description: 'Buyers with 2 or more completed orders. High-intent audience for upsell and cross-sell.',
    icon: '🔄',
    category: 'behavior',
    filter_criteria: { min_orders: 2, order_status: 'completed' },
  },
  {
    id: 'tpl-seg-cart',
    name: 'Cart Abandoners',
    description: "Buyers who added items to cart but haven't completed checkout within 48 hours.",
    icon: '🛒',
    category: 'behavior',
    filter_criteria: { has_abandoned_cart: true, abandoned_within_hours: 48 },
  },
  {
    id: 'tpl-seg-topspenders',
    name: 'Top 10% Spenders',
    description: 'The top 10% of buyers by total spend. Best audience for exclusive drops and VIP offers.',
    icon: '👑',
    category: 'revenue',
    filter_criteria: { percentile_rank: 'top_10', metric: 'total_spent' },
  },
];

// ─── Automation Templates ────────────────────────────────────────────────────

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'tpl-auto-welcome',
    name: 'Welcome Flow',
    description: 'Send a welcome email immediately when a new buyer signs up. Perfect for first impressions.',
    icon: '👋',
    category: 'onboarding',
    trigger_event: 'welcome',
    channels: ['email'],
    delay_minutes: 0,
  },
  {
    id: 'tpl-auto-confirm',
    name: 'Order Confirmation',
    description: 'Instantly notify buyers when their order is confirmed with order details and tracking info.',
    icon: '✅',
    category: 'transactional',
    trigger_event: 'order_confirmed',
    channels: ['email', 'push'],
    delay_minutes: 0,
  },
  {
    id: 'tpl-auto-shipped',
    name: 'Shipping Update',
    description: 'Alert buyers when their order ships. Builds trust and reduces "where is my order" inquiries.',
    icon: '📦',
    category: 'transactional',
    trigger_event: 'order_shipped',
    channels: ['email', 'sms'],
    delay_minutes: 0,
  },
  {
    id: 'tpl-auto-review',
    name: 'Post-Delivery Review Request',
    description: 'Ask for a product review 3 days after delivery. Drives social proof and seller ratings.',
    icon: '⭐',
    category: 'engagement',
    trigger_event: 'order_delivered',
    channels: ['email'],
    delay_minutes: 4320,
  },
  {
    id: 'tpl-auto-abandoned',
    name: 'Abandoned Cart Recovery',
    description: 'Remind buyers about items left in their cart after 2 hours with a gentle nudge.',
    icon: '🛒',
    category: 'recovery',
    trigger_event: 'order_cancelled',
    channels: ['email', 'push'],
    delay_minutes: 120,
  },
  {
    id: 'tpl-auto-winback',
    name: 'Win-Back Sequence',
    description: "Re-engage buyers who haven't ordered in 30 days with a personalized discount offer.",
    icon: '💌',
    category: 'retention',
    trigger_event: 'welcome',
    channels: ['email', 'sms'],
    delay_minutes: 43200,
  },
];

// ─── Category Styles ─────────────────────────────────────────────────────────

export const CATEGORY_STYLES: Record<string, string> = {
  growth: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  seasonal: 'bg-orange-50 text-orange-700 border-orange-200',
  platform: 'bg-blue-50 text-blue-700 border-blue-200',
  retention: 'bg-purple-50 text-purple-700 border-purple-200',
  revenue: 'bg-amber-50 text-amber-700 border-amber-200',
  lifecycle: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  behavior: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  onboarding: 'bg-violet-50 text-violet-700 border-violet-200',
  transactional: 'bg-blue-50 text-blue-700 border-blue-200',
  engagement: 'bg-teal-50 text-teal-700 border-teal-200',
  recovery: 'bg-rose-50 text-rose-700 border-rose-200',
};

// ─── Preview HTML Builder ────────────────────────────────────────────────────

export function buildPreviewHtml(template: AnyTemplate, section: TemplateSection): string {
  const baseStyle = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b; }
      .card { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
      .header { background: linear-gradient(135deg, #d97706, #ea580c); padding: 24px 28px; }
      .header h1 { color: white; font-size: 18px; font-weight: 700; margin-bottom: 4px; }
      .header p { color: rgba(255,255,255,0.85); font-size: 12px; }
      .body { padding: 28px; line-height: 1.7; font-size: 14px; color: #334155; }
      .body strong { color: #0f172a; }
      .subject { background: #fffbeb; border-left: 3px solid #d97706; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 6px 6px 0; }
      .subject span { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #92400e; font-weight: 600; }
      .subject p { font-size: 14px; color: #1e293b; margin-top: 4px; font-weight: 500; }
      .meta { padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; display: flex; gap: 16px; flex-wrap: wrap; }
      .meta-item { display: flex; align-items: center; gap: 4px; }
      .meta-label { font-weight: 600; color: #475569; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
      .footer { padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      ul { padding-left: 20px; margin: 8px 0; }
      li { margin-bottom: 4px; }
    </style>
  `;

  if (section === 'campaign') {
    const t = template as CampaignTemplate;
    const contentHtml = t.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br/>');
    return `<!DOCTYPE html><html><head>${baseStyle}</head><body>
      <div class="card">
        <div class="header"><h1>${t.name}</h1><p>${t.description}</p></div>
        <div class="body">
          <div class="subject"><span>Subject Line</span><p>${t.subject}</p></div>
          <p>${contentHtml}</p>
        </div>
        <div class="meta">
          <div class="meta-item"><span class="meta-label">Type:</span> ${t.campaign_type.replace('_', ' ')}</div>
          <div class="meta-item"><span class="meta-label">Category:</span> <span class="badge" style="background:#fffbeb;color:#92400e">${t.category}</span></div>
        </div>
        <div class="footer">BazaarX Email Preview — Template content with variables shown as placeholders</div>
      </div>
    </body></html>`;
  }

  if (section === 'segment') {
    const t = template as SegmentTemplate;
    const criteriaHtml = Object.entries(t.filter_criteria)
      .map(([k, v]) => `<li><span class="meta-label">${k.replace(/_/g, ' ')}:</span> ${String(v)}</li>`)
      .join('');
    return `<!DOCTYPE html><html><head>${baseStyle}</head><body>
      <div class="card">
        <div class="header"><h1>${t.icon} ${t.name}</h1><p>Segment Template</p></div>
        <div class="body">
          <p style="margin-bottom:12px">${t.description}</p>
          <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin-top:8px">
            <p style="font-size:12px;font-weight:600;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">Filter Criteria</p>
            <ul style="list-style:none;padding:0">${criteriaHtml}</ul>
          </div>
        </div>
        <div class="meta">
          <div class="meta-item"><span class="meta-label">Category:</span> <span class="badge" style="background:#eff6ff;color:#1d4ed8">${t.category}</span></div>
          <div class="meta-item"><span class="meta-label">Type:</span> Dynamic</div>
        </div>
        <div class="footer">BazaarX Segment Preview — Filter criteria will be applied on creation</div>
      </div>
    </body></html>`;
  }

  // automation
  const t = template as AutomationTemplate;
  const delayText = t.delay_minutes === 0 ? 'Immediate' :
    t.delay_minutes >= 1440 ? `${Math.floor(t.delay_minutes / 1440)} day(s)` :
    t.delay_minutes >= 60 ? `${Math.floor(t.delay_minutes / 60)}h ${t.delay_minutes % 60}m` :
    `${t.delay_minutes} min`;
  return `<!DOCTYPE html><html><head>${baseStyle}
    <style>
      .flow { display: flex; align-items: center; gap: 12px; padding: 20px; background: #f8fafc; border-radius: 8px; margin: 16px 0; overflow-x: auto; }
      .flow-node { padding: 10px 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 500; white-space: nowrap; }
      .flow-arrow { color: #cbd5e1; font-size: 18px; }
      .trigger { border-color: #d97706; background: #fffbeb; color: #92400e; }
      .delay { border-color: #6366f1; background: #eef2ff; color: #4338ca; }
      .channel { border-color: #059669; background: #ecfdf5; color: #065f46; }
    </style>
  </head><body>
    <div class="card">
      <div class="header"><h1>${t.icon} ${t.name}</h1><p>Automation Workflow Template</p></div>
      <div class="body">
        <p style="margin-bottom:4px">${t.description}</p>
        <div class="flow">
          <div class="flow-node trigger">${t.trigger_event.replace(/_/g, ' ')}</div>
          <span class="flow-arrow">&rarr;</span>
          ${t.delay_minutes > 0 ? `<div class="flow-node delay">Wait ${delayText}</div><span class="flow-arrow">&rarr;</span>` : ''}
          ${t.channels.map(ch => `<div class="flow-node channel">${ch}</div>`).join('')}
        </div>
      </div>
      <div class="meta">
        <div class="meta-item"><span class="meta-label">Trigger:</span> ${t.trigger_event.replace(/_/g, ' ')}</div>
        <div class="meta-item"><span class="meta-label">Delay:</span> ${delayText}</div>
        <div class="meta-item"><span class="meta-label">Channels:</span> ${t.channels.join(', ')}</div>
      </div>
      <div class="footer">BazaarX Automation Preview — Workflow will be created as inactive</div>
    </div>
  </body></html>`;
}

// ─── Campaign Email Preview Builder (for create/edit dialog) ─────────────────

export function buildCampaignEmailPreviewHtml(subject: string, content: string, _name: string): string {
  const contentHtml = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return `<!DOCTYPE html><html><head>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; padding: 20px; color: #1e293b; }
      .email { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
      .brand { background: linear-gradient(135deg, #d97706, #ea580c); padding: 20px 28px; text-align: center; }
      .brand h1 { color: white; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
      .brand p { color: rgba(255,255,255,0.8); font-size: 11px; margin-top: 4px; }
      .subject-bar { background: #fffbeb; border-bottom: 1px solid #fde68a; padding: 12px 28px; }
      .subject-bar .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #92400e; font-weight: 600; }
      .subject-bar .text { font-size: 15px; color: #1e293b; margin-top: 2px; font-weight: 600; }
      .content { padding: 28px; line-height: 1.7; font-size: 14px; color: #334155; }
      .content strong { color: #0f172a; }
      .content ul { padding-left: 20px; margin: 8px 0; }
      .content li { margin-bottom: 4px; }
      .footer { padding: 16px 28px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; background: #fafafa; }
      .footer a { color: #d97706; text-decoration: none; }
      .unsubscribe { margin-top: 6px; font-size: 10px; color: #cbd5e1; }
    </style>
  </head><body>
    <div class="email">
      <div class="brand">
        <h1>BazaarX</h1>
        <p>Philippines' Fastest-Growing Marketplace</p>
      </div>
      ${subject ? `<div class="subject-bar"><div class="label">Subject</div><div class="text">${subject.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div>` : ''}
      <div class="content">
        ${content.trim() ? `<p>${contentHtml}</p>` : '<p style="color:#94a3b8;font-style:italic">No content yet — start typing in the Content field to see the preview.</p>'}
      </div>
      <div class="footer">
        <p>You're receiving this because you're a valued BazaarX customer.</p>
        <p class="unsubscribe"><a href="#">Unsubscribe</a> · <a href="#">Manage Preferences</a></p>
      </div>
    </div>
  </body></html>`;
}
