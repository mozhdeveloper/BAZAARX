/**
 * Complete Product Reset and Seed Script
 * 
 * This script will:
 * 1. Delete all existing products and order_items (clean slate)
 * 2. Create complete products for each seller store
 * 3. Products include proper variants (colors, sizes)
 * 4. All products are QA approved and ready for buyer flow
 * 5. Works with POS system
 * 
 * Run with: npx tsx scripts/reset-and-seed-products.ts
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

// Product categories
const CATEGORIES = {
  ELECTRONICS: 'Electronics',
  FASHION_WOMEN: "Women's Fashion",
  FASHION_MEN: "Men's Fashion",
  SPORTS: 'Sports & Outdoors',
  HOME: 'Home & Living',
  BEAUTY: 'Health & Beauty',
  ACCESSORIES: 'Accessories',
  SHOES: 'Footwear',
};

// Complete product data for each store type
const STORE_PRODUCTS = {
  // TechStore Official - Electronics Store
  tech_store: [
    {
      name: "Premium Wireless Headphones Pro",
      description: "High-fidelity wireless headphones with active noise cancellation, 40-hour battery life, and premium memory foam cushions. Features Bluetooth 5.3 and multipoint connection.",
      price: 4999,
      original_price: 6499,
      stock: 50,
      category: CATEGORIES.ELECTRONICS,
      images: [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&h=800&fit=crop"
      ],
      colors: ["Graphite Black", "Pearl White", "Midnight Blue"],
      sizes: [],
    },
    {
      name: "Smart Watch Series X",
      description: "Advanced smartwatch with AMOLED display, heart rate monitoring, GPS tracking, and 7-day battery life. Water resistant up to 50m.",
      price: 8999,
      original_price: 11999,
      stock: 35,
      category: CATEGORIES.ELECTRONICS,
      images: [
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&h=800&fit=crop"
      ],
      colors: ["Space Gray", "Silver", "Rose Gold", "Black"],
      sizes: ["40mm", "44mm"],
    },
    {
      name: "Portable Bluetooth Speaker",
      description: "360° immersive sound with deep bass. Waterproof IPX7 rating, 24-hour playtime, and built-in microphone for calls.",
      price: 2499,
      original_price: 3299,
      stock: 80,
      category: CATEGORIES.ELECTRONICS,
      images: [
        "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800&h=800&fit=crop"
      ],
      colors: ["Black", "Blue", "Red", "Green", "Orange"],
      sizes: [],
    },
    {
      name: "Wireless Earbuds Elite",
      description: "True wireless earbuds with hybrid ANC, transparency mode, and spatial audio. 8-hour battery with 32-hour charging case.",
      price: 3499,
      original_price: 4499,
      stock: 100,
      category: CATEGORIES.ELECTRONICS,
      images: [
        "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&h=800&fit=crop"
      ],
      colors: ["White", "Black", "Navy Blue"],
      sizes: [],
    },
    {
      name: "Power Bank 20000mAh",
      description: "High-capacity power bank with 65W fast charging, USB-C PD, and dual USB-A ports. Charges laptops and phones.",
      price: 1999,
      original_price: 2599,
      stock: 120,
      category: CATEGORIES.ELECTRONICS,
      images: [
        "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&h=800&fit=crop"
      ],
      colors: ["Black", "White", "Silver"],
      sizes: [],
    },
    {
      name: "Mechanical Gaming Keyboard",
      description: "RGB mechanical keyboard with hot-swappable switches, aircraft-grade aluminum frame, and customizable macros.",
      price: 5499,
      original_price: 6999,
      stock: 40,
      category: CATEGORIES.ELECTRONICS,
      images: [
        "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&h=800&fit=crop"
      ],
      colors: ["Black", "White"],
      sizes: ["Full Size", "TKL", "65%"],
    },
    {
      name: "Wireless Gaming Mouse",
      description: "Ultra-lightweight wireless gaming mouse with 25K DPI sensor, 70-hour battery, and programmable buttons.",
      price: 3299,
      original_price: 4199,
      stock: 60,
      category: CATEGORIES.ELECTRONICS,
      images: [
        "https://images.unsplash.com/photo-1527814050087-3793815479db?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&h=800&fit=crop"
      ],
      colors: ["Black", "White", "Pink"],
      sizes: [],
    },
    {
      name: "4K Webcam Pro",
      description: "Professional 4K webcam with auto-focus, HDR, noise-canceling dual mics, and privacy shutter.",
      price: 4299,
      original_price: 5499,
      stock: 45,
      category: CATEGORIES.ELECTRONICS,
      images: [
        "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=800&h=800&fit=crop"
      ],
      colors: ["Black"],
      sizes: [],
    },
  ],

  // Maria's Fashion House - Women's Fashion
  fashion_store: [
    {
      name: "Elegant Maxi Dress",
      description: "Beautiful flowy maxi dress perfect for special occasions. Features a flattering A-line silhouette with delicate floral patterns.",
      price: 2499,
      original_price: 3299,
      stock: 35,
      category: CATEGORIES.FASHION_WOMEN,
      images: [
        "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=800&fit=crop"
      ],
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["Blush Pink", "Navy Blue", "Burgundy", "Sage Green", "Black"],
    },
    {
      name: "Silk Blouse Premium",
      description: "Luxurious silk blouse with elegant draping. Perfect for office or evening wear.",
      price: 1899,
      original_price: 2499,
      stock: 45,
      category: CATEGORIES.FASHION_WOMEN,
      images: [
        "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&h=800&fit=crop"
      ],
      sizes: ["XS", "S", "M", "L", "XL", "XXL"],
      colors: ["Ivory", "Champagne", "Rose", "Sky Blue", "Midnight Black"],
    },
    {
      name: "High-Waist Palazzo Pants",
      description: "Comfortable and stylish palazzo pants with a flattering high waist design.",
      price: 1299,
      original_price: 1699,
      stock: 50,
      category: CATEGORIES.FASHION_WOMEN,
      images: [
        "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=800&fit=crop"
      ],
      sizes: ["24", "26", "28", "30", "32", "34"],
      colors: ["Black", "White", "Tan", "Navy", "Olive"],
    },
    {
      name: "Cropped Cardigan Knit",
      description: "Soft knit cropped cardigan, perfect for layering. Features pearl button details.",
      price: 999,
      original_price: 1399,
      stock: 60,
      category: CATEGORIES.FASHION_WOMEN,
      images: [
        "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&h=800&fit=crop"
      ],
      sizes: ["S", "M", "L", "XL"],
      colors: ["Cream", "Baby Pink", "Lavender", "Mint", "Peach"],
    },
    {
      name: "Slim Fit Polo Shirt",
      description: "Classic polo shirt with modern slim fit. Premium cotton piqué fabric.",
      price: 899,
      original_price: 1199,
      stock: 80,
      category: CATEGORIES.FASHION_MEN,
      images: [
        "https://images.unsplash.com/photo-1625910513413-5fc45a429f0d?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800&h=800&fit=crop"
      ],
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["White", "Navy", "Black", "Burgundy", "Forest Green"],
    },
    {
      name: "Denim Jacket Classic",
      description: "Timeless denim jacket with comfortable stretch. Features brass buttons and multiple pockets.",
      price: 2299,
      original_price: 2899,
      stock: 40,
      category: CATEGORIES.FASHION_MEN,
      images: [
        "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=800&fit=crop"
      ],
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["Light Blue", "Dark Blue", "Black"],
    },
    {
      name: "Linen Summer Dress",
      description: "Breathable linen dress perfect for hot summer days. Features relaxed fit and side pockets.",
      price: 1799,
      original_price: 2299,
      stock: 55,
      category: CATEGORIES.FASHION_WOMEN,
      images: [
        "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&h=800&fit=crop"
      ],
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["White", "Beige", "Light Blue", "Coral"],
    },
    {
      name: "Compression Athletic Wear Set",
      description: "High-performance compression set for workouts. Moisture-wicking fabric with 4-way stretch.",
      price: 1999,
      original_price: 2699,
      stock: 70,
      category: CATEGORIES.SPORTS,
      images: [
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=800&fit=crop"
      ],
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["Black", "Navy", "Gray", "Pink"],
    },
  ],

  // Sports & Outdoors Store
  sports_store: [
    {
      name: "Professional Running Shoes",
      description: "Lightweight running shoes with responsive cushioning and breathable mesh upper. Perfect for marathon training.",
      price: 5999,
      original_price: 7499,
      stock: 60,
      category: CATEGORIES.SHOES,
      images: [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1491553895911-0055uj0a5?w=800&h=800&fit=crop"
      ],
      sizes: ["US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12"],
      colors: ["Black/White", "Red/Black", "Blue/White", "All White", "Neon Green"],
    },
    {
      name: "Yoga Mat Premium",
      description: "Extra thick 6mm yoga mat with alignment lines. Non-slip surface and carrying strap included.",
      price: 1499,
      original_price: 1999,
      stock: 100,
      category: CATEGORIES.SPORTS,
      images: [
        "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=800&fit=crop"
      ],
      sizes: ["68 inch", "72 inch", "84 inch"],
      colors: ["Purple", "Blue", "Black", "Pink", "Green"],
    },
    {
      name: "Resistance Bands Set",
      description: "Complete set of 5 resistance bands with different tension levels. Includes door anchor and carrying bag.",
      price: 799,
      original_price: 1099,
      stock: 150,
      category: CATEGORIES.SPORTS,
      images: [
        "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800&h=800&fit=crop"
      ],
      sizes: [],
      colors: ["Multi-Color Set"],
    },
    {
      name: "Adjustable Dumbbells",
      description: "Space-saving adjustable dumbbells from 5-52.5 lbs. Quick-change dial system.",
      price: 12999,
      original_price: 15999,
      stock: 25,
      category: CATEGORIES.SPORTS,
      images: [
        "https://images.unsplash.com/photo-1586401100295-7a8096fd231a?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=800&fit=crop"
      ],
      sizes: [],
      colors: ["Black/Red", "Black/Gray"],
    },
    {
      name: "Basketball Official Size",
      description: "Official size and weight basketball with superior grip. Indoor/outdoor composite leather.",
      price: 1899,
      original_price: 2399,
      stock: 80,
      category: CATEGORIES.SPORTS,
      images: [
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=800&fit=crop"
      ],
      sizes: ["Size 5", "Size 6", "Size 7"],
      colors: ["Orange/Black", "Red/White/Blue"],
    },
    {
      name: "Tennis Racket Pro",
      description: "Professional grade tennis racket with graphite frame. Perfect balance of power and control.",
      price: 7999,
      original_price: 9999,
      stock: 30,
      category: CATEGORIES.SPORTS,
      images: [
        "https://images.unsplash.com/photo-1617083934551-ac1f1e7f0577?w=800&h=800&fit=crop"
      ],
      sizes: ["Grip 1", "Grip 2", "Grip 3", "Grip 4"],
      colors: ["Black/Red", "Blue/White"],
    },
    {
      name: "Swimming Goggles Anti-Fog",
      description: "Professional swimming goggles with anti-fog coating and UV protection. Adjustable nose bridge.",
      price: 699,
      original_price: 899,
      stock: 200,
      category: CATEGORIES.SPORTS,
      images: [
        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=800&fit=crop"
      ],
      sizes: [],
      colors: ["Black", "Blue", "Clear", "Smoke"],
    },
    {
      name: "Hiking Backpack 40L",
      description: "Durable hiking backpack with rain cover, hydration sleeve, and multiple compartments.",
      price: 3499,
      original_price: 4299,
      stock: 45,
      category: CATEGORIES.SPORTS,
      images: [
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1622260614927-208ad6139a1c?w=800&h=800&fit=crop"
      ],
      sizes: ["40L", "50L", "60L"],
      colors: ["Black", "Navy", "Olive", "Orange"],
    },
  ],

  // Home & Living Store
  home_store: [
    {
      name: "Aromatherapy Diffuser",
      description: "Ultrasonic essential oil diffuser with LED mood lighting. 300ml capacity with auto shut-off.",
      price: 1299,
      original_price: 1699,
      stock: 80,
      category: CATEGORIES.HOME,
      images: [
        "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&h=800&fit=crop"
      ],
      sizes: [],
      colors: ["White", "Wood Grain", "Black"],
    },
    {
      name: "Decorative Throw Pillows Set",
      description: "Set of 4 decorative throw pillows with removable covers. Premium cotton blend.",
      price: 1599,
      original_price: 2099,
      stock: 60,
      category: CATEGORIES.HOME,
      images: [
        "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&h=800&fit=crop"
      ],
      sizes: ["16x16 inch", "18x18 inch", "20x20 inch"],
      colors: ["Neutral Set", "Blue Tones", "Earth Tones", "Boho Mix"],
    },
    {
      name: "Ceramic Vase Set",
      description: "Set of 3 minimalist ceramic vases in varying heights. Perfect for dried flowers or fresh arrangements.",
      price: 899,
      original_price: 1199,
      stock: 100,
      category: CATEGORIES.HOME,
      images: [
        "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&h=800&fit=crop"
      ],
      sizes: [],
      colors: ["White", "Terracotta", "Sage Green", "Dusty Pink"],
    },
    {
      name: "Weighted Blanket Premium",
      description: "Luxurious weighted blanket for better sleep. Breathable cotton cover with glass bead filling.",
      price: 3999,
      original_price: 4999,
      stock: 40,
      category: CATEGORIES.HOME,
      images: [
        "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop"
      ],
      sizes: ["48x72 (12 lbs)", "60x80 (15 lbs)", "80x87 (20 lbs)"],
      colors: ["Gray", "Navy", "Blush", "Sage"],
    },
    {
      name: "LED Smart Light Bulbs 4-Pack",
      description: "WiFi-enabled smart bulbs with 16 million colors. Works with Alexa and Google Home.",
      price: 1799,
      original_price: 2299,
      stock: 120,
      category: CATEGORIES.HOME,
      images: [
        "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&h=800&fit=crop"
      ],
      sizes: [],
      colors: ["E26 Base", "E12 Base"],
    },
    {
      name: "Scented Candle Gift Set",
      description: "Set of 6 luxury scented candles in elegant glass jars. 40+ hour burn time each.",
      price: 1499,
      original_price: 1899,
      stock: 90,
      category: CATEGORIES.HOME,
      images: [
        "https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=800&h=800&fit=crop"
      ],
      sizes: [],
      colors: ["Lavender Set", "Fresh Linen Set", "Tropical Set", "Holiday Set"],
    },
  ],

  // Beauty Store
  beauty_store: [
    {
      name: "Vitamin C Serum",
      description: "Brightening vitamin C serum with hyaluronic acid. Reduces dark spots and fine lines.",
      price: 1299,
      original_price: 1699,
      stock: 150,
      category: CATEGORIES.BEAUTY,
      images: [
        "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=800&fit=crop"
      ],
      sizes: ["15ml", "30ml", "50ml"],
      colors: [],
    },
    {
      name: "Professional Makeup Brush Set",
      description: "Complete 15-piece makeup brush set with vegan synthetic bristles and leather case.",
      price: 1899,
      original_price: 2499,
      stock: 80,
      category: CATEGORIES.BEAUTY,
      images: [
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=800&fit=crop",
        "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=800&fit=crop"
      ],
      sizes: [],
      colors: ["Rose Gold", "Black", "White"],
    },
    {
      name: "Hydrating Face Moisturizer",
      description: "Lightweight gel moisturizer with aloe vera and ceramides. Non-comedogenic and fragrance-free.",
      price: 899,
      original_price: 1199,
      stock: 200,
      category: CATEGORIES.BEAUTY,
      images: [
        "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&h=800&fit=crop"
      ],
      sizes: ["50ml", "100ml"],
      colors: [],
    },
    {
      name: "Lip Gloss Collection",
      description: "Set of 6 high-shine lip glosses in trendy shades. Long-lasting and moisturizing formula.",
      price: 799,
      original_price: 1099,
      stock: 120,
      category: CATEGORIES.BEAUTY,
      images: [
        "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&h=800&fit=crop"
      ],
      sizes: [],
      colors: ["Nude Collection", "Berry Collection", "Pink Collection", "Red Collection"],
    },
    {
      name: "Hair Styling Tools Set",
      description: "Complete styling set with ceramic straightener, curling wand, and blow dryer. Ionic technology.",
      price: 4999,
      original_price: 6499,
      stock: 35,
      category: CATEGORIES.BEAUTY,
      images: [
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=800&fit=crop"
      ],
      sizes: [],
      colors: ["Black", "Rose Gold", "Purple"],
    },
    {
      name: "Organic Face Mask Set",
      description: "Set of 10 organic sheet masks targeting different skin concerns. Made with natural ingredients.",
      price: 599,
      original_price: 799,
      stock: 300,
      category: CATEGORIES.BEAUTY,
      images: [
        "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=800&fit=crop"
      ],
      sizes: [],
      colors: ["Hydrating Set", "Brightening Set", "Anti-Aging Set"],
    },
  ],
};

async function resetAndSeedProducts() {
  console.log('\n🚀 Starting Complete Product Reset and Seed\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Get all sellers
    console.log('\n📋 Step 1: Fetching sellers...');
    const { data: sellers, error: sellersError } = await supabase
      .from('sellers')
      .select('id, store_name, business_name, approval_status')
      .eq('approval_status', 'approved');

    if (sellersError) throw sellersError;

    if (!sellers || sellers.length === 0) {
      console.log('❌ No approved sellers found. Creating test sellers...');
      // We'll handle this case if needed
      return;
    }

    console.log(`✅ Found ${sellers.length} approved sellers:`);
    sellers.forEach((s, i) => console.log(`   ${i + 1}. ${s.store_name || s.business_name} (${s.id.substring(0, 8)}...)`));

    // Step 2: Delete existing order items first (foreign key constraint)
    console.log('\n📋 Step 2: Cleaning up order_items...');
    const { error: deleteItemsError } = await supabase
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteItemsError) {
      console.log(`⚠️  Warning: ${deleteItemsError.message}`);
    } else {
      console.log('✅ Order items cleaned up');
    }

    // Step 3: Delete existing cart items
    console.log('\n📋 Step 3: Cleaning up cart_items...');
    const { error: deleteCartError } = await supabase
      .from('cart_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteCartError) {
      console.log(`⚠️  Warning: ${deleteCartError.message}`);
    } else {
      console.log('✅ Cart items cleaned up');
    }

    // Step 4: Delete existing products
    console.log('\n📋 Step 4: Deleting existing products...');
    const { error: deleteProductsError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteProductsError) throw deleteProductsError;
    console.log('✅ All products deleted');

    // Step 5: Create products for each seller
    console.log('\n📋 Step 5: Creating new products...\n');
    
    let totalProducts = 0;

    for (let i = 0; i < sellers.length; i++) {
      const seller = sellers[i];
      const storeName = (seller.store_name || seller.business_name || '').toLowerCase();
      
      // Determine which product set to use based on store name
      let products: any[];
      if (storeName.includes('tech') || storeName.includes('electronic')) {
        products = STORE_PRODUCTS.tech_store;
      } else if (storeName.includes('fashion') || storeName.includes('maria') || storeName.includes('clothing')) {
        products = STORE_PRODUCTS.fashion_store;
      } else if (storeName.includes('sport') || storeName.includes('outdoor') || storeName.includes('fitness')) {
        products = STORE_PRODUCTS.sports_store;
      } else if (storeName.includes('home') || storeName.includes('living') || storeName.includes('decor')) {
        products = STORE_PRODUCTS.home_store;
      } else if (storeName.includes('beauty') || storeName.includes('cosmetic') || storeName.includes('skincare')) {
        products = STORE_PRODUCTS.beauty_store;
      } else {
        // Mix of products for general stores
        products = [
          ...STORE_PRODUCTS.tech_store.slice(0, 3),
          ...STORE_PRODUCTS.fashion_store.slice(0, 3),
          ...STORE_PRODUCTS.sports_store.slice(0, 2),
        ];
      }

      console.log(`🏪 ${seller.store_name || seller.business_name}:`);

      const productsToInsert = products.map((product) => ({
        seller_id: seller.id,
        name: product.name,
        description: product.description,
        price: product.price,
        original_price: product.original_price,
        stock: product.stock,
        category: product.category,
        images: product.images,
        primary_image: product.images[0],
        colors: product.colors || [],
        sizes: product.sizes || [],
        is_active: true,
        approval_status: 'approved',
        rating: parseFloat((Math.random() * 1 + 4).toFixed(1)), // Random rating between 4.0-5.0
        sales_count: Math.floor(Math.random() * 500) + 50,
        is_free_shipping: Math.random() > 0.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data: insertedProducts, error: insertError } = await supabase
        .from('products')
        .insert(productsToInsert)
        .select('id, name');

      if (insertError) {
        console.log(`   ❌ Error: ${insertError.message}`);
      } else {
        console.log(`   ✅ Added ${insertedProducts?.length || 0} products`);
        totalProducts += insertedProducts?.length || 0;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n🎉 Complete! Created ${totalProducts} products across ${sellers.length} stores\n`);

    // Step 6: Verify products
    console.log('📋 Verifying products...');
    const { data: allProducts, error: verifyError } = await supabase
      .from('products')
      .select('id, name, colors, sizes, status')
      .limit(10);

    if (!verifyError && allProducts) {
      console.log('\n📦 Sample products created:');
      allProducts.slice(0, 5).forEach((p) => {
        const hasColors = p.colors && p.colors.length > 0;
        const hasSizes = p.sizes && p.sizes.length > 0;
        console.log(`   - ${p.name}`);
        console.log(`     Status: ${p.status} | Colors: ${hasColors ? p.colors.length : 0} | Sizes: ${hasSizes ? p.sizes.length : 0}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

resetAndSeedProducts();
