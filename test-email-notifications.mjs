/**
 * Email Notification Pipeline — End-to-End Test
 *
 * Tests the complete buyer email notification pipeline:
 *   DB templates → edge function → Resend → buyer inbox + email_logs
 *   Also tests: in-app notifications, push notification endpoint
 *
 * Run with: node test-email-notifications.mjs
 *
 * Buyer under test : jcuady@gmail.com
 * Order under test : ORD-2026MMYXEAH1 (8f172d1e-a547-4f61-a0f7-3ca362d8c54a)
 * Seller under test: 7955043d-f46f-47aa-8767-0582c35b95c7
 */
import { createClient } from '@supabase/supabase-js';

// ─── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL     = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';
const ANON_KEY         = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const BUYER_EMAIL     = 'jcuady@gmail.com';
const BUYER_ID        = '0c07b27c-56e4-421c-9a9a-e43d775c8479';
const BUYER_NAME      = 'Juan Cuady';
const ORDER_ID        = '8f172d1e-a547-4f61-a0f7-3ca362d8c54a';
const ORDER_NUMBER    = 'ORD-2026MMYXEAH1';
const SELLER_ID       = '7955043d-f46f-47aa-8767-0582c35b95c7';

const SEND_EMAIL_URL  = `${SUPABASE_URL}/functions/v1/send-email`;
const SEND_PUSH_URL   = `${SUPABASE_URL}/functions/v1/send-push-notification`;

const REQUIRED_TEMPLATES = [
  'order_confirmed',
  'order_shipped',
  'order_delivered',
  'order_cancelled',
];

// Clients
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ─── Test harness ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let warned = 0;

function test(name, ok, detail = '') {
  if (ok) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}
function warn(name, detail = '') {
  console.log(`  ⚠️  ${name}${detail ? ' — ' + detail : ''}`);
  warned++;
}
function section(title) {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(55));
}

// ─── Template renderer (mirrors emailService.renderTemplate) ───────────────────
function renderTemplate(html, subject, variables) {
  let h = html, s = subject;
  for (const [k, v] of Object.entries(variables)) {
    // Variables ending in _html or named 'content' contain trusted HTML — skip escaping
    const isHtml = k.endsWith('_html') || k === 'content';
    const safe = isHtml ? String(v) : String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const re = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
    h = h.replace(re, safe);
    s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
  }
  return { html: h, subject: s };
}

