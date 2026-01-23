<<<<<<< HEAD
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
=======
import { useState, useEffect } from "react";
>>>>>>> af09b04c772666531d5163d91e88466ef7658b20
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Minus,
  Plus,
  ShoppingCart,
  Star,
  ChevronRight,
  ChevronLeft,
  MessageCircle,
  User,
  ArrowLeft,
  Store,
  MapPin,
  ShieldCheck,
  ThumbsUp,
} from "lucide-react";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import {
  trendingProducts,
  bestSellerProducts,
  newArrivals,
} from "../data/products";
import { useBuyerStore, demoSellers } from "../stores/buyerStore";
import { useProductStore, useAuthStore } from "../stores/sellerStore";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { cn } from "../lib/utils";
import { getProductById } from "../services/productService";
import { ProductWithSeller } from "../types/database.types";

interface ProductDetailPageProps { }

interface Reply {
  id: number;
  text: string;
  author: string;
  date: string;
  avatar: string;
  isSeller?: boolean;
}

interface EnhancedReview {
  id: number;
  user: string;
  rating: number;
  date: string;
  comment: string;
  helpful: number;
  isLiked?: boolean;
  replies: Reply[];
}

// Enhanced product data with more details
const enhancedProductData: Record<string, any> = {
  "1": {
    // Premium Wireless Earbuds
    name: "Premium Wireless Earbuds",
    description:
      "Experience crystal-clear audio with these premium wireless earbuds. Featuring active noise cancellation, 24-hour battery life, and IPX7 water resistance. Perfect for music lovers, fitness enthusiasts, and professionals.",
    price: 2499,
    originalPrice: 3999,
    rating: 4.8,
    reviewCount: 456,
    colors: [
      {
        name: "Black",
        value: "#000000",
        image:
          "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
      },
      {
        name: "White",
        value: "#FFFFFF",
        image:
          "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
      },
      {
        name: "Blue",
        value: "#3B82F6",
        image:
          "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
      },
    ],
    types: ["Standard", "Sport Fit", "Foam Tips"],
    images: Array(4).fill(
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop"
    ),
    features: [
      "Active Noise Cancellation",
      "Free Shipping",
      "1-Year Warranty",
      "Share",
    ],
  },
  "2": {
    // Sustainable Water Bottle
    name: "Sustainable Water Bottle",
    description:
      "Stay hydrated sustainably with our eco-friendly water bottle. Made from recycled materials, BPA-free, and keeps drinks cold for 24 hours or hot for 12 hours. Perfect for outdoor adventures and daily use.",
    price: 899,
    originalPrice: null,
    rating: 4.6,
    reviewCount: 234,
    colors: [
      {
        name: "Green",
        value: "#10B981",
        image:
          "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop",
      },
      {
        name: "Blue",
        value: "#3B82F6",
        image:
          "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop",
      },
      {
        name: "Pink",
        value: "#EC4899",
        image:
          "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop",
      },
    ],
    types: ["500ml", "750ml", "1L"],
    images: Array(4).fill(
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop"
    ),
    features: [
      "Eco-Friendly Materials",
      "Free Shipping",
      "Lifetime Warranty",
      "Share",
    ],
  },
  "3": {
    // Vintage Leather Bag
    name: "Vintage Leather Bag",
    description:
      "Timeless elegance meets functionality with this handcrafted vintage leather bag. Made from premium leather, featuring multiple compartments and classic design. Perfect for business, travel, and everyday use.",
    price: 3299,
    originalPrice: 4999,
    rating: 4.9,
    reviewCount: 189,
    colors: [
      {
        name: "Brown",
        value: "#8B4513",
        image:
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop",
      },
      {
        name: "Black",
        value: "#000000",
        image:
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop",
      },
      {
        name: "Tan",
        value: "#D2B48C",
        image:
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop",
      },
    ],
    types: ["Small", "Medium", "Large"],
    images: Array(4).fill(
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop"
    ),
    features: [
      "Handcrafted Leather",
      "Multiple Compartments",
      "2-Year Warranty",
      "Share",
    ],
  },
  "4": {
    // Organic Coffee Beans
    name: "Organic Coffee Beans",
    description:
      "Premium organic coffee beans sourced directly from Cordillera farmers. Single-origin, fair-trade certified, and roasted to perfection. Rich, full-bodied flavor with notes of chocolate and caramel.",
    price: 650,
    originalPrice: null,
    rating: 4.7,
    reviewCount: 567,
    colors: [
      {
        name: "Dark Roast",
        value: "#3C2415",
        image:
          "https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=400&h=400&fit=crop",
      },
      {
        name: "Medium Roast",
        value: "#5D4037",
        image:
          "https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=400&h=400&fit=crop",
      },
      {
        name: "Light Roast",
        value: "#8D6E63",
        image:
          "https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=400&h=400&fit=crop",
      },
    ],
    types: ["250g", "500g", "1kg"],
    images: Array(4).fill(
      "https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=400&h=400&fit=crop"
    ),
    features: [
      "Fair-Trade Certified",
      "Free Shipping",
      "Freshness Guarantee",
      "Share",
    ],
  },
  "5": {
    // Handwoven Basket Set
    name: "Handwoven Basket Set",
    description:
      "Beautiful handwoven basket set crafted by skilled artisans from Ilocos Sur. Made from natural materials, perfect for storage, decoration, and gift-giving. Supports local communities and traditional craftsmanship.",
    price: 1899,
    originalPrice: null,
    rating: 4.5,
    reviewCount: 123,
    colors: [
      {
        name: "Natural",
        value: "#DEB887",
        image:
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
      },
      {
        name: "Brown",
        value: "#8B4513",
        image:
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
      },
      {
        name: "Multi-color",
        value: "#CD853F",
        image:
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
      },
    ],
    types: ["Small Set (3pc)", "Medium Set (5pc)", "Large Set (7pc)"],
    images: Array(4).fill(
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop"
    ),
    features: [
      "Handcrafted by Artisans",
      "Natural Materials",
      "Supports Local Communities",
      "Share",
    ],
  },
  "6": {
    // Smart Fitness Watch
    name: "Smart Fitness Watch",
    description:
      "Advanced smartwatch with comprehensive health tracking features. Monitor heart rate, sleep patterns, steps, and 50+ workout modes. Water-resistant design with 7-day battery life and smartphone integration.",
    price: 4999,
    originalPrice: 7999,
    rating: 4.4,
    reviewCount: 356,
    colors: [
      {
        name: "Black",
        value: "#000000",
        image:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
      },
      {
        name: "Silver",
        value: "#C0C0C0",
        image:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
      },
      {
        name: "Rose Gold",
        value: "#E8B4A8",
        image:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
      },
    ],
    types: ["Sport Band", "Leather Band", "Metal Band"],
    images: Array(4).fill(
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"
    ),
    features: ["Health Tracking", "Free Shipping", "2-Year Warranty", "Share"],
  },
  "7": {
    // Filipino Cookbook Collection
    name: "Filipino Cookbook Collection",
    description:
      "Comprehensive collection of authentic Filipino recipes from different regions. Features traditional dishes, modern interpretations, and cooking techniques. Perfect for food lovers and those wanting to explore Filipino cuisine.",
    price: 1299,
    originalPrice: null,
    rating: 4.8,
    reviewCount: 234,
    colors: [
      {
        name: "Hardcover",
        value: "#8B4513",
        image:
          "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop",
      },
      {
        name: "Paperback",
        value: "#F5F5DC",
        image:
          "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop",
      },
    ],
    types: ["Single Book", "3-Book Set", "5-Book Collection"],
    images: Array(4).fill(
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop"
    ),
    features: ["Authentic Recipes", "Free Shipping", "Recipe Support", "Share"],
  },
  "8": {
    // Bamboo Phone Stand
    name: "Bamboo Phone Stand",
    description:
      "Eco-friendly bamboo phone stand with adjustable angles. Perfect for video calls, watching videos, and charging. Sustainable design that complements any workspace or home environment.",
    price: 299,
    originalPrice: null,
    rating: 4.6,
    reviewCount: 789,
    colors: [
      {
        name: "Natural Bamboo",
        value: "#DEB887",
        image:
          "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
      },
      {
        name: "Dark Bamboo",
        value: "#8B7355",
        image:
          "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
      },
    ],
    types: ["Basic Stand", "Adjustable Stand", "Multi-device Stand"],
    images: Array(4).fill(
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop"
    ),
    features: [
      "Eco-Friendly Bamboo",
      "Free Shipping",
      "Adjustable Angles",
      "Share",
    ],
  },
  "9": {
    // Local Honey Set
    name: "Local Honey Set",
    description:
      "Pure, raw honey harvested from local apiaries in Bohol. Rich in natural enzymes and antioxidants. Available in different floral varieties, each with unique taste profiles and health benefits.",
    price: 850,
    originalPrice: null,
    rating: 4.9,
    reviewCount: 445,
    colors: [
      {
        name: "Wildflower",
        value: "#DAA520",
        image:
          "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop",
      },
      {
        name: "Acacia",
        value: "#F0E68C",
        image:
          "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop",
      },
      {
        name: "Manuka",
        value: "#CD853F",
        image:
          "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop",
      },
    ],
    types: ["250ml Jar", "500ml Jar", "3-Jar Set"],
    images: Array(4).fill(
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop"
    ),
    features: ["Raw & Natural", "Local Sourced", "Health Benefits", "Share"],
  },
  "10": {
    // Handmade Soap Collection
    name: "Handmade Soap Collection",
    description:
      "Natural handmade soaps crafted with organic ingredients. Free from harsh chemicals, perfect for sensitive skin. Each soap features unique scents and beneficial properties for different skin types.",
    price: 599,
    originalPrice: null,
    rating: 4.7,
    reviewCount: 321,
    colors: [
      {
        name: "Lavender",
        value: "#E6E6FA",
        image:
          "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=400&h=400&fit=crop",
      },
      {
        name: "Rose",
        value: "#FFB6C1",
        image:
          "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=400&h=400&fit=crop",
      },
      {
        name: "Mint",
        value: "#98FB98",
        image:
          "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=400&h=400&fit=crop",
      },
    ],
    types: ["3-Bar Set", "5-Bar Set", "10-Bar Collection"],
    images: Array(4).fill(
      "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=400&h=400&fit=crop"
    ),
    features: [
      "Natural Ingredients",
      "Free Shipping",
      "Sensitive Skin Safe",
      "Share",
    ],
  },
  "11": {
    // Artisan Coffee Mug
    name: "Artisan Coffee Mug",
    description:
      "Handcrafted ceramic coffee mug made by local artisans in Davao. Each piece is unique with beautiful glazing and ergonomic design. Perfect for coffee lovers who appreciate artisanal craftsmanship.",
    price: 450,
    originalPrice: null,
    rating: 4.3,
    reviewCount: 87,
    colors: [
      {
        name: "Terracotta",
        value: "#E2725B",
        image:
          "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=400&fit=crop",
      },
      {
        name: "Blue Glaze",
        value: "#4682B4",
        image:
          "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=400&fit=crop",
      },
      {
        name: "Natural Clay",
        value: "#CD853F",
        image:
          "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=400&fit=crop",
      },
    ],
    types: ["Small (8oz)", "Medium (12oz)", "Large (16oz)"],
    images: Array(4).fill(
      "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=400&fit=crop"
    ),
    features: [
      "Handcrafted by Artisans",
      "Unique Design",
      "Dishwasher Safe",
      "Share",
    ],
  },
  "12": {
    // Ukulele Beginner Set
    name: "Ukulele Beginner Set",
    description:
      "Complete ukulele starter set perfect for beginners. Includes quality soprano ukulele, carrying case, tuner, picks, and instruction booklet. Great for learning music and developing musical skills.",
    price: 2899,
    originalPrice: null,
    rating: 4.5,
    reviewCount: 156,
    colors: [
      {
        name: "Natural Wood",
        value: "#DEB887",
        image:
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      },
      {
        name: "Mahogany",
        value: "#8B4513",
        image:
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      },
      {
        name: "Sunburst",
        value: "#FF8C00",
        image:
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      },
    ],
    types: ["Soprano", "Concert", "Tenor"],
    images: Array(4).fill(
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop"
    ),
    features: [
      "Complete Beginner Set",
      "Free Shipping",
      "Instruction Included",
      "Share",
    ],
  },
};

