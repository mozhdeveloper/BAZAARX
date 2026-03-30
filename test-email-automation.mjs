/**
 * End-to-end test: Email Automation & Compliance
 *
 * Tests the full email compliance pipeline:
 *   1. Transactional email dispatch (happy path)
 *   2. Marketing email — consent required
 *   3. Marketing email — consent granted → sends
 *   4. Marketing email — suppression list blocks
 *   5. Marketing email — frequency cap (3/week)
 *   6. Invalid email format rejection
 *   7. Template approval check
 *   8. Unsubscribe endpoint → revokes consent
 *   9. Webhook: hard bounce → suppression
 *  10. Webhook: soft bounce → bounce_logs
 *  11. Webhook: spam complaint → suppression
 *  12. Email events tracking (delivered / opened / clicked)
 *  13. Consent log immutability audit trail
 *
 * Prerequisites:
 *   - Migration 024 applied
 *   - send-email, email-webhook, unsubscribe functions deployed
 *   - RESEND_API_KEY configured
 *   - At least 1 buyer profile exists
 *
 * Run with:
 *   node test-email-automation.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

let passed = 0;
let failed = 0;
const cleanup = [];  // ids/actions to clean up at the end

function test(name, ok, detail = '') {
  if (ok) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

/** Invoke send-email edge function */
async function invokeSendEmail(body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

/** Invoke email-webhook edge function */
async function invokeWebhook(eventBody) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/email-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(eventBody),
  });
  const data = await res.json();
  return { status: res.status, data };
}

