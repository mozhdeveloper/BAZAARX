/**
 * Seed Buyers and Reviews Script
 * Creates complete buyer accounts with profiles, addresses, and product reviews
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Filipino names for realistic buyer data
const buyers = [
  {
    email: 'anna.cruz@gmail.com',
    password: 'Buyer123!',
    full_name: 'Anna Marie Cruz',
    phone: '+63 917 111 2222',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    address: {
      label: 'Home',
      first_name: 'Anna Marie',
      last_name: 'Cruz',
      phone: '09171112222',
      street: '123 Rizal Street, Brgy. San Antonio',
      barangay: 'San Antonio',
      city: 'Makati City',
      province: 'Metro Manila',
      region: 'NCR',
      zip_code: '1203',
      landmark: 'Near Mercury Drug',
      address_type: 'residential',
    }
  },
  {
    email: 'miguel.santos@gmail.com',
    password: 'Buyer123!',
    full_name: 'Miguel Antonio Santos',
    phone: '+63 918 222 3333',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    address: {
      label: 'Home',
      first_name: 'Miguel Antonio',
      last_name: 'Santos',
      phone: '09182223333',
      street: '456 Bonifacio Avenue, Villa Verde',
      barangay: 'Villa Verde',
      city: 'Quezon City',
      province: 'Metro Manila',
      region: 'NCR',
      zip_code: '1105',
      landmark: 'Beside 7-Eleven',
      address_type: 'residential',
    }
  },
  {
    email: 'sofia.reyes@gmail.com',
    password: 'Buyer123!',
    full_name: 'Sofia Gabrielle Reyes',
    phone: '+63 919 333 4444',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    address: {
      label: 'Office',
      first_name: 'Sofia Gabrielle',
      last_name: 'Reyes',
      phone: '09193334444',
      street: '789 Ayala Tower, 34th Floor',
      barangay: 'Bel-Air',
      city: 'Makati City',
      province: 'Metro Manila',
      region: 'NCR',
      zip_code: '1209',
      landmark: 'Ayala Triangle Gardens',
      address_type: 'commercial',
    }
  },
  {
    email: 'carlos.garcia@gmail.com',
    password: 'Buyer123!',
    full_name: 'Carlos Miguel Garcia',
    phone: '+63 920 444 5555',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    address: {
      label: 'Home',
      first_name: 'Carlos Miguel',
      last_name: 'Garcia',
      phone: '09204445555',
      street: '101 Mabini Street, Phase 2',
      barangay: 'Kapitolyo',
      city: 'Pasig City',
      province: 'Metro Manila',
      region: 'NCR',
      zip_code: '1603',
      landmark: 'Near Capitol Commons',
      address_type: 'residential',
    }
  },
  {
    email: 'isabella.fernandez@gmail.com',
    password: 'Buyer123!',
    full_name: 'Isabella Rose Fernandez',
    phone: '+63 921 555 6666',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    address: {
      label: 'Condo',
      first_name: 'Isabella Rose',
      last_name: 'Fernandez',
      phone: '09215556666',
      street: 'Unit 1507 Azure Residences',
      barangay: 'Bagumbayan',
      city: 'Taguig City',
      province: 'Metro Manila',
      region: 'NCR',
      zip_code: '1634',
      landmark: 'Near BGC High Street',
      address_type: 'residential',
    }
  },
  {
    email: 'rafael.mendoza@gmail.com',
    password: 'Buyer123!',
    full_name: 'Rafael Jose Mendoza',
    phone: '+63 922 666 7777',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    address: {
      label: 'Home',
      first_name: 'Rafael Jose',
      last_name: 'Mendoza',
      phone: '09226667777',
      street: '202 España Boulevard, Tower A',
      barangay: 'Sampaloc',
      city: 'Manila City',
      province: 'Metro Manila',
      region: 'NCR',
      zip_code: '1008',
      landmark: 'Near UST',
      address_type: 'residential',
    }
  },
  {
    email: 'gabriela.torres@gmail.com',
    password: 'Buyer123!',
    full_name: 'Gabriela Maria Torres',
    phone: '+63 923 777 8888',
    avatar_url: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150',
    address: {
      label: 'Home',
      first_name: 'Gabriela Maria',
      last_name: 'Torres',
      phone: '09237778888',
      street: '303 Katipunan Avenue, Blk 5',
      barangay: 'Loyola Heights',
      city: 'Quezon City',
      province: 'Metro Manila',
      region: 'NCR',
      zip_code: '1108',
      landmark: 'Near Ateneo',
      address_type: 'residential',
    }
  },
  {
    email: 'daniel.villanueva@gmail.com',
    password: 'Buyer123!',
    full_name: 'Daniel James Villanueva',
    phone: '+63 924 888 9999',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    address: {
      label: 'Home',
      first_name: 'Daniel James',
      last_name: 'Villanueva',
      phone: '09248889999',
      street: '404 Ortigas Avenue Extension',
      barangay: 'Rosario',
      city: 'Pasig City',
      province: 'Metro Manila',
      region: 'NCR',
      zip_code: '1609',
      landmark: 'Near SM East Ortigas',
      address_type: 'residential',
    }
  },
];

// Realistic review comments by category
const reviewComments = {
  positive: [
    "Excellent quality! Exactly as described. Fast shipping too! 🌟",
    "Love it! Super happy with my purchase. Will definitely buy again.",
    "Amazing product! The quality exceeded my expectations. Highly recommended!",
    "Perfect fit and great material. Very satisfied with this purchase.",
    "Best purchase I've made this month! Great value for money.",
    "Sobrang ganda! Sulit na sulit ang bayad. Thank you seller! ❤️",
    "Fast delivery and well-packaged. Product is exactly as shown in photos.",
    "Super worth it! Already ordered another one for my friend.",
    "The quality is outstanding. I'm impressed with the attention to detail.",
    "Arrived earlier than expected. Packaging was secure and product is perfect!",
  ],
  neutral: [
    "Good product overall. Shipping took a bit longer than expected.",
    "Decent quality for the price. Not bad, not amazing.",
    "Product is okay. Could be better packaging though.",
    "It's alright. Does what it's supposed to do.",
    "Average quality but reasonable price. Would consider buying again.",
  ],
  negative: [
    "Product quality not as expected. Color is slightly different from photos.",
    "Took too long to arrive. Product is okay though.",
    "Size runs small. Should have ordered one size up.",
  ],
};

async function seedBuyersAndReviews() {
  console.log('============================================================');
  console.log('SEEDING BUYERS AND REVIEWS');
  console.log('============================================================\n');

  const buyerIds: { id: string; name: string }[] = [];
  let buyersCreated = 0;
  let addressesCreated = 0;
  let reviewsCreated = 0;

  // Step 1: Create buyer accounts
  console.log('👤 Creating Buyer Accounts...\n');

  for (const buyer of buyers) {
    console.log(`Processing: ${buyer.full_name}`);

    let userId: string | null = null;

    // Try to sign in first (user might exist)
    const { data: signInData } = await supabase.auth.signInWithPassword({
      email: buyer.email,
      password: buyer.password,
    });

    if (signInData?.user) {
      userId = signInData.user.id;
      console.log(`   ⏭️ User exists: ${buyer.email}`);
      await supabase.auth.signOut();
    } else {
      // Create new user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: buyer.email,
        password: buyer.password,
        options: {
          data: {
            full_name: buyer.full_name,
            role: 'buyer',
          }
        }
      });

      if (authError) {
        console.log(`   ❌ Auth error: ${authError.message}`);
        continue;
      }

      if (authData.user) {
        userId = authData.user.id;
        console.log(`   ✅ Created auth user: ${buyer.email}`);
      }
    }

    if (!userId) continue;

    buyerIds.push({ id: userId, name: buyer.full_name });

    // Update/Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: buyer.email,
        full_name: buyer.full_name,
        phone: buyer.phone,
        avatar_url: buyer.avatar_url,
        user_type: 'buyer',
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.log(`   ⚠️ Profile error: ${profileError.message}`);
    } else {
      console.log(`   ✅ Profile updated`);
      buyersCreated++;
    }

    // Check if address exists
    const { data: existingAddress } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', userId)
      .eq('label', buyer.address.label)
      .single();

    if (!existingAddress) {
      // Create address
      const { error: addressError } = await supabase
        .from('addresses')
        .insert({
          user_id: userId,
          ...buyer.address,
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (addressError) {
        console.log(`   ⚠️ Address error: ${addressError.message}`);
      } else {
        console.log(`   ✅ Address created`);
        addressesCreated++;
      }
    } else {
      console.log(`   ⏭️ Address exists`);
    }
  }

  // Step 2: Create orders and reviews for products
  console.log('\n📦 Creating Orders and Reviews...\n');

  // Get all approved products with seller info
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, seller_id, price')
    .eq('approval_status', 'approved');

  if (productsError || !products) {
    console.error('Failed to fetch products:', productsError?.message);
    return;
  }

  console.log(`Found ${products.length} products to create orders/reviews for\n`);

  // Create 3-6 orders/reviews per product
  for (const product of products) {
    const numReviews = Math.floor(Math.random() * 4) + 3; // 3-6 reviews
    const reviewers = [...buyerIds].sort(() => Math.random() - 0.5).slice(0, numReviews);

    console.log(`📦 ${product.name.substring(0, 40)}...`);

    for (const reviewer of reviewers) {
      // Check if review already exists for this buyer/product
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('product_id', product.id)
        .eq('buyer_id', reviewer.id)
        .single();

      if (existingReview) {
        continue;
      }

      // Generate rating (weighted towards positive)
      const ratingRoll = Math.random();
      let rating: number;
      let comment: string;

      if (ratingRoll < 0.6) {
        rating = 5;
        comment = reviewComments.positive[Math.floor(Math.random() * reviewComments.positive.length)];
      } else if (ratingRoll < 0.85) {
        rating = 4;
        comment = reviewComments.positive[Math.floor(Math.random() * reviewComments.positive.length)];
      } else if (ratingRoll < 0.95) {
        rating = 3;
        comment = reviewComments.neutral[Math.floor(Math.random() * reviewComments.neutral.length)];
      } else {
        rating = Math.random() < 0.5 ? 2 : 3;
        comment = reviewComments.negative[Math.floor(Math.random() * reviewComments.negative.length)];
      }

      // Create a completed order first
      const orderDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000); // Random date in last 60 days
      const deliveryDate = new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days after order
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          buyer_id: reviewer.id,
          seller_id: product.seller_id,
          buyer_name: reviewer.name,
          buyer_email: buyers.find(b => b.full_name === reviewer.name)?.email || 'buyer@test.com',
          order_type: 'ONLINE',
          subtotal: product.price,
          discount_amount: 0,
          shipping_cost: 0,
          tax_amount: 0,
          total_amount: product.price,
          currency: 'PHP',
          status: 'delivered',
          payment_status: 'paid',
          shipping_address: {
            fullName: reviewer.name,
            street: '123 Sample Street',
            city: 'Manila',
            province: 'Metro Manila',
            postalCode: '1000',
            country: 'Philippines',
            phone: '09171234567',
          },
          payment_method: { type: 'gcash', details: {} },
          is_reviewed: true,
          rating: rating,
          review_comment: comment,
          review_date: new Date(deliveryDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days after delivery
          is_returnable: false,
          created_at: orderDate.toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: deliveryDate.toISOString(),
        })
        .select('id')
        .single();

      if (orderError) {
        console.log(`   ❌ Order error: ${orderError.message}`);
        continue;
      }

      // Now create the review linked to the order
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          product_id: product.id,
          buyer_id: reviewer.id,
          seller_id: product.seller_id,
          order_id: newOrder.id,
          rating,
          comment,
          images: null,
          helpful_count: Math.floor(Math.random() * 15),
          is_hidden: false,
          is_edited: false,
          created_at: new Date(deliveryDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (reviewError) {
        console.log(`   ❌ Review error: ${reviewError.message}`);
      } else {
        reviewsCreated++;
      }
    }
    console.log(`   ✅ Added reviews`);
  }

  // Step 3: Update product ratings based on reviews
  console.log('\n📊 Updating Product Ratings...\n');

  for (const product of products) {
    const { data: productReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', product.id);

    if (productReviews && productReviews.length > 0) {
      const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
      
      await supabase
        .from('products')
        .update({ 
          rating: Math.round(avgRating * 10) / 10,
          review_count: productReviews.length,
        })
        .eq('id', product.id);
    }
  }

  console.log('✅ Product ratings updated based on reviews');

  // Summary
  console.log('\n============================================================');
  console.log('SEEDING COMPLETE');
  console.log('============================================================');
  console.log(`\n✅ Buyers created/updated: ${buyersCreated}`);
  console.log(`✅ Addresses created: ${addressesCreated}`);
  console.log(`✅ Reviews created: ${reviewsCreated}`);

  // Print buyer credentials
  console.log('\n============================================================');
  console.log('BUYER LOGIN CREDENTIALS');
  console.log('============================================================\n');
  
  console.log('| Name                     | Email                          | Password    |');
  console.log('|--------------------------|--------------------------------|-------------|');
  
  for (const buyer of buyers) {
    const namePad = buyer.full_name.padEnd(24);
    const emailPad = buyer.email.padEnd(30);
    console.log(`| ${namePad} | ${emailPad} | ${buyer.password} |`);
  }

  // Stats
  const { count: totalReviews } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true });

  const { count: totalBuyers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_type', 'buyer');

  console.log('\n============================================================');
  console.log('DATABASE STATS');
  console.log('============================================================');
  console.log(`\n👤 Total buyer profiles: ${totalBuyers}`);
  console.log(`⭐ Total reviews: ${totalReviews}`);
}

seedBuyersAndReviews().catch(console.error);
