/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║           BAZAARPH - POPULATE PRODUCTS & BUYERS (NO CLEAN)                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║           BAZAARPH - POPULATE PRODUCTS & BUYERS                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  // Get existing data
  const { data: categories } = await supabase.from('categories').select('id,slug');
  const { data: sellers } = await supabase.from('sellers').select('id,store_name');
  
  console.log(`Found ${categories?.length} categories, ${sellers?.length} sellers`);

  const categoryMap: Record<string, string> = {};
  categories?.forEach(c => categoryMap[c.slug] = c.id);

  const sellerMap: Record<string, string> = {};
  sellers?.forEach(s => {
    if (s.store_name === 'TechHub Manila') sellerMap['seller1'] = s.id;
    if (s.store_name === 'Fashion Forward PH') sellerMap['seller2'] = s.id;
    if (s.store_name === 'Home & Living Co.') sellerMap['seller3'] = s.id;
  });

  console.log('Seller mapping:', sellerMap);

  // Clean existing products first
  await supabase.from('product_images').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('product_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleaned existing products');

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE BUYERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('\n📦 CREATING BUYERS...\n');

  const buyers = [
    { email: 'buyer1@bazaarph.com', password: 'Buyer123!', first_name: 'Ana', last_name: 'Santos', bazcoins: 500 },
    { email: 'buyer2@bazaarph.com', password: 'Buyer123!', first_name: 'Juan', last_name: 'Cruz', bazcoins: 1000 },
    { email: 'buyer3@bazaarph.com', password: 'Buyer123!', first_name: 'Maria', last_name: 'Garcia', bazcoins: 250 },
  ];

  const buyerIds: Record<string, string> = {};

  for (const b of buyers) {
    const { data: signIn } = await supabase.auth.signInWithPassword({ email: b.email, password: b.password });
    if (signIn.user) {
      buyerIds[b.email] = signIn.user.id;
      await supabase.from('profiles').upsert({ id: signIn.user.id, email: b.email, first_name: b.first_name, last_name: b.last_name });
      await supabase.from('user_roles').upsert({ user_id: signIn.user.id, role: 'buyer' });
      await supabase.from('buyers').upsert({ id: signIn.user.id, bazcoins: b.bazcoins });
      await supabase.from('carts').upsert({ buyer_id: signIn.user.id });
      console.log(`  ✅ ${b.first_name} ${b.last_name}: ${signIn.user.id.substring(0, 8)}...`);
    }
    await delay(500);
  }

  await supabase.auth.signOut();

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE PRODUCTS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n📦 CREATING PRODUCTS...\n');

  const products = [
    // TechHub Manila - Electronics
    {
      seller: 'seller1', category: 'electronics',
      name: 'iPhone 15 Pro Max', brand: 'Apple', price: 79990, sku: 'IPHONE15PM-256',
      description: `Experience the pinnacle of smartphone technology with the iPhone 15 Pro Max. Featuring the groundbreaking A17 Pro chip, this device delivers unprecedented performance for gaming, photography, and productivity.

KEY FEATURES:
• A17 Pro chip with 6-core GPU for console-level gaming
• 48MP Main camera with 5x optical zoom
• Action button for customizable shortcuts
• Titanium design - lighter and more durable
• USB-C with USB 3 speeds
• All-day battery life with fast charging`,
      variants: [
        { variant_name: '256GB - Natural Titanium', size: '256GB', color: 'Natural Titanium', price: 79990, stock: 25, sku: 'IP15PM-256-NAT' },
        { variant_name: '256GB - Blue Titanium', size: '256GB', color: 'Blue Titanium', price: 79990, stock: 20, sku: 'IP15PM-256-BLU' },
        { variant_name: '512GB - Black Titanium', size: '512GB', color: 'Black Titanium', price: 89990, stock: 15, sku: 'IP15PM-512-BLK' },
      ],
      images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800'],
    },
    {
      seller: 'seller1', category: 'electronics',
      name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', price: 69990, sku: 'GALAXY-S24U-256',
      description: `The Samsung Galaxy S24 Ultra redefines mobile AI with Galaxy AI built in. Capture stunning photos, communicate across languages in real-time, and experience the power of AI in your pocket.

KEY FEATURES:
• Galaxy AI for intelligent assistance
• 200MP camera with advanced Nightography
• S Pen built-in for productivity
• 6.8" QHD+ Dynamic AMOLED 2X display
• Titanium frame for durability`,
      variants: [
        { variant_name: '256GB - Titanium Black', size: '256GB', color: 'Titanium Black', price: 69990, stock: 30, sku: 'S24U-256-BLK' },
        { variant_name: '256GB - Titanium Violet', size: '256GB', color: 'Titanium Violet', price: 69990, stock: 25, sku: 'S24U-256-VIO' },
        { variant_name: '512GB - Titanium Gray', size: '512GB', color: 'Titanium Gray', price: 79990, stock: 20, sku: 'S24U-512-GRY' },
      ],
      images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800', 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800'],
    },
    {
      seller: 'seller1', category: 'electronics',
      name: 'Apple AirPods Pro (2nd Generation)', brand: 'Apple', price: 14990, sku: 'AIRPODS-PRO-2',
      description: `Rebuilt from the sound up. AirPods Pro feature up to 2x more Active Noise Cancellation, plus Adaptive Transparency, and Personalized Spatial Audio with dynamic head tracking.

KEY FEATURES:
• Active Noise Cancellation up to 2x more effective
• Adaptive Transparency for natural listening
• Touch control for volume adjustment
• Up to 6 hours of listening time`,
      variants: [
        { variant_name: 'White', size: 'One Size', color: 'White', price: 14990, stock: 50, sku: 'APP2-WHT' },
      ],
      images: ['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800', 'https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=800'],
    },
    {
      seller: 'seller1', category: 'electronics',
      name: 'MacBook Air M3 (2024)', brand: 'Apple', price: 74990, sku: 'MBA-M3-13-8GB',
      description: `Impossibly thin and light, MacBook Air is now supercharged by the M3 chip. With up to 18 hours of battery life and a silent, fanless design, you can work, create, and play anywhere.

KEY FEATURES:
• Apple M3 chip with 8-core CPU
• Up to 18 hours battery life
• 13.6" Liquid Retina display
• 1080p FaceTime HD camera`,
      variants: [
        { variant_name: '8GB/256GB - Midnight', size: '8GB RAM', color: 'Midnight', price: 74990, stock: 15, sku: 'MBA-M3-8-256-MID' },
        { variant_name: '8GB/256GB - Starlight', size: '8GB RAM', color: 'Starlight', price: 74990, stock: 12, sku: 'MBA-M3-8-256-STR' },
        { variant_name: '16GB/512GB - Space Gray', size: '16GB RAM', color: 'Space Gray', price: 94990, stock: 8, sku: 'MBA-M3-16-512-GRY' },
      ],
      images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800'],
    },
    {
      seller: 'seller1', category: 'electronics',
      name: 'Sony WH-1000XM5 Wireless Headphones', brand: 'Sony', price: 21990, sku: 'SONY-XM5',
      description: `Industry-leading noise canceling with eight microphones. Designed to be supremely comfortable, with incredibly natural sound.

KEY FEATURES:
• Industry-leading noise cancellation
• Exceptional sound quality
• 30-hour battery life
• Multipoint connection`,
      variants: [
        { variant_name: 'Black', size: 'One Size', color: 'Black', price: 21990, stock: 20, sku: 'XM5-BLK' },
        { variant_name: 'Silver', size: 'One Size', color: 'Silver', price: 21990, stock: 15, sku: 'XM5-SLV' },
      ],
      images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800'],
    },

    // Fashion Forward PH - Fashion
    {
      seller: 'seller2', category: 'fashion',
      name: 'Premium Cotton Polo Shirt', brand: 'Fashion Forward', price: 899, sku: 'POLO-PREMIUM-001',
      description: `Elevate your casual wardrobe with our Premium Cotton Polo. Crafted from 100% long-staple cotton, this polo offers exceptional softness and breathability.

FEATURES:
• 100% premium long-staple cotton
• Classic fit with modern tailoring
• Ribbed collar and cuffs`,
      variants: [
        { variant_name: 'Small - Navy Blue', size: 'S', color: 'Navy Blue', price: 899, stock: 40, sku: 'POLO-S-NVY' },
        { variant_name: 'Medium - Navy Blue', size: 'M', color: 'Navy Blue', price: 899, stock: 50, sku: 'POLO-M-NVY' },
        { variant_name: 'Large - White', size: 'L', color: 'White', price: 899, stock: 45, sku: 'POLO-L-WHT' },
        { variant_name: 'XL - Black', size: 'XL', color: 'Black', price: 899, stock: 35, sku: 'POLO-XL-BLK' },
      ],
      images: ['https://images.unsplash.com/photo-1625910513413-5fc5c89c77c4?w=800', 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800'],
    },
    {
      seller: 'seller2', category: 'fashion',
      name: 'Slim Fit Chino Pants', brand: 'Fashion Forward', price: 1299, sku: 'CHINO-SLIM-001',
      description: `Our best-selling Slim Fit Chinos combine style and comfort. Perfect for office wear or smart casual occasions.

FEATURES:
• 98% cotton, 2% spandex for stretch
• Slim fit with tapered leg
• YKK zipper`,
      variants: [
        { variant_name: '30 - Khaki', size: '30', color: 'Khaki', price: 1299, stock: 30, sku: 'CHINO-30-KHK' },
        { variant_name: '32 - Khaki', size: '32', color: 'Khaki', price: 1299, stock: 40, sku: 'CHINO-32-KHK' },
        { variant_name: '34 - Navy', size: '34', color: 'Navy', price: 1299, stock: 35, sku: 'CHINO-34-NVY' },
      ],
      images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800'],
    },
    {
      seller: 'seller2', category: 'fashion',
      name: 'Floral Summer Dress', brand: 'Fashion Forward', price: 1599, sku: 'DRESS-FLORAL-001',
      description: `Embrace the tropical vibes with our beautiful Floral Summer Dress. Light, flowy, and perfect for sunny days.

FEATURES:
• 100% viscose fabric
• Flattering A-line silhouette
• Adjustable spaghetti straps`,
      variants: [
        { variant_name: 'Small - Blue Floral', size: 'S', color: 'Blue Floral', price: 1599, stock: 25, sku: 'DRESS-S-BLU' },
        { variant_name: 'Medium - Blue Floral', size: 'M', color: 'Blue Floral', price: 1599, stock: 30, sku: 'DRESS-M-BLU' },
        { variant_name: 'Large - Pink Floral', size: 'L', color: 'Pink Floral', price: 1599, stock: 20, sku: 'DRESS-L-PNK' },
      ],
      images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800'],
    },
    {
      seller: 'seller2', category: 'fashion',
      name: 'Canvas Sneakers Classic', brand: 'Fashion Forward', price: 1499, sku: 'SNEAKER-CANVAS-001',
      description: `Timeless style meets everyday comfort. Our Canvas Sneakers Classic are perfect for any casual occasion.

FEATURES:
• Premium canvas upper
• Vulcanized rubber sole
• Cushioned insole`,
      variants: [
        { variant_name: 'US 8 - White', size: 'US 8', color: 'White', price: 1499, stock: 25, sku: 'SNK-8-WHT' },
        { variant_name: 'US 9 - Black', size: 'US 9', color: 'Black', price: 1499, stock: 30, sku: 'SNK-9-BLK' },
        { variant_name: 'US 10 - Navy', size: 'US 10', color: 'Navy', price: 1499, stock: 20, sku: 'SNK-10-NVY' },
      ],
      images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800', 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800'],
    },
    {
      seller: 'seller2', category: 'fashion',
      name: 'Leather Tote Bag', brand: 'Fashion Forward', price: 2499, sku: 'BAG-TOTE-001',
      description: `A spacious and elegant tote bag crafted from premium vegan leather. Perfect for work or everyday use.

DIMENSIONS:
• Width: 35cm, Height: 30cm, Depth: 12cm`,
      variants: [
        { variant_name: 'Black', size: 'One Size', color: 'Black', price: 2499, stock: 25, sku: 'TOTE-BLK' },
        { variant_name: 'Brown', size: 'One Size', color: 'Brown', price: 2499, stock: 20, sku: 'TOTE-BRN' },
      ],
      images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800'],
    },

    // Home & Living Co.
    {
      seller: 'seller3', category: 'home-living',
      name: 'Scandinavian Wooden Coffee Table', brand: 'Home & Living Co.', price: 7999, sku: 'TABLE-SCAND-001',
      description: `Bring Nordic elegance to your living room. Handcrafted from sustainable acacia wood.

DIMENSIONS:
• Length: 100cm, Width: 50cm, Height: 45cm`,
      variants: [
        { variant_name: 'Natural Oak', size: '100x50cm', color: 'Natural Oak', price: 7999, stock: 15, sku: 'TBL-NAT' },
        { variant_name: 'Walnut', size: '100x50cm', color: 'Walnut', price: 8499, stock: 10, sku: 'TBL-WAL' },
      ],
      images: ['https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800', 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800'],
    },
    {
      seller: 'seller3', category: 'home-living',
      name: 'Premium Bedsheet Set (Queen)', brand: 'Home & Living Co.', price: 2999, sku: 'BEDSHEET-QUEEN-001',
      description: `Experience hotel-quality comfort. Made from 400-thread count Egyptian cotton.

INCLUDES:
• 1 Fitted sheet, 1 Flat sheet, 2 Pillowcases`,
      variants: [
        { variant_name: 'Pure White', size: 'Queen', color: 'White', price: 2999, stock: 30, sku: 'BED-Q-WHT' },
        { variant_name: 'Cloud Gray', size: 'Queen', color: 'Gray', price: 2999, stock: 25, sku: 'BED-Q-GRY' },
        { variant_name: 'Navy Blue', size: 'Queen', color: 'Navy', price: 2999, stock: 20, sku: 'BED-Q-NVY' },
      ],
      images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800'],
    },
    {
      seller: 'seller3', category: 'home-living',
      name: 'Ceramic Plant Pot Set (3 pcs)', brand: 'Home & Living Co.', price: 1299, sku: 'POT-CERAMIC-SET',
      description: `Add life to your space. Perfect for indoor plants, succulents, or herbs.

INCLUDES:
• Small pot: 10cm, Medium pot: 15cm, Large pot: 20cm`,
      variants: [
        { variant_name: 'Matte White', size: 'Set of 3', color: 'White', price: 1299, stock: 40, sku: 'POT-SET-WHT' },
        { variant_name: 'Terracotta', size: 'Set of 3', color: 'Terracotta', price: 1299, stock: 35, sku: 'POT-SET-TER' },
      ],
      images: ['https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800'],
    },
    {
      seller: 'seller3', category: 'home-living',
      name: 'LED Smart Ceiling Light', brand: 'Home & Living Co.', price: 3499, sku: 'LIGHT-LED-SMART',
      description: `Control brightness and color temperature with remote or smartphone app.

SPECIFICATIONS:
• Power: 36W, Lumens: 3600lm, Diameter: 50cm`,
      variants: [
        { variant_name: '36W - Warm/Cool White', size: '50cm', color: 'White', price: 3499, stock: 25, sku: 'LED-36W-WHT' },
        { variant_name: '36W - RGB', size: '50cm', color: 'RGB', price: 3999, stock: 15, sku: 'LED-36W-RGB' },
      ],
      images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800', 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=800'],
    },
    {
      seller: 'seller3', category: 'beauty-health',
      name: 'Aromatherapy Essential Oil Diffuser', brand: 'Home & Living Co.', price: 1499, sku: 'DIFFUSER-AROMA-001',
      description: `Create a relaxing atmosphere. 300ml capacity with 7 LED mood lights.

FEATURES:
• Ultrasonic technology (whisper quiet)
• Auto shut-off when empty
• Timer: 1H/3H/6H/Continuous`,
      variants: [
        { variant_name: 'Wood Grain', size: '300ml', color: 'Wood Grain', price: 1499, stock: 45, sku: 'DIFF-WOOD' },
        { variant_name: 'White Marble', size: '300ml', color: 'White Marble', price: 1599, stock: 35, sku: 'DIFF-MARBLE' },
      ],
      images: ['https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800', 'https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800'],
    },
    {
      seller: 'seller3', category: 'home-living',
      name: 'Organic Bamboo Bath Towel Set', brand: 'Home & Living Co.', price: 1899, sku: 'TOWEL-BAMBOO-SET',
      description: `100% organic bamboo fiber. Naturally antibacterial, hypoallergenic, and incredibly soft.

INCLUDES:
• 2 Bath towels, 2 Hand towels, 2 Face towels`,
      variants: [
        { variant_name: 'Pure White', size: '6-piece set', color: 'White', price: 1899, stock: 35, sku: 'TWL-SET-WHT' },
        { variant_name: 'Cloud Gray', size: '6-piece set', color: 'Gray', price: 1899, stock: 30, sku: 'TWL-SET-GRY' },
        { variant_name: 'Sage Green', size: '6-piece set', color: 'Sage', price: 1899, stock: 25, sku: 'TWL-SET-SGE' },
      ],
      images: ['https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=800', 'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=800'],
    },
  ];

  const productIds: Record<string, string> = {};
  let totalStock = 0;

  for (const p of products) {
    const sellerId = sellerMap[p.seller];
    const categoryId = categoryMap[p.category];

    if (!sellerId || !categoryId) {
      console.log(`  ❌ ${p.name}: Missing seller or category`);
      continue;
    }

    // Create product (QA APPROVED)
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: p.name,
        description: p.description,
        price: p.price,
        category_id: categoryId,
        seller_id: sellerId,
        brand: p.brand,
        sku: p.sku,
        approval_status: 'approved',
      })
      .select()
      .single();

    if (error || !product) {
      console.log(`  ❌ ${p.name}: ${error?.message}`);
      continue;
    }

    productIds[p.sku] = product.id;

    // Create variants
    for (const v of p.variants) {
      await supabase.from('product_variants').insert({
        product_id: product.id,
        ...v,
      });
      totalStock += v.stock;
    }

    // Create images
    for (let i = 0; i < p.images.length; i++) {
      await supabase.from('product_images').insert({
        product_id: product.id,
        image_url: p.images[i],
        is_primary: i === 0,
        sort_order: i,
      });
    }

    console.log(`  ✅ ${p.name} (${p.variants.length} variants)`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE REVIEWS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n📦 CREATING REVIEWS...\n');

  const reviews = [
    { sku: 'IPHONE15PM-256', buyer: 'buyer1@bazaarph.com', rating: 5, title: 'Best iPhone Ever!', comment: 'The camera is absolutely incredible. Highly recommend!' },
    { sku: 'IPHONE15PM-256', buyer: 'buyer2@bazaarph.com', rating: 4, title: 'Great but pricey', comment: 'Amazing phone with top-notch performance.' },
    { sku: 'GALAXY-S24U-256', buyer: 'buyer3@bazaarph.com', rating: 5, title: 'Galaxy AI is amazing', comment: 'The AI features are game-changing!' },
    { sku: 'AIRPODS-PRO-2', buyer: 'buyer1@bazaarph.com', rating: 5, title: 'Noise cancellation is insane', comment: 'Perfect for commuting!' },
    { sku: 'MBA-M3-13-8GB', buyer: 'buyer2@bazaarph.com', rating: 5, title: 'Silent and powerful', comment: 'No fan noise at all. Perfect for WFH.' },
    { sku: 'POLO-PREMIUM-001', buyer: 'buyer1@bazaarph.com', rating: 5, title: 'Super comfortable', comment: 'Best polo I have ever owned.' },
    { sku: 'POLO-PREMIUM-001', buyer: 'buyer3@bazaarph.com', rating: 4, title: 'Good quality', comment: 'Nice fit and material.' },
    { sku: 'CHINO-SLIM-001', buyer: 'buyer2@bazaarph.com', rating: 5, title: 'Perfect for office', comment: 'Great fit, comfortable all day.' },
    { sku: 'DRESS-FLORAL-001', buyer: 'buyer3@bazaarph.com', rating: 5, title: 'Love the print!', comment: 'So pretty and flowy.' },
    { sku: 'TABLE-SCAND-001', buyer: 'buyer1@bazaarph.com', rating: 5, title: 'Beautiful craftsmanship', comment: 'The wood grain is gorgeous.' },
    { sku: 'BEDSHEET-QUEEN-001', buyer: 'buyer2@bazaarph.com', rating: 5, title: 'Hotel quality at home', comment: 'So silky smooth!' },
    { sku: 'POT-CERAMIC-SET', buyer: 'buyer3@bazaarph.com', rating: 5, title: 'Perfect for my plants', comment: 'Beautiful pots with great drainage.' },
    { sku: 'DIFFUSER-AROMA-001', buyer: 'buyer1@bazaarph.com', rating: 5, title: 'So relaxing', comment: 'Use it every night. LED colors are pretty!' },
    { sku: 'TOWEL-BAMBOO-SET', buyer: 'buyer2@bazaarph.com', rating: 5, title: 'Softest towels ever', comment: 'Incredibly soft and absorbent.' },
  ];

  let reviewCount = 0;
  for (const r of reviews) {
    const productId = productIds[r.sku];
    const buyerId = buyerIds[r.buyer];

    if (!productId || !buyerId) continue;

    const { error } = await supabase.from('reviews').insert({
      product_id: productId,
      buyer_id: buyerId,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      is_verified_purchase: true,
      status: 'approved',
    });

    if (!error) {
      reviewCount++;
      console.log(`  ✅ "${r.title}" (${r.rating}★)`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  const { data: finalProducts } = await supabase.from('products').select('id');
  const { data: finalVariants } = await supabase.from('product_variants').select('id');
  const { data: finalBuyers } = await supabase.from('buyers').select('id');

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         POPULATION COMPLETE                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log(`
  📊 SUMMARY:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Categories:     8
  ✅ Sellers:        3
  ✅ Buyers:         ${finalBuyers?.length || 0}
  ✅ Products:       ${finalProducts?.length || 0} (ALL QA APPROVED)
  ✅ Variants:       ${finalVariants?.length || 0}
  ✅ Total Stock:    ${totalStock} units
  ✅ Reviews:        ${reviewCount}
  `);

  console.log('  🔑 TEST ACCOUNTS:');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SELLERS (Password: Seller123!)');
  console.log('    • seller1@bazaarph.com - TechHub Manila');
  console.log('    • seller2@bazaarph.com - Fashion Forward PH');
  console.log('    • seller3@bazaarph.com - Home & Living Co.');
  console.log('');
  console.log('  BUYERS (Password: Buyer123!)');
  console.log('    • buyer1@bazaarph.com - Ana Santos (500 BazCoins)');
  console.log('    • buyer2@bazaarph.com - Juan Cruz (1000 BazCoins)');
  console.log('    • buyer3@bazaarph.com - Maria Garcia (250 BazCoins)');
  console.log('');
  console.log('  ADMIN (Password: Admin123!)');
  console.log('    • admin@bazaarph.com');
  console.log('    • qa@bazaarph.com (Password: QA123456!)');
  console.log('');
}

main().catch(console.error);
