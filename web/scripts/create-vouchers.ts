/**
 * Create Vouchers Script
 * Uses correct column names for vouchers table
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n=== CHECKING VOUCHERS ===\n');

  // Check existing vouchers
  const { data, error } = await supabase.from('vouchers').select('*');
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log(`Found ${data?.length || 0} vouchers:\n`);
  
  data?.forEach(v => {
    console.log(`  Code: ${v.code}`);
    console.log(`  Title: ${v.title}`);
    console.log(`  Type: ${v.voucher_type}`);
    console.log(`  Value: ${v.voucher_type === 'percentage' ? v.value + '%' : '₱' + v.value}`);
    console.log(`  Min Order: ₱${v.min_order_value}`);
    console.log(`  Active: ${v.is_active ? 'Yes' : 'No'}`);
    console.log(`  Claimable: ${v.claimable_from} to ${v.claimable_until}`);
    console.log('');
  });

  // Add SAVE20 if it doesn't exist
  const hasSave20 = data?.some(v => v.code === 'SAVE20');
  if (!hasSave20) {
    console.log('Adding SAVE20 voucher...');
    const { error: insertError } = await supabase.from('vouchers').insert({
      code: 'SAVE20',
      title: 'Save 20% Off',
      description: 'Get 20% off on orders over ₱2000',
      voucher_type: 'percentage',
      value: 20,
      min_order_value: 2000,
      max_discount: 500,
      is_active: true,
      // Use dates that satisfy the constraint
      claimable_from: '2024-01-01T00:00:00.000Z',
      claimable_until: '2025-12-31T23:59:59.000Z',
      usage_limit: 200,
      claim_limit: 1,
      duration: 30,
    });
    console.log(insertError ? `❌ ${insertError.message}` : '✅ SAVE20 created');
  }

  console.log('\n');
}

main();
