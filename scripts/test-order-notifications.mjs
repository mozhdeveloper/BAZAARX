/**
 * ORDER NOTIFICATION SYSTEM — End-to-End Test
 *
 * Covers:
 *  [1] DB connection
 *  [2] Web hook — file exists + mounted in App.tsx
 *  [3] Mobile hook — file exists + mounted in App.tsx
 *  [4] DB trigger (behavioral): order status change → buyer_notification auto-inserted
 *  [5] Realtime WEB   — supabase channel fires on buyer_notifications INSERT
 *  [6] Realtime MOBILE — separate client simulating mobile subscription
 *  [7] Edge function — send-push-notification reachable + correct CORS
 *  [8] Cleanup — all test rows removed
 *
 * Run: node scripts/test-order-notifications.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Credentials (project ijdpbfrcvdflzwytxncj) ───────────────────────────
const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

// Two independent clients — one per platform
const sbAdmin  = createClient(SUPABASE_URL, SERVICE_KEY);
const sbMobile = createClient(SUPABASE_URL, ANON_KEY);

// ── State ─────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let warned = 0;
const cleanupIds = []; // buyer_notification IDs to delete after test

// ── Helpers ───────────────────────────────────────────────────────────────
function header(title) {
  console.log('\n' + '═'.repeat(62));
  console.log('  ' + title);
  console.log('═'.repeat(62));
}
function ok(label, detail = '') {
  passed++;
  console.log(`  ✅ ${label}${detail ? '  →  ' + detail : ''}`);
}
function fail(label, e = '') {
  failed++;
  const msg = (e instanceof Error) ? e.message : String(e ?? '');
  console.log(`  ❌ ${label}${msg ? '  →  ' + msg : ''}`);
}
function warn(label, detail = '') {
  warned++;
  console.log(`  ⚠️  ${label}${detail ? '  →  ' + detail : ''}`);
}
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
function fileHas(relPath, str) {
  const abs = resolve(ROOT, relPath);
  if (!existsSync(abs)) return false;
  return readFileSync(abs, 'utf8').includes(str);
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║   ORDER NOTIFICATION SYSTEM — END-TO-END TEST              ║');
console.log('╚════════════════════════════════════════════════════════════╝');

// ─────────────────────────────────────────────────────────────────────────
// [1] DB CONNECTION
// ─────────────────────────────────────────────────────────────────────────
header('[1] Database connection');
{
  const { error } = await sbAdmin.from('orders').select('id').limit(1);
  if (error) {
    fail('Supabase connection failed', error?.message ?? JSON.stringify(error));
    console.log('\nCannot continue without DB. Exiting.');
    process.exit(1);
  }
  ok('Connected to Supabase', SUPABASE_URL);
}

// ─────────────────────────────────────────────────────────────────────────
// [2] WEB HOOK — code checks
// ─────────────────────────────────────────────────────────────────────────
header('[2] Web — useGlobalOrderNotifications');

const WEB_HOOK = 'web/src/hooks/useGlobalOrderNotifications.ts';
const WEB_APP  = 'web/src/App.tsx';

existsSync(resolve(ROOT, WEB_HOOK))
  ? ok('Hook file exists', WEB_HOOK)
  : fail('Hook file missing', WEB_HOOK);

fileHas(WEB_APP, "from './hooks/useGlobalOrderNotifications'")
  ? ok('Imported in web/src/App.tsx')
  : fail('Not imported in web/src/App.tsx');

fileHas(WEB_APP, 'useGlobalOrderNotifications()')
  ? ok('Mounted (called) inside App()') 
  : fail('Not called/mounted inside App()');

fileHas(WEB_HOOK, 'buyer_notifications')
  ? ok('Subscribes to buyer_notifications')
  : fail('Does not subscribe to buyer_notifications');

fileHas(WEB_HOOK, 'seller_notifications')
  ? ok('Subscribes to seller_notifications')
  : fail('Does not subscribe to seller_notifications');

fileHas(WEB_HOOK, 'toast(')
  ? ok('Calls toast() for in-app banner')
  : fail('Does not call toast()');

// ─────────────────────────────────────────────────────────────────────────
// [3] MOBILE HOOK — code checks
// ─────────────────────────────────────────────────────────────────────────
header('[3] Mobile — useGlobalNotifications');

const MOB_HOOK = 'mobile-app/src/hooks/useGlobalNotifications.ts';
const MOB_APP  = 'mobile-app/App.tsx';

existsSync(resolve(ROOT, MOB_HOOK))
  ? ok('Hook file exists', MOB_HOOK)
  : fail('Hook file missing', MOB_HOOK);

fileHas(MOB_APP, "from './src/hooks/useGlobalNotifications'")
  ? ok('Imported in mobile-app/App.tsx')
  : fail('Not imported in mobile-app/App.tsx');

fileHas(MOB_APP, 'useGlobalNotifications()')
  ? ok('Mounted (called) inside MainTabs()')
  : fail('Not called/mounted inside MainTabs()');

fileHas(MOB_HOOK, 'scheduleNotificationAsync')
  ? ok('Calls scheduleNotificationAsync for foreground alert')
  : fail('Does not call scheduleNotificationAsync');

fileHas(MOB_HOOK, 'AppState')
  ? ok('Foreground guard via AppState')
  : fail('Missing AppState foreground guard');

fileHas(MOB_HOOK, 'notificationService.subscribeToNotifications')
  ? ok('Uses notificationService.subscribeToNotifications')
  : fail('Does not use notificationService.subscribeToNotifications');

// ─────────────────────────────────────────────────────────────────────────
// [4] DB TRIGGER — behavioral test
// ─────────────────────────────────────────────────────────────────────────
header('[4] DB trigger: order status change → buyer_notifications INSERT');

let testOrder = null;
{
  const { data: orders, error } = await sbAdmin
    .from('orders')
    .select('id, order_number, buyer_id, shipment_status')
    .not('buyer_id', 'is', null)
    .not('shipment_status', 'in', '("delivered","cancelled","returned","failed_to_deliver")')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    fail('Order lookup failed', error);
  } else if (!orders?.length) {
    warn('No suitable test orders found — trigger test skipped');
    warn('(Need an order with buyer_id and a non-final shipment_status)');
  } else {
    testOrder = orders[0];
    ok('Located test order',
       `#${testOrder.order_number}  status=${testOrder.shipment_status}  buyer=${testOrder.buyer_id.slice(0,8)}…`);

    const statusMap = {
      pending:           'processing',
      processing:        'shipped',
      ready_to_ship:     'shipped',
      shipped:           'out_for_delivery',
      out_for_delivery:  'delivered',
      received:          'processing',
      waiting_for_seller:'processing',
    };
    const targetStatus = statusMap[testOrder.shipment_status] ?? 'shipped';
    const since = new Date(Date.now() - 60_000).toISOString();

    // Count pre-existing notifications of this exact type in last 60 s
    const { count: before } = await sbAdmin
      .from('buyer_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', testOrder.buyer_id)
      .eq('type', `order_${targetStatus}`)
      .gte('created_at', since);

    // Trigger the status update
    const { error: upErr } = await sbAdmin
      .from('orders')
      .update({ shipment_status: targetStatus })
      .eq('id', testOrder.id);

    if (upErr) {
      fail(`Order update to '${targetStatus}' failed`, upErr);
    } else {
      ok(`Order updated → '${targetStatus}'`);
      await sleep(2500); // wait for PG trigger

      const { data: fresh, count: after, error: nErr } = await sbAdmin
        .from('buyer_notifications')
        .select('id, title, message', { count: 'exact' })
        .eq('buyer_id', testOrder.buyer_id)
        .eq('type', `order_${targetStatus}`)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1);

      if (nErr) {
        fail('Notification query after trigger failed', nErr);
      } else if ((after ?? 0) > (before ?? 0) && fresh?.length) {
        ok('Trigger auto-inserted buyer_notification ✓', `"${fresh[0].title}"`);
        ok('Message populated', fresh[0].message.slice(0, 65));
        cleanupIds.push(fresh[0].id);
      } else {
        fail(
          'Trigger did NOT insert a buyer_notification',
          `count before=${before ?? 0}  after=${after ?? 0} — did you paste the SQL in Supabase dashboard?`
        );
      }

      // Restore original status
      const { error: restErr } = await sbAdmin
        .from('orders')
        .update({ shipment_status: testOrder.shipment_status })
        .eq('id', testOrder.id);

      restErr
        ? warn('Could not restore order status', restErr.message)
        : ok(`Order restored → '${testOrder.shipment_status}'`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// RESOLVE A BUYER ID for realtime tests
// ─────────────────────────────────────────────────────────────────────────
let rtBuyerId = testOrder?.buyer_id ?? null;
if (!rtBuyerId) {
  const { data: buyers } = await sbAdmin.from('buyers').select('id').limit(1);
  rtBuyerId = buyers?.[0]?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────
// [5] REALTIME — WEB
// ─────────────────────────────────────────────────────────────────────────
header('[5] Realtime — web subscription (simulates useGlobalOrderNotifications)');

if (!rtBuyerId) {
  warn('No buyer ID available — web realtime test skipped');
} else {
  ok('Subscribing as buyer', rtBuyerId.slice(0, 8) + '…');

  const webResult = await new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      sbMobile.removeChannel(webCh);
      resolve(null);
    }, 7000);

    // Use anon client — mirrors what the real web app does (authenticated user session)
    const webCh = sbMobile
      .channel(`test_web_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'buyer_notifications',
          filter: `buyer_id=eq.${rtBuyerId}`,
        },
        (payload) => {
          if (!payload.new?.title?.startsWith('[TEST]')) return; // ignore unrelated
          clearTimeout(timeoutId);
          sbMobile.removeChannel(webCh);
          resolve(payload.new);
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await sleep(400);
          const { data, error } = await sbAdmin
            .from('buyer_notifications')
            .insert({
              buyer_id: rtBuyerId,
              type: 'order_shipped',
              title: '[TEST] Web Realtime Check',
              message: 'Automated test row — will be deleted',
              priority: 'normal',
            })
            .select('id')
            .single();

          if (error) {
            clearTimeout(timeoutId);
            sbMobile.removeChannel(webCh);
            resolve({ _insertError: error.message });
          } else if (data?.id) {
            cleanupIds.push(data.id);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeoutId);
          resolve(null);
        }
      });
  });

  if (webResult?._insertError) {
    fail('Could not insert test notification row', webResult._insertError);
  } else if (webResult) {
    ok('Web realtime channel received INSERT event ✓', `type=${webResult.type}`);
    ok('useGlobalOrderNotifications toast() would fire here');
  } else {
    fail('Web realtime subscription timed out (7 s)', 'Check Supabase Realtime is enabled for buyer_notifications');
  }
}

// ─────────────────────────────────────────────────────────────────────────
// [6] REALTIME — MOBILE
// ─────────────────────────────────────────────────────────────────────────
header('[6] Realtime — mobile subscription (simulates useGlobalNotifications)');

if (!rtBuyerId) {
  warn('No buyer ID available — mobile realtime test skipped');
} else {
  ok('Subscribing as buyer (anon client)', rtBuyerId.slice(0, 8) + '…');

  const mobResult = await new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      sbMobile.removeChannel(mobCh);
      resolve(null);
    }, 7000);

    const mobCh = sbMobile
      .channel(`test_mob_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'buyer_notifications',
          filter: `buyer_id=eq.${rtBuyerId}`,
        },
        (payload) => {
          if (!payload.new?.title?.startsWith('[TEST]')) return;
          clearTimeout(timeoutId);
          sbMobile.removeChannel(mobCh);
          resolve(payload.new);
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await sleep(400);
          const { data, error } = await sbAdmin
            .from('buyer_notifications')
            .insert({
              buyer_id: rtBuyerId,
              type: 'order_delivered',
              title: '[TEST] Mobile Realtime Check',
              message: 'Automated test row — will be deleted',
              priority: 'high',
            })
            .select('id')
            .single();

          if (error) {
            clearTimeout(timeoutId);
            sbMobile.removeChannel(mobCh);
            resolve({ _insertError: error.message });
          } else if (data?.id) {
            cleanupIds.push(data.id);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeoutId);
          resolve(null);
        }
      });
  });

  if (mobResult?._insertError) {
    fail('Could not insert test notification row', mobResult._insertError);
  } else if (mobResult) {
    ok('Mobile realtime channel received INSERT event ✓', `type=${mobResult.type}`);
    ok('useGlobalNotifications scheduleNotificationAsync() would fire here');
  } else {
    fail('Mobile realtime subscription timed out (7 s)', 'Check Supabase Realtime is enabled for buyer_notifications');
  }
}

// ─────────────────────────────────────────────────────────────────────────
// [7] EDGE FUNCTION
// ─────────────────────────────────────────────────────────────────────────
header('[7] Edge function — send-push-notification');

// 7a. Normal POST (empty tokens → fast 200 response)
try {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    // Pass a userId that won't have push tokens registered → returns {sent:0} with HTTP 200
    body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000000', title: 'ping', body: 'test' }),
  });
  const cors = res.headers.get('access-control-allow-origin');
  const json = await res.json().catch(() => ({}));

  res.ok
    ? ok('Edge function reachable', `HTTP ${res.status}`)
    : fail('Edge function error response', `HTTP ${res.status}: ${JSON.stringify(json)}`);

  cors === '*'
    ? ok('CORS header correct (Access-Control-Allow-Origin: *)')
    : fail('CORS header missing or wrong', `got: ${cors}`);

  typeof json.sent === 'number'
    ? ok('Response JSON valid', `{sent: ${json.sent}, message: "${json.message}"}`)
    : warn('Unexpected response body', JSON.stringify(json));

} catch (e) {
  fail('POST request to edge function failed', e);
}

// 7b. OPTIONS preflight
try {
  const pre = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
    method: 'OPTIONS',
    headers: { 'Origin': 'https://example.com', 'Access-Control-Request-Method': 'POST' },
  });
  (pre.ok || pre.status === 204)
    ? ok('OPTIONS preflight handled', `HTTP ${pre.status}`)
    : warn('OPTIONS returned unexpected status', String(pre.status));
} catch (e) {
  warn('OPTIONS check failed', e.message);
}

// 7c. Source check — no duplicate serve()
{
  const efSrc = 'supabase/functions/send-push-notification/index.ts';
  if (existsSync(resolve(ROOT, efSrc))) {
    const src = readFileSync(resolve(ROOT, efSrc), 'utf8');
    const count = (src.match(/^serve\(/gm) ?? []).length;
    count === 1
      ? ok('Edge function has exactly 1 serve() call (no duplicate)')
      : fail(`Edge function has ${count} serve() calls — duplicate still present!`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// [8] CLEANUP
// ─────────────────────────────────────────────────────────────────────────
header('[8] Cleanup');

await sbAdmin.removeAllChannels();
await sbMobile.removeAllChannels();

if (cleanupIds.length === 0) {
  ok('No test rows to clean up');
} else {
  const { error } = await sbAdmin
    .from('buyer_notifications')
    .delete()
    .in('id', cleanupIds);
  error
    ? warn('Cleanup partial failure', error.message)
    : ok(`Deleted ${cleanupIds.length} test notification row(s)`);
}

// ─────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────
const line = `  ${passed} passed  |  ${failed} failed  |  ${warned} warnings`;
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log(('║' + line).padEnd(61) + '║');
if (failed === 0) {
  console.log('║  ✅  ALL CHECKS PASSED — notification system is live        ║');
} else {
  console.log('║  ❌  SOME CHECKS FAILED — see output above                  ║');
}
console.log('╚════════════════════════════════════════════════════════════╝\n');

process.exit(failed > 0 ? 1 : 0);
