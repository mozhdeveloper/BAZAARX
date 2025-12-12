import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, ShoppingCart, Star, ChevronRight, MessageCircle, User } from 'lucide-react';
import { trendingProducts, bestSellerProducts, newArrivals } from '../data/products';
import { useCartStore } from '../stores/cartStore';
import { Button } from '../components/ui/button';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { cn } from '../lib/utils';

interface ProductDetailPageProps {}

// Enhanced product data with more details
const enhancedProductData: Record<string, any> = {
  '1': { // Premium Wireless Earbuds
    name: 'Premium Wireless Earbuds',
    description: 'Experience crystal-clear audio with these premium wireless earbuds. Featuring active noise cancellation, 24-hour battery life, and IPX7 water resistance. Perfect for music lovers, fitness enthusiasts, and professionals.',
    price: 2499,
    originalPrice: 3999,
    rating: 4.8,
    reviewCount: 456,
    colors: [
      { name: 'Black', value: '#000000', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop' },
      { name: 'White', value: '#FFFFFF', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop' },
      { name: 'Blue', value: '#3B82F6', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop' }
    ],
    types: ['Standard', 'Sport Fit', 'Foam Tips'],
    images: Array(4).fill('https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop'),
    features: ['Active Noise Cancellation', 'Free Shipping', '1-Year Warranty', 'Share']
  },
  '2': { // Sustainable Water Bottle
    name: 'Sustainable Water Bottle',
    description: 'Stay hydrated sustainably with our eco-friendly water bottle. Made from recycled materials, BPA-free, and keeps drinks cold for 24 hours or hot for 12 hours. Perfect for outdoor adventures and daily use.',
    price: 899,
    originalPrice: null,
    rating: 4.6,
    reviewCount: 234,
    colors: [
      { name: 'Green', value: '#10B981', image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop' },
      { name: 'Blue', value: '#3B82F6', image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop' },
      { name: 'Pink', value: '#EC4899', image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop' }
    ],
    types: ['500ml', '750ml', '1L'],
    images: Array(4).fill('https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop'),
    features: ['Eco-Friendly Materials', 'Free Shipping', 'Lifetime Warranty', 'Share']
  },
  '3': { // Vintage Leather Bag
    name: 'Vintage Leather Bag',
    description: 'Timeless elegance meets functionality with this handcrafted vintage leather bag. Made from premium leather, featuring multiple compartments and classic design. Perfect for business, travel, and everyday use.',
    price: 3299,
    originalPrice: 4999,
    rating: 4.9,
    reviewCount: 189,
    colors: [
      { name: 'Brown', value: '#8B4513', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop' },
      { name: 'Black', value: '#000000', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop' },
      { name: 'Tan', value: '#D2B48C', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop' }
    ],
    types: ['Small', 'Medium', 'Large'],
    images: Array(4).fill('https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop'),
    features: ['Handcrafted Leather', 'Multiple Compartments', '2-Year Warranty', 'Share']
  },
  '4': { // Organic Coffee Beans
    name: 'Organic Coffee Beans',
    description: 'Premium organic coffee beans sourced directly from Cordillera farmers. Single-origin, fair-trade certified, and roasted to perfection. Rich, full-bodied flavor with notes of chocolate and caramel.',
    price: 650,
    originalPrice: null,
    rating: 4.7,
    reviewCount: 567,
    colors: [
      { name: 'Dark Roast', value: '#3C2415', image: 'https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=400&h=400&fit=crop' },
      { name: 'Medium Roast', value: '#5D4037', image: 'https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=400&h=400&fit=crop' },
      { name: 'Light Roast', value: '#8D6E63', image: 'https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=400&h=400&fit=crop' }
    ],
    types: ['250g', '500g', '1kg'],
    images: Array(4).fill('https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=400&h=400&fit=crop'),
    features: ['Fair-Trade Certified', 'Free Shipping', 'Freshness Guarantee', 'Share']
  },
  '5': { // Handwoven Basket Set
    name: 'Handwoven Basket Set',
    description: 'Beautiful handwoven basket set crafted by skilled artisans from Ilocos Sur. Made from natural materials, perfect for storage, decoration, and gift-giving. Supports local communities and traditional craftsmanship.',
    price: 1899,
    originalPrice: null,
    rating: 4.5,
    reviewCount: 123,
    colors: [
      { name: 'Natural', value: '#DEB887', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop' },
      { name: 'Brown', value: '#8B4513', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop' },
      { name: 'Multi-color', value: '#CD853F', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop' }
    ],
    types: ['Small Set (3pc)', 'Medium Set (5pc)', 'Large Set (7pc)'],
    images: Array(4).fill('https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop'),
    features: ['Handcrafted by Artisans', 'Natural Materials', 'Supports Local Communities', 'Share']
  },
  '6': { // Smart Fitness Watch
    name: 'Smart Fitness Watch',
    description: 'Advanced smartwatch with comprehensive health tracking features. Monitor heart rate, sleep patterns, steps, and 50+ workout modes. Water-resistant design with 7-day battery life and smartphone integration.',
    price: 4999,
    originalPrice: 7999,
    rating: 4.4,
    reviewCount: 356,
    colors: [
      { name: 'Black', value: '#000000', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop' },
      { name: 'Silver', value: '#C0C0C0', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop' },
      { name: 'Rose Gold', value: '#E8B4A8', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop' }
    ],
    types: ['Sport Band', 'Leather Band', 'Metal Band'],
    images: Array(4).fill('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'),
    features: ['Health Tracking', 'Free Shipping', '2-Year Warranty', 'Share']
  },
  '7': { // Filipino Cookbook Collection
    name: 'Filipino Cookbook Collection',
    description: 'Comprehensive collection of authentic Filipino recipes from different regions. Features traditional dishes, modern interpretations, and cooking techniques. Perfect for food lovers and those wanting to explore Filipino cuisine.',
    price: 1299,
    originalPrice: null,
    rating: 4.8,
    reviewCount: 234,
    colors: [
      { name: 'Hardcover', value: '#8B4513', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop' },
      { name: 'Paperback', value: '#F5F5DC', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop' }
    ],
    types: ['Single Book', '3-Book Set', '5-Book Collection'],
    images: Array(4).fill('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop'),
    features: ['Authentic Recipes', 'Free Shipping', 'Recipe Support', 'Share']
  },
  '8': { // Bamboo Phone Stand
    name: 'Bamboo Phone Stand',
    description: 'Eco-friendly bamboo phone stand with adjustable angles. Perfect for video calls, watching videos, and charging. Sustainable design that complements any workspace or home environment.',
    price: 299,
    originalPrice: null,
    rating: 4.6,
    reviewCount: 789,
    colors: [
      { name: 'Natural Bamboo', value: '#DEB887', image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop' },
      { name: 'Dark Bamboo', value: '#8B7355', image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop' }
    ],
    types: ['Basic Stand', 'Adjustable Stand', 'Multi-device Stand'],
    images: Array(4).fill('https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop'),
    features: ['Eco-Friendly Bamboo', 'Free Shipping', 'Adjustable Angles', 'Share']
  },
  '9': { // Local Honey Set
    name: 'Local Honey Set',
    description: 'Pure, raw honey harvested from local apiaries in Bohol. Rich in natural enzymes and antioxidants. Available in different floral varieties, each with unique taste profiles and health benefits.',
    price: 850,
    originalPrice: null,
    rating: 4.9,
    reviewCount: 445,
    colors: [
      { name: 'Wildflower', value: '#DAA520', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop' },
      { name: 'Acacia', value: '#F0E68C', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop' },
      { name: 'Manuka', value: '#CD853F', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop' }
    ],
    types: ['250ml Jar', '500ml Jar', '3-Jar Set'],
    images: Array(4).fill('https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop'),
    features: ['Raw & Natural', 'Local Sourced', 'Health Benefits', 'Share']
  },
  '10': { // Handmade Soap Collection
    name: 'Handmade Soap Collection',
    description: 'Natural handmade soaps crafted with organic ingredients. Free from harsh chemicals, perfect for sensitive skin. Each soap features unique scents and beneficial properties for different skin types.',
    price: 599,
    originalPrice: null,
    rating: 4.7,
    reviewCount: 321,
    colors: [
      { name: 'Lavender', value: '#E6E6FA', image: 'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=400&h=400&fit=crop' },
      { name: 'Rose', value: '#FFB6C1', image: 'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=400&h=400&fit=crop' },
      { name: 'Mint', value: '#98FB98', image: 'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=400&h=400&fit=crop' }
    ],
    types: ['3-Bar Set', '5-Bar Set', '10-Bar Collection'],
    images: Array(4).fill('https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=400&h=400&fit=crop'),
    features: ['Natural Ingredients', 'Free Shipping', 'Sensitive Skin Safe', 'Share']
  },
  '11': { // Artisan Coffee Mug
    name: 'Artisan Coffee Mug',
    description: 'Handcrafted ceramic coffee mug made by local artisans in Davao. Each piece is unique with beautiful glazing and ergonomic design. Perfect for coffee lovers who appreciate artisanal craftsmanship.',
    price: 450,
    originalPrice: null,
    rating: 4.3,
    reviewCount: 87,
    colors: [
      { name: 'Terracotta', value: '#E2725B', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=400&fit=crop' },
      { name: 'Blue Glaze', value: '#4682B4', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=400&fit=crop' },
      { name: 'Natural Clay', value: '#CD853F', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=400&fit=crop' }
    ],
    types: ['Small (8oz)', 'Medium (12oz)', 'Large (16oz)'],
    images: Array(4).fill('https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=400&fit=crop'),
    features: ['Handcrafted by Artisans', 'Unique Design', 'Dishwasher Safe', 'Share']
  },
  '12': { // Ukulele Beginner Set
    name: 'Ukulele Beginner Set',
    description: 'Complete ukulele starter set perfect for beginners. Includes quality soprano ukulele, carrying case, tuner, picks, and instruction booklet. Great for learning music and developing musical skills.',
    price: 2899,
    originalPrice: null,
    rating: 4.5,
    reviewCount: 156,
    colors: [
      { name: 'Natural Wood', value: '#DEB887', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop' },
      { name: 'Mahogany', value: '#8B4513', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop' },
      { name: 'Sunburst', value: '#FF8C00', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop' }
    ],
    types: ['Soprano', 'Concert', 'Tenor'],
    images: Array(4).fill('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop'),
    features: ['Complete Beginner Set', 'Free Shipping', 'Instruction Included', 'Share']
  }
};

// Reviews data for all products
const reviewsData: Record<string, any[]> = {
  '1': [
    {
      id: 1,
      user: 'Maria Santos',
      rating: 5,
      date: '2 weeks ago',
      comment: 'Amazing sound quality! The noise cancellation is perfect for my daily commute. Battery life is exactly as advertised.',
      helpful: 89
    },
    {
      id: 2,
      user: 'Juan Cruz',
      rating: 5,
      date: '1 month ago',
      comment: 'Best earbuds I\'ve ever owned. Great value for money and the fit is so comfortable.',
      helpful: 76
    },
    {
      id: 3,
      user: 'Ana Rodriguez',
      rating: 4,
      date: '3 weeks ago',
      comment: 'Good quality earbuds but could use better bass response. Overall satisfied with the purchase.',
      helpful: 45
    }
  ],
  '2': [
    {
      id: 1,
      user: 'Carlos Mendoza',
      rating: 5,
      date: '1 week ago',
      comment: 'Love that it\'s eco-friendly! Keeps my water cold all day even in Manila heat. Highly recommend!',
      helpful: 134
    },
    {
      id: 2,
      user: 'Rosa Garcia',
      rating: 5,
      date: '2 weeks ago',
      comment: 'Perfect size for my gym bag. The quality is excellent and I feel good about supporting sustainability.',
      helpful: 98
    }
  ],
  '3': [
    {
      id: 1,
      user: 'Miguel Torres',
      rating: 5,
      date: '5 days ago',
      comment: 'Beautiful craftsmanship! This bag gets compliments everywhere I go. The leather quality is outstanding.',
      helpful: 167
    },
    {
      id: 2,
      user: 'Sofia Reyes',
      rating: 5,
      date: '2 weeks ago',
      comment: 'Worth every peso! The bag is spacious and the vintage design is exactly what I was looking for.',
      helpful: 143
    },
    {
      id: 3,
      user: 'Pedro Gonzales',
      rating: 4,
      date: '3 weeks ago',
      comment: 'Great quality bag but slightly heavier than expected. Still very satisfied with the purchase.',
      helpful: 87
    }
  ],
  '4': [
    {
      id: 1,
      user: 'Carmen Dela Cruz',
      rating: 5,
      date: '3 days ago',
      comment: 'Amazing coffee! You can really taste the difference. Supporting local farmers feels great too.',
      helpful: 234
    },
    {
      id: 2,
      user: 'Jose Villanueva',
      rating: 5,
      date: '1 week ago',
      comment: 'Best coffee beans I\'ve tried in the Philippines. Rich flavor and perfect roasting.',
      helpful: 189
    },
    {
      id: 3,
      user: 'Linda Ramos',
      rating: 4,
      date: '2 weeks ago',
      comment: 'Good coffee but could be ground finer. Overall happy with the quality and ethical sourcing.',
      helpful: 112
    }
  ],
  '5': [
    {
      id: 1,
      user: 'Teresa Castro',
      rating: 5,
      date: '1 week ago',
      comment: 'Beautiful baskets! The craftsmanship is incredible. Perfect for organizing and decoration.',
      helpful: 78
    },
    {
      id: 2,
      user: 'Roberto Silva',
      rating: 4,
      date: '2 weeks ago',
      comment: 'Well-made baskets. Good quality materials and I love supporting local artisans.',
      helpful: 65
    }
  ],
  '6': [
    {
      id: 1,
      user: 'Elena Morales',
      rating: 5,
      date: '4 days ago',
      comment: 'Excellent smartwatch! All the fitness tracking features work perfectly. Great value for money.',
      helpful: 278
    },
    {
      id: 2,
      user: 'Antonio Luna',
      rating: 4,
      date: '1 week ago',
      comment: 'Good watch with accurate tracking. Battery life could be better but overall satisfied.',
      helpful: 156
    },
    {
      id: 3,
      user: 'Isabella Cruz',
      rating: 5,
      date: '2 weeks ago',
      comment: 'Love all the health monitoring features! Helps me stay on track with my fitness goals.',
      helpful: 203
    }
  ],
  '7': [
    {
      id: 1,
      user: 'Chef Marco Santos',
      rating: 5,
      date: '2 days ago',
      comment: 'Authentic recipes that bring back childhood memories! Clear instructions and beautiful photos.',
      helpful: 145
    },
    {
      id: 2,
      user: 'Lola Esperanza',
      rating: 5,
      date: '1 week ago',
      comment: 'Finally found recipes like my grandmother used to make! Traditional and delicious.',
      helpful: 187
    }
  ],
  '8': [
    {
      id: 1,
      user: 'Tech Reviewer PH',
      rating: 5,
      date: '1 day ago',
      comment: 'Sturdy and eco-friendly! Perfect angle for video calls. Great addition to any workspace.',
      helpful: 567
    },
    {
      id: 2,
      user: 'Office Worker',
      rating: 4,
      date: '5 days ago',
      comment: 'Good quality stand but could use more adjustment options. Still happy with the purchase.',
      helpful: 234
    },
    {
      id: 3,
      user: 'Student User',
      rating: 5,
      date: '1 week ago',
      comment: 'Perfect for online classes! Bamboo material looks great and feels sustainable.',
      helpful: 345
    }
  ],
  '9': [
    {
      id: 1,
      user: 'Health Enthusiast',
      rating: 5,
      date: '6 hours ago',
      comment: 'Pure and delicious honey! You can taste the difference from commercial brands. Love the local sourcing.',
      helpful: 298
    },
    {
      id: 2,
      user: 'Wellness Mom',
      rating: 5,
      date: '4 days ago',
      comment: 'Great for the whole family! Natural sweetness and health benefits. Will definitely reorder.',
      helpful: 267
    }
  ],
  '10': [
    {
      id: 1,
      user: 'Sensitive Skin User',
      rating: 5,
      date: '12 hours ago',
      comment: 'Finally found soaps that don\'t irritate my skin! Gentle and natural. Love the different scents.',
      helpful: 189
    },
    {
      id: 2,
      user: 'Natural Beauty Fan',
      rating: 4,
      date: '3 days ago',
      comment: 'Good quality handmade soaps. Could last a bit longer but the ingredients are excellent.',
      helpful: 134
    }
  ],
  '11': [
    {
      id: 1,
      user: 'Coffee Lover',
      rating: 5,
      date: '18 hours ago',
      comment: 'Beautiful mug with perfect size for my morning coffee. Each piece is truly unique!',
      helpful: 67
    },
    {
      id: 2,
      user: 'Art Collector',
      rating: 4,
      date: '4 days ago',
      comment: 'Nice craftsmanship and good quality ceramic. Great addition to my collection.',
      helpful: 45
    }
  ],
  '12': [
    {
      id: 1,
      user: 'Music Teacher',
      rating: 5,
      date: '2 hours ago',
      comment: 'Perfect starter set for beginners! Good quality ukulele and helpful instruction booklet.',
      helpful: 123
    },
    {
      id: 2,
      user: 'Parent Review',
      rating: 5,
      date: '3 days ago',
      comment: 'My daughter loves learning with this ukulele! Great quality for the price and came with everything needed.',
      helpful: 178
    },
    {
      id: 3,
      user: 'Beginner Player',
      rating: 4,
      date: '1 week ago',
      comment: 'Good ukulele for starting out. Sound quality is decent and the accessories are helpful.',
      helpful: 89
    }
  ]
};

// Reviews data is now included in reviewsData object

export default function ProductDetailPage({}: ProductDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedType, setSelectedType] = useState('Sport Band');
  const [activeTab, setActiveTab] = useState('description');
  
  const baseProduct = trendingProducts.find(p => p.id === id) || 
                   trendingProducts.find(p => p.id === id?.split('-')[0]) ||
                   bestSellerProducts.find(p => p.id === id) || 
                   bestSellerProducts.find(p => p.id === id?.split('-')[0]) ||
                   newArrivals.find(p => p.id === id) ||
                   newArrivals.find(p => p.id === id?.split('-')[0]);
  const productId = baseProduct?.id || id?.split('-')[0] || '1';
  const productData = enhancedProductData[productId] || enhancedProductData['1'];
  const productReviews = reviewsData[productId] || reviewsData['1'];
  
  if (!baseProduct) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Product not found</h2>
          <p className="text-gray-600 mb-4">The product you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/shop')} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)]">
            Back to Shop
          </Button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        ...baseProduct,
        name: productData.name,
        price: productData.price / 100
      });
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-gray-600 mb-6"
        >
          <button onClick={() => navigate('/')} className="hover:text-[var(--brand-primary)]">
            Home
          </button>
          <ChevronRight className="w-4 h-4" />
          <button onClick={() => navigate('/shop')} className="hover:text-[var(--brand-primary)]">
            Shop
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">{productData.name}</span>
        </motion.nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Main Image */}
            <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden border">
              <img
                src={productData.colors[selectedColor]?.image || baseProduct.image}
                alt={productData.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Thumbnail Images */}
            <div className="grid grid-cols-4 gap-3">
              {productData.images.map((_image: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 transition-all",
                    selectedImage === index
                      ? "border-[var(--brand-primary)] shadow-md"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <img
                    src={baseProduct.image}
                    alt={`${productData.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Title and Rating */}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">{productData.name}</h1>
              
              <p className="text-gray-600 leading-relaxed">{productData.description}</p>

              {/* Rating */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-semibold">₱{productData.rating}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4 fill-current",
                          i < Math.floor(productData.rating) ? "text-yellow-400" : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">({productData.reviewCount} reviews)</span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gray-900">
                  ₱{(productData.price / 100).toFixed(2)}
                </span>
                {productData.originalPrice && (
                  <span className="text-xl text-gray-500 line-through">
                    ₱{(productData.originalPrice / 100).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Color:</label>
              </div>
              <div className="flex gap-2">
                {productData.colors.map((color: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(index)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      selectedColor === index
                        ? "border-gray-900 scale-110"
                        : "border-gray-300 hover:border-gray-400"
                    )}
                    style={{ backgroundColor: typeof color === 'string' ? color : color.value }}
                    title={typeof color === 'string' ? color : color.name}
                  />
                ))}
              </div>
            </div>

            {/* Type Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">Type:</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
              >
                {productData.types.map((type: string) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity and Size */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Quantity:</label>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center py-2">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <button className="text-sm text-[var(--brand-primary)] hover:underline">
                  Size Guide
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                variant="outline"
                className="w-full border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to cart
              </Button>
              
              <Button
                onClick={handleBuyNow}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                Buy Now
              </Button>
            </div>

            {/* Payment Security */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-gray-900">Secure your payment guarantee.</h3>
              <div className="flex gap-2">
                <div className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded">VISA</div>
                <div className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded">PayPal</div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                {productData.features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[var(--brand-primary)] rounded-full" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Product Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-8">
              {['description', 'reviews', 'discussion'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "py-4 px-2 border-b-2 font-medium text-sm capitalize transition-colors",
                    activeTab === tab
                      ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="py-8">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <p className="text-gray-600 leading-relaxed">
                  {productData.description}
                </p>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Rating & Reviews ({productData.reviewCount})</h3>
                  <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option>All</option>
                    <option>5 Stars</option>
                    <option>4 Stars</option>
                  </select>
                </div>

                <div className="space-y-6">
                  {productReviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{review.user}</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "w-4 h-4 fill-current",
                                      i < review.rating ? "text-yellow-400" : "text-gray-300"
                                    )}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-500">{review.date}</span>
                            </div>
                            <span className="text-sm text-gray-500">Events</span>
                          </div>
                          <p className="text-gray-600">{review.comment}</p>
                          <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                            Reply <span className="ml-2">👍 {review.helpful}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'discussion' && (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No discussions yet. Be the first to start a conversation!</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      
      <BazaarFooter />
    </div>
  );
}