import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { BadgeCheck, ShieldCheck, Star, Flame, Palmtree } from 'lucide-react-native';
import { Product } from '../types';
import { COLORS } from '../constants/theme';
import { safeImageUri } from '../utils/imageUtils';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  variant?: 'default' | 'flash';
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onPress, variant = 'default' }) => {
  const isFlash = variant === 'flash';
  const regularPrice = typeof product.price === 'number' ? product.price : parseFloat(String(product.price || 0));
  const pbPrice = product.originalPrice ?? product.original_price;
  const originalPrice = typeof pbPrice === 'number' ? pbPrice : parseFloat(String(pbPrice || 0));

  const hasDiscount = !!(originalPrice > 0 && regularPrice > 0 && originalPrice > regularPrice);

  const discountPercent = hasDiscount
    ? (product.campaignDiscountType === 'percentage' && (product.campaignDiscountValue || (product as any).discountBadgePercent)
      ? Math.round(product.campaignDiscountValue ?? (product as any).discountBadgePercent)
      : Math.round(((originalPrice - regularPrice) / originalPrice) * 100))
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
      <View style={styles.imageContainer}>
        <Image source={{ uri: safeImageUri(product.image) }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" transition={200} />

        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercent}% OFF</Text>
          </View>
        )}

        {product.is_vacation_mode && (
          <View style={styles.vacationBadge}>
            <Palmtree size={12} color="#FFFFFF" />
            <Text style={styles.vacationBadgeText}>On Vacation</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.tagsRow}>
          {product.isFreeShipping && (
            <View style={[styles.tag, { backgroundColor: '#ECFDF5' }]}>
              <Text style={[styles.tagText, { color: '#059669' }]}>Free Shipping</Text>
            </View>
          )}
          {(product as any).isSulitDeal && (
            <View style={[styles.tag, { backgroundColor: '#FFF7ED' }]}>
              <Text style={[styles.tagText, { color: '#EA580C' }]}>Sulit Deal</Text>
            </View>
          )}
        </View>

        <View style={styles.priceRow}>
          <Text style={[
            styles.price,
            hasDiscount && { color: '#DC2626' }
          ]}>
            ₱{regularPrice.toLocaleString()}
          </Text>
          {hasDiscount && originalPrice > 0 && (
            <Text style={styles.originalPrice}>₱{originalPrice.toLocaleString()}</Text>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.ratingBox}>
            <Star size={10} fill="#F59E0B" color="#F59E0B" />
            <Text style={styles.ratingText}>{product.rating || 5.0} ({product.review_count || 0})</Text>
          </View>
          {!(hasDiscount && isFlash) && (
            <Text style={styles.soldText}>{(product.sold || product.sales_count || (product as any).sold_count || 0).toLocaleString()} sold</Text>
          )}
        </View>

        {hasDiscount && isFlash && (
          <View style={styles.flashProgressContainer}>
            <View style={styles.flashProgressBar}>
              <View
                style={[
                  styles.flashProgressFill,
                  {
                    width: `${Math.min(100, Math.max(5, (product.sold || (product as any).sold_count || 0) / ((product.sold || (product as any).sold_count || 0) + (product.stock || 1)) * 100))}%`
                  }
                ]}
              />
            </View>
            <View style={styles.flashSoldRow}>
              <Flame size={14} color="#DC2626" fill="#DC2626" />
              <Text style={styles.flashSoldText}>{(product.sold || product.sales_count || (product as any).sold_count || 0).toLocaleString()} SOLD</Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
});

interface MasonryProductCardProps {
  product: Product;
  onPress: () => void;
  width: number;
}

export const MasonryProductCard: React.FC<MasonryProductCardProps> = React.memo(({ product, onPress, width }) => {
  const regularPrice = typeof product.price === 'number' ? product.price : parseFloat(String(product.price || 0));
  const pbPrice = product.originalPrice ?? product.original_price;
  const originalPrice = typeof pbPrice === 'number' ? pbPrice : parseFloat(String(pbPrice || 0));

  const hasDiscount = !!(originalPrice > 0 && regularPrice > 0 && originalPrice > regularPrice);

  const discountPercent = hasDiscount
    ? (product.campaignDiscountType === 'percentage' && (product.campaignDiscountValue || (product as any).discountBadgePercent)
      ? Math.round(product.campaignDiscountValue ?? (product as any).discountBadgePercent)
      : Math.round(((originalPrice - regularPrice) / originalPrice) * 100))
    : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        masonryStyles.container,
        { width: width },
        pressed && masonryStyles.pressed,
      ]}
      android_ripple={{ color: '#FFE5D9' }}
    >
      <View style={masonryStyles.imageContainer}>
        <Image 
          source={{ uri: safeImageUri(product.image) }} 
          style={masonryStyles.image} 
          contentFit="cover" 
          cachePolicy="memory-disk" 
          transition={200} 
        />

        {hasDiscount && (
          <View style={masonryStyles.discountBadge}>
            <Text style={masonryStyles.discountText}>{discountPercent}% OFF</Text>
          </View>
        )}

        {product.is_vacation_mode && (
          <View style={masonryStyles.vacationBadge}>
            <Palmtree size={10} color="#FFFFFF" />
            <Text style={masonryStyles.vacationBadgeText}>Vacation</Text>
          </View>
        )}
      </View>

      <View style={masonryStyles.infoContainer}>
        <Text style={masonryStyles.productName} numberOfLines={3}>
          {product.name}
        </Text>

        <View style={masonryStyles.tagsRow}>
          {product.isFreeShipping && (
            <View style={[masonryStyles.tag, { backgroundColor: '#ECFDF5' }]}>
              <Text style={[masonryStyles.tagText, { color: '#059669' }]}>Free Shipping</Text>
            </View>
          )}
          {(product as any).isSulitDeal && (
            <View style={[masonryStyles.tag, { backgroundColor: '#FFF7ED' }]}>
              <Text style={[masonryStyles.tagText, { color: '#EA580C' }]}>Sulit Deal</Text>
            </View>
          )}
        </View>

        <View style={masonryStyles.priceRow}>
          <Text style={[
            masonryStyles.price,
            hasDiscount && { color: '#DC2626' }
          ]}>
            ₱{regularPrice.toLocaleString()}
          </Text>
          {hasDiscount && (
            <Text style={masonryStyles.originalPrice}>₱{originalPrice.toLocaleString()}</Text>
          )}
        </View>

        <View style={masonryStyles.footer}>
          <View style={masonryStyles.ratingBox}>
            <Star size={10} fill="#F59E0B" color="#F59E0B" />
            <Text style={masonryStyles.ratingText}>{product.rating || 5.0} ({product.review_count || 0})</Text>
          </View>
          <Text style={masonryStyles.soldText}>{(product.sold || product.sales_count || (product as any).sold_count || 0).toLocaleString()} sold</Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  vacationBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vacationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    lineHeight: 16,
    height: 32,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  tag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D97706',
  },
  originalPrice: {
    fontSize: 10,
    color: '#A8A29E',
    textDecorationLine: 'line-through',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    color: '#6B7280',
  },
  soldText: {
    fontSize: 10,
    color: '#6B7280',
  },
  flashProgressContainer: {
    marginTop: 8,
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

ProductCard.displayName = 'ProductCard';

const masonryStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: "100%",
    backgroundColor: "#F3F4F6",
    position: 'relative',
  },
  image: {
    width: "100%",
    aspectRatio: 1,
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D97706',
  },
  originalPrice: {
    fontSize: 10,
    color: '#A8A29E',
    textDecorationLine: 'line-through',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    color: '#6B7280',
  },
  soldText: {
    fontSize: 10,
    color: '#6B7280',
  },
  discountBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  vacationBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vacationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '600',
  }
});
