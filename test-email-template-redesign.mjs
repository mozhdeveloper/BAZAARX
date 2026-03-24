/**
 * Email Template Redesign — Full E2E Test (All 16 Templates)
 *
 * Tests every email template with the new Fresha-inspired design:
 *   1. Fetches each template from DB
 *   2. Renders client-side (mimics web & mobile emailService)
 *   3. Sends via edge function to real inbox
 *   4. Verifies email_logs captured each send
 *
 * Run with: node test-email-template-redesign.mjs
 *
 * Buyer: jcuady@gmail.com
 */
import { createClient } from '@supabase/supabase-js';

// ─── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL     = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';
const ANON_KEY         = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const BUYER_EMAIL  = 'jcuady@gmail.com';
const BUYER_ID     = '0c07b27c-56e4-421c-9a9a-e43d775c8479';
const BUYER_NAME   = 'Juan Cuady';
const ORDER_NUMBER = 'ORD-TEST-REDESIGN-001';
const RECEIPT_NUM  = 'RCP-20260323-T0001';
const BASE_URL     = 'https://bazaar.ph';
const SEND_EMAIL_URL = `${SUPABASE_URL}/functions/v1/send-email`;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ─── Test harness ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;

function test(name, ok, detail = '') {
  if (ok) { console.log(`  ✅ ${name}`); passed++; }
  else    { console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); failed++; }
}
function skip(name, detail = '') {
  console.log(`  ⏭️  ${name}${detail ? ' — ' + detail : ''}`); skipped++;
}
function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// ─── Template renderer (mirrors emailService.renderTemplate on both platforms) ─
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
    s = s.replace(re, String(v));
  }
  return { html: h, subject: s };
}

