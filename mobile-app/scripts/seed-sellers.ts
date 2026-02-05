/**
 * Seed Sellers Script
 * Creates complete verified seller accounts with auth, profiles, and products
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

// Complete seller data with credentials
const sellers = [
  {
    // Auth credentials
    email: 'maria.santos@bazaarph.com',
    password: 'Seller123!',
    // Profile data (matching actual DB schema)
    store_name: "Maria's Fashion House",
    business_name: 'Maria Santos Fashion Enterprise',
    store_description: 'Premium fashion boutique offering the latest trends in women\'s clothing, accessories, and footwear. We source directly from local designers and international brands.',
    store_category: ['Fashion', 'Accessories'],
    business_type: 'sole_proprietor',
    business_registration_number: 'DTI-2024-001234',
    tax_id_number: '123-456-789-000',
    business_address: '123 Ayala Avenue, Makati City, Metro Manila 1226',
    city: 'Makati City',
    province: 'Metro Manila',
    postal_code: '1226',
    bank_name: 'BDO Unibank',
    account_name: 'Maria Clara Santos',
    account_number: '0012345678901',
    is_verified: true,
    approval_status: 'approved',
    rating: 4.9,
    total_sales: 15420,
    business_permit_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800',
    valid_id_url: 'https://images.unsplash.com/photo-1578774296842-c45e472b3571?w=800',
    products: [
      {
        name: 'Elegant Silk Blouse',
        description: 'Luxurious 100% silk blouse with mother-of-pearl buttons. Perfect for office or evening wear. Hand-washable.',
        price: 2899,
        original_price: 3499,
        category: 'Fashion',
        colors: ['Ivory', 'Blush Pink', 'Navy', 'Black'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        stock: 120,
        images: [
          'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800',
          'https://images.unsplash.com/photo-1604695573706-53170668f6a6?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800',
        rating: 4.8,
        sales_count: 856,
      },
      {
        name: 'High-Waist Wide Leg Pants',
        description: 'Sophisticated wide-leg trousers with a flattering high waist. Made from premium stretch fabric for all-day comfort.',
        price: 1899,
        original_price: 2499,
        category: 'Fashion',
        colors: ['Black', 'Tan', 'Olive', 'Burgundy'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        stock: 200,
        images: [
          'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
          'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
        rating: 4.7,
        sales_count: 1243,
      },
      {
        name: 'Designer Crossbody Bag',
        description: 'Genuine leather crossbody bag with gold hardware. Features multiple compartments and adjustable strap. Handcrafted by local artisans.',
        price: 3499,
        original_price: 4299,
        category: 'Fashion',
        colors: ['Cognac', 'Black', 'Cream', 'Forest Green'],
        sizes: [],
        stock: 75,
        images: [
          'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800',
          'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800',
        rating: 4.9,
        sales_count: 534,
      },
    ]
  },
  {
    email: 'juan.tech@bazaarph.com',
    password: 'Seller123!',
    store_name: "TechHub Philippines",
    business_name: 'Juan Dela Cruz Tech Solutions Inc.',
    store_description: 'Your one-stop shop for the latest gadgets, electronics, and tech accessories. Authorized reseller of major brands with warranty support.',
    store_category: ['Electronics', 'Gadgets'],
    business_type: 'corporation',
    business_registration_number: 'SEC-2023-005678',
    tax_id_number: '234-567-890-001',
    business_address: '456 Bonifacio Global City, Taguig, Metro Manila 1634',
    city: 'Taguig City',
    province: 'Metro Manila',
    postal_code: '1634',
    bank_name: 'BPI',
    account_name: 'Juan Dela Cruz Tech Solutions Inc.',
    account_number: '1234567890',
    is_verified: true,
    approval_status: 'approved',
    rating: 4.8,
    total_sales: 28750,
    business_permit_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800',
    valid_id_url: 'https://images.unsplash.com/photo-1578774296842-c45e472b3571?w=800',
    products: [
      {
        name: 'Mechanical Gaming Keyboard RGB',
        description: 'Professional gaming keyboard with Cherry MX switches, per-key RGB lighting, and programmable macros. Aircraft-grade aluminum frame.',
        price: 4599,
        original_price: 5999,
        category: 'Electronics',
        colors: ['Black', 'White'],
        sizes: [],
        stock: 85,
        images: [
          'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800',
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800',
        rating: 4.9,
        sales_count: 1876,
      },
      {
        name: 'Wireless Gaming Mouse Pro',
        description: '25K DPI optical sensor, 70-hour battery life, and customizable weights. Perfect for FPS and MOBA gaming.',
        price: 3299,
        original_price: 3999,
        category: 'Electronics',
        colors: ['Black', 'White', 'Pink'],
        sizes: [],
        stock: 150,
        images: [
          'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800',
          'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800',
        rating: 4.8,
        sales_count: 2341,
      },
      {
        name: '4K Webcam with Ring Light',
        description: 'Ultra HD 4K webcam with built-in ring light, auto-focus, and noise-cancelling microphones. Perfect for streaming and video calls.',
        price: 2999,
        original_price: 3799,
        category: 'Electronics',
        colors: ['Black'],
        sizes: [],
        stock: 100,
        images: [
          'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=800',
          'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=800',
        rating: 4.7,
        sales_count: 987,
      },
      {
        name: 'USB-C Docking Station',
        description: '12-in-1 docking station with dual HDMI, 100W power delivery, Gigabit Ethernet, and multiple USB ports.',
        price: 3999,
        original_price: 4999,
        category: 'Electronics',
        colors: ['Space Gray', 'Silver'],
        sizes: [],
        stock: 60,
        images: [
          'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800',
        rating: 4.6,
        sales_count: 654,
      },
    ]
  },
  {
    email: 'wellness.haven@bazaarph.com',
    password: 'Seller123!',
    store_name: "Wellness Haven PH",
    business_name: 'Wellness Haven Health Products',
    store_description: 'Curated wellness and beauty products for your self-care journey. We offer organic, cruelty-free, and sustainable options for conscious consumers.',
    store_category: ['Beauty', 'Health', 'Wellness'],
    business_type: 'sole_proprietor',
    business_registration_number: 'DTI-2024-009012',
    tax_id_number: '345-678-901-002',
    business_address: '789 Eastwood City, Quezon City, Metro Manila 1110',
    city: 'Quezon City',
    province: 'Metro Manila',
    postal_code: '1110',
    bank_name: 'Metrobank',
    account_name: 'Angela Grace Reyes',
    account_number: '2345678901234',
    is_verified: true,
    approval_status: 'approved',
    rating: 4.9,
    total_sales: 12340,
    business_permit_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800',
    valid_id_url: 'https://images.unsplash.com/photo-1578774296842-c45e472b3571?w=800',
    products: [
      {
        name: 'Organic Vitamin C Serum',
        description: '20% Vitamin C with Hyaluronic Acid and Vitamin E. Brightens skin, reduces dark spots, and boosts collagen. Dermatologist tested.',
        price: 899,
        original_price: 1299,
        category: 'Beauty',
        colors: [],
        sizes: ['30ml', '60ml'],
        stock: 300,
        images: [
          'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
          'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
        rating: 4.9,
        sales_count: 3456,
      },
      {
        name: 'Natural Bamboo Yoga Block Set',
        description: 'Set of 2 eco-friendly bamboo yoga blocks. Lightweight yet sturdy, perfect for beginners and advanced practitioners.',
        price: 1299,
        original_price: 1699,
        category: 'Sports',
        colors: ['Natural Bamboo'],
        sizes: [],
        stock: 150,
        images: [
          'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
          'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
        rating: 4.8,
        sales_count: 876,
      },
      {
        name: 'Aromatherapy Essential Oil Set',
        description: '6-piece essential oil set including Lavender, Eucalyptus, Peppermint, Tea Tree, Lemon, and Orange. 100% pure therapeutic grade.',
        price: 1499,
        original_price: 1999,
        category: 'Beauty',
        colors: [],
        sizes: [],
        stock: 200,
        images: [
          'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800',
          'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800',
        rating: 4.7,
        sales_count: 1234,
      },
    ]
  },
  {
    email: 'home.essentials@bazaarph.com',
    password: 'Seller123!',
    store_name: "Home Essentials Co.",
    business_name: 'Home Essentials Trading Corp.',
    store_description: 'Transform your living space with our curated collection of home decor, kitchenware, and organizational solutions. Quality meets style.',
    store_category: ['Home & Living', 'Kitchen', 'Decor'],
    business_type: 'corporation',
    business_registration_number: 'SEC-2023-003456',
    tax_id_number: '456-789-012-003',
    business_address: '321 Ortigas Center, Pasig City, Metro Manila 1605',
    city: 'Pasig City',
    province: 'Metro Manila',
    postal_code: '1605',
    bank_name: 'UnionBank',
    account_name: 'Home Essentials Trading Corp.',
    account_number: '3456789012345',
    is_verified: true,
    approval_status: 'approved',
    rating: 4.7,
    total_sales: 9870,
    business_permit_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800',
    valid_id_url: 'https://images.unsplash.com/photo-1578774296842-c45e472b3571?w=800',
    products: [
      {
        name: 'Modern Ceramic Dinnerware Set',
        description: '16-piece dinnerware set for 4. Includes dinner plates, salad plates, bowls, and mugs. Microwave and dishwasher safe.',
        price: 3499,
        original_price: 4499,
        category: 'Kitchen',
        colors: ['Matte White', 'Sage Green', 'Dusty Pink', 'Charcoal'],
        sizes: [],
        stock: 50,
        images: [
          'https://images.unsplash.com/photo-1603199506016-5f36e6d4e1c6?w=800',
          'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1603199506016-5f36e6d4e1c6?w=800',
        rating: 4.8,
        sales_count: 567,
      },
      {
        name: 'Bamboo Storage Organizer Set',
        description: '5-piece bathroom organizer set made from sustainable bamboo. Includes soap dish, toothbrush holder, tissue box, and storage containers.',
        price: 1899,
        original_price: 2499,
        category: 'Home & Living',
        colors: ['Natural Bamboo'],
        sizes: [],
        stock: 100,
        images: [
          'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800',
          'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800',
        rating: 4.6,
        sales_count: 432,
      },
      {
        name: 'Premium Cotton Bed Sheet Set',
        description: '400 thread count 100% Egyptian cotton sheet set. Includes fitted sheet, flat sheet, and 2 pillowcases. Breathable and luxuriously soft.',
        price: 2999,
        original_price: 3999,
        category: 'Home & Living',
        colors: ['White', 'Ivory', 'Gray', 'Navy Blue'],
        sizes: ['Single', 'Double', 'Queen', 'King'],
        stock: 80,
        images: [
          'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
          'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
        rating: 4.9,
        sales_count: 789,
      },
    ]
  },
  {
    email: 'active.sports@bazaarph.com',
    password: 'Seller123!',
    store_name: "ActiveGear Sports",
    business_name: 'ActiveGear Sports Equipment Trading',
    store_description: 'Your ultimate destination for sports equipment, fitness gear, and athletic apparel. From beginners to pros, we have everything you need.',
    store_category: ['Sports', 'Fitness', 'Athletic Wear'],
    business_type: 'partnership',
    business_registration_number: 'DTI-2024-007890',
    tax_id_number: '567-890-123-004',
    business_address: '555 SM Mall of Asia Complex, Pasay City, Metro Manila 1300',
    city: 'Pasay City',
    province: 'Metro Manila',
    postal_code: '1300',
    bank_name: 'Security Bank',
    account_name: 'ActiveGear Sports Equipment Trading',
    account_number: '4567890123456',
    is_verified: true,
    approval_status: 'approved',
    rating: 4.8,
    total_sales: 18650,
    business_permit_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800',
    valid_id_url: 'https://images.unsplash.com/photo-1578774296842-c45e472b3571?w=800',
    products: [
      {
        name: 'Professional Basketball',
        description: 'Official size and weight basketball with premium composite leather. Superior grip and durability for indoor/outdoor play.',
        price: 1899,
        original_price: 2499,
        category: 'Sports',
        colors: ['Orange', 'Black/Gold'],
        sizes: ['Size 7', 'Size 6', 'Size 5'],
        stock: 200,
        images: [
          'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
          'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
        rating: 4.8,
        sales_count: 2341,
      },
      {
        name: 'Adjustable Dumbbell Set',
        description: '24kg adjustable dumbbell set with quick-change weight system. Space-saving design replaces 15 sets of weights.',
        price: 8999,
        original_price: 11999,
        category: 'Sports',
        colors: ['Black/Red'],
        sizes: [],
        stock: 40,
        images: [
          'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800',
          'https://images.unsplash.com/photo-1534368959876-26bf04f2c947?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800',
        rating: 4.9,
        sales_count: 876,
      },
      {
        name: 'Compression Athletic Wear Set',
        description: 'High-performance compression top and leggings. Moisture-wicking fabric with 4-way stretch for maximum mobility.',
        price: 1999,
        original_price: 2799,
        category: 'Sports',
        colors: ['Black', 'Navy', 'Gray', 'Red'],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        stock: 180,
        images: [
          'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800',
          'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800',
        rating: 4.7,
        sales_count: 1543,
      },
      {
        name: 'Premium Jump Rope Speed',
        description: 'Professional speed rope with ball bearings, adjustable cable, and comfortable foam handles. Perfect for HIIT and boxing training.',
        price: 699,
        original_price: 999,
        category: 'Sports',
        colors: ['Black', 'Blue', 'Pink'],
        sizes: [],
        stock: 250,
        images: [
          'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800',
          'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800'
        ],
        primary_image: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800',
        rating: 4.6,
        sales_count: 2156,
      },
    ]
  },
];

async function seedSellers() {
  console.log('============================================================');
  console.log('SEEDING VERIFIED SELLERS WITH PRODUCTS');
  console.log('============================================================\n');

  let sellersCreated = 0;
  let productsCreated = 0;
  const sellerCredentials: { email: string; password: string; store: string }[] = [];

  for (const seller of sellers) {
    console.log(`\n📦 Processing: ${seller.store_name}`);
    console.log('─'.repeat(50));

    // Check if seller already exists by store name
    const { data: existingSeller } = await supabase
      .from('sellers')
      .select('id, store_name')
      .eq('store_name', seller.store_name)
      .single();

    let sellerId: string;

    if (existingSeller) {
      console.log(`   ⏭️ Seller already exists: ${existingSeller.store_name}`);
      sellerId = existingSeller.id;
      
      // Update seller to be verified
      await supabase
        .from('sellers')
        .update({ 
          is_verified: true,
          approval_status: 'approved',
          rating: seller.rating,
          total_sales: seller.total_sales,
          business_permit_url: seller.business_permit_url,
          valid_id_url: seller.valid_id_url,
        })
        .eq('id', sellerId);
      console.log(`   ✅ Updated to verified/approved`);
    } else {
      // Try to sign in to get existing user ID, or create new user
      let userId: string | null = null;
      
      // First try to sign in (user might already exist from previous run)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: seller.email,
        password: seller.password,
      });

      if (signInData?.user) {
        userId = signInData.user.id;
        console.log(`   ✅ Signed in existing user: ${seller.email}`);
        // Sign out so we can continue
        await supabase.auth.signOut();
      } else {
        // Try to create new auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: seller.email,
          password: seller.password,
          options: {
            data: {
              full_name: seller.business_name,
              role: 'seller',
            }
          }
        });

        if (authError) {
          console.log(`   ⚠️ Auth creation failed: ${authError.message}`);
        } else if (authData.user) {
          userId = authData.user.id;
          console.log(`   ✅ Created auth user: ${seller.email}`);
        }
      }

      if (!userId) {
        console.log(`   ❌ Cannot create seller without user ID`);
        continue;
      }

      // Check if seller profile already exists for this user
      const { data: existingProfile } = await supabase
        .from('sellers')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        sellerId = existingProfile.id;
        console.log(`   ⏭️ Seller profile already exists for user`);
        
        // Update to verified
        await supabase
          .from('sellers')
          .update({ 
            is_verified: true,
            approval_status: 'approved',
            store_name: seller.store_name,
            business_name: seller.business_name,
            store_description: seller.store_description,
            rating: seller.rating,
            total_sales: seller.total_sales,
          })
          .eq('id', sellerId);
      } else {
        // Create seller profile with user ID as the seller ID
        const sellerData = {
          id: userId,
          store_name: seller.store_name,
          business_name: seller.business_name,
          store_description: seller.store_description,
          store_category: seller.store_category,
          business_type: seller.business_type,
          business_registration_number: seller.business_registration_number,
          tax_id_number: seller.tax_id_number,
          business_address: seller.business_address,
          city: seller.city,
          province: seller.province,
          postal_code: seller.postal_code,
          bank_name: seller.bank_name,
          account_name: seller.account_name,
          account_number: seller.account_number,
          is_verified: true,
          approval_status: 'approved',
          rating: seller.rating,
          total_sales: seller.total_sales,
          business_permit_url: seller.business_permit_url,
          valid_id_url: seller.valid_id_url,
          join_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: newSeller, error: sellerError } = await supabase
          .from('sellers')
          .insert(sellerData)
          .select('id')
          .single();

        if (sellerError) {
          console.log(`   ❌ Failed to create seller: ${sellerError.message}`);
          continue;
        }

        sellerId = newSeller.id;
        sellersCreated++;
        console.log(`   ✅ Created seller: ${seller.store_name}`);
      }
    }

    // Store credentials
    sellerCredentials.push({
      email: seller.email,
      password: seller.password,
      store: seller.store_name,
    });

    // Create products for this seller
    console.log(`   📦 Adding products...`);
    
    for (const product of seller.products) {
      // Check if product already exists
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('name', product.name)
        .eq('seller_id', sellerId)
        .single();

      if (existingProduct) {
        console.log(`      ⏭️ Product exists: ${product.name}`);
        continue;
      }

      const productData = {
        seller_id: sellerId,
        name: product.name,
        description: product.description,
        price: product.price,
        original_price: product.original_price,
        category: product.category,
        colors: product.colors,
        sizes: product.sizes,
        stock: product.stock,
        images: product.images,
        primary_image: product.primary_image,
        rating: product.rating,
        sales_count: product.sales_count,
        is_active: true,
        approval_status: 'approved',
        is_free_shipping: product.price > 2000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: productError } = await supabase
        .from('products')
        .insert(productData);

      if (productError) {
        console.log(`      ❌ Failed: ${product.name} - ${productError.message}`);
      } else {
        console.log(`      ✅ Added: ${product.name}`);
        productsCreated++;
      }
    }
  }

  // Summary
  console.log('\n============================================================');
  console.log('SEEDING COMPLETE');
  console.log('============================================================');
  console.log(`\n✅ Sellers created: ${sellersCreated}`);
  console.log(`✅ Products created: ${productsCreated}`);

  // Print credentials
  console.log('\n============================================================');
  console.log('SELLER CREDENTIALS (for testing)');
  console.log('============================================================\n');
  
  console.log('| Store Name                  | Email                          | Password    |');
  console.log('|----------------------------|--------------------------------|-------------|');
  
  for (const cred of sellerCredentials) {
    const storePad = cred.store.padEnd(27);
    const emailPad = cred.email.padEnd(30);
    console.log(`| ${storePad} | ${emailPad} | ${cred.password} |`);
  }

  // Verification stats
  const { count: verifiedSellers } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', true);

  const { count: approvedProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'approved');

  console.log('\n============================================================');
  console.log('DATABASE STATS');
  console.log('============================================================');
  console.log(`\n📊 Total verified sellers: ${verifiedSellers}`);
  console.log(`📦 Total approved products: ${approvedProducts}`);
}

seedSellers().catch(console.error);
