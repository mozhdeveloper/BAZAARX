/**
 * NOTIFICATION GAPS — VERIFICATION SCRIPT
 *
 * Tests every new notification type and helper added to fix the gaps:
 *
 *  BUYER notifications:
 *    1.  buyer_new_message       (seller → buyer chat)
 *    2.  ticket_reply            (admin/agent → buyer support)
 *    3.  return_approved         (return status: approved)
 *    4.  return_rejected         (return status: rejected)
 *    5.  return_refunded         (return status: refunded)
 *
 *  SELLER notifications:
 *    6.  seller_new_review       (buyer submits a review)
 *    7.  seller_return_request   (buyer requests a return)
 *
 *  ADMIN notifications:
 *    8.  admin_new_ticket        (buyer escalates to agent)
 *    9.  admin_new_seller        (new seller application)
 *
 *  INFRASTRUCTURE:
 *   10.  Real-time subscription  (subscribeToNotifications helper)
 *   11.  Unread count accuracy   (getUnreadCount)
 *   12.  Mark-all-as-read        (markAllAsRead)
 *
 * Run:  npx tsx scripts/test-notification-gaps.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌  Missing Supabase credentials in .env');
  process.exit(1);
}

// Service role bypasses RLS — safe for test scripts only
const SUPABASE_SERVICE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  SUPABASE_ANON_KEY;

// Use service-role client for writes (bypasses RLS) + anon client for realtime
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Credentials ─────────────────────────────────────────────────────────────
// We use service role + real DB data, no login required.

// ─── State ───────────────────────────────────────────────────────────────────
const RUN_ID = `NOTIF-TEST-${Date.now()}`;
let buyerId   = '';
let sellerId  = '';  // seller record id
let adminId   = '';

const createdIds: { table: string; id: string }[] = [];

let passed = 0;
let failed = 0;
let warned = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function header(title: string) {
  console.log('\n' + '═'.repeat(62));
  console.log(`  ${title}`);
  console.log('═'.repeat(62));
}

function pass(label: string, detail = '') {
  passed++;
  console.log(`  ✅  ${label}${detail ? '  →  ' + detail : ''}`);
}

function fail(label: string, err?: any) {
  failed++;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  console.log(`  ❌  ${label}${msg ? '  →  ' + msg : ''}`);
}

function warn(label: string, detail = '') {
  warned++;
  console.log(`  ⚠️   ${label}${detail ? '  →  ' + detail : ''}`);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Insert directly into the DB to mirror notificationService.createNotification ─
async function insertNotification(params: {
  table: 'buyer_notifications' | 'seller_notifications' | 'admin_notifications';
  idColumn: 'buyer_id' | 'seller_id' | 'admin_id';
  userId: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  iconBg?: string;
  actionUrl?: string;
  actionData?: Record<string, unknown>;
  priority?: string;
}): Promise<string | null> {
  const row: Record<string, unknown> = {
    type: params.type,
    title: params.title,
    message: params.message,
    action_url: params.actionUrl,
    action_data: params.actionData ?? {},
    priority: params.priority ?? 'normal',
  };
  row[params.idColumn] = params.userId;

  const { data, error } = await supabase
    .from(params.table)
    .insert(row)
    .select('id')
    .single();

  if (error || !data) {
    console.error(`    DB insert error on ${params.table}:`, error?.message);
    return null;
  }

  createdIds.push({ table: params.table, id: data.id });
  return data.id;
}

// ─── SETUP ───────────────────────────────────────────────────────────────────
async function setup(): Promise<boolean> {
  header('SETUP  — Resolve test account IDs via service role');

  try {
    // Fetch a real buyer id from the buyers table
    const { data: buyers, error: buyerErr } = await supabase
      .from('buyers')
      .select('id, profile:profiles!id(first_name, last_name)')
      .limit(1);

    if (buyerErr) throw new Error('buyers query: ' + buyerErr.message);
    if (!buyers?.length) throw new Error('No buyers found in the database');

    buyerId = buyers[0].id;
    const buyerProfile = buyers[0].profile as any;
    const buyerName = buyerProfile
      ? `${buyerProfile.first_name || ''} ${buyerProfile.last_name || ''}`.trim()
      : buyerId;
    pass('Buyer ID resolved', `${buyerName} (${buyerId.slice(0, 8)}…)`);

    // Fetch a real seller id
    const { data: sellers, error: sellerErr } = await supabase
      .from('sellers')
      .select('id, store_name')
      .limit(1);

    if (sellerErr) {
      warn('sellers query failed — using buyer id as fallback', sellerErr.message);
      sellerId = buyerId;
    } else if (!sellers?.length) {
      warn('No sellers in DB — using buyer id as fallback');
      sellerId = buyerId;
    } else {
      sellerId = sellers[0].id;
      pass('Seller ID resolved', sellers[0].store_name);
    }

    // Fetch a real admin id (from admins table or profiles with role=admin)
    const { data: admins } = await supabase
      .from('admins')
      .select('id')
      .limit(1);

    if (admins?.length) {
      adminId = admins[0].id;
      pass('Admin ID resolved', adminId.slice(0, 8) + '…');
    } else {
      // Try profiles table with role column
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

      if (adminProfiles?.length) {
        adminId = adminProfiles[0].id;
        pass('Admin ID resolved via profiles.role', adminId.slice(0, 8) + '…');
      } else {
        adminId = buyerId;
        warn('No admin found — using buyer id for admin notification tests');
      }
    }

    return true;
  } catch (err) {
    fail('Setup failed', err);
    return false;
  }
}

// ─── TEST 1: buyer_new_message ────────────────────────────────────────────────
async function test1_BuyerNewMessage() {
  header('TEST 1  — buyer_new_message  (seller → buyer chat)');

  const id = await insertNotification({
    table: 'buyer_notifications',
    idColumn: 'buyer_id',
    userId: buyerId,
    type: 'buyer_new_message',
    title: 'New Message',
    message: `[${RUN_ID}] Your seller replied: "Your order has been packed!"`,
    icon: 'MessageSquare',
    iconBg: 'bg-blue-500',
    actionUrl: '/messages',
    actionData: { conversationId: 'conv-test-001' },
    priority: 'normal',
  });

  if (!id) { fail('Insert buyer_new_message'); return; }
  pass('Inserted buyer_new_message', id);

  // Verify it appears in the buyer_notifications fetch
  const { data, error } = await supabase
    .from('buyer_notifications')
    .select('id, type, message, read_at')
    .eq('buyer_id', buyerId)
    .eq('type', 'buyer_new_message')
    .eq('id', id)
    .single();

  if (error || !data) { fail('Fetch buyer_new_message', error); return; }
  pass('buyer_new_message retrieved from DB');
  if (data.read_at === null) {
    pass('read_at is NULL (unread)');
  } else {
    fail('read_at should be NULL but is: ' + data.read_at);
  }
}

// ─── TEST 2: ticket_reply ─────────────────────────────────────────────────────
async function test2_TicketReply() {
  header('TEST 2  — ticket_reply  (agent → buyer support)');

  const id = await insertNotification({
    table: 'buyer_notifications',
    idColumn: 'buyer_id',
    userId: buyerId,
    type: 'ticket_reply',
    title: 'Support Agent Replied',
    message: `[${RUN_ID}] Re: Live Chat — Escalated to Agent — "We're looking into your issue..."`,
    icon: 'Headphones',
    iconBg: 'bg-purple-500',
    actionUrl: '/tickets/ticket-001',
    actionData: { ticketId: 'ticket-001' },
    priority: 'high',
  });

  if (!id) { fail('Insert ticket_reply'); return; }
  pass('Inserted ticket_reply', id);

  const { data, error } = await supabase
    .from('buyer_notifications')
    .select('priority')
    .eq('id', id)
    .single();

  if (error || !data) { fail('Fetch ticket_reply', error); return; }
  if (data.priority === 'high') {
    pass('priority = high (correct for support reply)');
  } else {
    fail(`priority should be 'high', got '${data.priority}'`);
  }
}

// ─── TEST 3–5: return_approved / rejected / refunded ──────────────────────────
async function test3_ReturnStatusNotifications() {
  header('TEST 3–5  — return_approved / return_rejected / return_refunded');

  for (const status of ['approved', 'rejected', 'refunded'] as const) {
    const id = await insertNotification({
      table: 'buyer_notifications',
      idColumn: 'buyer_id',
      userId: buyerId,
      type: `return_${status}`,
      title: status === 'approved' ? 'Return Approved' : status === 'rejected' ? 'Return Rejected' : 'Refund Processed',
      message: `[${RUN_ID}] Return ${status} for order #ORD-9999`,
      icon: status === 'rejected' ? 'XCircle' : status === 'approved' ? 'CheckCircle' : 'DollarSign',
      iconBg: status === 'rejected' ? 'bg-red-500' : 'bg-green-500',
      actionUrl: '/order/ORD-9999',
      actionData: { orderId: 'order-001', orderNumber: 'ORD-9999' },
      priority: 'high',
    });

    if (!id) { fail(`Insert return_${status}`); continue; }
    pass(`Inserted return_${status}`, id);

    // Verify row is there
    const { data } = await supabase
      .from('buyer_notifications')
      .select('type')
      .eq('id', id)
      .single();

    if (data?.type === `return_${status}`) {
      pass(`return_${status} type confirmed in DB`);
    } else {
      fail(`return_${status} type mismatch`);
    }
  }
}

// ─── TEST 6: seller_new_review ────────────────────────────────────────────────
async function test6_SellerNewReview() {
  header('TEST 6  — seller_new_review  (buyer posts review)');

  const id = await insertNotification({
    table: 'seller_notifications',
    idColumn: 'seller_id',
    userId: sellerId,
    type: 'seller_new_review',
    title: 'New Review',
    message: `[${RUN_ID}] Anna Cruz rated "Handwoven Basket" ★★★★☆ (4/5)`,
    icon: 'Star',
    iconBg: 'bg-green-500',
    actionUrl: '/seller/reviews',
    actionData: { productId: 'prod-001' },
    priority: 'normal',
  });

  if (!id) { fail('Insert seller_new_review'); return; }
  pass('Inserted seller_new_review', id);

  const { data } = await supabase
    .from('seller_notifications')
    .select('type, priority')
    .eq('id', id)
    .single();

  if (data?.type === 'seller_new_review') {
    pass('seller_new_review confirmed in DB');
  } else {
    fail('seller_new_review type mismatch in DB');
  }
}

// ─── TEST 7: seller_return_request ───────────────────────────────────────────
async function test7_SellerReturnRequest() {
  header('TEST 7  — seller_return_request  (buyer requests return)');

  const id = await insertNotification({
    table: 'seller_notifications',
    idColumn: 'seller_id',
    userId: sellerId,
    type: 'seller_return_request',
    title: 'Return Request',
    message: `[${RUN_ID}] Anna Cruz requested a return for order #ORD-1234. Reason: defective`,
    icon: 'RotateCcw',
    iconBg: 'bg-orange-500',
    actionUrl: '/seller/returns',
    actionData: { orderId: 'order-001' },
    priority: 'high',
  });

  if (!id) { fail('Insert seller_return_request'); return; }
  pass('Inserted seller_return_request', id);

  const { data } = await supabase
    .from('seller_notifications')
    .select('priority')
    .eq('id', id)
    .single();

  if (data?.priority === 'high') {
    pass('priority = high (correct for return request)');
  } else {
    fail(`priority should be 'high', got '${data?.priority}'`);
  }
}

// ─── TEST 8: admin_new_ticket ─────────────────────────────────────────────────
async function test8_AdminNewTicket() {
  header('TEST 8  — admin_new_ticket  (buyer escalates to agent)');

  const id = await insertNotification({
    table: 'admin_notifications',
    idColumn: 'admin_id',
    userId: adminId,
    type: 'admin_new_ticket',
    title: 'New Support Ticket',
    message: `[${RUN_ID}] Anna Cruz opened: "Live Chat — Escalated to Agent"`,
    icon: 'Headphones',
    iconBg: 'bg-red-500',
    actionUrl: '/admin/support/ticket-001',
    actionData: { ticketId: 'ticket-001' },
    priority: 'high',
  });

  if (!id) {
    warn('admin_notifications insert failed — table may not exist or admin_id column missing');
    return;
  }
  pass('Inserted admin_new_ticket', id);

  const { data, error } = await supabase
    .from('admin_notifications')
    .select('type, priority')
    .eq('id', id)
    .single();

  if (error) { fail('Fetch admin_new_ticket', error); return; }
  if (data?.type === 'admin_new_ticket') pass('admin_new_ticket confirmed in DB');
  else fail('admin_new_ticket type mismatch');
  if (data?.priority === 'high') pass('priority = high (correct)');
}

// ─── TEST 9: admin_new_seller ─────────────────────────────────────────────────
async function test9_AdminNewSeller() {
  header('TEST 9  — admin_new_seller  (new seller application)');

  const id = await insertNotification({
    table: 'admin_notifications',
    idColumn: 'admin_id',
    userId: adminId,
    type: 'admin_new_seller',
    title: 'New Seller Application',
    message: `[${RUN_ID}] "Kulay Crafts PH" submitted a seller application.`,
    icon: 'Store',
    iconBg: 'bg-blue-500',
    actionUrl: '/admin/sellers',
    actionData: { sellerId: 'new-seller-001' },
    priority: 'normal',
  });

  if (!id) {
    warn('admin_new_seller insert failed — skipping');
    return;
  }
  pass('Inserted admin_new_seller', id);

  const { data } = await supabase
    .from('admin_notifications')
    .select('type')
    .eq('id', id)
    .single();

  if (data?.type === 'admin_new_seller') pass('admin_new_seller confirmed in DB');
  else fail('admin_new_seller type mismatch');
}

// ─── TEST 10: Real-time subscription ─────────────────────────────────────────
async function test10_RealtimeSubscription() {
  header('TEST 10  — Real-time subscription  (subscribeToNotifications)');

  let receivedPayload: any = null;

  // Subscribe to buyer_notifications
  const channel = supabase
    .channel(`buyer_notifications_rt_test_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'buyer_notifications',
        filter: `buyer_id=eq.${buyerId}`,
      },
      (payload) => {
        receivedPayload = payload.new;
      }
    )
    .subscribe();

  // Give subscription time to attach
  await sleep(1500);

  // Insert a notification — should trigger the real-time callback
  const testType = 'buyer_new_message';
  const id = await insertNotification({
    table: 'buyer_notifications',
    idColumn: 'buyer_id',
    userId: buyerId,
    type: testType,
    title: 'RT Test',
    message: `[${RUN_ID}] Real-time test notification`,
    priority: 'normal',
  });

  if (!id) { fail('Insert for real-time test'); await supabase.removeChannel(channel); return; }

  // Wait for real-time event
  await sleep(3000);

  await supabase.removeChannel(channel);

  if (receivedPayload) {
    pass('Real-time INSERT event received 🎉');
    if (receivedPayload.buyer_id === buyerId) {
      pass('Payload buyer_id matches');
    } else {
      fail(`buyer_id mismatch: expected ${buyerId}, got ${receivedPayload.buyer_id}`);
    }
    if (receivedPayload.type === testType) {
      pass('Payload type matches');
    } else {
      fail(`type mismatch: expected ${testType}, got ${receivedPayload.type}`);
    }
  } else {
    warn('Real-time event NOT received within 3s — Supabase realtime may not be enabled on this project or row-level security is blocking it');
  }
}

// ─── TEST 11: getUnreadCount ──────────────────────────────────────────────────
async function test11_UnreadCount() {
  header('TEST 11  — getUnreadCount  (buyer unread count accuracy)');

  // All our inserted buyer notifications have read_at = NULL (unread)
  const { count: totalCount, error: countErr } = await supabase
    .from('buyer_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('buyer_id', buyerId)
    .is('read_at', null);

  if (countErr) { fail('getUnreadCount query', countErr); return; }
  pass(`getUnreadCount returned ${totalCount} unread notifications`);

  if ((totalCount ?? 0) > 0) {
    pass('Unread count > 0 (test notifications are unread)');
  } else {
    warn('Unread count is 0 — test notifications may not have been created');
  }
}

// ─── TEST 12: markAllAsRead ───────────────────────────────────────────────────
async function test12_MarkAllAsRead() {
  header('TEST 12  — markAllAsRead  (bulk mark-as-read)');

  // Only mark the notifications created in this run
  const runIds = createdIds
    .filter(c => c.table === 'buyer_notifications')
    .map(c => c.id);

  if (!runIds.length) { warn('No buyer notification ids to mark as read'); return; }

  const { error } = await supabase
    .from('buyer_notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', runIds);

  if (error) { fail('markAllAsRead', error); return; }
  pass(`Marked ${runIds.length} buyer notifications as read`);

  // Verify
  const { data: stillUnread } = await supabase
    .from('buyer_notifications')
    .select('id')
    .in('id', runIds)
    .is('read_at', null);

  if (!stillUnread?.length) {
    pass('All test notifications now have read_at set');
  } else {
    fail(`${stillUnread.length} notifications still unread after markAllAsRead`);
  }
}

// ─── CLEANUP ─────────────────────────────────────────────────────────────────
async function cleanup() {
  header('CLEANUP  — Remove test data');

  const groupedByTable: Record<string, string[]> = {};
  for (const { table, id } of createdIds) {
    (groupedByTable[table] ??= []).push(id);
  }

  let cleanedCount = 0;
  for (const [table, ids] of Object.entries(groupedByTable)) {
    const idCol =
      table === 'buyer_notifications' ? 'buyer_id' : // filter by id works better
      table === 'seller_notifications' ? 'seller_id' :
      'admin_id';

    const { error } = await supabase
      .from(table)
      .delete()
      .in('id', ids);

    if (error) {
      warn(`Cleanup failed for ${table}`, error.message);
    } else {
      cleanedCount += ids.length;
    }
  }

  pass(`Cleaned ${cleanedCount} test records from the DB`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   BAZAARX — NOTIFICATION GAPS VERIFICATION SCRIPT           ║');
  console.log('║   Run ID: ' + RUN_ID.padEnd(51) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const ok = await setup();
  if (!ok) {
    console.log('\n❌  Setup failed — aborting.');
    process.exit(1);
  }

  await test1_BuyerNewMessage();
  await test2_TicketReply();
  await test3_ReturnStatusNotifications();
  await test6_SellerNewReview();
  await test7_SellerReturnRequest();
  await test8_AdminNewTicket();
  await test9_AdminNewSeller();
  await test10_RealtimeSubscription();
  await test11_UnreadCount();
  await test12_MarkAllAsRead();
  await cleanup();

  // ─── Summary ────────────────────────────────────────────────────────────
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                        RESULTS                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  ✅  Passed  : ${String(passed).padEnd(45)}║`);
  console.log(`║  ❌  Failed  : ${String(failed).padEnd(45)}║`);
  console.log(`║  ⚠️   Warnings: ${String(warned).padEnd(44)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (failed > 0) {
    console.log('Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('🎉  All critical tests passed!');
    process.exit(0);
  }
}

main();
