import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
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

export const CartItemRow: React.FC<CartItemRowProps> = ({
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
        <Image source={{ uri: safeImageUri(item.image) }} style={styles.image} resizeMode="cover" />
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
            if (sv.option1Value) parts.push(`${sv.option1Label || 'Option 1'}: ${sv.option1Value}`);
            if (sv.option2Value) parts.push(`${sv.option2Label || 'Option 2'}: ${sv.option2Value}`);
          } else {
            if (sv.color) parts.push(`Color: ${sv.color}`);
            if (sv.size) parts.push(`Size: ${sv.size}`);
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
            <Text style={[styles.price, (!!item.originalPrice && item.originalPrice > (item.price || 0)) ? { color: '#EF4444' } : null]}>
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
            iconColor="#9CA3AF"
          />

          <Pressable onPress={onRemove} style={styles.removeButton}>
            <Trash2 size={18} color="#9d9d9dff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

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
    backgroundColor: '#F8FAFC',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12, // Reduced spacing
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  seller: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 0,
    letterSpacing: -0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  originalPrice: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // Explicit gap between stepper and delete icon
    marginTop: 8,
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