// ─── Direct edge function call (mirrors frontend fetch) ────────────────────────
async function callSendEmail(payload) {
  const res = await fetch(SEND_EMAIL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      // No Authorization header — mirrors a real browser request with anon key only
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

// ─── Main test ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Buyer Email Notification Pipeline — E2E Test');
  console.log('  Target: jcuady@gmail.com');
  console.log(`  Date  : ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════');

  // ── SECTION 1: Backend DB checks ───────────────────────────────────────────
  section('1. Backend DB Checks (service role)');

  // 1a. Buyer account
  const { data: buyer, error: buyerErr } = await admin
    .from('profiles')
    .select('id')
    .eq('id', BUYER_ID)
    .maybeSingle();
  test('Buyer profile exists in DB', !!buyer && !buyerErr, buyerErr?.message);
  if (buyer) console.log(`     → id: ${buyer.id}`);

  // 1b. Order exists and has email
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select(`
      id, order_number, buyer_id, shipment_status, payment_status,
      recipient:order_recipients!orders_recipient_id_fkey(first_name, last_name, email)
    `)
    .eq('id', ORDER_ID)
    .maybeSingle();
  test('Test order exists', !!order && !orderErr, orderErr?.message);
  const recipientEmail = order?.recipient?.email;
  test('Order has recipient email', !!recipientEmail, `email: ${recipientEmail ?? 'MISSING'}`);
  test('Recipient email matches buyer', recipientEmail === BUYER_EMAIL,
    `expected ${BUYER_EMAIL}, got ${recipientEmail}`);
  if (order) {
    console.log(`     → order_number: ${order.order_number}`);
    console.log(`     → shipment_status: ${order.shipment_status}, payment_status: ${order.payment_status}`);
  }

  // 1c. Email templates
  section('2. Email Template Checks');
  const { data: templates, error: tmplErr } = await admin
    .from('email_templates')
    .select('slug, is_active, approval_status, html_body')
    .in('slug', REQUIRED_TEMPLATES);

  test('Templates queryable', !tmplErr, tmplErr?.message);
  test(`All ${REQUIRED_TEMPLATES.length} required templates present`,
    (templates?.length ?? 0) >= REQUIRED_TEMPLATES.length,
    `found: ${templates?.length ?? 0}`);

  const tmplMap = {};
  for (const t of templates ?? []) {
    tmplMap[t.slug] = t;
    const approvedOk = !t.approval_status || t.approval_status === 'approved';
    test(`"${t.slug}" is_active=true`, t.is_active === true);
    test(`"${t.slug}" approval_status ok`, approvedOk, `status: ${t.approval_status ?? 'null (ok)'}`);
    test(`"${t.slug}" html_body exists`, !!t.html_body && t.html_body.length > 10);
  }

  // 1d. Notification settings — are email channels enabled?
  section('3. Notification Settings Checks');
  const eventTypes = ['order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled'];
  const { data: settings } = await admin
    .from('notification_settings')
    .select('channel, event_type, is_enabled')
    .eq('channel', 'email')
    .in('event_type', eventTypes);

  if (!settings || settings.length === 0) {
    warn('No notification_settings rows for these events — edge function will allow by default');
  } else {
    for (const s of settings) {
      test(`notification_settings: email/${s.event_type} enabled`, s.is_enabled === true,
        `is_enabled=${s.is_enabled}`);
    }
  }

  // 1e. Suppression list check
  section('4. Suppression List Check');
  const { data: suppressed } = await admin
    .from('suppression_list')
    .select('contact, reason')
    .eq('contact', BUYER_EMAIL)
    .eq('contact_type', 'email')
    .maybeSingle();
  test(`${BUYER_EMAIL} is NOT suppressed`, !suppressed,
    suppressed ? `Suppressed: ${suppressed.reason}` : '');

  // ── SECTION 2: Edge Function Connectivity (CORS preflight) ─────────────────
  section('5. Edge Function CORS Preflight');

  const emailOptions = await fetch(SEND_EMAIL_URL, {
    method: 'OPTIONS',
    headers: { Origin: 'https://bazaar.ph', 'Access-Control-Request-Method': 'POST' },
  });
  test('send-email CORS preflight → 200', emailOptions.status === 200,
    `status: ${emailOptions.status}`);
  test('send-email Access-Control-Allow-Origin header present',
    !!emailOptions.headers.get('access-control-allow-origin'));

  const pushOptions = await fetch(SEND_PUSH_URL, {
    method: 'OPTIONS',
    headers: { Origin: 'https://bazaar.ph', 'Access-Control-Request-Method': 'POST' },
  });
  test('send-push-notification CORS preflight → 200', pushOptions.status === 200,
    `status: ${pushOptions.status}`);
  test('send-push Access-Control-Allow-Origin header present',
    !!pushOptions.headers.get('access-control-allow-origin'));

  // ── SECTION 3: Send each order status email ─────────────────────────────────
  section('6. Send Order Status Emails via Edge Function (anon key, no JWT)');

  const BASE_URL = 'https://bazaar.ph';
  const trackUrl = `${BASE_URL}/orders/${ORDER_ID}`;
  const testStart = new Date();

  const emailTests = [
    {
      label: 'order_confirmed',
      slug: 'order_confirmed',
      event_type: 'order_confirmed',
      vars: {
        buyer_name: BUYER_NAME,
        order_number: ORDER_NUMBER,
        estimated_delivery: '3–7 business days',
      },
    },
    {
      label: 'order_shipped',
      slug: 'order_shipped',
      event_type: 'order_shipped',
      vars: {
        buyer_name: BUYER_NAME,
        order_number: ORDER_NUMBER,
        tracking_number: 'TEST-TRACK-001',
        courier_name: 'Test Courier',
        tracking_url: trackUrl,
      },
    },
    {
      label: 'order_delivered',
      slug: 'order_delivered',
      event_type: 'order_delivered',
      vars: {
        buyer_name: BUYER_NAME,
        order_number: ORDER_NUMBER,
      },
    },
    {
      label: 'order_cancelled',
      slug: 'order_cancelled',
      event_type: 'order_cancelled',
      vars: {
        buyer_name: BUYER_NAME,
        order_number: ORDER_NUMBER,
        cancel_reason: 'Test cancellation from e2e test script',
      },
    },
  ];

  const sentEventTypes = [];

  for (const t of emailTests) {
    const tmpl = tmplMap[t.slug];
    if (!tmpl) {
      warn(`Skipping "${t.label}" — template not found in DB`);
      continue;
    }

    const rendered = renderTemplate(tmpl.html_body, tmpl.subject ?? t.label, t.vars);
    const payload = {
      to: BUYER_EMAIL,
      subject: rendered.subject,
      html: rendered.html,
      event_type: t.event_type,
      category: 'transactional',
      recipient_id: BUYER_ID,
      metadata: { order_number: ORDER_NUMBER, test: true },
    };

    console.log(`\n  → Sending "${t.label}" to ${BUYER_EMAIL}...`);
    const result = await callSendEmail(payload);
    test(`"${t.label}" HTTP 200`, result.status === 200, `status: ${result.status}`);
    test(`"${t.label}" sent=true`, result.json?.sent === true,
      result.json?.error || result.json?.reason || JSON.stringify(result.json));

    if (result.json?.sent) {
      console.log(`     → message_id: ${result.json.message_id}`);
      sentEventTypes.push(t.event_type);
    } else {
      console.log(`     → response: ${JSON.stringify(result.json)}`);
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 800));
  }

  // ── SECTION 4: Verify email_logs captured the sends ──────────────────────────
  section('7. email_logs Audit Trail Verification');

  // Give logs a moment to write
  await new Promise(r => setTimeout(r, 1000));

  const { data: logs, error: logsErr } = await admin
    .from('email_logs')
    .select('event_type, status, recipient_email, sent_at, resend_message_id')
    .eq('recipient_email', BUYER_EMAIL)
    .gte('queued_at', testStart.toISOString())
    .order('queued_at', { ascending: false });

  test('email_logs query succeeds', !logsErr, logsErr?.message);
  test(`email_logs has ${sentEventTypes.length} new entries`,
    (logs?.length ?? 0) >= sentEventTypes.length,
    `found: ${logs?.length ?? 0}, expected: ${sentEventTypes.length}`);

  if (logs && logs.length > 0) {
    for (const log of logs) {
      console.log(`     → ${log.event_type}: status=${log.status}, id=${log.resend_message_id ?? 'n/a'}`);
      test(`  "${log.event_type}" logged as status=sent`, log.status === 'sent',
        `actual status: ${log.status}`);
    }
  }

  // ── SECTION 5: Push notification endpoint ────────────────────────────────────
  section('8. Push Notification Endpoint Test');

  const pushRes = await fetch(SEND_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({
      userId: BUYER_ID,
      title: '🧪 Test Notification',
      body: 'This is a test push notification from the e2e test script.',
      data: { type: 'test', orderId: ORDER_ID },
    }),
  });
  const pushJson = await pushRes.json().catch(() => ({}));
  test('send-push-notification HTTP 200', pushRes.status === 200, `status: ${pushRes.status}`);

  if (pushJson.sent === 0 || pushJson.message?.includes('No push tokens')) {
    warn('No Expo push tokens registered for buyer — expected on web, fine on mobile');
    console.log(`     → response: ${JSON.stringify(pushJson)}`);
  } else if (pushJson.sent > 0) {
    test('Push notification sent', pushJson.sent > 0, `sent: ${pushJson.sent}`);
    console.log(`     → sent to ${pushJson.sent} device(s)`);
  } else {
    test('Push notification response ok', !pushJson.error, pushJson.error ?? JSON.stringify(pushJson));
  }

  // ── SECTION 6: In-app notification check ─────────────────────────────────────
  section('9. In-App Notification DB Check');

  const { data: inAppNotifs, error: notifErr } = await admin
    .from('buyer_notifications')
    .select('type, title, message, created_at')
    .eq('buyer_id', BUYER_ID)
    .order('created_at', { ascending: false })
    .limit(5);

  test('buyer_notifications table queryable', !notifErr, notifErr?.message);
  if (inAppNotifs && inAppNotifs.length > 0) {
    console.log(`  Latest ${inAppNotifs.length} in-app notifications for ${BUYER_EMAIL}:`);
    for (const n of inAppNotifs) {
      const ago = Math.round((Date.now() - new Date(n.created_at).getTime()) / 60000);
      console.log(`     → [${ago}m ago] ${n.type}: "${n.title}"`);
    }
  } else {
    warn('No in-app notifications found for buyer (will be created when seller triggers status change from the UI)');
  }

  // ── SECTION 7: Seller order lookup ───────────────────────────────────────────
  section('10. Seller Order Buyer-Email Mapping Check');

  // Simulate what the mapper does: verify the order has recipient.email populated
  const { data: fullOrder, error: fullOrderErr } = await admin
    .from('orders')
    .select(`
      id, order_number, buyer_id,
      recipient:order_recipients!orders_recipient_id_fkey(first_name, last_name, email)
    `)
    .eq('id', ORDER_ID)
    .maybeSingle();

  test('Full order query succeeds', !fullOrderErr && !!fullOrder, fullOrderErr?.message);
  const mappedEmail = fullOrder?.recipient?.email;
  test('buyer email will be populated in sellerOrderStore',
    !!mappedEmail && mappedEmail !== '',
    `mapped buyerEmail: "${mappedEmail ?? 'EMPTY'}"`);
  test('Mapped email goes to correct buyer', mappedEmail === BUYER_EMAIL,
    `expected: ${BUYER_EMAIL}`);

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  ✅  Passed : ${passed}`);
  console.log(`  ❌  Failed : ${failed}`);
  console.log(`  ⚠️   Warned : ${warned}`);
  console.log('');

  if (failed === 0) {
    console.log('  🎉 ALL TESTS PASSED — Email pipeline is fully operational');
    console.log(`     Check jcuady@gmail.com inbox for ${emailTests.length} test emails`);
  } else {
    console.log('  ⛔ FAILURES DETECTED — Review the ❌ items above');
    if (sentEventTypes.length < emailTests.length) {
      console.log('\n  Common causes:');
      console.log('  1. RESEND_API_KEY not set in edge function env vars');
      console.log('  2. email_templates have approval_status != approved');
      console.log('  3. notification_settings has is_enabled = false for these events');
    }
  }
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n💥 Unexpected error:', err.message);
  process.exit(1);
});
