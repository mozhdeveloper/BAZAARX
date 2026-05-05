/**
 * One-shot script: adds the messages table to the supabase_realtime publication.
 * Run once, then delete this file.
 *   node scripts/apply-messages-realtime.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Use the Management API via a direct HTTPS call — pg_dump ALTER PUBLICATION
// cannot be executed via the Supabase JS client's .rpc() because that runs in
// user context.  We call the Supabase SQL endpoint (REST) with the service key.

console.log('Applying migration: ALTER PUBLICATION supabase_realtime ADD TABLE public.messages ...');

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY,
  },
  body: JSON.stringify({
    sql: `
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;`,
  }),
});

if (!res.ok) {
  const body = await res.text();
  // exec_sql RPC likely doesn't exist — fall back to checking manually
  console.log(`RPC not available (${res.status}): ${body.slice(0, 200)}`);
  console.log('\n⚠️  Please run the following SQL in Supabase Dashboard → SQL Editor:');
  console.log('');
  console.log(`DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;`);
  console.log('');
  console.log('Or go to: Dashboard → Database → Replication → Source → toggle "messages" ON');
  process.exit(0);
} else {
  console.log('✅ Migration applied successfully.');
  console.log('   The messages table is now part of the supabase_realtime publication.');
}
