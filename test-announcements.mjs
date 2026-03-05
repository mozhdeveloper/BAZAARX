/**
 * Announcements System End-to-End Test
 * Run: node test-announcements.mjs
 *
 * Tests:
 *  1. Create an announcement
 *  2. List announcements (verify newly created one appears)
 *  3. Fan-out — buyer_notifications / seller_notifications row count increases
 *  4. Toggle active (deactivate)
 *  5. getActiveAnnouncements — deactivated one should NOT appear
 *  6. Delete the announcement
 *  7. Register a push token (upsert)
 *  8. Delete the test push token (cleanup)
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
// Service-role key bypasses RLS so we can test without a real admin session
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`  ✅ PASS: ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  ❌ FAIL: ${label}`);
  if (detail) console.error(`         ${detail}`);
  failed++;
}

async function assert(label, condition, detail = '') {
  if (condition) pass(label);
  else fail(label, detail);
}

// ── Get a valid admin ID for FK constraint ────────────────────────────────────
async function getAdminId() {
  const { data, error } = await supabase.from('admins').select('id').limit(1).single();
  if (error || !data) {
    console.error('Could not find an admin row in the DB. Aborting test.', error);
    process.exit(1);
  }
  return data.id;
}

// Get a valid profile ID for push_tokens FK
async function getProfileId() {
  const { data, error } = await supabase.from('profiles').select('id').limit(1).single();
  if (error || !data) return null;
  return data.id;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🔔  Announcements System — End-to-End Test\n');

  // ── 0. Prerequisites ───────────────────────────────────────────────────────
  const adminId = await getAdminId();
  console.log(`  Admin ID: ${adminId}`);

  // Snapshot counts before we start
  const { count: buyerCountBefore } = await supabase
    .from('buyer_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'announcement');

  const { count: sellerCountBefore } = await supabase
    .from('seller_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'announcement');

  const { count: buyerCount } = await supabase.from('buyers').select('*', { count: 'exact', head: true });
  const { count: sellerCount } = await supabase.from('sellers').select('*', { count: 'exact', head: true });

  console.log(`  Buyers in DB: ${buyerCount ?? 0} | Sellers in DB: ${sellerCount ?? 0}`);
  console.log(`  Current buyer_notifications[announcement]: ${buyerCountBefore ?? 0}`);
  console.log(`  Current seller_notifications[announcement]: ${sellerCountBefore ?? 0}\n`);

  // ── 1. Create announcement (audience: all) ─────────────────────────────────
  console.log('Test 1 — Create announcement');
  const { data: created, error: createErr } = await supabase
    .from('announcements')
    .insert({
      admin_id: adminId,
      title: '[TEST] Bazaar maintenance window',
      message: 'We will be performing scheduled maintenance on Dec 25 from 2am–4am PST.',
      type: 'maintenance',
      audience: 'all',
      is_active: true,
    })
    .select()
    .single();

  await assert('announcement row created', !!created && !createErr, createErr?.message);
  if (!created) { printSummary(); return; }

  const annId = created.id;
  console.log(`  Announcement ID: ${annId}`);

  // ── 2. List announcements ──────────────────────────────────────────────────
  console.log('\nTest 2 — List announcements');
  const { data: list, error: listErr } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  await assert('list returns data', Array.isArray(list) && !listErr, listErr?.message);
  await assert('new announcement in list', list?.some(a => a.id === annId), 'id not found in list');

  // ── 3. Fan-out to buyer_notifications & seller_notifications ───────────────
  console.log('\nTest 3 — Fan-out notifications');
  let fanOutOk = true;

  if ((buyerCount ?? 0) > 0) {
    // Fan out buyers
    const { data: buyers } = await supabase.from('buyers').select('id').limit(500);
    const buyerRows = (buyers ?? []).map(b => ({
      buyer_id: b.id,
      type: 'announcement',
      title: created.title,
      message: created.message,
      action_data: { announcement_id: annId, announcement_type: created.type },
      priority: 'high',
    }));
    const { error: bInsertErr } = await supabase.from('buyer_notifications').insert(buyerRows);
    await assert(`fan-out ${buyerRows.length} buyer notification(s)`, !bInsertErr, bInsertErr?.message);
    if (bInsertErr) fanOutOk = false;
  } else {
    console.log('  ⚠️  No buyers in DB — skipping buyer fan-out test');
  }

  if ((sellerCount ?? 0) > 0) {
    // Fan out sellers
    const { data: sellers } = await supabase.from('sellers').select('id').limit(500);
    const sellerRows = (sellers ?? []).map(s => ({
      seller_id: s.id,
      type: 'announcement',
      title: created.title,
      message: created.message,
      action_data: { announcement_id: annId, announcement_type: created.type },
      priority: 'high',
    }));
    const { error: sInsertErr } = await supabase.from('seller_notifications').insert(sellerRows);
    await assert(`fan-out ${sellerRows.length} seller notification(s)`, !sInsertErr, sInsertErr?.message);
    if (sInsertErr) fanOutOk = false;
  } else {
    console.log('  ⚠️  No sellers in DB — skipping seller fan-out test');
  }

  // Verify count increased
  if (fanOutOk && (buyerCount ?? 0) > 0) {
    const { count: buyerCountAfter } = await supabase
      .from('buyer_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'announcement');
    await assert(
      `buyer_notifications count increased by ${buyerCount}`,
      (buyerCountAfter ?? 0) >= (buyerCountBefore ?? 0) + (buyerCount ?? 0),
      `Expected ≥${(buyerCountBefore ?? 0) + (buyerCount ?? 0)}, got ${buyerCountAfter}`
    );
  }

  // ── 4. Toggle active (deactivate) ─────────────────────────────────────────
  console.log('\nTest 4 — Toggle active (deactivate)');
  const { error: toggleErr } = await supabase
    .from('announcements')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', annId);
  await assert('toggle active = false succeeds', !toggleErr, toggleErr?.message);

  // Verify in DB
  const { data: toggled } = await supabase.from('announcements').select('is_active').eq('id', annId).single();
  await assert('is_active is now false', toggled?.is_active === false, `got ${toggled?.is_active}`);

  // ── 5. getActiveAnnouncements — deactivated should not appear ──────────────
  console.log('\nTest 5 — getActiveAnnouncements excludes deactivated');
  const { data: active } = await supabase
    .from('announcements')
    .select('id, title, message, type, audience, image_url, action_url, created_at')
    .eq('is_active', true)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false })
    .limit(50);

  await assert('deactivated announcement absent', !active?.some(a => a.id === annId), 'deactivated id still returned');

  // Reactivate for cleanup completeness
  await supabase.from('announcements').update({ is_active: true }).eq('id', annId);

  // ── 6. Delete announcement ─────────────────────────────────────────────────
  console.log('\nTest 6 — Delete announcement');
  const { error: delErr } = await supabase.from('announcements').delete().eq('id', annId);
  await assert('delete succeeds', !delErr, delErr?.message);

  const { data: afterDel } = await supabase.from('announcements').select('id').eq('id', annId).maybeSingle();
  await assert('announcement no longer in DB', afterDel === null, `still found: ${JSON.stringify(afterDel)}`);

  // ── 7. Push token upsert ───────────────────────────────────────────────────
  console.log('\nTest 7 — Register push token');
  const profileId = await getProfileId();

  if (profileId) {
    const testToken = `ExponentPushToken[TEST_${Date.now()}]`;
    const { error: tokenErr } = await supabase.from('push_tokens').upsert(
      { user_id: profileId, token: testToken, platform: 'ios', updated_at: new Date().toISOString() },
      { onConflict: 'token' }
    );
    await assert('push token upsert succeeds', !tokenErr, tokenErr?.message);

    // ── 8. Cleanup push token ──────────────────────────────────────────────
    console.log('\nTest 8 — Cleanup push token');
    const { error: cleanErr } = await supabase.from('push_tokens').delete().eq('token', testToken);
    await assert('push token cleaned up', !cleanErr, cleanErr?.message);
  } else {
    console.log('  ⚠️  No profile found — skipping push_token tests');
  }

  printSummary();
}

function printSummary() {
  const total = passed + failed;
  console.log('\n' + '─'.repeat(50));
  console.log(`Results: ${passed}/${total} passed  |  ${failed} failed`);
  if (failed === 0) {
    console.log('🎉  All announcement tests passed!\n');
  } else {
    console.log('⚠️   Some tests failed — review output above.\n');
    process.exitCode = 1;
  }
}

run().catch(err => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
