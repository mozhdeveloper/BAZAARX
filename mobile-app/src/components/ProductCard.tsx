import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { BadgeCheck, ShieldCheck, Star, Flame } from 'lucide-react-native';
import { Product } from '../types';
import { COLORS } from '../constants/theme';
import { safeImageUri } from '../utils/imageUtils';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  variant?: 'default' | 'flash';
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, variant = 'default' }) => {
  const isFlash = variant === 'flash';
  const regularPrice = typeof product.price === 'number' ? product.price : parseFloat(String(product.price || 0));
  const pbPrice = product.originalPrice ?? product.original_price;
  const originalPrice = typeof pbPrice === 'number' ? pbPrice : parseFloat(String(pbPrice || 0));
  
  // Calculate discount only if both prices are valid and discount exists
  const hasDiscount = !!(originalPrice > 0 && regularPrice > 0 && originalPrice > regularPrice);
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - regularPrice) / originalPrice) * 100)
    : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        // isFlash && styles.flashBorder, // Removed red outline
        pressed && styles.pressed,
      ]}
      android_ripple={{ color: '#FFE5D9' }}
    >
      {/* Product Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: safeImageUri(product.image) }} style={styles.image} resizeMode="cover" />

        {/* Discount Badge */}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercent}% OFF</Text>
          </View>
        )}

        {/* Campaign Badge Removed for Grouped Layout */}

        {/* Free Shipping Badge Removed */}


      </View>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        {/* Product Name */}
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <Star size={12} fill="#F59E0B" color="#F59E0B" />
          <Text style={styles.ratingText}>{product.rating || 4.9}</Text>
        </View>

        {/* Price & Sold */}
        <View style={styles.priceSoldRow}>
          <View style={styles.priceContainer}>
            <Text style={[
              styles.price, 
              hasDiscount && { color: '#DC2626' }, 
              hasDiscount && { fontSize: 20 }
            ]}>
              ₱{regularPrice.toLocaleString()}
            </Text>
            {hasDiscount && originalPrice > 0 && (
              <Text style={styles.originalPrice}>₱{originalPrice.toLocaleString()}</Text>
            )}
          </View>
          {!(hasDiscount && isFlash) && (
            <Text style={styles.soldText}>{(product.sold || 0).toLocaleString()} sold</Text>
          )}
        </View>

        {hasDiscount && isFlash && (
          <View style={styles.flashProgressContainer}>
            <View style={styles.flashProgressBar}>
              <View 
                style={[
                  styles.flashProgressFill, 
                  { 
                    width: `${Math.min(100, Math.max(5, (product.sold || 0) / ((product.sold || 0) + (product.stock || 1)) * 100))}%` 
                  }
                ]} 
              />
            </View>
            <View style={styles.flashSoldRow}>
                <Flame size={14} color="#DC2626" fill="#DC2626" />
                <Text style={styles.flashSoldText}>{(product.sold || 0).toLocaleString()} SOLD</Text>
            </View>
          </View>
        )}

        {/* Seller Info */}
        {/* <View style={styles.sellerContainer}>
          <View style={styles.sellerNameContainer}>
            <Text style={styles.sellerName} numberOfLines={1}>
              {product.seller}
            </Text>
            {product.sellerVerified && (
              <BadgeCheck size={12} color={COLORS.primary} />
            )}
          </View>
          <View style={styles.sellerRatingContainer}>
            <Star size={10} fill={COLORS.primary} color={COLORS.primary} />
            <Text style={styles.sellerRating}>({product.sellerRating})</Text>
          </View>
        </View> */}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card, // Warm Ivory/Cream
    borderRadius: 12, // Reduced from 20 to 12
    overflow: 'hidden',
    shadowColor: '#F59E0B', // Golden Shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, // Softer glow
    shadowRadius: 12,
    elevation: 6,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 0.9,
    backgroundColor: '#FFF6E5', // Pale Cream (matches theme)
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#DC2626', // Red
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  flashBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 5,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  flashBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  shippingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.3)',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  shippingText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoContainer: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary, // Rich Warm Brown
    marginBottom: 6,
    lineHeight: 17,
    height: 34, // Fixed height for 2 lines to maintain grid alignment
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.primary, // Golden Amber
    fontWeight: '600',
  },
  priceSoldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 2,
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    color: '#D97706', // Amber-600
  },
  originalPrice: {
    fontSize: 12,
    color: '#A8A29E', // Warm Gray
    textDecorationLine: 'line-through',
  },
  soldText: {
    fontSize: 12,
    color: '#A8A29E', // Warm Gray
    marginBottom: 8,
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sellerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  sellerName: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  sellerRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sellerRating: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  // flashBorder: { borderColor: '#FCA5A5', borderWidth: 1.5 }, // removed
  flashProgressContainer: {
    marginTop: 4,
    width: '100%',
  },
  flashProgressBar: {
    height: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  flashProgressFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 2,
  },
  flashSoldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  flashSoldText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
    textTransform: 'uppercase',
  }
});
