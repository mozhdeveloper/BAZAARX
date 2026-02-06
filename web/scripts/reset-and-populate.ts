/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║           BAZAARPH - COMPLETE DATA RESET & REPOPULATION                   ║
 * ║                   Clean slate with full complete data                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: CLEAN ALL DATA
// ═══════════════════════════════════════════════════════════════════════════

async function cleanAllData() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    STEP 1: CLEANING DATA                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const tables = [
    'order_items',
    'orders',
    'cart_items',
    'carts',
    'product_reviews',
    'product_images',
    'product_variants',
    'products',
    'seller_payout_accounts',
    'seller_business_profiles',
    'sellers',
    'buyers',
    'user_roles',
    'profiles',
    'vouchers',
    'categories',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(`  ${error ? '❌' : '✅'} ${table}: ${error?.message || 'Cleared'}`);
  }

  console.log('\n  ✅ Data cleanup complete!\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: CREATE CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

async function createCategories() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                   STEP 2: CREATING CATEGORIES                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const categories = [
    { name: 'Electronics', slug: 'electronics', description: 'Smartphones, laptops, gadgets, and electronic accessories', icon: '📱', sort_order: 1 },
    { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes, bags, and fashion accessories for men and women', icon: '👗', sort_order: 2 },
    { name: 'Home & Living', slug: 'home-living', description: 'Furniture, home decor, kitchenware, and household essentials', icon: '🏠', sort_order: 3 },
    { name: 'Beauty & Health', slug: 'beauty-health', description: 'Skincare, cosmetics, wellness products, and personal care', icon: '💄', sort_order: 4 },
    { name: 'Food & Beverages', slug: 'food-beverages', description: 'Snacks, drinks, groceries, and gourmet food items', icon: '🍕', sort_order: 5 },
    { name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Fitness equipment, sportswear, and outdoor gear', icon: '⚽', sort_order: 6 },
    { name: 'Books & Stationery', slug: 'books-stationery', description: 'Books, office supplies, art materials, and school essentials', icon: '📚', sort_order: 7 },
    { name: 'Toys & Games', slug: 'toys-games', description: 'Toys, board games, puzzles, and entertainment for all ages', icon: '🎮', sort_order: 8 },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categories) {
    const { data, error } = await supabase.from('categories').insert(cat).select().single();
    if (data) categoryMap[cat.slug] = data.id;
    console.log(`  ${error ? '❌' : '✅'} ${cat.name}: ${error?.message || data?.id.substring(0, 8) + '...'}`);
  }

  return categoryMap;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: CREATE SELLERS WITH COMPLETE PROFILES
// ═══════════════════════════════════════════════════════════════════════════

async function createSellers() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              STEP 3: CREATING SELLERS (COMPLETE)               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const sellers = [
    {
      auth: { email: 'seller1@bazaarph.com', password: 'Seller123!' },
      profile: {
        first_name: 'Miguel',
        last_name: 'Reyes',
        phone: '+639171234567',
        avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg',
      },
      seller: {
        store_name: 'TechHub Manila',
        store_description: 'Your premier destination for authentic electronics and gadgets. We offer the latest smartphones, laptops, accessories, and smart home devices with official warranty and after-sales support.',
        owner_name: 'Miguel Reyes',
        store_logo: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200',
        store_banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
        approval_status: 'verified',
        verified_at: new Date().toISOString(),
      },
      business: {
        business_type: 'corporation',
        business_registration_number: 'SEC-2023-001234',
        tax_id_number: '123-456-789-000',
        address_line_1: '123 Ayala Avenue, Makati Central Business District',
        address_line_2: 'Unit 1205, Tower One',
        city: 'Makati City',
        province: 'Metro Manila',
        postal_code: '1226',
      },
      payout: {
        bank_name: 'BDO Unibank',
        account_name: 'TechHub Manila Inc.',
        account_number: '001234567890',
      },
    },
    {
      auth: { email: 'seller2@bazaarph.com', password: 'Seller123!' },
      profile: {
        first_name: 'Isabella',
        last_name: 'Santos',
        phone: '+639182345678',
        avatar_url: 'https://randomuser.me/api/portraits/women/44.jpg',
      },
      seller: {
        store_name: 'Fashion Forward PH',
        store_description: 'Trendy and affordable fashion for the modern Filipino. From casual everyday wear to statement pieces, we curate the best styles from local and international brands.',
        owner_name: 'Isabella Santos',
        store_logo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200',
        store_banner: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800',
        approval_status: 'verified',
        verified_at: new Date().toISOString(),
      },
      business: {
        business_type: 'sole_proprietorship',
        business_registration_number: 'DTI-NCR-2023-56789',
        tax_id_number: '234-567-890-000',
        address_line_1: '456 Commonwealth Avenue',
        address_line_2: 'Fairview Terraces Mall',
        city: 'Quezon City',
        province: 'Metro Manila',
        postal_code: '1118',
      },
      payout: {
        bank_name: 'BPI',
        account_name: 'Isabella Santos',
        account_number: '9876543210',
      },
    },
    {
      auth: { email: 'seller3@bazaarph.com', password: 'Seller123!' },
      profile: {
        first_name: 'Carlos',
        last_name: 'Dela Cruz',
        phone: '+639193456789',
        avatar_url: 'https://randomuser.me/api/portraits/men/67.jpg',
      },
      seller: {
        store_name: 'Home & Living Co.',
        store_description: 'Transform your house into a home with our carefully selected furniture, decor, and lifestyle products. We believe in quality craftsmanship and sustainable materials.',
        owner_name: 'Carlos Dela Cruz',
        store_logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
        store_banner: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800',
        approval_status: 'verified',
        verified_at: new Date().toISOString(),
      },
      business: {
        business_type: 'partnership',
        business_registration_number: 'SEC-2024-003456',
        tax_id_number: '345-678-901-000',
        address_line_1: '789 Ortigas Avenue, Ortigas Center',
        address_line_2: 'SM Megamall Building B',
        city: 'Pasig City',
        province: 'Metro Manila',
        postal_code: '1605',
      },
      payout: {
        bank_name: 'Metrobank',
        account_name: 'Home & Living Co.',
        account_number: '003456789012',
      },
    },
  ];

  const sellerMap: Record<string, string> = {};

  for (const s of sellers) {
    console.log(`\n  👔 Creating ${s.seller.store_name}...`);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp(s.auth);
    if (authError) {
      // Try sign in if already exists
      const { data: signIn } = await supabase.auth.signInWithPassword(s.auth);
      if (signIn.user) {
        console.log(`    ✅ Auth: Existing user ${signIn.user.id.substring(0, 8)}...`);
        sellerMap[s.auth.email] = signIn.user.id;
      } else {
        console.log(`    ❌ Auth: ${authError.message}`);
        continue;
      }
    } else if (authData.user) {
      sellerMap[s.auth.email] = authData.user.id;
      console.log(`    ✅ Auth: ${authData.user.id.substring(0, 8)}...`);
    }

    const userId = sellerMap[s.auth.email];
    if (!userId) continue;

    // Create profile
    await supabase.from('profiles').upsert({ id: userId, email: s.auth.email, ...s.profile });
    console.log(`    ✅ Profile: ${s.profile.first_name} ${s.profile.last_name}`);

    // Create user role
    await supabase.from('user_roles').upsert({ user_id: userId, role: 'seller' });
    console.log(`    ✅ Role: seller`);

    // Create seller
    await supabase.from('sellers').upsert({ id: userId, ...s.seller });
    console.log(`    ✅ Seller: ${s.seller.store_name}`);

    // Create business profile
    await supabase.from('seller_business_profiles').upsert({ seller_id: userId, ...s.business });
    console.log(`    ✅ Business: ${s.business.city}`);

    // Create payout account
    await supabase.from('seller_payout_accounts').upsert({ seller_id: userId, ...s.payout });
    console.log(`    ✅ Payout: ${s.payout.bank_name}`);

    await delay(1000);
  }

  await supabase.auth.signOut();
  return sellerMap;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: CREATE BUYERS WITH COMPLETE PROFILES
// ═══════════════════════════════════════════════════════════════════════════

async function createBuyers() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║               STEP 4: CREATING BUYERS (COMPLETE)               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const buyers = [
    {
      auth: { email: 'buyer1@bazaarph.com', password: 'Buyer123!' },
      profile: {
        first_name: 'Ana',
        last_name: 'Santos',
        phone: '+639201234567',
        avatar_url: 'https://randomuser.me/api/portraits/women/28.jpg',
      },
      buyer: {
        bazcoins: 500,
        preferences: {
          notifications: { email: true, sms: true, push: true },
          interests: ['electronics', 'fashion'],
          newsletter: true,
        },
      },
      addresses: [
        {
          label: 'Home',
          recipient_name: 'Ana Santos',
          phone: '+639201234567',
          address_line_1: '123 Mabini Street, Brgy. San Antonio',
          city: 'Parañaque City',
          province: 'Metro Manila',
          postal_code: '1700',
          is_default: true,
        },
        {
          label: 'Office',
          recipient_name: 'Ana Santos',
          phone: '+639201234567',
          address_line_1: 'BGC Corporate Center, 30th Street',
          city: 'Taguig City',
          province: 'Metro Manila',
          postal_code: '1634',
          is_default: false,
        },
      ],
    },
    {
      auth: { email: 'buyer2@bazaarph.com', password: 'Buyer123!' },
      profile: {
        first_name: 'Juan',
        last_name: 'Cruz',
        phone: '+639212345678',
        avatar_url: 'https://randomuser.me/api/portraits/men/45.jpg',
      },
      buyer: {
        bazcoins: 1000,
        preferences: {
          notifications: { email: true, sms: false, push: true },
          interests: ['sports', 'electronics'],
          newsletter: false,
        },
      },
      addresses: [
        {
          label: 'Home',
          recipient_name: 'Juan Cruz',
          phone: '+639212345678',
          address_line_1: '456 Rizal Avenue, Brgy. Poblacion',
          city: 'Mandaluyong City',
          province: 'Metro Manila',
          postal_code: '1550',
          is_default: true,
        },
      ],
    },
    {
      auth: { email: 'buyer3@bazaarph.com', password: 'Buyer123!' },
      profile: {
        first_name: 'Maria',
        last_name: 'Garcia',
        phone: '+639223456789',
        avatar_url: 'https://randomuser.me/api/portraits/women/65.jpg',
      },
      buyer: {
        bazcoins: 250,
        preferences: {
          notifications: { email: true, sms: true, push: false },
          interests: ['home-living', 'beauty-health'],
          newsletter: true,
        },
      },
      addresses: [
        {
          label: 'Home',
          recipient_name: 'Maria Garcia',
          phone: '+639223456789',
          address_line_1: '789 Shaw Boulevard, Brgy. Wack-Wack',
          city: 'Pasig City',
          province: 'Metro Manila',
          postal_code: '1600',
          is_default: true,
        },
      ],
    },
  ];

  const buyerMap: Record<string, string> = {};

  for (const b of buyers) {
    console.log(`\n  🛒 Creating ${b.profile.first_name} ${b.profile.last_name}...`);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp(b.auth);
    if (authError) {
      const { data: signIn } = await supabase.auth.signInWithPassword(b.auth);
      if (signIn.user) {
        buyerMap[b.auth.email] = signIn.user.id;
        console.log(`    ✅ Auth: Existing user`);
      } else {
        console.log(`    ❌ Auth: ${authError.message}`);
        continue;
      }
    } else if (authData.user) {
      buyerMap[b.auth.email] = authData.user.id;
      console.log(`    ✅ Auth: ${authData.user.id.substring(0, 8)}...`);
    }

    const userId = buyerMap[b.auth.email];
    if (!userId) continue;

    // Create profile
    await supabase.from('profiles').upsert({ id: userId, email: b.auth.email, ...b.profile });
    console.log(`    ✅ Profile created`);

    // Create user role
    await supabase.from('user_roles').upsert({ user_id: userId, role: 'buyer' });
    console.log(`    ✅ Role: buyer`);

    // Create buyer
    await supabase.from('buyers').upsert({ id: userId, ...b.buyer });
    console.log(`    ✅ Buyer: ${b.buyer.bazcoins} BazCoins`);

    // Create addresses
    for (const addr of b.addresses) {
      await supabase.from('buyer_addresses').insert({ buyer_id: userId, ...addr });
      console.log(`    ✅ Address: ${addr.label}`);
    }

    // Create cart for buyer
    await supabase.from('carts').upsert({ buyer_id: userId });
    console.log(`    ✅ Cart created`);

    await delay(1000);
  }

  await supabase.auth.signOut();
  return buyerMap;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: CREATE ADMIN/QA USERS
// ═══════════════════════════════════════════════════════════════════════════

async function createAdminUsers() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                 STEP 5: CREATING ADMIN/QA USERS                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const admins = [
    {
      auth: { email: 'admin@bazaarph.com', password: 'Admin123!' },
      profile: { first_name: 'Admin', last_name: 'User', phone: '+639001234567' },
      role: 'admin',
    },
    {
      auth: { email: 'qa@bazaarph.com', password: 'QA123456!' },
      profile: { first_name: 'QA', last_name: 'Team', phone: '+639009876543' },
      role: 'admin', // QA uses admin role
    },
  ];

  for (const a of admins) {
    const { data: authData, error: authError } = await supabase.auth.signUp(a.auth);
    let userId: string | null = null;

    if (authError) {
      const { data: signIn } = await supabase.auth.signInWithPassword(a.auth);
      userId = signIn.user?.id || null;
    } else {
      userId = authData.user?.id || null;
    }

    if (userId) {
      await supabase.from('profiles').upsert({ id: userId, email: a.auth.email, ...a.profile });
      await supabase.from('user_roles').upsert({ user_id: userId, role: a.role });
      console.log(`  ✅ ${a.profile.first_name}: ${a.auth.email}`);
    } else {
      console.log(`  ❌ ${a.auth.email}: Failed to create`);
    }

    await delay(1000);
  }

  await supabase.auth.signOut();
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 6: CREATE PRODUCTS WITH COMPLETE DETAILS
// ═══════════════════════════════════════════════════════════════════════════

async function createProducts(categoryMap: Record<string, string>, sellerMap: Record<string, string>) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║             STEP 6: CREATING PRODUCTS (COMPLETE)               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const products = [
    // ══════════════════════════════════════════════════════════════════════
    // TECHHUB MANILA - ELECTRONICS
    // ══════════════════════════════════════════════════════════════════════
    {
      seller_email: 'seller1@bazaarph.com',
      product: {
        name: 'iPhone 15 Pro Max',
        description: `Experience the pinnacle of smartphone technology with the iPhone 15 Pro Max. Featuring the groundbreaking A17 Pro chip, this device delivers unprecedented performance for gaming, photography, and productivity.

KEY FEATURES:
• A17 Pro chip with 6-core GPU for console-level gaming
• 48MP Main camera with 5x optical zoom
• Action button for customizable shortcuts
• Titanium design - lighter and more durable
• USB-C with USB 3 speeds
• All-day battery life with fast charging

WHAT'S IN THE BOX:
• iPhone 15 Pro Max
• USB-C to USB-C cable
• Documentation`,
        price: 79990,
        category_slug: 'electronics',
        brand: 'Apple',
        sku: 'IPHONE15PM-256',
        tags: ['smartphone', 'apple', 'iphone', 'premium', '5g'],
      },
      variants: [
        { variant_name: '256GB - Natural Titanium', size: '256GB', color: 'Natural Titanium', price: 79990, stock: 25, sku: 'IP15PM-256-NAT' },
        { variant_name: '256GB - Blue Titanium', size: '256GB', color: 'Blue Titanium', price: 79990, stock: 20, sku: 'IP15PM-256-BLU' },
        { variant_name: '512GB - Natural Titanium', size: '512GB', color: 'Natural Titanium', price: 89990, stock: 15, sku: 'IP15PM-512-NAT' },
        { variant_name: '1TB - Black Titanium', size: '1TB', color: 'Black Titanium', price: 109990, stock: 10, sku: 'IP15PM-1TB-BLK' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800', is_primary: false },
        { url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800', is_primary: false },
      ],
    },
    {
      seller_email: 'seller1@bazaarph.com',
      product: {
        name: 'Samsung Galaxy S24 Ultra',
        description: `The Samsung Galaxy S24 Ultra redefines mobile AI with Galaxy AI built in. Capture stunning photos, communicate across languages in real-time, and experience the power of AI in your pocket.

KEY FEATURES:
• Galaxy AI for intelligent assistance
• 200MP camera with advanced Nightography
• S Pen built-in for productivity
• 6.8" QHD+ Dynamic AMOLED 2X display
• Titanium frame for durability
• 5000mAh battery with 45W fast charging

WHAT'S IN THE BOX:
• Galaxy S24 Ultra
• USB-C cable
• S Pen
• SIM ejector tool
• Quick start guide`,
        price: 69990,
        category_slug: 'electronics',
        brand: 'Samsung',
        sku: 'GALAXY-S24U-256',
        tags: ['smartphone', 'samsung', 'galaxy', 'android', '5g', 'ai'],
      },
      variants: [
        { variant_name: '256GB - Titanium Black', size: '256GB', color: 'Titanium Black', price: 69990, stock: 30, sku: 'S24U-256-BLK' },
        { variant_name: '256GB - Titanium Violet', size: '256GB', color: 'Titanium Violet', price: 69990, stock: 25, sku: 'S24U-256-VIO' },
        { variant_name: '512GB - Titanium Gray', size: '512GB', color: 'Titanium Gray', price: 79990, stock: 20, sku: 'S24U-512-GRY' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800', is_primary: false },
      ],
    },
    {
      seller_email: 'seller1@bazaarph.com',
      product: {
        name: 'Apple AirPods Pro (2nd Generation)',
        description: `Rebuilt from the sound up. AirPods Pro feature up to 2x more Active Noise Cancellation than the previous generation, plus Adaptive Transparency, and Personalized Spatial Audio with dynamic head tracking.

KEY FEATURES:
• Active Noise Cancellation up to 2x more effective
• Adaptive Transparency for natural listening
• Personalized Spatial Audio with dynamic head tracking
• Touch control for volume adjustment
• Up to 6 hours of listening time
• MagSafe Charging Case with speaker and lanyard loop

WHAT'S IN THE BOX:
• AirPods Pro
• MagSafe Charging Case
• Ear tips (XS, S, M, L)
• Lightning to USB-C cable
• Documentation`,
        price: 14990,
        category_slug: 'electronics',
        brand: 'Apple',
        sku: 'AIRPODS-PRO-2',
        tags: ['earbuds', 'apple', 'wireless', 'noise-cancellation'],
      },
      variants: [
        { variant_name: 'White', size: 'One Size', color: 'White', price: 14990, stock: 50, sku: 'APP2-WHT' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=800', is_primary: false },
      ],
    },
    {
      seller_email: 'seller1@bazaarph.com',
      product: {
        name: 'MacBook Air M3 (2024)',
        description: `Impossibly thin and light, MacBook Air is now supercharged by the M3 chip. With up to 18 hours of battery life and a silent, fanless design, you can work, create, and play anywhere.

KEY FEATURES:
• Apple M3 chip with 8-core CPU and up to 10-core GPU
• Up to 24GB unified memory
• Up to 18 hours battery life
• 13.6" Liquid Retina display
• 1080p FaceTime HD camera
• MagSafe charging
• Four stunning colors

WHAT'S IN THE BOX:
• MacBook Air
• 35W Dual USB-C Port Power Adapter
• USB-C to MagSafe 3 Cable
• Documentation`,
        price: 74990,
        category_slug: 'electronics',
        brand: 'Apple',
        sku: 'MBA-M3-13-8GB',
        tags: ['laptop', 'apple', 'macbook', 'ultrabook', 'm3'],
      },
      variants: [
        { variant_name: '8GB/256GB - Midnight', size: '8GB RAM', color: 'Midnight', price: 74990, stock: 15, sku: 'MBA-M3-8-256-MID' },
        { variant_name: '8GB/256GB - Starlight', size: '8GB RAM', color: 'Starlight', price: 74990, stock: 12, sku: 'MBA-M3-8-256-STR' },
        { variant_name: '16GB/512GB - Space Gray', size: '16GB RAM', color: 'Space Gray', price: 94990, stock: 8, sku: 'MBA-M3-16-512-GRY' },
        { variant_name: '24GB/1TB - Silver', size: '24GB RAM', color: 'Silver', price: 124990, stock: 5, sku: 'MBA-M3-24-1TB-SLV' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800', is_primary: false },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════
    // FASHION FORWARD PH - FASHION
    // ══════════════════════════════════════════════════════════════════════
    {
      seller_email: 'seller2@bazaarph.com',
      product: {
        name: 'Premium Cotton Polo Shirt',
        description: `Elevate your casual wardrobe with our Premium Cotton Polo. Crafted from 100% long-staple cotton, this polo offers exceptional softness and breathability perfect for the Philippine climate.

FEATURES:
• 100% premium long-staple cotton
• Classic fit with modern tailoring
• Ribbed collar and cuffs
• Three-button placket
• Side vents for comfort
• Pre-washed for softness

CARE INSTRUCTIONS:
• Machine wash cold with like colors
• Tumble dry low
• Warm iron if needed
• Do not bleach`,
        price: 899,
        category_slug: 'fashion',
        brand: 'Fashion Forward',
        sku: 'POLO-PREMIUM-001',
        tags: ['polo', 'shirt', 'cotton', 'casual', 'men'],
      },
      variants: [
        { variant_name: 'Small - Navy Blue', size: 'S', color: 'Navy Blue', price: 899, stock: 40, sku: 'POLO-S-NVY' },
        { variant_name: 'Medium - Navy Blue', size: 'M', color: 'Navy Blue', price: 899, stock: 50, sku: 'POLO-M-NVY' },
        { variant_name: 'Large - Navy Blue', size: 'L', color: 'Navy Blue', price: 899, stock: 45, sku: 'POLO-L-NVY' },
        { variant_name: 'Medium - White', size: 'M', color: 'White', price: 899, stock: 60, sku: 'POLO-M-WHT' },
        { variant_name: 'Large - White', size: 'L', color: 'White', price: 899, stock: 55, sku: 'POLO-L-WHT' },
        { variant_name: 'XL - Black', size: 'XL', color: 'Black', price: 899, stock: 35, sku: 'POLO-XL-BLK' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1625910513413-5fc5c89c77c4?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800', is_primary: false },
      ],
    },
    {
      seller_email: 'seller2@bazaarph.com',
      product: {
        name: 'Slim Fit Chino Pants',
        description: `Our best-selling Slim Fit Chinos combine style and comfort for the modern professional. Perfect for office wear or smart casual occasions.

FEATURES:
• 98% cotton, 2% spandex for stretch
• Slim fit with tapered leg
• Mid-rise waist
• Side pockets and back welt pockets
• Belt loops
• YKK zipper

SIZE GUIDE:
• Waist: Measure around natural waistline
• Inseam: Standard 32" (alteration available)

CARE:
• Machine wash cold
• Hang dry recommended`,
        price: 1299,
        category_slug: 'fashion',
        brand: 'Fashion Forward',
        sku: 'CHINO-SLIM-001',
        tags: ['pants', 'chino', 'slim-fit', 'office', 'men'],
      },
      variants: [
        { variant_name: '30 - Khaki', size: '30', color: 'Khaki', price: 1299, stock: 30, sku: 'CHINO-30-KHK' },
        { variant_name: '32 - Khaki', size: '32', color: 'Khaki', price: 1299, stock: 40, sku: 'CHINO-32-KHK' },
        { variant_name: '34 - Navy', size: '34', color: 'Navy', price: 1299, stock: 35, sku: 'CHINO-34-NVY' },
        { variant_name: '36 - Olive', size: '36', color: 'Olive', price: 1299, stock: 25, sku: 'CHINO-36-OLV' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800', is_primary: false },
      ],
    },
    {
      seller_email: 'seller2@bazaarph.com',
      product: {
        name: 'Floral Summer Dress',
        description: `Embrace the tropical vibes with our beautiful Floral Summer Dress. Light, flowy, and perfect for sunny days in the Philippines.

FEATURES:
• 100% viscose fabric
• Flattering A-line silhouette
• V-neckline with ruffled trim
• Adjustable spaghetti straps
• Smocked back for flexible fit
• Midi length

STYLING TIPS:
• Pair with sandals for beach days
• Add a denim jacket for cooler evenings
• Accessorize with rattan bag

CARE:
• Hand wash cold recommended
• Lay flat to dry`,
        price: 1599,
        category_slug: 'fashion',
        brand: 'Fashion Forward',
        sku: 'DRESS-FLORAL-001',
        tags: ['dress', 'summer', 'floral', 'women', 'casual'],
      },
      variants: [
        { variant_name: 'Small - Blue Floral', size: 'S', color: 'Blue Floral', price: 1599, stock: 25, sku: 'DRESS-S-BLU' },
        { variant_name: 'Medium - Blue Floral', size: 'M', color: 'Blue Floral', price: 1599, stock: 30, sku: 'DRESS-M-BLU' },
        { variant_name: 'Large - Pink Floral', size: 'L', color: 'Pink Floral', price: 1599, stock: 20, sku: 'DRESS-L-PNK' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800', is_primary: false },
      ],
    },
    {
      seller_email: 'seller2@bazaarph.com',
      product: {
        name: 'Canvas Sneakers Classic',
        description: `Timeless style meets everyday comfort. Our Canvas Sneakers Classic are perfect for any casual occasion - from mall trips to weekend hangouts.

FEATURES:
• Premium canvas upper
• Vulcanized rubber sole
• Cushioned insole
• Breathable cotton lining
• Classic lace-up design
• Reinforced toe cap

FIT GUIDE:
• True to size
• Wide feet: recommend sizing up

CARE:
• Spot clean with damp cloth
• Air dry only
• Use shoe deodorizer`,
        price: 1499,
        category_slug: 'fashion',
        brand: 'Fashion Forward',
        sku: 'SNEAKER-CANVAS-001',
        tags: ['shoes', 'sneakers', 'canvas', 'casual', 'unisex'],
      },
      variants: [
        { variant_name: 'US 7 - White', size: 'US 7', color: 'White', price: 1499, stock: 20, sku: 'SNK-7-WHT' },
        { variant_name: 'US 8 - White', size: 'US 8', color: 'White', price: 1499, stock: 25, sku: 'SNK-8-WHT' },
        { variant_name: 'US 9 - Black', size: 'US 9', color: 'Black', price: 1499, stock: 30, sku: 'SNK-9-BLK' },
        { variant_name: 'US 10 - Navy', size: 'US 10', color: 'Navy', price: 1499, stock: 20, sku: 'SNK-10-NVY' },
        { variant_name: 'US 11 - Red', size: 'US 11', color: 'Red', price: 1499, stock: 15, sku: 'SNK-11-RED' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800', is_primary: false },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════
    // HOME & LIVING CO. - HOME & LIVING + BEAUTY
    // ══════════════════════════════════════════════════════════════════════
    {
      seller_email: 'seller3@bazaarph.com',
      product: {
        name: 'Scandinavian Wooden Coffee Table',
        description: `Bring Nordic elegance to your living room with our Scandinavian Coffee Table. Handcrafted from sustainable acacia wood, each piece showcases unique natural grain patterns.

FEATURES:
• Solid acacia wood construction
• Natural wood grain finish
• Tapered legs for stability
• Rounded edges for safety
• Easy assembly (hardware included)
• Weight capacity: 50kg

DIMENSIONS:
• Length: 100cm
• Width: 50cm
• Height: 45cm

CARE:
• Wipe with dry or slightly damp cloth
• Use coasters for hot/cold beverages
• Avoid direct sunlight exposure`,
        price: 7999,
        category_slug: 'home-living',
        brand: 'Home & Living Co.',
        sku: 'TABLE-SCAND-001',
        tags: ['furniture', 'table', 'coffee-table', 'scandinavian', 'wood'],
      },
      variants: [
        { variant_name: 'Natural Oak', size: '100x50cm', color: 'Natural Oak', price: 7999, stock: 15, sku: 'TBL-NAT' },
        { variant_name: 'Walnut', size: '100x50cm', color: 'Walnut', price: 8499, stock: 10, sku: 'TBL-WAL' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800', is_primary: false },
      ],
    },
    {
      seller_email: 'seller3@bazaarph.com',
      product: {
        name: 'Premium Bedsheet Set (Queen)',
        description: `Experience hotel-quality comfort at home with our Premium Bedsheet Set. Made from 400-thread count Egyptian cotton, these sheets get softer with every wash.

INCLUDES:
• 1 Fitted sheet (150x200cm, 35cm depth)
• 1 Flat sheet (230x260cm)
• 2 Pillowcases (50x75cm)

FEATURES:
• 400-thread count Egyptian cotton
• Sateen weave for silky feel
• Deep pockets for thick mattresses
• All-around elastic on fitted sheet
• OEKO-TEX certified

CARE:
• Machine wash warm
• Tumble dry low
• Warm iron for crisp look`,
        price: 2999,
        category_slug: 'home-living',
        brand: 'Home & Living Co.',
        sku: 'BEDSHEET-QUEEN-001',
        tags: ['bedding', 'sheets', 'bedroom', 'cotton', 'queen'],
      },
      variants: [
        { variant_name: 'Pure White', size: 'Queen', color: 'White', price: 2999, stock: 30, sku: 'BED-Q-WHT' },
        { variant_name: 'Cloud Gray', size: 'Queen', color: 'Gray', price: 2999, stock: 25, sku: 'BED-Q-GRY' },
        { variant_name: 'Navy Blue', size: 'Queen', color: 'Navy', price: 2999, stock: 20, sku: 'BED-Q-NVY' },
        { variant_name: 'Sage Green', size: 'Queen', color: 'Sage', price: 3299, stock: 15, sku: 'BED-Q-SGE' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800', is_primary: false },
      ],
    },
    {
      seller_email: 'seller3@bazaarph.com',
      product: {
        name: 'Ceramic Plant Pot Set (3 pcs)',
        description: `Add life to your space with our elegant Ceramic Plant Pot Set. Perfect for indoor plants, succulents, or herbs, these pots feature drainage holes and matching saucers.

INCLUDES:
• Small pot: 10cm diameter
• Medium pot: 15cm diameter
• Large pot: 20cm diameter
• 3 matching saucers

FEATURES:
• High-fired ceramic
• Drainage holes
• Matte glaze finish
• Stackable design
• Indoor/outdoor use

PLANT SUGGESTIONS:
• Succulents
• Snake plants
• Pothos
• Herbs`,
        price: 1299,
        category_slug: 'home-living',
        brand: 'Home & Living Co.',
        sku: 'POT-CERAMIC-SET',
        tags: ['plants', 'pots', 'ceramic', 'home-decor', 'garden'],
      },
      variants: [
        { variant_name: 'Matte White', size: 'Set of 3', color: 'White', price: 1299, stock: 40, sku: 'POT-SET-WHT' },
        { variant_name: 'Terracotta', size: 'Set of 3', color: 'Terracotta', price: 1299, stock: 35, sku: 'POT-SET-TER' },
        { variant_name: 'Charcoal Gray', size: 'Set of 3', color: 'Gray', price: 1399, stock: 25, sku: 'POT-SET-GRY' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800', is_primary: false },
      ],
    },
    {
      seller_email: 'seller3@bazaarph.com',
      product: {
        name: 'LED Smart Ceiling Light',
        description: `Illuminate your home with our Smart LED Ceiling Light. Control brightness and color temperature with the included remote or your smartphone via the free app.

FEATURES:
• Dimmable: 10-100% brightness
• Color temperature: 2700K-6500K
• WiFi enabled (works with app)
• Voice control compatible (Alexa, Google)
• Memory function
• Timer/schedule feature
• Energy efficient LED

SPECIFICATIONS:
• Power: 36W
• Lumens: 3600lm
• Diameter: 50cm
• Lifespan: 50,000 hours

INCLUDES:
• LED ceiling light
• Remote control
• Mounting hardware
• User manual`,
        price: 3499,
        category_slug: 'home-living',
        brand: 'Home & Living Co.',
        sku: 'LIGHT-LED-SMART',
        tags: ['lighting', 'led', 'smart-home', 'ceiling-light', 'wifi'],
      },
      variants: [
        { variant_name: '36W - Warm/Cool White', size: '50cm', color: 'White', price: 3499, stock: 25, sku: 'LED-36W-WHT' },
        { variant_name: '36W - RGB', size: '50cm', color: 'RGB', price: 3999, stock: 15, sku: 'LED-36W-RGB' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=800', is_primary: false },
      ],
    },
    {
      seller_email: 'seller3@bazaarph.com',
      product: {
        name: 'Aromatherapy Essential Oil Diffuser',
        description: `Create a relaxing atmosphere with our ultrasonic Essential Oil Diffuser. Perfect for bedrooms, living rooms, or offices.

FEATURES:
• 300ml water capacity
• Ultrasonic technology (whisper quiet)
• 7 LED mood lights
• Auto shut-off when empty
• Timer: 1H/3H/6H/Continuous
• Covers up to 30 sqm

INCLUDES:
• Diffuser unit
• Power adapter
• Measuring cup
• User manual

RECOMMENDED OILS:
• Lavender for relaxation
• Eucalyptus for clarity
• Peppermint for energy
• Citrus for mood boost`,
        price: 1499,
        category_slug: 'beauty-health',
        brand: 'Home & Living Co.',
        sku: 'DIFFUSER-AROMA-001',
        tags: ['aromatherapy', 'diffuser', 'wellness', 'home-spa', 'relaxation'],
      },
      variants: [
        { variant_name: 'Wood Grain', size: '300ml', color: 'Wood Grain', price: 1499, stock: 45, sku: 'DIFF-WOOD' },
        { variant_name: 'White Marble', size: '300ml', color: 'White Marble', price: 1599, stock: 35, sku: 'DIFF-MARBLE' },
        { variant_name: 'Matte Black', size: '300ml', color: 'Black', price: 1499, stock: 30, sku: 'DIFF-BLK' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800', is_primary: false },
      ],
    },
    {
      seller_email: 'seller3@bazaarph.com',
      product: {
        name: 'Organic Bamboo Bath Towel Set',
        description: `Wrap yourself in luxury with our Organic Bamboo Towels. Naturally antibacterial, hypoallergenic, and incredibly soft - perfect for sensitive skin.

INCLUDES:
• 2 Bath towels (70x140cm)
• 2 Hand towels (40x70cm)
• 2 Face towels (30x30cm)

FEATURES:
• 100% organic bamboo fiber
• 600 GSM for plush feel
• Naturally antibacterial
• Highly absorbent
• Quick drying
• Eco-friendly & sustainable
• OEKO-TEX certified

CARE:
• Machine wash warm
• No fabric softener needed
• Tumble dry low`,
        price: 1899,
        category_slug: 'home-living',
        brand: 'Home & Living Co.',
        sku: 'TOWEL-BAMBOO-SET',
        tags: ['towels', 'bamboo', 'organic', 'bathroom', 'eco-friendly'],
      },
      variants: [
        { variant_name: 'Pure White', size: '6-piece set', color: 'White', price: 1899, stock: 35, sku: 'TWL-SET-WHT' },
        { variant_name: 'Cloud Gray', size: '6-piece set', color: 'Gray', price: 1899, stock: 30, sku: 'TWL-SET-GRY' },
        { variant_name: 'Sage Green', size: '6-piece set', color: 'Sage', price: 1899, stock: 25, sku: 'TWL-SET-SGE' },
        { variant_name: 'Blush Pink', size: '6-piece set', color: 'Pink', price: 1899, stock: 20, sku: 'TWL-SET-PNK' },
      ],
      images: [
        { url: 'https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=800', is_primary: true },
        { url: 'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=800', is_primary: false },
      ],
    },
  ];

  const productMap: Record<string, string> = {};

  for (const p of products) {
    const sellerId = sellerMap[p.seller_email];
    const categoryId = categoryMap[p.product.category_slug];

    if (!sellerId || !categoryId) {
      console.log(`  ❌ ${p.product.name}: Missing seller or category`);
      continue;
    }

    console.log(`\n  📦 ${p.product.name}`);

    // Create product (QA APPROVED)
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: p.product.name,
        description: p.product.description,
        price: p.product.price,
        category_id: categoryId,
        seller_id: sellerId,
        brand: p.product.brand,
        sku: p.product.sku,
        approval_status: 'approved', // QA APPROVED
        approved_at: new Date().toISOString(),
        approved_by: 'system',
        tags: p.product.tags,
      })
      .select()
      .single();

    if (error || !product) {
      console.log(`    ❌ Product: ${error?.message}`);
      continue;
    }

    productMap[p.product.sku] = product.id;
    console.log(`    ✅ Product created (approved)`);

    // Create variants
    let totalStock = 0;
    for (const v of p.variants) {
      const { error: vError } = await supabase.from('product_variants').insert({
        product_id: product.id,
        ...v,
      });
      if (!vError) totalStock += v.stock;
    }
    console.log(`    ✅ ${p.variants.length} variants (${totalStock} total stock)`);

    // Create images
    for (let i = 0; i < p.images.length; i++) {
      await supabase.from('product_images').insert({
        product_id: product.id,
        image_url: p.images[i].url,
        is_primary: p.images[i].is_primary,
        sort_order: i,
      });
    }
    console.log(`    ✅ ${p.images.length} images`);
  }

  return productMap;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 7: CREATE PRODUCT REVIEWS
// ═══════════════════════════════════════════════════════════════════════════

async function createReviews(productMap: Record<string, string>, buyerMap: Record<string, string>) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                  STEP 7: CREATING REVIEWS                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const reviews = [
    // iPhone reviews
    { sku: 'IPHONE15PM-256', buyer: 'buyer1@bazaarph.com', rating: 5, title: 'Best iPhone Ever!', comment: 'The camera is absolutely incredible. The titanium design is so premium. Highly recommend!' },
    { sku: 'IPHONE15PM-256', buyer: 'buyer2@bazaarph.com', rating: 4, title: 'Great but pricey', comment: 'Amazing phone with top-notch performance. Only concern is the price but it\'s worth it.' },
    
    // Samsung reviews
    { sku: 'GALAXY-S24U-256', buyer: 'buyer3@bazaarph.com', rating: 5, title: 'Galaxy AI is amazing', comment: 'The AI features are game-changing. Translation feature helped me so much during travel!' },
    { sku: 'GALAXY-S24U-256', buyer: 'buyer1@bazaarph.com', rating: 5, title: 'Perfect work phone', comment: 'S Pen integration is perfect for note-taking. Battery lasts all day.' },
    
    // AirPods reviews
    { sku: 'AIRPODS-PRO-2', buyer: 'buyer2@bazaarph.com', rating: 5, title: 'Noise cancellation is insane', comment: 'Can\'t hear anything when NC is on. Perfect for commuting in EDSA traffic!' },
    
    // MacBook reviews
    { sku: 'MBA-M3-13-8GB', buyer: 'buyer3@bazaarph.com', rating: 5, title: 'Silent and powerful', comment: 'No fan noise at all. Battery lasts forever. Perfect for work from home setup.' },
    
    // Fashion reviews
    { sku: 'POLO-PREMIUM-001', buyer: 'buyer1@bazaarph.com', rating: 5, title: 'Super comfortable', comment: 'Best polo I\'ve ever owned. The cotton is so soft and breathable.' },
    { sku: 'POLO-PREMIUM-001', buyer: 'buyer2@bazaarph.com', rating: 4, title: 'Good quality', comment: 'Nice fit and material. Wish there were more color options.' },
    { sku: 'CHINO-SLIM-001', buyer: 'buyer3@bazaarph.com', rating: 5, title: 'Perfect for office', comment: 'Great fit, comfortable all day. Already ordered more colors!' },
    { sku: 'DRESS-FLORAL-001', buyer: 'buyer1@bazaarph.com', rating: 5, title: 'Love the print!', comment: 'So pretty and flowy. Perfect for Sunday brunches!' },
    { sku: 'SNEAKER-CANVAS-001', buyer: 'buyer2@bazaarph.com', rating: 4, title: 'Classic and comfy', comment: 'Goes with everything. True to size. Very comfortable.' },
    
    // Home & Living reviews
    { sku: 'TABLE-SCAND-001', buyer: 'buyer3@bazaarph.com', rating: 5, title: 'Beautiful craftsmanship', comment: 'The wood grain is gorgeous. Assembly was easy. Looks even better in person!' },
    { sku: 'BEDSHEET-QUEEN-001', buyer: 'buyer1@bazaarph.com', rating: 5, title: 'Hotel quality at home', comment: 'So silky smooth! Best sleep I\'ve had. Gets softer every wash.' },
    { sku: 'POT-CERAMIC-SET', buyer: 'buyer2@bazaarph.com', rating: 5, title: 'Perfect for my plants', comment: 'Beautiful pots with great drainage. My succulents are thriving!' },
    { sku: 'LIGHT-LED-SMART', buyer: 'buyer3@bazaarph.com', rating: 4, title: 'Great smart light', comment: 'App control works well. Love the dimming feature. Bright enough for living room.' },
    { sku: 'DIFFUSER-AROMA-001', buyer: 'buyer1@bazaarph.com', rating: 5, title: 'So relaxing', comment: 'Use it every night. The mist is fine and quiet. LED colors are pretty!' },
    { sku: 'TOWEL-BAMBOO-SET', buyer: 'buyer2@bazaarph.com', rating: 5, title: 'Softest towels ever', comment: 'Incredibly soft and absorbent. Dries quickly too. Worth every peso!' },
  ];

  for (const r of reviews) {
    const productId = productMap[r.sku];
    const buyerId = buyerMap[r.buyer];

    if (!productId || !buyerId) continue;

    const { error } = await supabase.from('product_reviews').insert({
      product_id: productId,
      buyer_id: buyerId,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      is_verified_purchase: true,
      status: 'approved',
    });

    console.log(`  ${error ? '❌' : '✅'} ${r.sku.substring(0, 15)}: "${r.title}" (${r.rating}★)`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 8: CREATE VOUCHERS
// ═══════════════════════════════════════════════════════════════════════════

async function createVouchers() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                   STEP 8: CREATING VOUCHERS                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const vouchers = [
    {
      code: 'WELCOME10',
      title: 'Welcome 10% Off',
      description: 'Get 10% off on your first order! Valid for new customers.',
      voucher_type: 'percentage',
      value: 10,
      min_order_value: 500,
      max_discount: 200,
      is_active: true,
      claimable_from: '2024-01-01T00:00:00.000Z',
      claimable_until: '2026-12-31T23:59:59.000Z',
      usage_limit: 1000,
      claim_limit: 1,
      duration: 30,
    },
    {
      code: 'BAZAAR50',
      title: '₱50 Off',
      description: 'Get ₱50 off on orders ₱500 and above.',
      voucher_type: 'fixed',
      value: 50,
      min_order_value: 500,
      is_active: true,
      claimable_from: '2024-01-01T00:00:00.000Z',
      claimable_until: '2026-12-31T23:59:59.000Z',
      usage_limit: 500,
      claim_limit: 3,
      duration: 30,
    },
    {
      code: 'SAVE20',
      title: 'Save 20% Today',
      description: 'Limited time offer! Get 20% off on orders ₱2000 and above.',
      voucher_type: 'percentage',
      value: 20,
      min_order_value: 2000,
      max_discount: 500,
      is_active: true,
      claimable_from: '2024-01-01T00:00:00.000Z',
      claimable_until: '2026-12-31T23:59:59.000Z',
      usage_limit: 200,
      claim_limit: 1,
      duration: 7,
    },
    {
      code: 'TECH15',
      title: '15% Off Electronics',
      description: 'Special discount for electronics category.',
      voucher_type: 'percentage',
      value: 15,
      min_order_value: 5000,
      max_discount: 1000,
      is_active: true,
      claimable_from: '2024-01-01T00:00:00.000Z',
      claimable_until: '2026-12-31T23:59:59.000Z',
      usage_limit: 100,
      claim_limit: 1,
      duration: 14,
    },
  ];

  for (const v of vouchers) {
    const { error } = await supabase.from('vouchers').upsert(v, { onConflict: 'code' });
    const discount = v.voucher_type === 'percentage' ? `${v.value}%` : `₱${v.value}`;
    console.log(`  ${error ? '❌' : '✅'} ${v.code}: ${discount} off (min ₱${v.min_order_value})`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║           BAZAARPH - COMPLETE DATA RESET & REPOPULATION                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  // Step 1: Clean all data
  await cleanAllData();

  // Step 2: Create categories
  const categoryMap = await createCategories();

  // Step 3: Create sellers
  const sellerMap = await createSellers();

  // Step 4: Create buyers
  const buyerMap = await createBuyers();

  // Step 5: Create admin users
  await createAdminUsers();

  // Step 6: Create products
  const productMap = await createProducts(categoryMap, sellerMap);

  // Step 7: Create reviews
  await createReviews(productMap, buyerMap);

  // Step 8: Create vouchers
  await createVouchers();

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         POPULATION COMPLETE                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log(`
  📊 SUMMARY:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Categories:     ${Object.keys(categoryMap).length}
  ✅ Sellers:        ${Object.keys(sellerMap).length}
  ✅ Buyers:         ${Object.keys(buyerMap).length}
  ✅ Products:       ${Object.keys(productMap).length}
  ✅ Reviews:        17
  ✅ Vouchers:       4
  ⏱️  Duration:      ${duration}s
  `);

  console.log('  🔑 TEST ACCOUNTS:');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Sellers (Password: Seller123!)');
  console.log('    • seller1@bazaarph.com - TechHub Manila');
  console.log('    • seller2@bazaarph.com - Fashion Forward PH');
  console.log('    • seller3@bazaarph.com - Home & Living Co.');
  console.log('');
  console.log('  Buyers (Password: Buyer123!)');
  console.log('    • buyer1@bazaarph.com - Ana Santos (500 coins)');
  console.log('    • buyer2@bazaarph.com - Juan Cruz (1000 coins)');
  console.log('    • buyer3@bazaarph.com - Maria Garcia (250 coins)');
  console.log('');
  console.log('  Admin (Password: Admin123!)');
  console.log('    • admin@bazaarph.com');
  console.log('    • qa@bazaarph.com');
  console.log('');
}

main().catch(console.error);
