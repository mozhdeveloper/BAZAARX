import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';

interface OrderItem {
  productId: string;
  productName: string;
  image: string;
  quantity: number;
  price: number;
  selectedColor?: string;
  selectedSize?: string;
}

interface Order {
  id: string;
  orderId: string;
  type?: 'ONLINE' | 'OFFLINE';
  createdAt: string;
  customerName: string;
  customerEmail?: string;
  posNote?: string;
  status: 'pending' | 'to-ship' | 'completed' | 'cancelled';
  items: OrderItem[];
  total: number;
}

interface OrderCardProps {
  order: Order;
  onPress: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: 'pending' | 'to-ship' | 'completed' | 'cancelled') => Promise<void>;
}

export default function OrderCard({ order, onPress, onUpdateStatus }: OrderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'to-ship':
        return '#FF5722';
      case 'pending':
        return '#FBBF24';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#D1FAE5';
      case 'to-ship':
        return '#FFF5F0';
      case 'pending':
        return '#FEF3C7';
      default:
        return '#F3F4F6';
    }
  };

  const getActionButton = () => {
    switch (order.status) {
      case 'pending':
        return (
          <Pressable
            style={[styles.actionButton, { backgroundColor: '#FF5722' }]}
            onPress={() => onUpdateStatus(order.orderId, 'to-ship')}
          >
            <Text style={styles.actionButtonText}>Arrange Shipment</Text>
          </Pressable>
        );
      case 'to-ship':
        return (
          <Pressable
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => onUpdateStatus(order.orderId, 'completed')}
          >
            <Text style={styles.actionButtonText}>Mark Shipped</Text>
          </Pressable>
        );
      case 'completed':
        return (
          <View style={[styles.actionButton, { backgroundColor: '#E5E7EB' }]}>
            <Text style={[styles.actionButtonText, { color: '#6B7280' }]}>
              Completed
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Pressable style={styles.orderCard} onPress={() => onPress(order)}>
      <View style={styles.orderHeader}>
        {/* Type Badge - Upper Right */}
        {order.type === 'OFFLINE' ? (
          <View style={styles.walkInBadge}>
            <Text style={styles.walkInBadgeText}>POS</Text>
          </View>
        ) : (
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineBadgeText}>Online</Text>
          </View>
        )}
        
        {/* Order Info - Left Side */}
        <View style={styles.orderInfo}>
          <Text
            style={styles.orderId}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {order.orderId}
          </Text>
          
          {/* Date & Customer */}
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
          <Text style={styles.customerName}>{order.customerName}</Text>
          {order.posNote ? (
            <Text style={styles.posNote} numberOfLines={1}>
              Note: {order.posNote}
            </Text>
          ) : (
            <Text style={styles.customerEmail} numberOfLines={1}>
              {order.customerEmail}
            </Text>
          )}
        </View>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.thumbnailsScroll}
      >
        {order.items.map((item, index) => (
          <View key={index} style={styles.thumbnailContainer}>
            <Image source={{ uri: item.image }} style={styles.thumbnail} />
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>x{item.quantity}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.orderFooter}>
        <View>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>
            ₱{order.total.toLocaleString()}
          </Text>
        </View>
        {getActionButton()}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    position: 'relative',
    marginBottom: 16,
  },
  orderInfo: {
    paddingRight: 70, // Make room for the badge
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  posNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  walkInBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  walkInBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  thumbnailsScroll: {
    marginBottom: 16,
  },
  thumbnailContainer: {
    marginRight: 8,
    position: 'relative',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
  },
  quantityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF5722',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  quantityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF5722',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
