import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const sb = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY!
);

(async () => {
  // Probe buyer_notifications columns
  const { data: buyerRows } = await sb.from('buyer_notifications').select('*').limit(1);
  console.log('buyer_notifications sample row:', JSON.stringify(buyerRows?.[0] ?? {}, null, 2));

  // Probe seller_notifications columns
  const { data: sellerRows } = await sb.from('seller_notifications').select('*').limit(1);
  console.log('seller_notifications sample row:', JSON.stringify(sellerRows?.[0] ?? {}, null, 2));

  // Probe admin_notifications columns
  const { data: adminRows, error: adminErr } = await sb.from('admin_notifications').select('*').limit(1);
  console.log('admin_notifications sample row:', JSON.stringify(adminRows?.[0] ?? {}, null, 2));
  if (adminErr) console.log('admin_notifications error:', adminErr.message);
})();
