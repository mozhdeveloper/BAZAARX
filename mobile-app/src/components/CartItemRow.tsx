import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Trash2, ChevronDown } from 'lucide-react-native';
import { CartItem } from '../types';
import { QuantityStepper } from './QuantityStepper';
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
  onChange,
  onRemove,
  onEdit,
  onPress,
}) => {
  return (
    <View style={styles.container}>
      <Pressable onPress={onPress}>
        <Image source={{ uri: safeImageUri(item.image) }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" transition={150} />
      </Pressable>

      <View style={styles.infoContainer}>
        <Pressable onPress={onPress}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
        </Pressable>
        {/* Variant Info (Tap to Edit) */}
        {item.selectedVariant && (() => {
          // Build combined variant label text
          const parts: string[] = [];
          const sv = item.selectedVariant;
          if (sv.option1Value || sv.option2Value) {
            if (sv.option1Value) parts.push(sv.option1Value);
            if (sv.option2Value) parts.push(sv.option2Value);
          } else {
            if (sv.size) parts.push(sv.size);
            if (sv.color) parts.push(sv.color);
          }
          if (parts.length === 0) return null;
          return (
            <Pressable
              onPress={onEdit}
              disabled={!onEdit}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={styles.variantChip}>
                <Text style={styles.variantChipText}>{parts.join(' · ')}</Text>
                {onEdit && (
                  <ChevronDown size={12} color="#6B7280" style={{ marginLeft: 4 }} />
                )}
              </View>
            </Pressable>
          );
        })()}

        <Pressable onPress={onPress}>
          <View style={styles.priceContainer}>
            <Text style={[styles.price, (!!item.originalPrice && item.originalPrice > (item.price || 0)) ? { color: '#92400E' } : null]}>
              ₱{(item.price ?? 0).toLocaleString()}
            </Text>
            {!!item.originalPrice && item.originalPrice > (item.price || 0) && (
              <Text style={styles.originalPrice}>
                ₱{item.originalPrice.toLocaleString()}
              </Text>
            )}
          </View>
        </Pressable>

        <View style={styles.actionsContainer}>
          <QuantityStepper
            value={item.quantity}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            onChange={onChange}
            max={item.stock} // Pass correct stock limit
            min={1}
            variant="compact"
          />
        </View>
      </View>
    </View>
  );
});

CartItemRow.displayName = 'CartItemRow';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    // REMOVED: backgroundColor, borderRadius, shadow, and elevation 
    // This allows the component to be "transparent" and sit inside the parent card
    paddingVertical: 12,
    paddingRight: 12,
    flex: 1,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#000', // Black background for square feel like vinyl
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'flex-start',
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 22,
  },
  variantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4, // Adjusted from 8
    alignSelf: 'flex-start',
  },
  variantChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginVertical: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
  },
  removeButton: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // NEW STYLES
  variantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
