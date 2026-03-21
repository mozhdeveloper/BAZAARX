// Schedule process-email-queue to run every 5 minutes via pg_cron + pg_net
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Check if pg_cron and pg_net are available
const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
});

// Try inserting a cron job directly into cron.job table
const { data: existing, error: checkErr } = await sb
  .schema('cron')
  .from('job')
  .select('jobid, jobname, schedule')
  .eq('jobname', 'process-email-queue')
  .maybeSingle();

if (checkErr) {
  console.log('pg_cron not accessible via REST (this is normal — requires SQL Editor).');
  console.log('Error:', checkErr.message);
  console.log('\n⚠️  Manual step required:');
  console.log('Go to Supabase Dashboard → SQL Editor and run:');
  console.log(`
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := '${SUPABASE_URL}/functions/v1/process-email-queue',
    headers := '{"Authorization": "Bearer ${SERVICE_KEY}", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
`);
} else if (existing) {
  console.log('✅ Cron job already scheduled:', existing);
} else {
  console.log('pg_cron is accessible. Would insert job here.');
}
