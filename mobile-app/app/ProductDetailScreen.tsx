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
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShoppingCart,
  Star,
  BadgeCheck,
  Search,
  Camera,
  Share2,
  Heart,
  Plus,
  Minus,
  User,
} from 'lucide-react-native';
import { ProductCard } from '../src/components/ProductCard';
import CameraSearchModal from '../src/components/CameraSearchModal';
import { useCartStore } from '../src/stores/cartStore';
import { useWishlistStore } from '../src/stores/wishlistStore';
import { trendingProducts } from '../src/data/products';
import { officialStores } from '../src/data/stores';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

const { width } = Dimensions.get('window');
const BRAND_COLOR = '#FF5722'; // ✅ DECLARED ONCE

const demoReviews = [
  {
    id: '1',
    buyerName: 'Maria Santos',
    buyerAvatar:
      'https://images.unsplash.com/photo-1494790108755-2616b612b5e5?w=150&h=150&fit=crop&crop=face',
    rating: 5,
    comment:
      'Amazing product with great quality. Fast delivery and secure packaging.',
  },
  {
    id: '2',
    buyerName: 'Juan Dela Cruz',
    buyerAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    rating: 4,
    comment: 'Great value for money.',
  },
];

export default function ProductDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { product } = route.params;

  const [activeTab, setActiveTab] = useState<'details' | 'support' | 'ratings'>('details');
  const [showCameraSearch, setShowCameraSearch] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const addItem = useCartStore((state) => state.addItem);
  const setQuickOrder = useCartStore((state) => state.setQuickOrder);

  const {
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    isInWishlist,
  } = useWishlistStore();

  const isFavorite = isInWishlist(product.id);

  const relatedProducts = trendingProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const handleAddToCart = () => {
    addItem(product);
    Alert.alert('Added to cart!');
  };

  const handleBuyNow = () => {
    setQuickOrder(product, quantity);
    navigation.navigate('Checkout');
  };

  const handleShare = async () => {
    await Share.share({
      message: `Check out ${product.name} on BazaarX! ₱${product.price}`,
    });
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={14}
        color={i < rating ? BRAND_COLOR : '#E5E7EB'}
        fill={i < rating ? BRAND_COLOR : '#E5E7EB'}
      />
    ));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#FFF" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <Image source={{ uri: product.image }} style={styles.productImage} />

        <Pressable onPress={handleShare}>
          <Share2 size={22} color={BRAND_COLOR} />
        </Pressable>

        <Pressable
          onPress={() =>
            isFavorite
              ? removeFromWishlist(product.id)
              : addToWishlist(product)
          }
        >
          <Heart size={22} color={BRAND_COLOR} fill={isFavorite ? BRAND_COLOR : 'none'} />
        </Pressable>

        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.price}>₱{product.price.toLocaleString()}</Text>

        <View style={styles.stars}>{renderStars(Math.floor(product.rating))}</View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.addToCartBtn} onPress={handleAddToCart}>
          <ShoppingCart size={20} color={BRAND_COLOR} />
          <Text style={{ color: BRAND_COLOR }}>Add to Cart</Text>
        </Pressable>

        <Pressable style={[styles.buyNowBtn, { backgroundColor: BRAND_COLOR }]} onPress={handleBuyNow}>
          <Text style={{ color: '#FFF' }}>Buy Now</Text>
        </Pressable>
      </View>

      <CameraSearchModal visible={showCameraSearch} onClose={() => setShowCameraSearch(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { padding: 16 },
  productImage: { width: width, height: width },
  productName: { fontSize: 22, fontWeight: '800', margin: 16 },
  price: { fontSize: 26, fontWeight: '900', color: BRAND_COLOR, marginLeft: 16 },
  stars: { flexDirection: 'row', marginLeft: 16 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFF',
  },
  addToCartBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: BRAND_COLOR,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    flexDirection: 'row',
    gap: 8,
  },
  buyNowBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
  },
});
