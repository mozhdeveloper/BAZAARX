import { Product } from '../types';

/**
 * BUYER-VISIBLE PRODUCTS - QA APPROVED ONLY
 * 
 * These products are visible to buyers because they have been approved
 * through the admin QA process. All products shown here have:
 * - isVerified: true (passed QA inspection)
 * - Completed verification method (drop-off, courier, or onsite)
 * - Been approved by admin and published to marketplace
 * 
 * QA Flow (matching web):
 * 1. Seller submits product with verification method selection:
 *    - Drop-off: Seller brings product to BazaarPH QA Center
 *    - Courier: BazaarPH arranges pickup for inspection
 *    - Onsite: Admin inspects product at seller's location
 * 2. Admin reviews product details and conducts physical inspection
 * 3. Admin approves/rejects based on quality, accuracy, and compliance
 * 4. Only approved products (isVerified: true) appear in buyer listings
 * 5. Rejected products remain hidden until resubmitted and approved
 */

export const trendingProducts: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Earbuds - Noise Cancelling, 24H Battery Life',
    description: 'Experience superior audio quality with our Premium Wireless Earbuds. Features Active Noise Cancellation (ANC) for immersive sound, 24-hour battery life for all-day use, and ergonomic design for maximum comfort during extended listening sessions. IPX4 water resistance makes them perfect for workouts and daily commutes.',
    price: 2499,
    originalPrice: 3999,
    stock: 156,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&h=300&fit=crop',
    rating: 4.8,
    sold: 15234,
    review_count: 2847,
    sales_count: 15234,
    seller: 'TechHub Manila',
    sellerRating: 4.9,
    sellerVerified: true,
    isFreeShipping: true,
    isVerified: true,
    location: 'Makati, Metro Manila',
    category: 'Electronics',
    specifications: {
      'Battery Life': '24 hours',
      'Noise Cancellation': 'Active (ANC)',
      'Water Resistance': 'IPX4',
      'Bluetooth Version': '5.3',
      'Driver Size': '10mm',
      'Warranty': '1 Year'
    }
  },
  {
    id: '2',
    name: 'Sustainable Water Bottle - BPA Free, Insulated 24hrs',
    description: 'Stay hydrated with our eco-friendly stainless steel water bottle. Double-wall vacuum insulation keeps drinks cold for 24 hours or hot for 12 hours. Made from food-grade 18/8 stainless steel, 100% BPA-free and leak-proof. Perfect for gym, office, or outdoor adventures. Available in multiple colors.',
    price: 899,
    stock: 284,
    image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300&h=300&fit=crop',
    rating: 4.6,
    sold: 8921,
    review_count: 1563,
    sales_count: 8921,
    seller: 'EcoLife PH',
    sellerRating: 4.7,
    sellerVerified: true,
    isFreeShipping: true,
    isVerified: true,
    location: 'Quezon City, Metro Manila',
    category: 'Home & Garden',
    specifications: {
      'Capacity': '750ml',
      'Material': 'Stainless Steel 18/8',
      'Insulation': 'Double-wall vacuum',
      'Cold Retention': '24 hours',
      'Hot Retention': '12 hours',
      'BPA Free': 'Yes'
    }
  },
  {
    id: '3',
    name: 'Vintage Leather Bag - Genuine Leather, Handcrafted',
    description: 'Handcrafted from 100% genuine full-grain leather, this vintage messenger bag combines classic style with modern functionality. Each bag is carefully crafted by skilled artisans, featuring durable brass hardware, multiple compartments for organization, and an adjustable shoulder strap. Develops a beautiful patina over time.',
    price: 3299,
    originalPrice: 4999,
    stock: 42,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop',
    rating: 4.9,
    sold: 4892,
    review_count: 987,
    sales_count: 4892,
    seller: 'Artisan Leather Co.',
    sellerRating: 4.9,
    sellerVerified: true,
    isFreeShipping: false,
    isVerified: true,
    location: 'Marikina City, Metro Manila',
    category: 'Fashion',
    specifications: {
      'Material': '100% Full-Grain Leather',
      'Dimensions': '35cm x 28cm x 10cm',
      'Weight': '950g',
      'Compartments': '3 main + 2 inner pockets',
      'Hardware': 'Brass',
      'Handmade': 'Yes'
    }
  },
  {
    id: '4',
    name: 'Organic Coffee Beans - 100% Arabica, Medium Roast 500g',
    price: 650,
    image: 'https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=300&h=300&fit=crop',
    rating: 4.7,
    sold: 12345,
    seller: 'Seller123 Store',
    sellerRating: 4.9,
    sellerVerified: true,
    isFreeShipping: true,
    isVerified: true,
    location: 'Makati, Metro Manila',
    category: 'Food & Beverages'
  },
  {
    id: '5',
    name: 'Handwoven Basket Set - Traditional Filipino Craft, Set of 3',
    price: 1899,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop',
    rating: 4.5,
    sold: 3567,
    seller: 'Seller123 Store',
    sellerRating: 4.9,
    sellerVerified: true,
    isFreeShipping: false,
    isVerified: true,
    location: 'Makati, Metro Manila',
    category: 'Home & Garden'
  },
  {
    id: '6',
    name: 'Smart Fitness Watch - Heart Rate, Sleep Tracker, Waterproof',
    price: 4999,
    originalPrice: 7999,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
    rating: 4.4,
    sold: 9876,
    seller: 'Seller123 Store',
    sellerRating: 4.9,
    sellerVerified: true,
    isFreeShipping: true,
    isVerified: true,
    location: 'Makati, Metro Manila',
    category: 'Electronics'
  },
];

