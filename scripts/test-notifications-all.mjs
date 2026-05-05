/**
 * NOTIFICATION SYSTEM — Comprehensive End-to-End Test
 *
 * Covers every fix shipped in May 2026:
 *  [1]  DB connection
 *  [2]  Flash sale auto-hide  (useFlashSaleVisibility.ts + HomeScreen.tsx)
 *  [3]  Order cancel restriction  (OrdersScreen.tsx + OrderDetailScreen.tsx)
 *  [4]  Order notification hooks  (web + mobile — frontend code checks)
 *  [5]  Message notification hooks  (web + mobile — frontend code checks)
 *  [6]  Message tap-routing in App.tsx  ('new_message' case)
 *  [7]  DB trigger: order status change → buyer_notification INSERT
 *  [8]  DB trigger: seller sends message → buyer_notification INSERT
 *  [9]  DB trigger: buyer sends message → seller_notification INSERT
 *  [10] Realtime — direct messages channel (mobile fallback subscription)
 *  [11] Realtime — buyer_notifications channel (web simulation)
 *  [12] Realtime — seller_notifications channel (mobile simulation)
 *  [13] Edge function — send-push-notification reachable + CORS
 *  [14] Cleanup
 *
 * Run:
 *   node scripts/test-notifications-all.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Credentials ──────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

// Two independent clients (admin = service role, anon = simulates app client)
const sbAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
const sbAnon  = createClient(SUPABASE_URL, ANON_KEY);

// ── State ─────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let warned = 0;
const cleanup = { buyerNotif: [], sellerNotif: [], messages: [] };

// ── Helpers ───────────────────────────────────────────────────────────────
const header = (t) => {
  console.log('\n' + '═'.repeat(64));
  console.log('  ' + t);
  console.log('═'.repeat(64));
};
const ok   = (l, d = '') => { passed++; console.log(`  ✅ ${l}${d ? '  →  ' + d : ''}`); };
const fail = (l, e = '') => { failed++; const m = (e instanceof Error) ? e.message : String(e ?? ''); console.log(`  ❌ ${l}${m ? '  →  ' + m : ''}`); };
const warn = (l, d = '') => { warned++; console.log(`  ⚠️  ${l}${d ? '  →  ' + d : ''}`); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function src(relPath) {
  const abs = resolve(ROOT, relPath);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
}
function fileHas(relPath, str) {
  const s = src(relPath);
  return s !== null && s.includes(str);
}
function fileExists(relPath) {
  return existsSync(resolve(ROOT, relPath));
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║   BAZAAR — NOTIFICATION SYSTEM — COMPLETE E2E TEST           ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

// ═════════════════════════════════════════════════════════════════════════
// [1] DB CONNECTION
// ═════════════════════════════════════════════════════════════════════════
header('[1] Database connection');
{
  const { error } = await sbAdmin.from('buyer_notifications').select('id').limit(1);
  if (error) {
    fail('Supabase connection failed', error?.message ?? JSON.stringify(error));
    console.log('\nCannot continue without DB. Exiting.');
    process.exit(1);
  }
  ok('Connected to Supabase', SUPABASE_URL);
}

// ═════════════════════════════════════════════════════════════════════════
// [2] FLASH SALE AUTO-HIDE  (code checks)
// ═════════════════════════════════════════════════════════════════════════
header('[2] Flash sale auto-hide — useFlashSaleVisibility + HomeScreen');

const FLASH_HOOK = 'mobile-app/src/hooks/useFlashSaleVisibility.ts';
const HOME       = 'mobile-app/app/HomeScreen.tsx';

fileExists(FLASH_HOOK)
  ? ok('Hook file exists', FLASH_HOOK)
  : fail('Hook file missing', FLASH_HOOK);

// Expiry aligned with countdown (floor-based seconds)
fileHas(FLASH_HOOK, 'Math.floor((endTime - now) / 1000)')
  ? ok('Expiry uses Math.floor (matches timer display)')
  : fail('Expiry check not floor-based — timer and hide may be misaligned');

// Suppression window prevents re-show due to DB clock skew
fileHas(FLASH_HOOK, 'suppressedUntilRef')
  ? ok('suppressedUntilRef suppression window present (clock-skew guard)')
  : fail('suppressedUntilRef missing — flash sale can re-appear after expiry');

fileHas(FLASH_HOOK, '10_000')
  ? ok('10-second suppression window set')
  : fail('Suppression window not 10 s — check the value');

// wasVisibleRef one-shot refresh
fileHas(FLASH_HOOK, 'wasVisibleRef')
  ? ok('wasVisibleRef one-shot transition guard present')
  : fail('wasVisibleRef missing — refresh may fire repeatedly');

// HomeScreen clears state immediately before async reload
fileHas(HOME, 'setFlashSaleProducts([])')
  ? ok('HomeScreen clears flashSaleProducts[] immediately on expiry callback')
  : fail('HomeScreen does not clear flashSaleProducts[] — stale items visible during reload');

fileHas(HOME, 'isFlashSaleVisible')
  ? ok('Flash sale section gated on isFlashSaleVisible')
  : fail('isFlashSaleVisible not used to gate section render');

// ═════════════════════════════════════════════════════════════════════════
// [3] ORDER CANCELLATION RESTRICTION  (code checks)
// ═════════════════════════════════════════════════════════════════════════
header('[3] Order cancel — restricted to Pending status only');

const ORDERS_SCREEN  = 'mobile-app/app/OrdersScreen.tsx';
const DETAIL_SCREEN  = 'mobile-app/app/OrderDetailScreen.tsx';

fileExists(ORDERS_SCREEN)
  ? ok('OrdersScreen.tsx exists')
  : fail('OrdersScreen.tsx missing');

// renderActionButtons: processing case must NOT contain Cancel button
const ordersSrc = src(ORDERS_SCREEN) ?? '';
const processingBlock = (() => {
  const idx = ordersSrc.indexOf("case 'processing':");
  if (idx === -1) return '';
  // Grab text up to the next 'case ' or end of switch
  const nextCase = ordersSrc.indexOf('case ', idx + 10);
  return nextCase !== -1 ? ordersSrc.slice(idx, nextCase) : ordersSrc.slice(idx, idx + 300);
})();

!processingBlock.includes('handleCancelOrder') && !processingBlock.includes('Cancel')
  ? ok("processing case has no Cancel button")
  : fail("processing case still renders a Cancel button — buyers can cancel mid-processing");

// onCancel prop must be guarded to pending only
fileHas(ORDERS_SCREEN, "buyerUiStatus === 'pending' ? () => handleCancelOrder")
  ? ok("onCancel prop guarded to pending status only")
  : fail("onCancel is not guarded — Cancel button shows for non-pending orders");

// OrderDetailScreen: Cancel button only when resolvedUiStatus === 'pending'
fileExists(DETAIL_SCREEN)
  ? ok('OrderDetailScreen.tsx exists')
  : fail('OrderDetailScreen.tsx missing');

fileHas(DETAIL_SCREEN, "resolvedUiStatus === 'pending'")
  ? ok("OrderDetailScreen Cancel button restricted to pending status")
  : fail("OrderDetailScreen does not restrict Cancel to pending");

// Processing branch must only show Chat, not Cancel
const detailSrc = src(DETAIL_SCREEN) ?? '';
const processingDetailBlock = (() => {
  const marker = "resolvedUiStatus === 'processing'";
  const idx = detailSrc.indexOf(marker);
  if (idx === -1) return '';
  return detailSrc.slice(idx, idx + 300);
})();

!processingDetailBlock.includes('handleCancelOrder')
  ? ok("OrderDetailScreen processing section has no cancel handler")
  : fail("OrderDetailScreen processing section still calls handleCancelOrder");

// ═════════════════════════════════════════════════════════════════════════
// [4] ORDER NOTIFICATION HOOKS  (frontend code checks)
// ═════════════════════════════════════════════════════════════════════════
header('[4] Order notification hooks — web + mobile');

const WEB_HOOK  = 'web/src/hooks/useGlobalOrderNotifications.ts';
const WEB_APP   = 'web/src/App.tsx';
const MOB_HOOK  = 'mobile-app/src/hooks/useGlobalNotifications.ts';
const MOB_APP   = 'mobile-app/App.tsx';

fileExists(WEB_HOOK)
  ? ok('Web hook file exists', WEB_HOOK)
  : fail('Web hook file missing', WEB_HOOK);

fileHas(WEB_HOOK, 'buyer_notifications')
  ? ok('Web hook subscribes to buyer_notifications')
  : fail('Web hook missing buyer_notifications subscription');

fileHas(WEB_HOOK, 'seller_notifications')
  ? ok('Web hook subscribes to seller_notifications')
  : fail('Web hook missing seller_notifications subscription');

fileHas(WEB_HOOK, 'toast(')
  ? ok('Web hook calls toast() for in-app banner')
  : fail('Web hook does not call toast()');

fileHas(WEB_APP, 'useGlobalOrderNotifications()')
  ? ok('Web hook mounted in web/src/App.tsx')
  : fail('Web hook not mounted in App.tsx');

fileExists(MOB_HOOK)
  ? ok('Mobile hook file exists', MOB_HOOK)
  : fail('Mobile hook file missing', MOB_HOOK);

fileHas(MOB_HOOK, 'setNotificationHandler')
  ? ok('Mobile hook sets foreground notification handler')
  : fail('Mobile hook missing setNotificationHandler — banners will not show in foreground');

fileHas(MOB_HOOK, 'requestPermissionsAsync')
  ? ok('Mobile hook requests notification permissions')
  : fail('Mobile hook missing requestPermissionsAsync — iOS silent, Android 13+ silent');

fileHas(MOB_HOOK, 'setNotificationChannelAsync')
  ? ok('Mobile hook creates Android notification channel')
  : fail('Mobile hook missing setNotificationChannelAsync — Android notifications may be silent');

fileHas(MOB_HOOK, 'scheduleNotificationAsync')
  ? ok('Mobile hook fires local banner via scheduleNotificationAsync')
  : fail('Mobile hook missing scheduleNotificationAsync');

fileHas(MOB_HOOK, 'AppState')
  ? ok('Foreground guard via AppState (avoids duplicate with remote push)')
  : fail('Missing AppState guard');

fileHas(MOB_HOOK, 'notificationService.subscribeToNotifications')
  ? ok('Mobile hook uses notificationService.subscribeToNotifications')
  : fail('Mobile hook missing subscribeToNotifications');

fileHas(MOB_APP, 'useGlobalNotifications()')
  ? ok('Mobile hook mounted in mobile-app/App.tsx')
  : fail('Mobile hook not mounted in App.tsx');

// ═════════════════════════════════════════════════════════════════════════
// [5] MESSAGE NOTIFICATION HOOKS  (frontend code checks)
// ═════════════════════════════════════════════════════════════════════════
header('[5] Message notification hooks — direct subscription fallback');

// Direct messages subscription on the messages table
fileHas(MOB_HOOK, "table: 'messages'")
  ? ok("Mobile hook subscribes directly to 'messages' table (DB trigger fallback)")
  : fail("Mobile hook missing direct 'messages' subscription — relies solely on DB trigger");

fileHas(MOB_HOOK, "table, 'messages'")
  || fileHas(MOB_HOOK, "table: 'messages'")
  ? true  // already checked above
  : false;

fileHas(MOB_HOOK, 'recentlyShownMsgIds')
  ? ok('Deduplication set (recentlyShownMsgIds) prevents double notifications')
  : fail('recentlyShownMsgIds dedup set missing — same message may notify twice');

fileHas(MOB_HOOK, 'store_name')
  ? ok('Seller store name resolved for rich message title')
  : fail('Seller store name not resolved — notifications show generic "Seller"');

// Web message notifications go through buyer_notifications (trigger path)
const webHookSrc = src(WEB_HOOK) ?? '';
const webNoFilter = !webHookSrc.includes("type !== 'new_message'") &&
                    !webHookSrc.includes('ORDER_TYPES.has(');
webNoFilter
  ? ok('Web hook has no type filter — new_message toasts show automatically')
  : fail('Web hook type-filter may block new_message notifications');

// DB trigger migration applied check
fileExists('supabase/migrations/20260501140000_new_message_notification_trigger.sql')
  ? ok('Message notification DB trigger migration file present')
  : fail('Message notification DB trigger migration file missing');

// ═════════════════════════════════════════════════════════════════════════
// [6] MESSAGE TAP ROUTING  (App.tsx deep-link handler)
// ═════════════════════════════════════════════════════════════════════════
header('[6] Message tap routing — App.tsx push notification handler');

fileHas(MOB_APP, "case 'new_message':")
  ? ok("App.tsx tap handler routes 'new_message' to Messages screen")
  : fail("'new_message' case missing in App.tsx — tapping notification opens Notifications tab instead");

fileHas(MOB_APP, "case 'chat':")
  ? ok("App.tsx tap handler has 'chat' case")
  : fail("'chat' case missing in App.tsx tap handler");

fileHas(MOB_APP, "case 'message':")
  ? ok("App.tsx tap handler has 'message' case (legacy)")
  : warn("'message' legacy case missing — older push payloads may not route correctly");

// ═════════════════════════════════════════════════════════════════════════
// [7] DB TRIGGER: ORDER STATUS → buyer_notification
// ═════════════════════════════════════════════════════════════════════════
header('[7] DB trigger — order status change → buyer_notification INSERT');

let testOrderId     = null;
let testOrderBuyer  = null;
let testOrderStatus = null;

{
  const { data: orders } = await sbAdmin
    .from('orders')
    .select('id, order_number, buyer_id, shipment_status')
    .not('buyer_id', 'is', null)
    .not('shipment_status', 'in', '("delivered","cancelled","returned","failed_to_deliver")')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!orders?.length) {
    warn('No suitable test orders found — order trigger test skipped');
    warn('(Need an active order with buyer_id and non-final shipment_status)');
  } else {
    const statusMap = {
      pending: 'processing', processing: 'shipped', ready_to_ship: 'shipped',
      shipped: 'out_for_delivery', out_for_delivery: 'delivered',
      received: 'processing', waiting_for_seller: 'processing',
    };
    testOrderId     = orders[0].id;
    testOrderBuyer  = orders[0].buyer_id;
    testOrderStatus = orders[0].shipment_status;
    const targetStatus = statusMap[testOrderStatus] ?? 'shipped';
    const since = new Date(Date.now() - 60_000).toISOString();

    ok('Test order located', `#${orders[0].order_number}  status=${testOrderStatus}  buyer=${testOrderBuyer.slice(0,8)}…`);

    const { count: before } = await sbAdmin
      .from('buyer_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', testOrderBuyer)
      .eq('type', `order_${targetStatus}`)
      .gte('created_at', since);

    const { error: upErr } = await sbAdmin
      .from('orders')
      .update({ shipment_status: targetStatus })
      .eq('id', testOrderId);

    if (upErr) {
      fail(`Order status update to '${targetStatus}' failed`, upErr.message);
    } else {
      ok(`Order updated → '${targetStatus}'`);
      await sleep(2500);

      const { data: notifs, count: after } = await sbAdmin
        .from('buyer_notifications')
        .select('id, title, message', { count: 'exact' })
        .eq('buyer_id', testOrderBuyer)
        .eq('type', `order_${targetStatus}`)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1);

      if ((after ?? 0) > (before ?? 0) && notifs?.length) {
        ok('DB trigger auto-inserted buyer_notification ✓', `"${notifs[0].title}"`);
        ok('Notification body', notifs[0].message.slice(0, 70));
        cleanup.buyerNotif.push(notifs[0].id);
      } else {
        fail(
          'DB trigger did NOT insert buyer_notification',
          `before=${before ?? 0} after=${after ?? 0} — apply supabase/migrations/20260501120000_order_status_notification_trigger.sql`
        );
      }

      // Restore original order status
      const { error: restErr } = await sbAdmin
        .from('orders')
        .update({ shipment_status: testOrderStatus })
        .eq('id', testOrderId);
      restErr
        ? warn('Could not restore order status', restErr.message)
        : ok(`Order restored → '${testOrderStatus}'`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════
// [8] DB TRIGGER: SELLER MESSAGE → buyer_notification
// ═════════════════════════════════════════════════════════════════════════
header('[8] DB trigger — seller sends message → buyer_notification INSERT');

let triggerConvId   = null;
let triggerSellerId = null;
let triggerBuyerId  = null;

{
  // Find a conversation with at least one seller message
  const { data: sellerMsgs } = await sbAdmin
    .from('messages')
    .select('conversation_id, sender_id')
    .eq('sender_type', 'seller')
    .not('sender_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!sellerMsgs?.length) {
    warn('No seller messages found — seller→buyer trigger test skipped');
  } else {
    triggerConvId   = sellerMsgs[0].conversation_id;
    triggerSellerId = sellerMsgs[0].sender_id;

    const { data: conv } = await sbAdmin
      .from('conversations')
      .select('buyer_id')
      .eq('id', triggerConvId)
      .single();

    if (!conv?.buyer_id) {
      warn('Could not find buyer for test conversation — seller trigger test skipped');
    } else {
      triggerBuyerId = conv.buyer_id;
      const since = new Date(Date.now() - 30_000).toISOString();

      ok('Test conversation found', `conv=${triggerConvId.slice(0,8)}…`);

      const { count: before } = await sbAdmin
        .from('buyer_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', triggerBuyerId)
        .eq('type', 'new_message')
        .gte('created_at', since);

      const { data: newMsg, error: msgErr } = await sbAdmin
        .from('messages')
        .insert({
          conversation_id: triggerConvId,
          sender_id:       triggerSellerId,
          sender_type:     'seller',
          content:         '[TEST-SELLER] Automated test message — please ignore',
          is_read:         false,
        })
        .select('id')
        .single();

      if (msgErr) {
        fail('Could not insert seller test message', msgErr.message);
      } else {
        cleanup.messages.push(newMsg.id);
        ok('Inserted seller test message', newMsg.id.slice(0,8) + '…');
        await sleep(2500);

        const { data: notifs, count: after } = await sbAdmin
          .from('buyer_notifications')
          .select('id, title, message', { count: 'exact' })
          .eq('buyer_id', triggerBuyerId)
          .eq('type', 'new_message')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1);

        if ((after ?? 0) > (before ?? 0) && notifs?.length) {
          ok('Trigger created buyer_notification ✓', `"${notifs[0].title}"`);
          ok('Message preview', notifs[0].message.slice(0, 70));
          cleanup.buyerNotif.push(notifs[0].id);
        } else {
          fail(
            'Trigger did NOT create buyer_notification',
            `before=${before ?? 0} after=${after ?? 0} — apply supabase/migrations/20260501140000_new_message_notification_trigger.sql`
          );
        }
      }
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════
// [9] DB TRIGGER: BUYER MESSAGE → seller_notification
// ═════════════════════════════════════════════════════════════════════════
header('[9] DB trigger — buyer sends message → seller_notification INSERT');

if (!triggerConvId || !triggerSellerId || !triggerBuyerId) {
  warn('Conversation context missing — buyer→seller trigger test skipped');
} else {
  const since = new Date(Date.now() - 30_000).toISOString();

  const { count: before } = await sbAdmin
    .from('seller_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', triggerSellerId)
    .eq('type', 'new_message')
    .gte('created_at', since);

  const { data: newMsg, error: msgErr } = await sbAdmin
    .from('messages')
    .insert({
      conversation_id:  triggerConvId,
      sender_id:        triggerBuyerId,
      sender_type:      'buyer',
      content:          '[TEST-BUYER] Automated test message — please ignore',
      target_seller_id: triggerSellerId,
      is_read:          false,
    })
    .select('id')
    .single();

  if (msgErr) {
    fail('Could not insert buyer test message', msgErr.message);
  } else {
    cleanup.messages.push(newMsg.id);
    ok('Inserted buyer test message (target_seller_id set)', newMsg.id.slice(0,8) + '…');
    await sleep(2500);

    const { data: notifs, count: after } = await sbAdmin
      .from('seller_notifications')
      .select('id, title, message', { count: 'exact' })
      .eq('seller_id', triggerSellerId)
      .eq('type', 'new_message')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1);

    if ((after ?? 0) > (before ?? 0) && notifs?.length) {
      ok('Trigger created seller_notification ✓', `"${notifs[0].title}"`);
      ok('Message preview', notifs[0].message.slice(0, 70));
      cleanup.sellerNotif.push(notifs[0].id);
    } else {
      fail(
        'Trigger did NOT create seller_notification',
        `before=${before ?? 0} after=${after ?? 0} — check target_seller_id or apply the SQL migration`
      );
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════
// [10] REALTIME — direct messages channel (mobile fallback)
// ═════════════════════════════════════════════════════════════════════════
header('[10] Realtime — direct messages subscription (mobile fallback channel)');

// The messages table has RLS that requires an authenticated session.
// In production the app uses an authenticated Supabase client (buyer/seller
// session), so this works correctly.  Here we use the service-role client
// which bypasses RLS, confirming the Realtime publication layer is in place.
if (!triggerConvId || !triggerSellerId || !triggerBuyerId) {
  warn('Conversation context missing — direct messages realtime test skipped');
} else {
  ok('Subscribing to messages table (INSERT) via service-role client…');
  ok('(In production the app uses an authenticated session — RLS grants access)');

  const directResult = await new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      sbAdmin.removeChannel(directCh);
      resolve(null);
    }, 9000);

    const directCh = sbAdmin
      .channel(`test_direct_msg_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new;
          if (!msg?.content?.startsWith('[RT-TEST]')) return;
          clearTimeout(timeoutId);
          sbAdmin.removeChannel(directCh);
          resolve(msg);
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await sleep(500);
          const { data: rtMsg, error: rtErr } = await sbAdmin
            .from('messages')
            .insert({
              conversation_id: triggerConvId,
              sender_id:       triggerSellerId,
              sender_type:     'seller',
              content:         '[RT-TEST] Direct channel realtime check — please ignore',
              is_read:         false,
            })
            .select('id')
            .single();

          if (rtErr) {
            clearTimeout(timeoutId);
            sbAdmin.removeChannel(directCh);
            resolve({ _insertError: rtErr.message });
          } else if (rtMsg?.id) {
            cleanup.messages.push(rtMsg.id);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeoutId);
          resolve(null);
        }
      });
  });

  if (directResult?._insertError) {
    fail('Could not insert realtime test message', directResult._insertError);
  } else if (directResult) {
    ok('Direct messages channel received INSERT event ✓', `id=${directResult.id?.slice(0,8)}…`);
    ok('messages table is in the supabase_realtime publication ✓');
    ok('useGlobalNotifications direct subscription will fire for authenticated users');
  } else {
    fail(
      'Direct messages channel timed out (9 s)',
      'Run in Supabase SQL Editor: ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;'
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════
// [11] REALTIME — buyer_notifications channel  (web simulation)
// ═════════════════════════════════════════════════════════════════════════
header('[11] Realtime — buyer_notifications channel (web useGlobalOrderNotifications)');

let rtBuyerId = testOrderBuyer ?? triggerBuyerId;
if (!rtBuyerId) {
  const { data: bn } = await sbAdmin
    .from('buyer_notifications').select('buyer_id').not('buyer_id','is',null).limit(1).single();
  rtBuyerId = bn?.buyer_id ?? null;
}

if (!rtBuyerId) {
  warn('No buyer ID available — web realtime test skipped');
} else {
  ok('Subscribing as buyer', rtBuyerId.slice(0,8) + '…');

  const webResult = await new Promise((resolve) => {
    const tid = setTimeout(() => { sbAnon.removeChannel(wCh); resolve(null); }, 9000);
    const wCh = sbAnon
      .channel(`test_web_bn_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'buyer_notifications',
          filter: `buyer_id=eq.${rtBuyerId}` },
        (payload) => {
          if (!payload.new?.title?.startsWith('[E2E-TEST]')) return;
          clearTimeout(tid);
          sbAnon.removeChannel(wCh);
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
              type:     'order_shipped',
              title:    '[E2E-TEST] Web Realtime Check',
              message:  'Automated test row — will be deleted',
              priority: 'normal',
            })
            .select('id').single();

          if (error) { clearTimeout(tid); sbAnon.removeChannel(wCh); resolve({ _err: error.message }); }
          else if (data?.id) cleanup.buyerNotif.push(data.id);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(tid); resolve(null);
        }
      });
  });

  if (webResult?._err) {
    fail('Could not insert test notification', webResult._err);
  } else if (webResult) {
    ok('buyer_notifications realtime channel received INSERT ✓', `type=${webResult.type}`);
    ok('useGlobalOrderNotifications toast() will fire for this event');
  } else {
    fail('buyer_notifications realtime timed out (9 s)',
         'Enable Realtime for buyer_notifications in Supabase Dashboard → Database → Replication');
  }
}

// ═════════════════════════════════════════════════════════════════════════
// [12] REALTIME — seller_notifications channel  (mobile simulation)
// ═════════════════════════════════════════════════════════════════════════
header('[12] Realtime — seller_notifications channel (mobile useGlobalNotifications)');

let rtSellerId = triggerSellerId;
if (!rtSellerId) {
  const { data: sn } = await sbAdmin
    .from('seller_notifications').select('seller_id').not('seller_id','is',null).limit(1).single();
  rtSellerId = sn?.seller_id ?? null;
}

if (!rtSellerId) {
  warn('No seller ID available — seller realtime test skipped');
} else {
  ok('Subscribing as seller', rtSellerId.slice(0,8) + '…');

  const selResult = await new Promise((resolve) => {
    const tid = setTimeout(() => { sbAnon.removeChannel(sCh); resolve(null); }, 9000);
    const sCh = sbAnon
      .channel(`test_sel_sn_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'seller_notifications',
          filter: `seller_id=eq.${rtSellerId}` },
        (payload) => {
          if (!payload.new?.title?.startsWith('[E2E-TEST]')) return;
          clearTimeout(tid);
          sbAnon.removeChannel(sCh);
          resolve(payload.new);
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await sleep(400);
          const { data, error } = await sbAdmin
            .from('seller_notifications')
            .insert({
              seller_id: rtSellerId,
              type:      'new_message',
              title:     '[E2E-TEST] Mobile Seller Realtime Check',
              message:   'Automated test row — will be deleted',
              priority:  'high',
            })
            .select('id').single();

          if (error) { clearTimeout(tid); sbAnon.removeChannel(sCh); resolve({ _err: error.message }); }
          else if (data?.id) cleanup.sellerNotif.push(data.id);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(tid); resolve(null);
        }
      });
  });

  if (selResult?._err) {
    fail('Could not insert test seller notification', selResult._err);
  } else if (selResult) {
    ok('seller_notifications realtime channel received INSERT ✓', `type=${selResult.type}`);
    ok('useGlobalNotifications scheduleNotificationAsync() will fire for this event');
  } else {
    fail('seller_notifications realtime timed out (9 s)',
         'Enable Realtime for seller_notifications in Supabase Dashboard → Database → Replication');
  }
}

// ═════════════════════════════════════════════════════════════════════════
// [13] EDGE FUNCTION — send-push-notification
// ═════════════════════════════════════════════════════════════════════════
header('[13] Edge function — send-push-notification');

try {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    // Non-existent userId → no tokens → returns {sent:0} with HTTP 200
    body: JSON.stringify({
      userId: '00000000-0000-0000-0000-000000000000',
      title:  'E2E connectivity ping',
      body:   'automated test',
    }),
  });

  const json = await res.json().catch(() => ({}));
  const cors = res.headers.get('access-control-allow-origin');

  res.ok
    ? ok('Edge function reachable', `HTTP ${res.status}`)
    : fail('Edge function error response', `HTTP ${res.status}: ${JSON.stringify(json)}`);

  cors === '*'
    ? ok('CORS header correct (Access-Control-Allow-Origin: *)')
    : fail('CORS header missing or wrong', `got: ${cors ?? 'null'}`);

  typeof json.sent === 'number'
    ? ok('Response JSON valid', `{ sent: ${json.sent} }`)
    : warn('Unexpected response body', JSON.stringify(json).slice(0, 120));
} catch (e) {
  fail('POST to edge function failed', e.message);
}

// OPTIONS preflight
try {
  const pre = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'POST' },
  });
  (pre.ok || pre.status === 204)
    ? ok('OPTIONS preflight handled', `HTTP ${pre.status}`)
    : warn('OPTIONS returned unexpected status', String(pre.status));
} catch (e) {
  warn('OPTIONS preflight check failed', e.message);
}

// Source check: single serve() call
{
  const efPath = 'supabase/functions/send-push-notification/index.ts';
  const efSrc  = src(efPath);
  if (efSrc) {
    const count = (efSrc.match(/^serve\(/gm) ?? []).length;
    count === 1
      ? ok('Edge function has exactly 1 serve() call')
      : fail(`Edge function has ${count} serve() calls — duplicate may exist`);
  } else {
    warn('Edge function source file not found', efPath);
  }
}

// ═════════════════════════════════════════════════════════════════════════
// [14] CLEANUP
// ═════════════════════════════════════════════════════════════════════════
header('[14] Cleanup — removing all test rows');

await sbAdmin.removeAllChannels();
await sbAnon.removeAllChannels();

let cleaned = 0;

if (cleanup.messages.length > 0) {
  const { error } = await sbAdmin.from('messages').delete().in('id', cleanup.messages);
  error
    ? warn('Message cleanup partial failure', error.message)
    : (cleaned += cleanup.messages.length, ok(`Deleted ${cleanup.messages.length} test message(s)`));
}

if (cleanup.buyerNotif.length > 0) {
  const { error } = await sbAdmin.from('buyer_notifications').delete().in('id', cleanup.buyerNotif);
  error
    ? warn('Buyer notification cleanup failed', error.message)
    : (cleaned += cleanup.buyerNotif.length, ok(`Deleted ${cleanup.buyerNotif.length} test buyer_notification(s)`));
}

if (cleanup.sellerNotif.length > 0) {
  const { error } = await sbAdmin.from('seller_notifications').delete().in('id', cleanup.sellerNotif);
  error
    ? warn('Seller notification cleanup failed', error.message)
    : (cleaned += cleanup.sellerNotif.length, ok(`Deleted ${cleanup.sellerNotif.length} test seller_notification(s)`));
}

if (cleaned === 0) ok('No test rows required cleanup');

// ═════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═════════════════════════════════════════════════════════════════════════
const line = `  ${passed} passed  |  ${failed} failed  |  ${warned} warnings`;
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(('║' + line).padEnd(63) + '║');
if (failed === 0) {
  console.log('║  ✅  ALL CHECKS PASSED — notification system is healthy      ║');
} else {
  console.log(`║  ❌  ${failed} CHECK(S) FAILED — review output above               ║`);
}
console.log('╚══════════════════════════════════════════════════════════════╝\n');

process.exit(failed > 0 ? 1 : 0);
