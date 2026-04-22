/**
 * CRM Frontend — Template & Component Logic Tests
 *
 * Tests the template data structures, preview HTML builders,
 * category styles, and component-level business logic.
 *
 * Run:  npx vitest run src/tests/crm-templates.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  CAMPAIGN_TEMPLATES,
  SEGMENT_TEMPLATES,
  AUTOMATION_TEMPLATES,
  CATEGORY_STYLES,
  buildPreviewHtml,
  buildCampaignEmailPreviewHtml,
  type CampaignTemplate,
  type SegmentTemplate,
  type AutomationTemplate,
  type TemplateSection,
} from '@/components/admin/crm/crmTemplateData';

import { ADMIN_CAMPAIGN_TEMPLATES } from '@/stores/admin/adminCRMStore';

// ════════════════════════════════════════════════════════════════════════════
// CAMPAIGN TEMPLATES (crmTemplateData.ts)
// ════════════════════════════════════════════════════════════════════════════

describe('Campaign Templates (crmTemplateData)', () => {
  it('should export exactly 8 campaign templates', () => {
    expect(CAMPAIGN_TEMPLATES).toHaveLength(8);
  });

  it('should have unique IDs for all campaign templates', () => {
    const ids = CAMPAIGN_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have required fields on every campaign template', () => {
    for (const tpl of CAMPAIGN_TEMPLATES) {
      expect(tpl.id).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.description.length).toBeGreaterThan(10);
      expect(tpl.icon).toBeTruthy();
      expect(tpl.category).toBeTruthy();
      expect(tpl.subject).toBeTruthy();
      expect(tpl.content).toBeTruthy();
      expect(tpl.campaign_type).toBe('email_blast');
    }
  });

  it('should use valid categories', () => {
    const validCategories = ['growth', 'seasonal', 'platform', 'retention'];
    for (const tpl of CAMPAIGN_TEMPLATES) {
      expect(validCategories).toContain(tpl.category);
    }
  });

  it('should include {{buyer_name}} personalization in every template', () => {
    for (const tpl of CAMPAIGN_TEMPLATES) {
      expect(tpl.content).toContain('{{buyer_name}}');
    }
  });

  it('should include BazaarX branding in every template content', () => {
    for (const tpl of CAMPAIGN_TEMPLATES) {
      expect(tpl.content).toContain('BazaarX');
    }
  });

  it('should have all expected template names', () => {
    const names = CAMPAIGN_TEMPLATES.map(t => t.name);
    expect(names).toContain('Welcome New Buyers');
    expect(names).toContain('Seasonal Sale Blast');
    expect(names).toContain('Flash Deals Alert');
    expect(names).toContain('Win-Back Campaign');
    expect(names).toContain('New Sellers Spotlight');
    expect(names).toContain('Category Spotlight');
    expect(names).toContain('Review Drive');
    expect(names).toContain('Loyalty Rewards');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SEGMENT TEMPLATES
// ════════════════════════════════════════════════════════════════════════════

describe('Segment Templates (crmTemplateData)', () => {
  it('should export exactly 6 segment templates', () => {
    expect(SEGMENT_TEMPLATES).toHaveLength(6);
  });

  it('should have unique IDs', () => {
    const ids = SEGMENT_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have filter_criteria as non-empty objects', () => {
    for (const tpl of SEGMENT_TEMPLATES) {
      expect(typeof tpl.filter_criteria).toBe('object');
      expect(Object.keys(tpl.filter_criteria).length).toBeGreaterThan(0);
    }
  });

  it('should have valid categories', () => {
    const validCategories = ['revenue', 'lifecycle', 'behavior'];
    for (const tpl of SEGMENT_TEMPLATES) {
      expect(validCategories).toContain(tpl.category);
    }
  });

  it('should have expected segment types', () => {
    const names = SEGMENT_TEMPLATES.map(t => t.name);
    expect(names).toContain('High-Value Buyers');
    expect(names).toContain('New Buyers (7 Days)');
    expect(names).toContain('Inactive 30+ Days');
    expect(names).toContain('Repeat Buyers');
    expect(names).toContain('Cart Abandoners');
    expect(names).toContain('Top 10% Spenders');
  });

  it('should have proper criteria for High-Value segment', () => {
    const hvs = SEGMENT_TEMPLATES.find(t => t.name === 'High-Value Buyers');
    expect(hvs).toBeTruthy();
    expect(hvs!.filter_criteria.min_total_spent).toBe(10000);
    expect(hvs!.filter_criteria.status).toBe('active');
  });

  it('should have proper criteria for Cart Abandoners', () => {
    const ca = SEGMENT_TEMPLATES.find(t => t.name === 'Cart Abandoners');
    expect(ca).toBeTruthy();
    expect(ca!.filter_criteria.has_abandoned_cart).toBe(true);
    expect(ca!.filter_criteria.abandoned_within_hours).toBe(48);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AUTOMATION TEMPLATES
// ════════════════════════════════════════════════════════════════════════════

describe('Automation Templates (crmTemplateData)', () => {
  it('should export exactly 6 automation templates', () => {
    expect(AUTOMATION_TEMPLATES).toHaveLength(6);
  });

  it('should have unique IDs', () => {
    const ids = AUTOMATION_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have valid trigger events', () => {
    const validTriggers = ['welcome', 'order_placed', 'order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled', 'payment_received', 'refund_processed'];
    for (const tpl of AUTOMATION_TEMPLATES) {
      expect(validTriggers).toContain(tpl.trigger_event);
    }
  });

  it('should have valid channel arrays', () => {
    const validChannels = ['email', 'sms', 'push'];
    for (const tpl of AUTOMATION_TEMPLATES) {
      expect(tpl.channels.length).toBeGreaterThan(0);
      for (const ch of tpl.channels) {
        expect(validChannels).toContain(ch);
      }
    }
  });

  it('should have non-negative delay_minutes', () => {
    for (const tpl of AUTOMATION_TEMPLATES) {
      expect(tpl.delay_minutes).toBeGreaterThanOrEqual(0);
    }
  });

  it('should have correct delay for Post-Delivery Review (3 days)', () => {
    const review = AUTOMATION_TEMPLATES.find(t => t.name === 'Post-Delivery Review Request');
    expect(review).toBeTruthy();
    expect(review!.delay_minutes).toBe(4320); // 3 * 24 * 60
  });

  it('should have correct delay for Abandoned Cart (2 hours)', () => {
    const cart = AUTOMATION_TEMPLATES.find(t => t.name === 'Abandoned Cart Recovery');
    expect(cart).toBeTruthy();
    expect(cart!.delay_minutes).toBe(120); // 2 * 60
  });

  it('should have Welcome Flow with 0 delay', () => {
    const welcome = AUTOMATION_TEMPLATES.find(t => t.name === 'Welcome Flow');
    expect(welcome).toBeTruthy();
    expect(welcome!.delay_minutes).toBe(0);
    expect(welcome!.trigger_event).toBe('welcome');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN CAMPAIGN TEMPLATES (adminCRMStore.ts)
// ════════════════════════════════════════════════════════════════════════════

describe('Admin Campaign Templates (adminCRMStore)', () => {
  it('should export exactly 8 admin campaign templates', () => {
    expect(ADMIN_CAMPAIGN_TEMPLATES).toHaveLength(8);
  });

  it('should have unique IDs', () => {
    const ids = ADMIN_CAMPAIGN_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should all be email_blast type', () => {
    for (const tpl of ADMIN_CAMPAIGN_TEMPLATES) {
      expect(tpl.campaign_type).toBe('email_blast');
    }
  });

  it('should include {{buyer_name}} in all content', () => {
    for (const tpl of ADMIN_CAMPAIGN_TEMPLATES) {
      expect(tpl.content).toContain('{{buyer_name}}');
    }
  });

  it('should have platform-prefixed IDs', () => {
    for (const tpl of ADMIN_CAMPAIGN_TEMPLATES) {
      expect(tpl.id).toMatch(/^platform-/);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CATEGORY STYLES
// ════════════════════════════════════════════════════════════════════════════

describe('Category Styles', () => {
  it('should define styles for all template categories used', () => {
    const allCategories = new Set<string>();

    for (const t of CAMPAIGN_TEMPLATES) allCategories.add(t.category);
    for (const t of SEGMENT_TEMPLATES) allCategories.add(t.category);
    for (const t of AUTOMATION_TEMPLATES) allCategories.add(t.category);

    for (const cat of allCategories) {
      expect(CATEGORY_STYLES[cat]).toBeTruthy();
      expect(CATEGORY_STYLES[cat]).toContain('bg-');
      expect(CATEGORY_STYLES[cat]).toContain('text-');
    }
  });

  it('should return Tailwind class strings', () => {
    for (const [, style] of Object.entries(CATEGORY_STYLES)) {
      expect(style).toMatch(/bg-\w+-\d+/);
      expect(style).toMatch(/text-\w+-\d+/);
      expect(style).toMatch(/border-\w+-\d+/);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PREVIEW HTML BUILDERS
// ════════════════════════════════════════════════════════════════════════════

describe('buildPreviewHtml', () => {
  it('should generate valid HTML for campaign template', () => {
    const html = buildPreviewHtml(CAMPAIGN_TEMPLATES[0], 'campaign');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(CAMPAIGN_TEMPLATES[0].name);
    expect(html).toContain(CAMPAIGN_TEMPLATES[0].subject);
    expect(html).toContain('BazaarX');
    expect(html).toContain('#d97706'); // brand color
  });

  it('should generate valid HTML for segment template', () => {
    const html = buildPreviewHtml(SEGMENT_TEMPLATES[0], 'segment');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(SEGMENT_TEMPLATES[0].name);
    expect(html).toContain('Filter Criteria');
    expect(html).toContain('Segment Template');
  });

  it('should generate valid HTML for automation template', () => {
    const html = buildPreviewHtml(AUTOMATION_TEMPLATES[0], 'automation');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(AUTOMATION_TEMPLATES[0].name);
    expect(html).toContain('Automation Workflow Template');
    expect(html).toContain('Trigger');
  });

  it('should include delay info in automation preview when delay > 0', () => {
    const delayed = AUTOMATION_TEMPLATES.find(t => t.delay_minutes > 0)!;
    const html = buildPreviewHtml(delayed, 'automation');
    expect(html).toContain('Wait');
  });

  it('should NOT include delay node for instant workflows', () => {
    const instant = AUTOMATION_TEMPLATES.find(t => t.delay_minutes === 0)!;
    const html = buildPreviewHtml(instant, 'automation');
    expect(html).toContain('Immediate');
  });

  it('should render all campaign templates without errors', () => {
    for (const tpl of CAMPAIGN_TEMPLATES) {
      const html = buildPreviewHtml(tpl, 'campaign');
      expect(html.length).toBeGreaterThan(100);
      expect(html).toContain('<!DOCTYPE html>');
    }
  });

  it('should render all segment templates without errors', () => {
    for (const tpl of SEGMENT_TEMPLATES) {
      const html = buildPreviewHtml(tpl, 'segment');
      expect(html.length).toBeGreaterThan(100);
    }
  });

  it('should render all automation templates without errors', () => {
    for (const tpl of AUTOMATION_TEMPLATES) {
      const html = buildPreviewHtml(tpl, 'automation');
      expect(html.length).toBeGreaterThan(100);
    }
  });
});

describe('buildCampaignEmailPreviewHtml', () => {
  it('should generate branded email HTML', () => {
    const html = buildCampaignEmailPreviewHtml(
      'Test Subject',
      'Hi {{buyer_name}}, welcome!',
      'Test Campaign'
    );
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('BazaarX');
    expect(html).toContain('#d97706'); // brand color
    expect(html).toContain('Test Subject');
  });

  it('should escape HTML entities in content', () => {
    const html = buildCampaignEmailPreviewHtml(
      'Subject',
      'Price: <script>alert("xss")</script> $100',
      'Test'
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should convert **bold** to <strong> tags', () => {
    const html = buildCampaignEmailPreviewHtml(
      'Subject',
      '**Bold text** here',
      'Test'
    );
    expect(html).toContain('<strong>Bold text</strong>');
  });

  it('should convert bullet lists to <li> items', () => {
    const html = buildCampaignEmailPreviewHtml(
      'Subject',
      '• Item one\n• Item two\n• Item three',
      'Test'
    );
    expect(html).toContain('<li>');
    expect(html).toContain('Item one');
    expect(html).toContain('Item two');
    expect(html).toContain('Item three');
  });

  it('should handle empty content gracefully', () => {
    const html = buildCampaignEmailPreviewHtml('Subject', '', 'Test');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Subject');
  });

  it('should render all admin campaign templates as email previews', () => {
    for (const tpl of ADMIN_CAMPAIGN_TEMPLATES) {
      const html = buildCampaignEmailPreviewHtml(tpl.subject, tpl.content, tpl.name);
      expect(html.length).toBeGreaterThan(200);
      expect(html).toContain('BazaarX');
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TEMPLATE TYPE SAFETY
// ════════════════════════════════════════════════════════════════════════════

describe('Template Type Consistency', () => {
  it('should have matching section types for buildPreviewHtml', () => {
    const sections: TemplateSection[] = ['campaign', 'segment', 'automation'];
    expect(sections).toHaveLength(3);
  });

  it('should not have overlapping IDs across template types', () => {
    const allIds = [
      ...CAMPAIGN_TEMPLATES.map(t => t.id),
      ...SEGMENT_TEMPLATES.map(t => t.id),
      ...AUTOMATION_TEMPLATES.map(t => t.id),
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('should not have overlapping IDs with admin templates', () => {
    const crmIds = CAMPAIGN_TEMPLATES.map(t => t.id);
    const adminIds = ADMIN_CAMPAIGN_TEMPLATES.map(t => t.id);
    const overlap = crmIds.filter(id => adminIds.includes(id));
    expect(overlap).toHaveLength(0);
  });
});