// Reviews data for all products
const reviewsData: Record<string, any[]> = {
  "1": [
    {
      id: 1,
      user: "Maria Santos",
      rating: 5,
      date: "2 weeks ago",
      comment:
        "Amazing sound quality! The noise cancellation is perfect for my daily commute. Battery life is exactly as advertised.",
      helpful: 89,
    },
    {
      id: 2,
      user: "Juan Cruz",
      rating: 5,
      date: "1 month ago",
      comment:
        "Best earbuds I've ever owned. Great value for money and the fit is so comfortable.",
      helpful: 76,
    },
    {
      id: 3,
      user: "Ana Rodriguez",
      rating: 4,
      date: "3 weeks ago",
      comment:
        "Good quality earbuds but could use better bass response. Overall satisfied with the purchase.",
      helpful: 45,
    },
  ],
  "2": [
    {
      id: 1,
      user: "Carlos Mendoza",
      rating: 5,
      date: "1 week ago",
      comment:
        "Love that it's eco-friendly! Keeps my water cold all day even in Manila heat. Highly recommend!",
      helpful: 134,
    },
    {
      id: 2,
      user: "Rosa Garcia",
      rating: 5,
      date: "2 weeks ago",
      comment:
        "Perfect size for my gym bag. The quality is excellent and I feel good about supporting sustainability.",
      helpful: 98,
    },
  ],
  "3": [
    {
      id: 1,
      user: "Miguel Torres",
      rating: 5,
      date: "5 days ago",
      comment:
        "Beautiful craftsmanship! This bag gets compliments everywhere I go. The leather quality is outstanding.",
      helpful: 167,
    },
    {
      id: 2,
      user: "Sofia Reyes",
      rating: 5,
      date: "2 weeks ago",
      comment:
        "Worth every peso! The bag is spacious and the vintage design is exactly what I was looking for.",
      helpful: 143,
    },
    {
      id: 3,
      user: "Pedro Gonzales",
      rating: 4,
      date: "3 weeks ago",
      comment:
        "Great quality bag but slightly heavier than expected. Still very satisfied with the purchase.",
      helpful: 87,
    },
  ],
  "4": [
    {
      id: 1,
      user: "Carmen Dela Cruz",
      rating: 5,
      date: "3 days ago",
      comment:
        "Amazing coffee! You can really taste the difference. Supporting local farmers feels great too.",
      helpful: 234,
    },
    {
      id: 2,
      user: "Jose Villanueva",
      rating: 5,
      date: "1 week ago",
      comment:
        "Best coffee beans I've tried in the Philippines. Rich flavor and perfect roasting.",
      helpful: 189,
    },
    {
      id: 3,
      user: "Linda Ramos",
      rating: 4,
      date: "2 weeks ago",
      comment:
        "Good coffee but could be ground finer. Overall happy with the quality and ethical sourcing.",
      helpful: 112,
    },
  ],
  "5": [
    {
      id: 1,
      user: "Teresa Castro",
      rating: 5,
      date: "1 week ago",
      comment:
        "Beautiful baskets! The craftsmanship is incredible. Perfect for organizing and decoration.",
      helpful: 78,
    },
    {
      id: 2,
      user: "Roberto Silva",
      rating: 4,
      date: "2 weeks ago",
      comment:
        "Well-made baskets. Good quality materials and I love supporting local artisans.",
      helpful: 65,
    },
  ],
  "6": [
    {
      id: 1,
      user: "Elena Morales",
      rating: 5,
      date: "4 days ago",
      comment:
        "Excellent smartwatch! All the fitness tracking features work perfectly. Great value for money.",
      helpful: 278,
    },
    {
      id: 2,
      user: "Antonio Luna",
      rating: 4,
      date: "1 week ago",
      comment:
        "Good watch with accurate tracking. Battery life could be better but overall satisfied.",
      helpful: 156,
    },
    {
      id: 3,
      user: "Isabella Cruz",
      rating: 5,
      date: "2 weeks ago",
      comment:
        "Love all the health monitoring features! Helps me stay on track with my fitness goals.",
      helpful: 203,
    },
  ],
  "7": [
    {
      id: 1,
      user: "Chef Marco Santos",
      rating: 5,
      date: "2 days ago",
      comment:
        "Authentic recipes that bring back childhood memories! Clear instructions and beautiful photos.",
      helpful: 145,
    },
    {
      id: 2,
      user: "Lola Esperanza",
      rating: 5,
      date: "1 week ago",
      comment:
        "Finally found recipes like my grandmother used to make! Traditional and delicious.",
      helpful: 187,
    },
  ],
  "8": [
    {
      id: 1,
      user: "Tech Reviewer PH",
      rating: 5,
      date: "1 day ago",
      comment:
        "Sturdy and eco-friendly! Perfect angle for video calls. Great addition to any workspace.",
      helpful: 567,
    },
    {
      id: 2,
      user: "Office Worker",
      rating: 4,
      date: "5 days ago",
      comment:
        "Good quality stand but could use more adjustment options. Still happy with the purchase.",
      helpful: 234,
    },
    {
      id: 3,
      user: "Student User",
      rating: 5,
      date: "1 week ago",
      comment:
        "Perfect for online classes! Bamboo material looks great and feels sustainable.",
      helpful: 345,
    },
  ],
  "9": [
    {
      id: 1,
      user: "Health Enthusiast",
      rating: 5,
      date: "6 hours ago",
      comment:
        "Pure and delicious honey! You can taste the difference from commercial brands. Love the local sourcing.",
      helpful: 298,
    },
    {
      id: 2,
      user: "Wellness Mom",
      rating: 5,
      date: "4 days ago",
      comment:
        "Great for the whole family! Natural sweetness and health benefits. Will definitely reorder.",
      helpful: 267,
    },
  ],
  "10": [
    {
      id: 1,
      user: "Sensitive Skin User",
      rating: 5,
      date: "12 hours ago",
      comment:
        "Finally found soaps that don't irritate my skin! Gentle and natural. Love the different scents.",
      helpful: 189,
    },
    {
      id: 2,
      user: "Natural Beauty Fan",
      rating: 4,
      date: "3 days ago",
      comment:
        "Good quality handmade soaps. Could last a bit longer but the ingredients are excellent.",
      helpful: 134,
    },
  ],
  "11": [
    {
      id: 1,
      user: "Coffee Lover",
      rating: 5,
      date: "18 hours ago",
      comment:
        "Beautiful mug with perfect size for my morning coffee. Each piece is truly unique!",
      helpful: 67,
    },
    {
      id: 2,
      user: "Art Collector",
      rating: 4,
      date: "4 days ago",
      comment:
        "Nice craftsmanship and good quality ceramic. Great addition to my collection.",
      helpful: 45,
    },
  ],
  "12": [
    {
      id: 1,
      user: "Music Teacher",
      rating: 5,
      date: "2 hours ago",
      comment:
        "Perfect starter set for beginners! Good quality ukulele and helpful instruction booklet.",
      helpful: 123,
    },
    {
      id: 2,
      user: "Parent Review",
      rating: 5,
      date: "3 days ago",
      comment:
        "My daughter loves learning with this ukulele! Great quality for the price and came with everything needed.",
      helpful: 178,
    },
    {
      id: 3,
      user: "Beginner Player",
      rating: 4,
      date: "1 week ago",
      comment:
        "Good ukulele for starting out. Sound quality is decent and the accessories are helpful.",
      helpful: 89,
    },
  ],
};

