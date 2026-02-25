/**
 * Test user_roles table for signup
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testRoles() {
  console.log('Testing user_roles table structure...\n');

  // Get a buyer id first
  const { data: buyer } = await supabase.from('buyers').select('id').limit(1).single();
  if (!buyer) { 
    console.log('No buyers found'); 
    process.exit(1); 
  }
  
  console.log('Buyer ID:', buyer.id);
  
  // Check if this buyer has a role
  const { data: role, error: roleErr } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', buyer.id);
  
  console.log('Existing roles for buyer:', role?.length || 0);
  if (roleErr) console.log('Role query error:', roleErr.message);
  
  // Try to insert a test role
  console.log('\nTest insert to user_roles...');
  const { data: newRole, error: insertErr } = await supabase
    .from('user_roles')
    .insert({ user_id: buyer.id, role: 'buyer' })
    .select();
  
  if (insertErr) {
    console.log('Insert error:', insertErr.message);
    console.log('Error code:', insertErr.code);
    
    // Check if it's a duplicate
    if (insertErr.code === '23505') {
      console.log('Role already exists (which is OK)');
    }
  } else {
    console.log('Inserted role:', newRole);
    
    // Clean up test role
    await supabase.from('user_roles').delete().eq('user_id', buyer.id).eq('role', 'buyer');
    console.log('Cleaned up test role');
  }
  
  // Check the profiles table to see user_type (old schema)
  console.log('\n--- Checking profiles for user_type ---');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, user_type')
    .limit(5);
  
  if (profiles) {
    profiles.forEach(p => console.log(`  ${p.email}: user_type = ${p.user_type || 'NULL'}`));
  }
  
  console.log('\n✅ All checks complete');
  process.exit(0);
}

testRoles().catch(e => { console.error(e); process.exit(1); });
