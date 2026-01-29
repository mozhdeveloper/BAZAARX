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
          <Text style={styles.price}>₱{(product.price || 0).toLocaleString()}</Text>
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  shippingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 106, 0, 0.15)', // Lightened Primary
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  shippingText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  infoContainer: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 8,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 11,
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  soldText: {
    fontSize: 11,
    color: COLORS.gray400,
    marginBottom: 10,
  },
  sellerContainer: {
    paddingTop: 10,
    marginTop: 10,
    backgroundColor: '#FAFAFA',
    marginHorizontal: -12,
    marginBottom: -12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  sellerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 11,
    color: COLORS.gray500,
    flex: 1,
  },
  sellerRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sellerRating: {
    fontSize: 11,
    color: COLORS.gray500,
  },
});
