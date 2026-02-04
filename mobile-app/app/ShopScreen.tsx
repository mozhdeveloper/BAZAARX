import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, X, Check, Camera, ShoppingCart, Star, CheckCircle2 } from 'lucide-react-native';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import CameraSearchModal from '../src/components/CameraSearchModal';
import { ProductCard } from '../src/components/ProductCard';
// Use the service you provided
import { productService } from '../src/services/productService';
import { supabase } from '../src/lib/supabase';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import type { Product } from '../src/types';
import { useCartStore } from '../src/stores/cartStore';
import { COLORS } from '../src/constants/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Shop'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { width } = Dimensions.get('window');

const categories = [
  { id: 'all', name: 'All' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'home-garden', name: 'Home & Garden' },
  { id: 'beauty', name: 'Beauty' },
  { id: 'sports', name: 'Sports' },
];

const sortOptions = [
  { value: 'relevance', label: 'Best Match' },
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

export default function ShopScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const cartItems = useCartStore((state) => state.items);
  const BRAND_COLOR = COLORS.primary;

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);

  const { searchQuery: initialSearchQuery, customResults, category: initialCategory } = route.params || {};
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  const [selectedSort, setSelectedSort] = useState('relevance');

  const [minPrice, setMinPrice] = useState('0');
  const [maxPrice, setMaxPrice] = useState('100000');
  const [multiSliderValue, setMultiSliderValue] = useState([0, 100000]);
  const [minInput, setMinInput] = useState('0');
  const [maxInput, setMaxInput] = useState('100000');

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showCameraSearch, setShowCameraSearch] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetching through your new ProductService
        const productsData = await productService.getProducts({
          isActive: true,
          approvalStatus: 'approved'
        });

        // Fetch sellers directly for the store section
        const { data: sellersData } = await supabase
          .from('sellers')
          .select('*')
          .order('rating', { ascending: false });

        if (productsData) {
          const mapped: Product[] = productsData.map((row: any) => ({
            id: row.id,
            name: row.name ?? 'Unknown Product',
            price: typeof row.price === 'number' ? row.price : parseFloat(row.price || '0'),
            originalPrice: row.original_price,
            image: row.primary_image || (Array.isArray(row.images) ? row.images[0] : null) || 'https://via.placeholder.com/300',
            rating: row.rating ?? 4.5,
            sold: row.sales_count ?? 0,
            seller: row.seller?.store_name || row.seller?.business_name || 'Verified Seller',
            seller_id: row.seller_id,
            sellerVerified: !!row.seller?.is_verified,
            category: row.category ?? '',
            created_at: row.created_at,
            colors: Array.isArray(row.colors) ? row.colors : [],
            sizes: Array.isArray(row.sizes) ? row.sizes : [],
          }));
          // Deduplicate by ID to prevent key errors
          const uniqueMapped = Array.from(new Map(mapped.map(item => [item.id, item])).values());
          setDbProducts(uniqueMapped);
        }

        if (sellersData) setSellers(sellersData);
      } catch (err) {
        console.error('[ShopScreen] Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSliderChange = (values: number[]) => {
    setMultiSliderValue(values);
    setMinInput(values[0].toString());
    setMaxInput(values[1].toString());
  };

  const filteredProducts = useMemo(() => {
    if (customResults && customResults.length > 0) return customResults;

    // 1. Filter first
    let filtered = dbProducts.filter(p => {
      // Safely handle potential undefined values
      const pName = p.name || '';
      const pCategory = p.category || '';
      const pPrice = p.price ?? 0; // Default to 0 if undefined

      const nameMatch = pName.toLowerCase().includes(searchQuery.toLowerCase());
      const categoryMatch = selectedCategory === 'all' || pCategory.toLowerCase().replace(/\s+/g, '-') === selectedCategory;
      const priceMatch = pPrice >= parseFloat(minPrice) && pPrice <= parseFloat(maxPrice);

      return nameMatch && categoryMatch && priceMatch;
    });

    // 2. Sort safely using (price ?? 0)
    if (selectedSort === 'price-low') {
      filtered.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (selectedSort === 'price-high') {
      filtered.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else if (selectedSort === 'popularity') {
      filtered.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
    } else if (selectedSort === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    return filtered;
  }, [dbProducts, searchQuery, selectedCategory, selectedSort, customResults, minPrice, maxPrice]);

  const verifiedStores = useMemo(() => {
    return (sellers || [])
      .map(s => ({
        id: s.id,
        name: s.store_name || s.business_name || 'Store',
        verified: !!s.is_verified,
        rating: s.rating || 4.8,
        products: dbProducts.filter(p => p.seller_id === s.id).slice(0, 2).map(p => p.image),
      }))
      .filter(s => s.products.length > 0);
  }, [sellers, dbProducts]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
        <View style={styles.headerTop}>
          <View style={styles.searchBarWrapper}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            <Pressable onPress={() => setShowCameraSearch(true)}>
              <Camera size={18} color={BRAND_COLOR} />
            </Pressable>
          </View>

          <View style={styles.headerRight}>
            <Pressable style={styles.headerIconButton} onPress={() => navigation.navigate('Cart')}>
              <ShoppingCart size={24} color="#FFFFFF" />
              {cartItems.length > 0 && (
                <View style={[styles.badge, { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.badgeText, { color: BRAND_COLOR }]}>{cartItems.length}</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={styles.headerIconButton} onPress={() => setShowFiltersModal(true)}>
              <SlidersHorizontal size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[styles.chip, selectedCategory === cat.id && { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR }]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.chipText, selectedCategory === cat.id && { color: '#FFF' }]}>{cat.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={BRAND_COLOR} style={{ marginTop: 50 }} />
        ) : (
          <>
            {verifiedStores.length > 0 && searchQuery.trim() === '' && (
              <View style={styles.storesSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Featured Stores</Text>
                  <Pressable onPress={() => navigation.navigate('AllStores', { title: 'Verified Shops' })}>
                    <Text style={{ color: BRAND_COLOR, fontWeight: '700' }}>See All</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
                  {verifiedStores.map((store) => (
                    <Pressable key={store.id} style={styles.storeCard} onPress={() => navigation.navigate('StoreDetail', { store })}>
                      <View style={styles.storeHeader}>
                        <View style={styles.storeLogo}><Text style={{ fontSize: 20 }}>🏬</Text></View>
                        <View style={styles.storeInfo}>
                          <View style={styles.storeNameRow}>
                            <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                            {store.verified && <CheckCircle2 size={14} color={BRAND_COLOR} fill="#FFF" />}
                          </View>
                          <View style={styles.ratingRow}>
                            <Star size={10} color={BRAND_COLOR} fill={BRAND_COLOR} />
                            <Text style={styles.ratingText}>{store.rating}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.storeProducts}>
                        {store.products.map((url, i) => (
                          <Image key={i} source={{ uri: url }} style={styles.storeProductThumb} />
                        ))}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.productsSection}>
              <Text style={styles.sectionTitle}>
                {searchQuery ? `Results for "${searchQuery}"` : 'All Products'}
              </Text>
              <View style={styles.productsGrid}>
                {filteredProducts.map((product) => (
                  <View key={product.id} style={styles.cardWrapper}>
                    <ProductCard product={product} onPress={() => navigation.navigate('ProductDetail', { product })} />
                  </View>
                ))}
                {!isLoading && filteredProducts.length === 0 && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>No products found</Text>
                    <Text style={styles.emptyText}>Try adjusting your filters or search terms.</Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <CameraSearchModal visible={showCameraSearch} onClose={() => setShowCameraSearch(false)} />

      <Modal visible={showFiltersModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <Pressable onPress={() => setShowFiltersModal(false)}><X size={24} color="#1F2937" /></Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.priceInputsRow}>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceInputLabel}>Min (₱)</Text>
                  <TextInput
                    style={styles.priceTextInput}
                    value={minInput}
                    onChangeText={setMinInput}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceInputLabel}>Max (₱)</Text>
                  <TextInput
                    style={styles.priceTextInput}
                    value={maxInput}
                    onChangeText={setMaxInput}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.sliderContainer}>
                <MultiSlider
                  values={[multiSliderValue[0], multiSliderValue[1]]}
                  sliderLength={width - 80}
                  onValuesChange={handleSliderChange}
                  min={0}
                  max={100000}
                  step={500}
                  selectedStyle={{ backgroundColor: BRAND_COLOR }}
                  markerStyle={{ backgroundColor: '#FFF', borderColor: BRAND_COLOR, borderWidth: 2 }}
                />
              </View>

              <Text style={[styles.filterSectionTitle, { marginTop: 20 }]}>Sort By</Text>
              {sortOptions.map((opt) => (
                <Pressable key={opt.value} style={styles.filterOption} onPress={() => setSelectedSort(opt.value)}>
                  <Text style={[styles.filterText, selectedSort === opt.value && { color: BRAND_COLOR }]}>{opt.label}</Text>
                  {selectedSort === opt.value && <Check size={20} color={BRAND_COLOR} />}
                </Pressable>
              ))}

              <Pressable
                style={[styles.applyButton, { backgroundColor: BRAND_COLOR }]}
                onPress={() => {
                  setMinPrice(minInput);
                  setMaxPrice(maxInput);
                  setShowFiltersModal(false);
                }}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerContainer: { paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingBottom: 15 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  searchBarWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 100, paddingHorizontal: 16, height: 45, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  headerRight: { flexDirection: 'row', gap: 10 },
  headerIconButton: { padding: 4, position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 9, fontWeight: '900' },
  scrollView: { flex: 1 },
  categoryScroll: { paddingHorizontal: 20, paddingVertical: 15, gap: 10 },
  chip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 25, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  storesSection: { marginTop: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  storesScroll: { paddingHorizontal: 20, paddingVertical: 15, gap: 15 },
  storeCard: { width: 260, backgroundColor: '#FFF', borderRadius: 16, padding: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  storeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  storeLogo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  storeInfo: { flex: 1 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeName: { fontSize: 14, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  storeProducts: { flexDirection: 'row', gap: 8 },
  storeProductThumb: { flex: 1, height: 60, borderRadius: 8, backgroundColor: '#F3F4F6' },
  productsSection: { paddingHorizontal: 20, marginTop: 25 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 15 },
  cardWrapper: { width: '48%', marginBottom: 15 },
  emptyBox: { width: '100%', alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  emptyText: { fontSize: 13, color: '#6B7280', marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalBody: { padding: 24 },
  filterSectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 15 },
  priceInputsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  priceInputContainer: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  priceInputLabel: { fontSize: 10, color: '#6B7280' },
  priceTextInput: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  sliderContainer: { alignItems: 'center', marginVertical: 10 },
  filterOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  filterText: { fontSize: 15, fontWeight: '600' },
  applyButton: { marginTop: 25, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  applyButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});