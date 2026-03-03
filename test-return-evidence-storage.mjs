/**
 * Return Evidence Storage — Integration Test
 *
 * Tests the `return-evidence` Supabase Storage bucket created by
 * migration 20260303090000_return_evidence_storage.sql
 *
 * Checks:
 *   1. Bucket exists with correct config (public, 10 MB limit, image mime types)
 *   2. Service-role can upload a file and receive a public URL
 *   3. Public URL is accessible (HTTP 200)
 *   4. Authenticated buyer (anon key + sign-in) can upload to returns/<orderId>/...
 *   5. Authenticated buyer can read the uploaded file
 *   6. Upload outside the returns/ folder is rejected by RLS
 *   7. Unauthenticated upload is rejected
 *   8. Non-image MIME type (text/plain) is rejected by bucket policy
 *   9. Cleanup — all test objects deleted
 *
 * Run with: node test-return-evidence-storage.mjs
 */

import { createClient } from '@supabase/supabase-js';

// ─── Config ──────────────────────────────────────────────────────────────────
const URL         = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';
const ANON_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';
const BUCKET      = 'return-evidence';

const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
const anon  = createClient(URL, ANON_KEY,    { auth: { persistSession: false } });

// ─── Counters & cleanup ───────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const uploadedPaths = []; // track for cleanup

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ok(name, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${name}`); passed++; }
  else       { console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); failed++; }
}

function section(title) {
  console.log(`\n${'─'.repeat(58)}`);
  console.log(`  📦 ${title}`);
  console.log('─'.repeat(58));
}

/** Create a minimal valid JPEG buffer (~35 bytes, enough for MIME detection) */
function fakeJpegBuffer() {
  return Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0xFF, 0xD9,
  ]);
}

/** Attempt an upload and return { data, error } */
async function upload(client, path, buffer, contentType = 'image/jpeg') {
  return client.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
}

// ─── TEST SUITE ───────────────────────────────────────────────────────────────

// ── 1. Bucket metadata ────────────────────────────────────────────────────────
section('1 — Bucket exists & configuration');

const { data: buckets, error: bucketsErr } = await admin.storage.listBuckets();
if (bucketsErr) {
  console.error('  ❌ Could not list buckets:', bucketsErr.message);
  process.exit(1);
}

const bucket = buckets.find(b => b.id === BUCKET);
ok('Bucket exists',             !!bucket,                              `not found in listBuckets()`);
ok('Bucket is public',          bucket?.public === true);
ok('File size limit is 10 MB',  bucket?.file_size_limit === 10485760,  `got ${bucket?.file_size_limit}`);

const mime = bucket?.allowed_mime_types ?? [];
ok('Allows image/jpeg',  mime.includes('image/jpeg'));
ok('Allows image/png',   mime.includes('image/png'));
ok('Allows image/webp',  mime.includes('image/webp'));

// ── 2. Service-role upload + public URL ───────────────────────────────────────
section('2 — Service-role upload & public URL');

const testOrderId   = `test-order-${Date.now()}`;
const adminPath     = `returns/${testOrderId}/admin-test.jpg`;
const { data: adminUpload, error: adminUploadErr } = await upload(admin, adminPath, fakeJpegBuffer());

ok('Service-role upload succeeds', !adminUploadErr, adminUploadErr?.message);
if (!adminUploadErr) uploadedPaths.push(adminPath);

const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(adminPath);
const publicUrl = publicUrlData?.publicUrl;
ok('getPublicUrl returns a URL', typeof publicUrl === 'string' && publicUrl.startsWith('https://'));

if (publicUrl) {
  try {
    const res = await fetch(publicUrl, { method: 'HEAD' });
    ok('Public URL is reachable (HTTP 200)', res.status === 200, `HTTP ${res.status}`);
    const ct = res.headers.get('content-type') ?? '';
    ok('Content-Type is image/*', ct.startsWith('image/'), `got "${ct}"`);
  } catch (e) {
    ok('Public URL is reachable (HTTP 200)', false, e.message);
  }
}

// ── 3. Authenticated buyer upload (RLS) ───────────────────────────────────────
section('3 — Authenticated buyer upload (RLS PASS)');

// Sign in as a real test user or use service-role to create a session
// We'll impersonate via service-role JWT so we can test RLS policies properly
// by signing in with a known test buyer email.
const TEST_EMAIL    = 'testbuyer@bazaartest.dev';
const TEST_PASSWORD = 'TestBuyer123!';

// Ensure user exists (upsert via admin API)
let buyerUserId = null;
try {
  const { data: listData } = await admin.auth.admin.listUsers();
  const existing = listData?.users?.find(u => u.email === TEST_EMAIL);
  if (existing) {
    buyerUserId = existing.id;
  } else {
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email:             TEST_EMAIL,
      password:          TEST_PASSWORD,
      email_confirm:     true,
    });
    if (createErr) throw createErr;
    buyerUserId = newUser.user.id;
  }
  console.log(`  ℹ️  Test buyer: ${TEST_EMAIL} (${buyerUserId})`);
} catch (e) {
  console.log(`  ⚠️  Could not provision test user: ${e.message}`);
  console.log('  ⚠️  Skipping RLS tests that require authenticated sessions.');
}

if (buyerUserId) {
  // Sign in with anon client
  const { data: session, error: signInErr } = await anon.auth.signInWithPassword({
    email:    TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  ok('Buyer can sign in', !signInErr && !!session?.session, signInErr?.message);

  if (session?.session) {
    const buyerPath = `returns/${testOrderId}/buyer-evidence-${Date.now()}.jpg`;
    const { data: buyerUpload, error: buyerUploadErr } = await upload(anon, buyerPath, fakeJpegBuffer());
    ok('Buyer upload inside returns/ succeeds', !buyerUploadErr, buyerUploadErr?.message);
    if (!buyerUploadErr) uploadedPaths.push(buyerPath);

    // ── 4. Read access ──────────────────────────────────────────────────────
    section('4 — Authenticated buyer read access');
    const { data: listObjs, error: listErr } = await anon.storage
      .from(BUCKET)
      .list(`returns/${testOrderId}`);
    ok('Buyer can list objects in own folder', !listErr, listErr?.message);
    ok('Listed folder contains uploads', (listObjs?.length ?? 0) >= 1, `found ${listObjs?.length ?? 0}`);

    // ── 5. RLS — upload OUTSIDE returns/ folder (should fail) ───────────────
    section('5 — RLS: upload outside returns/ folder is rejected');
    const badPath = `arbitrary-folder/${testOrderId}/bad.jpg`;
    const { error: rlsErr } = await upload(anon, badPath, fakeJpegBuffer());
    ok('Upload outside returns/ is rejected by RLS', !!rlsErr, 'expected RLS error, got success');
  }
}

// ── 6. Unauthenticated upload is rejected ─────────────────────────────────────
section('6 — Unauthenticated upload is rejected');
const anonNoAuth = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
const unauthPath = `returns/unauth-${Date.now()}/test.jpg`;
const { error: unauthErr } = await upload(anonNoAuth, unauthPath, fakeJpegBuffer());
ok('Unauthenticated upload is rejected', !!unauthErr, 'expected auth error, got success');

// ── 7. Non-image MIME type rejected ──────────────────────────────────────────
section('7 — Non-image MIME type rejected by bucket policy');
const textPath = `returns/${testOrderId}/should-fail.txt`;
const { error: mimeErr } = await admin.storage.from(BUCKET).upload(
  textPath,
  Buffer.from('hello world'),
  { contentType: 'text/plain', upsert: false }
);
ok('text/plain upload is rejected', !!mimeErr, 'expected mime rejection, got success');

// ── 8. Cleanup ────────────────────────────────────────────────────────────────
section('8 — Cleanup');
if (uploadedPaths.length > 0) {
  const { error: removeErr } = await admin.storage.from(BUCKET).remove(uploadedPaths);
  ok(`Removed ${uploadedPaths.length} test object(s)`, !removeErr, removeErr?.message);
} else {
  console.log('  ℹ️  No objects to clean up.');
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(58)}`);
console.log(`  RESULT: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(58));
if (failed > 0) process.exit(1);
