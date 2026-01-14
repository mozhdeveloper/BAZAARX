import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Star, 
  BadgeCheck, 
  ShieldCheck, 
  Search, 
  Camera, 
  Share2, 
  Heart, 
  Plus, 
  Minus, 
  CheckCircle,
  User 
} from 'lucide-react-native';
import { ProductCard } from '../src/components/ProductCard';
import { useCartStore } from '../src/stores/cartStore';
import { trendingProducts } from '../src/data/products';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Product } from '../src/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

const { width } = Dimensions.get('window');

const demoReviews = [
  {
    id: '1',
    buyerName: 'Maria Santos',
    buyerAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5e5?w=150&h=150&fit=crop&crop=face',
    rating: 5,
    title: 'Excellent Product!',
    comment: 'Amazing product with great quality. Fast delivery and secure packaging. Highly recommended!',
    images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop'],
    date: '2024-12-15',
    helpful: 23,
    verified: true
  },
  {
    id: '2',
    buyerName: 'Juan Dela Cruz',
    buyerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    rating: 4,
    title: 'Great value for money',
    comment: 'Performance is excellent. Only minor issue is the packaging could be better. Overall very satisfied with the purchase.',
    images: [],
    date: '2024-12-10',
    helpful: 15,
    verified: true
  }
];

