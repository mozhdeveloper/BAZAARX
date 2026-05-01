import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://ijdpbfrcvdflzwytxncj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY'
);

async function main() {
  const now = new Date().toISOString();

  // 1. Active flash sale slots
  const { data: slots } = await sb
    .from('global_flash_sale_slots')
    .select('id,name,end_time')
    .eq('status', 'active')
    .lte('start_time', now)
    .gte('end_time', now);

  console.log('Active slots:', slots?.length ?? 0);
  if (!slots?.length) { console.log('No active slots'); process.exit(0); }

  const slotIds = slots.map(s => s.id);

  // 2. Approved submissions with product data
  const { data: subs } = await sb
    .from('flash_sale_submissions')
    .select('id,slot_id,submitted_price,submitted_stock,status,product:products(id,name,price)')
    .in('slot_id', slotIds)
    .eq('status', 'approved');

  console.log('\n=== Flash Sale Submissions ===');
  const productIds = [];
  for (const s of (subs || [])) {
    const p = s.product;
    const submitted = Number(s.submitted_price);
    const dbPrice = Number(p?.price);
    const discPct = dbPrice > 0 ? Math.round((1 - submitted / dbPrice) * 100) : 0;
    // Web re-derives discountedPrice from discountPct (rounding issue):
    const webCalcPrice = Math.round(dbPrice * (1 - discPct / 100));
    console.log(
      `  "${p?.name}" | products.price=${dbPrice} | submitted_price=${submitted}` +
      ` | discPct=${discPct}% | web_recalc=${webCalcPrice} | MATCH=${webCalcPrice === submitted}`
    );
    if (p?.id) productIds.push(p.id);
  }

  // 3. Also check campaign discounts on same products
  console.log('\n=== Campaign Discounts on Same Products (discount_campaigns) ===');
  const { data: pdList } = await sb
    .from('product_discounts')
    .select('product_id, campaign:discount_campaigns(id,name,discount_type,discount_value,max_discount_amount,starts_at,ends_at,status)')
    .in('product_id', productIds);

  const now2 = new Date();
  for (const pd of (pdList || [])) {
    const c = pd.campaign;
    const active = c && new Date(c.starts_at) <= now2 && new Date(c.ends_at) >= now2 && c.status === 'active';
    const sub = (subs || []).find(s => s.product?.id === pd.product_id);
    const pname = sub?.product?.name;
    const dbPrice = Number(sub?.product?.price ?? 0);
    let campaignPrice = dbPrice;
    if (c?.discount_type === 'percentage') campaignPrice = Math.round(dbPrice * (1 - Number(c.discount_value) / 100));
    if (c?.discount_type === 'fixed_amount') campaignPrice = Math.max(0, dbPrice - Number(c.discount_value));
    console.log(
      `  "${pname}" | campaign="${c?.name}" type=${c?.discount_type} val=${c?.discount_value}` +
      ` max=${c?.max_discount_amount} active=${active} | campaign_price=${active ? campaignPrice : 'N/A (inactive)'}`
    );
  }

  // 4. RPC results (used by PDP when navigating directly, not from flash sale page)
  console.log('\n=== RPC get_active_product_discount (used by PDP standalone visit) ===');
  for (const pid of productIds.slice(0, 8)) {
    const { data } = await sb.rpc('get_active_product_discount', { p_product_id: pid });
    const sub = (subs || []).find(s => s.product?.id === pid);
    const dbPrice = Number(sub?.product?.price ?? 0);
    const submitted = Number(sub?.submitted_price ?? 0);
    if (data?.length) {
      const d = data[0];
      const dType = d.discount_type;
      const dVal = Number(d.discount_value);
      let rpcPrice = dbPrice;
      if (dType === 'percentage') rpcPrice = Math.round(dbPrice * (1 - dVal / 100));
      if (dType === 'fixed_amount') rpcPrice = Math.max(0, dbPrice - dVal);
      console.log(
        `  "${sub?.product?.name}" | RPC: ${dType} ${dVal}% → price=${rpcPrice}` +
        ` | flash_submitted=${submitted} | SAME=${rpcPrice === submitted} | CONFLICT=${rpcPrice !== submitted}`
      );
    } else {
      console.log(`  "${sub?.product?.name}" | RPC: no campaign discount`);
    }
  }

  // 5. Summary: detect conflicts
  console.log('\n=== CONFLICT SUMMARY ===');
  let conflicts = 0;
  for (const s of (subs || [])) {
    const pid = s.product?.id;
    if (!pid) continue;
    const { data } = await sb.rpc('get_active_product_discount', { p_product_id: pid });
    const submitted = Number(s.submitted_price);
    if (data?.length) {
      const d = data[0];
      const dbPrice = Number(s.product?.price ?? 0);
      let rpcPrice = dbPrice;
      if (d.discount_type === 'percentage') rpcPrice = Math.round(dbPrice * (1 - Number(d.discount_value) / 100));
      if (d.discount_type === 'fixed_amount') rpcPrice = Math.max(0, dbPrice - Number(d.discount_value));
      if (rpcPrice !== submitted) {
        console.log(`  CONFLICT: "${s.product?.name}" flash_price=${submitted} vs campaign_price=${rpcPrice} (diff=${Math.abs(rpcPrice - submitted)})`);
        conflicts++;
      }
    }
  }
  if (conflicts === 0) console.log('  No conflicts — both systems agree on price for all flash sale products.');
  else console.log(`  Total conflicts: ${conflicts}`);
}

main().catch(err => { console.error(err); process.exit(1); });
