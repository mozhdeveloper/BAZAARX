/**
 * Complete Data Population - Final
 * Adds products for seller3 and ensures all data is complete
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n=== COMPLETE DATA POPULATION ===\n');

  // Get seller3 ID
  const { data: seller3 } = await supabase
    .from('sellers')
    .select('id')
    .eq('store_name', 'Home & Living Co.')
    .single();

  if (!seller3) {
    console.log('❌ Seller3 not found');
    return;
  }
  console.log(`✅ Found seller3: ${seller3.id.substring(0, 8)}...`);

  // Get Home & Living category
  const { data: homeCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'Home & Living')
    .single();

  // Get Beauty & Health category
  const { data: beautyCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'Beauty & Health')
    .single();

  // Reassign Home & Living products to seller3
  console.log('\n📦 Reassigning Home & Living products to seller3...');
  const { data: homeProducts } = await supabase
    .from('products')
    .select('id, name')
    .eq('category_id', homeCategory?.id);

  for (const product of homeProducts || []) {
    await supabase.from('products').update({ seller_id: seller3.id }).eq('id', product.id);
    console.log(`  ✅ ${product.name} → Home & Living Co.`);
  }

  // Add new products for seller3
  console.log('\n📦 Adding new products for seller3...');
  
  const newProducts = [
    {
      name: 'Organic Bamboo Bath Towel Set',
      description: 'Luxuriously soft 100% organic bamboo towels. Set includes 2 bath towels, 2 hand towels, and 2 washcloths. Eco-friendly and hypoallergenic.',
      price: 1899,
      category_id: homeCategory?.id,
      seller_id: seller3.id,
      brand: 'EcoHome',
      sku: 'HL-TOWEL-001',
      approval_status: 'approved',
      variants: [
        { variant_name: 'White', color: 'White', size: 'Standard', price: 1899, stock: 50 },
        { variant_name: 'Gray', color: 'Gray', size: 'Standard', price: 1899, stock: 40 },
        { variant_name: 'Sage Green', color: 'Green', size: 'Standard', price: 1899, stock: 35 },
      ],
      images: [
        'https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=800',
        'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=800',
      ],
    },
    {
      name: 'Aromatherapy Essential Oil Diffuser',
      description: 'Ultrasonic essential oil diffuser with 7 LED color options. 300ml capacity, whisper-quiet operation. Perfect for bedrooms and living spaces.',
      price: 1499,
      category_id: beautyCategory?.id,
      seller_id: seller3.id,
      brand: 'ZenLife',
      sku: 'HL-DIFF-001',
      approval_status: 'approved',
      variants: [
        { variant_name: 'Wood Grain', color: 'Brown', size: '300ml', price: 1499, stock: 60 },
        { variant_name: 'White Marble', color: 'White', size: '300ml', price: 1599, stock: 45 },
      ],
      images: [
        'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800',
      ],
    },
    {
      name: 'Minimalist Floating Wall Shelf Set',
      description: 'Set of 3 floating shelves in different sizes. Made from premium MDF with matte finish. Easy installation with included hardware.',
      price: 999,
      category_id: homeCategory?.id,
      seller_id: seller3.id,
      brand: 'ModernHome',
      sku: 'HL-SHELF-001',
      approval_status: 'approved',
      variants: [
        { variant_name: 'Matte Black', color: 'Black', size: 'Set of 3', price: 999, stock: 30 },
        { variant_name: 'Matte White', color: 'White', size: 'Set of 3', price: 999, stock: 35 },
        { variant_name: 'Natural Oak', color: 'Brown', size: 'Set of 3', price: 1199, stock: 25 },
      ],
      images: [
        'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800',
      ],
    },
    {
      name: 'Luxury Scented Candle Gift Set',
      description: 'Set of 4 premium soy wax candles in elegant glass jars. Scents: Lavender, Vanilla, Eucalyptus, and Rose. 40-hour burn time each.',
      price: 1299,
      category_id: beautyCategory?.id,
      seller_id: seller3.id,
      brand: 'AromaLux',
      sku: 'HL-CANDLE-001',
      approval_status: 'approved',
      variants: [
        { variant_name: 'Classic Collection', color: 'Multi', size: 'Set of 4', price: 1299, stock: 40 },
        { variant_name: 'Fresh Collection', color: 'Multi', size: 'Set of 4', price: 1299, stock: 35 },
      ],
      images: [
        'https://images.unsplash.com/photo-1602607387020-7f2a2755ee39?w=800',
      ],
    },
  ];

  for (const product of newProducts) {
    const { variants, images, ...productData } = product;
    
    // Check if product exists
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('sku', productData.sku)
      .single();

    if (existing) {
      console.log(`  ⏭️  ${productData.name} already exists`);
      continue;
    }

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) {
      console.log(`  ❌ ${productData.name}: ${error.message}`);
      continue;
    }

    console.log(`  ✅ ${productData.name}`);

    // Add images
    for (let i = 0; i < images.length; i++) {
      await supabase.from('product_images').insert({
        product_id: newProduct.id,
        image_url: images[i],
        is_primary: i === 0,
        sort_order: i,
      });
    }

    // Add variants
    for (const variant of variants) {
      await supabase.from('product_variants').insert({
        product_id: newProduct.id,
        sku: `${productData.sku}-${variant.variant_name.replace(/\s+/g, '-').toUpperCase()}`,
        ...variant,
      });
    }
  }

  // Update vouchers to show in queries
  console.log('\n🎫 Checking vouchers...');
  const { data: vouchers } = await supabase.from('vouchers').select('code, is_active');
  console.log(`  Found ${vouchers?.length || 0} vouchers:`, vouchers?.map(v => v.code).join(', ') || 'none');

  // Add missing QA role
  console.log('\n👮 Checking QA role...');
  const { data: qaUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'qa@bazaarph.com')
    .single();
  
  if (qaUser) {
    const { error: roleError } = await supabase.from('user_roles').upsert({
      user_id: qaUser.id,
      role: 'qa',
    });
    console.log(roleError ? `  ❌ ${roleError.message}` : '  ✅ QA role confirmed');
  }

  // Summary
  console.log('\n=== FINAL COUNTS ===\n');
  const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  const { count: imageCount } = await supabase.from('product_images').select('*', { count: 'exact', head: true });
  const { count: variantCount } = await supabase.from('product_variants').select('*', { count: 'exact', head: true });

  console.log(`  Products: ${productCount}`);
  console.log(`  Images: ${imageCount}`);
  console.log(`  Variants: ${variantCount}`);
  
  console.log('\n✅ Done!\n');
}

main();