export const bestSellerProducts: Product[] = [
  {
    id: '7',
    name: 'Filipino Cookbook Collection - Traditional Recipes & Modern Twist',
    price: 1299,
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=300&fit=crop',
    rating: 4.8,
    sold: 18632,
    seller: 'Seller123 Store',
    sellerRating: 4.9,
    sellerVerified: true,
    isFreeShipping: true,
    isVerified: true,
    location: 'Makati, Metro Manila',
    category: 'Books'
  },
  {
    id: '8',
    name: 'Bamboo Phone Stand - Eco-Friendly, Adjustable Angle',
    price: 299,
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=300&fit=crop',
    rating: 4.6,
    sold: 24965,
    seller: 'Seller123 Store',
    sellerRating: 4.9,
    sellerVerified: true,
    isFreeShipping: true,
    isVerified: true,
    location: 'Makati, Metro Manila',
    category: 'Electronics'
  },
  {
    id: '9',
    name: 'Local Pure Honey Set - Raw & Unfiltered, 3x 250ml Bottles',
    price: 850,
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&h=300&fit=crop',
    rating: 4.9,
    sold: 11421,
    seller: 'Seller123 Store',
    sellerRating: 4.9,
    sellerVerified: true,
    isFreeShipping: false,
    isVerified: true,
    location: 'Makati, Metro Manila',
    category: 'Food & Beverages'
  },
  {
    id: '10',
    name: 'Handmade Soap Collection - Natural Ingredients, Set of 5',
    price: 599,
    image: 'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=300&h=300&fit=crop',
    rating: 4.7,
    sold: 16876,
    seller: 'Seller123 Store',
    sellerRating: 4.9,
    sellerVerified: true,
    isFreeShipping: true,
    isVerified: true,
    location: 'Makati, Metro Manila',
    category: 'Beauty & Personal Care'
  },
];

export const newArrivals: Product[] = [
  {
    id: '11',
    name: 'Artisan Coffee Mug - Handcrafted Ceramic, 350ml',
    price: 450,
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=300&h=300&fit=crop',
    rating: 4.3,
    sold: 1234,
    seller: 'Seller123 Store',
    sellerRating: 4.9,
    sellerVerified: true,
    isFreeShipping: false,
    isVerified: true,
    location: 'Makati, Metro Manila',
    category: 'Home & Garden'
  },
  {
    id: '12',
    name: 'Ukulele Beginner Set - Complete with Bag, Tuner & Pick',
    price: 2899,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    rating: 4.5,
    sold: 2123,
    seller: 'Seller123 Store',
    sellerRating: 4.9,
    sellerVerified: true,
    isFreeShipping: true,
    isVerified: true,
    location: 'Makati, Metro Manila',
    category: 'Music & Instruments'
  },
];

// Mouse Products for Camera Search
export const mouseProducts: Product[] = [
  {
    id: 'mouse-1',
    name: 'Logitech MX Master 3S - Wireless Performance Mouse',
    price: 5499,
    originalPrice: 6499,
    rating: 4.9,
    sold: 1250,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
    category: 'Electronics',
    seller: 'Logitech Official Store',
    description: 'The best mouse for productivity with ultra-fast scrolling, MagSpeed electromagnetic wheel, and 8K DPI sensor. Perfect for creative professionals and power users.',
    stock: 50,
    sellerRating: 4.9,
    sellerVerified: true,
    isFreeShipping: true,
    isVerified: true,
    location: 'Metro Manila',
  },
  {
    id: 'mouse-2',
    name: 'Razer Basilisk V3 - Customizable Gaming Mouse',
    price: 3299,
    originalPrice: 3999,
    rating: 4.8,
    sold: 850,
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400',
    category: 'Electronics',
    seller: 'Razer Official Store',
    description: 'Advanced gaming mouse with 10 programmable buttons, Razer Chroma RGB lighting, and Focus+ 26K DPI optical sensor. Dominate every game.',
    stock: 30,
    sellerRating: 4.8,
    sellerVerified: true,
    isFreeShipping: false,
    isVerified: true,
    location: 'Cebu City',
  },
  {
    id: 'mouse-3',
    name: 'Wireless Ergonomic Mouse - Vertical Design',
    price: 899,
    originalPrice: 1299,
    rating: 4.5,
    sold: 3000,
    image: 'https://images.unsplash.com/photo-1605773527852-c546a8584ea3?w=400',
    category: 'Electronics',
    seller: 'Tech Gadgets PH',
    description: 'Affordable ergonomic mouse with vertical design to reduce wrist strain. Perfect for office work and daily computing needs.',
    stock: 100,
    sellerRating: 4.5,
    sellerVerified: true,
    isFreeShipping: true,
    isVerified: true,
    location: 'Metro Manila',
  },
  {
    id: 'mouse-4',
    name: 'RGB Gaming Mouse - 7 Button Programmable',
    price: 1200,
    originalPrice: 1500,
    rating: 4.6,
    sold: 1500,
    image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400',
    category: 'Electronics',
    seller: 'Gamer Zone Philippines',
    description: 'RGB lighting gaming mouse with 7 programmable buttons and adjustable DPI up to 6400. Great value for casual and competitive gamers.',
    stock: 45,
    sellerRating: 4.6,
    sellerVerified: true,
    isFreeShipping: true,
    isVerified: true,
    location: 'Davao City',
  },
];