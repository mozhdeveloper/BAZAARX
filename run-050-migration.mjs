/**
 * Migration runner: 050_fix_order_payments_rls.sql
 * Adds buyer/seller SELECT policies on order_payments table.
 * Run with: node run-050-migration.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  console.log('=== 050: Fix order_payments RLS ===\n');

  const policies = [
    {
      name: 'buyers_can_view_own_order_payments',
      sql: `
        CREATE POLICY "buyers_can_view_own_order_payments"
          ON public.order_payments
          FOR SELECT
          TO authenticated
          USING (
            order_id IN (
              SELECT id FROM public.orders WHERE buyer_id = auth.uid()
            )
          );
      `,
    },
    {
      name: 'sellers_can_view_related_order_payments',
      sql: `
        CREATE POLICY "sellers_can_view_related_order_payments"
          ON public.order_payments
          FOR SELECT
          TO authenticated
          USING (
            order_id IN (
              SELECT DISTINCT oi.order_id
              FROM public.order_items oi
              JOIN public.products p ON p.id = oi.product_id
              WHERE p.seller_id = auth.uid()
            )
          );
      `,
    },
  ];

  for (const policy of policies) {
    // Check if policy exists
    const { data: existing } = await admin
      .from('pg_policies')
      .select('policyname')
      .eq('schemaname', 'public')
      .eq('tablename', 'order_payments')
      .eq('policyname', policy.name)
      .maybeSingle();

    if (existing) {
      console.log(`✅ Policy already exists: ${policy.name}`);
      continue;
    }

    const rpcResult = await admin.rpc('exec_sql', { sql: policy.sql });
    const { error } = rpcResult ?? { error: { message: 'RPC not available' } };
    if (error) {
      // Try direct query via REST (won't work for DDL, but let's try)
      console.log(`ℹ️  Policy ${policy.name}: needs to be applied via Supabase Dashboard SQL editor`);
      console.log(`SQL:\n${policy.sql}`);
    } else {
      console.log(`✅ Created policy: ${policy.name}`);
    }
  }

  // Verify current policies on order_payments
  const { data: currentPolicies, error: pErr } = await admin
    .from('pg_policies')
    .select('policyname, cmd, roles')
    .eq('schemaname', 'public')
    .eq('tablename', 'order_payments');

  if (!pErr) {
    console.log('\nCurrent policies on order_payments:');
    (currentPolicies || []).forEach(p => console.log(` - ${p.policyname} (${p.cmd})`));
    if (!currentPolicies?.length) {
      console.log(' ⚠️  No policies found — table is completely locked to authenticated users');
    }
  }
}

main().catch(console.error);
