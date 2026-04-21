/**
 * CRM Backend (Supabase) Integration Tests
 *
 * Tests actual Supabase CRUD operations against the live database
 * for buyer_segments, marketing_campaigns, and automation_workflows.
 *
 * Prerequisites:
 *   - RLS disabled on all 3 tables
 *   - created_by nullable (NOT NULL dropped)
 *   - FK constraints dropped on created_by
 *   - NOTIFY pgrst, 'reload schema' executed
 *
 * Run:  npx vitest run src/tests/crm-backend.test.ts
 */

import { describe, it, expect, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// ── Direct Supabase client (bypasses Vite mock) ────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Track created IDs for cleanup
const createdIds = {
  segments: [] as string[],
  campaigns: [] as string[],
  workflows: [] as string[],
};

// ════════════════════════════════════════════════════════════════════════════
// BUYER SEGMENTS — CRUD
// ════════════════════════════════════════════════════════════════════════════

describe('Backend: buyer_segments CRUD', () => {
  it('should INSERT a segment with null created_by', async () => {
    const { data, error } = await sb
      .from('buyer_segments')
      .insert({
        name: '[TEST] High-Value Buyers',
        description: 'Buyers with total spend > ₱10,000',
        filter_criteria: { min_total_spent: 10000, status: 'active' },
        buyer_count: 0,
        is_dynamic: true,
        created_by: null,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.name).toBe('[TEST] High-Value Buyers');
    expect(data!.filter_criteria).toEqual({ min_total_spent: 10000, status: 'active' });
    createdIds.segments.push(data!.id);
  });

  it('should INSERT a second segment', async () => {
    const { data, error } = await sb
      .from('buyer_segments')
      .insert({
        name: '[TEST] Cart Abandoners',
        description: 'Buyers who left items in cart 48h+ ago',
        filter_criteria: { has_abandoned_cart: true, abandoned_within_hours: 48 },
        buyer_count: 0,
        is_dynamic: true,
        created_by: null,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    createdIds.segments.push(data!.id);
  });

  it('should SELECT all segments (includes our test rows)', async () => {
    const { data, error } = await sb
      .from('buyer_segments')
      .select('*')
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThanOrEqual(2);

    const testRows = data!.filter(s => s.name.startsWith('[TEST]'));
    expect(testRows.length).toBeGreaterThanOrEqual(2);
  });

  it('should UPDATE a segment name', async () => {
    const id = createdIds.segments[0];
    const { error } = await sb
      .from('buyer_segments')
      .update({ name: '[TEST] High-Value Buyers (Updated)', updated_at: new Date().toISOString() })
      .eq('id', id);

    expect(error).toBeNull();

    // Verify
    const { data } = await sb.from('buyer_segments').select('name').eq('id', id).single();
    expect(data!.name).toBe('[TEST] High-Value Buyers (Updated)');
  });

  it('should DELETE a segment', async () => {
    const id = createdIds.segments.pop()!;
    const { error } = await sb.from('buyer_segments').delete().eq('id', id);
    expect(error).toBeNull();

    // Verify gone
    const { data } = await sb.from('buyer_segments').select('id').eq('id', id).single();
    expect(data).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// MARKETING CAMPAIGNS — CRUD
// ════════════════════════════════════════════════════════════════════════════

describe('Backend: marketing_campaigns CRUD', () => {
  it('should INSERT a draft campaign', async () => {
    const { data, error } = await sb
      .from('marketing_campaigns')
      .insert({
        name: '[TEST] Welcome Campaign',
        description: 'Welcome new buyers to BazaarX',
        campaign_type: 'email_blast',
        status: 'draft',
        subject: 'Welcome to BazaarX — Start Shopping Today! 🎉',
        content: 'Hi {{buyer_name}},\n\nWelcome to BazaarX!',
        total_recipients: 0,
        total_sent: 0,
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        created_by: null,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.status).toBe('draft');
    expect(data!.campaign_type).toBe('email_blast');
    createdIds.campaigns.push(data!.id);
  });

  it('should INSERT a second campaign with metrics', async () => {
    const { data, error } = await sb
      .from('marketing_campaigns')
      .insert({
        name: '[TEST] Flash Deals Alert',
        description: 'Time-limited flash deal notification',
        campaign_type: 'email_blast',
        status: 'sent',
        subject: '⚡ Flash Deals — 24 Hours Only!',
        content: 'Hi {{buyer_name}},\n\nFLASH DEALS are live NOW!',
        total_recipients: 500,
        total_sent: 480,
        total_delivered: 460,
        total_opened: 210,
        total_clicked: 85,
        total_bounced: 20,
        sent_at: new Date().toISOString(),
        created_by: null,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.total_sent).toBe(480);
    createdIds.campaigns.push(data!.id);
  });

  it('should SELECT campaigns ordered by created_at desc', async () => {
    const { data, error } = await sb
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThanOrEqual(2);
  });

  it('should UPDATE campaign status from draft to scheduled', async () => {
    const id = createdIds.campaigns[0];
    const scheduledAt = new Date(Date.now() + 86400000).toISOString(); // tomorrow

    const { error } = await sb
      .from('marketing_campaigns')
      .update({
        status: 'scheduled',
        scheduled_at: scheduledAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    expect(error).toBeNull();

    const { data } = await sb.from('marketing_campaigns').select('status, scheduled_at').eq('id', id).single();
    expect(data!.status).toBe('scheduled');
    expect(data!.scheduled_at).toBeTruthy();
  });

  it('should calculate delivery metrics correctly', async () => {
    const id = createdIds.campaigns[1];
    const { data } = await sb
      .from('marketing_campaigns')
      .select('total_sent, total_delivered, total_opened, total_clicked, total_bounced')
      .eq('id', id)
      .single();

    expect(data).toBeTruthy();
    const deliveryRate = Math.round((data!.total_delivered / data!.total_sent) * 100);
    const openRate = Math.round((data!.total_opened / data!.total_delivered) * 100);
    const clickRate = Math.round((data!.total_clicked / data!.total_opened) * 100);
    const bounceRate = Math.round((data!.total_bounced / data!.total_sent) * 100);

    expect(deliveryRate).toBe(96);  // 460/480
    expect(openRate).toBe(46);      // 210/460
    expect(clickRate).toBe(40);     // 85/210
    expect(bounceRate).toBe(4);     // 20/480
  });

  it('should DELETE a campaign', async () => {
    const id = createdIds.campaigns.pop()!;
    const { error } = await sb.from('marketing_campaigns').delete().eq('id', id);
    expect(error).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AUTOMATION WORKFLOWS — CRUD
// ════════════════════════════════════════════════════════════════════════════

describe('Backend: automation_workflows CRUD', () => {
  it('should INSERT a welcome flow workflow', async () => {
    const { data, error } = await sb
      .from('automation_workflows')
      .insert({
        name: '[TEST] Welcome Flow',
        description: 'Send welcome email on signup',
        trigger_event: 'welcome',
        channels: ['email'],
        delay_minutes: 0,
        is_enabled: false,
        created_by: null,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.trigger_event).toBe('welcome');
    expect(data!.channels).toEqual(['email']);
    createdIds.workflows.push(data!.id);
  });

  it('should INSERT a multi-channel workflow with delay', async () => {
    const { data, error } = await sb
      .from('automation_workflows')
      .insert({
        name: '[TEST] Post-Delivery Review',
        description: 'Ask for review 3 days after delivery',
        trigger_event: 'order_delivered',
        channels: ['email', 'push'],
        delay_minutes: 4320,
        is_enabled: true,
        created_by: null,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.delay_minutes).toBe(4320);
    expect(data!.channels).toContain('email');
    expect(data!.channels).toContain('push');
    createdIds.workflows.push(data!.id);
  });

  it('should SELECT all workflows', async () => {
    const { data, error } = await sb
      .from('automation_workflows')
      .select('*')
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThanOrEqual(2);
  });

  it('should TOGGLE workflow enabled state', async () => {
    const id = createdIds.workflows[0];
    const { error } = await sb
      .from('automation_workflows')
      .update({ is_enabled: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    expect(error).toBeNull();

    const { data } = await sb.from('automation_workflows').select('is_enabled').eq('id', id).single();
    expect(data!.is_enabled).toBe(true);
  });

  it('should UPDATE workflow delay and channels', async () => {
    const id = createdIds.workflows[1];
    const { error } = await sb
      .from('automation_workflows')
      .update({
        delay_minutes: 1440,
        channels: ['email', 'sms', 'push'],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    expect(error).toBeNull();

    const { data } = await sb.from('automation_workflows').select('delay_minutes, channels').eq('id', id).single();
    expect(data!.delay_minutes).toBe(1440);
    expect(data!.channels).toHaveLength(3);
  });

  it('should DELETE a workflow', async () => {
    const id = createdIds.workflows.pop()!;
    const { error } = await sb.from('automation_workflows').delete().eq('id', id);
    expect(error).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CROSS-TABLE QUERIES
// ════════════════════════════════════════════════════════════════════════════

describe('Backend: Cross-table queries', () => {
  it('should count records across all 3 CRM tables', async () => {
    const [segs, camps, wfs] = await Promise.all([
      sb.from('buyer_segments').select('id', { count: 'exact', head: true }),
      sb.from('marketing_campaigns').select('id', { count: 'exact', head: true }),
      sb.from('automation_workflows').select('id', { count: 'exact', head: true }),
    ]);

    expect(segs.error).toBeNull();
    expect(camps.error).toBeNull();
    expect(wfs.error).toBeNull();

    console.log(`📊 CRM Table Counts — Segments: ${segs.count}, Campaigns: ${camps.count}, Workflows: ${wfs.count}`);
    expect(segs.count).toBeGreaterThanOrEqual(0);
    expect(camps.count).toBeGreaterThanOrEqual(0);
    expect(wfs.count).toBeGreaterThanOrEqual(0);
  });

  it('should verify RLS is disabled (select works without auth)', async () => {
    // Using anon client without auth should succeed if RLS is disabled
    const anonClient = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_KEY);

    const { error: segErr } = await anonClient.from('buyer_segments').select('id').limit(1);
    const { error: campErr } = await anonClient.from('marketing_campaigns').select('id').limit(1);
    const { error: wfErr } = await anonClient.from('automation_workflows').select('id').limit(1);

    expect(segErr).toBeNull();
    expect(campErr).toBeNull();
    expect(wfErr).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CLEANUP — Remove all [TEST] rows after suite completes
// ════════════════════════════════════════════════════════════════════════════

afterAll(async () => {
  console.log('🧹 Cleaning up test data...');

  // Delete remaining test segments
  for (const id of createdIds.segments) {
    await sb.from('buyer_segments').delete().eq('id', id);
  }
  // Delete remaining test campaigns
  for (const id of createdIds.campaigns) {
    await sb.from('marketing_campaigns').delete().eq('id', id);
  }
  // Delete remaining test workflows
  for (const id of createdIds.workflows) {
    await sb.from('automation_workflows').delete().eq('id', id);
  }

  // Also clean up any lingering [TEST] rows from previous runs
  await sb.from('buyer_segments').delete().like('name', '[TEST]%');
  await sb.from('marketing_campaigns').delete().like('name', '[TEST]%');
  await sb.from('automation_workflows').delete().like('name', '[TEST]%');

  console.log('✅ Cleanup complete');
});
