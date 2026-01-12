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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ShoppingCart, Star, BadgeCheck, ShieldCheck, Menu, Search, Camera, Share2, Heart, Plus, Minus, ThumbsUp, CheckCircle } from 'lucide-react-native';
import { ProductCard } from '../src/components/ProductCard';
import { useCartStore } from '../src/stores/cartStore';
import { trendingProducts } from '../src/data/products';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

const { width } = Dimensions.get('window');

// Demo reviews data matching web format
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
  },
  {
    id: '3',
    buyerName: 'Anna Reyes',
    buyerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    rating: 5,
    title: 'Perfect for daily use',
    comment: 'Quality is amazing and works perfectly. Comfortable for long use. Will definitely buy again!',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop'],
    date: '2024-12-05',
    helpful: 8,
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

  const relatedProducts = trendingProducts.filter((p) => p.id !== product.id).slice(0, 4);

  const handleAddToCart = () => {
    addItem(product);
    alert('Added to cart!');
  };

  const handleBuyNow = () => {
    addItem(product);
    navigation.navigate('MainTabs', { screen: 'Cart' });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={16}
        color={i < rating ? '#FF5722' : '#E5E7EB'}
        fill={i < rating ? '#FF5722' : '#E5E7EB'}
      />
    ));
  };

  return (
    <View style={styles.container}>
      {/* Orange Header with Search */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
        
        <View style={styles.searchContainer}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
          />
          <Pressable style={styles.cameraButton}>
            <Camera size={18} color="#FF5722" />
          </Pressable>
        </View>

        <View style={styles.headerRight}>
          <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })} style={styles.cartContainer}>
            <ShoppingCart size={24} color="#FFFFFF" strokeWidth={2.5} />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>2</Text>
            </View>
          </Pressable>
          <Pressable style={styles.menuButton}>
            <Menu size={24} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Product Image with Floating Icons */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="cover" />
          
          {/* Floating Action Icons */}
          <View style={styles.floatingIcons}>
            <Pressable style={styles.floatingIconButton}>
              <Share2 size={20} color="#FF5722" strokeWidth={2.5} />
            </Pressable>
            <Pressable 
              style={styles.floatingIconButton}
              onPress={() => setIsFavorite(!isFavorite)}
            >
              <Heart 
                size={20} 
                color="#FF5722" 
                fill={isFavorite ? "#FF5722" : "none"}
                strokeWidth={2.5}
              />
            </Pressable>
          </View>

          {/* Image Indicator */}
          <View style={styles.imageIndicator}>
            <Text style={styles.imageIndicatorText}>1/5</Text>
          </View>
        </View>

        {/* Product Info - Overlapping Card */}
        <View style={styles.infoContainer}>
          {/* Tags Row */}
          <View style={styles.tagsRow}>
            <View style={styles.bestsellerTag}>
              <Star size={14} color="#8B5CF6" fill="#8B5CF6" />
              <Text style={styles.bestsellerText}>Bestseller</Text>
            </View>
            {product.originalPrice && (
              <View style={styles.discountTag}>
                <Text style={styles.discountText}>15% OFF</Text>
              </View>
            )}
          </View>

          <Text style={styles.productName}>{product.name}</Text>

          <View style={styles.salesRow}>
            <Text style={styles.salesText}>{product.sold} sold this month</Text>
            <Text style={styles.shippingText}>• Free Shipping Available</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₱{product.price.toLocaleString()}</Text>
            {product.originalPrice && (
              <Text style={styles.originalPrice}>₱{product.originalPrice.toLocaleString()}</Text>
            )}
          </View>

          <View style={styles.stockRow}>
            <Text style={styles.stockText}>In-Stock (12)</Text>
          </View>

          <View style={styles.ratingRow}>
            <View style={styles.stars}>{renderStars(Math.floor(product.rating))}</View>
            <Text style={styles.ratingText}>{product.rating.toFixed(1)} ({product.sold.toLocaleString()})</Text>
            <Text style={styles.questionsText}>14 Questions</Text>
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantityContainer}>
            <Pressable 
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus size={20} color="#FF5722" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.quantityText}>{quantity}</Text>
            <Pressable 
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Plus size={20} color="#FF5722" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Seller Info */}
          <View style={styles.sellerContainer}>
            <View style={styles.sellerRow}>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerLabel}>Sold by:</Text>
                <View style={styles.sellerHeader}>
                  <Text style={styles.sellerName}>{product.seller}</Text>
                  {product.sellerVerified && <BadgeCheck size={14} color="#FF5722" />}
                </View>
              </View>
              <View style={styles.sellerRating}>
                <Star size={14} color="#FF5722" fill="#FF5722" />
                <Text style={styles.sellerRatingText}>{product.sellerRating.toFixed(1)}</Text>
              </View>
            </View>
          </View>

          {/* Badges */}
          <View style={styles.badgesRow}>
            {product.isVerified && (
              <View style={styles.badge}>
                <ShieldCheck size={14} color="#FF5722" />
                <Text style={styles.badgeText}>Verified Product</Text>
              </View>
            )}
            {product.isFreeShipping && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Free Shipping</Text>
              </View>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <Pressable
              onPress={() => setActiveTab('details')}
              style={[styles.tab, activeTab === 'details' && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
                Details
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('support')}
              style={[styles.tab, activeTab === 'support' && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === 'support' && styles.activeTabText]}>
                Support
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('ratings')}
              style={[styles.tab, activeTab === 'ratings' && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === 'ratings' && styles.activeTabText]}>
                Ratings
              </Text>
            </Pressable>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'details' && (
              <Text style={styles.description}>
                {product.description ||
                  'High-quality product from verified seller. 100% authentic and tested for quality assurance. Fast and reliable shipping available.'}
              </Text>
            )}
            {activeTab === 'support' && (
              <Text style={styles.description}>
                24/7 customer support available. Contact us anytime for product inquiries, shipping
                updates, or returns.
              </Text>
            )}
            {activeTab === 'ratings' && (
              <View style={styles.ratingsContainer}>
                {/* Rating Summary */}
                <View style={styles.ratingSummary}>
                  <Text style={styles.ratingScore}>{product.rating.toFixed(1)}</Text>
                  <View style={styles.ratingStars}>
                    {renderStars(Math.round(product.rating))}
                  </View>
                  <Text style={styles.ratingCount}>Based on {product.sold || demoReviews.length} reviews</Text>
                </View>

                {/* Reviews List */}
                <View style={styles.reviewsList}>
                  <Text style={styles.reviewsTitle}>Customer Reviews</Text>
                  {demoReviews.map((review) => (
                    <View key={review.id} style={styles.reviewCard}>
                      {/* Reviewer Info */}
                      <View style={styles.reviewHeader}>
                        <Image source={{ uri: review.buyerAvatar }} style={styles.reviewerAvatar} />
                        <View style={styles.reviewerInfo}>
                          <View style={styles.reviewerNameRow}>
                            <Text style={styles.reviewerName}>{review.buyerName}</Text>
                            {review.verified && (
                              <View style={styles.verifiedBadge}>
                                <CheckCircle size={14} color="#10B981" fill="#10B981" />
                                <Text style={styles.verifiedText}>Verified</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.reviewStars}>
                            {renderStars(review.rating)}
                          </View>
                        </View>
                      </View>

                      {/* Review Content */}
                      {review.title && (
                        <Text style={styles.reviewTitle}>{review.title}</Text>
                      )}
                      <Text style={styles.reviewComment}>{review.comment}</Text>

                      {/* Review Images */}
                      {review.images && review.images.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImages}>
                          {review.images.map((img, idx) => (
                            <Image key={idx} source={{ uri: img }} style={styles.reviewImage} />
                          ))}
                        </ScrollView>
                      )}

                      {/* Review Footer */}
                      <View style={styles.reviewFooter}>
                        <Text style={styles.reviewDate}>{new Date(review.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        <View style={styles.helpfulButton}>
                          <ThumbsUp size={14} color="#6B7280" />
                          <Text style={styles.helpfulText}>Helpful ({review.helpful})</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Related Products */}
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>You Might Also Like</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {relatedProducts.map((item) => (
                <View key={item.id} style={styles.relatedProductCard}>
                  <ProductCard
                    product={item}
                    onPress={() => navigation.push('ProductDetail', { product: item })}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <Pressable onPress={handleAddToCart} style={styles.addToCartButton}>
          <ShoppingCart size={20} color="#FF5722" />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </Pressable>
        <Pressable onPress={handleBuyNow} style={styles.buyNowButton}>
          <Text style={styles.buyNowText}>Buy Now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FF5722',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    padding: 0,
  },
  cameraButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F0',
    borderRadius: 999,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF5722',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'relative',
    width: width,
    height: width * 1.1,
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  floatingIcons: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    gap: 12,
  },
  floatingIconButton: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  imageIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  imageIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    marginTop: -60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  bestsellerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  bestsellerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 0.3,
  },
  discountTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  salesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  salesText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  shippingText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    gap: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.8,
  },
  originalPrice: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  stockRow: {
    marginBottom: 12,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  questionsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
    marginLeft: 'auto',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 24,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FF5722',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  quantityText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    minWidth: 40,
    textAlign: 'center',
  },
  sellerContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 16,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.1,
  },
  sellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 10,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF5722',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#FF5722',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabContent: {
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#6B7280',
    fontWeight: '500',
  },
  relatedSection: {
    marginTop: 8,
  },
  relatedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  relatedProductCard: {
    width: 160,
    marginRight: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#FF5722',
    borderRadius: 999,
    paddingVertical: 16,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF5722',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  buyNowButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buyNowText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  ratingsContainer: {
    gap: 20,
  },
  ratingSummary: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ratingScore: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FF5722',
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  reviewsList: {
    gap: 12,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  reviewerInfo: {
    flex: 1,
    gap: 6,
  },
  reviewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  reviewComment: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  reviewImages: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpfulText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});
