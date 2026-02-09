import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyProductDisplay() {
  console.log('🔍 Verifying Product Display Configuration...\n');

  // Get the product with all related data (same as web app would fetch)
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories!products_category_id_fkey (id, name, slug),
      images:product_images (id, image_url, alt_text, sort_order, is_primary),
      variants:product_variants (id, sku, variant_name, size, color, price, stock, thumbnail_url),
      seller:sellers!products_seller_id_fkey (
        id, store_name, store_description, avatar_url, owner_name, 
        approval_status, verified_at,
        business_profile:seller_business_profiles (business_type, city, province)
      )
    `)
    .eq('name', 'Wireless Gaming Mouse Pro')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📦 Product Information:');
  console.log(`   Name: ${product.name}`);
  console.log(`   Base Price: ₱${product.price}`);
  console.log(`   Variant Labels: ${product.variant_label_1} / ${product.variant_label_2}\n`);

  // Extract colors and sizes
  const variants = product.variants || [];
  const uniqueColors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const uniqueSizes = [...new Set(variants.map(v => v.size).filter(Boolean))];

  console.log('🎨 Available Colors:');
  uniqueColors.forEach(color => {
    console.log(`   • ${color}`);
  });
  
  console.log('\n📏 Available Sizes:');
  uniqueSizes.forEach(size => {
    console.log(`   • ${size}`);
  });

  console.log('\n💰 Price Range:');
  const prices = variants.map(v => v.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  console.log(`   ₱${minPrice.toLocaleString()} - ₱${maxPrice.toLocaleString()}`);

  console.log('\n📊 Variant Pricing Matrix:');
  console.log('─'.repeat(70));
  console.log('Color     | Size     | Price      | Stock');
  console.log('─'.repeat(70));
  
  variants.forEach(v => {
    const color = (v.color || 'N/A').padEnd(9);
    const size = (v.size || 'N/A').padEnd(8);
    const price = `₱${v.price}`.padEnd(10);
    const stock = v.stock;
    console.log(`${color} | ${size} | ${price} | ${stock}`);
  });
  console.log('─'.repeat(70));

  console.log('\n📸 Images:');
  const images = product.images || [];
  images.forEach((img, idx) => {
    console.log(`   ${idx + 1}. ${img.is_primary ? '⭐' : '  '} ${img.alt_text}`);
  });

  console.log('\n✅ Product should display:');
  console.log(`   • ${uniqueColors.length} color options ${uniqueColors.join(', ')}`);
  console.log(`   • ${uniqueSizes.length} size options (${uniqueSizes.join(', ')})`);
  console.log(`   • Dynamic pricing from ₱${minPrice.toLocaleString()} to ₱${maxPrice.toLocaleString()}`);
  console.log(`   • Stock updates based on selected variant`);
  console.log(`\n🌐 View at: http://localhost:5173/product/${product.id}`);
}

verifyProductDisplay();
