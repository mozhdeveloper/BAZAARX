import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { CartItem } from '../types';
import { QuantityStepper } from './QuantityStepper';
import { safeImageUri } from '../utils/imageUtils';

interface CartItemRowProps {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (val: number) => void;
  onRemove: () => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  onIncrement,
  onDecrement,
  onChange,
  onRemove,
}) => {
  return (
    <View style={styles.container}>
      <Image source={{ uri: safeImageUri(item.image) }} style={styles.image} resizeMode="cover" />

      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        {item.selectedVariant && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {/* Dynamic variant labels (option1/option2) */}
            {item.selectedVariant.option1Value && (
              <Text style={{ fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                {item.selectedVariant.option1Label || 'Option'}: {item.selectedVariant.option1Value}
              </Text>
            )}
            {item.selectedVariant.option2Value && (
              <Text style={{ fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                {item.selectedVariant.option2Label || 'Option'}: {item.selectedVariant.option2Value}
              </Text>
            )}
            {/* Legacy fallback for size/color if no option values */}
            {!item.selectedVariant.option1Value && !item.selectedVariant.option2Value && (
              <>
                {item.selectedVariant.size && (
                  <Text style={{ fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                    Size: {item.selectedVariant.size}
                  </Text>
                )}
                {item.selectedVariant.color && (
                  <Text style={{ fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                    Color: {item.selectedVariant.color}
                  </Text>
                )}
              </>
            )}
          </View>
        )}
        <Text style={styles.seller} numberOfLines={1}>
          {item.seller}
        </Text>
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

        <View style={styles.actionsContainer}>
          <QuantityStepper
            value={item.quantity}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            onChange={onChange}
            max={item.stock} // Pass correct stock limit
            min={1}
          />

          <Pressable onPress={onRemove} style={styles.removeButton}>
            <Trash2 size={18} color="#EF4444" />
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
    color: '#FF5722',
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
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
  },
});
