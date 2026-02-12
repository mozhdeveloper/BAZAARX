/**
 * Check for duplicate carts before migration
 * This script will show what will be cleaned up
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bqvwuzqxstusnybrxsls.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdnd1enF4c3R1c255YnJ4c2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyNzU5OTksImV4cCI6MjA1Mjg1MTk5OX0.UHYFNBedNvjEfPVIlSMKcIlKhkq4C_qJOJiSFJ-1_uI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate carts...\n');

  try {
    // Get all carts grouped by buyer_id
    const { data: carts, error } = await supabase
      .from('carts')
      .select('id, buyer_id, created_at')
      .order('buyer_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching carts:', error);
      return;
    }

    if (!carts || carts.length === 0) {
      console.log('ℹ️  No carts found in database');
      return;
    }

    // Group by buyer_id
    const buyerCarts = new Map<string, any[]>();
    let nullBuyerCarts = 0;

    for (const cart of carts) {
      if (!cart.buyer_id) {
        nullBuyerCarts++;
        continue;
      }

      if (!buyerCarts.has(cart.buyer_id)) {
        buyerCarts.set(cart.buyer_id, []);
      }
      buyerCarts.get(cart.buyer_id)!.push(cart);
    }

    console.log(`📊 Total carts: ${carts.length}`);
    console.log(`👥 Unique buyers with carts: ${buyerCarts.size}`);
    console.log(`🚫 Carts with null buyer_id: ${nullBuyerCarts}\n`);

    // Find duplicates
    const duplicates: Array<{ buyer_id: string; count: number; carts: any[] }> = [];
    
    for (const [buyerId, buyerCartList] of buyerCarts.entries()) {
      if (buyerCartList.length > 1) {
        duplicates.push({
          buyer_id: buyerId,
          count: buyerCartList.length,
          carts: buyerCartList
        });
      }
    }

    if (duplicates.length === 0) {
      console.log('✅ No duplicate carts found! Database is clean.');
      return;
    }

    console.log(`⚠️  Found ${duplicates.length} buyer(s) with duplicate carts:\n`);

    let totalToDelete = 0;
    for (const dup of duplicates) {
      console.log(`Buyer ID: ${dup.buyer_id.substring(0, 8)}...`);
      console.log(`  Total carts: ${dup.count}`);
      console.log(`  Will keep: ${dup.carts[0].id.substring(0, 8)}... (created: ${dup.carts[0].created_at})`);
      console.log(`  Will delete: ${dup.count - 1} older cart(s)`);
      
      for (let i = 1; i < dup.carts.length; i++) {
        console.log(`    - ${dup.carts[i].id.substring(0, 8)}... (created: ${dup.carts[i].created_at})`);
        totalToDelete++;
      }
      console.log('');
    }

    console.log(`\n📋 Summary:`);
    console.log(`   Total duplicate carts to delete: ${totalToDelete}`);
    console.log(`   Buyers affected: ${duplicates.length}`);
    console.log(`\n✅ Migration will be SAFE - only removing duplicate carts, keeping the most recent one per buyer.`);

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkDuplicates();
