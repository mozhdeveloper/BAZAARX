/**
 * Create Test Seller Account with Complete Store and Verified Products
 * 
 * This script creates:
 * 1. A complete seller account with all business information
 * 2. Products with variations (sizes, colors) that are QA approved
 * 3. Perfect product data with descriptions, images, specifications
 * 
 * Run with: npx tsx scripts/create-test-seller-account.ts
 * 
 * Test Credentials:
 * Email: teststore@bazaar.ph
 * Password: TestStore123!
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

// Test account credentials
const TEST_EMAIL = 'teststore@bazaar.ph';
const TEST_PASSWORD = 'TestStore123!';
const TEST_FULL_NAME = 'Maria Santos';
const TEST_PHONE = '+639171234567';

// Complete seller/store information
const SELLER_DATA = {
  business_name: 'Maria\'s Fashion Boutique',
  store_name: 'MariaBoutiquePH',
  store_description: `Welcome to Maria's Fashion Boutique! 🛍️

We are your one-stop shop for trendy and affordable fashion pieces. Established in 2020, we have served thousands of happy customers across the Philippines.

✨ What We Offer:
• Premium quality apparel and accessories
• Latest fashion trends at affordable prices
• Wide range of sizes (XS to 3XL)
• Free shipping on orders over ₱1,500

🏆 Our Promise:
• 100% authentic products
• 7-day easy returns
• Secure packaging
• Fast and reliable shipping

📍 Based in Makati City, shipping nationwide!

Follow us for exclusive deals and new arrivals. Thank you for shopping with us! 💕`,
  store_category: ['Fashion', 'Apparel', 'Accessories'],
  business_type: 'Sole Proprietorship',
  business_registration_number: 'DTI-NCR-2020-123456',
  tax_id_number: '123-456-789-000',
  business_address: '123 Fashion Avenue, Legazpi Village',
  city: 'Makati City',
  province: 'Metro Manila',
  postal_code: '1229',
  bank_name: 'BDO Unibank',
  account_name: 'Maria Santos',
  account_number: '1234567890',
  is_verified: true,
  approval_status: 'approved' as const,
  rating: 4.8,
  total_sales: 1250,
};

// Complete products with variations
const PRODUCTS = [
  {
    name: 'Premium Cotton Oversized T-Shirt',
    description: `Elevate your casual wardrobe with our Premium Cotton Oversized T-Shirt! 

Made from 100% premium combed cotton, this shirt offers:
• Ultra-soft and breathable fabric
• Pre-shrunk for lasting fit
• Reinforced shoulder seams
• Relaxed oversized fit for maximum comfort

Perfect for everyday wear, streetwear styling, or lounging at home. Pair it with jeans, joggers, or shorts for an effortlessly cool look.

Care Instructions:
• Machine wash cold with similar colors
• Tumble dry low
• Iron on medium heat if needed

Experience the perfect blend of comfort and style! 🔥`,
    category: 'Apparel',
    brand: 'Maria\'s Basics',
    sku: 'MB-TSH-001',
    price: 599,
    original_price: 799,
    stock: 150,
    low_stock_threshold: 20,
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&h=800&fit=crop'
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: ['White', 'Black', 'Navy Blue', 'Heather Gray', 'Sage Green', 'Dusty Pink'],
    variants: [
      { size: 'M', color: 'Black', stock: 25, price: 599 },
      { size: 'L', color: 'Black', stock: 30, price: 599 },
      { size: 'M', color: 'White', stock: 20, price: 599 },
      { size: 'L', color: 'White', stock: 25, price: 599 },
      { size: 'M', color: 'Navy Blue', stock: 15, price: 599 },
      { size: 'L', color: 'Sage Green', stock: 20, price: 599 },
    ],
    specifications: {
      material: '100% Premium Combed Cotton',
      weight: '180 GSM',
      fit: 'Oversized / Relaxed Fit',
      neckline: 'Crew Neck',
      sleeve_length: 'Short Sleeve',
      care: 'Machine Washable',
      origin: 'Made in Philippines'
    },
    is_free_shipping: true,
    weight: 0.25,
    dimensions: { length: 30, width: 25, height: 3 },
    tags: ['oversized', 'cotton', 'casual', 'unisex', 'streetwear', 'basic'],
    rating: 4.9,
    review_count: 245,
    sales_count: 520,
    view_count: 3500
  },
  {
    name: 'High-Waisted Stretch Denim Jeans',
    description: `Our best-selling High-Waisted Stretch Denim Jeans are here! 👖

Features:
• Premium stretch denim (98% cotton, 2% spandex)
• High-waisted design for a flattering silhouette
• Classic 5-pocket styling
• Button and zip fly closure
• Slight stretch for all-day comfort

Available in multiple washes to match any style:
• Classic Blue - Timeless and versatile
• Dark Wash - Perfect for dressier occasions
• Light Wash - Casual and relaxed vibes
• Black - Sleek and sophisticated

Sizing Guide:
Our jeans run true to size. For a looser fit, size up.

Perfect for work, weekends, or a night out! ✨`,
    category: 'Apparel',
    brand: 'Maria\'s Denim Co.',
    sku: 'MD-JNS-002',
    price: 1299,
    original_price: 1599,
    stock: 100,
    low_stock_threshold: 15,
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1475178626620-a4d074967452?w=800&h=800&fit=crop'
    ],
    sizes: ['25', '26', '27', '28', '29', '30', '31', '32', '34'],
    colors: ['Classic Blue', 'Dark Wash', 'Light Wash', 'Black'],
    variants: [
      { size: '27', color: 'Classic Blue', stock: 12, price: 1299 },
      { size: '28', color: 'Classic Blue', stock: 15, price: 1299 },
      { size: '29', color: 'Classic Blue', stock: 12, price: 1299 },
      { size: '27', color: 'Dark Wash', stock: 10, price: 1299 },
      { size: '28', color: 'Dark Wash', stock: 12, price: 1299 },
      { size: '28', color: 'Black', stock: 10, price: 1299 },
      { size: '29', color: 'Black', stock: 10, price: 1299 },
    ],
    specifications: {
      material: '98% Cotton, 2% Spandex',
      rise: 'High Rise (11 inches)',
      inseam: '29 inches',
      fit: 'Skinny',
      closure: 'Button and Zip Fly',
      pockets: '5-Pocket Styling',
      care: 'Machine Wash Cold, Hang Dry',
      origin: 'Made in Philippines'
    },
    is_free_shipping: true,
    weight: 0.45,
    dimensions: { length: 35, width: 30, height: 5 },
    tags: ['denim', 'jeans', 'high-waisted', 'skinny', 'stretch', 'women'],
    rating: 4.8,
    review_count: 189,
    sales_count: 380,
    view_count: 2800
  },
  {
    name: 'Cozy Fleece Hoodie - Unisex',
    description: `Stay warm and stylish with our Cozy Fleece Hoodie! 🧥

Premium Features:
• 320 GSM heavyweight fleece
• Soft brushed interior for maximum warmth
• Kangaroo pocket with hidden phone pocket
• Adjustable drawstring hood
• Ribbed cuffs and hem for snug fit
• Relaxed unisex fit

Perfect For:
✓ Chilly mornings
✓ Casual outings
✓ Work from home comfort
✓ Travel and lounging
✓ Layering in cold weather

This hoodie is made to last with reinforced stitching and colorfast dye that won't fade after washing.

Available in 8 beautiful colors - there's one for everyone! 🌈`,
    category: 'Apparel',
    brand: 'Maria\'s Comfort',
    sku: 'MC-HOD-003',
    price: 899,
    original_price: 1199,
    stock: 120,
    low_stock_threshold: 15,
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1509942774463-acf339cf87d5?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&h=800&fit=crop'
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    colors: ['Black', 'Navy', 'Burgundy', 'Forest Green', 'Camel', 'Cream', 'Mauve', 'Charcoal'],
    variants: [
      { size: 'M', color: 'Black', stock: 20, price: 899 },
      { size: 'L', color: 'Black', stock: 25, price: 899 },
      { size: 'XL', color: 'Black', stock: 15, price: 899 },
      { size: 'M', color: 'Navy', stock: 15, price: 899 },
      { size: 'L', color: 'Navy', stock: 20, price: 899 },
      { size: 'M', color: 'Cream', stock: 12, price: 899 },
      { size: 'L', color: 'Burgundy', stock: 10, price: 899 },
    ],
    specifications: {
      material: '80% Cotton, 20% Polyester Fleece',
      weight: '320 GSM',
      fit: 'Relaxed Unisex Fit',
      hood: 'Adjustable Drawstring',
      pocket: 'Kangaroo Pocket with Hidden Pocket',
      cuffs: 'Ribbed Cuffs and Hem',
      care: 'Machine Wash Cold, Tumble Dry Low',
      origin: 'Made in Philippines'
    },
    is_free_shipping: true,
    weight: 0.55,
    dimensions: { length: 35, width: 30, height: 8 },
    tags: ['hoodie', 'fleece', 'unisex', 'cozy', 'winter', 'casual'],
    rating: 4.9,
    review_count: 312,
    sales_count: 650,
    view_count: 4200
  },
  {
    name: 'Classic Leather Tote Bag',
    description: `Introducing our timeless Classic Leather Tote Bag! 👜

Crafted with care from genuine full-grain leather, this bag is designed to be your everyday companion.

Features:
• Premium full-grain leather exterior
• Durable cotton canvas lining
• Spacious main compartment
• Interior zip pocket for valuables
• Two open pockets for quick access
• Magnetic snap closure
• Reinforced leather handles (10" drop)
• Gold-tone hardware accents

Dimensions: 14" W x 12" H x 5" D
Fits laptops up to 13 inches

The leather will develop a beautiful patina over time, making each bag unique to its owner.

Perfect for:
• Work and office
• Shopping trips
• Weekend outings
• Everyday essentials

A bag you'll love for years to come! 💼`,
    category: 'Accessories',
    brand: 'Maria\'s Leather Goods',
    sku: 'MLG-BAG-004',
    price: 2499,
    original_price: 2999,
    stock: 50,
    low_stock_threshold: 10,
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=800&fit=crop'
    ],
    sizes: [],
    colors: ['Tan', 'Black', 'Cognac Brown', 'Burgundy Wine'],
    variants: [
      { size: 'One Size', color: 'Tan', stock: 15, price: 2499 },
      { size: 'One Size', color: 'Black', stock: 15, price: 2499 },
      { size: 'One Size', color: 'Cognac Brown', stock: 12, price: 2499 },
      { size: 'One Size', color: 'Burgundy Wine', stock: 8, price: 2499 },
    ],
    specifications: {
      material: 'Full-Grain Leather',
      lining: 'Cotton Canvas',
      dimensions: '14" W x 12" H x 5" D',
      handle_drop: '10 inches',
      closure: 'Magnetic Snap',
      hardware: 'Gold-tone Metal',
      pockets: '1 Zip + 2 Open Interior Pockets',
      care: 'Wipe with Damp Cloth, Condition Regularly'
    },
    is_free_shipping: true,
    weight: 0.8,
    dimensions: { length: 36, width: 30, height: 13 },
    tags: ['leather', 'tote', 'bag', 'handbag', 'work', 'classic'],
    rating: 4.7,
    review_count: 156,
    sales_count: 220,
    view_count: 1800
  },
  {
    name: 'Minimalist Sterling Silver Necklace',
    description: `Elegant simplicity at its finest - our Minimalist Sterling Silver Necklace ✨

Handcrafted from 925 sterling silver, this delicate necklace is the perfect everyday accessory.

Features:
• Genuine 925 Sterling Silver
• Rhodium-plated for tarnish resistance
• Adjustable chain length: 16" - 18"
• Lobster clasp closure
• Hypoallergenic - safe for sensitive skin
• Comes in a beautiful gift box

Available Pendant Styles:
• Circle - Symbolizes eternity and wholeness
• Bar - Modern and sophisticated
• Heart - Classic symbol of love
• Star - Reach for your dreams
• Moon - Embrace your inner light

Perfect for:
💝 Birthday gifts
💝 Anniversary presents
💝 Bridesmaid gifts
💝 Self-purchase treat
💝 Everyday elegance

Layer with other necklaces or wear alone - either way, you'll look stunning! 💫`,
    category: 'Accessories',
    brand: 'Maria\'s Jewelry',
    sku: 'MJ-NCK-005',
    price: 799,
    original_price: 999,
    stock: 80,
    low_stock_threshold: 10,
    images: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&h=800&fit=crop'
    ],
    sizes: [],
    colors: ['Circle Pendant', 'Bar Pendant', 'Heart Pendant', 'Star Pendant', 'Moon Pendant'],
    variants: [
      { size: 'Adjustable 16-18"', color: 'Circle Pendant', stock: 20, price: 799 },
      { size: 'Adjustable 16-18"', color: 'Bar Pendant', stock: 18, price: 799 },
      { size: 'Adjustable 16-18"', color: 'Heart Pendant', stock: 15, price: 799 },
      { size: 'Adjustable 16-18"', color: 'Star Pendant', stock: 15, price: 799 },
      { size: 'Adjustable 16-18"', color: 'Moon Pendant', stock: 12, price: 799 },
    ],
    specifications: {
      material: '925 Sterling Silver',
      plating: 'Rhodium-plated',
      chain_length: 'Adjustable 16" - 18"',
      clasp: 'Lobster Clasp',
      pendant_size: '10mm',
      weight: '3 grams',
      hypoallergenic: 'Yes',
      packaging: 'Gift Box Included'
    },
    is_free_shipping: false,
    weight: 0.05,
    dimensions: { length: 10, width: 8, height: 3 },
    tags: ['necklace', 'silver', 'jewelry', 'minimalist', 'gift', 'sterling'],
    rating: 4.9,
    review_count: 287,
    sales_count: 480,
    view_count: 3100
  }
];

async function createTestSellerAccount() {
  console.log('\n🚀 Creating Test Seller Account with Complete Store\n');
  console.log('='.repeat(70));
  console.log(`📧 Email: ${TEST_EMAIL}`);
  console.log(`🔑 Password: ${TEST_PASSWORD}`);
  console.log('='.repeat(70));

  try {
    // Step 1: Check if user already exists and clean up if needed
    console.log('\n🔍 Checking for existing account...');
    
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', TEST_EMAIL)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      console.log('   ⚠️  Account exists, updating...');
      userId = existingProfile.id;
      
      // Delete existing products for this seller
      await supabase.from('products').delete().eq('seller_id', userId);
      await supabase.from('product_qa').delete().eq('vendor', SELLER_DATA.store_name);
      
    } else {
      // Step 2: Create auth user
      console.log('\n👤 Creating auth user...');
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        options: {
          data: {
            full_name: TEST_FULL_NAME,
            phone: TEST_PHONE,
            user_type: 'seller'
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          // Try to sign in and get user ID
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: TEST_EMAIL,
            password: TEST_PASSWORD
          });
          
          if (signInError) throw signInError;
          userId = signInData.user!.id;
          console.log('   ✅ Signed into existing account');
        } else {
          throw authError;
        }
      } else {
        userId = authData.user!.id;
        console.log(`   ✅ User created: ${userId}`);
      }

      // Step 3: Create profile
      console.log('\n📋 Creating profile...');
      
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: TEST_EMAIL,
          full_name: TEST_FULL_NAME,
          phone: TEST_PHONE,
          user_type: 'seller',
          avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop'
        }, { onConflict: 'id' });

      if (profileError) throw profileError;
      console.log('   ✅ Profile created');
    }

    // Step 4: Create/Update seller record
    console.log('\n🏪 Creating seller store...');
    
    const { error: sellerError } = await supabase
      .from('sellers')
      .upsert({
        id: userId!,
        ...SELLER_DATA
      }, { onConflict: 'id' });

    if (sellerError) throw sellerError;
    console.log(`   ✅ Store created: ${SELLER_DATA.store_name}`);
    console.log(`   📝 Description: ${SELLER_DATA.store_description.substring(0, 50)}...`);

    // Step 5: Create products with QA approval
    console.log('\n📦 Creating verified products...');
    
    for (const product of PRODUCTS) {
      const productId = crypto.randomUUID();
      
      // Insert product
      const { error: productError } = await supabase
        .from('products')
        .insert({
          id: productId,
          seller_id: userId!,
          ...product,
          primary_image: product.images[0],
          is_active: true,
          approval_status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (productError) {
        console.log(`   ❌ Failed to create: ${product.name}`);
        console.log(`      Error: ${productError.message}`);
        continue;
      }

      // Create QA record (approved status)
      const { error: qaError } = await supabase
        .from('product_qa')
        .insert({
          id: crypto.randomUUID(),
          product_id: productId,
          vendor: SELLER_DATA.store_name,
          status: 'ACTIVE_VERIFIED',
          logistics: 'Standard Shipping',
          submitted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          approved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          verified_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (qaError) {
        console.log(`   ⚠️  QA record failed for: ${product.name}`);
      }

      console.log(`   ✅ ${product.name}`);
      console.log(`      💰 ₱${product.price} (was ₱${product.original_price})`);
      console.log(`      📊 ${product.colors.length} colors, ${product.sizes.length || 1} sizes`);
      console.log(`      ⭐ ${product.rating}/5 (${product.review_count} reviews)`);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST SELLER ACCOUNT CREATED SUCCESSFULLY!\n');
    console.log('📧 Login Credentials:');
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}`);
    console.log('\n🏪 Store Information:');
    console.log(`   Store Name: ${SELLER_DATA.store_name}`);
    console.log(`   Business: ${SELLER_DATA.business_name}`);
    console.log(`   Status: ✅ Verified & Approved`);
    console.log(`   Rating: ⭐ ${SELLER_DATA.rating}/5`);
    console.log(`   Total Sales: ${SELLER_DATA.total_sales}`);
    console.log('\n📦 Products Created:');
    console.log(`   Total: ${PRODUCTS.length} products`);
    console.log(`   Status: ✅ All QA Approved (ACTIVE_VERIFIED)`);
    console.log('\n🔗 Test URLs:');
    console.log('   Seller Login: http://localhost:5173/seller/login');
    console.log('   Seller Dashboard: http://localhost:5173/seller');
    console.log(`   Public Store: http://localhost:5173/stores/${SELLER_DATA.store_name}`);
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error creating test account:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
createTestSellerAccount();
