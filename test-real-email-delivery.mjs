/**
 * Real Email Delivery Test — BazaarX
 *
 * Sends all 15 transactional email templates to a REAL inbox to verify:
 *   1. Emails actually arrive via Resend → bazaar.ph domain
 *   2. Branding is correct (#D97706 amber, not #FF6A00 orange)
 *   3. Template variables render properly
 *   4. All 7 newly-wired automation emails work end-to-end
 *   5. Previously-working 8 status emails still work
 *
 * Usage:
 *   node test-real-email-delivery.mjs
 *   node test-real-email-delivery.mjs --slug=welcome       # send only one
 *   node test-real-email-delivery.mjs --slug=order_receipt  # send only one
 */
import { createClient } from '@supabase/supabase-js';

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';
const TEST_EMAIL   = 'jcuady@gmail.com';
const TEST_NAME    = 'Juan Carlo';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ─── Stats ────────────────────────────────────────────────────────────────────
let sent = 0;
let failed = 0;
let skipped = 0;

// ─── Sample data for template variables ───────────────────────────────────────
const SAMPLE_ORDER  = 'BZR-20260320-TEST';
const SAMPLE_DATE   = 'March 20, 2026';
const SAMPLE_AMOUNT = '₱2,499.00';
const TRACK_URL     = 'https://bazaar.ph/order/BZR-20260320-TEST';
const SHOP_URL      = 'https://bazaar.ph';

const ITEMS_HTML = `
<table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:14px">
  <thead>
    <tr style="background:#f9fafb">
      <th style="text-align:left;font-weight:600;color:#374151;font-size:12px;text-transform:uppercase">Item</th>
      <th style="text-align:center;font-weight:600;color:#374151;font-size:12px;text-transform:uppercase">Qty</th>
      <th style="text-align:right;font-weight:600;color:#374151;font-size:12px;text-transform:uppercase">Price</th>
      <th style="text-align:right;font-weight:600;color:#374151;font-size:12px;text-transform:uppercase">Total</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Premium Wireless Earbuds</td><td style="text-align:center">1</td><td style="text-align:right">₱1,299.00</td><td style="text-align:right">₱1,299.00</td></tr>
    <tr style="background:#f9fafb"><td>Phone Case - Clear</td><td style="text-align:center">2</td><td style="text-align:right">₱350.00</td><td style="text-align:right">₱700.00</td></tr>
    <tr><td>USB-C Fast Charger 65W</td><td style="text-align:center">1</td><td style="text-align:right">₱500.00</td><td style="text-align:right">₱500.00</td></tr>
  </tbody>
</table>`;

