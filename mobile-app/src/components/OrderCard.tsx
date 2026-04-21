import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Calendar, MapPin, Eye, Copy, MessageCircle, Star, RotateCcw, ArrowRight } from 'lucide-react-native';
import { Order } from '../types';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../constants/theme';

interface OrderCardProps {
  order: Order & { review?: any };
  onPress: () => void;
  onTrack?: () => void;
  onCancel?: () => void;
  onReceive?: () => void;
  onReview?: () => void;
  onReturn?: () => void;
  onBuyAgain?: (order: Order) => void;
  onShopPress?: (shopId: string) => void;
}

export const OrderCard: React.FC<OrderCardProps> = React.memo(({
  order,
  onPress,
  onTrack,
  onCancel,
  onReceive,
  onReview,
  onReturn,
  onBuyAgain,
  onShopPress
}) => {
  const buyerUiStatus = order.buyerUiStatus || (
    order.status === 'processing'
      ? 'processing'
      : order.status === 'shipped'
        ? 'shipped'
        : order.status === 'delivered'
          ? (order as any).shipment_status === 'received' ? 'received' : 'delivered'
          : order.status === 'cancelled'
            ? 'cancelled'
            : 'processing'
  );

  const getStatusColor = () => {
    switch (buyerUiStatus) {
      case 'processing':
        return '#3B82F6'; // Blue
      case 'shipped':
        return '#8B5CF6'; // Violet
      case 'delivered':
        return '#22C55E'; // Green
      case 'received':
        return '#3B82F6'; // Blue
      case 'reviewed':
        return '#16A34A';
      case 'returned':
        return '#F97316';
      case 'cancelled':
        return '#EF4444'; // Red
      default:
        return '#6B7280';
    }
  };

  const getStatusText = () => {
    switch (buyerUiStatus) {
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'received':
        return 'Received';
      case 'reviewed':
        return 'Reviewed';
      case 'returned':
        return 'Return/Refund';
      case 'cancelled':
        return 'Cancelled';
      default:
        return buyerUiStatus;
    }
  };

  const handleCopyOrderId = async () => {
    await Clipboard.setStringAsync(order.transactionId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
          <Pressable style={{ flexShrink: 1 }} onPress={() => shopId && onShopPress?.(shopId)}>
            <Text style={styles.shopName} numberOfLines={1}>{shopName} {'>'}</Text>
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
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
            {/* Second Image (Offset) if multiple items */}
            {itemCount > 1 && order.items[1] && (
              <View style={styles.offsetImageContainer}>
                <Image
                  source={{ uri: order.items[1].image || 'https://via.placeholder.com/80' }}
                  style={[styles.productImage, { opacity: 0.5 }]}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              </View>
            )}
            {/* More Items Overlay */}
            {itemCount > 1 && (
              <View style={styles.moreItemsOverlay}>
                <ArrowRight size={20} color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.productDetails}>
            <Text style={styles.productTitle} numberOfLines={2}>
            {firstItem.name}
          </Text>
          {/* Display variant information with dynamic labels */}
          {'selectedVariant' in firstItem && firstItem.selectedVariant && (firstItem.selectedVariant.option1Value || firstItem.selectedVariant.option2Value || firstItem.selectedVariant.size || firstItem.selectedVariant.color) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 4 }}>
              {/* Dynamic option 1 */}
              {firstItem.selectedVariant.option1Value && (
                <Text style={{ fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                  {firstItem.selectedVariant.option1Label || 'Option'}: {firstItem.selectedVariant.option1Value}
                </Text>
              )}
              {/* Dynamic option 2 */}
              {firstItem.selectedVariant.option2Value && (
                <Text style={{ fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                  {firstItem.selectedVariant.option2Label || 'Option'}: {firstItem.selectedVariant.option2Value}
                </Text>
              )}
              {/* Legacy size fallback */}
              {!firstItem.selectedVariant.option1Value && !firstItem.selectedVariant.option2Value && firstItem.selectedVariant.size && (
                <Text style={{ fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                  {firstItem.selectedVariant.size}
                </Text>
              )}
              {/* Legacy color fallback */}
              {!firstItem.selectedVariant.option1Value && !firstItem.selectedVariant.option2Value && firstItem.selectedVariant.color && (
                <Text style={{ fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                  {firstItem.selectedVariant.color}
                </Text>
              )}
            </View>
          )}
          <Text style={styles.quantityText}>x{firstItem.quantity}</Text>
            <View style={styles.summaryRow}>
              <View>
                {order.etaText && <Text style={{fontSize: 12, color: '#6B7280', marginBottom: 4}}>ETA: {order.etaText}</Text>}
                <Text style={styles.summaryText}>
                  Total ({itemCount} items): <Text style={styles.totalPrice}>₱{order.total.toLocaleString()}</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        {buyerUiStatus === 'processing' && (
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

        {(buyerUiStatus === 'shipped' || buyerUiStatus === 'delivered') && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[styles.outlineButton, { flex: 1 }]} onPress={onPress}>
              <MessageCircle size={14} color="#4B5563" style={{ marginRight: 4 }} />
              <Text style={styles.outlineButtonText}>Chat with Seller</Text>
            </Pressable>
            <Pressable style={[styles.solidButton, { flex: 1 }]} onPress={onPress}>
              <Text style={styles.solidButtonText}>Track</Text>
            </Pressable>
          </View>
        )}

        {buyerUiStatus === 'delivered' && onReceive && (
          <Pressable style={[styles.solidButton, { backgroundColor: '#16A34A' }]} onPress={onReceive}>
            <Text style={styles.solidButtonText}>Confirm Received</Text>
          </Pressable>
        )}

        {buyerUiStatus === 'received' && (
          <View style={{ flex: 1, gap: 8 }}>
            {onReturn ? (
              // STACKED: within 7-day window — Buy Again on top, Write Review + Return/Refund below
              <>
                <Pressable
                  style={[styles.solidButton, { width: '100%' }]}
                  onPress={() => onBuyAgain ? onBuyAgain(order) : onPress()}
                >
                  <Text style={[styles.solidButtonText, { textAlign: 'center' }]}>Buy Again</Text>
                </Pressable>
                <View style={styles.buttonRow}>
                  <Pressable style={[styles.outlineButton, { flex: 1, borderColor: '#D97706' }]} onPress={onReview}>
                    <Text style={[styles.outlineButtonText, { color: '#D97706' }]}>Write Review</Text>
                  </Pressable>
                  <Pressable style={[styles.returnButton, { flex: 1 }]} onPress={onReturn}>
                    <RotateCcw size={13} color="#B45309" strokeWidth={2.5} />
                    <Text style={styles.returnButtonText}>Return/Refund</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              // UNSTACKED: outside 7-day window — Write Review (left) + Buy Again (right) side by side
              <View style={styles.buttonRow}>
                <Pressable style={[styles.outlineButton, { flex: 1, borderColor: '#D97706' }]} onPress={onReview}>
                  <Text style={[styles.outlineButtonText, { color: '#D97706' }]}>Write Review</Text>
                </Pressable>
                <Pressable style={[styles.solidButton, { flex: 1 }]} onPress={() => onBuyAgain ? onBuyAgain(order) : onPress()}>
                  <Text style={[styles.solidButtonText, { textAlign: 'center' }]}>Buy Again</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {buyerUiStatus === 'reviewed' && (
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.buttonRow}>
              <Pressable style={[styles.outlineButton, { flex: 1 }]} onPress={onPress}>
                <Text style={styles.outlineButtonText}>View Details</Text>
              </Pressable>
              <Pressable style={[styles.solidButton, { flex: 1.5 }]} onPress={() => onBuyAgain ? onBuyAgain(order) : onPress()}>
                <Text style={[styles.solidButtonText, { textAlign: 'center' }]}>Buy Again</Text>
              </Pressable>
            </View>
          </View>
        )}

        {buyerUiStatus === 'cancelled' && (
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.buttonRow}>
              <Pressable style={[styles.outlineButton, { flex: 1 }]} onPress={onPress}>
                <Text style={styles.outlineButtonText}>View Details</Text>
              </Pressable>
              <Pressable style={[styles.solidButton, { flex: 1.5 }]} onPress={() => onBuyAgain ? onBuyAgain(order) : onPress()}>
                <Text style={[styles.solidButtonText, { textAlign: 'center' }]}>Buy Again</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Review Section */}
      {buyerUiStatus === 'reviewed' && order.review && (
        <View style={styles.reviewSection}>
          <View style={styles.reviewHeader}>
            <MessageCircle size={16} color={COLORS.primary} />
            <Text style={styles.reviewTitle}>Your Review</Text>
          </View>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={14}
                color={star <= (order.review?.rating || 5) ? '#F59E0B' : '#E5E7EB'}
                fill={star <= (order.review?.rating || 5) ? '#F59E0B' : 'transparent'}
              />
            ))}
          </View>
          {order.review.comment ? (
            <Text style={styles.reviewComment}>"{order.review.comment}"</Text>
          ) : null}
          {order.review.seller_reply ? (
            <View style={styles.sellerReplySection}>
              <Text style={styles.sellerReplyLabel}>Seller's Reply</Text>
              <Text style={styles.sellerReplyText}>
                {typeof order.review.seller_reply === 'string'
                  ? order.review.seller_reply
                  : (order.review.seller_reply as any)?.message || ''}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
});

OrderCard.displayName = 'OrderCard';

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
    flexShrink: 1,
  },
  statusText: {
    fontWeight: '500',
    fontSize: 12,
  },
  metadataRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 6,
    gap: 4,
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
    paddingVertical: 12,
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
    width: 70,
    height: 70,
    zIndex: 3,
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
    lineHeight: 18,
    flexShrink: 1,
  },
  quantityText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
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
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'stretch',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    minHeight: 40,
  },
  returnButtonText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '500',
  },
  solidButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  solidButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  reviewComment: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  sellerReplySection: {
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#D97706',
  },
  sellerReplyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 2,
  },
  sellerReplyText: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
