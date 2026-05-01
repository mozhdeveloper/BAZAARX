/**
 * EPIC 7 — Product Request System  E2E test (v2)
 * Validates the migration 20260505010000_epic7_product_request_system.sql
 *
 * Run:  node scripts/test-epic7-product-requests.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

let pass = 0, fail = 0, skip = 0;
const ok   = (n) => { pass++; console.log(`  ✅  ${n}`); };
const bad  = (n, e) => { fail++; console.log(`  ❌  ${n}\n      ${typeof e === 'string' ? e : JSON.stringify(e)}`); };
const skp  = (n, why) => { skip++; console.log(`  ⏭  ${n}  (${why})`); };
const sect = (s) => console.log(`\n━━ ${s} ━━`);

async function pickActiveBuyer() {
  const { data } = await sb.from('buyers').select('id, bazcoins').limit(10);
  if (!data?.length) return null;
  for (const b of data) {
    const { data: prof } = await sb.from('profiles').select('email').eq('id', b.id).maybeSingle();
    if (prof?.email) {
      if ((b.bazcoins ?? 0) < 500) await sb.from('buyers').update({ bazcoins: 500 }).eq('id', b.id);
      return { id: b.id, email: prof.email };
    }
  }
  return null;
}

async function getAuthedClient(email, userId) {
  const tempPw = 'EPIC7-Test-' + Date.now();
  const { error: u } = await sb.auth.admin.updateUserById(userId, { password: tempPw });
  if (u) throw new Error('updateUserById: ' + u.message);
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: s } = await anon.auth.signInWithPassword({ email, password: tempPw });
  if (s) throw new Error('signIn: ' + s.message);
  return anon;
}

async function pickAdmin() {
  const { data } = await sb.from('admins').select('id').limit(5);
  if (!data?.length) return null;
  for (const a of data) {
    const { data: prof } = await sb.from('profiles').select('email').eq('id', a.id).maybeSingle();
    if (prof?.email) return { id: a.id, email: prof.email };
  }
  return null;
}

async function main() {
  let buyerId, buyerEmail, requestId, secondRequestId, productId, sellerId;
  const cleanupReqIds = [];

  sect('[1] DB connection');
  const { error: c } = await sb.from('product_requests').select('id').limit(1);
  if (c) { bad('connect', c.message); return; } else ok('connected');

  sect('[2] EPIC 7 tables exist');
  for (const t of ['request_attachments','request_supports','supplier_offers','request_audit_logs','trust_artifacts']) {
    const { error } = await sb.from(t).select('*', { head: true, count: 'exact' });
    error ? bad(t, error.message) : ok(t);
  }

  sect('[3] EPIC 7 columns on product_requests');
  const buyer = await pickActiveBuyer();
  if (!buyer) { bad('test buyer', 'no buyer with profile email'); return; }
  buyerId = buyer.id; buyerEmail = buyer.email;
  const { data: prData, error: prErr } = await sb.from('product_requests').insert({
    requested_by_id: buyerId,
    title: 'EPIC7-Test ' + Date.now(),
    summary: 'Compact bluetooth tracker.',
    product_name: 'BT Tracker',
    description: 'Test request',
    category: 'Electronics',
    status: 'new',
    reward_amount: 100,
  }).select().single();
  if (prErr) { bad('insert', prErr.message); return; }
  requestId = prData.id; cleanupReqIds.push(requestId);
  const cols = ['title','summary','sourcing_stage','demand_count','staked_bazcoins','linked_product_id','rejection_hold_reason','merged_into_id','converted_at','reward_amount'];
  const missing = cols.filter((k) => !(k in prData));
  missing.length ? bad('cols', 'missing: ' + missing) : ok('all 10 EPIC-7 cols present');

  sect('[4] support_product_request RPC');
  let userClient;
  try {
    userClient = await getAuthedClient(buyerEmail, buyerId);
    const { data: r1, error: e1 } = await userClient.rpc('support_product_request', { p_request_id: requestId, p_support_type: 'upvote', p_bazcoin_amount: 0 });
    e1 ? bad('upvote', e1.message) : ok('upvote → ' + JSON.stringify(r1));

    const { error: e1b } = await userClient.rpc('support_product_request', { p_request_id: requestId, p_support_type: 'upvote', p_bazcoin_amount: 0 });
    e1b ? ok('duplicate upvote rejected') : bad('dup upvote', 'expected error');

    const { data: r2, error: e2 } = await userClient.rpc('support_product_request', { p_request_id: requestId, p_support_type: 'stake', p_bazcoin_amount: 100 });
    e2 ? bad('stake', e2.message) : ok('stake 100 BC → ' + JSON.stringify(r2));

    const { data: pr } = await sb.from('product_requests').select('demand_count, staked_bazcoins').eq('id', requestId).maybeSingle();
    (pr?.demand_count >= 1 && pr?.staked_bazcoins >= 100)
      ? ok(`counters demand=${pr.demand_count} staked=${pr.staked_bazcoins}`)
      : bad('counters', JSON.stringify(pr));

    const { data: ledger } = await sb.from('bazcoin_transactions').select('id').eq('user_id', buyerId).eq('reference_id', requestId);
    (ledger?.length >= 1) ? ok(`ledger rows=${ledger.length}`) : bad('ledger', 'no row');
  } catch (e) {
    bad('auth setup', e.message);
  }

  sect('[5] admin_action_product_request RPC');
  const adminInfo = await pickAdmin();
  let adminClient = null;
  if (!adminInfo) {
    skp('admin RPCs', 'no admin with email found — sections 5 & 6 partial');
  } else {
    try { adminClient = await getAuthedClient(adminInfo.email, adminInfo.id); }
    catch (e) { bad('admin sign-in', e.message); }
  }
  const adm = adminClient || sb;  // fall back to service-role (will fail admin gate)

  const { error: ea } = await adm.rpc('admin_action_product_request', { p_request_id: requestId, p_action: 'approve', p_reason: null, p_target_id: null, p_new_stage: null });
  ea ? bad('approve', ea.message) : ok('approve');

  const { error: eb } = await adm.rpc('admin_action_product_request', { p_request_id: requestId, p_action: 'reject', p_reason: null, p_target_id: null, p_new_stage: null });
  eb ? ok('reject without reason rejected (' + eb.message.slice(0, 40) + ')') : bad('reject no-reason', 'expected error');

  const { data: pr2, error: pr2e } = await sb.from('product_requests').insert({
    requested_by_id: buyerId, title: 'Link target ' + Date.now(), summary: 'x', product_name: 'X', category: 'Misc', status: 'new',
  }).select().single();
  if (pr2e) bad('insert link target', pr2e.message);
  else { secondRequestId = pr2.id; cleanupReqIds.push(secondRequestId); }

  const { data: prod } = await sb.from('products').select('id').limit(1).maybeSingle();
  if (prod?.id && secondRequestId) {
    productId = prod.id;
    const { error: ec } = await adm.rpc('admin_action_product_request', { p_request_id: secondRequestId, p_action: 'link_product', p_reason: 'duplicate', p_target_id: productId, p_new_stage: null });
    ec ? bad('link_product', ec.message) : ok('link_product → already_available');
  } else skp('link_product', 'no products in DB');

  const { data: log } = await sb.from('request_audit_logs').select('id,action').eq('request_id', requestId);
  (log?.length >= 1) ? ok(`audit rows=${log.length} (${log.map((l)=>l.action).join(',')})`) : bad('audit log', 'missing');

  sect('[6] convert_request_to_listing pays reward');
  if (productId && adminClient) {
    const { data: before } = await sb.from('buyers').select('bazcoins').eq('id', buyerId).maybeSingle();
    const { data: cv, error: ev } = await adminClient.rpc('convert_request_to_listing', { p_request_id: requestId, p_product_id: productId });
    if (ev) bad('convert', ev.message);
    else {
      ok('convert → ' + JSON.stringify(cv));
      const { data: after } = await sb.from('buyers').select('bazcoins').eq('id', buyerId).maybeSingle();
      const delta = (after?.bazcoins ?? 0) - (before?.bazcoins ?? 0);
      delta > 0 ? ok(`reward +${delta} BC`) : bad('reward', `before=${before?.bazcoins} after=${after?.bazcoins}`);
      const { data: rew } = await sb.from('request_supports').select('rewarded').eq('request_id', requestId).eq('user_id', buyerId);
      rew?.some((r) => r.rewarded) ? ok('supports.rewarded=true') : bad('rewarded flag', 'not set');
      const { data: notif } = await sb.from('buyer_notifications').select('id').eq('buyer_id', buyerId).eq('type', 'product_request_listed').limit(1);
      notif?.length ? ok('product_request_listed notification') : bad('notification', 'missing');
    }
  } else skp('convert', !productId ? 'no product' : 'no admin client');

  sect('[7] status-change trigger writes notification');
  if (secondRequestId) {
    const { count: before } = await sb.from('buyer_notifications').select('id', { head: true, count: 'exact' }).eq('buyer_id', buyerId);
    await sb.from('product_requests').update({ status: 'on_hold', rejection_hold_reason: 'awaiting clarification' }).eq('id', secondRequestId);
    await new Promise((r) => setTimeout(r, 500));
    const { count: after } = await sb.from('buyer_notifications').select('id', { head: true, count: 'exact' }).eq('buyer_id', buyerId);
    (after ?? 0) > (before ?? 0) ? ok(`trigger fired (+${after - before})`) : bad('trigger', `before=${before} after=${after}`);
  } else skp('trigger', 'no 2nd request');

  sect('[8] RLS — supplier_offers');
  const { data: anyS } = await sb.from('sellers').select('id').limit(1).maybeSingle();
  sellerId = anyS?.id;
  if (!sellerId || !secondRequestId) skp('RLS', 'no seller');
  else {
    const { error: insErr } = await sb.from('supplier_offers').insert({
      request_id: secondRequestId, supplier_id: sellerId, price: 199, moq: 10, lead_time_days: 7,
    });
    insErr ? bad('insert (admin)', insErr.message) : ok('admin can insert offer');
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: anonRows } = await anon.from('supplier_offers').select('id').eq('request_id', secondRequestId);
    (!anonRows || anonRows.length === 0) ? ok('anon blocked (RLS)') : bad('rls', `${anonRows.length} rows leaked`);
  }

  sect('[9] Cleanup');
  if (sellerId && secondRequestId) await sb.from('supplier_offers').delete().eq('request_id', secondRequestId);
  if (cleanupReqIds.length) {
    await sb.from('request_audit_logs').delete().in('request_id', cleanupReqIds);
    await sb.from('request_supports').delete().in('request_id', cleanupReqIds);
    await sb.from('bazcoin_transactions').delete().in('reference_id', cleanupReqIds);
    await sb.from('product_requests').delete().in('id', cleanupReqIds);
  }
  ok('cleanup');

  console.log(`\n━━ RESULT: ${pass} passed / ${fail} failed / ${skip} skipped ━━\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(2); });
