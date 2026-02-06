/**
 * Check database tables for signup flows
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Supabase not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('Checking database tables for signup...\n');
  
  // Check profiles table
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, first_name')
    .limit(3);
  console.log('✓ profiles:', pErr ? `ERROR: ${pErr.message}` : `${profiles?.length} found`);
  if (profiles && profiles.length > 0) {
    profiles.forEach(p => console.log('    -', p.email, '|', p.first_name));
  }
  
  // Check buyers table
  const { data: buyers, error: bErr } = await supabase
    .from('buyers')
    .select('id, bazcoins')
    .limit(3);
  console.log('✓ buyers:', bErr ? `ERROR: ${bErr.message}` : `${buyers?.length} found`);
  
  // Check sellers table
  const { data: sellers, error: sErr } = await supabase
    .from('sellers')
    .select('id, store_name, approval_status')
    .limit(3);
  console.log('✓ sellers:', sErr ? `ERROR: ${sErr.message}` : `${sellers?.length} found`);
  if (sellers && sellers.length > 0) {
    sellers.forEach(s => console.log('    -', s.store_name, '|', s.approval_status));
  }
  
  // Check user_roles table
  const { data: roles, error: rErr } = await supabase
    .from('user_roles')
    .select('id, user_id, role')
    .limit(5);
  console.log('✓ user_roles:', rErr ? `ERROR: ${rErr.message}` : `${roles?.length} found`);
  if (roles && roles.length > 0) {
    roles.forEach(r => console.log('    -', r.role, r.user_id?.substring(0, 8)));
  }

  console.log('\n=== Summary ===');
  console.log('profiles table:', pErr ? '❌ FAILED' : '✅ OK');
  console.log('buyers table:', bErr ? '❌ FAILED' : '✅ OK');
  console.log('sellers table:', sErr ? '❌ FAILED' : '✅ OK');
  console.log('user_roles table:', rErr ? '❌ FAILED' : '✅ OK');
  
  process.exit(0);
}

checkTables().catch(e => { console.error(e); process.exit(1); });
