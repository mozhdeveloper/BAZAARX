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
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, X, Check, Camera, ShoppingCart, Star, CheckCircle2, Sliders } from 'lucide-react-native';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import CameraSearchModal from '../src/components/CameraSearchModal';
import { ProductCard } from '../src/components/ProductCard';
import { supabase } from '../src/lib/supabase';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import type { Product } from '../src/types';
import { useCartStore } from '../src/stores/cartStore';
import { COLORS } from '../src/constants/theme';
import { officialStores } from '../src/data/stores';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Shop'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { width } = Dimensions.get('window');
const PADDING = 20;
const GAP = 15;
const ITEM_WIDTH = (width - (PADDING * 2) - GAP) / 2;

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
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
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

  // Triggered when slider moves
  const handleSliderChange = (values: number[]) => {
    setMultiSliderValue(values);
    setMinInput(values[0].toString());
    setMaxInput(values[1].toString());
  };

  // Triggered when min input changes
  const handleMinInputChange = (text: string) => {
    setMinInput(text);
    const val = parseInt(text.replace(/[^0-9]/g, '')) || 0;
    if (val <= multiSliderValue[1]) {
      setMultiSliderValue([val, multiSliderValue[1]]);
    }
  };

  // Triggered when max input changes
  const handleMaxInputChange = (text: string) => {
    setMaxInput(text);
    const val = parseInt(text.replace(/[^0-9]/g, '')) || 0;
    if (val >= multiSliderValue[0]) {
      setMultiSliderValue([multiSliderValue[0], Math.min(val, 100000)]);
    }
  };
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showCameraSearch, setShowCameraSearch] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        console.log('[Shop] Fetching products from Supabase');
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            seller:sellers!products_seller_id_fkey (
              business_name,
              store_name,
              rating,
              business_address,
              id,
              is_verified
            )
          `)
          .eq('is_active', true)
          .eq('approval_status', 'approved')
          .order('created_at', { ascending: false });

        // BUYER VIEW: Only show approved products that passed QA
        const rows = data || [];

        if (error) {
          console.log('[Shop] Product fetch error:', error.message);
          setFetchError(error.message);
          setDbProducts([]);
        } else {
          // Only approved products are visible to buyers
          // Products must pass QA flow (ACTIVE_VERIFIED) to be approved
          console.log('[Shop] Products fetched:', rows.length);
          const mapped: Product[] = (rows || []).map((row: any) => {
            const imageUrl =
              row.primary_image ||
              (Array.isArray(row.images) && row.images.length > 0 ? row.images[0] : 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=300&h=300&fit=crop');
            const priceNum = typeof row.price === 'number' ? row.price : parseFloat(row.price || '0');
            const originalNum = row.original_price != null
              ? (typeof row.original_price === 'number' ? row.original_price : parseFloat(row.original_price))
              : undefined;
            const ratingNum = typeof row.rating === 'number' ? row.rating : parseFloat(row.rating || '4.5') || 4.5;
            const sellerName = row.seller?.store_name || row.seller?.business_name || 'Verified Seller';
            const sellerRating = typeof row.seller?.rating === 'number'
              ? row.seller.rating
              : parseFloat(row.seller?.rating || '4.8') || 4.8;
            const sellerVerified = !!row.seller?.is_verified;
            const location = row.seller?.business_address || 'Philippines';

            return {
              id: row.id,
              name: row.name,
              price: priceNum,
              originalPrice: originalNum,
              image: imageUrl,
              images: Array.isArray(row.images) ? row.images : undefined,
              rating: ratingNum,
              sold: row.sales_count || 0,
              seller: sellerName,
              seller_id: row.seller?.id || undefined,
              sellerRating,
              sellerVerified,
              isFreeShipping: !!row.is_free_shipping,
              isVerified: true,
              location,
              description: row.description || '',
              category: row.category || '',
              stock: row.stock,
            } as Product;
          });
          // Deduplicate by ID just in case
          const uniqueMapped = Array.from(new Map(mapped.map(item => [item.id, item])).values());
          setDbProducts(uniqueMapped);
          console.log('[Shop] Mapped products:', uniqueMapped.length);
        }
      } catch (e: any) {
        console.log('[Shop] Product fetch exception:', e?.message);
        setFetchError(e?.message || 'Failed to load products');
        setDbProducts([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const loadSellers = async () => {
      try {
        console.log('[Shop] Fetching verified sellers');
        const { data, error } = await supabase
          .from('sellers')
          .select('id, store_name, rating, is_verified, city, province')
          .order('rating', { ascending: false });
        if (error) {
          console.log('[Shop] Seller fetch error:', error.message);
          setSellers([]);
          return;
        }
        console.log('[Shop] Sellers fetched:', (data || []).length);
        setSellers(data || []);
      } catch (e: any) {
        console.log('[Shop] Seller fetch exception:', e?.message);
        setSellers([]);
      }
    };
    loadSellers();
  }, []);

  useEffect(() => {
    if (route.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
    }
    if (route.params?.category) {
      setSelectedCategory(route.params.category);
    }
  }, [route.params?.searchQuery, route.params?.category]);

  const filteredProducts = useMemo(() => {
    if (customResults && customResults.length > 0) return customResults;
    let filtered = dbProducts.filter(product => {
      const name = product.name || '';
      const category = product.category || '';
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || category.toLowerCase().replace(/\s+/g, '-') === selectedCategory;
      
      const price = product.price || 0;
      const min = minPrice ? parseFloat(minPrice) : 0;
      const max = maxPrice ? parseFloat(maxPrice) : Infinity;
      const matchesPrice = price >= min && price <= max;

      return matchesSearch && matchesCategory && matchesPrice;
    });

    if (selectedSort === 'price-low') filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (selectedSort === 'price-high') filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (selectedSort === 'newest') filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    else if (selectedSort === 'popularity') filtered.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    
    return filtered;
  }, [dbProducts, searchQuery, selectedCategory, selectedSort, customResults, minPrice, maxPrice]);

  const verifiedStores = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    // Filter sellers by category if selected
    const filteredSellersByCat = selectedCategory === 'all' 
      ? sellers 
      : sellers.filter(s => dbProducts.some(p => p.seller_id === s.id && (p.category || '').toLowerCase().replace(/\s+/g, '-') === selectedCategory));

    const filteredSellers = query
      ? (filteredSellersByCat || []).filter(s => 
          (s.store_name || '').toLowerCase().includes(query) ||
          (s.business_name || '').toLowerCase().includes(query)
        )
      : (filteredSellersByCat || []);

    const stores = filteredSellers.map((s) => {
      const previews = dbProducts
        .filter(p => p.seller_id === s.id)
        .slice(0, 2)
        .map(p => p.image);
      return {
        id: s.id,
        name: s.store_name,
        verified: !!s.is_verified,
        rating: typeof s.rating === 'number' ? s.rating : parseFloat(s.rating || '4.8') || 4.8,
        location: s.city && s.province ? `${s.city}, ${s.province}` : 'Philippines',
        products: previews,
      };
    });
    return stores;
  }, [sellers, dbProducts, searchQuery, selectedCategory]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
        <View style={styles.headerTop}>
          <View style={styles.searchBarWrapper}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search stores and items..."
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
          {(categories || []).map((cat) => (
            <Pressable
              key={cat.id}
              style={[styles.chip, selectedCategory === cat.id && { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR }]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.chipText, selectedCategory === cat.id && { color: '#FFF' }]}>{cat.name}</Text>
            </Pressable>
          ))}
        </ScrollView>


        {isLoading && (
          <View style={[styles.debugBox, { borderColor: BRAND_COLOR }]}>
            <ActivityIndicator color={BRAND_COLOR} />
            <Text style={styles.debugText}>Loading products…</Text>
          </View>
        )}
        {!isLoading && (
          <View style={[styles.debugBox, { borderColor: fetchError ? '#EF4444' : BRAND_COLOR }]}>
            <Text style={styles.debugText}>Products: {dbProducts.length}</Text>
            <Text style={styles.debugText}>Verified Stores: {verifiedStores.length}</Text>
            {!!fetchError && <Text style={[styles.debugText, { color: '#EF4444' }]}>Error: {fetchError}</Text>}
          </View>
        )}
        {(searchQuery.trim() !== '' || verifiedStores.length > 0) && (
          <View style={styles.storesSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {searchQuery.trim() !== '' ? 'Stores' : 'Verified Official Stores'}
              </Text>
              {searchQuery.trim() === '' && (
                <Pressable onPress={() => navigation.navigate('AllStores')}>
                  <Text style={{ color: BRAND_COLOR, fontWeight: '700' }}>See All</Text>
                </Pressable>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
              {(verifiedStores || []).map((store) => (
                <Pressable
                  key={store.id}
                  style={styles.storeCard}
                  onPress={() => navigation.navigate('StoreDetail', { store })}
                >
                  <View style={styles.storeHeader}>
                    <View style={styles.storeLogo}><Text style={{ fontSize: 22 }}>🏬</Text></View>
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
                    <View style={[styles.visitBtn, { borderColor: BRAND_COLOR }]}>
                      <Text style={[styles.visitBtnText, { color: BRAND_COLOR }]}>Visit</Text>
                    </View>
                  </View>
                  <View style={styles.storeProducts}>
                    {(store.products || []).slice(0, 2).map((url, i) => (
                      <Image key={i} source={{ uri: url }} style={styles.storeProductThumb} />
                    ))}
                  </View>
                </Pressable>
              ))}
              {searchQuery.trim() !== '' && verifiedStores.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No stores found for "{searchQuery}"</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {searchQuery.trim() !== '' && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Products</Text>
          </View>
        )}

        <View style={styles.productsGrid}>
          {(filteredProducts || []).map((product) => (
            <View key={product.id} style={styles.cardWrapper}>
              <ProductCard product={product} onPress={() => navigation.navigate('ProductDetail', { product })} />
            </View>
          ))}
          {!isLoading && filteredProducts.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyText}>Check that products are approved and active.</Text>
              <Text style={styles.emptyText}>Verify Supabase env and RLS policies.</Text>
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <CameraSearchModal visible={showCameraSearch} onClose={() => setShowCameraSearch(false)} />

      <Modal visible={showFiltersModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Products</Text>
              <Pressable onPress={() => setShowFiltersModal(false)}><X size={24} color="#1F2937" /></Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.filterSectionTitle, { marginBottom: 15 }]}>Price Range</Text>
              
              <View style={styles.priceInputsRow}>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceInputLabel}>Min (₱)</Text>
                  <TextInput
                    style={styles.priceTextInput}
                    value={minInput}
                    onChangeText={handleMinInputChange}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.priceConnector} />
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceInputLabel}>Max (₱)</Text>
                  <TextInput
                    style={styles.priceTextInput}
                    value={maxInput}
                    onChangeText={handleMaxInputChange}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.sliderWrapperModal}>
                <MultiSlider
                  values={[multiSliderValue[0], multiSliderValue[1]]}
                  sliderLength={width - 80}
                  onValuesChange={handleSliderChange}
                  min={0}
                  max={100000}
                  step={500}
                  allowOverlap={false}
                  snapped
                  selectedStyle={{ backgroundColor: BRAND_COLOR }}
                  unselectedStyle={{ backgroundColor: '#E5E7EB' }}
                  trackStyle={{ height: 6, borderRadius: 3 }}
                  markerStyle={{
                    height: 24,
                    width: 24,
                    borderRadius: 12,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 2,
                    borderColor: BRAND_COLOR,
                    elevation: 4,
                  }}
                />
              </View>

              <Text style={[styles.filterSectionTitle, { marginTop: 20, marginBottom: 15 }]}>Sort By</Text>
              {(sortOptions || []).map((opt) => (
                <Pressable key={opt.value} style={styles.filterOption} onPress={() => { setSelectedSort(opt.value); }}>
                  <Text style={[styles.filterText, selectedSort === opt.value && { color: BRAND_COLOR }]}>{opt.label}</Text>
                  {selectedSort === opt.value && <Check size={20} color={BRAND_COLOR} />}
                </Pressable>
              ))}

              <Pressable 
                style={[styles.applyButton, { backgroundColor: BRAND_COLOR, marginTop: 20 }]}
                onPress={() => {
                  setMinPrice(multiSliderValue[0].toString());
                  setMaxPrice(multiSliderValue[1] >= 100000 ? '9999999' : multiSliderValue[1].toString());
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
  headerContainer: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 15,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    paddingHorizontal: 16,
    height: 45,
    gap: 10
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  headerRight: { flexDirection: 'row', gap: 10 },
  headerIconButton: { padding: 4, position: 'relative' },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 9, fontWeight: '900' },
  scrollView: { flex: 1 },
  storesSection: { marginTop: 25 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: '#1F2937' },
  storesScroll: { paddingHorizontal: 20, gap: 15 },
  storeCard: {
    width: 280,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F1F1',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  storeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  storeLogo: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  storeInfo: { flex: 1 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  visitBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  visitBtnText: { fontSize: 12, fontWeight: '700' },
  storeProducts: { flexDirection: 'row', gap: 8 },
  storeProductThumb: { flex: 1, height: 70, borderRadius: 12, backgroundColor: '#F3F4F6' },
  categoryScroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, gap: 10 },
  chip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 25, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  inlineHeaderFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },
  priceInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceInputContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceInputLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
    fontWeight: '600',
  },
  priceTextInput: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    padding: 0,
  },
  priceConnector: {
    width: 12,
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  sliderWrapperModal: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 10, justifyContent: 'space-between' },
  cardWrapper: {
    width: (width - 44) / 2, // Adjusted for cleaner spacing
    marginBottom: 16,
    // Removed specific card styles here, let ProductCard handle it
  },
  debugBox: { marginTop: 12, marginHorizontal: 20, borderWidth: 1, borderRadius: 12, padding: 10, backgroundColor: '#FFF', flexDirection: 'row', gap: 10, alignItems: 'center' },
  debugText: { fontSize: 12, color: '#4B5563' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, width: '100%' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  emptyText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalBody: { padding: 24 },
  filterSectionTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 15 },
  filterOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  filterText: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
  applyButton: { marginTop: 30, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  applyButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
