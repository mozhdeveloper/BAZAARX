/**
 * Seed Products Script
 * Populates the shop with real product data, variants, and images
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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mdawdegxofjsjrvygqbh.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
    console.error('❌ ERROR: EXPO_PUBLIC_SUPABASE_ANON_KEY not found in environment');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Real product data with Unsplash images (free to use)
const products = [
  // Electronics
  {
    name: 'Wireless Bluetooth Earbuds Pro',
    description: 'Premium wireless earbuds with active noise cancellation, 30-hour battery life, and crystal-clear audio. IPX5 water resistant for workouts.',
    price: 2499,
    original_price: 3499,
    category: 'Electronics',
    colors: ['Black', 'White', 'Navy Blue'],
    sizes: [],
    stock: 150,
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800',
      'https://images.unsplash.com/photo-1598331668826-20cecc596b86?w=800',
      'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800',
    rating: 4.8,
    sales_count: 2450,
    is_free_shipping: true,
  },
  {
    name: 'Smart Watch Series X',
    description: 'Advanced smartwatch with heart rate monitoring, GPS, sleep tracking, and 7-day battery life. Compatible with iOS and Android.',
    price: 4999,
    original_price: 6999,
    category: 'Electronics',
    colors: ['Midnight Black', 'Silver', 'Rose Gold'],
    sizes: ['40mm', '44mm'],
    stock: 85,
    images: [
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800',
      'https://images.unsplash.com/photo-1617043786394-f977fa12eddf?w=800',
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800',
    rating: 4.7,
    sales_count: 1820,
    is_free_shipping: true,
  },
  {
    name: 'Portable Power Bank 20000mAh',
    description: 'High-capacity power bank with fast charging support. Charge 3 devices simultaneously with USB-C and dual USB-A ports.',
    price: 1299,
    original_price: 1799,
    category: 'Electronics',
    colors: ['Black', 'White'],
    sizes: [],
    stock: 200,
    images: [
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800',
      'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800',
    rating: 4.6,
    sales_count: 3200,
    is_free_shipping: false,
  },

  // Fashion - Men
  {
    name: 'Premium Cotton Polo Shirt',
    description: 'Classic fit polo shirt made from 100% premium cotton. Breathable, comfortable, and perfect for casual or semi-formal occasions.',
    price: 899,
    original_price: 1299,
    category: 'Fashion',
    colors: ['Navy Blue', 'White', 'Black', 'Burgundy', 'Forest Green'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 500,
    images: [
      'https://images.unsplash.com/photo-1625910513413-5fc69ff8e0b9?w=800',
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800',
      'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1625910513413-5fc69ff8e0b9?w=800',
    rating: 4.5,
    sales_count: 4500,
    is_free_shipping: false,
  },
  {
    name: 'Slim Fit Denim Jeans',
    description: 'Modern slim fit jeans with stretch comfort. Made from premium denim that holds its shape wash after wash.',
    price: 1499,
    original_price: 2199,
    category: 'Fashion',
    colors: ['Dark Blue', 'Light Blue', 'Black'],
    sizes: ['28', '30', '32', '34', '36', '38'],
    stock: 320,
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800',
      'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
    rating: 4.4,
    sales_count: 2800,
    is_free_shipping: true,
  },

  // Fashion - Women
  {
    name: 'Floral Summer Dress',
    description: 'Elegant floral print dress perfect for summer. Lightweight, flowy fabric with adjustable waist tie.',
    price: 1299,
    original_price: 1899,
    category: 'Fashion',
    colors: ['Floral Pink', 'Floral Blue', 'Floral Yellow'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: 180,
    images: [
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800',
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800',
    rating: 4.7,
    sales_count: 1650,
    is_free_shipping: true,
  },
  {
    name: 'Classic Leather Handbag',
    description: 'Timeless leather handbag with multiple compartments. Durable, stylish, and perfect for everyday use.',
    price: 2499,
    original_price: 3499,
    category: 'Fashion',
    colors: ['Black', 'Brown', 'Tan', 'Burgundy'],
    sizes: [],
    stock: 95,
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800',
      'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
    rating: 4.8,
    sales_count: 890,
    is_free_shipping: true,
  },

  // Home & Living
  {
    name: 'Minimalist Desk Lamp',
    description: 'Modern LED desk lamp with adjustable brightness and color temperature. Touch control with USB charging port.',
    price: 1199,
    original_price: 1599,
    category: 'Home & Living',
    colors: ['White', 'Black', 'Wood Grain'],
    sizes: [],
    stock: 120,
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
      'https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=800',
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
    rating: 4.6,
    sales_count: 1200,
    is_free_shipping: false,
  },
  {
    name: 'Cozy Throw Blanket',
    description: 'Ultra-soft microfiber throw blanket. Perfect for movie nights, reading, or adding warmth to your living space.',
    price: 799,
    original_price: 1099,
    category: 'Home & Living',
    colors: ['Gray', 'Beige', 'Navy', 'Blush Pink', 'Forest Green'],
    sizes: ['Standard (50x60)', 'Large (60x80)'],
    stock: 250,
    images: [
      'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=800',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=800',
    rating: 4.9,
    sales_count: 3400,
    is_free_shipping: false,
  },

  // Sports & Fitness
  {
    name: 'Performance Running Shoes',
    description: 'Lightweight running shoes with responsive cushioning and breathable mesh upper. Perfect for daily runs and training.',
    price: 3499,
    original_price: 4499,
    category: 'Sports',
    colors: ['Black/White', 'Navy/Orange', 'Gray/Neon Green'],
    sizes: ['US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12'],
    stock: 180,
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    rating: 4.7,
    sales_count: 2100,
    is_free_shipping: true,
  },
  {
    name: 'Yoga Mat Premium',
    description: 'Eco-friendly yoga mat with superior grip and cushioning. 6mm thick with alignment lines for proper positioning.',
    price: 1299,
    original_price: 1799,
    category: 'Sports',
    colors: ['Purple', 'Blue', 'Black', 'Teal', 'Pink'],
    sizes: [],
    stock: 200,
    images: [
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
      'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800',
    rating: 4.8,
    sales_count: 1850,
    is_free_shipping: false,
  },
  {
    name: 'Resistance Bands Set',
    description: 'Complete set of 5 resistance bands with different tension levels. Includes carrying bag and exercise guide.',
    price: 599,
    original_price: 899,
    category: 'Sports',
    colors: ['Multi-Color Set'],
    sizes: ['Light', 'Medium', 'Heavy', 'X-Heavy', 'XX-Heavy'],
    stock: 300,
    images: [
      'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800',
    rating: 4.5,
    sales_count: 4200,
    is_free_shipping: false,
  },

  // Beauty & Personal Care
  {
    name: 'Hydrating Face Serum',
    description: 'Vitamin C and Hyaluronic Acid serum for glowing, hydrated skin. Suitable for all skin types.',
    price: 899,
    original_price: 1299,
    category: 'Beauty',
    colors: [],
    sizes: ['30ml', '50ml'],
    stock: 400,
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
      'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
    rating: 4.6,
    sales_count: 5600,
    is_free_shipping: false,
  },
  {
    name: 'Professional Hair Dryer',
    description: 'Ionic hair dryer with 3 heat settings and cool shot button. Reduces frizz and dries hair 50% faster.',
    price: 1899,
    original_price: 2499,
    category: 'Beauty',
    colors: ['Black', 'Rose Gold', 'White'],
    sizes: [],
    stock: 75,
    images: [
      'https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800',
      'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800',
    rating: 4.4,
    sales_count: 980,
    is_free_shipping: true,
  },

  // Kitchen & Dining
  {
    name: 'Stainless Steel Water Bottle',
    description: 'Double-wall insulated water bottle. Keeps drinks cold for 24 hours or hot for 12 hours. BPA-free.',
    price: 699,
    original_price: 999,
    category: 'Kitchen',
    colors: ['Silver', 'Matte Black', 'Rose Gold', 'Ocean Blue', 'Forest Green'],
    sizes: ['500ml', '750ml', '1L'],
    stock: 450,
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800',
      'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800',
      'https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800',
    rating: 4.7,
    sales_count: 6800,
    is_free_shipping: false,
  },
  {
    name: 'Non-Stick Cookware Set',
    description: '10-piece ceramic non-stick cookware set. Includes pots, pans, and lids. Oven safe up to 450°F.',
    price: 4999,
    original_price: 6999,
    category: 'Kitchen',
    colors: ['Gray', 'Red', 'Navy Blue'],
    sizes: [],
    stock: 60,
    images: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
      'https://images.unsplash.com/photo-1584990347449-a9de97c6bb5e?w=800',
      'https://images.unsplash.com/photo-1583778176476-4a8b02e15f67?w=800'
    ],
    primary_image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
    rating: 4.5,
    sales_count: 520,
    is_free_shipping: true,
  },
];

async function seedProducts() {
  console.log('============================================================');
  console.log('SEEDING PRODUCTS WITH REAL DATA');
  console.log('============================================================\n');

  // First, get or create a verified seller
  let sellerId: string;
  
  // Check for existing sellers
  const { data: sellers, error: sellerError } = await supabase
    .from('sellers')
    .select('id, store_name, is_verified')
    .limit(1);

  console.log('Seller query result:', sellers, sellerError);

  if (sellers && sellers.length > 0) {
    sellerId = sellers[0].id;
    console.log(`✅ Using existing seller: ${sellers[0].store_name} (${sellerId})`);
    
    // Update to verified if not already
    if (!sellers[0].is_verified) {
      await supabase
        .from('sellers')
        .update({ is_verified: true })
        .eq('id', sellerId);
      console.log('   → Updated seller to verified');
    }
  } else {
    // Create a demo seller
    console.log('📝 Creating demo verified seller...');
    const { data: newSeller, error: createError } = await supabase
      .from('sellers')
      .insert({
        store_name: 'BazaarX Official Store',
        business_name: 'BazaarX Philippines Inc.',
        email: 'store@bazaarx.ph',
        phone: '+639171234567',
        business_address: 'BGC, Taguig City, Metro Manila',
        is_verified: true,
        rating: 4.9,
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, store_name')
      .single();

    if (createError) {
      console.log('❌ Failed to create seller:', createError.message);
      
      // Try getting seller_id from existing products
      const { data: existingProducts } = await supabase
        .from('products')
        .select('seller_id')
        .not('seller_id', 'is', null)
        .limit(1);
      
      if (existingProducts && existingProducts.length > 0 && existingProducts[0].seller_id) {
        sellerId = existingProducts[0].seller_id;
        console.log(`✅ Using seller_id from existing product: ${sellerId}`);
      } else {
        console.log('❌ Cannot proceed without a seller. Please create one manually.');
        return;
      }
    } else {
      sellerId = newSeller.id;
      console.log(`✅ Created seller: ${newSeller.store_name} (${sellerId})`);
    }
  }

  // Insert products
  let successCount = 0;
  let failCount = 0;

  for (const product of products) {
    const productData = {
      ...product,
      seller_id: sellerId,
      is_active: true,
      approval_status: 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select('id, name')
      .single();

    if (error) {
      console.log(`❌ Failed to insert "${product.name}": ${error.message}`);
      failCount++;
    } else {
      console.log(`✅ Inserted: ${product.name} (${data.id})`);
      successCount++;
    }
  }

  console.log('\n============================================================');
  console.log('SEEDING COMPLETE');
  console.log('============================================================');
  console.log(`✅ Successfully inserted: ${successCount} products`);
  console.log(`❌ Failed: ${failCount} products`);
  console.log(`📦 Total products in catalog: ${successCount}`);
  
  // Verify products
  const { data: allProducts, count } = await supabase
    .from('products')
    .select('id, name, colors, sizes, approval_status', { count: 'exact' })
    .eq('approval_status', 'approved')
    .eq('is_active', true);

  console.log(`\n📊 Total approved products in shop: ${count}`);
  
  if (allProducts && allProducts.length > 0) {
    const withVariants = allProducts.filter(p => 
      (p.colors && p.colors.length > 0) || (p.sizes && p.sizes.length > 0)
    );
    console.log(`🎨 Products with variants: ${withVariants.length}`);
  }
}

seedProducts().catch(console.error);
