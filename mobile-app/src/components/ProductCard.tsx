import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { BadgeCheck, ShieldCheck, Star, Flame } from 'lucide-react-native';
import { Product } from '../types';
import { COLORS } from '../constants/theme';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  variant?: 'default' | 'flash';
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, variant = 'default' }) => {
  const isFlash = variant === 'flash';
  const hasDiscount = !!(product.originalPrice && typeof product.price === 'number' && product.originalPrice > product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price!) / product.originalPrice!) * 100)
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
        <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />

        {/* Discount Badge */}
        {hasDiscount && !isFlash && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        )}

        {/* Free Shipping Badge */}
        {product.isFreeShipping && (
          <View style={styles.shippingBadge}>
            <Text style={styles.shippingText}>Free Shipping</Text>
          </View>
        )}


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
              hasDiscount && { color: isFlash ? '#DC2626' : '#EA580C' }, // Vibrant Orange for Standard
              isFlash && { fontSize: 18 } // Slightly larger for Flash
            ]}>
              ₱{(product.price || 0).toLocaleString()}
            </Text>
            {hasDiscount && product.originalPrice && (
              <Text style={styles.originalPrice}>₱{product.originalPrice.toLocaleString()}</Text>
            )}
          </View>
          {!isFlash && (
            <Text style={styles.soldText}>{(product.sold || 0).toLocaleString()} sold</Text>
          )}
        </View>

        {isFlash && (
          <View style={styles.flashProgressContainer}>
            <View style={styles.flashProgressBar}>
              <View style={[styles.flashProgressFill, { width: '75%' }]} />
            </View>
            <View style={styles.flashSoldRow}>
                <Flame size={12} color="#DC2626" fill="#DC2626" />
                <Text style={styles.flashSoldText}>{product.sold} Sold</Text>
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
    backgroundColor: '#FFFBF0', // Warm Ivory/Cream
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
    backgroundColor: '#EA580C', // Vibrant Orange
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  shippingBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.2)',
    zIndex: 10,
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
    color: '#7C2D12', // Rich Warm Brown
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
    color: '#D97706', // Golden Orange
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
    color: '#EA580C', // Vibrant Orange
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
