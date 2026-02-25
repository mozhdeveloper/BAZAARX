/**
 * Add Test Products with Variants for POS Testing
 * 
 * This script adds sample products with colors and sizes to test the POS system.
 * Run with: npx tsx scripts/add-test-products-with-variants.ts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials. Check .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const testProducts = [
  {
    name: "Classic Cotton T-Shirt",
    description: "Premium quality cotton t-shirt, soft and comfortable for everyday wear.",
    price: 599,
    original_price: 799,
    stock: 50,
    category: "Apparel",
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=800&h=800&fit=crop"
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["White", "Black", "Navy Blue", "Gray", "Red"],
    is_active: true,
    approval_status: "approved"
  },
  {
    name: "Running Sneakers Pro",
    description: "Lightweight and breathable running shoes with premium cushioning.",
    price: 2999,
    original_price: 3499,
    stock: 30,
    category: "Footwear",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=800&fit=crop"
    ],
    sizes: ["US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12"],
    colors: ["Red/White", "Black/Gold", "Blue/White", "All Black"],
    is_active: true,
    approval_status: "approved"
  },
  {
    name: "Denim Jacket Vintage",
    description: "Classic vintage-style denim jacket, perfect for layering.",
    price: 1899,
    original_price: 2499,
    stock: 25,
    category: "Apparel",
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&h=800&fit=crop"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Light Blue", "Dark Blue", "Black"],
    is_active: true,
    approval_status: "approved"
  },
  {
    name: "Wireless Earbuds X1",
    description: "High-quality wireless earbuds with noise cancellation and 24hr battery.",
    price: 1499,
    original_price: 1999,
    stock: 100,
    category: "Electronics",
    images: [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1606220838315-056192d5e927?w=800&h=800&fit=crop"
    ],
    sizes: [],
    colors: ["White", "Black", "Rose Gold"],
    is_active: true,
    approval_status: "approved"
  },
  {
    name: "Slim Fit Chino Pants",
    description: "Modern slim fit chino pants, versatile for casual and semi-formal wear.",
    price: 1299,
    original_price: 1599,
    stock: 40,
    category: "Apparel",
    images: [
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&h=800&fit=crop"
    ],
    sizes: ["28", "30", "32", "34", "36", "38"],
    colors: ["Khaki", "Navy", "Black", "Olive", "Burgundy"],
    is_active: true,
    approval_status: "approved"
  }
];

async function addTestProducts() {
  console.log('\n🚀 Adding Test Products with Variants for POS Testing\n');
  console.log('='.repeat(60));

  // First, get an existing seller
  const { data: sellers, error: sellerError } = await supabase
    .from('sellers')
    .select('id, business_name')
    .eq('approval_status', 'approved')
    .limit(1);

  if (sellerError || !sellers || sellers.length === 0) {
    console.error('❌ No approved seller found. Please create a seller first.');
    process.exit(1);
  }

  const seller = sellers[0];
  console.log(`📦 Using seller: ${seller.business_name} (${seller.id})\n`);

  let successCount = 0;
  let failCount = 0;

  for (const product of testProducts) {
    const productId = generateUUID();
    const productData = {
      id: productId,
      seller_id: seller.id,
      ...product,
      primary_image: product.images[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('products')
      .insert(productData);

    if (error) {
      console.log(`❌ Failed: ${product.name}`);
      console.log(`   Error: ${error.message}`);
      failCount++;
    } else {
      console.log(`✅ Added: ${product.name}`);
      console.log(`   Colors: ${product.colors.join(', ')}`);
      console.log(`   Sizes: ${product.sizes.length > 0 ? product.sizes.join(', ') : 'N/A'}`);
      console.log(`   Stock: ${product.stock} | Price: ₱${product.price.toLocaleString()}`);
      console.log('');
      successCount++;
    }
  }

  console.log('='.repeat(60));
  console.log(`\n📊 Results: ${successCount} added, ${failCount} failed\n`);
  
  if (successCount > 0) {
    console.log('🎉 Test products added successfully!');
    console.log('   Now go to http://localhost:5173/seller/pos to test the POS system.\n');
  }
}

addTestProducts().catch(console.error);
