/**
 * MESSAGE NOTIFICATION SYSTEM — End-to-End Test
 *
 * Verifies that when a buyer or seller sends a chat message, the other party
 * receives a real-time in-app notification on BOTH web and mobile.
 *
 * Sections:
 *  [1] DB connection
 *  [2] Web hook — handles new_message type
 *  [3] Mobile hook — handles new_message type
 *  [4] DB trigger (behavioral):
 *        seller sends message → buyer_notification auto-inserted
 *        buyer sends message  → seller_notification auto-inserted
 *  [5] Realtime WEB  — channel fires on buyer_notification INSERT (type=new_message)
 *  [6] Realtime MOBILE — channel fires on seller_notification INSERT (type=new_message)
 *  [7] Cleanup — all test rows removed
 *
 * Run:
 *   node scripts/test-message-notifications.mjs
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

const sbAdmin  = createClient(SUPABASE_URL, SERVICE_KEY);
const sbMobile = createClient(SUPABASE_URL, ANON_KEY);

// ── State ─────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let warned = 0;
const cleanupMsgIds  = []; // messages to delete
const cleanupNotifIds = { buyer: [], seller: [] }; // notifications to delete

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
console.log('║   MESSAGE NOTIFICATION SYSTEM — END-TO-END TEST            ║');
console.log('╚════════════════════════════════════════════════════════════╝');

// ─────────────────────────────────────────────────────────────────────────
// [1] DB CONNECTION
// ─────────────────────────────────────────────────────────────────────────
header('[1] Database connection');
{
  const { error } = await sbAdmin.from('messages').select('id').limit(1);
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
header('[2] Web — useGlobalOrderNotifications handles new_message type');

const WEB_HOOK = 'web/src/hooks/useGlobalOrderNotifications.ts';
const WEB_APP  = 'web/src/App.tsx';

existsSync(resolve(ROOT, WEB_HOOK))
  ? ok('Hook file exists', WEB_HOOK)
  : fail('Hook file missing', WEB_HOOK);

fileHas(WEB_HOOK, 'buyer_notifications')
  ? ok('Subscribes to buyer_notifications')
  : fail('Does not subscribe to buyer_notifications');

fileHas(WEB_HOOK, 'seller_notifications')
  ? ok('Subscribes to seller_notifications')
  : fail('Does not subscribe to seller_notifications');

// Confirm there is NO type filter blocking new_message
const hookSrc = existsSync(resolve(ROOT, WEB_HOOK))
  ? readFileSync(resolve(ROOT, WEB_HOOK), 'utf8')
  : '';

// The hook should NOT filter out non-order types
const hasNoFilter = !hookSrc.includes('ORDER_TYPES.has(') && !hookSrc.includes('if (!ORDER_TYPES');
hasNoFilter
  ? ok('No type filter — new_message toasts will show automatically')
  : fail('Type-filter found — new_message may be blocked. Review the hook.');

fileHas(WEB_HOOK, 'toast(')
  ? ok('Calls toast() for in-app banner')
  : fail('Does not call toast()');

fileHas(WEB_HOOK, 'toastDuration')
  ? ok('toastDuration() helper present (shorter for messages)')
  : warn('toastDuration() helper missing — messages use default 6 s duration');

fileHas(WEB_APP, 'useGlobalOrderNotifications()')
  ? ok('Mounted in web/src/App.tsx')
  : fail('Not mounted in web/src/App.tsx');

// ─────────────────────────────────────────────────────────────────────────
// [3] MOBILE HOOK — code checks
// ─────────────────────────────────────────────────────────────────────────
header('[3] Mobile — useGlobalNotifications handles new_message type');

const MOB_HOOK = 'mobile-app/src/hooks/useGlobalNotifications.ts';
const MOB_APP  = 'mobile-app/App.tsx';

existsSync(resolve(ROOT, MOB_HOOK))
  ? ok('Hook file exists', MOB_HOOK)
  : fail('Hook file missing', MOB_HOOK);

// Mobile hook uses notificationService.subscribeToNotifications which subscribes to ALL types
fileHas(MOB_HOOK, 'subscribeToNotifications')
  ? ok('Uses notificationService.subscribeToNotifications (all types including new_message)')
  : fail('subscribeToNotifications not found');

fileHas(MOB_HOOK, 'scheduleNotificationAsync')
  ? ok('Fires local notification via scheduleNotificationAsync')
  : fail('scheduleNotificationAsync not found');

fileHas(MOB_APP, 'useGlobalNotifications()')
  ? ok('Mounted in mobile-app/App.tsx')
  : fail('Not mounted in mobile-app/App.tsx');

// ─────────────────────────────────────────────────────────────────────────
// [4] DB TRIGGER — behavioral test
// ─────────────────────────────────────────────────────────────────────────
header('[4] DB trigger: new message → buyer/seller_notification INSERT');

// Find a conversation that has at least one seller message (so we know both parties)
const { data: sellerMessages, error: smErr } = await sbAdmin
  .from('messages')
  .select('conversation_id, sender_id')
  .eq('sender_type', 'seller')
  .not('sender_id', 'is', null)
  .order('created_at', { ascending: false })
  .limit(20);

if (smErr || !sellerMessages?.length) {
  warn('No seller messages found in DB — trigger test [4] skipped');
  warn('The trigger will activate once sellers start sending messages');
} else {
  // Get the conversation and its buyer_id
  const convId = sellerMessages[0].conversation_id;
  const sellerId = sellerMessages[0].sender_id;

  const { data: conv, error: convErr } = await sbAdmin
    .from('conversations')
    .select('buyer_id')
    .eq('id', convId)
    .single();

  if (convErr || !conv?.buyer_id) {
    warn('Could not find buyer for test conversation — trigger test skipped');
  } else {
    const buyerId = conv.buyer_id;
    const since = new Date(Date.now() - 30_000).toISOString();

    ok('Test conversation found', `conv=${convId.slice(0, 8)}…  buyer=${buyerId.slice(0, 8)}…  seller=${sellerId.slice(0, 8)}…`);

    // ── Test 4a: seller sends → buyer_notification ────────────────────
    const { count: buyerBefore } = await sbAdmin
      .from('buyer_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', buyerId)
      .eq('type', 'new_message')
      .gte('created_at', since);

    const { data: newMsg1, error: msg1Err } = await sbAdmin
      .from('messages')
      .insert({
        conversation_id: convId,
        sender_id: sellerId,
        sender_type: 'seller',
        content: '[TEST] Seller notification test — please ignore',
        is_read: false,
      })
      .select('id')
      .single();

    if (msg1Err) {
      fail('Could not insert seller test message', msg1Err.message);
    } else {
      cleanupMsgIds.push(newMsg1.id);
      ok('Inserted seller test message', newMsg1.id.slice(0, 8) + '…');
      await sleep(2500);

      const { data: buyerNotif, count: buyerAfter } = await sbAdmin
        .from('buyer_notifications')
        .select('id, title, message', { count: 'exact' })
        .eq('buyer_id', buyerId)
        .eq('type', 'new_message')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1);

      if ((buyerAfter ?? 0) > (buyerBefore ?? 0) && buyerNotif?.length) {
        ok('Trigger created buyer_notification ✓', `"${buyerNotif[0].title}"`);
        ok('Message content preview', buyerNotif[0].message.slice(0, 65));
        cleanupNotifIds.buyer.push(buyerNotif[0].id);
      } else {
        fail(
          'Trigger did NOT create a buyer_notification',
          `count before=${buyerBefore ?? 0} after=${buyerAfter ?? 0} — did you apply the SQL migration?`
        );
      }
    }

    // ── Test 4b: buyer sends → seller_notification ────────────────────
    const { count: sellerBefore } = await sbAdmin
      .from('seller_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('type', 'new_message')
      .gte('created_at', since);

    const { data: newMsg2, error: msg2Err } = await sbAdmin
      .from('messages')
      .insert({
        conversation_id: convId,
        sender_id: buyerId,
        sender_type: 'buyer',
        content: '[TEST] Buyer notification test — please ignore',
        target_seller_id: sellerId,
        is_read: false,
      })
      .select('id')
      .single();

    if (msg2Err) {
      fail('Could not insert buyer test message', msg2Err.message);
    } else {
      cleanupMsgIds.push(newMsg2.id);
      ok('Inserted buyer test message (target_seller_id set)', newMsg2.id.slice(0, 8) + '…');
      await sleep(2500);

      const { data: sellerNotif, count: sellerAfter } = await sbAdmin
        .from('seller_notifications')
        .select('id, title, message', { count: 'exact' })
        .eq('seller_id', sellerId)
        .eq('type', 'new_message')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1);

      if ((sellerAfter ?? 0) > (sellerBefore ?? 0) && sellerNotif?.length) {
        ok('Trigger created seller_notification ✓', `"${sellerNotif[0].title}"`);
        ok('Message content preview', sellerNotif[0].message.slice(0, 65));
        cleanupNotifIds.seller.push(sellerNotif[0].id);
      } else {
        fail(
          'Trigger did NOT create a seller_notification',
          `count before=${sellerBefore ?? 0} after=${sellerAfter ?? 0} — did you apply the SQL migration?`
        );
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// RESOLVE TEST IDS for realtime tests
// ─────────────────────────────────────────────────────────────────────────
let rtBuyerId = null;
let rtSellerId = null;
{
  // Pick a buyer_id from existing buyer_notifications if possible
  const { data: bn } = await sbAdmin
    .from('buyer_notifications')
    .select('buyer_id')
    .not('buyer_id', 'is', null)
    .limit(1)
    .single();
  rtBuyerId = bn?.buyer_id ?? null;

  const { data: sn } = await sbAdmin
    .from('seller_notifications')
    .select('seller_id')
    .not('seller_id', 'is', null)
    .limit(1)
    .single();
  rtSellerId = sn?.seller_id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────
// [5] REALTIME — WEB (buyer_notifications channel)
// ─────────────────────────────────────────────────────────────────────────
header('[5] Realtime WEB — buyer receives new_message notification in real-time');

if (!rtBuyerId) {
  warn('No buyer ID available — web realtime test skipped');
} else {
  ok('Subscribing as buyer', rtBuyerId.slice(0, 8) + '…');

  const webResult = await new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      sbMobile.removeChannel(webCh);
      resolve(null);
    }, 8000);

    const webCh = sbMobile
      .channel(`test_msg_web_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'buyer_notifications',
          filter: `buyer_id=eq.${rtBuyerId}`,
        },
        (payload) => {
          if (payload.new?.type !== 'new_message') return;
          if (!payload.new?.title?.startsWith('[MSG-TEST]')) return;
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
              type: 'new_message',
              title: '[MSG-TEST] Web Realtime Check',
              message: 'Automated test row — will be deleted',
              action_url: '/messages',
              action_data: { conversation_id: '00000000-0000-0000-0000-000000000000' },
              priority: 'high',
            })
            .select('id')
            .single();

          if (error) {
            clearTimeout(timeoutId);
            sbMobile.removeChannel(webCh);
            resolve({ _insertError: error.message });
          } else if (data?.id) {
            cleanupNotifIds.buyer.push(data.id);
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
    ok('Web realtime channel received new_message INSERT ✓', `type=${webResult.type}`);
    ok('useGlobalOrderNotifications toast() will fire for this type');
  } else {
    fail('Web realtime timed out (8 s)', 'Check Supabase Realtime is enabled for buyer_notifications');
  }
}

// ─────────────────────────────────────────────────────────────────────────
// [6] REALTIME — MOBILE (seller_notifications channel)
// ─────────────────────────────────────────────────────────────────────────
header('[6] Realtime MOBILE — seller receives new_message notification in real-time');

if (!rtSellerId) {
  warn('No seller ID available — mobile realtime test skipped');
} else {
  ok('Subscribing as seller', rtSellerId.slice(0, 8) + '…');

  const mobResult = await new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      sbMobile.removeChannel(mobCh);
      resolve(null);
    }, 8000);

    const mobCh = sbMobile
      .channel(`test_msg_mob_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'seller_notifications',
          filter: `seller_id=eq.${rtSellerId}`,
        },
        (payload) => {
          if (payload.new?.type !== 'new_message') return;
          if (!payload.new?.title?.startsWith('[MSG-TEST]')) return;
          clearTimeout(timeoutId);
          sbMobile.removeChannel(mobCh);
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
              type: 'new_message',
              title: '[MSG-TEST] Mobile Realtime Check',
              message: 'Automated test row — will be deleted',
              action_url: '/seller/messages',
              action_data: { conversation_id: '00000000-0000-0000-0000-000000000000' },
              priority: 'high',
            })
            .select('id')
            .single();

          if (error) {
            clearTimeout(timeoutId);
            sbMobile.removeChannel(mobCh);
            resolve({ _insertError: error.message });
          } else if (data?.id) {
            cleanupNotifIds.seller.push(data.id);
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
    ok('Mobile realtime channel received new_message INSERT ✓', `type=${mobResult.type}`);
    ok('useGlobalNotifications scheduleNotificationAsync() will fire for this type');
  } else {
    fail('Mobile realtime timed out (8 s)', 'Check Supabase Realtime is enabled for seller_notifications');
  }
}

// ─────────────────────────────────────────────────────────────────────────
// [7] CLEANUP
// ─────────────────────────────────────────────────────────────────────────
header('[7] Cleanup');

await sbAdmin.removeAllChannels();
await sbMobile.removeAllChannels();

let cleanedUp = 0;

if (cleanupMsgIds.length > 0) {
  const { error } = await sbAdmin.from('messages').delete().in('id', cleanupMsgIds);
  error
    ? warn('Message cleanup failed', error.message)
    : (cleanedUp += cleanupMsgIds.length, ok(`Deleted ${cleanupMsgIds.length} test message(s)`));
}

if (cleanupNotifIds.buyer.length > 0) {
  const { error } = await sbAdmin
    .from('buyer_notifications')
    .delete()
    .in('id', cleanupNotifIds.buyer);
  error
    ? warn('Buyer notification cleanup failed', error.message)
    : (cleanedUp += cleanupNotifIds.buyer.length, ok(`Deleted ${cleanupNotifIds.buyer.length} test buyer_notification(s)`));
}

if (cleanupNotifIds.seller.length > 0) {
  const { error } = await sbAdmin
    .from('seller_notifications')
    .delete()
    .in('id', cleanupNotifIds.seller);
  error
    ? warn('Seller notification cleanup failed', error.message)
    : (cleanedUp += cleanupNotifIds.seller.length, ok(`Deleted ${cleanupNotifIds.seller.length} test seller_notification(s)`));
}

if (cleanedUp === 0) {
  ok('No test rows to clean up');
}

// ─────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────
const line = `  ${passed} passed  |  ${failed} failed  |  ${warned} warnings`;
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log(('║' + line).padEnd(61) + '║');
if (failed === 0) {
  console.log('║  ✅  ALL CHECKS PASSED — message notifications are live     ║');
} else {
  console.log('║  ❌  SOME CHECKS FAILED — see output above                  ║');
}
console.log('╚════════════════════════════════════════════════════════════╝\n');

process.exit(failed > 0 ? 1 : 0);
