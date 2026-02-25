import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { CartItem } from '../types';
import { QuantityStepper } from './QuantityStepper';

interface CartItemRowProps {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}) => {
  return (
    <View style={styles.container}>
      <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.seller} numberOfLines={1}>
          {item.seller}
        </Text>
        <Text style={styles.price}>₱{item.price.toLocaleString()}</Text>
        
        <View style={styles.actionsContainer}>
          <QuantityStepper
            value={item.quantity}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
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
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
