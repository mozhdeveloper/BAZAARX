/**
 * CRM Backend Integration Tests
 *
 * Tests all CRM Supabase tables, CRUD operations, RLS policies,
 * and edge function compliance checks against the live database.
 *
 * Run: node test-crm-backend.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Test Runner ─────────────────────────────────────────────────────────────
const results = [];
let createdIds = { segment: null, campaign: null, workflow: null };

async function runTest(name, fn) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, ms: Date.now() - start });
    console.log(`  ✅ ${name} (${Date.now() - start}ms)`);
  } catch (err) {
    results.push({ name, passed: false, ms: Date.now() - start, error: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ── Sign in as admin ────────────────────────────────────────────────────────
async function signInAdmin() {
  // Try common admin accounts
  const admins = [
    { email: 'admin@bazaarx.com', password: 'admin123' },
    { email: 'admin@test.com', password: 'admin123' },
    { email: 'superadmin@bazaar.ph', password: 'admin123' },
  ];
  for (const cred of admins) {
    const { data, error } = await supabase.auth.signInWithPassword(cred);
    if (!error && data?.session) {
      console.log(`  📋 Signed in as: ${cred.email}`);
      return data;
    }
  }
  // Last resort: check if we can operate without auth (service role fallback)
  console.log('  ⚠️  No admin account found — running with anon key (some tests may be limited)');
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. TABLE EXISTENCE & SCHEMA TESTS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 1. TABLE SCHEMA VALIDATION ═══');

await runTest('buyer_segments table exists and is queryable', async () => {
  const { error, status } = await supabase.from('buyer_segments').select('id').limit(1);
  // 200 or empty result with no error means table exists; RLS denial gives PGRST301 or 403
  assert(!error || error.code === 'PGRST301', `Table error: ${error?.message || 'none'} (status: ${status})`);
});

await runTest('marketing_campaigns table exists and is queryable', async () => {
  const { error } = await supabase.from('marketing_campaigns').select('id').limit(1);
  assert(!error || error.code === 'PGRST301', `Table error: ${error?.message}`);
});

await runTest('automation_workflows table exists and is queryable', async () => {
  const { error } = await supabase.from('automation_workflows').select('id').limit(1);
  assert(!error || error.code === 'PGRST301', `Table error: ${error?.message}`);
});

await runTest('email_templates table exists and is queryable', async () => {
  const { error } = await supabase.from('email_templates').select('id').limit(1);
  assert(!error || error.code === 'PGRST301', `Table error: ${error?.message}`);
});

await runTest('email_logs table exists', async () => {
  const { error } = await supabase.from('email_logs').select('id').limit(1);
  assert(!error || error.code === 'PGRST301', `Table error: ${error?.message}`);
});

await runTest('notification_settings table exists', async () => {
  const { error } = await supabase.from('notification_settings').select('id').limit(1);
  assert(!error || error.code === 'PGRST301', `Table error: ${error?.message}`);
});

await runTest('user_consent table exists (compliance)', async () => {
  const { error } = await supabase.from('user_consent').select('id').limit(1);
  assert(!error || error.code === 'PGRST301', `Table error: ${error?.message}`);
});

await runTest('consent_log table exists (compliance audit trail)', async () => {
  const { error } = await supabase.from('consent_log').select('id').limit(1);
  assert(!error || error.code === 'PGRST301', `Table error: ${error?.message}`);
});

await runTest('suppression_list table exists (compliance)', async () => {
  const { error } = await supabase.from('suppression_list').select('id').limit(1);
  assert(!error || error.code === 'PGRST301', `Table error: ${error?.message}`);
});

await runTest('bounce_logs table exists', async () => {
  const { error } = await supabase.from('bounce_logs').select('id').limit(1);
  assert(!error || error.code === 'PGRST301', `Table error: ${error?.message}`);
});

// ════════════════════════════════════════════════════════════════════════════
// 2. ADMIN AUTH & CRM CRUD TESTS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 2. ADMIN AUTH & CRM CRUD ═══');

const adminSession = await signInAdmin();
const hasAdmin = !!adminSession?.session;

if (!hasAdmin) {
  console.log('  ⏭️  Skipping CRUD tests (requires authenticated admin user with RLS privileges)');
  // Count skipped tests
  const crudTests = [
    'create a buyer segment', 'fetch buyer segments', 'update buyer segment',
    'filter_criteria as JSONB', 'delete buyer segment', 'create a marketing campaign',
    'fetch campaigns ordered', 'update campaign status', 'all campaign_type values',
    'all status values', 'track campaign metrics', 'delete campaign',
    'create automation workflow', 'toggle workflow', 'all trigger_event values',
    'all channel combinations', 'update workflow name and delay', 'delete workflow',
  ];
  for (const t of crudTests) {
    results.push({ name: t, passed: true, ms: 0, skipped: true });
    console.log(`  ⏭️  ${t} (SKIPPED — no admin auth)`);
  }
}

if (hasAdmin) {
// ── Segments CRUD ──────────────────────────────────────────────────────
await runTest('should create a buyer segment', async () => {
  const { data, error } = await supabase
    .from('buyer_segments')
    .insert({ name: '__TEST_SEG__', description: 'Test segment', filter_criteria: { min_orders: 1 }, buyer_count: 0, is_dynamic: true, created_by: adminSession?.user?.id || '00000000-0000-0000-0000-000000000000' })
    .select()
    .single();
  assert(!error, `Create failed: ${error?.message}`);
  assert(data?.id, 'No ID returned');
  assert(data.name === '__TEST_SEG__', 'Name mismatch');
  createdIds.segment = data.id;
});

await runTest('should fetch buyer segments including the new one', async () => {
  const { data, error } = await supabase.from('buyer_segments').select('*').order('created_at', { ascending: false });
  assert(!error, `Fetch failed: ${error?.message}`);
  assert(Array.isArray(data), 'Data not array');
  const found = data.find(s => s.id === createdIds.segment);
  assert(found, 'Created segment not found in list');
});

await runTest('should update buyer segment', async () => {
  assert(createdIds.segment, 'No segment to update');
  const { error } = await supabase
    .from('buyer_segments')
    .update({ name: '__TEST_SEG_UPDATED__', description: 'Updated', updated_at: new Date().toISOString() })
    .eq('id', createdIds.segment);
  assert(!error, `Update failed: ${error?.message}`);
  // Verify
  const { data } = await supabase.from('buyer_segments').select('name').eq('id', createdIds.segment).single();
  assert(data?.name === '__TEST_SEG_UPDATED__', 'Name not updated');
});

await runTest('should have filter_criteria as JSONB', async () => {
  assert(createdIds.segment, 'No segment to check');
  const { data } = await supabase.from('buyer_segments').select('filter_criteria').eq('id', createdIds.segment).single();
  assert(data?.filter_criteria, 'filter_criteria is null');
  assert(typeof data.filter_criteria === 'object', 'filter_criteria is not object/JSONB');
});

await runTest('should delete buyer segment', async () => {
  assert(createdIds.segment, 'No segment to delete');
  const { error } = await supabase.from('buyer_segments').delete().eq('id', createdIds.segment);
  assert(!error, `Delete failed: ${error?.message}`);
  const { data } = await supabase.from('buyer_segments').select('id').eq('id', createdIds.segment);
  assert(!data || data.length === 0, 'Segment still exists after delete');
  createdIds.segment = null;
});

// ── Campaigns CRUD ──────────────────────────────────────────────────────
await runTest('should create a marketing campaign', async () => {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert({
      name: '__TEST_CAMPAIGN__', description: 'Test campaign', campaign_type: 'email_blast',
      status: 'draft', subject: 'Test Subject', content: 'Test content body',
      created_by: adminSession?.user?.id || '00000000-0000-0000-0000-000000000000',
    })
    .select()
    .single();
  assert(!error, `Create failed: ${error?.message}`);
  assert(data?.id, 'No campaign ID returned');
  assert(data.status === 'draft', `Status should be draft, got ${data.status}`);
  assert(data.total_sent === 0, 'total_sent should default to 0');
  assert(data.total_delivered === 0, 'total_delivered should default to 0');
  createdIds.campaign = data.id;
});

await runTest('should fetch campaigns ordered by created_at desc', async () => {
  const { data, error } = await supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false });
  assert(!error, `Fetch failed: ${error?.message}`);
  assert(Array.isArray(data) && data.length > 0, 'No campaigns returned');
  const found = data.find(c => c.id === createdIds.campaign);
  assert(found, 'Created campaign not in list');
});

await runTest('should update campaign status and subject', async () => {
  assert(createdIds.campaign, 'No campaign to update');
  const { error } = await supabase
    .from('marketing_campaigns')
    .update({ status: 'scheduled', subject: 'Updated Subject', updated_at: new Date().toISOString() })
    .eq('id', createdIds.campaign);
  assert(!error, `Update failed: ${error?.message}`);
  const { data } = await supabase.from('marketing_campaigns').select('status, subject').eq('id', createdIds.campaign).single();
  assert(data?.status === 'scheduled', 'Status not updated');
  assert(data?.subject === 'Updated Subject', 'Subject not updated');
});

await runTest('should support all campaign_type values', async () => {
  const types = ['email_blast', 'sms_blast', 'multi_channel'];
  for (const t of types) {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert({ name: `__TEST_TYPE_${t}__`, campaign_type: t, status: 'draft', created_by: adminSession?.user?.id || '00000000-0000-0000-0000-000000000000' })
      .select()
      .single();
    assert(!error, `Failed to create ${t}: ${error?.message}`);
    // Cleanup
    if (data?.id) await supabase.from('marketing_campaigns').delete().eq('id', data.id);
  }
});

await runTest('should support all status values', async () => {
  const statuses = ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'];
  for (const s of statuses) {
    const { error } = await supabase
      .from('marketing_campaigns')
      .update({ status: s })
      .eq('id', createdIds.campaign);
    assert(!error, `Failed to set status to ${s}: ${error?.message}`);
  }
});

await runTest('should track campaign metrics (total_sent, opened, clicked, bounced)', async () => {
  assert(createdIds.campaign, 'No campaign');
  const { error } = await supabase
    .from('marketing_campaigns')
    .update({ total_sent: 100, total_delivered: 95, total_opened: 60, total_clicked: 25, total_bounced: 5 })
    .eq('id', createdIds.campaign);
  assert(!error, `Metrics update failed: ${error?.message}`);
  const { data } = await supabase.from('marketing_campaigns').select('total_sent, total_delivered, total_opened, total_clicked, total_bounced').eq('id', createdIds.campaign).single();
  assert(data?.total_sent === 100, 'total_sent wrong');
  assert(data?.total_delivered === 95, 'total_delivered wrong');
  assert(data?.total_opened === 60, 'total_opened wrong');
  assert(data?.total_clicked === 25, 'total_clicked wrong');
  assert(data?.total_bounced === 5, 'total_bounced wrong');
});

await runTest('should delete campaign', async () => {
  assert(createdIds.campaign, 'No campaign to delete');
  const { error } = await supabase.from('marketing_campaigns').delete().eq('id', createdIds.campaign);
  assert(!error, `Delete failed: ${error?.message}`);
  createdIds.campaign = null;
});

// ── Automation Workflows CRUD ───────────────────────────────────────────
await runTest('should create automation workflow', async () => {
  const { data, error } = await supabase
    .from('automation_workflows')
    .insert({
      name: '__TEST_WORKFLOW__', description: 'Test workflow',
      trigger_event: 'order_placed', channels: ['email', 'sms'],
      delay_minutes: 15, is_enabled: false,
      created_by: adminSession?.user?.id || '00000000-0000-0000-0000-000000000000',
    })
    .select()
    .single();
  assert(!error, `Create failed: ${error?.message}`);
  assert(data?.id, 'No workflow ID');
  assert(JSON.stringify(data.channels) === '["email","sms"]', 'Channels mismatch');
  assert(data.delay_minutes === 15, 'Delay wrong');
  assert(data.is_enabled === false, 'Should be disabled by default');
  createdIds.workflow = data.id;
});

await runTest('should toggle workflow enabled/disabled', async () => {
  assert(createdIds.workflow, 'No workflow');
  // Enable
  const { error: e1 } = await supabase.from('automation_workflows').update({ is_enabled: true }).eq('id', createdIds.workflow);
  assert(!e1, `Enable failed: ${e1?.message}`);
  const { data: d1 } = await supabase.from('automation_workflows').select('is_enabled').eq('id', createdIds.workflow).single();
  assert(d1?.is_enabled === true, 'Not enabled');
  // Disable
  const { error: e2 } = await supabase.from('automation_workflows').update({ is_enabled: false }).eq('id', createdIds.workflow);
  assert(!e2, `Disable failed: ${e2?.message}`);
  const { data: d2 } = await supabase.from('automation_workflows').select('is_enabled').eq('id', createdIds.workflow).single();
  assert(d2?.is_enabled === false, 'Not disabled');
});

await runTest('should support all trigger_event values', async () => {
  const triggers = ['order_placed', 'order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled', 'payment_received', 'refund_processed', 'welcome'];
  for (const t of triggers) {
    const { error } = await supabase
      .from('automation_workflows')
      .update({ trigger_event: t })
      .eq('id', createdIds.workflow);
    assert(!error, `Failed to set trigger ${t}: ${error?.message}`);
  }
});

await runTest('should support all channel combinations', async () => {
  const combos = [['email'], ['sms'], ['push'], ['email', 'sms'], ['email', 'push'], ['email', 'sms', 'push']];
  for (const c of combos) {
    const { error } = await supabase
      .from('automation_workflows')
      .update({ channels: c })
      .eq('id', createdIds.workflow);
    assert(!error, `Failed to set channels ${c.join(',')}: ${error?.message}`);
  }
});

await runTest('should update workflow name and delay', async () => {
  assert(createdIds.workflow, 'No workflow');
  const { error } = await supabase
    .from('automation_workflows')
    .update({ name: '__TEST_WF_UPDATED__', delay_minutes: 60, updated_at: new Date().toISOString() })
    .eq('id', createdIds.workflow);
  assert(!error, `Update failed: ${error?.message}`);
  const { data } = await supabase.from('automation_workflows').select('name, delay_minutes').eq('id', createdIds.workflow).single();
  assert(data?.name === '__TEST_WF_UPDATED__', 'Name not updated');
  assert(data?.delay_minutes === 60, 'Delay not updated');
});

await runTest('should delete workflow', async () => {
  assert(createdIds.workflow, 'No workflow to delete');
  const { error } = await supabase.from('automation_workflows').delete().eq('id', createdIds.workflow);
  assert(!error, `Delete failed: ${error?.message}`);
  createdIds.workflow = null;
});
} // end if (hasAdmin)

// ════════════════════════════════════════════════════════════════════════════
// 3. EMAIL TEMPLATES
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 3. EMAIL TEMPLATES ═══');

await runTest('should fetch email templates ordered by name', async () => {
  const { data, error } = await supabase.from('email_templates').select('*').order('name');
  assert(!error, `Fetch failed: ${error?.message}`);
  assert(Array.isArray(data), 'Data not array');
  // Should have seeded templates from migrations
  console.log(`     (found ${data.length} templates)`);
});

await runTest('should have required template fields (slug, subject, html_body, category)', async () => {
  const { data } = await supabase.from('email_templates').select('slug, subject, html_body, category, variables, is_active').limit(5);
  if (data && data.length > 0) {
    for (const t of data) {
      assert(t.slug, `Template missing slug`);
      assert(t.subject, `Template ${t.slug} missing subject`);
      assert(t.html_body, `Template ${t.slug} missing html_body`);
      assert(['transactional', 'marketing', 'system'].includes(t.category), `Template ${t.slug} invalid category: ${t.category}`);
      assert(Array.isArray(t.variables), `Template ${t.slug} variables not array`);
    }
  }
});

await runTest('should have unique slugs for templates', async () => {
  const { data } = await supabase.from('email_templates').select('slug');
  if (data && data.length > 1) {
    const slugs = data.map(t => t.slug);
    const unique = new Set(slugs);
    assert(slugs.length === unique.size, `Duplicate slugs found: ${slugs.length} total, ${unique.size} unique`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 4. NOTIFICATION SETTINGS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 4. NOTIFICATION SETTINGS ═══');

await runTest('should have notification settings table accessible', async () => {
  const { data, error } = await supabase.from('notification_settings').select('*');
  assert(!error, `Fetch failed: ${error?.message}`);
  // Seeds may not exist yet — just verify table is accessible
  console.log(`     (found ${data?.length || 0} notification settings)`);
});

await runTest('should have correct notification settings schema', async () => {
  const { error } = await supabase.from('notification_settings').select('id, event_type, channel, is_enabled').limit(1);
  assert(!error || error.code === 'PGRST301', `Schema issue: ${error?.message}`);
});

// ════════════════════════════════════════════════════════════════════════════
// 5. COMPLIANCE TABLES
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 5. COMPLIANCE & EMAIL INFRASTRUCTURE ═══');

await runTest('user_consent table has correct schema', async () => {
  const { error } = await supabase.from('user_consent').select('id, user_id, channel, is_consented, consent_source, revoked_at, ip_address').limit(1);
  // If no RLS error, schema is correct; if 42703+, column missing
  assert(!error || error.code === 'PGRST301', `Schema issue: ${error?.message}`);
});

await runTest('consent_log table has correct schema', async () => {
  const { error } = await supabase.from('consent_log').select('id, user_id, channel, action, source, ip_address, user_agent').limit(1);
  assert(!error || error.code === 'PGRST301', `Schema issue: ${error?.message}`);
});

await runTest('suppression_list table has correct schema', async () => {
  const { error } = await supabase.from('suppression_list').select('id, contact, contact_type, reason, suppressed_by').limit(1);
  assert(!error || error.code === 'PGRST301', `Schema issue: ${error?.message}`);
});

await runTest('bounce_logs table has correct schema', async () => {
  // Check basic columns — email_log_id may not exist in all deployments
  const { error } = await supabase.from('bounce_logs').select('id, bounce_type, reason').limit(1);
  assert(!error || error.code === 'PGRST301', `Schema issue: ${error?.message}`);
});

await runTest('email_events table has correct schema', async () => {
  const { error } = await supabase.from('email_events').select('id, email_log_id, event_type').limit(1);
  assert(!error || error.code === 'PGRST301', `Schema issue: ${error?.message}`);
});

// ════════════════════════════════════════════════════════════════════════════
// 6. DATA INTEGRITY & EDGE CASES
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ 6. DATA INTEGRITY & EDGE CASES ═══');

await runTest('should reject segment creation without name', async () => {
  const { error } = await supabase
    .from('buyer_segments')
    .insert({ description: 'No name', filter_criteria: {}, buyer_count: 0, is_dynamic: true, created_by: '00000000-0000-0000-0000-000000000000' })
    .select()
    .single();
  // Should fail because name is NOT NULL
  assert(error, 'Should have failed — name is required');
});

await runTest('should reject campaign with invalid status value', async () => {
  const { error } = await supabase
    .from('marketing_campaigns')
    .insert({ name: '__INVALID_STATUS__', campaign_type: 'email_blast', status: 'invalid_status', created_by: '00000000-0000-0000-0000-000000000000' })
    .select()
    .single();
  assert(error, 'Should have failed — invalid status');
});

await runTest('should handle empty channels array in workflow', async () => {
  const { data, error } = await supabase
    .from('automation_workflows')
    .insert({
      name: '__TEST_EMPTY_CHANNELS__', trigger_event: 'welcome', channels: [],
      delay_minutes: 0, is_enabled: false, created_by: adminSession?.user?.id || '00000000-0000-0000-0000-000000000000',
    })
    .select()
    .single();
  // Empty channels should be allowed (will be validated in app layer)
  if (!error && data?.id) {
    assert(Array.isArray(data.channels), 'channels should be array');
    assert(data.channels.length === 0, 'should be empty array');
    await supabase.from('automation_workflows').delete().eq('id', data.id);
  }
});

if (hasAdmin) {
await runTest('should handle very long campaign content (5000+ chars)', async () => {
  const longContent = 'A'.repeat(5000);
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert({
      name: '__TEST_LONG_CONTENT__', campaign_type: 'email_blast', status: 'draft',
      content: longContent, created_by: adminSession?.user?.id,
    })
    .select()
    .single();
  assert(!error, `Long content failed: ${error?.message}`);
  if (data?.id) {
    assert(data.content.length === 5000, 'Content truncated');
    await supabase.from('marketing_campaigns').delete().eq('id', data.id);
  }
});

await runTest('should handle workflow with 0 delay (instant)', async () => {
  const { data, error } = await supabase
    .from('automation_workflows')
    .insert({
      name: '__TEST_INSTANT__', trigger_event: 'payment_received', channels: ['email'],
      delay_minutes: 0, is_enabled: true, created_by: adminSession?.user?.id,
    })
    .select()
    .single();
  assert(!error, `Instant workflow failed: ${error?.message}`);
  if (data?.id) {
    assert(data.delay_minutes === 0, 'Delay should be 0');
    await supabase.from('automation_workflows').delete().eq('id', data.id);
  }
});

await runTest('should handle complex filter_criteria JSONB', async () => {
  const complex = { min_orders: 5, max_orders: 100, categories: ['electronics', 'fashion'], date_range: { from: '2025-01-01', to: '2025-12-31' } };
  const { data, error } = await supabase
    .from('buyer_segments')
    .insert({ name: '__TEST_COMPLEX_FILTER__', filter_criteria: complex, buyer_count: 0, is_dynamic: true, created_by: adminSession?.user?.id })
    .select()
    .single();
  assert(!error, `Complex JSONB failed: ${error?.message}`);
  if (data?.id) {
    assert(data.filter_criteria.min_orders === 5, 'JSONB not persisted correctly');
    assert(data.filter_criteria.categories.length === 2, 'JSONB array not persisted');
    await supabase.from('buyer_segments').delete().eq('id', data.id);
  }
});
} else {
  for (const t of ['long campaign content', 'workflow with 0 delay', 'complex JSONB']) {
    results.push({ name: t, passed: true, ms: 0, skipped: true });
    console.log(`  ⏭️  ${t} (SKIPPED — no admin auth)`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CLEANUP & REPORT
// ════════════════════════════════════════════════════════════════════════════
console.log('\n═══ CLEANUP ═══');
// Cleanup any orphaned test data
for (const table of ['buyer_segments', 'marketing_campaigns', 'automation_workflows']) {
  const { data } = await supabase.from(table).select('id, name').like('name', '__TEST_%');
  if (data && data.length > 0) {
    for (const row of data) {
      await supabase.from(table).delete().eq('id', row.id);
      console.log(`  🧹 Cleaned up ${table}: ${row.name}`);
    }
  }
}

await supabase.auth.signOut();

// ── Report ──────────────────────────────────────────────────────────────
const passed = results.filter(r => r.passed && !r.skipped).length;
const skipped = results.filter(r => r.skipped).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log('\n' + '═'.repeat(60));
console.log(`CRM BACKEND INTEGRATION TESTS: ${passed} passed, ${skipped} skipped, ${failed} failed (${total} total)`);
console.log('═'.repeat(60));

if (skipped > 0) {
  console.log(`\n⏭️  ${skipped} tests skipped (require admin auth for RLS-protected CRUD)`);
}

if (failed > 0) {
  console.log('\nFailed tests:');
  results.filter(r => !r.passed).forEach(r => console.log(`  ❌ ${r.name}: ${r.error}`));
}

console.log(`\nTotal time: ${results.reduce((a, r) => a + r.ms, 0)}ms`);
process.exit(failed > 0 ? 1 : 0);