/** Small delay */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Email Automation & Compliance — End-to-End Test Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── Prerequisites: find a test buyer ──────────────────────────────────
  console.log('── Prerequisites ──');
  const { data: buyerRow } = await supabase
    .from('buyers')
    .select('id')
    .limit(1)
    .single();

  if (!buyerRow) {
    console.log('❌ No buyer found in DB — cannot run tests.');
    return;
  }

  const testUserId = buyerRow.id;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('id', testUserId)
    .single();

  const testEmail = profile?.email || `testbuyer_${Date.now()}@bazaar.ph`;
  const testName = profile ? `${profile.first_name} ${profile.last_name}` : 'Test Buyer';
  console.log(`  👤 Test user: ${testName} (${testUserId.slice(0, 8)}...)`);
  console.log(`  📧 Email: ${testEmail}\n`);

  // Snapshot initial counts
  const { count: initialLogCount } = await supabase
    .from('email_logs')
    .select('*', { count: 'exact', head: true });
  console.log(`  📊 Initial email_logs count: ${initialLogCount}\n`);

  // =====================================================================
  // TEST 1: Transactional email (happy path)
  // =====================================================================
  console.log('── Test 1: Transactional Email (Happy Path) ──');
  const tx1 = await invokeSendEmail({
    to: testEmail,
    subject: '[TEST] Order Confirmed #12345',
    html: '<html><body><h1>Order Confirmed</h1><p>Your order #12345 has been confirmed.</p></body></html>',
    event_type: 'order_confirmed',
    category: 'transactional',
    recipient_id: testUserId,
    metadata: { test: true, order_id: 'test-12345' },
  });
  test('Transactional email accepted', tx1.status === 200);
  test('Response indicates sent=true', tx1.data?.sent === true, JSON.stringify(tx1.data));
  if (tx1.data?.message_id) {
    console.log(`  📨 Resend message ID: ${tx1.data.message_id}`);
  }

  await sleep(1500);

  // Verify log was created
  const { data: txLog } = await supabase
    .from('email_logs')
    .select('*')
    .eq('event_type', 'order_confirmed')
    .eq('recipient_id', testUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  test('Email log created', !!txLog);
  test('Log category = transactional', txLog?.category === 'transactional', txLog?.category);
  test('Log status = sent', txLog?.status === 'sent', txLog?.status);
  test('Log has queued_at timestamp', !!txLog?.queued_at);

  // =====================================================================
  // TEST 2: Marketing email — no consent (should be blocked)
  // =====================================================================
  console.log('\n── Test 2: Marketing Email — No Consent ──');

  // Ensure consent is explicitly false
  await supabase
    .from('user_consent')
    .upsert({
      user_id: testUserId,
      channel: 'email',
      is_consented: false,
      consent_source: 'admin',
    }, { onConflict: 'user_id,channel' });

  const mkt1 = await invokeSendEmail({
    to: testEmail,
    subject: '[TEST] Weekly Deals Newsletter',
    html: '<html><body><h1>This Week\'s Deals</h1></body></html>',
    event_type: 'marketing_weekly_deals',
    category: 'marketing',
    recipient_id: testUserId,
  });

  test('Marketing blocked (no consent)', mkt1.data?.sent === false);
  test('Reason mentions consent/opt-in', (mkt1.data?.reason || '').toLowerCase().includes('opt'), mkt1.data?.reason);

  await sleep(1000);

  // Verify log has no_consent status
  const { data: noConsentLog } = await supabase
    .from('email_logs')
    .select('status')
    .eq('event_type', 'marketing_weekly_deals')
    .eq('recipient_id', testUserId)
    .eq('status', 'no_consent')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  test('Email log status = no_consent', noConsentLog?.status === 'no_consent', noConsentLog?.status);

  // =====================================================================
  // TEST 3: Marketing email — consent granted → should send
  // =====================================================================
  console.log('\n── Test 3: Marketing Email — With Consent ──');

  // Grant consent
  await supabase
    .from('user_consent')
    .upsert({
      user_id: testUserId,
      channel: 'email',
      is_consented: true,
      consent_source: 'settings',
      consented_at: new Date().toISOString(),
    }, { onConflict: 'user_id,channel' });

  // Also insert consent log
  await supabase.from('consent_log').insert({
    user_id: testUserId,
    channel: 'email',
    action: 'opt_in',
    source: 'settings',
  });

  const mkt2 = await invokeSendEmail({
    to: testEmail,
    subject: '[TEST] Welcome Promo — BazaarX',
    html: '<html><body><h1>Welcome Promo!</h1><p>10% off your first order.</p></body></html>',
    event_type: 'marketing_welcome_promo',
    category: 'marketing',
    recipient_id: testUserId,
  });

  // Note: This might be queued if we're in quiet hours (21:00–08:00 PHT)
  const phtHour = (new Date().getUTCHours() + 8) % 24;
  const inQuietHours = phtHour >= 21 || phtHour < 8;

  if (inQuietHours) {
    console.log(`  ⏰ Current PHT hour: ${phtHour} — quiet hours active`);
    test('Marketing email queued (quiet hours)', mkt2.data?.sent === false);
    test('Reason mentions deferred', (mkt2.data?.reason || '').toLowerCase().includes('deferred'), mkt2.data?.reason);
  } else {
    console.log(`  ⏰ Current PHT hour: ${phtHour} — within send window`);
    test('Marketing email sent', mkt2.data?.sent === true, JSON.stringify(mkt2.data));
    if (mkt2.data?.message_id) {
      console.log(`  📨 Resend message ID: ${mkt2.data.message_id}`);
    }
  }

  // =====================================================================
  // TEST 4: Suppression list blocks all categories
  // =====================================================================
  console.log('\n── Test 4: Suppression List Blocks Emails ──');

  const suppressedEmail = `suppressed_test_${Date.now()}@example.com`;

  // Add to suppression list
  await supabase.from('suppression_list').insert({
    contact: suppressedEmail,
    contact_type: 'email',
    reason: 'hard_bounce',
  });
  cleanup.push({ table: 'suppression_list', field: 'contact', value: suppressedEmail });

  const sup1 = await invokeSendEmail({
    to: suppressedEmail,
    subject: '[TEST] Suppressed email test',
    html: '<html><body><p>This should not go through</p></body></html>',
    event_type: 'test_suppression',
    category: 'transactional',
  });

  test('Suppressed email blocked', sup1.data?.sent === false);
  test('Reason mentions suppressed', (sup1.data?.reason || '').toLowerCase().includes('suppress'), sup1.data?.reason);

  // =====================================================================
  // TEST 5: Marketing frequency cap (3/week)
  // =====================================================================
  console.log('\n── Test 5: Marketing Frequency Cap (3/week) ──');

  // Insert 3 fake "sent" marketing logs for this user in the last 7 days
  const fakeLogIds = [];
  for (let i = 0; i < 3; i++) {
    const { data: fakeLog } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: testEmail,
        recipient_id: testUserId,
        event_type: `marketing_test_freq_${i}`,
        subject: `[FREQ TEST] Email ${i + 1}`,
        status: 'sent',
        category: 'marketing',
        queued_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        sent_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();
    if (fakeLog) fakeLogIds.push(fakeLog.id);
  }
  cleanup.push({ table: 'email_logs', ids: fakeLogIds });

  const freq = await invokeSendEmail({
    to: testEmail,
    subject: '[TEST] 4th marketing email this week',
    html: '<html><body><p>Should be blocked by frequency cap</p></body></html>',
    event_type: 'marketing_freq_test_4',
    category: 'marketing',
    recipient_id: testUserId,
  });

  if (!inQuietHours) {
    test('Frequency cap blocks 4th email', freq.data?.sent === false);
    test('Reason mentions frequency/limit', (freq.data?.reason || '').toLowerCase().includes('limit'), freq.data?.reason);
  } else {
    // During quiet hours, the deferred/queued check kicks in first
    test('Marketing deferred (quiet hours — freq test skipped)', freq.data?.sent === false);
    console.log('  ⚠️  Frequency cap test deferred due to quiet hours — re-run during 08:00–21:00 PHT');
  }

  // =====================================================================
  // TEST 6: Invalid email format
  // =====================================================================
  console.log('\n── Test 6: Invalid Email Format ──');

  const inv1 = await invokeSendEmail({
    to: 'not-an-email',
    subject: '[TEST] Invalid email',
    html: '<html><body><p>Bad email</p></body></html>',
    event_type: 'test_invalid_email',
    category: 'transactional',
  });

  test('Invalid email rejected', inv1.data?.sent === false);
  test('Reason mentions invalid', (inv1.data?.reason || '').toLowerCase().includes('invalid'), inv1.data?.reason);

  // =====================================================================
  // TEST 7: Template approval check
  // =====================================================================
  console.log('\n── Test 7: Template Approval Check ──');

  // Create a draft (unapproved) template
  const { data: draftTemplate } = await supabase
    .from('email_templates')
    .insert({
      name: 'Test Draft Template',
      slug: 'test-draft-template-' + Date.now(),
      subject: '[DRAFT] Test Template',
      html_body: '<html><body><p>Draft</p></body></html>',
      category: 'transactional',
      is_active: true,
      approval_status: 'draft',
      version: 1,
    })
    .select('id')
    .single();

  if (draftTemplate) {
    cleanup.push({ table: 'email_templates', ids: [draftTemplate.id] });

    const tmpl = await invokeSendEmail({
      to: testEmail,
      subject: '[TEST] Unapproved template test',
      html: '<html><body><p>Unapproved template</p></body></html>',
      event_type: 'test_template_approval',
      category: 'transactional',
      recipient_id: testUserId,
      template_id: draftTemplate.id,
    });

    test('Unapproved template rejected', tmpl.status === 400 || tmpl.data?.sent === false);
    test('Error mentions not approved', (tmpl.data?.error || '').toLowerCase().includes('not approved'), tmpl.data?.error);
  } else {
    test('Could create draft template', false, 'Insert failed');
  }

  // =====================================================================
  // TEST 8: Unsubscribe endpoint
  // =====================================================================
  console.log('\n── Test 8: Unsubscribe Endpoint ──');

  // Ensure user has consent before testing unsubscribe
  await supabase.from('user_consent').upsert({
    user_id: testUserId,
    channel: 'email',
    is_consented: true,
    consent_source: 'settings',
    consented_at: new Date().toISOString(),
  }, { onConflict: 'user_id,channel' });

  // Call the unsubscribe endpoint
  const unsubRes = await fetch(
    `${SUPABASE_URL}/functions/v1/unsubscribe?uid=${testUserId}&ch=email`,
    {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${SERVICE_KEY}` },
    },
  );

  test('Unsubscribe returns 200', unsubRes.status === 200);
  const unsubHtml = await unsubRes.text();
  test('Unsubscribe returns HTML confirmation', unsubHtml.includes('Successfully Unsubscribed'));

  await sleep(1000);

  // Verify consent was revoked
  const { data: consentAfter } = await supabase
    .from('user_consent')
    .select('is_consented, revoked_at')
    .eq('user_id', testUserId)
    .eq('channel', 'email')
    .maybeSingle();

  test('Consent revoked (is_consented=false)', consentAfter?.is_consented === false);
  test('revoked_at is set', !!consentAfter?.revoked_at);

  // Verify consent_log has opt_out entry
  const { data: unsubLog } = await supabase
    .from('consent_log')
    .select('*')
    .eq('user_id', testUserId)
    .eq('channel', 'email')
    .eq('action', 'opt_out')
    .eq('source', 'email_link')
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  test('Consent log has opt_out entry', !!unsubLog);
  test('Consent log source = email_link', unsubLog?.source === 'email_link', unsubLog?.source);

  // =====================================================================
  // TEST 9: Webhook — Hard Bounce → Suppression
  // =====================================================================
  console.log('\n── Test 9: Webhook — Hard Bounce → Suppression ──');

  const bouncedEmail = `hardbounce_test_${Date.now()}@nonexistent.example`;
  const fakeMessageId = `test_msg_hard_${Date.now()}`;

  const hardBounceEvent = {
    type: 'email.bounced',
    created_at: new Date().toISOString(),
    data: {
      email_id: fakeMessageId,
      to: [bouncedEmail],
      bounce: { message: '550 5.1.1 User does not exist' },
    },
  };

  const hb = await invokeWebhook(hardBounceEvent);
  test('Webhook returns 200', hb.status === 200);
  test('Webhook received event', hb.data?.received === true);

  await sleep(1500);

  // Check bounce_logs
  const { data: bounceLog } = await supabase
    .from('bounce_logs')
    .select('*')
    .eq('email', bouncedEmail)
    .eq('bounce_type', 'hard')
    .maybeSingle();
  test('Bounce log created (type=hard)', !!bounceLog);
  cleanup.push({ table: 'bounce_logs', field: 'email', value: bouncedEmail });

  // Check suppression_list
  const { data: hardSup } = await supabase
    .from('suppression_list')
    .select('*')
    .eq('contact', bouncedEmail)
    .eq('contact_type', 'email')
    .maybeSingle();
  test('Hard bounce → added to suppression_list', !!hardSup);
  test('Suppression reason = hard_bounce', hardSup?.reason === 'hard_bounce', hardSup?.reason);
  cleanup.push({ table: 'suppression_list', field: 'contact', value: bouncedEmail });

  // =====================================================================
  // TEST 10: Webhook — Soft Bounce → bounce_logs (no suppression unless 3×)
  // =====================================================================
  console.log('\n── Test 10: Webhook — Soft Bounce ──');

  const softBounceEmail = `softbounce_test_${Date.now()}@example.com`;

  const softBounceEvent = {
    type: 'email.bounced',
    created_at: new Date().toISOString(),
    data: {
      email_id: `test_msg_soft_${Date.now()}`,
      to: [softBounceEmail],
      bounce: { message: 'Mailbox temporarily unavailable' },
    },
  };

  const sb = await invokeWebhook(softBounceEvent);
  test('Soft bounce webhook returns 200', sb.status === 200);

  await sleep(1000);

  const { data: softLog } = await supabase
    .from('bounce_logs')
    .select('*')
    .eq('email', softBounceEmail)
    .eq('bounce_type', 'soft')
    .maybeSingle();
  test('Bounce log created (type=soft)', !!softLog);
  cleanup.push({ table: 'bounce_logs', field: 'email', value: softBounceEmail });

  // Soft bounce should NOT yet be in suppression_list (only 1 bounce)
  const { data: noSup } = await supabase
    .from('suppression_list')
    .select('id')
    .eq('contact', softBounceEmail)
    .eq('contact_type', 'email')
    .maybeSingle();
  test('1 soft bounce does NOT suppress', !noSup);

  // =====================================================================
  // TEST 11: Webhook — Spam Complaint → Suppression
  // =====================================================================
  console.log('\n── Test 11: Webhook — Spam Complaint → Suppression ──');

  const complaintEmail = `complaint_test_${Date.now()}@example.com`;

  const complaintEvent = {
    type: 'email.complained',
    created_at: new Date().toISOString(),
    data: {
      email_id: `test_msg_complaint_${Date.now()}`,
      to: [complaintEmail],
    },
  };

  const comp = await invokeWebhook(complaintEvent);
  test('Complaint webhook returns 200', comp.status === 200);

  await sleep(1000);

  const { data: compSup } = await supabase
    .from('suppression_list')
    .select('*')
    .eq('contact', complaintEmail)
    .eq('contact_type', 'email')
    .maybeSingle();
  test('Spam complaint → added to suppression_list', !!compSup);
  test('Suppression reason = spam_complaint', compSup?.reason === 'spam_complaint', compSup?.reason);
  cleanup.push({ table: 'suppression_list', field: 'contact', value: complaintEmail });

  // =====================================================================
  // TEST 12: Webhook — Delivered / Opened / Clicked → email_events
  // =====================================================================
  console.log('\n── Test 12: Email Events Tracking ──');

  const trackMsgId = `test_track_${Date.now()}`;

  // Delivered event
  const del = await invokeWebhook({
    type: 'email.delivered',
    created_at: new Date().toISOString(),
    data: { email_id: trackMsgId, to: [testEmail] },
  });
  test('Delivered webhook returns 200', del.status === 200);

  await sleep(500);

  // Opened event
  const opn = await invokeWebhook({
    type: 'email.opened',
    created_at: new Date().toISOString(),
    data: { email_id: trackMsgId, to: [testEmail] },
  });
  test('Opened webhook returns 200', opn.status === 200);

  await sleep(500);

  // Clicked event
  const clk = await invokeWebhook({
    type: 'email.clicked',
    created_at: new Date().toISOString(),
    data: { email_id: trackMsgId, to: [testEmail], click: { url: 'https://bazaar.ph/products' } },
  });
  test('Clicked webhook returns 200', clk.status === 200);

  await sleep(1000);

  // Check email_events table
  const { data: events } = await supabase
    .from('email_events')
    .select('event_type')
    .eq('resend_message_id', trackMsgId)
    .order('occurred_at', { ascending: true });

  const eventTypes = (events || []).map(e => e.event_type);
  test('Delivered event recorded', eventTypes.includes('delivered'));
  test('Opened event recorded', eventTypes.includes('opened'));
  test('Clicked event recorded', eventTypes.includes('clicked'));
  console.log(`  📊 Events recorded: ${eventTypes.join(', ')}`);

  cleanup.push({ table: 'email_events', field: 'resend_message_id', value: trackMsgId });

  // =====================================================================
  // TEST 13: Consent Log Audit Trail
  // =====================================================================
  console.log('\n── Test 13: Consent Log Audit Trail ──');

  const { data: consentLogs } = await supabase
    .from('consent_log')
    .select('action, source, channel, logged_at')
    .eq('user_id', testUserId)
    .eq('channel', 'email')
    .order('logged_at', { ascending: false })
    .limit(5);

  test('Consent log has entries', consentLogs && consentLogs.length > 0, `Count: ${consentLogs?.length}`);

  if (consentLogs && consentLogs.length > 0) {
    console.log('  📋 Recent consent log entries:');
    for (const log of consentLogs) {
      console.log(`     ${log.action} via ${log.source} @ ${log.logged_at}`);
    }
  }

  // =====================================================================
  // TEST 14: Required fields validation
  // =====================================================================
  console.log('\n── Test 14: Required Fields Validation ──');

  const missingFields = await invokeSendEmail({
    to: testEmail,
    subject: '',
    html: '',
    event_type: '',
  });
  test('Empty fields rejected', missingFields.status === 400 || missingFields.data?.error);

  const noTo = await invokeSendEmail({
    subject: 'test',
    html: '<p>test</p>',
    event_type: 'test',
  });
  test('Missing "to" rejected', noTo.status === 400 || noTo.data?.error);

  // =====================================================================
  // TEST 15: Invalid category rejected
  // =====================================================================
  console.log('\n── Test 15: Invalid Category ──');

  const badCat = await invokeSendEmail({
    to: testEmail,
    subject: '[TEST] Bad category',
    html: '<html><body>test</body></html>',
    event_type: 'test_bad_category',
    category: 'promotional',  // invalid
  });
  test('Invalid category rejected', badCat.status === 400);
  test('Error mentions category', (badCat.data?.error || '').toLowerCase().includes('category'), badCat.data?.error);

  // =====================================================================
  // Cleanup
  // =====================================================================
  console.log('\n── Cleanup ──');

  // Delete test data in reverse order
  for (const item of cleanup) {
    if (item.ids && item.ids.length > 0) {
      await supabase.from(item.table).delete().in('id', item.ids);
    } else if (item.field && item.value) {
      await supabase.from(item.table).delete().eq(item.field, item.value);
    }
    console.log(`  🧹 Cleaned ${item.table}`);
  }

  // Remove fake frequency logs
  await supabase
    .from('email_logs')
    .delete()
    .like('event_type', 'marketing_test_freq_%')
    .eq('recipient_id', testUserId);
  console.log('  🧹 Cleaned frequency test logs');

  // Remove test email logs
  await supabase
    .from('email_logs')
    .delete()
    .eq('recipient_id', testUserId)
    .like('subject', '[TEST]%');
  console.log('  🧹 Cleaned test email logs');

  // Restore user consent to original state (opted-out, which is the DPA default)
  await supabase.from('user_consent').upsert({
    user_id: testUserId,
    channel: 'email',
    is_consented: false,
    consent_source: 'admin',
  }, { onConflict: 'user_id,channel' });
  console.log('  🧹 Reset user consent to default (opted-out)');

  // =====================================================================
  // Summary
  // =====================================================================
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('═══════════════════════════════════════════════════════════');

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Review output above for details.');
  } else {
    console.log('\n🎉 All tests passed! Email compliance pipeline is operational.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
