import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSchema() {
  // Check orders table
  const { data: orders, error: ordersError } = await supabase.from('orders').select('*').limit(1);
  console.log('=== ORDERS TABLE ===');
  if (ordersError) {
    console.log('Error:', ordersError.message);
  } else {
    console.log('Columns:', Object.keys(orders?.[0] || {}));
    console.log('Sample:', JSON.stringify(orders?.[0], null, 2));
  }
}

checkSchema();
