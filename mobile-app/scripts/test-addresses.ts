/**
 * Test shipping addresses save and load
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function testAddresses() {
  console.log('Testing shipping_addresses table...\n');

  // Check current addresses
  const { data, error } = await supabase
    .from('shipping_addresses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching addresses:', error.message);
    return;
  }

  console.log(`Found ${data?.length || 0} shipping addresses\n`);

  if (data && data.length > 0) {
    data.forEach((addr, i) => {
      console.log(`Address ${i + 1}:`);
      console.log(`  ID: ${addr.id}`);
      console.log(`  Label: ${addr.label}`);
      console.log(`  address_line_1: ${addr.address_line_1}`);
      console.log(`  address_line_2: ${addr.address_line_2 || '(empty)'}`);
      console.log(`  Barangay: ${addr.barangay || '(empty)'}`);
      console.log(`  City: ${addr.city}`);
      console.log(`  Province: ${addr.province}`);
      console.log(`  Region: ${addr.region}`);
      console.log(`  Postal: ${addr.postal_code}`);
      console.log(`  Is Default: ${addr.is_default}`);
      console.log(`  User ID: ${addr.user_id}`);
      console.log('');
    });
  }

  // Test the mapFromDB logic
  console.log('Testing mapFromDB logic...');
  
  const testAddress = data?.[0];
  if (testAddress) {
    const addressLine1 = testAddress.address_line_1 || '';
    const parts = addressLine1.split(', ');
    
    console.log(`\nParsing address_line_1: "${addressLine1}"`);
    console.log(`Parts: ${JSON.stringify(parts)}`);
    
    let firstName = '';
    let lastName = '';
    let phone = '';
    let street = addressLine1;
    
    if (parts.length >= 3) {
      const possiblePhone = parts[1];
      if (/^\d{10,11}$/.test(possiblePhone?.replace(/\D/g, ''))) {
        const nameParts = parts[0].split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
        phone = possiblePhone;
        street = parts.slice(2).join(', ');
      }
    }
    
    console.log(`\nParsed result:`);
    console.log(`  firstName: "${firstName}"`);
    console.log(`  lastName: "${lastName}"`);
    console.log(`  phone: "${phone}"`);
    console.log(`  street: "${street}"`);
  }

  console.log('\n✅ Address test complete!');
}

testAddresses().catch(console.error);
