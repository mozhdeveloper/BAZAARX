/**
 * BAZAAR PH - Complete Data Population Script
 * 
 * This script populates the database with:
 * 1. Categories - Main product categories
 * 2. Sellers - Complete seller accounts with business profiles
 * 3. Products - Products with images, variants, and full details
 * 4. Buyers - Buyer profiles with bazcoins
 * 5. Vouchers - Promotional vouchers
 * 
 * TEST ACCOUNTS:
 * 
 * SELLER ACCOUNTS:
 * - seller1@bazaarph.com / Seller123! (TechHub Manila)
 * - seller2@bazaarph.com / Seller123! (Fashion Forward PH)
 * - seller3@bazaarph.com / Seller123! (Home & Living Co.)
 * 
 * BUYER ACCOUNTS:
 * - buyer1@bazaarph.com / Buyer123! (Ana Santos)
 * - buyer2@bazaarph.com / Buyer123! (Juan Cruz)
 * - buyer3@bazaarph.com / Buyer123! (Maria Garcia)
 * 
 * QA ACCOUNT:
 * - qa@bazaarph.com / QA123456! (QA Team)
 * 
 * ADMIN ACCOUNT:
 * - admin@bazaarph.com / Admin123! (Admin)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Track created IDs for reference
const createdIds: { [key: string]: string[] } = {
  categories: [],
  sellers: [],
  products: [],
  buyers: [],
  vouchers: [],
};

// ============================================================================
// DATA DEFINITIONS
// ============================================================================

const CATEGORIES = [
  { name: 'Electronics', slug: 'electronics', description: 'Gadgets, phones, computers, and accessories', icon: '📱' },
  { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes, and accessories for men and women', icon: '👕' },
  { name: 'Home & Living', slug: 'home-living', description: 'Furniture, decor, and home essentials', icon: '🏠' },
  { name: 'Beauty & Health', slug: 'beauty-health', description: 'Skincare, makeup, and wellness products', icon: '💄' },
  { name: 'Food & Beverages', slug: 'food-beverages', description: 'Snacks, drinks, and gourmet items', icon: '🍕' },
  { name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Sports equipment and outdoor gear', icon: '⚽' },
  { name: 'Books & Stationery', slug: 'books-stationery', description: 'Books, office supplies, and art materials', icon: '📚' },
  { name: 'Toys & Games', slug: 'toys-games', description: 'Toys, board games, and collectibles', icon: '🎮' },
];

const SELLERS = [
  {
    email: 'seller1@bazaarph.com',
    password: 'Seller123!',
    profile: { first_name: 'Miguel', last_name: 'Reyes', phone: '+639171234567' },
    seller: {
      store_name: 'TechHub Manila',
      store_description: 'Your one-stop shop for the latest gadgets and tech accessories. We offer genuine products with warranty.',
      owner_name: 'Miguel Reyes',
      approval_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200',
    },
    business_profile: {
      business_type: 'sole_proprietorship',
      city: 'Makati City',
      province: 'Metro Manila',
      postal_code: '1200',
      business_address: '123 Ayala Avenue, Makati City',
      business_registration_number: 'DTI-2024-001234',
      tax_id_number: '123-456-789-000',
    },
    payout_account: {
      bank_name: 'BDO Unibank',
      account_name: 'Miguel Reyes',
      account_number: '001234567890',
    },
  },
  {
    email: 'seller2@bazaarph.com',
    password: 'Seller123!',
    profile: { first_name: 'Isabella', last_name: 'Santos', phone: '+639182345678' },
    seller: {
      store_name: 'Fashion Forward PH',
      store_description: 'Trendy and affordable fashion for the modern Filipino. Free shipping on orders over ₱1,000!',
      owner_name: 'Isabella Santos',
      approval_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    },
    business_profile: {
      business_type: 'sole_proprietorship',
      city: 'Quezon City',
      province: 'Metro Manila',
      postal_code: '1100',
      business_address: '456 Commonwealth Ave, Quezon City',
      business_registration_number: 'DTI-2024-002345',
      tax_id_number: '234-567-890-000',
    },
    payout_account: {
      bank_name: 'BPI',
      account_name: 'Isabella Santos',
      account_number: '002345678901',
    },
  },
  {
    email: 'seller3@bazaarph.com',
    password: 'Seller123!',
    profile: { first_name: 'Carlos', last_name: 'Dela Cruz', phone: '+639193456789' },
    seller: {
      store_name: 'Home & Living Co.',
      store_description: 'Beautiful home decor and furniture to make your house a home. Quality products at great prices.',
      owner_name: 'Carlos Dela Cruz',
      approval_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    },
    business_profile: {
      business_type: 'corporation',
      city: 'Pasig City',
      province: 'Metro Manila',
      postal_code: '1600',
      business_address: '789 Ortigas Ave, Pasig City',
      business_registration_number: 'SEC-2024-003456',
      tax_id_number: '345-678-901-000',
    },
    payout_account: {
      bank_name: 'Metrobank',
      account_name: 'Home & Living Co.',
      account_number: '003456789012',
    },
  },
];

const BUYERS = [
  {
    email: 'buyer1@bazaarph.com',
    password: 'Buyer123!',
    profile: { first_name: 'Ana', last_name: 'Santos', phone: '+639201234567' },
    buyer: {
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
      preferences: { categories: ['electronics', 'fashion'], notifications: true },
      bazcoins: 500,
    },
  },
  {
    email: 'buyer2@bazaarph.com',
    password: 'Buyer123!',
    profile: { first_name: 'Juan', last_name: 'Cruz', phone: '+639212345678' },
    buyer: {
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
      preferences: { categories: ['sports-outdoors', 'electronics'], notifications: true },
      bazcoins: 1000,
    },
  },
  {
    email: 'buyer3@bazaarph.com',
    password: 'Buyer123!',
    profile: { first_name: 'Maria', last_name: 'Garcia', phone: '+639223456789' },
    buyer: {
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      preferences: { categories: ['beauty-health', 'home-living'], notifications: false },
      bazcoins: 250,
    },
  },
];

// Products will be defined after we have category and seller IDs
const getProducts = (categoryIds: Record<string, string>, sellerIds: string[]) => [
  // TechHub Manila Products (seller 0)
  {
    seller_id: sellerIds[0],
    category_id: categoryIds['electronics'],
    name: 'iPhone 15 Pro Max 256GB',
    description: 'The most powerful iPhone ever. Features the A17 Pro chip, titanium design, and an advanced camera system. Includes 1-year Apple warranty.',
    price: 79990,
    brand: 'Apple',
    sku: 'TECH-IP15PM-256',
    specifications: { chip: 'A17 Pro', display: '6.7" Super Retina XDR', storage: '256GB', camera: '48MP Main' },
    approval_status: 'approved',
    images: [
      { url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800', is_primary: true },
      { url: 'https://images.unsplash.com/photo-1696446702194-3d61c74f7e9c?w=800', is_primary: false },
    ],
    variants: [
      { sku: 'TECH-IP15PM-256-NAT', variant_name: 'Natural Titanium 256GB', color: 'Natural Titanium', size: '256GB', price: 79990, stock: 25 },
      { sku: 'TECH-IP15PM-256-BLU', variant_name: 'Blue Titanium 256GB', color: 'Blue Titanium', size: '256GB', price: 79990, stock: 20 },
      { sku: 'TECH-IP15PM-512-NAT', variant_name: 'Natural Titanium 512GB', color: 'Natural Titanium', size: '512GB', price: 89990, stock: 15 },
    ],
  },
  {
    seller_id: sellerIds[0],
    category_id: categoryIds['electronics'],
    name: 'Samsung Galaxy S24 Ultra',
    description: 'The ultimate Galaxy experience with AI capabilities. Features the Snapdragon 8 Gen 3 chip and S Pen included.',
    price: 69990,
    brand: 'Samsung',
    sku: 'TECH-SGS24U',
    specifications: { chip: 'Snapdragon 8 Gen 3', display: '6.8" Dynamic AMOLED', storage: '256GB', camera: '200MP Main' },
    approval_status: 'approved',
    images: [
      { url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800', is_primary: true },
    ],
    variants: [
      { sku: 'TECH-SGS24U-256-BLK', variant_name: 'Titanium Black 256GB', color: 'Titanium Black', size: '256GB', price: 69990, stock: 30 },
      { sku: 'TECH-SGS24U-256-VIO', variant_name: 'Titanium Violet 256GB', color: 'Titanium Violet', size: '256GB', price: 69990, stock: 20 },
      { sku: 'TECH-SGS24U-512-BLK', variant_name: 'Titanium Black 512GB', color: 'Titanium Black', size: '512GB', price: 79990, stock: 10 },
    ],
  },
  {
    seller_id: sellerIds[0],
    category_id: categoryIds['electronics'],
    name: 'Apple AirPods Pro 2nd Gen',
    description: 'Active Noise Cancellation, Adaptive Audio, and Personalized Spatial Audio. MagSafe charging case included.',
    price: 14990,
    brand: 'Apple',
    sku: 'TECH-APP2',
    specifications: { type: 'True Wireless', noise_cancellation: 'Active', battery: '6 hours' },
    approval_status: 'approved',
    images: [
      { url: 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=800', is_primary: true },
    ],
    variants: [
      { sku: 'TECH-APP2-WHT', variant_name: 'White', color: 'White', size: 'One Size', price: 14990, stock: 50 },
    ],
  },
  {
    seller_id: sellerIds[0],
    category_id: categoryIds['electronics'],
    name: 'MacBook Air M3 13-inch',
    description: 'Supercharged by M3 chip. Up to 18 hours of battery life. Fanless design for silent operation.',
    price: 74990,
    brand: 'Apple',
    sku: 'TECH-MBA-M3',
    specifications: { chip: 'Apple M3', display: '13.6" Liquid Retina', storage: '256GB SSD', ram: '8GB' },
    approval_status: 'approved',
    images: [
      { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', is_primary: true },
    ],
    variants: [
      { sku: 'TECH-MBA-M3-256-SG', variant_name: 'Space Gray 256GB', color: 'Space Gray', size: '256GB', price: 74990, stock: 15 },
      { sku: 'TECH-MBA-M3-256-SV', variant_name: 'Silver 256GB', color: 'Silver', size: '256GB', price: 74990, stock: 12 },
      { sku: 'TECH-MBA-M3-512-SG', variant_name: 'Space Gray 512GB', color: 'Space Gray', size: '512GB', price: 89990, stock: 8 },
    ],
  },
  
  // Fashion Forward PH Products (seller 1)
  {
    seller_id: sellerIds[1],
    category_id: categoryIds['fashion'],
    name: 'Premium Cotton Polo Shirt',
    description: 'Classic fit polo shirt made from 100% premium cotton. Perfect for casual and semi-formal occasions.',
    price: 899,
    brand: 'Fashion Forward',
    sku: 'FF-POLO-001',
    specifications: { material: '100% Cotton', fit: 'Classic', care: 'Machine washable' },
    approval_status: 'approved',
    images: [
      { url: 'https://images.unsplash.com/photo-1625910513413-5fc5c4b2ab83?w=800', is_primary: true },
    ],
    variants: [
      { sku: 'FF-POLO-001-WHT-S', variant_name: 'White Small', color: 'White', size: 'S', price: 899, stock: 30 },
      { sku: 'FF-POLO-001-WHT-M', variant_name: 'White Medium', color: 'White', size: 'M', price: 899, stock: 40 },
      { sku: 'FF-POLO-001-WHT-L', variant_name: 'White Large', color: 'White', size: 'L', price: 899, stock: 35 },
      { sku: 'FF-POLO-001-NVY-S', variant_name: 'Navy Small', color: 'Navy', size: 'S', price: 899, stock: 25 },
      { sku: 'FF-POLO-001-NVY-M', variant_name: 'Navy Medium', color: 'Navy', size: 'M', price: 899, stock: 30 },
      { sku: 'FF-POLO-001-NVY-L', variant_name: 'Navy Large', color: 'Navy', size: 'L', price: 899, stock: 25 },
    ],
  },
  {
    seller_id: sellerIds[1],
    category_id: categoryIds['fashion'],
    name: 'Slim Fit Chino Pants',
    description: 'Versatile slim fit chino pants. Comfortable stretch fabric for all-day wear.',
    price: 1299,
    brand: 'Fashion Forward',
    sku: 'FF-CHINO-001',
    specifications: { material: '98% Cotton, 2% Spandex', fit: 'Slim', care: 'Machine washable' },
    approval_status: 'approved',
    images: [
      { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800', is_primary: true },
    ],
    variants: [
      { sku: 'FF-CHINO-001-KHK-30', variant_name: 'Khaki 30', color: 'Khaki', size: '30', price: 1299, stock: 20 },
      { sku: 'FF-CHINO-001-KHK-32', variant_name: 'Khaki 32', color: 'Khaki', size: '32', price: 1299, stock: 25 },
      { sku: 'FF-CHINO-001-KHK-34', variant_name: 'Khaki 34', color: 'Khaki', size: '34', price: 1299, stock: 20 },
      { sku: 'FF-CHINO-001-BLK-30', variant_name: 'Black 30', color: 'Black', size: '30', price: 1299, stock: 15 },
      { sku: 'FF-CHINO-001-BLK-32', variant_name: 'Black 32', color: 'Black', size: '32', price: 1299, stock: 20 },
    ],
  },
  {
    seller_id: sellerIds[1],
    category_id: categoryIds['fashion'],
    name: 'Floral Summer Dress',
    description: 'Beautiful floral print midi dress. Lightweight and breathable fabric perfect for Philippine weather.',
    price: 1599,
    brand: 'Fashion Forward',
    sku: 'FF-DRESS-001',
    specifications: { material: 'Rayon', fit: 'Regular', length: 'Midi', care: 'Hand wash' },
    approval_status: 'approved',
    images: [
      { url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800', is_primary: true },
    ],
    variants: [
      { sku: 'FF-DRESS-001-FLR-S', variant_name: 'Floral Small', color: 'Floral Print', size: 'S', price: 1599, stock: 15 },
      { sku: 'FF-DRESS-001-FLR-M', variant_name: 'Floral Medium', color: 'Floral Print', size: 'M', price: 1599, stock: 20 },
      { sku: 'FF-DRESS-001-FLR-L', variant_name: 'Floral Large', color: 'Floral Print', size: 'L', price: 1599, stock: 15 },
    ],
  },
  {
    seller_id: sellerIds[1],
    category_id: categoryIds['fashion'],
    name: 'Canvas Sneakers',
    description: 'Classic canvas sneakers with rubber sole. Comfortable and stylish for everyday wear.',
    price: 1499,
    brand: 'Fashion Forward',
    sku: 'FF-SNKR-001',
    specifications: { material: 'Canvas upper, Rubber sole', type: 'Low-top' },
    approval_status: 'approved',
    images: [
      { url: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800', is_primary: true },
    ],
    variants: [
      { sku: 'FF-SNKR-001-WHT-38', variant_name: 'White 38', color: 'White', size: '38', price: 1499, stock: 10 },
      { sku: 'FF-SNKR-001-WHT-39', variant_name: 'White 39', color: 'White', size: '39', price: 1499, stock: 15 },
      { sku: 'FF-SNKR-001-WHT-40', variant_name: 'White 40', color: 'White', size: '40', price: 1499, stock: 20 },
      { sku: 'FF-SNKR-001-WHT-41', variant_name: 'White 41', color: 'White', size: '41', price: 1499, stock: 15 },
      { sku: 'FF-SNKR-001-BLK-39', variant_name: 'Black 39', color: 'Black', size: '39', price: 1499, stock: 12 },
      { sku: 'FF-SNKR-001-BLK-40', variant_name: 'Black 40', color: 'Black', size: '40', price: 1499, stock: 15 },
    ],
  },
  
  // Home & Living Co. Products (seller 2)
  {
    seller_id: sellerIds[2],
    category_id: categoryIds['home-living'],
    name: 'Scandinavian Wooden Coffee Table',
    description: 'Minimalist coffee table made from solid acacia wood. Perfect centerpiece for your living room.',
    price: 7999,
    brand: 'Home & Living',
    sku: 'HL-TABLE-001',
    specifications: { material: 'Acacia Wood', dimensions: '100cm x 50cm x 45cm', weight: '15kg' },
    approval_status: 'approved',
    images: [
      { url: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800', is_primary: true },
    ],
    variants: [
      { sku: 'HL-TABLE-001-NAT', variant_name: 'Natural Wood', color: 'Natural', size: 'Standard', price: 7999, stock: 10 },
      { sku: 'HL-TABLE-001-WAL', variant_name: 'Walnut Finish', color: 'Walnut', size: 'Standard', price: 8499, stock: 8 },
    ],
  },
  {
    seller_id: sellerIds[2],
    category_id: categoryIds['home-living'],
    name: 'Premium Bedsheet Set (Queen)',
    description: '300 thread count Egyptian cotton bedsheet set. Includes 1 fitted sheet, 1 flat sheet, and 2 pillowcases.',
    price: 2999,
    brand: 'Home & Living',
    sku: 'HL-BED-001',
    specifications: { material: 'Egyptian Cotton', thread_count: '300', size: 'Queen' },
    approval_status: 'approved',
    images: [
      { url: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800', is_primary: true },
    ],
    variants: [
      { sku: 'HL-BED-001-WHT', variant_name: 'White Queen', color: 'White', size: 'Queen', price: 2999, stock: 25 },
      { sku: 'HL-BED-001-GRY', variant_name: 'Gray Queen', color: 'Gray', size: 'Queen', price: 2999, stock: 20 },
      { sku: 'HL-BED-001-BGE', variant_name: 'Beige Queen', color: 'Beige', size: 'Queen', price: 2999, stock: 15 },
    ],
  },
  {
    seller_id: sellerIds[2],
    category_id: categoryIds['home-living'],
    name: 'Ceramic Plant Pot Set (3 pcs)',
    description: 'Set of 3 minimalist ceramic plant pots with drainage holes. Perfect for indoor plants.',
    price: 1299,
    brand: 'Home & Living',
    sku: 'HL-POT-001',
    specifications: { material: 'Ceramic', sizes: 'Small, Medium, Large', drainage: 'Yes' },
    approval_status: 'approved',
    images: [
      { url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800', is_primary: true },
    ],
    variants: [
      { sku: 'HL-POT-001-WHT', variant_name: 'White Set', color: 'White', size: 'Set of 3', price: 1299, stock: 30 },
      { sku: 'HL-POT-001-TER', variant_name: 'Terracotta Set', color: 'Terracotta', size: 'Set of 3', price: 1299, stock: 25 },
    ],
  },
  {
    seller_id: sellerIds[2],
    category_id: categoryIds['home-living'],
    name: 'LED Smart Ceiling Light',
    description: 'Modern LED ceiling light with smart controls. Adjustable brightness and color temperature. Works with Alexa and Google Home.',
    price: 3499,
    brand: 'Home & Living',
    sku: 'HL-LIGHT-001',
    specifications: { wattage: '36W', diameter: '50cm', smart: 'Yes', lumens: '3600' },
    approval_status: 'approved',
    images: [
      { url: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=800', is_primary: true },
    ],
    variants: [
      { sku: 'HL-LIGHT-001-WHT', variant_name: 'White Frame', color: 'White', size: '50cm', price: 3499, stock: 15 },
      { sku: 'HL-LIGHT-001-BLK', variant_name: 'Black Frame', color: 'Black', size: '50cm', price: 3499, stock: 12 },
    ],
  },
];

const VOUCHERS = [
  {
    code: 'WELCOME10',
    title: 'Welcome 10% Off',
    description: 'Get 10% off on your first order! Valid for new customers.',
    voucher_type: 'percentage',
    value: 10,
    min_order_value: 500,
    max_discount: 500,
    usage_limit: 1000,
    claim_limit: 1,
    is_active: true,
  },
  {
    code: 'FREESHIP',
    title: 'Free Shipping',
    description: 'Enjoy free shipping on orders over ₱1,000.',
    voucher_type: 'free_shipping',
    value: 0,
    min_order_value: 1000,
    max_discount: 150,
    usage_limit: 500,
    claim_limit: 3,
    is_active: true,
  },
  {
    code: 'BAZAAR50',
    title: '₱50 Off',
    description: 'Get ₱50 off on orders over ₱300.',
    voucher_type: 'fixed',
    value: 50,
    min_order_value: 300,
    max_discount: 50,
    usage_limit: 2000,
    claim_limit: 5,
    is_active: true,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createAuthUser(email: string, password: string): Promise<string | null> {
  try {
    // Try to sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'http://localhost:5173',
      }
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        // User exists, try to sign in
        const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
        return signInData.user?.id || null;
      }
      console.error(`  Failed to create user ${email}:`, error.message);
      return null;
    }
    
    return data.user?.id || null;
  } catch (e: any) {
    console.error(`  Error creating user ${email}:`, e.message);
    return null;
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// POPULATION FUNCTIONS
// ============================================================================

async function populateCategories(): Promise<Record<string, string>> {
  console.log('\n📋 Creating Categories...\n');
  const categoryIds: Record<string, string> = {};
  
  for (const cat of CATEGORIES) {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
      })
      .select()
      .single();
    
    if (error) {
      console.log(`  ❌ ${cat.name}: ${error.message}`);
    } else {
      console.log(`  ✅ ${cat.name}`);
      categoryIds[cat.slug] = data.id;
      createdIds.categories.push(data.id);
    }
  }
  
  return categoryIds;
}

async function populateSellers(): Promise<string[]> {
  console.log('\n👔 Creating Seller Accounts...\n');
  const sellerIds: string[] = [];
  
  for (const seller of SELLERS) {
    console.log(`  Creating seller: ${seller.email}`);
    
    // Create auth user
    const userId = await createAuthUser(seller.email, seller.password);
    if (!userId) {
      console.log(`    ❌ Failed to create auth user`);
      continue;
    }
    console.log(`    ✅ Auth user created: ${userId.substring(0, 8)}...`);
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: seller.email,
        ...seller.profile,
      });
    if (profileError) {
      console.log(`    ⚠️ Profile: ${profileError.message}`);
    } else {
      console.log(`    ✅ Profile created`);
    }
    
    // Assign seller role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'seller',
      });
    if (roleError) {
      console.log(`    ⚠️ Role: ${roleError.message}`);
    } else {
      console.log(`    ✅ Seller role assigned`);
    }
    
    // Create seller record
    const { data: sellerData, error: sellerError } = await supabase
      .from('sellers')
      .insert({
        id: userId,
        ...seller.seller,
        verified_at: seller.seller.approval_status === 'verified' ? new Date().toISOString() : null,
      })
      .select()
      .single();
    
    if (sellerError) {
      console.log(`    ❌ Seller record: ${sellerError.message}`);
      continue;
    }
    console.log(`    ✅ Seller record created: ${sellerData.store_name}`);
    sellerIds.push(sellerData.id);
    createdIds.sellers.push(sellerData.id);
    
    // Create business profile
    const { error: bpError } = await supabase
      .from('seller_business_profiles')
      .insert({
        seller_id: sellerData.id,
        ...seller.business_profile,
      });
    if (bpError) {
      console.log(`    ⚠️ Business profile: ${bpError.message}`);
    } else {
      console.log(`    ✅ Business profile created`);
    }
    
    // Create payout account
    const { error: paError } = await supabase
      .from('seller_payout_accounts')
      .insert({
        seller_id: sellerData.id,
        ...seller.payout_account,
      });
    if (paError) {
      console.log(`    ⚠️ Payout account: ${paError.message}`);
    } else {
      console.log(`    ✅ Payout account created`);
    }
    
    await delay(500); // Rate limiting
  }
  
  return sellerIds;
}

async function populateBuyers(): Promise<string[]> {
  console.log('\n🛒 Creating Buyer Accounts...\n');
  const buyerIds: string[] = [];
  
  for (const buyer of BUYERS) {
    console.log(`  Creating buyer: ${buyer.email}`);
    
    // Create auth user
    const userId = await createAuthUser(buyer.email, buyer.password);
    if (!userId) {
      console.log(`    ❌ Failed to create auth user`);
      continue;
    }
    console.log(`    ✅ Auth user created: ${userId.substring(0, 8)}...`);
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: buyer.email,
        ...buyer.profile,
      });
    if (profileError) {
      console.log(`    ⚠️ Profile: ${profileError.message}`);
    } else {
      console.log(`    ✅ Profile created`);
    }
    
    // Assign buyer role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'buyer',
      });
    if (roleError) {
      console.log(`    ⚠️ Role: ${roleError.message}`);
    } else {
      console.log(`    ✅ Buyer role assigned`);
    }
    
    // Create buyer record
    const { data: buyerData, error: buyerError } = await supabase
      .from('buyers')
      .insert({
        id: userId,
        ...buyer.buyer,
      })
      .select()
      .single();
    
    if (buyerError) {
      console.log(`    ❌ Buyer record: ${buyerError.message}`);
      continue;
    }
    console.log(`    ✅ Buyer record created with ${buyerData.bazcoins} bazcoins`);
    buyerIds.push(buyerData.id);
    createdIds.buyers.push(buyerData.id);
    
    await delay(500); // Rate limiting
  }
  
  return buyerIds;
}

async function populateProducts(categoryIds: Record<string, string>, sellerIds: string[]): Promise<void> {
  console.log('\n📦 Creating Products...\n');
  
  const products = getProducts(categoryIds, sellerIds);
  
  for (const product of products) {
    const { images, variants, ...productData } = product;
    
    // Create product
    const { data: productResult, error: productError } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();
    
    if (productError) {
      console.log(`  ❌ ${productData.name}: ${productError.message}`);
      continue;
    }
    
    console.log(`  ✅ ${productData.name}`);
    createdIds.products.push(productResult.id);
    
    // Create images
    for (let i = 0; i < images.length; i++) {
      const { error: imgError } = await supabase
        .from('product_images')
        .insert({
          product_id: productResult.id,
          image_url: images[i].url,
          is_primary: images[i].is_primary,
          sort_order: i,
        });
      if (imgError) {
        console.log(`    ⚠️ Image ${i + 1}: ${imgError.message}`);
      }
    }
    console.log(`    📷 ${images.length} images added`);
    
    // Create variants
    for (const variant of variants) {
      const { error: varError } = await supabase
        .from('product_variants')
        .insert({
          product_id: productResult.id,
          ...variant,
        });
      if (varError) {
        console.log(`    ⚠️ Variant ${variant.variant_name}: ${varError.message}`);
      }
    }
    console.log(`    🎨 ${variants.length} variants added`);
  }
}

async function populateVouchers(): Promise<void> {
  console.log('\n🎫 Creating Vouchers...\n');
  
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  for (const voucher of VOUCHERS) {
    const { data, error } = await supabase
      .from('vouchers')
      .insert({
        ...voucher,
        claimable_from: now.toISOString(),
        claimable_until: thirtyDaysLater.toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.log(`  ❌ ${voucher.code}: ${error.message}`);
    } else {
      console.log(`  ✅ ${voucher.code} - ${voucher.title}`);
      createdIds.vouchers.push(data.id);
    }
  }
}

async function createQAAndAdminAccounts(): Promise<void> {
  console.log('\n👮 Creating QA and Admin Accounts...\n');
  
  const accounts = [
    {
      email: 'qa@bazaarph.com',
      password: 'QA123456!',
      role: 'qa',
      profile: { first_name: 'QA', last_name: 'Team', phone: '+639301234567' },
    },
    {
      email: 'admin@bazaarph.com',
      password: 'Admin123!',
      role: 'admin',
      profile: { first_name: 'Admin', last_name: 'User', phone: '+639401234567' },
    },
  ];
  
  for (const account of accounts) {
    console.log(`  Creating ${account.role}: ${account.email}`);
    
    const userId = await createAuthUser(account.email, account.password);
    if (!userId) {
      console.log(`    ❌ Failed to create auth user`);
      continue;
    }
    console.log(`    ✅ Auth user created`);
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: account.email,
        ...account.profile,
      });
    if (profileError) {
      console.log(`    ⚠️ Profile: ${profileError.message}`);
    }
    
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: account.role,
      });
    if (roleError) {
      console.log(`    ⚠️ Role: ${roleError.message}`);
    } else {
      console.log(`    ✅ ${account.role} role assigned`);
    }
    
    await delay(500);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('  BAZAAR PH - DATA POPULATION');
  console.log('═'.repeat(70));
  
  try {
    // Step 1: Categories
    const categoryIds = await populateCategories();
    console.log(`\n  Categories created: ${Object.keys(categoryIds).length}`);
    
    // Step 2: Sellers
    const sellerIds = await populateSellers();
    console.log(`\n  Sellers created: ${sellerIds.length}`);
    
    if (sellerIds.length === 0) {
      console.log('\n❌ No sellers created. Cannot continue with products.');
      return;
    }
    
    // Step 3: Products
    await populateProducts(categoryIds, sellerIds);
    console.log(`\n  Products created: ${createdIds.products.length}`);
    
    // Step 4: Buyers
    const buyerIds = await populateBuyers();
    console.log(`\n  Buyers created: ${buyerIds.length}`);
    
    // Step 5: Vouchers
    await populateVouchers();
    console.log(`\n  Vouchers created: ${createdIds.vouchers.length}`);
    
    // Step 6: QA and Admin
    await createQAAndAdminAccounts();
    
    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('  POPULATION COMPLETE');
    console.log('═'.repeat(70));
    console.log('\n📊 SUMMARY:');
    console.log(`  • Categories: ${createdIds.categories.length}`);
    console.log(`  • Sellers: ${createdIds.sellers.length}`);
    console.log(`  • Products: ${createdIds.products.length}`);
    console.log(`  • Buyers: ${createdIds.buyers.length}`);
    console.log(`  • Vouchers: ${createdIds.vouchers.length}`);
    
    console.log('\n📱 TEST ACCOUNTS:');
    console.log('\n  SELLER ACCOUNTS:');
    console.log('  ┌────────────────────────────┬─────────────┬───────────────────┐');
    console.log('  │ Email                      │ Password    │ Store             │');
    console.log('  ├────────────────────────────┼─────────────┼───────────────────┤');
    console.log('  │ seller1@bazaarph.com       │ Seller123!  │ TechHub Manila    │');
    console.log('  │ seller2@bazaarph.com       │ Seller123!  │ Fashion Forward   │');
    console.log('  │ seller3@bazaarph.com       │ Seller123!  │ Home & Living Co. │');
    console.log('  └────────────────────────────┴─────────────┴───────────────────┘');
    
    console.log('\n  BUYER ACCOUNTS:');
    console.log('  ┌────────────────────────────┬─────────────┬──────────────┐');
    console.log('  │ Email                      │ Password    │ Name         │');
    console.log('  ├────────────────────────────┼─────────────┼──────────────┤');
    console.log('  │ buyer1@bazaarph.com        │ Buyer123!   │ Ana Santos   │');
    console.log('  │ buyer2@bazaarph.com        │ Buyer123!   │ Juan Cruz    │');
    console.log('  │ buyer3@bazaarph.com        │ Buyer123!   │ Maria Garcia │');
    console.log('  └────────────────────────────┴─────────────┴──────────────┘');
    
    console.log('\n  ADMIN/QA ACCOUNTS:');
    console.log('  ┌────────────────────────────┬─────────────┬──────────────┐');
    console.log('  │ Email                      │ Password    │ Role         │');
    console.log('  ├────────────────────────────┼─────────────┼──────────────┤');
    console.log('  │ qa@bazaarph.com            │ QA123456!   │ QA           │');
    console.log('  │ admin@bazaarph.com         │ Admin123!   │ Admin        │');
    console.log('  └────────────────────────────┴─────────────┴──────────────┘');
    
    console.log('\n✅ Data population complete!\n');
    
  } catch (error) {
    console.error('\n❌ Population failed:', error);
    process.exit(1);
  }
}

main();
