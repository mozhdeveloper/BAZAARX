import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, X, Check, Camera, ShoppingCart, ArrowLeft, Plus, Star, CheckCircle2 } from 'lucide-react-native';
import CameraSearchModal from '../src/components/CameraSearchModal';
import { ProductCard } from '../src/components/ProductCard';
import { trendingProducts, bestSellerProducts, newArrivals } from '../src/data/products';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import type { Product } from '../src/types';
import { useCartStore } from '../src/stores/cartStore';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Shop'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { width } = Dimensions.get('window');
const PADDING = 20;
const GAP = 12;
const CARD_WIDTH = (width / 2) - PADDING - (GAP / 2);

const allProducts = [...trendingProducts, ...bestSellerProducts, ...newArrivals];

// Official Stores Data
const officialStores = [
  {
    id: '1',
    name: 'Nike Official',
    logo: '🏃',
    rating: 4.9,
    verified: true,
    products: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200',
      'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=200',
    ],
  },
  {
    id: '2',
    name: 'Adidas Store',
    logo: '👟',
    rating: 4.8,
    verified: true,
    products: [
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=200',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=200',
      'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=200',
    ],
  },
  {
    id: '3',
    name: 'Samsung Electronics',
    logo: '📱',
    rating: 4.9,
    verified: true,
    products: [
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200',
      'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=200',
    ],
  },
  {
    id: '4',
    name: 'Apple Store',
    logo: '🍎',
    rating: 5.0,
    verified: true,
    products: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200',
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=200',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=200',
    ],
  },
];

const categories = [
  { id: 'all', name: 'All' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'home-garden', name: 'Home & Garden' },
  { id: 'food-beverages', name: 'Food & Beverages' },
  { id: 'books', name: 'Books' },
  { id: 'beauty-personal-care', name: 'Beauty' },
  { id: 'music-instruments', name: 'Music' },
];

