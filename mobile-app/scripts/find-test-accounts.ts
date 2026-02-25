/**
 * Find valid test accounts for messaging tests
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function findAccounts() {
  console.log('🔍 Finding valid test accounts...\n');

  // Test buyer emails
  const buyerEmails = [
    'anna.cruz@gmail.com',
    'john.buyer@gmail.com', 
    'buyer@test.com',
    'test@buyer.com',
    'buyer1@test.com',
    'demo@buyer.com'
  ];

  // Test seller emails
  const sellerEmails = [
    'maria.santos@bazaarph.com',
    'active.sports@bazaarph.com',
    'juan.tech@bazaarph.com',
    'wellness.haven@bazaarph.com',
    'home.essentials@bazaarph.com'
  ];

  console.log('=== BUYER ACCOUNTS ===');
  let foundBuyer = null;
  for (const email of buyerEmails) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'Buyer123!'
    });
    
    if (data.user) {
      console.log(`✅ ${email} - ID: ${data.user.id}`);
      if (!foundBuyer) foundBuyer = { email, id: data.user.id };
    } else {
      console.log(`❌ ${email} - ${error?.message}`);
    }
    await supabase.auth.signOut();
  }

  console.log('\n=== SELLER ACCOUNTS ===');
  let foundSeller = null;
  let foundSellerData = null;
  for (const email of sellerEmails) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'Seller123!'
    });
    
    if (data.user) {
      // Get the seller ID from sellers table
      const { data: sellerRecord } = await supabase
        .from('sellers')
        .select('id, store_name')
        .eq('id', data.user.id)
        .single();
      
      if (sellerRecord) {
        console.log(`✅ ${email} - Auth ID: ${data.user.id} | Seller ID: ${sellerRecord.id} | Store: ${sellerRecord.store_name}`);
        if (!foundSeller) {
          foundSeller = { email, authId: data.user.id, sellerId: sellerRecord.id, storeName: sellerRecord.store_name };
        }
      } else {
        // Try matching by email pattern
        const storeName = email.includes('active.sports') ? 'ActiveGear Sports' : 
                          email.includes('maria.santos') ? "Maria's Fashion House" :
                          email.includes('juan.tech') ? 'TechHub Philippines' : null;
        
        if (storeName) {
          const { data: sellerByName } = await supabase
            .from('sellers')
            .select('id, store_name')
            .eq('store_name', storeName)
            .single();
          
          if (sellerByName) {
            console.log(`✅ ${email} - Auth ID: ${data.user.id} | Seller ID: ${sellerByName.id} | Store: ${sellerByName.store_name}`);
            if (!foundSeller) {
              foundSeller = { email, authId: data.user.id, sellerId: sellerByName.id, storeName: sellerByName.store_name };
            }
          } else {
            console.log(`⚠️ ${email} - Auth works but no seller record found`);
          }
        } else {
          console.log(`⚠️ ${email} - Auth works but no seller record found`);
        }
      }
    } else {
      console.log(`❌ ${email} - ${error?.message}`);
    }
    await supabase.auth.signOut();
  }

  console.log('\n=== RECOMMENDED TEST ACCOUNTS ===');
  if (foundBuyer) {
    console.log(`Buyer: ${foundBuyer.email} (Buyer123!) - ID: ${foundBuyer.id}`);
  } else {
    console.log('No working buyer account found!');
  }
  if (foundSeller) {
    console.log(`Seller: ${foundSeller.email} (Seller123!) - Seller ID: ${foundSeller.sellerId} - Store: ${foundSeller.storeName}`);
  } else {
    console.log('No working seller account found!');
  }
}

findAccounts().catch(console.error);
