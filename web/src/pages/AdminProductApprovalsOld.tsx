import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  RefreshCw,
  Tag,
  DollarSign,
  AlertCircle,
  Search,
  Filter,
  ArrowLeft,
  Calendar,
  Package
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
  description: string;
  vendorClaimedCategory: string;
  systemDetectedCategory: string;
  vendorAttributes: { label: string; value: string }[];
  detectedKeywords: string[];
  baseFee: number;
  riskModifier: number;
  categoryPriceLimit: number;
  vendor: {
    name: string;
    rating: number;
    totalProducts: number;
  };
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

// Enhanced mock product data
const allProducts: Product[] = [
  {
    id: 'P001',
    title: 'Premium Anti-Aging Serum with Vitamin C',
    price: 5000,
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500',
      'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500'
    ],
    description: 'A powerful anti-aging serum formulated with 20% pure Vitamin C. This luxurious serum penetrates deep into the skin to reduce fine lines, wrinkles, and dark spots. Suitable for all skin types. Dermatologist tested and approved.',
    vendorClaimedCategory: 'Accessories',
    systemDetectedCategory: 'Skincare/Beauty',
    vendorAttributes: [
      { label: 'Shelf Life', value: '6 Months' },
      { label: 'Weight', value: '50ml' },
      { label: 'Material', value: 'Glass Bottle' },
      { label: 'Origin', value: 'South Korea' }
    ],
    detectedKeywords: ['Serum', 'Anti-Aging', 'Vitamin C', 'Skin', 'Beauty'],
    baseFee: 10,
    riskModifier: 2,
    categoryPriceLimit: 1500,
    vendor: {
      name: 'Beauty Essentials Store',
      rating: 4.5,
      totalProducts: 24
    },
    submittedDate: '2024-12-20',
    status: 'pending'
  },
  {
    id: 'P002',
    title: 'Wireless Bluetooth Headphones',
    price: 899,
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500'
    ],
    description: 'High-quality wireless Bluetooth headphones with noise cancellation. Features 30-hour battery life, premium sound quality, and comfortable over-ear design.',
    vendorClaimedCategory: 'Electronics',
    systemDetectedCategory: 'Electronics',
    vendorAttributes: [
      { label: 'Battery Life', value: '30 Hours' },
      { label: 'Weight', value: '250g' },
      { label: 'Connectivity', value: 'Bluetooth 5.0' },
      { label: 'Warranty', value: '1 Year' }
    ],
    detectedKeywords: ['Wireless', 'Bluetooth', 'Headphones', 'Audio'],
    baseFee: 10,
    riskModifier: 0,
    categoryPriceLimit: 5000,
    vendor: {
      name: 'Tech World PH',
      rating: 4.8,
      totalProducts: 156
    },
    submittedDate: '2024-12-21',
    status: 'pending'
  },
  {
    id: 'P003',
    title: 'Organic Green Tea Matcha Powder',
    price: 850,
    images: [
      'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=500',
      'https://images.unsplash.com/photo-1582793988951-9aed5509eb97?w=500'
    ],
    description: 'Premium grade organic matcha powder from Japan. Rich in antioxidants, perfect for lattes, smoothies, and baking. 100g resealable pouch.',
    vendorClaimedCategory: 'Food & Beverages',
    systemDetectedCategory: 'Food & Beverages',
    vendorAttributes: [
      { label: 'Weight', value: '100g' },
      { label: 'Shelf Life', value: '12 Months' },
      { label: 'Origin', value: 'Japan' },
      { label: 'Organic', value: 'Yes' }
    ],
    detectedKeywords: ['Matcha', 'Tea', 'Organic', 'Food'],
    baseFee: 10,
    riskModifier: 0,
    categoryPriceLimit: 2000,
    vendor: {
      name: 'Healthy Living Market',
      rating: 4.7,
      totalProducts: 89
    },
    submittedDate: '2024-12-22',
    status: 'pending'
  },
  {
    id: 'P004',
    title: 'Designer Leather Handbag - Premium Quality',
    price: 8500,
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500',
      'https://images.unsplash.com/photo-1591561954555-607968f885a8?w=500'
    ],
    description: 'Luxurious genuine leather handbag with gold hardware. Multiple compartments, adjustable strap, perfect for daily use or special occasions.',
    vendorClaimedCategory: 'Fashion & Apparel',
    systemDetectedCategory: 'Fashion & Apparel',
    vendorAttributes: [
      { label: 'Material', value: 'Genuine Leather' },
      { label: 'Dimensions', value: '30x25x12cm' },
      { label: 'Color', value: 'Brown' },
      { label: 'Brand', value: 'Elite Fashion' }
    ],
    detectedKeywords: ['Handbag', 'Leather', 'Fashion', 'Accessory'],
    baseFee: 10,
    riskModifier: 1,
    categoryPriceLimit: 15000,
    vendor: {
      name: 'Fashion Forward Boutique',
      rating: 4.6,
      totalProducts: 203
    },
    submittedDate: '2024-12-22',
    status: 'pending'
  },
  {
    id: 'P005',
    title: 'Smart Watch Fitness Tracker',
    price: 2499,
    images: [
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500'
    ],
    description: 'Advanced fitness tracker with heart rate monitor, sleep tracking, and 14-day battery life. Water resistant, compatible with iOS and Android.',
    vendorClaimedCategory: 'Electronics',
    systemDetectedCategory: 'Electronics',
    vendorAttributes: [
      { label: 'Battery Life', value: '14 Days' },
      { label: 'Water Resistance', value: '5ATM' },
      { label: 'Display', value: '1.4 inch AMOLED' },
      { label: 'Compatibility', value: 'iOS & Android' }
    ],
    detectedKeywords: ['Smart Watch', 'Fitness', 'Tracker', 'Electronics'],
    baseFee: 10,
    riskModifier: 0,
    categoryPriceLimit: 8000,
    vendor: {
      name: 'Tech World PH',
      rating: 4.8,
      totalProducts: 156
    },
    submittedDate: '2024-12-23',
    status: 'pending'
  },
  {
    id: 'P006',
    title: 'Portable Bluetooth Speaker - Waterproof',
    price: 1299,
    images: [
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500'
    ],
    description: 'Compact portable Bluetooth speaker with 360° sound. Waterproof IPX7 rating, 12-hour battery, built-in microphone for calls.',
    vendorClaimedCategory: 'Electronics',
    systemDetectedCategory: 'Electronics',
    vendorAttributes: [
      { label: 'Battery Life', value: '12 Hours' },
      { label: 'Water Resistance', value: 'IPX7' },
      { label: 'Range', value: '10 meters' },
      { label: 'Weight', value: '450g' }
    ],
    detectedKeywords: ['Speaker', 'Bluetooth', 'Waterproof', 'Audio'],
    baseFee: 10,
    riskModifier: 1,
    categoryPriceLimit: 5000,
    vendor: {
      name: 'Sound & Vision Electronics',
      rating: 4.5,
      totalProducts: 78
    },
    submittedDate: '2024-12-23',
    status: 'pending'
  },
  {
    id: 'P007',
    title: 'Yoga Mat - Extra Thick Non-Slip',
    price: 799,
    images: [
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500'
    ],
    description: 'Premium 8mm thick yoga mat with superior grip and cushioning. Eco-friendly material, comes with carrying strap. Perfect for all yoga styles.',
    vendorClaimedCategory: 'Sports & Outdoors',
    systemDetectedCategory: 'Sports & Outdoors',
    vendorAttributes: [
      { label: 'Thickness', value: '8mm' },
      { label: 'Dimensions', value: '183x61cm' },
      { label: 'Material', value: 'TPE' },
      { label: 'Color Options', value: '5' }
    ],
    detectedKeywords: ['Yoga', 'Mat', 'Fitness', 'Exercise'],
    baseFee: 10,
    riskModifier: 0,
    categoryPriceLimit: 2000,
    vendor: {
      name: 'Fitness Gear Pro',
      rating: 4.7,
      totalProducts: 45
    },
    submittedDate: '2024-12-19',
    status: 'pending'
  },
  {
    id: 'P008',
    title: 'Hair Styling Cream - Professional Grade',
    price: 650,
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500'
    ],
    description: 'Professional hair styling cream with strong hold and natural finish. Suitable for all hair types, water-based formula, easy to wash out.',
    vendorClaimedCategory: 'Health & Beauty',
    systemDetectedCategory: 'Health & Beauty',
    vendorAttributes: [
      { label: 'Volume', value: '100ml' },
      { label: 'Hold Level', value: 'Strong' },
      { label: 'Finish', value: 'Natural' },
      { label: 'Fragrance', value: 'Fresh' }
    ],
    detectedKeywords: ['Hair', 'Styling', 'Cream', 'Beauty'],
    baseFee: 10,
    riskModifier: 0,
    categoryPriceLimit: 1500,
    vendor: {
      name: 'Beauty Essentials Store',
      rating: 4.5,
      totalProducts: 24
    },
    submittedDate: '2024-12-19',
    status: 'pending'
  }
];

