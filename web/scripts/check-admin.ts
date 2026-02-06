import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkAdmin() {
  console.log('Checking admin accounts...\n');
  
  // Check if sinceadmin@gmail.com exists in profiles
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'sinceadmin@gmail.com')
    .single();
    
  console.log('=== sinceadmin@gmail.com ===');
  if (profile) {
    console.log('Found:', JSON.stringify(profile, null, 2));
  } else {
    console.log('Not found. Error:', error?.message);
  }
  
  // Also check admin@gmail.com
  const { data: demoAdmin, error: demoError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'admin@gmail.com')
    .single();
    
  console.log('\n=== admin@gmail.com ===');
  if (demoAdmin) {
    console.log('Found:', JSON.stringify(demoAdmin, null, 2));
  } else {
    console.log('Not found. Error:', demoError?.message);
  }

  // List all admins
  const { data: admins, error: adminsError } = await supabase
    .from('admins')
    .select('*, profiles!inner(*)');
    
  console.log('\n=== All Admins ===');
  if (admins && admins.length > 0) {
    admins.forEach((admin: any) => {
      console.log(`- ${admin.profiles?.email || 'Unknown'} (ID: ${admin.id})`);
    });
  } else {
    console.log('No admins found. Error:', adminsError?.message);
  }

  process.exit(0);
}

checkAdmin();
