import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function fixAddresses() {
  // Get malformed addresses (those starting with ' , ,')
  const { data, error } = await supabase
    .from('shipping_addresses')
    .select('id, address_line_1')
    .like('address_line_1', ' , ,%');
  
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  console.log(`Found ${data?.length || 0} malformed addresses`);
  
  for (const addr of data || []) {
    // Extract just the street part
    const parts = addr.address_line_1.split(', ');
    const street = parts[parts.length - 1] || 'Unknown Address';
    
    console.log(`  Fixing: '${addr.address_line_1}' -> '${street}'`);
    
    const { error: updateError } = await supabase
      .from('shipping_addresses')
      .update({ address_line_1: street })
      .eq('id', addr.id);
    
    if (updateError) {
      console.error(`  Error updating ${addr.id}:`, updateError);
    }
  }
  
  console.log('Done fixing addresses');
}

fixAddresses();