const sortOptions = [
  { value: 'relevance', label: 'Best Match' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Customer Rating' },
  { value: 'bestseller', label: 'Best Sellers' },
];

const priceRanges = [
  { value: 'all', label: 'All Prices', min: 0, max: Infinity },
  { value: '0-500', label: '₱0 - ₱500', min: 0, max: 500 },
  { value: '500-1000', label: '₱500 - ₱1,000', min: 500, max: 1000 },
  { value: '1000-2500', label: '₱1,000 - ₱2,500', min: 1000, max: 2500 },
  { value: '2500-5000', label: '₱2,500 - ₱5,000', min: 2500, max: 5000 },
  { value: '5000+', label: '₱5,000+', min: 5000, max: Infinity },
];

export default function ShopScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const cartItems = useCartStore((state) => state.items);
  
  const { searchQuery: initialSearchQuery, customResults } = route.params || {};

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('relevance');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showCameraSearch, setShowCameraSearch] = useState(false);

  useEffect(() => {
    if (route.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
    }
  }, [route.params?.searchQuery]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    // If custom results are provided via navigation (e.g. from Camera), use them
    if (customResults && customResults.length > 0) {
      return customResults;
    }

    let filtered = allProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.seller.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || 
                             product.category.toLowerCase().replace(/\s+/g, '-') === selectedCategory;
      
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
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'bestseller':
        filtered.sort((a, b) => b.sold - a.sold);
        break;
      default:
        break;
    }

    return filtered;
  }, [searchQuery, selectedCategory, selectedSort, selectedPriceRange, customResults]);

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const activeFiltersCount = () => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedSort !== 'relevance') count++;
    if (selectedPriceRange !== 'all') count++;
    return count;
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedSort('relevance');
    setSelectedPriceRange('all');
  };

  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Orange Header with Search & Scan */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          {/* White Pill Search Bar */}
          <View style={styles.searchBar}>
            <Search size={20} color="#9CA3AF" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products, brands..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            <Pressable
              style={styles.scanButton}
              onPress={() => setShowCameraSearch(true)}
            >
              <Camera size={20} color="#1F2937" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Cart & Filter Icons */}
          <View style={styles.headerIcons}>
            <Pressable
              style={styles.iconButton}
              onPress={() => navigation.navigate('Cart')}
            >
              <ShoppingCart size={22} color="#FFFFFF" strokeWidth={2} />
              {cartItems.length > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              style={styles.iconButton}
              onPress={() => setShowFiltersModal(true)}
            >
              <SlidersHorizontal size={22} color="#FFFFFF" strokeWidth={2} />
              {activeFiltersCount() > 0 && (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>{activeFiltersCount()}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Official Stores Section */}
        <View style={styles.officialStoresSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Verified Official Stores</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storesScroll}
          >
            {officialStores.map((store) => (
              <View key={store.id} style={styles.storeCard}>
                {/* Store Header */}
                <View style={styles.storeHeader}>
                  <View style={styles.storeLeft}>
                    <View style={styles.storeLogo}>
                      <Text style={styles.storeLogoText}>{store.logo}</Text>
                    </View>
                    <View style={styles.storeInfo}>
                      <View style={styles.storeNameRow}>
                        <Text style={styles.storeName}>{store.name}</Text>
                        {store.verified && (
                          <CheckCircle2 size={14} color="#FF5722" strokeWidth={2.5} />
                        )}
                      </View>
                      <View style={styles.storeRatingRow}>
                        <Star size={12} color="#FF5722" fill="#FF5722" strokeWidth={2} />
                        <Text style={styles.storeRating}>{store.rating}/5.0</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable>
                    <Text style={styles.visitLink}>Visit</Text>
                  </Pressable>
                </View>

                {/* Product Previews */}
                <View style={styles.storeProducts}>
                  {store.products.map((productUrl, index) => (
                    <View key={index} style={styles.storeProductThumb}>
                      <Image
                        source={{ uri: productUrl }}
                        style={styles.storeProductImage}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category.id && styles.categoryChipTextActive,
                ]}
              >
                {category.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Products Grid - 2 Column Bento Layout */}
        <FlatList
          data={filteredProducts}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.productsGrid}
          columnWrapperStyle={styles.columnWrapper}
          scrollEnabled={false}
          renderItem={({ item: product }) => (
            <Pressable
              style={styles.productCard}
              onPress={() => handleProductPress(product)}
            >
              {/* Product Image */}
              <View style={styles.productImageContainer}>
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                {/* Free Shipping Badge (Top Right) */}
                {product.isFreeShipping && (
                  <View style={styles.freeShippingBadge}>
                    <Text style={styles.freeShippingText}>Free Ship</Text>
                  </View>
                )}
              </View>

              {/* Product Details */}
              <View style={styles.productDetails}>
                <Text style={styles.productTitle} numberOfLines={2}>
                  {product.name}
                </Text>
                <View style={styles.productPriceRow}>
                  <View style={styles.productPriceContainer}>
                    <Text style={styles.productPrice}>₱{product.price.toLocaleString()}</Text>
                    <Text style={styles.soldText}>{product.sold} sold</Text>
                  </View>
                  {/* Add Button in Bottom Right */}
                  <Pressable style={styles.addButton}>
                    <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          }
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Camera Search Modal */}
      <CameraSearchModal
        visible={showCameraSearch}
        onClose={() => setShowCameraSearch(false)}
      />

      {/* Filters Modal */}
      <Modal
        visible={showFiltersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters & Sort</Text>
              <Pressable onPress={() => setShowFiltersModal(false)}>
                <X size={24} color="#1F2937" strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Sort Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                {sortOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    style={styles.filterOption}
                    onPress={() => setSelectedSort(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedSort === option.value && styles.filterOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selectedSort === option.value && (
                      <Check size={20} color="#FF5722" strokeWidth={2.5} />
                    )}
                  </Pressable>
                ))}
              </View>

              {/* Price Range Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Price Range</Text>
                {priceRanges.map((range) => (
                  <Pressable
                    key={range.value}
                    style={styles.filterOption}
                    onPress={() => setSelectedPriceRange(range.value)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedPriceRange === range.value && styles.filterOptionTextActive,
                      ]}
                    >
                      {range.label}
                    </Text>
                    {selectedPriceRange === range.value && (
                      <Check size={20} color="#FF5722" strokeWidth={2.5} />
                    )}
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.clearButton}
                onPress={() => {
                  clearFilters();
                  setShowFiltersModal(false);
                }}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </Pressable>
              <Pressable
                style={styles.applyButton}
                onPress={() => setShowFiltersModal(false)}
              >
                <Text style={styles.applyButtonText}>
                  Apply ({filteredProducts.length})
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  // Edge-to-Edge Orange Header
  header: {
    backgroundColor: '#FF5722',
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 12,
  },
  // White Pill Search Bar
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  scanButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Header Icons (Cart & Filter)
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF5722',
  },
  filterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF5722',
  },
  scrollView: {
    flex: 1,
  },
  // Official Stores Section
  officialStoresSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  storesScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  storeCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  storeLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  storeLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeLogoText: {
    fontSize: 24,
  },
  storeInfo: {
    flex: 1,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  storeRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeRating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  visitLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF5722',
  },
  storeProducts: {
    flexDirection: 'row',
    gap: 8,
  },
  storeProductThumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F7',
  },
  storeProductImage: {
    width: '100%',
    height: '100%',
  },
  // Category Chips
  categoryScroll: {
    marginTop: 16,
    marginBottom: 16,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  // Products Grid - 2 Column Bento Layout
  productsGrid: {
    paddingHorizontal: PADDING,
    paddingTop: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: GAP,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F5F5F7',
    position: 'relative',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  freeShippingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 87, 34, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  freeShippingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productDetails: {
    padding: 12,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 17,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  productPriceContainer: {
    flex: 1,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FF5722',
    marginBottom: 2,
  },
  soldText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF5722',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Filters Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalScroll: {
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterOptionText: {
    fontSize: 15,
    color: '#6B7280',
  },
  filterOptionTextActive: {
    color: '#FF5722',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FF5722',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