export default function ProductDetailPage({ }: ProductDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, setQuickOrder, profile } = useBuyerStore();
  const { products: sellerProducts } = useProductStore();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [activeTab, setActiveTab] = useState("description");
  const [dbProduct, setDbProduct] = useState<ProductWithSeller | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch product from database if it's a real product (UUID)
  useEffect(() => {
    const fetchProduct = async () => {
      // Basic check if it's a UUID (real product) or mock id
      if (!id || id.length < 10) return;

      setIsLoading(true);
      try {
        const product = await getProductById(id);
        if (product) {
          setDbProduct(product);
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Check seller products first (verified products)
  const sellerProduct = dbProduct || sellerProducts.find((p) => p.id === id);

  const baseProduct =
    sellerProduct ||
    trendingProducts.find((p) => p.id === id) ||
    trendingProducts.find((p) => p.id === id?.split("-")[0]) ||
    bestSellerProducts.find((p) => p.id === id) ||
    bestSellerProducts.find((p) => p.id === id?.split("-")[0]) ||
    newArrivals.find((p) => p.id === id) ||
    newArrivals.find((p) => p.id === id?.split("-")[0]);

  // For seller products, create a product-like object
  const sellerAuth = useAuthStore.getState().seller;
  const sellerNameFallback =
    sellerAuth?.businessName || sellerAuth?.storeName || "Verified Seller";

  // Handle both camelCase (from store) and snake_case (from DB)
  const normalizedProduct = sellerProduct
    ? {
      id: (sellerProduct as any).id,
      name: (sellerProduct as any).name,
      price: (sellerProduct as any).price,
      originalPrice: (sellerProduct as any).original_price || (sellerProduct as any).originalPrice,
      image:
        (sellerProduct as any).images?.[0] || (sellerProduct as any).primary_image || (sellerProduct as any).image || "https://placehold.co/400?text=Product",
      images: (sellerProduct as any).images || [],
      category: (sellerProduct as any).category,
      rating: (sellerProduct as any).rating || 0,
      sold: (sellerProduct as any).sales_count !== undefined ? (sellerProduct as any).sales_count : ((sellerProduct as any).sales || 0),
      seller: (sellerProduct as any).seller?.store_name || (sellerProduct as any).sellerName || sellerNameFallback,
      location: (sellerProduct as any).seller?.business_address || (sellerProduct as any).sellerLocation || "Metro Manila",
      isFreeShipping: (sellerProduct as any).is_free_shipping || true,
      isVerified: true,
      description: (sellerProduct as any).description,
      sizes: (sellerProduct as any).sizes || [],
      colors: (sellerProduct as any).colors || [],
      stock: (sellerProduct as any).stock || 0,
      sellerId: (sellerProduct as any).seller_id || (sellerProduct as any).sellerId || "",
    }
    : (baseProduct ? {
      ...baseProduct,
      originalPrice: (baseProduct as any).originalPrice || (baseProduct as any).original_price,
      sizes: (baseProduct as any).sizes || [],
      colors: (baseProduct as any).colors || [],
      stock: (baseProduct as any).stock || 0,
      sellerId: (baseProduct as any).sellerId || (baseProduct as any).seller_id || "",
      sold: (baseProduct as any).sales_count !== undefined ? (baseProduct as any).sales_count : ((baseProduct as any).sold || 0),
    } : null);

  const currentSeller = demoSellers.find(s => s.id === (normalizedProduct?.sellerId || 'seller-001')) || demoSellers[0];

  const productId = normalizedProduct?.id || id?.split("-")[0] || "1";
  const productData = enhancedProductData[productId] || {
    name: normalizedProduct?.name || "",
    description: (normalizedProduct && 'description' in normalizedProduct ? normalizedProduct.description : "") || "",
    price: normalizedProduct?.price || 0,
    originalPrice: (normalizedProduct && 'originalPrice' in normalizedProduct ? normalizedProduct.originalPrice : undefined),
    rating: normalizedProduct?.rating || 4.5,
    reviewCount: 100,
    colors: (normalizedProduct?.colors && normalizedProduct.colors.length > 0)
      ? normalizedProduct.colors.map((c: any) => typeof c === 'string'
        ? {
          name: c,
          value: c,
          image: normalizedProduct?.image || (normalizedProduct as any)?.images?.[0] || ""
        }
        : c)
      : [],
    types: ["Standard"],
    images:
      normalizedProduct && "images" in normalizedProduct
        ? normalizedProduct.images
        : normalizedProduct && "image" in normalizedProduct
          ? [normalizedProduct.image]
          : [""],
    sizes: normalizedProduct?.sizes || [],
    features: [
      "Free Shipping",
      "Verified Product",
      "Quality Guaranteed",
      "Share",
    ],
    sold: (normalizedProduct as any)?.sold || 0,
  };
  const productReviews = reviewsData[productId] || reviewsData["1"];

  const [reviews, setReviews] = useState<EnhancedReview[]>(() =>
    productReviews.map(review => ({
      ...review,
      isLiked: false,
      replies: []
    }))
  );

  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reviewFilter, setReviewFilter] = useState('all');

  const handleToggleLike = (reviewId: number) => {
    setReviews(prev => prev.map(review => {
      if (review.id === reviewId) {
        return {
          ...review,
          isLiked: !review.isLiked,
          helpful: review.isLiked ? review.helpful - 1 : review.helpful + 1
        };
      }
      return review;
    }));
  };

  const handlePostReply = (reviewId: number) => {
    if (!replyText.trim()) return;

    setReviews(prev => prev.map(review => {
      if (review.id === reviewId) {
        return {
          ...review,
          replies: [...review.replies, {
            id: Date.now(),
            text: replyText,
            author: profile ? `${profile.firstName} ${profile.lastName}` : "You",
            date: "Just now",
            avatar: profile?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face",
            isSeller: false
          }]
        };
      }
      return review;
    }));

    setReplyText("");
    setReplyingTo(null);
  };

  if (!normalizedProduct) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Product not found
          </h2>
          <p className="text-gray-600 mb-4">
            The product you're looking for doesn't exist.
          </p>
          <Button
            onClick={() => navigate("/shop")}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)]"
          >
            Back to Shop
          </Button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!normalizedProduct) return;

    const productImage =
      "image" in normalizedProduct
        ? normalizedProduct.image
        : normalizedProduct.images[0];
    const productImages =
      "images" in normalizedProduct ? normalizedProduct.images : [productImage];
    const sellerName =
      "seller" in normalizedProduct
        ? normalizedProduct.seller
        : "Verified Seller";
    const productLocation =
      "location" in normalizedProduct
        ? normalizedProduct.location
        : "Metro Manila";
    const isVerified =
      "isVerified" in normalizedProduct ? normalizedProduct.isVerified : true;
    const soldCount = "sold" in normalizedProduct ? normalizedProduct.sold : 0;
    const freeShipping =
      "isFreeShipping" in normalizedProduct
        ? normalizedProduct.isFreeShipping
        : true;

    // Create a virtual variant based on selection
    const colorName = productData.colors[selectedColor]?.name || "Default";
    const variantName = [
      selectedSize ? `Size: ${selectedSize}` : null,
      colorName !== "Default" ? `Color: ${colorName}` : null
    ].filter(Boolean).join(", ") || "Standard";

    const hasVariations = selectedSize || colorName !== "Default" || (productData.sizes?.length > 0) || (productData.colors?.length > 0);

    const selectedVariant = hasVariations ? {
      id: `var-${normalizedProduct.id}-${selectedSize || 'default'}-${colorName}`,
      name: variantName,
      price: productData.price,
      stock: normalizedProduct.stock || 100,
      image: productData.colors[selectedColor]?.image || productImage
    } : undefined;

    // Create proper product object for buyerStore
    const productForCart = {
      id: normalizedProduct.id,
      name: productData.name,
      price: productData.price,
      originalPrice: 'originalPrice' in normalizedProduct ? normalizedProduct.originalPrice : undefined,
      image: productImage,
      images: productData.images || productImages,
      seller: {
        id: normalizedProduct.sellerId,
        name: sellerName,
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=" + sellerName,
        rating: 4.8,
        totalReviews: 234,
        followers: 1523,
        isVerified: isVerified,
        description: "Trusted seller on BazaarPH",
        location: productLocation,
        established: "2020",
        products: [],
        badges: ["Verified", "Fast Shipper"],
        responseTime: "< 1 hour",
        categories: [normalizedProduct.category],
      },
      sellerId: normalizedProduct.sellerId,
      rating: normalizedProduct.rating,
      totalReviews: 234,
      category: normalizedProduct.category,
      sold: soldCount,
      isFreeShipping: freeShipping,
      location: productLocation,
      description: productData.description || "",
      specifications: {},
      variants: [],
    };

    try {
      addToCart(productForCart as any, quantity, selectedVariant);
    } catch (error) {
      console.error("Error calling addToCart:", error);
    }

    // Show success notification and guide to cart
    const notification = document.createElement("div");
    notification.className =
      "fixed top-20 right-4 bg-white border-2 border-green-500 rounded-lg shadow-2xl p-4 z-[100] animate-slide-in-right";
    notification.innerHTML = `
      <div class="flex items-start gap-3 max-w-sm">
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <div class="flex-1">
          <p class="font-semibold text-gray-900">Added to cart!</p>
          <p class="text-sm text-gray-600">${quantity} item(s) added</p>
          <div class="mt-2 flex gap-2">
            <button onclick="window.location.href='/enhanced-cart'" class="text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline">
              View Cart →
            </button>
            <button onclick="this.closest('.fixed').remove()" class="text-xs font-medium text-gray-500 hover:text-gray-700">
              Continue Shopping
            </button>
          </div>
        </div>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = "slide-out-right 0.3s ease-out";
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  };

  const handleBuyNow = () => {
    if (!normalizedProduct) return;

    const productImage =
      "image" in normalizedProduct
        ? normalizedProduct.image
        : normalizedProduct.images[0];
    const productImages =
      "images" in normalizedProduct ? normalizedProduct.images : [productImage];
    const sellerName =
      "seller" in normalizedProduct
        ? normalizedProduct.seller
        : "Verified Seller";
    const productLocation =
      "location" in normalizedProduct
        ? normalizedProduct.location
        : "Metro Manila";
    const isVerified =
      "isVerified" in normalizedProduct ? normalizedProduct.isVerified : true;
    const soldCount = "sold" in normalizedProduct ? normalizedProduct.sold : 0;
    const freeShipping =
      "isFreeShipping" in normalizedProduct
        ? normalizedProduct.isFreeShipping
        : true;

    // Create a virtual variant based on selection
    const colorName = productData.colors[selectedColor]?.name || "Default";
    const variantName = [
      selectedSize ? `Size: ${selectedSize}` : null,
      colorName !== "Default" ? `Color: ${colorName}` : null
    ].filter(Boolean).join(", ") || "Standard";

    const selectedVariant = {
      id: `var-${normalizedProduct.id}-${selectedSize}-${colorName}`,
      name: variantName,
      price: productData.price,
      stock: normalizedProduct.stock || 100,
      image: productData.colors[selectedColor]?.image || productImage
    };

    // Create proper product object for quick order
    const productForQuickOrder = {
      id: normalizedProduct.id,
      name: productData.name,
      price: productData.price,
      originalPrice: 'originalPrice' in normalizedProduct ? normalizedProduct.originalPrice : undefined,
      image: productImage,
      images: productData.images || productImages,
      seller: {
        id: normalizedProduct.sellerId,
        name: sellerName,
        avatar: "https://api.dicebear.com/7.x/initials/svg?seed=" + sellerName,
        rating: 4.8,
        totalReviews: 234,
        followers: 1523,
        isVerified: isVerified,
        description: "Trusted seller on BazaarPH",
        location: productLocation,
        established: "2020",
        products: [],
        badges: ["Verified", "Fast Shipper"],
        responseTime: "< 1 hour",
        categories: [normalizedProduct.category],
      },
      sellerId: normalizedProduct.sellerId,
      rating: normalizedProduct.rating,
      totalReviews: 234,
      category: normalizedProduct.category,
      sold: soldCount,
      isFreeShipping: freeShipping,
      location: productLocation,
      description: productData.description || "",
      specifications: {},
      variants: [],
    };

    setQuickOrder(productForQuickOrder as any, quantity, selectedVariant);
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-6">
        <button
          onClick={() => navigate("/shop")}
          className="flex items-center gap-2 text-gray-600 hover:text-[#ff6a00] transition-colors mb-4 group"
        >
          <div className="p-1.5 group-hover:[#ff6a00]/10 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Back to Shop</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          {/* Images Section (Left Side) */}
          <div className="lg:col-span-7 flex flex-col-reverse lg:flex-row gap-4 lg:gap-6">
            {/* Thumbnails (Vertical on Desktop, Horizontal on Mobile) */}
            <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:w-24 lg:max-h-[600px] scrollbar-hide py-1">
              {productData.images.map((img: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "flex-shrink-0 w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden border-2 transition-all duration-200",
                    selectedImage === index
                      ? "border-[#ff6a00] ring-2 ring-[#ff6a00]/20"
                      : "border-transparent hover:border-gray-200"
                  )}
                >
                  <img
                    src={img}
                    alt={`${productData.name} view ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={selectedImage}
              className="flex-1 bg-gray-50 rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-auto relative group"
            >
              <img
                src={productData.images[selectedImage]}
                alt={productData.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {productData.originalPrice && (
                <Badge className="absolute top-4 left-4 bg-red-500 hover:bg-red-500 text-white text-xs px-2 py-1">
                  {Math.round(
                    ((productData.originalPrice - productData.price) /
                      productData.originalPrice) *
                    100
                  )}
                  % OFF
                </Badge>
              )}
            </motion.div>
          </div>

          {/* Details Section (Right Side) */}
          <div className="lg:col-span-5 flex flex-col pt-2">
            {/* Store Profile - Compact Header */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-50 overflow-hidden border border-gray-100 shrink-0">
                  <img
                    src={currentSeller.avatar}
                    alt={currentSeller.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-tight">{normalizedProduct?.seller || "Official Store"}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {normalizedProduct?.location || "Metro Manila"}</span>

                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 text-[#ff6a00] font-medium text-xs whitespace-nowrap">
                  <Star className="w-3 h-3 fill-current" /> {currentSeller.rating}
                </div>
                <Button
                  onClick={() => navigate(`/seller/${normalizedProduct?.sellerId || 'seller-001'}`)}
                  className="bg-transparent hover:bg-transparent text-gray-900 hover:text-[#ff6a00] font-semibold p-0 h-auto transition-colors flex items-center gap-1 text-sm"
                  variant="ghost"
                >
                  Visit Store
                  <ChevronRight className="w-4 h-4 text-[#ff6a00]" />
                </Button>
              </div>
            </div>
            <span className="text-gray-500 text-sm font-medium mb-1">
              {productData.category}
            </span>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2 tracking-tight leading-tight">
              {productData.name}
            </h1>

            {/* Price & Rating */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#ff6a00]">
                  ₱{productData.price.toLocaleString()}
                </span>
                {productData.originalPrice && (
                  <span className="text-lg text-gray-400 line-through decoration-gray-400/50">
                    ₱{productData.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="h-4 w-px bg-gray-300 mx-2" />
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-[#ff6a00] text-[#ff6a00]" />
                <span className="font-semibold">{productData.rating}</span>
              </div>
            </div>

            <p className="text-gray-500 text-sm mb-8">
              <span className="font-bold text-gray-900">{productData.sold || 0}</span> products sold
            </p>

            {/* Color Selection */}
            {productData.colors && productData.colors.length > 0 && (
              <div className="mb-8">
                <p className="text-sm font-semibold text-gray-900 mb-3">
                  Color <span className="text-gray-500 font-normal">({productData.colors[selectedColor]?.name})</span>
                </p>
                <div className="flex gap-3">
                  {productData.colors.map((color: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedColor(index)}
                      className={cn(
                        "group relative w-16 h-16 rounded-xl border-2 transition-all overflow-hidden",
                        selectedColor === index
                          ? "border-[#ff6a00] ring-1 ring-[#ff6a00] ring-offset-2"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      title={color.name}
                    >
                      <img
                        src={color.image || normalizedProduct?.image}
                        alt={color.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedColor === index && (
                        <div className="absolute inset-0 bg-[#ff6a00]/10" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {productData.sizes && productData.sizes.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">Size</p>
                  <button className="text-xs text-gray-500 hover:text-[#ff6a00] hover:underline flex items-center gap-1">
                    <Ruler className="w-3 h-3" /> Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {productData.sizes.map((size: string) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "min-w-[3rem] w-auto px-3 h-8 flex items-center justify-center rounded-lg border-2 text-xs transition-all",
                        selectedSize === size
                          ? "border-[#ff6a00] bg-[#ff6a00] text-white"
                          : "border-gray-200 text-gray-900 hover:border-[#ff6a00]"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Composition/Description Preview */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Details</h3>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                {productData.description}
              </p>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-6 mb-8 -mt-4">
              <div className="flex items-center border-2 border-gray-200 rounded-full p-1.5 w-32 justify-between">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-semibold text-gray-900 text-lg">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 -mt-4 mb-8">
              <Button
                onClick={handleAddToCart}
                className="flex-1 h-12 sm:h-14 rounded-full bg-white hover:bg-orange-50 text-[#ff6a00] border-2 border-[#ff6a00] text-sm sm:text-base font-bold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button
                onClick={handleBuyNow}
                className="flex-1 h-12 sm:h-14 rounded-full bg-[#ff6a00] hover:bg-[#e65f00] text-white text-sm sm:text-base font-bold shadow-xl shadow-[#ff6a00]/20 hover:shadow-2xl hover:shadow-[#ff6a00]/30 transition-all active:scale-[0.98] border-0"
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>



        {/* Tabs / Reviews / Full Desc Section */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-4 sticky top-20 z-50 bg-white/80 backdrop-blur-md py-4">
            <nav className="inline-flex bg-gray-100/50 p-1 rounded-full">
              {["description", "reviews", "support"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-8 py-3 rounded-full text-sm font-medium capitalize transition-all duration-300",
                    activeTab === tab
                      ? "bg-white text-[#ff6a00] shadow-lg shadow-gray-200/50"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="max-w-4xl mx-auto">
            {activeTab === "description" && (
              <div className="prose prose-lg mx-auto text-gray-600">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Product Details</h3>
                <p className="leading-relaxed">{productData.description}</p>
                <div className="grid grid-cols-2 gap-y-4 mt-8">
                  {productData.features?.map((feature: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#ff6a00]" />
                      <span className="text-gray-700 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Sticky Rating Summary (Left Sidebar) */}
                <div className="md:col-span-5 lg:col-span-4 sticky top-40 z-40">
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="text-center mb-6">
                      <div className="text-5xl font-bold text-gray-900 leading-none mb-2">{productData.rating}</div>
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < Math.floor(productData.rating) ? "fill-current text-yellow-400" : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-gray-500 font-medium">{productData.reviewCount} reviews</div>
                    </div>

                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex items-center justify-end gap-1.5 w-12 shrink-0">
                            <span className="text-sm font-medium text-gray-700">{star}</span>
                            <Star className="h-3 w-3 fill-current text-yellow-400" />
                          </div>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 rounded-full"
                              style={{ width: `${star === 5 ? 70 : star === 4 ? 20 : star === 3 ? 6 : star === 2 ? 3 : 1}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right tabular-nums">
                            {star === 5 ? '70%' : star === 4 ? '20%' : star === 3 ? '6%' : star === 2 ? '3%' : '1%'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reviews List & Filters (Right Content) */}
                <div className="md:col-span-7 lg:col-span-8 space-y-4">
                  {/* Review Filters */}
                  <div className="sticky top-40 z-40 flex flex-wrap items-center gap-2 mb-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                    {['all', '5', '4', '3', '2', '1', 'media'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setReviewFilter(filter)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                          reviewFilter === filter
                            ? "bg-orange-50 text-orange-600 border-orange-200"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        {filter === 'all' ? 'All' : filter === 'media' ? 'With Media' : `${filter} Star${filter === '1' ? '' : 's'}`}
                      </button>
                    ))}
                  </div>

                  {reviews.filter(review => {
                    if (reviewFilter === 'all') return true;
                    if (reviewFilter === 'media') return false; // No media in current mock data
                    return Math.floor(review.rating).toString() === reviewFilter;
                  }).map((review) => (
                    <div key={review.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-lg text-gray-500 overflow-hidden">
                            {review.user ? (
                              <span className="uppercase">{review.user.charAt(0)}</span>
                            ) : (
                              <User className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">{review.user}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{review.date}</span>
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "w-3 h-3",
                                      i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 leading-snug mb-3 text-sm">{review.comment}</p>

                      {/* Replies */}
                      {review.replies.length > 0 && (
                        <div className="mb-4 pl-4 border-l-2 border-gray-100 space-y-3">
                          {review.replies.map(reply => (
                            <div key={reply.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200/50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-xs text-gray-900">{reply.author}</span>
                                <span className="text-[10px] text-gray-400">{reply.date}</span>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed">{reply.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                        <button
                          onClick={() => handleToggleLike(review.id)}
                          className={cn(
                            "transition-colors flex items-center gap-1.5 group",
                            review.isLiked ? "text-orange-600" : "hover:text-black"
                          )}
                        >
                          <ThumbsUp className={cn(
                            "h-3.5 w-3.5 transition-colors",
                            review.isLiked ? "fill-current text-orange-600" : "group-hover:text-orange-600"
                          )} />
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border ml-1", review.isLiked ? "bg-orange-50 border-orange-200" : "bg-white border-gray-200")}>{review.helpful}</span>
                        </button>
                        <button
                          onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                          className="text-xs hover:text-orange-600 transition-colors"
                        >
                          Reply
                        </button>
                      </div>

                      {replyingTo === review.id && (
                        <div className="mt-4">
                          <div className="relative">
                            <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              className="min-h-[80px] bg-gray-50 border-gray-200 focus:border-[#ff6a00] focus:ring-[#ff6a00] mb-2 text-sm resize-none pr-20"
                            />
                            <div className="flex justify-end gap-2 absolute bottom-4 right-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(null)}
                                className="h-6 text-xs hover:bg-gray-200 text-gray-500 px-2"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handlePostReply(review.id)}
                                className="h-6 text-xs bg-[#ff6a00] hover:bg-[#e65f00] text-white px-3"
                              >
                                Post
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "support" && (
              <div className="max-w-2xl mx-auto py-0 text-center sm:text-left">
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                  <p className="text-gray-600 leading-relaxed mb-6">
                    We offer a 7-day return policy for defective items. Please contact our support team for assistance.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-900 font-medium bg-white p-4 rounded-xl border border-gray-100 inline-flex">
                    <ShieldCheck className="w-5 h-5 text-[#ff6a00]" />
                    Warranty: 1 Year Manufacturer Warranty
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <BazaarFooter />
    </div>
  );
}

// Helper icon component
function Ruler(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
      <path d="m14.5 12.5 2-2" />
      <path d="m11.5 9.5 2-2" />
      <path d="m8.5 6.5 2-2" />
      <path d="m17.5 15.5 2-2" />
    </svg>
  );
}
