/**
 * Fix Stock Quantity Script
 * Updates all products to have stock_quantity
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixStock() {
  console.log('Checking product schema...\n');

  // First check the actual columns
  const { data: sample, error: sampleError } = await supabase
    .from('products')
    .select('*')
    .limit(1)
    .single();

  if (sampleError) {
    console.error('Error:', sampleError.message);
    return;
  }

  console.log('Product columns:', Object.keys(sample));
  
  // Find stock-related column
  const stockColumn = Object.keys(sample).find(k => k.toLowerCase().includes('stock') || k.toLowerCase().includes('quantity'));
  console.log(`\nStock column: ${stockColumn || 'NOT FOUND'}`);
  
  if (!stockColumn) {
    console.log('\n⚠️ No stock column found. Available columns:');
    Object.entries(sample).forEach(([key, value]) => {
      console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    });
    return;
  }

  // Get all products
  const { data: products, error } = await supabase
    .from('products')
    .select('*');

  if (error || !products) {
    console.error('Error fetching products:', error?.message);
    return;
  }

  console.log(`\nFound ${products.length} products total\n`);

  // Update each product with random stock between 50-200
  let updated = 0;
  for (const product of products) {
    const currentStock = (product as any)[stockColumn];
    if (currentStock && Number(currentStock) > 0) {
      console.log(`⏭️ ${(product as any).name} already has stock: ${currentStock}`);
      continue;
    }
    
    const stockQty = Math.floor(Math.random() * 150) + 50;
    
    const { error: updateError } = await supabase
      .from('products')
      .update({ [stockColumn]: stockQty })
      .eq('id', (product as any).id);

    if (updateError) {
      console.log(`❌ Failed to update ${(product as any).name}: ${updateError.message}`);
    } else {
      console.log(`✅ Updated ${(product as any).name}: ${stockColumn} = ${stockQty}`);
      updated++;
    }
  }

  console.log(`\n✅ Stock fix complete! Updated ${updated} products`);
}

fixStock().catch(console.error);
