import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Calendar, MapPin, Eye, Copy, MessageCircle } from 'lucide-react-native';
import { Order } from '../types';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../constants/theme';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  onTrack?: () => void;
  onCancel?: () => void;
  onReceive?: () => void;
  onReview?: () => void;
  onShopPress?: (shopId: string) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  onTrack,
  onCancel,
  onReceive,
  onReview,
  onShopPress
}) => {
  const getStatusColor = () => {
    switch (order.status) {
      case 'pending':
        return '#F59E0B'; // Yellow
      case 'processing':
        return '#3B82F6'; // Blue
      case 'shipped':
        return '#8B5CF6'; // Violet
      case 'delivered':
        return '#22C55E'; // Green
      case 'cancelled':
        return '#EF4444'; // Red
      default:
        return '#6B7280';
    }
  };

  const getStatusText = () => {
    switch (order.status) {
      case 'pending':
        return 'To Pay';
      case 'processing':
        return 'To Ship';
      case 'shipped':
        return 'To Receive';
      case 'delivered':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return order.status;
    }
  };

  const handleCopyOrderId = async () => {
    await Clipboard.setStringAsync(order.transactionId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Safety check for empty items - Relaxed for debugging
  const hasItems = order.items && order.items.length > 0;
  const firstItem = hasItems ? order.items[0] : {
    id: 'unknown',
    name: 'Order Details Unavailable',
    quantity: 0,
    image: '',
    seller: 'Unknown Shop',
    sellerId: ''
  };
  const itemCount = hasItems ? order.items.length : 0;
  const shopName = firstItem.seller || 'Shop Name';
  const shopId = firstItem.sellerId;

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => shopId && onShopPress?.(shopId)}>
            <Text style={styles.shopName}>{shopName} {'>'}</Text>
          </Pressable>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        <View style={styles.metadataRow}>
          <Text style={styles.dateText}>{formatDate(order.createdAt)}</Text>
          <Pressable style={styles.orderIdContainer} onPress={handleCopyOrderId}>
            <Text style={styles.orderIdText}>ID: {order.transactionId}</Text>
            <Copy size={12} color="#6B7280" style={{ marginLeft: 4 }} />
          </Pressable>
        </View>
      </View>

      <Pressable onPress={onPress}>
        {/* Product Section */}
        <View style={styles.productSection}>
          <View style={styles.imageStack}>
            {/* First Image */}
            <Image
              source={{ uri: firstItem.image || 'https://via.placeholder.com/80' }}
              style={styles.productImage}
            />
            {/* Second Image (Offset) if multiple items */}
            {itemCount > 1 && order.items[1] && (
              <View style={styles.offsetImageContainer}>
                <Image
                  source={{ uri: order.items[1].image || 'https://via.placeholder.com/80' }}
                  style={[styles.productImage, { opacity: 0.5 }]}
                />
                <View style={styles.moreItemsOverlay}>
                  <Text style={styles.moreItemsText}>+{itemCount - 1}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.productDetails}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {firstItem.name}
            </Text>
            <Text style={styles.quantityText}>x{firstItem.quantity}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>
                Total ({itemCount} items): <Text style={styles.totalPrice}>₱{order.total.toLocaleString()}</Text>
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        {order.status === 'pending' && (
          <>
            {onCancel && (
              <Pressable style={styles.outlineButton} onPress={onCancel}>
                <Text style={styles.outlineButtonText}>Cancel Order</Text>
              </Pressable>
            )}
            <Pressable style={styles.solidButton} onPress={onPress}>
              <Text style={styles.solidButtonText}>View Details</Text>
            </Pressable>
          </>
        )}

        {order.status === 'processing' && (
          <Pressable style={styles.solidButton} onPress={onPress}>
            <Text style={styles.solidButtonText}>View Details</Text>
          </Pressable>
        )}

        {order.status === 'shipped' && (
          <>
            {onReceive && (
              <Pressable style={styles.solidButton} onPress={onReceive}>
                <Text style={styles.solidButtonText}>Order Received</Text>
              </Pressable>
            )}
            <Pressable style={styles.outlineButton} onPress={onPress}>
              <Text style={styles.outlineButtonText}>View Details</Text>
            </Pressable>
          </>
        )}

        {order.status === 'delivered' && (
          <>
            {onReview && (
              <Pressable style={styles.outlineButton} onPress={onReview}>
                <Text style={styles.outlineButtonText}>Review</Text>
              </Pressable>
            )}
            <Pressable style={styles.solidButton} onPress={onPress}>
              <Text style={styles.solidButtonText}>View Details</Text>
            </Pressable>
          </>
        )}

        {order.status === 'cancelled' && (
          <Pressable style={styles.solidButton} onPress={onPress}>
            <Text style={styles.solidButtonText}>View Details</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#111827',
  },
  statusText: {
    fontWeight: '500',
    fontSize: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdText: {
    fontSize: 12,
    color: '#6B7280',
  },
  productSection: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  imageStack: {
    width: 70,
    height: 70,
    marginRight: 12,
    position: 'relative',
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
  },
  offsetImageContainer: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 70,
    height: 70,
    zIndex: 1,
  },
  moreItemsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  moreItemsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  quantityText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  summaryText: {
    fontSize: 12,
    color: '#111827',
  },
  totalPrice: {
    fontWeight: '600',
    color: '#F59E0B', // Default Brand Color, can be customized
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  solidButton: {
    backgroundColor: COLORS.primary, // Primary Color
    paddingHorizontal: 16, // Reduced padding for better fit on small screens
    paddingVertical: 8,
    borderRadius: 4,
  },
  solidButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  outlineButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
});
