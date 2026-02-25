import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Calendar, MapPin, Eye } from 'lucide-react-native';
import { Order } from '../types';
import { BadgePill } from './BadgePill';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  onTrack?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress, onTrack }) => {
  const getStatusColor = () => {
    switch (order.status) {
      case 'pending':
        return '#F59E0B';
      case 'processing':
        return '#3B82F6';
      case 'shipped':
        return '#8B5CF6';
      case 'delivered':
        return '#22C55E';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = () => {
    switch (order.status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      default:
        return order.status;
    }
  };

  // Safety check for empty items
  if (!order.items || order.items.length === 0) {
    return null;
  }

  const firstItem = order.items[0];

  return (
    <Pressable 
      onPress={onPress} 
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      android_ripple={{ color: '#FEF3E8' }}
    >
      {/* Status Badge at Top */}
      <View style={styles.topSection}>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        <Text style={styles.transactionId}>{order.transactionId}</Text>
      </View>

      {/* Product Preview */}
      <View style={styles.productSection}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: firstItem.image || 'https://via.placeholder.com/80' }} 
            style={styles.thumbnail} 
          />
          {order.items.length > 1 && (
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>+{order.items.length - 1}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {firstItem.name}
          </Text>
          <View style={styles.infoRow}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.infoText}>{order.scheduledDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.infoText} numberOfLines={1}>
              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer with Price and Actions */}
      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Total Amount</Text>
          <Text style={styles.price}>₱{order.total.toLocaleString()}</Text>
        </View>
        <View style={styles.actions}>
          {order.status === 'delivered' ? (
            <Pressable 
              onPress={onPress} 
              style={({ pressed }) => [
                styles.actionButton,
                styles.viewButton,
                pressed && styles.actionButtonPressed,
              ]}
            >
              <Eye size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>View</Text>
            </Pressable>
          ) : onTrack ? (
            <Pressable 
              onPress={onTrack}
              style={({ pressed }) => [
                styles.actionButton,
                styles.trackButton,
                pressed && styles.actionButtonPressed,
              ]}
            >
              <MapPin size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Track</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  containerPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.12,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  productSection: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 14,
  },
  imageContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  itemCountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF6A00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  itemCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  transactionId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6A00',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.96 }],
    shadowOpacity: 0.1,
  },
  trackButton: {
    backgroundColor: '#22C55E',
  },
  viewButton: {
    backgroundColor: '#FF6A00',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
