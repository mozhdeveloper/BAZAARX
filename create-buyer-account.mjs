/**
 * Creates a complete buyer account for jcuady@gmail.com in Supabase.
 * Covers: auth user, profile, buyer record, cart, user_consent (all channels),
 * and a default Manila shipping address.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = 'jcuady@gmail.com';
const PASSWORD = 'BazaarX2026!';
const FIRST_NAME = 'JC';
const LAST_NAME = 'Uad';
const PHONE = '+639171234567';
const now = new Date().toISOString();

async function run() {
  console.log('🔍 Checking if auth user already exists...');

  // 1. Check for existing auth user
  const { data: { users }, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw new Error('Failed to list users: ' + listErr.message);

  let userId = users.find(u => u.email === EMAIL)?.id;

  if (userId) {
    console.log(`✅ Auth user already exists: ${userId}`);
  } else {
    console.log('📧 Creating auth user...');
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: FIRST_NAME, last_name: LAST_NAME },
    });
    if (createErr) throw new Error('Failed to create auth user: ' + createErr.message);
    userId = created.user.id;
    console.log(`✅ Auth user created: ${userId}`);
  }

  // 2. Upsert profile
  console.log('👤 Upserting profile...');
  const { error: profileErr } = await sb.from('profiles').upsert(
    {
      id: userId,
      email: EMAIL,
      first_name: FIRST_NAME,
      last_name: LAST_NAME,
      phone: PHONE,
      last_login_at: now,
      updated_at: now,
    },
    { onConflict: 'id' }
  );
  if (profileErr) throw new Error('Failed to upsert profile: ' + profileErr.message);
  console.log('✅ Profile ready');

  // 3. Upsert buyer record
  console.log('🛍️  Upserting buyer record...');
  const { error: buyerErr } = await sb.from('buyers').upsert(
    {
      id: userId,
      preferences: {
        language: 'en',
        currency: 'PHP',
        notifications: { email: true, sms: true, push: true },
      },
      bazcoins: 100, // welcome bonus
      updated_at: now,
    },
    { onConflict: 'id' }
  );
  if (buyerErr) throw new Error('Failed to upsert buyer: ' + buyerErr.message);
  console.log('✅ Buyer record ready (100 BazCoins welcome bonus)');

  // 4. Ensure buyer has a cart
  console.log('🛒 Checking cart...');
  const { data: cart } = await sb.from('carts').select('id').eq('buyer_id', userId).maybeSingle();
  if (!cart) {
    const { error: cartErr } = await sb.from('carts').insert({
      buyer_id: userId,
      created_at: now,
      updated_at: now,
    });
    if (cartErr) throw new Error('Failed to create cart: ' + cartErr.message);
    console.log('✅ Cart created');
  } else {
    console.log('✅ Cart already exists:', cart.id);
  }

  // 5. Upsert user_consent for all 3 channels
  console.log('✉️  Setting notification consent...');
  const consentRows = [
    // Transactional emails — always on (order receipts, payment confirmations)
    { user_id: userId, channel: 'email', consent_type: 'transactional', is_consented: true, consent_source: 'signup', consented_at: now },
    // Marketing emails — opt-in at signup
    { user_id: userId, channel: 'email', consent_type: 'marketing', is_consented: true, consent_source: 'signup', consented_at: now },
    // Newsletter
    { user_id: userId, channel: 'email', consent_type: 'newsletter', is_consented: true, consent_source: 'signup', consented_at: now },
    // SMS transactional
    { user_id: userId, channel: 'sms', consent_type: 'transactional', is_consented: true, consent_source: 'signup', consented_at: now },
    // Push
    { user_id: userId, channel: 'push', consent_type: 'transactional', is_consented: true, consent_source: 'signup', consented_at: now },
  ];

  // user_consent has UNIQUE(user_id, channel) — but we have consent_type too, check the actual constraint
  // From schema: UNIQUE(user_id, channel) — so we need one row per channel
  // The consent toggles in BuyerSettingsPage use (channel, consent_type) combos — let's check if table has consent_type column
  // From migration 024: columns are user_id, channel, is_consented, consent_source — NO consent_type column
  // The consent_type concept is handled by the channel itself in this schema
  // Let's insert the 3 core channel rows (email, sms, push) — one per channel

  const coreConsent = [
    { user_id: userId, channel: 'email', is_consented: true, consent_source: 'signup', consented_at: now, updated_at: now },
    { user_id: userId, channel: 'sms', is_consented: true, consent_source: 'signup', consented_at: now, updated_at: now },
    { user_id: userId, channel: 'push', is_consented: true, consent_source: 'signup', consented_at: now, updated_at: now },
  ];

  for (const row of coreConsent) {
    const { error: conErr } = await sb.from('user_consent').upsert(row, { onConflict: 'user_id,channel' });
    if (conErr) console.warn(`  ⚠️  Consent upsert warning (${row.channel}):`, conErr.message);
    else console.log(`  ✅ Consent set: ${row.channel} = opted-in`);
  }

  // 6. Create default shipping address
  console.log('📍 Checking shipping address...');
  const { data: existingAddr } = await sb
    .from('shipping_addresses')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  if (!existingAddr) {
    const { error: addrErr } = await sb.from('shipping_addresses').insert({
      user_id: userId,
      label: 'Home',
      first_name: FIRST_NAME,
      last_name: LAST_NAME,
      phone_number: PHONE,
      address_line_1: '123 Test Street',
      barangay: 'Poblacion',
      city: 'Makati',
      province: 'Metro Manila',
      region: 'NCR',
      postal_code: '1210',
      is_default: true,
      address_type: 'residential',
      created_at: now,
      updated_at: now,
    });
    if (addrErr) throw new Error('Failed to create address: ' + addrErr.message);
    console.log('✅ Default shipping address created');
  } else {
    console.log('✅ Default shipping address already exists');
  }

  // 7. Final verification
  console.log('\n📋 Verification:');
  const { data: verify } = await sb
    .from('profiles')
    .select(`
      id, email, first_name, last_name, phone,
      buyers ( bazcoins, preferences ),
      carts ( id ),
      shipping_addresses ( label, city, is_default )
    `)
    .eq('id', userId)
    .single();

  const { data: consent } = await sb.from('user_consent').select('channel, is_consented').eq('user_id', userId);

  console.log('Profile:', verify?.email, verify?.first_name, verify?.last_name);
  console.log('Buyer — BazCoins:', verify?.buyers?.[0]?.bazcoins ?? verify?.buyers?.bazcoins);
  console.log('Cart:', verify?.carts?.[0]?.id ?? verify?.carts?.id ?? 'none');
  console.log('Addresses:', verify?.shipping_addresses?.map(a => `${a.label} (${a.city}${a.is_default ? ', default' : ''})`));
  console.log('Consent:', consent?.map(c => `${c.channel}: ${c.is_consented ? 'opted-in' : 'opted-out'}`));
  console.log('\n🎉 Buyer account complete!');
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   User ID: ${userId}`);
}

run().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
