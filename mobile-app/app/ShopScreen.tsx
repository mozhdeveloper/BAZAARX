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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, X, Check, Camera, ShoppingCart, Star, CheckCircle2 } from 'lucide-react-native';
import CameraSearchModal from '../src/components/CameraSearchModal';
import { ProductCard } from '../src/components/ProductCard';
import { trendingProducts, bestSellerProducts, newArrivals } from '../src/data/products';
import { useProductQAStore } from '../src/stores/productQAStore';
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
const GAP = 15;
const ITEM_WIDTH = (width - (PADDING * 2) - GAP) / 2;

const officialStores = [
  {
    id: '1',
    name: 'Nike Official',
    logo: '🏃',
    verified: true,
    rating: 4.9,
    products: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200',
    ],
  },
  {
    id: '2',
    name: 'Adidas Store',
    logo: '👟',
    verified: true,
    rating: 4.8,
    products: [
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=200',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=200',
    ],
  },
];

const categories = [
  { id: 'all', name: 'All' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'home-garden', name: 'Home & Garden' },
];

const sortOptions = [
  { value: 'relevance', label: 'Best Match' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

export default function ShopScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const cartItems = useCartStore((state) => state.items);
  const BRAND_COLOR = '#FF5722';
  
  const qaProducts = useProductQAStore((state) => state.products);
  const verifiedQAProducts = qaProducts
    .filter(qp => qp.status === 'ACTIVE_VERIFIED')
    .map(qp => ({
      ...qp,
      rating: 4.5,
      sold: 0,
      seller: qp.vendor,
      isVerified: true,
      location: 'Philippines',
    } as unknown as Product));

  const allAvailableProducts = [...verifiedQAProducts, ...trendingProducts, ...bestSellerProducts, ...newArrivals];
  
  const { searchQuery: initialSearchQuery, customResults } = route.params || {};
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('relevance');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showCameraSearch, setShowCameraSearch] = useState(false);

  useEffect(() => {
    if (route.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
    }
  }, [route.params?.searchQuery]);

  const filteredProducts = useMemo(() => {
    if (customResults && customResults.length > 0) return customResults;
    let filtered = allAvailableProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category.toLowerCase().replace(/\s+/g, '-') === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    if (selectedSort === 'price-low') filtered.sort((a, b) => a.price - b.price);
    if (selectedSort === 'price-high') filtered.sort((a, b) => b.price - a.price);
    return filtered;
  }, [searchQuery, selectedCategory, selectedSort, customResults]);

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
        <View style={styles.storesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Verified Official Stores</Text>
            {/* SEE ALL IS NOW CLICKABLE */}
            <Pressable onPress={() => console.log('Navigate to All Stores')}>
              <Text style={{color: BRAND_COLOR, fontWeight: '700'}}>See All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
            {officialStores.map((store) => (
              /* CLICKABLE STORE CARD */
              <Pressable 
                key={store.id} 
                style={styles.storeCard}
                onPress={() => console.log(`Maps to store: ${store.name}`)}
              >
                <View style={styles.storeHeader}>
                  <View style={styles.storeLogo}><Text style={{fontSize: 22}}>{store.logo}</Text></View>
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
                  <View style={[styles.visitBtn, {borderColor: BRAND_COLOR}]}>
                    <Text style={[styles.visitBtnText, {color: BRAND_COLOR}]}>Visit</Text>
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

        <View style={styles.productsGrid}>
          {filteredProducts.map((product) => (
            <View key={product.id} style={styles.cardWrapper}>
              <ProductCard product={product} onPress={() => navigation.navigate('ProductDetail', { product })} />
            </View>
          ))}
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
              {sortOptions.map((opt) => (
                <Pressable key={opt.value} style={styles.filterOption} onPress={() => { setSelectedSort(opt.value); setShowFiltersModal(false); }}>
                  <Text style={[styles.filterText, selectedSort === opt.value && { color: BRAND_COLOR }]}>{opt.label}</Text>
                  {selectedSort === opt.value && <Check size={20} color={BRAND_COLOR} />}
                </Pressable>
              ))}
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
  categoryScroll: { paddingHorizontal: 20, paddingVertical: 20, gap: 10 },
  chip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 25, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: PADDING, justifyContent: 'space-between' },
  cardWrapper: { 
    width: ITEM_WIDTH, 
    marginBottom: 20,
    backgroundColor: '#FFF',
    borderRadius: 18,

    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalBody: { padding: 24 },
  filterOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  filterText: { fontSize: 15, fontWeight: '600', color: '#4B5563' }
});