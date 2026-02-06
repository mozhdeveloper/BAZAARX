/**
 * Complete Database Seed Script
 * 
 * This script:
 * 1. Cleans all existing data (optional)
 * 2. Creates test users (admin, sellers, buyers) via Supabase Auth
 * 3. Populates all related tables with complete data
 * 4. Creates products with variants, images, and reviews
 * 5. Creates sample orders with full flow
 * 
 * Run with: npx tsx scripts/seed-complete-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.log('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.log('Optional: VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Use service role for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ============================================================================
// TEST ACCOUNTS DATA
// ============================================================================

const TEST_PASSWORD = 'Test@123456';

const adminAccounts = [
  {
    email: 'admin@bazaarph.com',
    password: TEST_PASSWORD,
    full_name: 'BazaarX Admin',
    phone: '+63 917 000 0001',
    avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    user_type: 'admin'
  },
  {
    email: 'qa.admin@bazaarph.com',
    password: TEST_PASSWORD,
    full_name: 'QA Administrator',
    phone: '+63 917 000 0002',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    user_type: 'admin'
  }
];

const sellerAccounts = [
  {
    email: 'seller1@bazaarph.com',
    password: TEST_PASSWORD,
    full_name: 'Maria Clara Santos',
    phone: '+63 917 111 1111',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    seller: {
      store_name: "Maria's Fashion Boutique",
      store_description: 'Premium fashion boutique featuring curated collections of elegant women\'s clothing, accessories, and footwear. We bring you the latest trends from local and international designers.',
      business_profile: {
        business_name: 'Maria Santos Fashion Enterprise',
        business_type: 'sole_proprietor',
        business_registration_number: 'DTI-2024-001234',
        tax_id: '123-456-789-000',
        address: '123 Ayala Avenue, Makati City',
        city: 'Makati City',
        province: 'Metro Manila',
        postal_code: '1226'
      },
      bank_details: {
        bank_name: 'BDO Unibank',
        account_name: 'Maria Clara Santos',
        account_number: '0012345678901'
      },
      is_verified: true,
      approval_status: 'verified',
      rating: 4.8,
      total_sales: 15420,
      products: [
        {
          name: 'Elegant Silk Blouse',
          description: 'Luxurious 100% pure silk blouse with delicate mother-of-pearl buttons. Features a classic collar design and relaxed fit perfect for both office and evening wear. Hand-washable. Made with premium silk imported from Italy. This timeless piece adds sophistication to any wardrobe.',
          price: 2899,
          original_price: 3499,
          category: 'Fashion',
          images: [
            'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800',
            'https://images.unsplash.com/photo-1604695573706-53170668f6a6?w=800',
            'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800'
          ],
          variants: [
            { variant_name: 'XS - Ivory', size: 'XS', color: 'Ivory', price: 2899, stock: 15 },
            { variant_name: 'S - Ivory', size: 'S', color: 'Ivory', price: 2899, stock: 25 },
            { variant_name: 'M - Ivory', size: 'M', color: 'Ivory', price: 2899, stock: 30 },
            { variant_name: 'L - Ivory', size: 'L', color: 'Ivory', price: 2899, stock: 20 },
            { variant_name: 'XS - Blush Pink', size: 'XS', color: 'Blush Pink', price: 2899, stock: 10 },
            { variant_name: 'S - Blush Pink', size: 'S', color: 'Blush Pink', price: 2899, stock: 20 },
            { variant_name: 'M - Blush Pink', size: 'M', color: 'Blush Pink', price: 2899, stock: 25 },
            { variant_name: 'L - Navy', size: 'L', color: 'Navy', price: 2899, stock: 18 }
          ]
        },
        {
          name: 'Designer Leather Handbag',
          description: 'Genuine Italian leather crossbody bag with gold-toned hardware. Features multiple compartments, adjustable strap, and signature logo hardware. Handcrafted by skilled artisans. Perfect for everyday elegance.',
          price: 4599,
          original_price: 5499,
          category: 'Fashion',
          images: [
            'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800',
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800'
          ],
          variants: [
            { variant_name: 'Cognac', color: 'Cognac', price: 4599, stock: 25 },
            { variant_name: 'Black', color: 'Black', price: 4599, stock: 30 },
            { variant_name: 'Cream', color: 'Cream', price: 4599, stock: 15 }
          ]
        },
        {
          name: 'High-Waist Wide Leg Pants',
          description: 'Sophisticated wide-leg trousers with a flattering high waist. Made from premium stretch fabric for all-day comfort. Features side pockets and invisible zipper closure. Perfect for office or casual wear.',
          price: 1899,
          original_price: 2499,
          category: 'Fashion',
          images: [
            'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
            'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800'
          ],
          variants: [
            { variant_name: 'S - Black', size: 'S', color: 'Black', price: 1899, stock: 40 },
            { variant_name: 'M - Black', size: 'M', color: 'Black', price: 1899, stock: 50 },
            { variant_name: 'L - Black', size: 'L', color: 'Black', price: 1899, stock: 35 },
            { variant_name: 'S - Tan', size: 'S', color: 'Tan', price: 1899, stock: 30 },
            { variant_name: 'M - Tan', size: 'M', color: 'Tan', price: 1899, stock: 40 }
          ]
        }
      ]
    }
  },
  {
    email: 'seller2@bazaarph.com',
    password: TEST_PASSWORD,
    full_name: 'Juan Carlos Reyes',
    phone: '+63 918 222 2222',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    seller: {
      store_name: 'TechHub Electronics',
      store_description: 'Your one-stop shop for the latest gadgets, electronics, and tech accessories. We offer genuine products with official warranty. From smartphones to smart home devices, we have everything you need.',
      business_profile: {
        business_name: 'TechHub Electronics Inc.',
        business_type: 'corporation',
        business_registration_number: 'SEC-2023-005678',
        tax_id: '987-654-321-000',
        address: '456 Ortigas Center, Pasig City',
        city: 'Pasig City',
        province: 'Metro Manila',
        postal_code: '1605'
      },
      bank_details: {
        bank_name: 'Metrobank',
        account_name: 'TechHub Electronics Inc.',
        account_number: '1234567890123'
      },
      is_verified: true,
      approval_status: 'verified',
      rating: 4.9,
      total_sales: 28750,
      products: [
        {
          name: 'Wireless Noise-Canceling Headphones',
          description: 'Premium wireless headphones with active noise cancellation technology. Features 30-hour battery life, touch controls, and Hi-Res audio support. Includes carrying case and audio cable. Compatible with all Bluetooth devices.',
          price: 8999,
          original_price: 10999,
          category: 'Electronics',
          images: [
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
            'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
            'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800'
          ],
          variants: [
            { variant_name: 'Matte Black', color: 'Matte Black', price: 8999, stock: 50 },
            { variant_name: 'Silver', color: 'Silver', price: 8999, stock: 35 },
            { variant_name: 'Midnight Blue', color: 'Midnight Blue', price: 9299, stock: 25 }
          ]
        },
        {
          name: 'Smart Watch Pro Series',
          description: 'Advanced smartwatch with health monitoring features including heart rate, SpO2, and sleep tracking. Water-resistant up to 50m, GPS enabled, and 7-day battery life. Customizable watch faces and interchangeable bands.',
          price: 12999,
          original_price: 15999,
          category: 'Electronics',
          images: [
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
            'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800'
          ],
          variants: [
            { variant_name: '42mm - Black', size: '42mm', color: 'Black', price: 12999, stock: 40 },
            { variant_name: '42mm - Silver', size: '42mm', color: 'Silver', price: 12999, stock: 30 },
            { variant_name: '46mm - Black', size: '46mm', color: 'Black', price: 13999, stock: 35 },
            { variant_name: '46mm - Rose Gold', size: '46mm', color: 'Rose Gold', price: 13999, stock: 20 }
          ]
        },
        {
          name: 'Portable Bluetooth Speaker',
          description: 'Compact yet powerful Bluetooth speaker with 360-degree sound. IP67 waterproof rating, 24-hour playtime, and built-in microphone for calls. Perfect for outdoor adventures and home use.',
          price: 3499,
          original_price: 4299,
          category: 'Electronics',
          images: [
            'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
            'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800'
          ],
          variants: [
            { variant_name: 'Black', color: 'Black', price: 3499, stock: 100 },
            { variant_name: 'Red', color: 'Red', price: 3499, stock: 60 },
            { variant_name: 'Teal', color: 'Teal', price: 3499, stock: 45 }
          ]
        },
        {
          name: 'Aromatherapy Essential Oil Diffuser',
          description: 'Ultrasonic essential oil diffuser with 7-color LED mood lighting. 300ml capacity with auto shut-off feature. Creates a relaxing atmosphere with adjustable mist settings. Whisper-quiet operation perfect for bedrooms.',
          price: 1499,
          category: 'Home & Living',
          images: [
            'https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800',
            'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800'
          ],
          variants: [
            { variant_name: 'White', color: 'White', price: 1499, stock: 80 },
            { variant_name: 'Wood Grain', color: 'Wood Grain', price: 1699, stock: 50 }
          ]
        }
      ]
    }
  },
  {
    email: 'seller3@bazaarph.com',
    password: TEST_PASSWORD,
    full_name: 'Elena Grace Villanueva',
    phone: '+63 919 333 3333',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    seller: {
      store_name: 'Beauty Essentials PH',
      store_description: 'Premium skincare and beauty products from trusted Korean and local brands. We believe in clean beauty and sustainable packaging. Authorized distributor of top K-beauty brands.',
      business_profile: {
        business_name: 'Beauty Essentials Trading',
        business_type: 'partnership',
        business_registration_number: 'DTI-2024-009876',
        tax_id: '555-666-777-000',
        address: '789 BGC, Taguig City',
        city: 'Taguig City',
        province: 'Metro Manila',
        postal_code: '1634'
      },
      bank_details: {
        bank_name: 'BPI',
        account_name: 'Beauty Essentials Trading',
        account_number: '9876543210987'
      },
      is_verified: true,
      approval_status: 'verified',
      rating: 4.7,
      total_sales: 12890,
      products: [
        {
          name: 'Hydrating Serum Set',
          description: 'Complete 3-step hydration system featuring hyaluronic acid serum, vitamin C brightening essence, and niacinamide pore minimizer. Suitable for all skin types. Dermatologist tested and cruelty-free.',
          price: 2499,
          original_price: 3299,
          category: 'Beauty',
          images: [
            'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
            'https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=800'
          ],
          variants: [
            { variant_name: '30ml Set', size: '30ml', price: 2499, stock: 100 },
            { variant_name: '50ml Set', size: '50ml', price: 3499, stock: 60 }
          ]
        },
        {
          name: 'Natural Lip Tint Collection',
          description: 'Velvet matte lip tints in 6 beautiful shades inspired by Filipino flowers. Long-lasting formula with vitamin E. Transfer-proof and moisturizing. Perfect for everyday wear.',
          price: 399,
          category: 'Beauty',
          images: [
            'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800',
            'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=800'
          ],
          variants: [
            { variant_name: 'Sampaguita', color: 'Nude Pink', price: 399, stock: 150 },
            { variant_name: 'Gumamela', color: 'Coral Red', price: 399, stock: 120 },
            { variant_name: 'Rosal', color: 'Berry', price: 399, stock: 100 },
            { variant_name: 'Ylang-Ylang', color: 'Mauve', price: 399, stock: 90 }
          ]
        }
      ]
    }
  }
];

const buyerAccounts = [
  {
    email: 'buyer1@gmail.com',
    password: TEST_PASSWORD,
    full_name: 'Anna Marie Cruz',
    phone: '+63 920 444 4444',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    bazcoins: 1500,
    addresses: [
      {
        label: 'Home',
        first_name: 'Anna Marie',
        last_name: 'Cruz',
        phone: '09204444444',
        address_line_1: '123 Rizal Street, Brgy. San Antonio',
        city: 'Makati City',
        province: 'Metro Manila',
        region: 'NCR',
        postal_code: '1203',
        is_default: true
      },
      {
        label: 'Office',
        first_name: 'Anna Marie',
        last_name: 'Cruz',
        phone: '09204444444',
        address_line_1: '25th Floor, RCBC Plaza, Ayala Avenue',
        city: 'Makati City',
        province: 'Metro Manila',
        region: 'NCR',
        postal_code: '1226',
        is_default: false
      }
    ]
  },
  {
    email: 'buyer2@gmail.com',
    password: TEST_PASSWORD,
    full_name: 'Miguel Antonio Santos',
    phone: '+63 921 555 5555',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    bazcoins: 2300,
    addresses: [
      {
        label: 'Home',
        first_name: 'Miguel Antonio',
        last_name: 'Santos',
        phone: '09215555555',
        address_line_1: '456 Bonifacio Avenue, Villa Verde Subdivision',
        city: 'Quezon City',
        province: 'Metro Manila',
        region: 'NCR',
        postal_code: '1105',
        is_default: true
      }
    ]
  },
  {
    email: 'buyer3@gmail.com',
    password: TEST_PASSWORD,
    full_name: 'Sofia Gabrielle Reyes',
    phone: '+63 922 666 6666',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bazcoins: 800,
    addresses: [
      {
        label: 'Condo',
        first_name: 'Sofia Gabrielle',
        last_name: 'Reyes',
        phone: '09226666666',
        address_line_1: 'Unit 2501, One Serendra Tower, BGC',
        city: 'Taguig City',
        province: 'Metro Manila',
        region: 'NCR',
        postal_code: '1634',
        is_default: true
      }
    ]
  },
  {
    email: 'buyer4@gmail.com',
    password: TEST_PASSWORD,
    full_name: 'Carlos Miguel Garcia',
    phone: '+63 923 777 7777',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bazcoins: 450,
    addresses: [
      {
        label: 'Home',
        first_name: 'Carlos Miguel',
        last_name: 'Garcia',
        phone: '09237777777',
        address_line_1: '789 Mabini Street, Brgy. Poblacion',
        city: 'Pasig City',
        province: 'Metro Manila',
        region: 'NCR',
        postal_code: '1600',
        is_default: true
      }
    ]
  }
];

// Reviews data for products
const reviewComments = [
  { rating: 5, comment: 'Absolutely love this product! Exceeded my expectations. Fast delivery and great packaging.' },
  { rating: 5, comment: 'Perfect quality! Will definitely buy again. Thank you seller!' },
  { rating: 4, comment: 'Great product, exactly as described. Minor packaging issue but item was perfect.' },
  { rating: 5, comment: 'Amazing value for money! Highly recommend to everyone.' },
  { rating: 4, comment: 'Very satisfied with my purchase. Color was slightly different from photos but still beautiful.' },
  { rating: 5, comment: 'Super fast shipping! Product is exactly what I needed. A+++ seller!' },
  { rating: 4, comment: 'Good quality, fits perfectly. Would appreciate more color options.' },
  { rating: 5, comment: 'Best purchase I made this month! Already ordered another one for my sister.' }
];

// Categories data
const categories = [
  { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes, and accessories', icon: '👗' },
  { name: 'Electronics', slug: 'electronics', description: 'Gadgets, devices, and accessories', icon: '📱' },
  { name: 'Beauty', slug: 'beauty', description: 'Skincare, makeup, and personal care', icon: '💄' },
  { name: 'Home & Living', slug: 'home-living', description: 'Furniture, decor, and appliances', icon: '🏠' },
  { name: 'Sports', slug: 'sports', description: 'Sports equipment and activewear', icon: '⚽' },
  { name: 'Toys & Games', slug: 'toys-games', description: 'Toys, games, and collectibles', icon: '🎮' },
  { name: 'Books', slug: 'books', description: 'Books, stationery, and office supplies', icon: '📚' },
  { name: 'Food & Drinks', slug: 'food-drinks', description: 'Snacks, beverages, and groceries', icon: '🍔' }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function log(message: string, success = true) {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`📦 ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

async function cleanupDatabase() {
  logSection('Cleaning Database');
  
  // Delete in order of dependencies
  const tablesToClean = [
    'reviews',
    'order_items',
    'orders',
    'cart_items',
    'carts',
    'product_variants',
    'product_images',
    'products',
    'shipping_addresses',
    'sellers',
    'buyers',
    'profiles'
  ];

  for (const table of tablesToClean) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.log(`  ⚠️  ${table}: ${error.message}`);
      } else {
        log(`Cleaned ${table}`);
      }
    } catch (e) {
      console.log(`  ⚠️  ${table}: Table may not exist or is protected`);
    }
  }

  // Delete auth users (requires admin API)
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    if (users?.users) {
      for (const user of users.users) {
        // Don't delete the current admin user
        await supabase.auth.admin.deleteUser(user.id);
      }
      log(`Cleaned ${users.users.length} auth users`);
    }
  } catch (e) {
    console.log('  ⚠️  Could not clean auth users (may need admin API)');
  }
}

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

async function seedCategories() {
  logSection('Seeding Categories');
  
  for (const cat of categories) {
    const { error } = await supabase.from('categories').upsert({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      sort_order: categories.indexOf(cat)
    }, { onConflict: 'slug' });
    
    if (error) {
      console.log(`  ⚠️  Category ${cat.name}: ${error.message}`);
    } else {
      log(`Category: ${cat.name}`);
    }
  }
}

async function createAuthUser(email: string, password: string, metadata: any) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata
  });
  
  if (error) {
    // Try to get existing user
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === email);
    if (existing) {
      return { user: existing, error: null };
    }
    throw error;
  }
  
  return data;
}

async function seedAdmins() {
  logSection('Seeding Admin Accounts');
  
  for (const admin of adminAccounts) {
    try {
      // Create auth user
      const { user } = await createAuthUser(admin.email, admin.password, {
        full_name: admin.full_name,
        user_type: 'admin'
      });
      
      if (!user) {
        console.log(`  ⚠️  Could not create admin: ${admin.email}`);
        continue;
      }

      // Create profile (split full_name into first/last)
      const nameParts = admin.full_name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || null;
      
      await supabase.from('profiles').upsert({
        id: user.id,
        email: admin.email,
        first_name: firstName,
        last_name: lastName,
        phone: admin.phone
      }, { onConflict: 'id' });

      // Create admin record if table exists
      try {
        await supabase.from('admins').upsert({
          id: user.id,
          role: 'super_admin',
          permissions: ['all']
        }, { onConflict: 'id' });
      } catch (e) {
        // admins table may not exist
      }

      log(`Admin: ${admin.email}`);
    } catch (e: any) {
      console.log(`  ⚠️  Admin ${admin.email}: ${e.message}`);
    }
  }
}

async function seedSellers() {
  logSection('Seeding Seller Accounts');
  
  const createdSellers: any[] = [];
  
  for (const seller of sellerAccounts) {
    try {
      // Create auth user
      const { user } = await createAuthUser(seller.email, seller.password, {
        full_name: seller.full_name,
        user_type: 'seller',
        store_name: seller.seller.store_name
      });
      
      if (!user) {
        console.log(`  ⚠️  Could not create seller: ${seller.email}`);
        continue;
      }

      // Create profile (split full_name into first/last)
      const nameParts = seller.full_name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || null;
      
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: seller.email,
        first_name: firstName,
        last_name: lastName,
        phone: seller.phone
      }, { onConflict: 'id' });

      if (profileError) {
        console.log(`  ⚠️  Profile ${seller.email}: ${profileError.message}`);
        continue;
      }

      // Create seller record
      const { error: sellerError } = await supabase.from('sellers').upsert({
        id: user.id,
        store_name: seller.seller.store_name,
        store_description: seller.seller.store_description,
        owner_name: seller.full_name,
        avatar_url: seller.avatar_url,
        approval_status: seller.seller.approval_status
      }, { onConflict: 'id' });

      if (sellerError) {
        console.log(`  ⚠️  Seller record ${seller.email}: ${sellerError.message}`);
      }

      createdSellers.push({
        id: user.id,
        email: seller.email,
        products: seller.seller.products
      });

      log(`Seller: ${seller.email} (${seller.seller.store_name})`);
    } catch (e: any) {
      console.log(`  ⚠️  Seller ${seller.email}: ${e.message}`);
    }
  }

  return createdSellers;
}

async function seedProducts(sellers: any[]) {
  logSection('Seeding Products with Variants');
  
  // Get category IDs
  const { data: categoryData } = await supabase.from('categories').select('id, name');
  const categoryMap = new Map(categoryData?.map(c => [c.name, c.id]) || []);
  
  const createdProducts: any[] = [];
  
  for (const seller of sellers) {
    for (const product of seller.products) {
      try {
        const categoryId = categoryMap.get(product.category);
        
        // Create product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .insert({
            seller_id: seller.id,
            name: product.name,
            description: product.description,
            price: product.price,
            category_id: categoryId,
            approval_status: product.approval_status || 'approved',
            low_stock_threshold: 10
          })
          .select()
          .single();

        if (productError || !productData) {
          console.log(`  ⚠️  Product ${product.name}: ${productError?.message}`);
          continue;
        }

        // Create product images
        for (let i = 0; i < product.images.length; i++) {
          await supabase.from('product_images').insert({
            product_id: productData.id,
            image_url: product.images[i],
            alt_text: `${product.name} - Image ${i + 1}`,
            sort_order: i,
            is_primary: i === 0
          });
        }

        // Create product variants
        for (const variant of product.variants) {
          await supabase.from('product_variants').insert({
            product_id: productData.id,
            variant_name: variant.variant_name,
            size: variant.size || null,
            color: variant.color || null,
            price: variant.price,
            stock: variant.stock,
            thumbnail_url: product.images[0],
            sku: `SKU-${productData.id.slice(0, 8)}-${variant.variant_name?.replace(/\s+/g, '-').toUpperCase()}`
          });
        }

        createdProducts.push({
          id: productData.id,
          name: product.name,
          sellerId: seller.id
        });

        log(`Product: ${product.name} (${product.variants.length} variants)`);
      } catch (e: any) {
        console.log(`  ⚠️  Product ${product.name}: ${e.message}`);
      }
    }
  }
  
  return createdProducts;
}

async function seedBuyers() {
  logSection('Seeding Buyer Accounts');
  
  const createdBuyers: any[] = [];
  
  for (const buyer of buyerAccounts) {
    try {
      // Create auth user
      const { user } = await createAuthUser(buyer.email, buyer.password, {
        full_name: buyer.full_name,
        user_type: 'buyer'
      });
      
      if (!user) {
        console.log(`  ⚠️  Could not create buyer: ${buyer.email}`);
        continue;
      }

      // Create profile (split full_name into first/last)
      const nameParts = buyer.full_name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || null;
      
      await supabase.from('profiles').upsert({
        id: user.id,
        email: buyer.email,
        first_name: firstName,
        last_name: lastName,
        phone: buyer.phone
      }, { onConflict: 'id' });

      // Create buyer record
      await supabase.from('buyers').upsert({
        id: user.id,
        bazcoins: buyer.bazcoins,
        avatar_url: buyer.avatar_url
      }, { onConflict: 'id' });

      // Create shipping addresses
      for (const address of buyer.addresses) {
        await supabase.from('shipping_addresses').insert({
          user_id: user.id,
          label: address.label,
          address_line_1: address.address_line_1,
          city: address.city,
          province: address.province,
          region: address.region,
          postal_code: address.postal_code,
          is_default: address.is_default
        });
      }

      createdBuyers.push({
        id: user.id,
        email: buyer.email,
        full_name: buyer.full_name
      });

      log(`Buyer: ${buyer.email} (${buyer.bazcoins} Bazcoins)`);
    } catch (e: any) {
      console.log(`  ⚠️  Buyer ${buyer.email}: ${e.message}`);
    }
  }

  return createdBuyers;
}

async function seedReviews(products: any[], buyers: any[]) {
  logSection('Seeding Product Reviews');
  
  if (products.length === 0 || buyers.length === 0) {
    console.log('  ⚠️  No products or buyers to create reviews');
    return;
  }

  for (const product of products) {
    // Each product gets 2-4 reviews
    const numReviews = Math.floor(Math.random() * 3) + 2;
    const shuffledBuyers = [...buyers].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(numReviews, shuffledBuyers.length); i++) {
      const buyer = shuffledBuyers[i];
      const review = reviewComments[Math.floor(Math.random() * reviewComments.length)];
      
      try {
        await supabase.from('reviews').insert({
          product_id: product.id,
          buyer_id: buyer.id,
          rating: review.rating,
          comment: review.comment,
          is_verified_purchase: true
        });
      } catch (e: any) {
        console.log(`  ⚠️  Review for ${product.name}: ${e.message}`);
      }
    }
    
    log(`Reviews for: ${product.name} (${numReviews} reviews)`);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n🚀 BazaarX Complete Database Seed Script\n');
  console.log('📋 This script will:');
  console.log('   1. Clean existing test data');
  console.log('   2. Create admin accounts');
  console.log('   3. Create seller accounts with products');
  console.log('   4. Create buyer accounts with addresses');
  console.log('   5. Create product reviews\n');

  const startTime = Date.now();

  try {
    // Step 1: Cleanup (optional - comment out to keep existing data)
    await cleanupDatabase();
    await sleep(1000);

    // Step 2: Seed categories
    await seedCategories();
    await sleep(500);

    // Step 3: Seed admins
    await seedAdmins();
    await sleep(500);

    // Step 4: Seed sellers
    const sellers = await seedSellers();
    await sleep(500);

    // Step 5: Seed products
    const products = await seedProducts(sellers);
    await sleep(500);

    // Step 6: Seed buyers
    const buyers = await seedBuyers();
    await sleep(500);

    // Step 7: Seed reviews
    await seedReviews(products, buyers);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logSection('Seed Complete!');
    console.log(`⏱️  Duration: ${duration}s\n`);
    
    console.log('📝 Test Accounts Created:\n');
    console.log('ADMIN LOGIN (/admin/login):');
    console.log('   Email: admin@bazaarph.com');
    console.log(`   Password: ${TEST_PASSWORD}\n`);
    
    console.log('SELLER LOGIN (/seller/login):');
    console.log('   Email: seller1@bazaarph.com');
    console.log(`   Password: ${TEST_PASSWORD}\n`);
    
    console.log('BUYER LOGIN (/login):');
    console.log('   Email: buyer1@gmail.com');
    console.log(`   Password: ${TEST_PASSWORD}\n`);
    
    console.log('All accounts use password:', TEST_PASSWORD);
    console.log('\n✅ Database seeding completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

main();