// ─── All 15 templates + their variables ───────────────────────────────────────
const TEMPLATES = [
  // === 7 NEWLY WIRED (checkout, payment, refund, welcome) ===
  {
    slug: 'welcome',
    label: '🆕 Welcome Email (signup)',
    variables: { buyer_name: TEST_NAME, shop_url: SHOP_URL },
  },
  {
    slug: 'order_receipt',
    label: '🆕 Order Receipt (checkout)',
    variables: {
      buyer_name: TEST_NAME, order_number: SAMPLE_ORDER, order_date: SAMPLE_DATE,
      payment_method: 'GCash', shipping_address: '123 Rizal St, Makati, Metro Manila 1200',
      items_html: ITEMS_HTML, subtotal: '2,499.00', shipping: '99.00',
      discount: '100.00', total: '2,498.00', track_url: TRACK_URL,
    },
  },
  {
    slug: 'payment_received',
    label: '🆕 Payment Received (payment success)',
    variables: {
      buyer_name: TEST_NAME, amount: '2,498.00', order_number: SAMPLE_ORDER,
      payment_method: 'GCash', transaction_date: SAMPLE_DATE,
    },
  },
  {
    slug: 'digital_receipt',
    label: '🆕 Digital Receipt (payment success)',
    variables: {
      buyer_name: TEST_NAME, buyer_email: TEST_EMAIL,
      receipt_number: 'RCP-20260320-0001', order_number: SAMPLE_ORDER,
      order_date: SAMPLE_DATE, items_html: ITEMS_HTML,
      subtotal: '2,499.00', shipping: '99.00', discount: '100.00', total: '2,498.00',
      payment_method: 'GCash', transaction_id: 'TXN-ABC123DEF456',
      transaction_date: SAMPLE_DATE,
      shipping_address: '123 Rizal St, Makati, Metro Manila 1200',
      track_url: TRACK_URL,
    },
  },
  {
    slug: 'payment_failed',
    label: '🆕 Payment Failed (payment failure)',
    variables: {
      buyer_name: TEST_NAME, order_number: SAMPLE_ORDER, retry_url: TRACK_URL,
    },
  },
  {
    slug: 'refund_processed',
    label: '🆕 Refund Processed (return approved)',
    variables: {
      buyer_name: TEST_NAME, amount: '2,498.00', order_number: SAMPLE_ORDER,
      refund_method: 'GCash', shop_url: SHOP_URL,
    },
  },
  {
    slug: 'partial_refund_processed',
    label: '🆕 Partial Refund (counter-offer accepted)',
    variables: {
      buyer_name: TEST_NAME, order_number: SAMPLE_ORDER,
      refund_amount: '500.00', remaining_total: '1,998.00',
      refund_method: 'GCash', track_url: TRACK_URL,
    },
  },

  // === 8 PREVIOUSLY WORKING (order status via orderNotificationService) ===
  {
    slug: 'order_confirmed',
    label: '✅ Order Confirmed (processing)',
    variables: {
      buyer_name: TEST_NAME, order_number: SAMPLE_ORDER,
      estimated_delivery: 'March 25, 2026', track_url: TRACK_URL,
    },
  },
  {
    slug: 'order_ready_to_ship',
    label: '✅ Ready to Ship',
    variables: {
      buyer_name: TEST_NAME, order_number: SAMPLE_ORDER,
      estimated_pickup: 'March 21, 2026', track_url: TRACK_URL,
    },
  },
  {
    slug: 'order_shipped',
    label: '✅ Order Shipped',
    variables: {
      buyer_name: TEST_NAME, order_number: SAMPLE_ORDER,
      tracking_number: 'JT-PH-2026032012345', courier: 'J&T Express',
      track_url: TRACK_URL,
    },
  },
  {
    slug: 'order_out_for_delivery',
    label: '✅ Out for Delivery',
    variables: {
      buyer_name: TEST_NAME, order_number: SAMPLE_ORDER,
      courier_name: 'J&T Express', track_url: TRACK_URL,
    },
  },
  {
    slug: 'order_delivered',
    label: '✅ Order Delivered',
    variables: {
      buyer_name: TEST_NAME, order_number: SAMPLE_ORDER,
      review_url: `${SHOP_URL}/review/${SAMPLE_ORDER}`,
    },
  },
  {
    slug: 'order_failed_delivery',
    label: '✅ Failed Delivery',
    variables: {
      buyer_name: TEST_NAME, order_number: SAMPLE_ORDER,
      failure_reason: 'No one available to receive the package',
      reschedule_url: TRACK_URL,
    },
  },
  {
    slug: 'order_cancelled',
    label: '✅ Order Cancelled',
    variables: {
      buyer_name: TEST_NAME, order_number: SAMPLE_ORDER,
      cancel_reason: 'Buyer requested cancellation', refund_amount: '2,498.00',
      shop_url: SHOP_URL,
    },
  },
  {
    slug: 'order_returned',
    label: '✅ Order Returned',
    variables: {
      buyer_name: TEST_NAME, order_number: SAMPLE_ORDER,
      refund_amount: '2,498.00', refund_method: 'GCash', track_url: TRACK_URL,
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function renderTemplate(htmlBody, subject, variables) {
  let html = htmlBody;
  let subj = subject;
  for (const [key, value] of Object.entries(variables)) {
    // items_html contains HTML — don't escape it
    const escaped = key.endsWith('_html') ? value : escapeHtml(value);
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    html = html.replace(pattern, escaped);
    subj = subj.replace(pattern, value);
  }
  return { subject: subj, html };
}

async function sendViaEdgeFunction(to, subject, html, eventType, recipientId, templateId) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      to,
      subject,
      html,
      event_type: eventType,
      category: 'transactional',
      recipient_id: recipientId || null,
      template_id: templateId || null,
      metadata: { test: true, sent_at: new Date().toISOString() },
    }),
  });
  return res.json();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const slugFilter = args.find(a => a.startsWith('--slug='))?.split('=')[1];

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     BazaarX — Real Email Delivery Test                      ║');
  console.log('║     Sending to: ' + TEST_EMAIL.padEnd(43) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // ── Step 1: Verify branding in DB ──────────────────────────────────────────
  console.log('📋 Step 1: Verify template branding in database\n');

  const { data: oldBrand } = await supabase
    .from('email_templates')
    .select('slug')
    .like('html_body', '%FF6A00%');

  const { data: goodBrand } = await supabase
    .from('email_templates')
    .select('slug')
    .like('html_body', '%D97706%');

  if (oldBrand?.length > 0) {
    console.log(`  ❌ Found ${oldBrand.length} templates with OLD branding (#FF6A00):`);
    oldBrand.forEach(t => console.log(`     - ${t.slug}`));
    console.log('     → Run migration 023 to fix branding\n');
  } else {
    console.log('  ✅ No templates with old #FF6A00 branding');
  }
  console.log(`  ✅ ${goodBrand?.length || 0} templates with correct #D97706 amber branding\n`);

  // ── Step 2: Ensure test user is not suppressed ─────────────────────────────
  console.log('📋 Step 2: Ensure test email is not suppressed\n');

  await supabase.from('suppression_list')
    .delete()
    .eq('contact', TEST_EMAIL)
    .eq('contact_type', 'email');
  console.log(`  ✅ Cleared suppression list for ${TEST_EMAIL}\n`);

  // ── Step 3: Load templates from DB ─────────────────────────────────────────
  console.log('📋 Step 3: Load email templates from database\n');

  const { data: dbTemplates, error: tmplErr } = await supabase
    .from('email_templates')
    .select('id, slug, subject, html_body, is_active, category')
    .eq('is_active', true);

  if (tmplErr || !dbTemplates?.length) {
    console.error('  ❌ Failed to load templates:', tmplErr?.message);
    process.exit(1);
  }

  const templateMap = {};
  for (const t of dbTemplates) {
    templateMap[t.slug] = t;
  }
  console.log(`  ✅ Loaded ${dbTemplates.length} active templates\n`);

  // ── Step 4: Get or create a test user for recipient_id ─────────────────────
  console.log('📋 Step 4: Resolve test user profile\n');

  let { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', TEST_EMAIL)
    .maybeSingle();

  const recipientId = profile?.id || null;
  console.log(recipientId
    ? `  ✅ Found profile for ${TEST_EMAIL}: ${recipientId}\n`
    : `  ⚠️  No profile found for ${TEST_EMAIL} — sending without recipient_id\n`
  );

  // ── Step 5: Send each template ─────────────────────────────────────────────
  const templatesToSend = slugFilter
    ? TEMPLATES.filter(t => t.slug === slugFilter)
    : TEMPLATES;

  if (slugFilter && templatesToSend.length === 0) {
    console.error(`  ❌ No template found with slug "${slugFilter}"`);
    console.log('  Available slugs:', TEMPLATES.map(t => t.slug).join(', '));
    process.exit(1);
  }

  console.log(`📋 Step 5: Sending ${templatesToSend.length} email(s) to ${TEST_EMAIL}\n`);

  for (const tmplDef of templatesToSend) {
    const dbTmpl = templateMap[tmplDef.slug];
    if (!dbTmpl) {
      console.log(`  ⏭️  ${tmplDef.label} — template "${tmplDef.slug}" not in DB, skipping`);
      skipped++;
      continue;
    }

    // Render
    const rendered = renderTemplate(dbTmpl.html_body, dbTmpl.subject, tmplDef.variables);

    // Send
    try {
      const result = await sendViaEdgeFunction(
        TEST_EMAIL,
        `[TEST] ${rendered.subject}`,
        rendered.html,
        tmplDef.slug,
        recipientId,
        dbTmpl.id,
      );

      if (result.sent || result.messageId) {
        console.log(`  ✅ ${tmplDef.label}`);
        console.log(`     Subject: ${rendered.subject}`);
        if (result.messageId) console.log(`     Message ID: ${result.messageId}`);
        sent++;
      } else {
        console.log(`  ❌ ${tmplDef.label}`);
        console.log(`     Reason: ${result.reason || result.error || JSON.stringify(result)}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ ${tmplDef.label}`);
      console.log(`     Error: ${err.message}`);
      failed++;
    }

    // Small delay between emails to avoid rate limits
    await sleep(1500);
  }

  // ── Step 6: Verify email_logs ──────────────────────────────────────────────
  console.log('\n📋 Step 6: Verify email_logs in database\n');
  await sleep(2000); // Wait for async logging

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: logs } = await supabase
    .from('email_logs')
    .select('event_type, status, recipient_email, resend_message_id, created_at')
    .eq('recipient_email', TEST_EMAIL)
    .gte('created_at', fiveMinAgo)
    .order('created_at', { ascending: true });

  if (logs?.length) {
    console.log(`  ✅ Found ${logs.length} email log entries:`);
    const statusCounts = {};
    for (const log of logs) {
      statusCounts[log.status] = (statusCounts[log.status] || 0) + 1;
    }
    for (const [status, count] of Object.entries(statusCounts)) {
      const icon = status === 'sent' ? '📨' : status === 'delivered' ? '✅' : '⚠️';
      console.log(`     ${icon} ${status}: ${count}`);
    }
  } else {
    console.log('  ⚠️  No email logs found (may still be processing)');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${sent} sent, ${failed} failed, ${skipped} skipped`.padEnd(63) + '║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  📬 Check inbox: ${TEST_EMAIL}`.padEnd(63) + '║');
  console.log('║  Look for subjects prefixed with [TEST]'.padEnd(63) + '║');
  console.log('║  Verify:'.padEnd(63) + '║');
  console.log('║    • Amber header (#D97706) — not orange'.padEnd(63) + '║');
  console.log('║    • "BazaarX" branding in header'.padEnd(63) + '║');
  console.log('║    • Variables rendered (no {{placeholders}})'.padEnd(63) + '║');
  console.log('║    • CTA buttons are amber with white text'.padEnd(63) + '║');
  console.log('║    • Footer shows © 2026 BazaarX'.padEnd(63) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
