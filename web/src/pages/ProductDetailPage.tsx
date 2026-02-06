/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "../hooks/use-toast";
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
  Gift,
  Ruler,
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
import { useChatStore } from "../stores/chatStore";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { cn } from "../lib/utils";
import { productService } from "../services/productService";
import { ProductWithSeller } from "../types/database.types";
import { ProductReviews } from "@/components/reviews/ProductReviews";
import { CreateRegistryModal } from "../components/CreateRegistryModal";
import { CartModal } from "../components/ui/cart-modal";
import { BuyNowModal } from "../components/ui/buy-now-modal";

interface ProductDetailPageProps { }

interface EnhancedReview {
  id: number;
  user: string;
  rating: number;
  date: string;
  comment: string;
  helpful: number;
  isLiked: boolean;
  replies: any[];
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
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
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
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop",
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
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop",
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
      "https://images.unsplash.com/photo-1559496417-e7f25cb247cd?w=400&h=400&fit=crop",
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
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
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
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
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
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop",
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
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
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
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop",
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
      "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=400&h=400&fit=crop",
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
      "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=400&fit=crop",
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
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
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
  const { addToCart, setQuickOrder, profile, registries, addToRegistry, cartItems } = useBuyerStore();
  const { products: sellerProducts } = useProductStore();

  const [showRegistryModal, setShowRegistryModal] = useState(false);
  const [isCreateRegistryModalOpen, setIsCreateRegistryModalOpen] = useState(false);
  const { createRegistry } = useBuyerStore();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [activeTab, setActiveTab] = useState("description");
  const [dbProduct, setDbProduct] = useState<ProductWithSeller | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states for Add to Cart and Buy Now
  const [showCartModal, setShowCartModal] = useState(false);
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [addedProductInfo, setAddedProductInfo] = useState<{ name: string; image: string } | null>(null);