// ─── Edge function caller ──────────────────────────────────────────────────────
async function callSendEmail(payload) {
  const res = await fetch(SEND_EMAIL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

// ─── Sample items_html for receipt-type templates ─────────────────────────────
const SAMPLE_ITEMS_HTML = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
  <tr style="border-bottom:1px solid #E4E4E7">
    <td style="padding:12px 0;width:56px;vertical-align:top">
      <img src="https://placehold.co/56x56/F4F4F5/71717A?text=Earbuds" alt="Wireless Bluetooth Earbuds" width="56" height="56" style="display:block;border-radius:8px;border:1px solid #E4E4E7" />
    </td>
    <td style="padding:12px 0 12px 12px;vertical-align:top;color:#18181B">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#18181B">Wireless Bluetooth Earbuds</p>
      <p style="margin:0;font-size:13px;color:#71717A">Qty: 1</p>
    </td>
    <td align="right" style="padding:12px 0;vertical-align:top;white-space:nowrap">
      <span style="font-size:14px;font-weight:600;color:#18181B">&#8369;1,299.00</span>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 0;width:56px;vertical-align:top">
      <img src="https://placehold.co/56x56/F4F4F5/71717A?text=Case" alt="Premium Phone Case" width="56" height="56" style="display:block;border-radius:8px;border:1px solid #E4E4E7" />
    </td>
    <td style="padding:12px 0 12px 12px;vertical-align:top;color:#18181B">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#18181B">Premium Phone Case</p>
      <p style="margin:0;font-size:13px;color:#71717A">Qty: 2</p>
    </td>
    <td align="right" style="padding:12px 0;vertical-align:top;white-space:nowrap">
      <span style="font-size:14px;font-weight:600;color:#18181B">&#8369;598.00</span>
    </td>
  </tr>
</table>`;

// ─── All 16 template test definitions ──────────────────────────────────────────
// Variables match EXACTLY what transactionalEmails.ts sends for each slug
const TEMPLATE_TESTS = [
  {
    slug: 'order_receipt',
    event_type: 'order_placed',
    label: 'Order Receipt',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
      order_date: 'March 23, 2026',
      items_html: SAMPLE_ITEMS_HTML,
      subtotal: '1,897.00',
      shipping: '80.00',
      total: '1,977.00',
    },
  },
  {
    slug: 'order_confirmed',
    event_type: 'order_confirmed',
    label: 'Order Confirmed',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
      estimated_delivery: '3–7 business days',
    },
  },
  {
    slug: 'order_shipped',
    event_type: 'order_shipped',
    label: 'Order Shipped',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
      tracking_number: 'JT-PH-2026032300123',
      courier: 'J&T Express',
      track_url: `${BASE_URL}/orders/track/JT-PH-2026032300123`,
    },
  },
  {
    slug: 'order_delivered',
    event_type: 'order_delivered',
    label: 'Order Delivered',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
    },
  },
  {
    slug: 'order_cancelled',
    event_type: 'order_cancelled',
    label: 'Order Cancelled',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
      cancel_reason: 'Buyer requested cancellation',
    },
  },
  {
    slug: 'payment_received',
    event_type: 'payment_received',
    label: 'Payment Received',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
      payment_method: 'GCash',
      amount: '1,977.00',
    },
  },
  {
    slug: 'refund_processed',
    event_type: 'refund_processed',
    label: 'Refund Processed',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
      amount: '1,977.00',
      refund_method: 'GCash',
    },
  },
  {
    slug: 'welcome',
    event_type: 'welcome',
    label: 'Welcome Email',
    platform: 'web',
    variables: {
      buyer_name: BUYER_NAME,
      shop_url: BASE_URL,
    },
  },
  {
    slug: 'marketing_blast',
    event_type: 'marketing',
    label: 'Marketing Blast',
    platform: 'web',
    variables: {
      buyer_name: BUYER_NAME,
      content: '<p>Flash sale happening now! Get up to <strong>50% off</strong> on electronics, fashion, and home essentials. Shop now before stocks run out.</p>',
      subject: 'Flash Sale — Up to 50% Off!',
    },
  },
  {
    slug: 'order_ready_to_ship',
    event_type: 'order_ready_to_ship',
    label: 'Ready to Ship',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
      estimated_pickup: 'March 24, 2026',
      track_url: `${BASE_URL}/orders/${ORDER_NUMBER}`,
    },
  },
  {
    slug: 'order_out_for_delivery',
    event_type: 'order_out_for_delivery',
    label: 'Out for Delivery',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
      courier_name: 'Lalamove',
      track_url: `${BASE_URL}/orders/${ORDER_NUMBER}`,
    },
  },
  {
    slug: 'order_failed_delivery',
    event_type: 'order_failed_delivery',
    label: 'Failed Delivery',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
      failure_reason: 'No one was available to receive the package',
      reschedule_url: `${BASE_URL}/orders/${ORDER_NUMBER}/reschedule`,
    },
  },
  {
    slug: 'order_returned',
    event_type: 'order_returned',
    label: 'Order Returned',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
      refund_amount: '1,977.00',
      refund_method: 'GCash',
      track_url: `${BASE_URL}/orders/${ORDER_NUMBER}`,
    },
  },
  {
    slug: 'partial_refund_processed',
    event_type: 'partial_refund',
    label: 'Partial Refund',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
      refund_amount: '598.00',
      refund_method: 'GCash',
      remaining_total: '1,379.00',
      track_url: `${BASE_URL}/orders/${ORDER_NUMBER}`,
    },
  },
  {
    slug: 'payment_failed',
    event_type: 'payment_failed',
    label: 'Payment Failed',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      order_number: ORDER_NUMBER,
      retry_url: `${BASE_URL}/orders/${ORDER_NUMBER}/pay`,
    },
  },
  {
    slug: 'digital_receipt',
    event_type: 'digital_receipt',
    label: 'Digital Receipt',
    platform: 'both',
    variables: {
      buyer_name: BUYER_NAME,
      buyer_email: BUYER_EMAIL,
      receipt_number: RECEIPT_NUM,
      order_number: ORDER_NUMBER,
      order_date: 'March 23, 2026',
      items_html: SAMPLE_ITEMS_HTML,
      subtotal: '1,897.00',
      shipping: '80.00',
      discount: '100.00',
      total: '1,877.00',
      payment_method: 'GCash',
      transaction_id: 'TXN-GC-20260323-99001',
      transaction_date: 'March 23, 2026 14:32',
      shipping_address: '123 Rizal St, Makati City, Metro Manila 1200',
      track_url: `${BASE_URL}/orders/${ORDER_NUMBER}`,
    },
  },
];


// ─── Main test ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  BazaarX Email Template Redesign — Full E2E Test');
  console.log(`  Target : ${BUYER_EMAIL}`);
  console.log(`  Date   : ${new Date().toISOString()}`);
  console.log(`  Emails : ${TEMPLATE_TESTS.length} templates to test`);
  console.log('═══════════════════════════════════════════════════════════');

  // ═══ PHASE 1: Fetch ALL templates from DB ══════════════════════════════════
  section('Phase 1 — Fetch all 16 templates from DB');

  const allSlugs = TEMPLATE_TESTS.map(t => t.slug);
  const { data: templates, error: tmplErr } = await admin
    .from('email_templates')
    .select('slug, subject, html_body, is_active, approval_status')
    .in('slug', allSlugs);

  test('Templates queryable', !tmplErr, tmplErr?.message);
  test(`All ${allSlugs.length} templates found`, (templates?.length ?? 0) === allSlugs.length,
    `found ${templates?.length ?? 0}, expected ${allSlugs.length}`);

  if (!templates || templates.length === 0) {
    console.log('\n  ⛔ No templates found. Run migration 026 first:');
    console.log('     psql < supabase-migrations/026_email_template_redesign.sql\n');
    process.exit(1);
  }

  const tmplMap = {};
  for (const t of templates) {
    tmplMap[t.slug] = t;
  }

  // Check each template exists and is active
  for (const slug of allSlugs) {
    const t = tmplMap[slug];
    if (!t) {
      test(`"${slug}" exists in DB`, false, 'NOT FOUND');
      continue;
    }
    test(`"${slug}" is_active`, t.is_active === true);
    const approvedOk = !t.approval_status || t.approval_status === 'approved';
    test(`"${slug}" approved`, approvedOk, `status: ${t.approval_status}`);
    test(`"${slug}" has html_body`, !!t.html_body && t.html_body.length > 100,
      `length: ${t.html_body?.length ?? 0}`);
  }

  // ═══ PHASE 2: Verify new design elements ═══════════════════════════════════
  section('Phase 2 — Verify redesigned template structure');

  for (const slug of allSlugs) {
    const t = tmplMap[slug];
    if (!t) continue;
    const html = t.html_body;

    // Check for Fresha-inspired design elements
    const hasBrandLogo = html.includes('Bazaar<span style="color:#D97706">X</span>');
    const hasZincBg    = html.includes('background-color:#F4F4F5');
    const hasWhiteCard = html.includes('background:#FFFFFF');
    const hasRoundCard = html.includes('border-radius:16px');
    const hasAccentBar = html.includes('height:4px;background:#D97706') || html.includes('height:4px;background:#DC2626');
    const hasSystemFont = html.includes('-apple-system');

    test(`"${slug}" BazaarX branded logo`,    hasBrandLogo);
    test(`"${slug}" zinc-100 background`,     hasZincBg);
    test(`"${slug}" white card + 16px radius`, hasWhiteCard && hasRoundCard);
    test(`"${slug}" accent bar (4px)`,        hasAccentBar);
    test(`"${slug}" system font stack`,       hasSystemFont);
  }

  // ═══ PHASE 3: Render + verify no unreplaced {{variables}} ══════════════════
  section('Phase 3 — Client-side rendering (variable matching)');

  const renderedEmails = [];

  for (const def of TEMPLATE_TESTS) {
    const tmpl = tmplMap[def.slug];
    if (!tmpl) {
      skip(`"${def.slug}" — template not in DB`);
      continue;
    }

    const rendered = renderTemplate(tmpl.html_body, tmpl.subject, def.variables);

    // Check for unreplaced variables
    const unreplaced = rendered.html.match(/\{\{[a-z_]+\}\}/g) || [];
    const unrepSubj  = rendered.subject.match(/\{\{[a-z_]+\}\}/g) || [];

    test(`"${def.slug}" body — all variables replaced`,
      unreplaced.length === 0,
      unreplaced.length ? `Unreplaced: ${unreplaced.join(', ')}` : '');
    test(`"${def.slug}" subject — all variables replaced`,
      unrepSubj.length === 0,
      unrepSubj.length ? `Unreplaced: ${unrepSubj.join(', ')}` : '');

    renderedEmails.push({
      ...def,
      subject: rendered.subject,
      html: rendered.html,
    });
  }

  // ═══ PHASE 4: Send all emails via edge function ════════════════════════════
  section('Phase 4 — Sending all 16 emails to inbox');

  const testStart = new Date();
  let sentCount = 0;

  for (const email of renderedEmails) {
    // Add "[Test - Platform]" prefix to subject for easy identification
    const platformLabel = email.platform === 'both' ? 'Web+Mobile' : email.platform === 'web' ? 'Web' : 'Mobile';
    const taggedSubject = `[${platformLabel}] ${email.subject}`;

    const payload = {
      to: BUYER_EMAIL,
      subject: taggedSubject,
      html: email.html,
      event_type: email.event_type,
      category: email.slug === 'marketing_blast' ? 'marketing' : 'transactional',
      recipient_id: BUYER_ID,
      metadata: { order_number: ORDER_NUMBER, test: true, template_slug: email.slug },
    };

    console.log(`\n  → [${renderedEmails.indexOf(email) + 1}/${renderedEmails.length}] Sending "${email.label}"...`);
    const result = await callSendEmail(payload);
    test(`"${email.label}" HTTP ${result.status}`, result.status === 200, `status: ${result.status}`);

    if (result.json?.sent === true) {
      test(`"${email.label}" sent=true`, true);
      console.log(`     ✓ message_id: ${result.json.message_id}`);
      sentCount++;
    } else {
      test(`"${email.label}" sent=true`, false,
        result.json?.error || result.json?.reason || JSON.stringify(result.json));
    }

    // Delay between sends to avoid rate limiting
    await new Promise(r => setTimeout(r, 600));
  }

  // ═══ PHASE 5: Verify email_logs ════════════════════════════════════════════
  section('Phase 5 — email_logs audit trail');

  // Wait for logs to flush
  await new Promise(r => setTimeout(r, 2000));

  const { data: logs, error: logsErr } = await admin
    .from('email_logs')
    .select('event_type, status, recipient_email, resend_message_id, sent_at')
    .eq('recipient_email', BUYER_EMAIL)
    .gte('queued_at', testStart.toISOString())
    .order('queued_at', { ascending: true });

  test('email_logs query succeeds', !logsErr, logsErr?.message);
  test(`email_logs has ${sentCount} entries`, (logs?.length ?? 0) >= sentCount,
    `found: ${logs?.length ?? 0}, expected: ${sentCount}`);

  if (logs && logs.length > 0) {
    let logSentCount = 0;
    for (const log of logs) {
      const isSent = log.status === 'sent';
      if (isSent) logSentCount++;
      console.log(`     ${isSent ? '✓' : '✗'} ${log.event_type}: status=${log.status}, id=${log.resend_message_id ?? 'n/a'}`);
    }
    test(`All logged as sent`, logSentCount === logs.length,
      `${logSentCount}/${logs.length} sent`);
  }

  // ═══ PHASE 6: Suppression list check ═══════════════════════════════════════
  section('Phase 6 — Final checks');

  const { data: suppressed } = await admin
    .from('suppression_list')
    .select('contact')
    .eq('contact', BUYER_EMAIL)
    .eq('contact_type', 'email')
    .maybeSingle();
  test(`${BUYER_EMAIL} is NOT suppressed`, !suppressed);

  // ═══ Summary ═══════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✅  Passed  : ${passed}`);
  console.log(`  ❌  Failed  : ${failed}`);
  console.log(`  ⏭️   Skipped : ${skipped}`);
  console.log(`  📧  Sent    : ${sentCount}/${TEMPLATE_TESTS.length} emails`);
  console.log('');

  if (failed === 0 && sentCount === TEMPLATE_TESTS.length) {
    console.log('  🎉 ALL TESTS PASSED');
    console.log(`     Check ${BUYER_EMAIL} inbox for ${sentCount} redesigned emails.`);
    console.log('');
    console.log('  Expected inbox (newest first):');
    for (const e of [...renderedEmails].reverse()) {
      const p = e.platform === 'both' ? 'Web+Mobile' : e.platform;
      console.log(`     📩 [${p}] ${e.label}`);
    }
  } else if (failed === 0) {
    console.log('  ⚠️  Tests passed but not all emails sent — check edge function logs');
  } else {
    console.log('  ⛔ FAILURES DETECTED — Review ❌ items above');
    console.log('');
    console.log('  Common fixes:');
    console.log('  • Run migration 026 if templates not found in DB');
    console.log('  • Check RESEND_API_KEY is set in edge function env');
    console.log('  • Verify notification_settings has is_enabled=true');
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n💥 Unexpected error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
