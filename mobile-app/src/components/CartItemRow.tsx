import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import { ChevronDown } from 'lucide-react-native';
import { CartItem } from '../types';
import { safeImageUri } from '../utils/imageUtils';
import { COLORS } from '../constants/theme';

interface CartItemRowProps {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (val: number) => void;
  onRemove: () => void;
  onEdit?: () => void;
  onPress?: () => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = React.memo(({
  item,
  onRemove,
  onEdit,
  onPress,
}) => {
  const hasVariant = !!(item.selectedVariant && (
    item.selectedVariant.variantId ||
    item.selectedVariant.option1Value ||
    item.selectedVariant.option2Value ||
    item.selectedVariant.size ||
    item.selectedVariant.color
  ));
  // Resolve stock: prefer matched variant stock, fallback to product stock
  const stock = (() => {
    if (item.selectedVariant?.variantId && item.variants) {
      const v = item.variants.find(v => v.id === item.selectedVariant?.variantId);
      if (v) return v.stock;
    }
    return item.stock ?? null;
  })();
  const isOutOfStock = stock !== null && stock === 0;
  const lowStockThreshold = item.low_stock_threshold ?? 10;
  const isLowStock = stock !== null && stock > 0 && stock <= lowStockThreshold;

  // Out of stock + has variant → show Change Variant button on the right
  const showChangeVariantBtn = isOutOfStock && hasVariant && !!onEdit;
  // Out of stock + no variant → show Remove button on the right
  const showRemoveBtn = isOutOfStock && !hasVariant;

  const variantParts = (() => {
    if (!item.selectedVariant) return [];
    const sv = item.selectedVariant;
    const parts: string[] = [];
    if (sv.option1Value || sv.option2Value) {
      if (sv.option1Value) parts.push(sv.option1Value);
      if (sv.option2Value) parts.push(sv.option2Value);
    } else {
      if (sv.size) parts.push(sv.size);
      if (sv.color) parts.push(sv.color);
    }
    return parts;
  })();

  return (
    <View style={styles.container}>
      <Pressable onPress={onPress}>
        <View>
          <Image source={{ uri: safeImageUri(item.image) }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" transition={150} />
          {(isOutOfStock || isLowStock) && (
            <View style={[styles.stockBadge, isOutOfStock ? styles.stockBadgeOos : styles.stockBadgeAvail]}>
              <Text style={styles.stockBadgeText}>
                {isOutOfStock ? 'Out of Stock' : `Only ${stock} left`}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.infoContainer}>
        <Pressable onPress={onPress}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        </Pressable>

        {/* Tappable dropdown chip — only when in stock */}
        {!isOutOfStock && variantParts.length > 0 && (
          <Pressable
            onPress={onEdit}
            disabled={!onEdit}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', marginBottom: 4, opacity: pressed ? 0.7 : 1 })}
          >
            <View style={styles.variantChip}>
              <Text style={styles.variantChipText}>{variantParts.join(' · ')}</Text>
              {onEdit && <ChevronDown size={12} color="#6B7280" style={{ marginLeft: 4 }} />}
            </View>
          </Pressable>
        )}

        <Pressable onPress={onPress}>
          <View style={styles.priceContainer}>
            <Text style={[styles.price, (!!item.originalPrice && item.originalPrice > (item.price || 0)) ? { color: '#DC2626' } : null]}>
              ₱{(item.price ?? 0).toLocaleString()}
            </Text>
            {!!item.originalPrice && item.originalPrice > (item.price || 0) && (
              <Text style={styles.originalPrice}>₱{item.originalPrice.toLocaleString()}</Text>
            )}
          </View>
        </Pressable>

        {/* Action buttons below price — only when out of stock */}
        {(showRemoveBtn || showChangeVariantBtn) && (
          <View style={styles.actionRow}>
            {showRemoveBtn && (
              <Pressable
                onPress={onRemove}
                style={({ pressed }) => [styles.actionBtn, styles.actionBtnRemove, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.actionBtnText, styles.actionBtnTextRemove]}>Remove</Text>
              </Pressable>
            )}
            {showChangeVariantBtn && (
              <Pressable
                onPress={onEdit}
                style={({ pressed }) => [styles.actionBtn, styles.actionBtnVariant, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.actionBtnText, styles.actionBtnTextVariant]}>Change Variant</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

CartItemRow.displayName = 'CartItemRow';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingRight: 4,
    flex: 1,
    alignItems: 'flex-start',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  stockBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    alignItems: 'center',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  stockBadgeOos: { backgroundColor: 'rgba(220,38,38,0.82)' },
  stockBadgeAvail: { backgroundColor: 'rgba(0,0,0,0.45)' },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'flex-start',
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginVertical: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  actionBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionBtnVariant: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FDE68A',
  },
  actionBtnRemove: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionBtnTextVariant: {
    color: '#92400E',
  },
  actionBtnTextRemove: {
    color: '#DC2626',
  },

  // NEW STYLES
  variantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignSelf: 'flex-start',
  },
  variantChipText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  // Legacy styles (can be removed or kept for safety)
  editVariantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  editVariantText: {
    fontSize: 11,
    color: '#4B5563',
    marginLeft: 4,
    fontWeight: '500',
  },
});
