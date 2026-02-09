import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProductData() {
  console.log('🔍 Checking Wireless Gaming Mouse Pro data...\n');

  // Get the product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('name', 'Wireless Gaming Mouse Pro')
    .single();

  if (productError) {
    console.error('❌ Error fetching product:', productError);
    return;
  }

  console.log('📦 Product Details:');
  console.log(`   ID: ${product.id}`);
  console.log(`   Name: ${product.name}`);
  console.log(`   Base Price: ₱${product.price}`);
  console.log(`   SKU: ${product.sku}`);
  console.log(`   Variant Label 1: ${product.variant_label_1}`);
  console.log(`   Variant Label 2: ${product.variant_label_2}`);
  console.log(`   Approval Status: ${product.approval_status}\n`);

  // Get variants
  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id)
    .order('color', { ascending: true })
    .order('size', { ascending: true });

  if (variantsError) {
    console.error('❌ Error fetching variants:', variantsError);
    return;
  }

  console.log('🎨 Product Variants:');
  console.log('─'.repeat(90));
  console.log('SKU                    | Variant Name              | Color  | Size   | Price    | Stock');
  console.log('─'.repeat(90));
  
  variants.forEach(v => {
    const sku = (v.sku || '').padEnd(22);
    const variantName = (v.variant_name || '').padEnd(25);
    const color = (v.color || 'N/A').padEnd(6);
    const size = (v.size || 'N/A').padEnd(6);
    const price = `₱${v.price}`.padEnd(8);
    const stock = v.stock;
    console.log(`${sku} | ${variantName} | ${color} | ${size} | ${price} | ${stock}`);
  });
  console.log('─'.repeat(90));

  // Get images
  const { data: images, error: imagesError } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', product.id)
    .order('sort_order');

  if (imagesError) {
    console.error('❌ Error fetching images:', imagesError);
    return;
  }

  console.log('\n📸 Product Images:');
  images.forEach((img, idx) => {
    console.log(`   ${idx + 1}. ${img.is_primary ? '⭐ PRIMARY' : '        '} - ${img.alt_text}`);
  });

  console.log('\n✅ Database check complete!');
}

checkProductData();
