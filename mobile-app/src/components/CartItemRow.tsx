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
  onIncrement,
  onDecrement,
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
  // Resolve stock: only use variant-level stock when the product has real selectable variants,
  // otherwise always use product-level stock to avoid bare default variants returning wrong stock=0
  const stock = (() => {
    const hasRealVariants = !!(item.variants && item.variants.some(v =>
      v.option_1_value || v.option_2_value || v.size || v.color
    ));
    if (hasRealVariants && item.selectedVariant?.variantId && item.variants) {
      const v = item.variants.find(v => v.id === item.selectedVariant?.variantId);
      if (v) return v.stock;
    }
    return item.stock ?? null;
  })();
  const isOutOfStock = stock !== null && stock === 0;
  const lowStockThreshold = item.low_stock_threshold ?? 10;
  const isLowStock = stock !== null && stock > 0 && stock <= lowStockThreshold;

  // Out of stock + has variant + at least one other variant has stock > 0 → show Change Variant
  const hasInStockVariant = !!(item.variants && item.variants.some(v =>
    (v.option_1_value || v.option_2_value || v.size || v.color) && v.stock > 0
  ));
  const showChangeVariantBtn = isOutOfStock && hasVariant && hasInStockVariant && !!onEdit;
  // Out of stock + no selectable variants → show Remove button
  const showRemoveBtn = isOutOfStock && !showChangeVariantBtn;

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
      <Pressable onPress={onPress} style={{ opacity: isOutOfStock ? 0.5 : 1 }}>
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
        <View style={{ opacity: isOutOfStock ? 0.5 : 1 }}>
          <Pressable onPress={onPress}>
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          </Pressable>

        {/* Variant chip — always show so user knows what went out of stock */}
        {variantParts.length > 0 && (
          <Pressable
            onPress={onEdit}
            disabled={!onEdit || isOutOfStock || (item as any).isUpdating}
            style={({ pressed }) => ({ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: 4, 
              opacity: (pressed || (item as any).isUpdating) ? 0.7 : 1 
            })}
          >
            <View style={styles.variantChip}>
              <Text style={styles.variantChipText}>
                {(item as any).isUpdating ? 'Updating...' : variantParts.join(' · ')}
              </Text>
              {!isOutOfStock && onEdit && !(item as any).isUpdating && <ChevronDown size={12} color="#6B7280" style={{ marginLeft: 4 }} />}
            </View>
          </Pressable>
        )}

        <Pressable onPress={onPress}>
          <View style={styles.priceContainer}>
            <View style={styles.priceWrapper}>
              <Text style={[styles.price, (!!item.originalPrice && item.originalPrice > (item.price || 0)) ? { color: '#DC2626' } : null]}>
                ₱{(item.price ?? 0).toLocaleString()}
              </Text>
              {!!item.originalPrice && item.originalPrice > (item.price || 0) && (
                <Text style={styles.originalPrice}>₱{item.originalPrice.toLocaleString()}</Text>
              )}
            </View>
            
            {/* Discount percentage badge */}
            {!!item.originalPrice && item.originalPrice > (item.price || 0) && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>
                  {Math.round(((item.originalPrice - (item.price || 0)) / item.originalPrice) * 100)}% OFF
                </Text>
              </View>
           )}
          </View>
        </Pressable>
      </View> 
      {/* Closes the opacity wrapper so buttons below stay 100% visible */}

        {/* Quantity stepper — only when in stock */}
        {!isOutOfStock && (
          <View style={styles.quantityRow}>
            <Pressable
              onPress={onDecrement}
              style={({ pressed }) => [styles.qtyBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </Pressable>
            <Text style={styles.qtyCount}>{item.quantity}</Text>
            <Pressable
              onPress={onIncrement}
              style={({ pressed }) => [styles.qtyBtn, { opacity: (stock !== null && item.quantity >= stock) ? 0.35 : pressed ? 0.6 : 1 }]}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>
        )}

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
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  priceWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
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
  discountBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
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

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 30,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  qtyBtnText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    lineHeight: 18,
  },
  qtyCount: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
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