const AdminProductApprovals: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showRejectDropdown, setShowRejectDropdown] = useState(false);
  const [showReclassifyDropdown, setShowReclassifyDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Filter products based on search and filters
  const filteredProducts = allProducts.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.vendor.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDate = dateFilter === 'all' || (() => {
      const productDate = new Date(product.submittedDate);
      const today = new Date();
      const diffTime = today.getTime() - productDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      switch(dateFilter) {
        case 'today': return diffDays === 0;
        case 'week': return diffDays <= 7;
        case 'month': return diffDays <= 30;
        default: return true;
      }
    })();
    
    const matchesCategory = categoryFilter === 'all' || 
                           product.vendorClaimedCategory === categoryFilter;
    
    return matchesSearch && matchesDate && matchesCategory;
  });

  const currentProduct = selectedProduct;
  
  if (!currentProduct) {
    // Show list view
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <AdminSidebar open={open} setOpen={setOpen} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Product Approval Queue</h1>
                <p className="text-gray-600 mt-1">Review vendor listings for quality and category accuracy</p>
              </div>
              <Badge variant="outline" className="text-sm px-4 py-2">
                {filteredProducts.length} Pending
              </Badge>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by product name, ID, or vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Fashion & Apparel">Fashion & Apparel</SelectItem>
                  <SelectItem value="Health & Beauty">Health & Beauty</SelectItem>
                  <SelectItem value="Food & Beverages">Food & Beverages</SelectItem>
                  <SelectItem value="Sports & Outdoors">Sports & Outdoors</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products List */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredProducts.length === 0 ? (
              <Card className="p-12">
                <div className="text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No products found</p>
                  <p className="text-sm mt-1">Try adjusting your search or filters</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  const hasIssues = product.vendorClaimedCategory !== product.systemDetectedCategory ||
                                   product.price > product.categoryPriceLimit;
                  
                  return (
                    <Card 
                      key={product.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedProduct(product);
                        setCurrentImageIndex(0);
                      }}
                    >
                      <CardContent className="p-0">
                        {/* Product Image */}
                        <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden relative">
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                          {hasIssues && (
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-orange-500">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Issues Found
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              {product.id}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(product.submittedDate).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">
                            {product.title}
                          </h3>

                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xl font-bold text-orange-500">
                              ₱{product.price.toLocaleString()}
                            </span>
                            <Badge 
                              variant="outline"
                              className={hasIssues ? 'border-orange-500 text-orange-600' : 'border-green-500 text-green-600'}
                            >
                              {product.vendorClaimedCategory}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between text-sm border-t pt-3">
                            <div className="flex items-center gap-1 text-gray-600">
                              <span className="text-yellow-500">★</span>
                              <span className="font-medium">{product.vendor.rating}</span>
                            </div>
                            <span className="text-gray-500">{product.vendor.name}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Detail view (existing code)
  const hasKeywordMismatch = currentProduct.vendorClaimedCategory !== currentProduct.systemDetectedCategory;
  const hasPriceIssue = currentProduct.price > currentProduct.categoryPriceLimit;
  const totalFee = currentProduct.baseFee + currentProduct.riskModifier;

  const handleNextProduct = () => {
    const currentIndex = allProducts.findIndex(p => p.id === currentProduct.id);
    const nextIndex = (currentIndex + 1) % allProducts.length;
    setSelectedProduct(allProducts[nextIndex]);
    setCurrentImageIndex(0);
  };

  const handlePreviousProduct = () => {
    const currentIndex = allProducts.findIndex(p => p.id === currentProduct.id);
    const prevIndex = (currentIndex - 1 + allProducts.length) % allProducts.length;
    setSelectedProduct(allProducts[prevIndex]);
    setCurrentImageIndex(0);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % currentProduct.images.length);
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + currentProduct.images.length) % currentProduct.images.length);
  };

  const handleApprove = () => {
    alert(`Product ${currentProduct.id} approved!`);
    setSelectedProduct(null);
  };

  const handleReject = (reason: string) => {
    alert(`Product ${currentProduct.id} rejected. Reason: ${reason}`);
    setShowRejectDropdown(false);
    setSelectedProduct(null);
  };

  const handleReclassify = (newCategory: string) => {
    alert(`Product ${currentProduct.id} reclassified to ${newCategory} and approved!`);
    setShowReclassifyDropdown(false);
    setSelectedProduct(null);
  };

  const rejectReasons = [
    'Wrong Category',
    'Prohibited Item',
    'Incomplete Information',
    'Poor Quality Images',
    'Misleading Description',
    'Copyright Violation'
  ];

  const availableCategories = [
    'Skincare/Beauty',
    'Electronics',
    'Fashion & Apparel',
    'Home & Garden',
    'Health & Beauty',
    'Sports & Outdoors',
    'Food & Beverages'
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar open={open} setOpen={setOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProduct(null)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Product Review</h1>
                <p className="text-gray-600 mt-1">Review and approve vendor listing</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                Product ID: {currentProduct.id}
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousProduct}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextProduct}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Split Screen */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Column - Product Preview */}
          <div className="w-1/2 overflow-y-auto border-r border-gray-200 bg-white">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Listing Preview</h2>
                <p className="text-sm text-gray-500">What customers will see</p>
              </div>

              {/* Image Carousel */}
              <div className="relative mb-6 group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={currentProduct.images[currentImageIndex]}
                    alt={currentProduct.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {currentProduct.images.length > 1 && (
                  <>
                    <button
                      onClick={handlePreviousImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {currentProduct.images.map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            idx === currentImageIndex ? 'bg-orange-500' : 'bg-white/60'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Title & Price */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{currentProduct.title}</h3>
                <div className="text-3xl font-bold text-orange-500">₱{currentProduct.price.toLocaleString()}</div>
              </div>

              {/* Vendor Info */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{currentProduct.vendor.name}</p>
                      <p className="text-sm text-gray-500">{currentProduct.vendor.totalProducts} products</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="font-medium">{currentProduct.vendor.rating}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                <div className="text-gray-700 text-sm leading-relaxed max-h-40 overflow-y-auto">
                  {currentProduct.description}
                </div>
              </div>

              {/* Vendor Attributes */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Product Attributes</h4>
                <div className="grid grid-cols-2 gap-3">
                  {currentProduct.vendorAttributes.map((attr, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">{attr.label}</p>
                      <p className="font-medium text-gray-900">{attr.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Inspector */}
          <div className="w-1/2 overflow-y-auto bg-gray-50">
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Inspector Panel</h2>
                <p className="text-sm text-gray-500">System analysis & validation</p>
              </div>

              {/* Section A: Category Validation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tag className="w-5 h-5 text-orange-500" />
                    Category Validation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Vendor Claimed Category</p>
                    <Badge variant="outline" className="text-sm">
                      {currentProduct.vendorClaimedCategory}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-2">System Detected Category</p>
                    <Badge 
                      className={`text-sm ${
                        hasKeywordMismatch 
                          ? 'bg-orange-500 text-white hover:bg-orange-600' 
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {currentProduct.systemDetectedCategory}
                    </Badge>
                  </div>

                  {hasKeywordMismatch && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-orange-900">⚠️ Keyword Mismatch Detected</p>
                          <p className="text-sm text-orange-700 mt-1">
                            Found keywords: {currentProduct.detectedKeywords.join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!hasKeywordMismatch && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-900">✓ Category Match</p>
                          <p className="text-sm text-green-700 mt-1">
                            Vendor category matches system detection
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section B: Fee Simulation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="w-5 h-5 text-orange-500" />
                    Fee Simulation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Base Platform Fee</span>
                      <span className="font-medium">{currentProduct.baseFee}%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Risk Modifier</span>
                      <span className={`font-medium ${currentProduct.riskModifier > 0 ? 'text-orange-500' : 'text-gray-900'}`}>
                        +{currentProduct.riskModifier}%
                      </span>
                    </div>
                    {currentProduct.riskModifier > 0 && (
                      <p className="text-xs text-gray-500">
                        (Liquid/Fragile/High-value item modifier)
                      </p>
                    )}
                    <div className="flex justify-between items-center py-3 bg-orange-50 -mx-6 px-6 rounded-lg mt-3">
                      <span className="font-semibold text-gray-900">Total Platform Fee</span>
                      <span className="font-bold text-xl text-orange-500">{totalFee}%</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      Estimated fee on ₱{currentProduct.price.toLocaleString()}: 
                      <span className="font-semibold text-gray-900 ml-1">
                        ₱{((currentProduct.price * totalFee) / 100).toLocaleString()}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Section C: Price Logic Check */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    Price Validation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasPriceIssue ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-900">⚠️ Price Exceeds Category Limit</p>
                          <p className="text-sm text-red-700 mt-1">
                            Product price (₱{currentProduct.price.toLocaleString()}) exceeds the typical limit 
                            for '{currentProduct.vendorClaimedCategory}' category (₱{currentProduct.categoryPriceLimit.toLocaleString()})
                          </p>
                          <p className="text-xs text-red-600 mt-2">
                            This may indicate incorrect category selection or luxury variant.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-900">✓ Price Within Range</p>
                          <p className="text-sm text-green-700 mt-1">
                            Product price is within acceptable range for this category
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Summary */}
              <Card className="border-2 border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="text-base">Quick Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Issues Found:</span>
                      <span className="font-semibold text-gray-900">
                        {(hasKeywordMismatch ? 1 : 0) + (hasPriceIssue ? 1 : 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Recommended Action:</span>
                      <span className="font-semibold text-orange-600">
                        {hasKeywordMismatch ? 'Reclassify' : hasPriceIssue ? 'Review' : 'Approve'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Action Footer - Fixed */}
        <div className="bg-white border-t border-gray-200 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Product ID: <span className="font-mono font-semibold">{currentProduct.id}</span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Reject Button */}
              <div className="relative">
                <Button
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50"
                  onClick={() => setShowRejectDropdown(!showRejectDropdown)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                
                {showRejectDropdown && (
                  <div className="absolute bottom-full mb-2 right-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <p className="text-xs text-gray-500 px-3 py-2">Select rejection reason:</p>
                      {rejectReasons.map((reason) => (
                        <button
                          key={reason}
                          onClick={() => handleReject(reason)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors"
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reclassify & Approve Button */}
              <div className="relative">
                <Button
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={() => setShowReclassifyDropdown(!showReclassifyDropdown)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reclassify & Approve
                </Button>
                
                {showReclassifyDropdown && (
                  <div className="absolute bottom-full mb-2 right-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <p className="text-xs text-gray-500 px-3 py-2">Select correct category:</p>
                      {availableCategories.map((category) => (
                        <button
                          key={category}
                          onClick={() => handleReclassify(category)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors"
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Approve Button */}
              <Button
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={handleApprove}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Listing
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProductApprovals;
