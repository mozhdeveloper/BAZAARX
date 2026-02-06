/**
 * Setup Admin User Script
 * Creates an admin user in Supabase (auth + profiles + admins tables)
 * 
 * Usage: npx tsx scripts/setup-admin.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface AdminConfig {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const adminsToCreate: AdminConfig[] = [
  {
    email: 'sinceadmin@gmail.com',
    password: 'password',
    firstName: 'Since',
    lastName: 'Admin'
  },
  {
    email: 'admin@gmail.com',
    password: 'password',
    firstName: 'Demo',
    lastName: 'Admin'
  }
];

async function createAdminUser(config: AdminConfig) {
  console.log(`\n📧 Creating admin: ${config.email}`);
  
  try {
    // Step 1: Check if user exists in auth.users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === config.email);
    
    let userId: string;
    
    if (existingUser) {
      console.log(`  ✓ Auth user already exists: ${existingUser.id}`);
      userId = existingUser.id;
    } else {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: config.email,
        password: config.password,
        email_confirm: true
      });
      
      if (authError) {
        throw new Error(`Auth creation failed: ${authError.message}`);
      }
      
      userId = authData.user.id;
      console.log(`  ✓ Auth user created: ${userId}`);
    }
    
    // Step 2: Check/Create profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (existingProfile) {
      console.log(`  ✓ Profile already exists`);
    } else {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: config.email,
          first_name: config.firstName,
          last_name: config.lastName
        });
      
      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }
      console.log(`  ✓ Profile created`);
    }
    
    // Step 3: Check/Create admin record
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (existingAdmin) {
      console.log(`  ✓ Admin record already exists`);
    } else {
      const { error: adminError } = await supabase
        .from('admins')
        .insert({
          id: userId,
          permissions: {
            users: ['read', 'write', 'delete'],
            sellers: ['read', 'write', 'delete', 'approve'],
            products: ['read', 'write', 'delete', 'approve'],
            orders: ['read', 'write'],
            analytics: ['read']
          }
        });
      
      if (adminError) {
        throw new Error(`Admin record creation failed: ${adminError.message}`);
      }
      console.log(`  ✓ Admin record created`);
    }
    
    console.log(`  ✅ Admin setup complete for ${config.email}`);
    return true;
    
  } catch (error) {
    console.error(`  ❌ Error: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function main() {
  console.log('🔐 Setting up admin users...');
  console.log('================================\n');
  
  let successCount = 0;
  
  for (const admin of adminsToCreate) {
    const success = await createAdminUser(admin);
    if (success) successCount++;
  }
  
  console.log('\n================================');
  console.log(`✅ Successfully set up ${successCount}/${adminsToCreate.length} admins`);
  
  console.log('\n📋 Test Credentials:');
  console.log('--------------------------------');
  for (const admin of adminsToCreate) {
    console.log(`Email: ${admin.email}`);
    console.log(`Password: ${admin.password}`);
    console.log('');
  }
  
  process.exit(0);
}

main();
