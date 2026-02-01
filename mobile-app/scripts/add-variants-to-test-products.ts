/**
 * Add variants to test products
 * Run with: npx ts-node scripts/add-variants-to-test-products.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bsdmfynvcgqzwwdppmbl.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZG1meW52Y2dxend3ZHBwbWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MTcyMDAsImV4cCI6MjA1OTA5MzIwMH0.FTXU_qGC4mSv50GtNShC8SHH6KyZbpkBN0KKs68Dd3k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function addVariantsToTestProducts() {
  console.log('\n🔧 Adding variants to test products...\n');

  try {
    // Find products with "joax" or "test" in the name
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, colors, sizes')
      .or('name.ilike.%joax%,name.ilike.%test%');

    if (fetchError) throw fetchError;

    if (!products || products.length === 0) {
      console.log('❌ No test products found');
      return;
    }

    console.log(`Found ${products.length} test products:\n`);

    for (const product of products) {
      console.log(`📦 ${product.name}`);
      console.log(`   Current colors: ${JSON.stringify(product.colors)}`);
      console.log(`   Current sizes: ${JSON.stringify(product.sizes)}`);

      // Add variants if they're empty
      const needsColors = !product.colors || product.colors.length === 0;
      const needsSizes = !product.sizes || product.sizes.length === 0;

      if (needsColors || needsSizes) {
        const updates: any = {};
        
        if (needsColors) {
          updates.colors = ['Black', 'White', 'Blue', 'Red'];
        }
        
        if (needsSizes) {
          updates.sizes = ['Small', 'Medium', 'Large', 'XL'];
        }

        const { error: updateError } = await supabase
          .from('products')
          .update(updates)
          .eq('id', product.id);

        if (updateError) {
          console.log(`   ❌ Failed to update: ${updateError.message}`);
        } else {
          console.log(`   ✅ Updated with:`);
          if (updates.colors) console.log(`      Colors: ${updates.colors.join(', ')}`);
          if (updates.sizes) console.log(`      Sizes: ${updates.sizes.join(', ')}`);
        }
      } else {
        console.log(`   ℹ️  Already has variants`);
      }
      console.log('');
    }

    console.log('✨ Done!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addVariantsToTestProducts();
