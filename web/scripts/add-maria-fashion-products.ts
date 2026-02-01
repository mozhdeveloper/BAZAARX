/**
 * Add Fashion Products with Variants for Maria Santos Fashion Enterprise
 * 
 * This script adds fashion products with colors and sizes to Maria's store.
 * Run with: npx tsx scripts/add-maria-fashion-products.ts
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

const fashionProducts = [
  // Women's Clothing
  {
    name: "Elegant Maxi Dress",
    description: "Beautiful flowy maxi dress perfect for special occasions. Features a flattering A-line silhouette with delicate floral patterns.",
    price: 2499,
    original_price: 3299,
    stock: 35,
    category: "Women's Fashion",
    images: [
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=800&fit=crop"
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Blush Pink", "Navy Blue", "Burgundy", "Sage Green", "Black"],
    is_active: true,
    approval_status: "approved"
  },
  {
    name: "Silk Blouse Premium",
    description: "Luxurious silk blouse with elegant draping. Perfect for office or evening wear.",
    price: 1899,
    original_price: 2499,
    stock: 45,
    category: "Women's Fashion",
    images: [
      "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&h=800&fit=crop"
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["Ivory", "Champagne", "Rose", "Sky Blue", "Midnight Black"],
    is_active: true,
    approval_status: "approved"
  },
  {
    name: "High-Waist Palazzo Pants",
    description: "Comfortable and stylish palazzo pants with a flattering high waist design.",
    price: 1299,
    original_price: 1699,
    stock: 50,
    category: "Women's Fashion",
    images: [
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=800&fit=crop"
    ],
    sizes: ["24", "26", "28", "30", "32", "34"],
    colors: ["Black", "White", "Tan", "Navy", "Olive"],
    is_active: true,
    approval_status: "approved"
  },
  {
    name: "Cropped Cardigan Knit",
    description: "Soft knit cropped cardigan, perfect for layering. Features pearl button details.",
    price: 999,
    original_price: 1399,
    stock: 60,
    category: "Women's Fashion",
    images: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&h=800&fit=crop"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Cream", "Baby Pink", "Lavender", "Mint", "Peach"],
    is_active: true,
    approval_status: "approved"
  },
  // Men's Fashion
  {
    name: "Slim Fit Polo Shirt",
    description: "Classic polo shirt with modern slim fit. Premium cotton piqué fabric.",
    price: 899,
    original_price: 1199,
    stock: 80,
    category: "Men's Fashion",
    images: [
      "https://images.unsplash.com/photo-1625910513413-5fc45a3e99eb?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800&h=800&fit=crop"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White", "Navy", "Black", "Burgundy", "Forest Green", "Royal Blue"],
    is_active: true,
    approval_status: "approved"
  },
  {
    name: "Linen Summer Shirt",
    description: "Breathable linen shirt perfect for warm weather. Relaxed fit with rolled-up sleeves.",
    price: 1199,
    original_price: 1599,
    stock: 40,
    category: "Men's Fashion",
    images: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&h=800&fit=crop"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White", "Sky Blue", "Beige", "Light Gray", "Sage"],
    is_active: true,
    approval_status: "approved"
  },
  {
    name: "Tailored Chino Shorts",
    description: "Smart casual chino shorts with tailored fit. Perfect for summer occasions.",
    price: 799,
    original_price: 999,
    stock: 55,
    category: "Men's Fashion",
    images: [
      "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&h=800&fit=crop"
    ],
    sizes: ["28", "30", "32", "34", "36", "38"],
    colors: ["Khaki", "Navy", "Olive", "Stone", "Black"],
    is_active: true,
    approval_status: "approved"
  },
  // Accessories
  {
    name: "Leather Tote Bag",
    description: "Genuine leather tote bag with spacious interior. Ideal for work or everyday use.",
    price: 2999,
    original_price: 3999,
    stock: 25,
    category: "Bags & Accessories",
    images: [
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=800&fit=crop"
    ],
    sizes: [],
    colors: ["Tan", "Black", "Burgundy", "Cognac", "Navy"],
    is_active: true,
    approval_status: "approved"
  },
  {
    name: "Silk Scarf Collection",
    description: "Luxurious silk scarf with beautiful prints. Can be worn multiple ways.",
    price: 699,
    original_price: 899,
    stock: 100,
    category: "Bags & Accessories",
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&h=800&fit=crop"
    ],
    sizes: ["Small (60x60cm)", "Large (90x90cm)"],
    colors: ["Floral Print", "Geometric", "Animal Print", "Paisley", "Solid Colors"],
    is_active: true,
    approval_status: "approved"
  },
  {
    name: "Statement Earrings Set",
    description: "Elegant statement earrings set with various designs. Hypoallergenic materials.",
    price: 499,
    original_price: 699,
    stock: 75,
    category: "Jewelry",
    images: [
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop"
    ],
    sizes: [],
    colors: ["Gold", "Silver", "Rose Gold", "Pearl", "Crystal"],
    is_active: true,
    approval_status: "approved"
  },
  // Footwear
  {
    name: "Block Heel Sandals",
    description: "Comfortable block heel sandals with ankle strap. Perfect for all-day wear.",
    price: 1599,
    original_price: 2199,
    stock: 35,
    category: "Footwear",
    images: [
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&h=800&fit=crop"
    ],
    sizes: ["35", "36", "37", "38", "39", "40", "41"],
    colors: ["Nude", "Black", "Tan", "White", "Red"],
    is_active: true,
    approval_status: "approved"
  },
  {
    name: "Canvas Sneakers Classic",
    description: "Timeless canvas sneakers with comfortable cushioned insole. Unisex design.",
    price: 1299,
    original_price: 1699,
    stock: 65,
    category: "Footwear",
    images: [
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=800&fit=crop"
    ],
    sizes: ["36", "37", "38", "39", "40", "41", "42", "43", "44"],
    colors: ["White", "Black", "Navy", "Red", "Pastel Pink", "Mint Green"],
    is_active: true,
    approval_status: "approved"
  }
];

async function addMariaProducts() {
  console.log('\n👗 Adding Fashion Products for Maria Santos Fashion Enterprise\n');
  console.log('='.repeat(70));

  // Find Maria's seller account
  const { data: sellers, error: sellerError } = await supabase
    .from('sellers')
    .select('id, business_name')
    .or('business_name.ilike.%maria%,business_name.ilike.%fashion%');

  if (sellerError) {
    console.error('❌ Error finding seller:', sellerError.message);
    process.exit(1);
  }

  console.log('Found sellers:', sellers);

  if (!sellers || sellers.length === 0) {
    console.error('❌ Maria Santos Fashion Enterprise not found.');
    console.log('   Searching for any approved seller instead...');
    
    const { data: anySeller } = await supabase
      .from('sellers')
      .select('id, business_name')
      .eq('approval_status', 'approved')
      .limit(1);
    
    if (!anySeller || anySeller.length === 0) {
      console.error('❌ No approved sellers found.');
      process.exit(1);
    }
    
    sellers.push(anySeller[0]);
  }

  const seller = sellers[0];
  console.log(`\n📦 Adding products to: ${seller.business_name} (${seller.id})\n`);

  let successCount = 0;
  let failCount = 0;

  for (const product of fashionProducts) {
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
      console.log(`✅ ${product.name}`);
      console.log(`   💰 ₱${product.price.toLocaleString()} | 📦 ${product.stock} in stock`);
      console.log(`   🎨 Colors: ${product.colors.join(', ')}`);
      if (product.sizes.length > 0) {
        console.log(`   📐 Sizes: ${product.sizes.join(', ')}`);
      }
      console.log('');
      successCount++;
    }
  }

  console.log('='.repeat(70));
  console.log(`\n📊 Results: ${successCount} products added, ${failCount} failed\n`);
  
  if (successCount > 0) {
    console.log('🎉 Fashion products added successfully!');
    console.log(`   Store: ${seller.business_name}`);
    console.log('   Test POS: http://localhost:5173/seller/pos');
    console.log('   View Store: http://localhost:5173/seller/' + seller.id);
    console.log('');
  }
}

addMariaProducts().catch(console.error);