export default function ProductDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { product } = route.params;
  const [activeTab, setActiveTab] = useState<'details' | 'support' | 'ratings'>('details');
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  
  const BRAND_COLOR = '#FF5722';

  const relatedProducts = trendingProducts.filter((p) => p.id !== product.id).slice(0, 4);

  const handleAddToCart = () => {
    addItem(product);
    Alert.alert('Added to cart!');
  };

  const handleBuyNow = () => {
    addItem(product);
    navigation.navigate('MainTabs', { screen: 'Cart' });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={14}
        color={i < rating ? BRAND_COLOR : '#E5E7EB'}
        fill={i < rating ? BRAND_COLOR : '#E5E7EB'}
      />
    ));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER SECTION */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          
          <View style={styles.searchBarContainer}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
            />
            <Pressable>
              <Camera size={18} color={BRAND_COLOR} />
            </Pressable>
          </View>

          <View style={styles.headerRight}>
            <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })} style={styles.cartContainer}>
              <ShoppingCart size={24} color="#FFFFFF" strokeWidth={2.5} />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>2</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="cover" />
          <View style={styles.floatingIcons}>
            <Pressable style={styles.floatingIconButton}><Share2 size={20} color={BRAND_COLOR} /></Pressable>
            <Pressable style={styles.floatingIconButton} onPress={() => setIsFavorite(!isFavorite)}>
              <Heart size={20} color={BRAND_COLOR} fill={isFavorite ? BRAND_COLOR : "none"} strokeWidth={2.5} />
            </Pressable>
          </View>
          <View style={styles.imageIndicator}><Text style={styles.imageIndicatorText}>1/5</Text></View>
        </View>

        {/* INFO CARD */}
        <View style={styles.infoContainer}>
          <View style={styles.tagsRow}>
            <View style={styles.bestsellerTag}>
              <Star size={12} color="#8B5CF6" fill="#8B5CF6" />
              <Text style={styles.bestsellerText}>Bestseller</Text>
            </View>
            <View style={[styles.discountTag, { backgroundColor: BRAND_COLOR + '15' }]}>
              <Text style={{ color: BRAND_COLOR, fontWeight: '800', fontSize: 11 }}>15% OFF</Text>
            </View>
          </View>

          <Text style={styles.productName}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: BRAND_COLOR }]}>₱{product.price.toLocaleString()}</Text>
            {product.originalPrice && <Text style={styles.originalPrice}>₱{product.originalPrice.toLocaleString()}</Text>}
          </View>

          <View style={styles.ratingRow}>
            <View style={styles.stars}>{renderStars(Math.floor(product.rating))}</View>
            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            <Text style={styles.soldText}>({product.sold.toLocaleString()} sold)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityContainer}>
              <Pressable style={[styles.quantityBtn, { borderColor: BRAND_COLOR }]} onPress={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={18} color={BRAND_COLOR} strokeWidth={2.5} /></Pressable>
              <Text style={styles.quantityText}>{quantity}</Text>
              <Pressable style={[styles.quantityBtn, { borderColor: BRAND_COLOR }]} onPress={() => setQuantity(quantity + 1)}><Plus size={18} color={BRAND_COLOR} strokeWidth={2.5} /></Pressable>
            </View>
          </View>

          {/* OFFICIAL STORE BOX - FIXED VERIFIED BADGE POSITION */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerMain}>
              <View style={styles.sellerAvatar}><User size={22} color="#FFF" /></View>
              <View style={{ flex: 1 }}>
                <View style={styles.sellerNameWrapper}>
                  <Text style={styles.sellerName} numberOfLines={1}>{product.seller}</Text>
                  {product.sellerVerified && (
                    <BadgeCheck size={18} color={BRAND_COLOR} style={styles.verifiedIcon} />
                  )}
                </View>
                <Text style={styles.sellerSubtitle}>Official Store</Text>
              </View>
              <Pressable style={[styles.viewStoreBtn, { borderColor: BRAND_COLOR }]}>
                <Text style={{ color: BRAND_COLOR, fontWeight: '700', fontSize: 13 }}>Visit Store</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.tabs}>
            {(['details', 'support', 'ratings'] as const).map((tab) => (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && { backgroundColor: BRAND_COLOR }]}>
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'details' && <Text style={styles.description}>{product.description || 'Premium authentic product with full quality assurance.'}</Text>}
            {activeTab === 'ratings' && (
              <View style={styles.reviewsList}>
                {demoReviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Image source={{ uri: review.buyerAvatar }} style={styles.reviewerAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewerName}>{review.buyerName}</Text>
                        <View style={styles.starsRow}>{renderStars(review.rating)}</View>
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.relatedSection}>
            <Text style={styles.relatedHeader}>You Might Also Like</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {relatedProducts.map((item) => (
                <View key={item.id} style={styles.relatedProductCard}>
                  <ProductCard product={item} onPress={() => navigation.push('ProductDetail', { product: item })} />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={handleAddToCart} style={[styles.addToCartBtn, { borderColor: BRAND_COLOR }]}>
          <ShoppingCart size={20} color={BRAND_COLOR} /><Text style={[styles.addToCartText, { color: BRAND_COLOR }]}>Add to Cart</Text>
        </Pressable>
        <Pressable onPress={handleBuyNow} style={[styles.buyNowBtn, { backgroundColor: BRAND_COLOR }]}>
          <Text style={styles.buyNowText}>Buy Now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingBottom: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  headerIcon: { width: 40, height: 40, justifyContent: 'center' },
  searchBarContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 100, paddingHorizontal: 16, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  cartContainer: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#FFFFFF', borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cartBadgeText: { fontSize: 10, fontWeight: '900', color: '#FF5722' },
  
  imageContainer: { width: width, height: width * 1.05, backgroundColor: '#FFF' },
  productImage: { width: '100%', height: '100%' },
  floatingIcons: { position: 'absolute', bottom: 50, right: 20, gap: 12 },
  floatingIconButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowOpacity: 0.1 },
  imageIndicator: { position: 'absolute', bottom: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  imageIndicatorText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  
  infoContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, marginTop: -30, elevation: 20 },
  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  bestsellerTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E8FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 4 },
  bestsellerText: { fontSize: 11, fontWeight: '700', color: '#8B5CF6' },
  discountTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  
  productName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 10, lineHeight: 28 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  price: { fontSize: 26, fontWeight: '900' },
  originalPrice: { fontSize: 16, color: '#9CA3AF', textDecorationLine: 'line-through', fontWeight: '500' },
  
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  stars: { flexDirection: 'row', gap: 2 },
  ratingText: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  soldText: { fontSize: 14, color: '#6B7280' },
  
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 18 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  
  quantityContainer: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  quantityBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  quantityText: { fontSize: 16, fontWeight: '800', color: '#111827', minWidth: 25, textAlign: 'center' },
  
  sellerCard: { backgroundColor: '#F9FAFB', borderRadius: 20, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: '#F1F1F1' },
  sellerMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center' },
  sellerNameWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  sellerName: { fontSize: 15, fontWeight: '700', color: '#111827', maxWidth: '80%' },
  verifiedIcon: { marginLeft: 4 },
  sellerSubtitle: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  viewStoreBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  
  tabs: { flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 4, borderRadius: 14, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 11 },
  tabText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  activeTabText: { color: '#FFF' },
  
  tabContent: { minHeight: 100 },
  description: { fontSize: 15, color: '#4B5563', lineHeight: 24 },
  
  reviewsList: { gap: 16 },
  reviewCard: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 16 },
  reviewHeader: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  reviewerAvatar: { width: 38, height: 38, borderRadius: 19 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  starsRow: { flexDirection: 'row', marginTop: 2 },
  reviewComment: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  
  relatedSection: { marginTop: 32 },
  relatedHeader: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 16 },
  relatedProductCard: { width: 160, marginRight: 16 },
  
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  addToCartBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 2, height: 54 },
  addToCartText: { fontSize: 15, fontWeight: '800' },
  buyNowBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, height: 54 },
  buyNowText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});