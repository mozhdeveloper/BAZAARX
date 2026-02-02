import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { BadgeCheck, ShieldCheck, Star } from 'lucide-react-native';
import { Product } from '../types';
import { COLORS } from '../constants/theme';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const hasDiscount = !!(product.originalPrice && typeof product.price === 'number' && product.originalPrice > product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price!) / product.originalPrice!) * 100)
    : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      android_ripple={{ color: '#FFE5D9' }}
    >
      {/* Product Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        
        {/* Discount Badge */}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        )}
        
        {/* Free Shipping Badge */}
        {product.isFreeShipping && (
          <View style={styles.shippingBadge}>
            <Text style={styles.shippingText}>Free Ship</Text>
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
          <Star size={12} fill={COLORS.primary} color={COLORS.primary} />
          <Text style={styles.ratingText}>{product.rating}</Text>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={[styles.price, hasDiscount && { color: '#EF4444' }]}>₱{(product.price || 0).toLocaleString()}</Text>
          {hasDiscount && product.originalPrice && (
            <Text style={styles.originalPrice}>₱{product.originalPrice.toLocaleString()}</Text>
          )}
        </View>

        {/* Sold Count */}
        <Text style={styles.soldText}>{(product.sold || 0).toLocaleString()} sold</Text>

        {/* Seller Info */}
        <View style={styles.sellerContainer}>
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
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F9FAFB',
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
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
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoContainer: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
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
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 10,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  soldText: {
    fontSize: 10,
    color: '#9CA3AF',
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
});