  // Fetch product from database if it's a real product (UUID)
  useEffect(() => {
    const fetchProduct = async () => {
      // Basic check if it's a UUID (real product) or mock id
      if (!id || id.length < 10) return;

      setIsLoading(true);
      try {
        const product = await productService.getProductById(id);
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
  // Extract unique sizes and colors from variants if available
  const extractedVariants = (sellerProduct as any)?.variants || [];
  const extractedSizes = [...new Set(extractedVariants.map((v: any) => v.size).filter(Boolean))] as string[];
  const extractedColors = [...new Set(extractedVariants.map((v: any) => v.color).filter(Boolean))] as string[];

  const normalizedProduct = sellerProduct
    ? {
      id: (sellerProduct as any).id,
      name: (sellerProduct as any).name,
      price: (sellerProduct as any).price,
      originalPrice:
        (sellerProduct as any).original_price ||
        (sellerProduct as any).originalPrice,
      image:
        (sellerProduct as any).images?.[0]?.image_url ||
        (sellerProduct as any).images?.[0] ||
        (sellerProduct as any).primary_image ||
        (sellerProduct as any).primary_image_url ||
        (sellerProduct as any).image ||
        "https://placehold.co/400?text=Product",
      images: ((sellerProduct as any).images || []).map((img: any) =>
        typeof img === 'string' ? img : img.image_url
      ).filter(Boolean),
      category: (sellerProduct as any).category,
      rating: (sellerProduct as any).rating || 0,
      sold:
        (sellerProduct as any).sales_count !== undefined
          ? (sellerProduct as any).sales_count
          : (sellerProduct as any).sales || 0,
      seller:
        (sellerProduct as any).seller?.store_name ||
        (sellerProduct as any).sellerName ||
        sellerNameFallback,
      location:
        (sellerProduct as any).seller?.business_address ||
        (sellerProduct as any).sellerLocation ||
        "Metro Manila",
      isFreeShipping: (sellerProduct as any).is_free_shipping || true,
      isVerified: true,
      description: (sellerProduct as any).description,
      sizes: extractedSizes.length > 0 ? extractedSizes : ((sellerProduct as any).sizes || []),
      colors: extractedColors.length > 0 ? extractedColors : ((sellerProduct as any).colors || []),
      stock: (sellerProduct as any).stock || 0,
      sellerId:
        (sellerProduct as any).seller_id ||
        (sellerProduct as any).sellerId ||
        "",
      variants: extractedVariants,
    }
    : baseProduct
      ? {
        ...baseProduct,
        originalPrice:
          (baseProduct as any).originalPrice ||
          (baseProduct as any).original_price,
        sizes: (baseProduct as any).sizes || [],
        colors: (baseProduct as any).colors || [],
        stock: (baseProduct as any).stock || 0,
        sellerId:
          (baseProduct as any).sellerId ||
          (baseProduct as any).seller_id ||
          "",
        sold:
          (baseProduct as any).sales_count !== undefined
            ? (baseProduct as any).sales_count
            : (baseProduct as any).sold || 0,
      }
      : null;

  const currentSeller =
    demoSellers.find(
      (s) => s.id === (normalizedProduct?.sellerId || "seller-001"),
    ) || demoSellers[0];

  const productId = normalizedProduct?.id || id?.split("-")[0] || "1";
  // Get variants from normalized product for proper price/stock management
  const dbVariants = (normalizedProduct as any)?.variants || [];

  // Helper to get the selected variant based on size and color
  const getSelectedVariant = () => {
    if (dbVariants.length === 0) return null;
    // If only one variant, return it
    if (dbVariants.length === 1) return dbVariants[0];
    // Find variant matching selected size and/or color
    return dbVariants.find((v: any) => {
      const sizeMatch = !selectedSize || v.size === selectedSize;
      const colorMatch = !productData.colors.length ||
        productData.colors[selectedColor]?.name === v.color ||
        (selectedColor === 0 && !v.color);
      return sizeMatch && colorMatch;
    }) || dbVariants[0];
  };

  const productData = enhancedProductData[productId] || {
    name: normalizedProduct?.name || "",
    description:
      (normalizedProduct && "description" in normalizedProduct
        ? normalizedProduct.description
        : "") || "",
    price: normalizedProduct?.price || 0,
    originalPrice:
      normalizedProduct && "originalPrice" in normalizedProduct
        ? normalizedProduct.originalPrice
        : undefined,
    rating: normalizedProduct?.rating || 4.5,
    reviewCount: 100,
    colors:
      normalizedProduct?.colors && normalizedProduct.colors.length > 0
        ? normalizedProduct.colors.map((c: any) =>
          typeof c === "string"
            ? {
              name: c,
              value: c,
              image:
                normalizedProduct?.image ||
                (normalizedProduct as any)?.images?.[0] ||
                "",
            }
            : c,
        )
        : [],
    types: ["Standard"],
    images:
      normalizedProduct && "images" in normalizedProduct
        ? normalizedProduct.images
        : normalizedProduct && "image" in normalizedProduct
          ? [normalizedProduct.image]
          : [""],
    sizes: normalizedProduct?.sizes || [],
    variants: dbVariants,
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
    productReviews.map((review) => ({
      ...review,
      isLiked: false,
      replies: [],
    })),
  );

  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");

  // Set chat target for floating bubble when viewing product
  useEffect(() => {
    if (normalizedProduct && currentSeller) {
      useChatStore.getState().openChat({
        sellerId: normalizedProduct?.sellerId || 'seller-001',
        sellerName: normalizedProduct?.seller || currentSeller.name || 'Official Store',
        sellerAvatar: currentSeller.avatar,
        productId: normalizedProduct?.id,
        productName: productData.name || normalizedProduct?.name,
        productImage: productData.images?.[0] || normalizedProduct?.image,
      });
      // Start in mini mode (just the bubble)
      useChatStore.getState().setMiniMode(true);
    }

    // Cleanup - clear chat target when leaving page
    return () => {
      useChatStore.getState().closeChat();
      useChatStore.getState().clearChatTarget();
    };
  }, [normalizedProduct?.id]);


  if (!normalizedProduct) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Product not found
          </h2>
          <p className="text-gray-600 mb-4">
            The product you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-[#ff6a00] transition-colors mb-4 group"
          >
            <div className="p-1.5">
              <ChevronLeft className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm">Back to Shop</span>
          </button>
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

    // Use DB variant if available, otherwise create virtual variant
    const dbVariant = getSelectedVariant();
    const colorName = productData.colors[selectedColor]?.name || dbVariant?.color || "Default";
    const variantName = dbVariant?.variant_name ||
      [
        selectedSize ? `Size: ${selectedSize}` : null,
        colorName !== "Default" ? `Color: ${colorName}` : null,
      ]
        .filter(Boolean)
        .join(", ") || "Standard";

    const hasVariations =
      dbVariant ||
      selectedSize ||
      colorName !== "Default" ||
      productData.sizes?.length > 0 ||
      productData.colors?.length > 0;

    const selectedVariant = hasVariations
      ? {
        id: dbVariant?.id || `var-${normalizedProduct.id}-${selectedSize || "default"}-${colorName}`,
        name: variantName,
        size: dbVariant?.size || selectedSize || undefined,
        color: dbVariant?.color || (colorName !== "Default" ? colorName : undefined),
        price: dbVariant?.price || productData.price,
        stock: dbVariant?.stock || normalizedProduct.stock || 100,
        image: dbVariant?.thumbnail_url || productData.colors[selectedColor]?.image || productImage,
      }
      : undefined;

    // Use variant price if available
    const effectivePrice = selectedVariant?.price || productData.price;

    // Create proper product object for buyerStore
    const productForCart = {
      id: normalizedProduct.id,
      name: productData.name,
      price: effectivePrice,
      originalPrice:
        "originalPrice" in normalizedProduct
          ? normalizedProduct.originalPrice
          : undefined,
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
      variants: dbVariants,
    };

    try {
      addToCart(productForCart as any, quantity, selectedVariant);
    } catch (error) {
      console.error("Error calling addToCart:", error);
    }

    // Show cart modal
    setAddedProductInfo({
      name: productData.name,
      image: productImage,
    });
    setShowCartModal(true);
  };

  const handleBuyNow = () => {
    if (!normalizedProduct) return;

    // Show the buy now modal for variant selection
    setShowBuyNowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-[#ff6a00] transition-colors mb-4 group"
        >
          <div className="p-1.5">
            <ChevronLeft className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">Back</span>
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
                      : "border-transparent hover:border-gray-200",
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
                    100,
                  )}
                  % OFF
                </Badge>
              )}
            </motion.div>
          </div>

          {/* Details Section (Right Side) */}
          <div className="lg:col-span-5 flex flex-col pt-2">
            {/* Store Profile - Compact Header */}
            <div
              className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 group cursor-pointer"
              onClick={() => navigate(`/seller/${normalizedProduct?.sellerId || "seller-001"}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-50 overflow-hidden border border-gray-100 shrink-0">
                  <img
                    src={currentSeller.avatar}
                    alt={currentSeller.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-tight">
                    {normalizedProduct?.seller || "Official Store"}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{" "}
                      {normalizedProduct?.location || "Metro Manila"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useChatStore.getState().openChat({
                      sellerId: normalizedProduct?.sellerId || 'seller-001',
                      sellerName: normalizedProduct?.seller || 'Official Store',
                      sellerAvatar: currentSeller.avatar,
                      productId: normalizedProduct?.id,
                      productName: productData.name,
                      productImage: productData.images?.[0] || normalizedProduct?.image,
                    });
                    useChatStore.getState().setMiniMode(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-medium transition-all border border-orange-200"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Chat
                </button>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-[#ff6a00] font-medium text-xs whitespace-nowrap">
                    <Star className="w-3 h-3 fill-current" />{" "}
                    {currentSeller.rating}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 group-hover:text-[#ff6a00] transition-colors">
                    <span>Visit Store</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
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
              <span className="font-bold text-gray-900">
                {productData.sold || 0}
              </span>{" "}
              products sold
            </p>

            {/* Color Selection */}
            {productData.colors && productData.colors.length > 0 && (
              <div className="mb-8">
                <p className="text-sm font-semibold text-gray-900 mb-3">
                  Color{" "}
                  <span className="text-gray-500 font-normal">
                    ({productData.colors[selectedColor]?.name})
                  </span>
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
                          : "border-gray-200 hover:border-gray-300",
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
                          : "border-gray-200 text-gray-900 hover:border-[#ff6a00]",
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
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Details
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                {productData.description}
              </p>
            </div>

            {/* Quantity and Stock */}
            <div className="flex items-center gap-6 mb-8 -mt-4">
              <div className="flex items-center border-2 border-gray-200 rounded-full p-1.5 w-32 justify-between">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-semibold text-gray-900 text-lg">
                  {quantity}
                </span>
                <button
                  onClick={() => {
                    const currentVariant = getSelectedVariant();
                    const maxStock = currentVariant?.stock || (normalizedProduct as any)?.stock || 100;
                    setQuantity(Math.min(maxStock, quantity + 1));
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {/* Stock Display */}
              {(() => {
                const currentVariant = getSelectedVariant();
                const stockQty = currentVariant?.stock || (normalizedProduct as any)?.stock || 0;
                return (
                  <div className="flex items-center gap-2">
                    {stockQty > 0 ? (
                      <>
                        <span className={cn(
                          "text-sm font-medium",
                          stockQty <= 5 ? "text-orange-500" : "text-green-600"
                        )}>
                          {stockQty <= 5 ? `Only ${stockQty} left!` : `${stockQty} in stock`}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-red-500">Out of stock</span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 -mt-4 mb-8">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!registries || registries.length === 0) {
                    navigate("/registry", { state: { openCreateModal: true } });
                  } else {
                    setShowRegistryModal(true);
                  }
                }}
                className="h-12 sm:h-14 w-12 sm:w-14 rounded-full bg-orange-100/50 hover:bg-orange-100 text-[#ff6a00] border-2 border-[#ff6a00] p-0 flex items-center justify-center font-bold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                title="Add to Registry"
              >
                <Gift className="w-6 h-6" />
              </Button>
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
          <div className="flex justify-center mb-4 sticky top-20 z-50 bg-gray-50/95 backdrop-blur-md py-4">
            <nav className="inline-flex bg-gray-100/50 p-1 rounded-full">
              {["description", "reviews", "support"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-8 py-3 rounded-full text-sm font-medium capitalize transition-all duration-300",
                    activeTab === tab
                      ? "bg-white text-[#ff6a00] shadow-lg shadow-gray-200/50"
                      : "text-gray-500 hover:text-gray-700",
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
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Product Details
                </h3>
                <p className="leading-relaxed">{productData.description}</p>
                <div className="grid grid-cols-2 gap-y-4 mt-8">
                  {productData.features?.map((feature: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#ff6a00]" />
                      <span className="text-gray-700 font-medium">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <ProductReviews
                productId={normalizedProduct.id}
                rating={productData.rating}
                reviewCount={productData.reviewCount}
              />
            )}

            {activeTab === "support" && (
              <div className="max-w-2xl mx-auto py-0 text-center sm:text-left">
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                  <p className="text-gray-600 leading-relaxed mb-6">
                    We offer a 7-day return policy for defective items. Please
                    contact our support team for assistance.
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
      {/* Registry Selection Modal */}
      {showRegistryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl scale-100 opacity-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add to Registry</h2>
              <button
                onClick={() => setShowRegistryModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Minus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {registries.map((registry) => (
                <button
                  key={registry.id}
                  onClick={() => {
                    // Create a simplified product object for the registry
                    const productToAdd = {
                      id: normalizedProduct?.id || productData.id || "temp-id",
                      name: productData.name,
                      price: productData.price,
                      image: productData.images[0],
                      // Add other necessary fields as needed by your Product type or make them optional
                      description: productData.description || "",
                      images: productData.images,
                      seller: currentSeller,
                      sellerId: normalizedProduct?.sellerId || "unknown",
                      rating: productData.rating,
                      totalReviews: productData.reviewCount,
                      category: "General",
                      sold: 0,
                      isFreeShipping: false,
                      location: "Metro Manila",
                      specifications: {},
                      variants: []
                    } as any;

                    addToRegistry(registry.id, productToAdd);
                    setShowRegistryModal(false);
                    toast({
                      title: "Added to Registry",
                      description: `${productData.name} has been added to ${registry.title}.`,
                    });
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all group text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                    <img
                      src={registry.imageUrl || "/public/gradGift.jpeg"}
                      alt={registry.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                      {registry.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {registry.products?.length || 0} items • Shared {registry.sharedDate}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowRegistryModal(false);
                  setIsCreateRegistryModalOpen(true);
                }}
                className="w-full py-3 px-4 rounded-xl border border-dashed border-gray-300 text-gray-600 font-medium hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Registry
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Registry Modal */}
      <CreateRegistryModal
        isOpen={isCreateRegistryModalOpen}
        onClose={() => setIsCreateRegistryModalOpen(false)}
        onCreate={(name, category) => {
          const newRegistry = {
            id: `reg-${Date.now()}`,
            title: name,
            sharedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            imageUrl: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=400&h=400&fit=crop",
            category: category,
            products: []
          };
          createRegistry(newRegistry);
          setIsCreateRegistryModalOpen(false);
          // Re-open the add to registry modal to allow adding the product immediately
          setShowRegistryModal(true);
          toast({
            title: "Registry Created",
            description: `${name} has been created successfully.`,
          });
        }}
      />

      {/* Cart Modal */}
      {addedProductInfo && (
        <CartModal
          isOpen={showCartModal}
          onClose={() => setShowCartModal(false)}
          productName={addedProductInfo.name}
          productImage={addedProductInfo.image}
          cartItemCount={cartItems.length}
        />
      )}

      {/* Buy Now Modal */}
      {normalizedProduct && (
        <BuyNowModal
          isOpen={showBuyNowModal}
          onClose={() => setShowBuyNowModal(false)}
          product={{
            id: normalizedProduct.id,
            name: productData.name,
            price: productData.price,
            originalPrice: productData.originalPrice,
            image: productData.images?.[0] || normalizedProduct.image || '',
            images: productData.images,
            colors: productData.colors?.map((c: any) => c.name || c) || [],
            sizes: productData.sizes || [],
            stock: normalizedProduct.stock || 100,
          }}
          onConfirm={(qty, variant) => {
            // Create the product for quick order
            const productImage = productData.images?.[0] || normalizedProduct.image || '';
            const sellerName = "seller" in normalizedProduct ? normalizedProduct.seller : "Verified Seller";
            const productLocation = "location" in normalizedProduct ? normalizedProduct.location : "Metro Manila";
            const soldCount = "sold" in normalizedProduct ? normalizedProduct.sold : 0;
            const freeShipping = "isFreeShipping" in normalizedProduct ? normalizedProduct.isFreeShipping : true;

            const productForQuickOrder = {
              id: normalizedProduct.id,
              name: productData.name,
              price: variant?.price || productData.price,
              originalPrice: productData.originalPrice,
              image: variant?.image || productImage,
              images: productData.images || [productImage],
              seller: {
                id: normalizedProduct.sellerId,
                name: sellerName,
                avatar: "https://api.dicebear.com/7.x/initials/svg?seed=" + sellerName,
                rating: 4.8,
                totalReviews: 234,
                followers: 1523,
                isVerified: true,
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
              variants: dbVariants,
            };

            setQuickOrder(productForQuickOrder as any, qty, variant);
            navigate("/checkout");
          }}
        />
      )}
    </div>
  );
}
