import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Grid, List, ChevronDown, Star, MapPin, Truck, Shield } from 'lucide-react';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Button } from '../components/ui/button';
import { trendingProducts } from '../data/products';
import { categories } from '../data/categories';
import { useCartStore } from '../stores/cartStore';

const categoryOptions = ['All Categories', ...categories.map(cat => cat.name)];

const sortOptions = [
  { value: 'relevance', label: 'Best Match' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Customer Rating' },
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'bestseller', label: 'Best Sellers' }
];

const priceRanges = [
  { value: 'all', label: 'All Prices', min: 0, max: Infinity },
  { value: '0-500', label: '₱0 - ₱500', min: 0, max: 500 },
  { value: '500-1000', label: '₱500 - ₱1,000', min: 500, max: 1000 },
  { value: '1000-2500', label: '₱1,000 - ₱2,500', min: 1000, max: 2500 },
  { value: '2500-5000', label: '₱2,500 - ₱5,000', min: 2500, max: 5000 },
  { value: '5000+', label: '₱5,000+', min: 5000, max: Infinity }
];

export default function ShopPage() {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSort, setSelectedSort] = useState('relevance');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Generate more products by repeating the trending products with variations
  const allProducts = useMemo(() => {
    const products = [];
    for (let i = 0; i < 5; i++) {
      products.push(...trendingProducts.map((product) => ({
        ...product,
        id: `${product.id}-${i}`,
        name: `${product.name} ${i > 0 ? `(Variant ${i + 1})` : ''}`,
        price: Math.round(product.price * (0.8 + Math.random() * 0.4)),
        sold: Math.round(product.sold * (0.5 + Math.random() * 1.5))
      })));
    }
    return products;
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = allProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.seller.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
      
      const priceRange = priceRanges.find(range => range.value === selectedPriceRange);
      const matchesPrice = priceRange ? 
        product.price >= priceRange.min && product.price <= priceRange.max : true;

      return matchesSearch && matchesCategory && matchesPrice;
    });

    // Apply sorting
    switch (selectedSort) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'bestseller':
        filtered.sort((a, b) => (b.sold || 0) - (a.sold || 0));
        break;
      default:
        // Keep original order for relevance and newest
        break;
    }

    return filtered;
  }, [allProducts, searchQuery, selectedCategory, selectedSort, selectedPriceRange]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Shop Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shop All Products</h1>
              <p className="text-gray-600 mt-1">Discover amazing products from trusted Filipino sellers</p>
            </div>
            
            {/* Search Bar */}
            <div className="relative max-w-md w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products, brands, or sellers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
              
              {/* Categories */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Categories</h4>
                <div className="space-y-2">
                  {categoryOptions.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        selectedCategory === category
                          ? 'bg-[var(--brand-primary)] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Price Range</h4>
                <div className="space-y-2">
                  {priceRanges.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setSelectedPriceRange(range.value)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        selectedPriceRange === range.value
                          ? 'bg-[var(--brand-primary)] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 mb-6 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>
                  
                  <p className="text-gray-600 text-sm">
                    Showing {filteredProducts.length} results
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedSort}
                      onChange={(e) => setSelectedSort(e.target.value)}
                      className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-400'
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-400'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Products Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-4'
              }
            >
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden group cursor-pointer ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className={viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}>
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {product.originalPrice && (
                        <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-medium">
                          {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                        </div>
                      )}
                      {product.isFreeShipping && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-lg">
                          <Truck className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors duration-200 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">
                          {product.rating} ({product.sold.toLocaleString()})
                        </span>
                      </div>
                      {product.isVerified && (
                        <Shield className="w-4 h-4 text-blue-500" />
                      )}
                    </div>

                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[var(--brand-primary)]">
                          ₱{product.price.toLocaleString()}
                        </span>
                        {product.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">
                            ₱{product.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <MapPin className="w-3 h-3 mr-1" />
                      {product.location}
                    </div>

                    <div className="mt-2">
                      <p className="text-xs text-gray-500">{product.seller}</p>
                    </div>

                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className="w-full mt-4 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl"
                    >
                      Add to Cart
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Load More Button */}
            {filteredProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 text-center"
              >
                <Button
                  variant="outline"
                  className="px-8 py-3 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white rounded-xl"
                >
                  Load More Products
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <BazaarFooter />
    </div>
  );
}