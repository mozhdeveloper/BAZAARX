import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, HelpCircle, Package, ChevronRight, Home, Flame, Tag, CreditCard, ArrowLeft } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Order } from '../src/types';
import { safeImageUri } from '../src/utils/imageUtils';
import { COLORS } from '../src/constants/theme';
import { usePaymentStore } from '../src/stores/paymentStore';
import type { PaymentTransaction } from '../src/types/payment.types';
import { supabase } from '../src/lib/supabase';

// Helper function to format date reliably across platforms
const formatDatePH = (dateString: string | Date | null | undefined): string | null => {
  if (!dateString) return null;
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return null;
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  } catch (error) {
    console.warn('[DateFormat] Error formatting date:', dateString, error);
    return null;
  }
};

type Props = NativeStackScreenProps<RootStackParamList, 'OrderConfirmation'>;

export default function OrderConfirmation({ navigation, route }: Props) {
  const { order, earnedBazcoins = 0, isQuickCheckout } = route.params as { order: Order; earnedBazcoins?: number; isQuickCheckout?: boolean };
  const [paymentTx, setPaymentTx] = useState<PaymentTransaction | null>(null);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<Date | null>(null);
  const getTransactionByOrderId = usePaymentStore((s) => s.getTransactionByOrderId);

  // Helper function to map payment method to display text
  const getPaymentMethodDisplay = (): string => {
    if (typeof order.paymentMethod === 'string') {
      const method = order.paymentMethod.toLowerCase();
      if (method === 'cod') return 'Cash on Delivery';
      if (method === 'gcash') return 'GCash';
      if (method === 'card') return 'Card';
      if (method === 'paymongo') return 'PayMongo';
      return order.paymentMethod;
    }
    const type = (order.paymentMethod as any)?.type?.toLowerCase();
    if (type === 'cod') return 'Cash on Delivery';
    if (type === 'gcash') return 'GCash';
    if (type === 'card') return 'Card';
    if (type === 'paymongo') return 'PayMongo';
    return 'Unknown';
  };

  // Helper function to determine order status and styling
  const getOrderStatus = (): { status: string; backgroundColor: string; textColor: string } => {
    const paymentMethod = order.paymentMethod;
    const isCOD = typeof paymentMethod === 'string'
      ? paymentMethod.toLowerCase() === 'cod'
      : (paymentMethod as any)?.type?.toLowerCase() === 'cod';

    if (isCOD) {
      return {
        status: 'Pending',
        backgroundColor: '#FEF3C7',
        textColor: '#92400E',
      };
    }

    return {
      status: 'Confirmed',
      backgroundColor: '#E5E7EB',
      textColor: '#374151',
    };
  };

  useEffect(() => {
    const realOrderId = (order as any).orderId || order.id;
    if (!realOrderId) return;
    
    getTransactionByOrderId(realOrderId)
      .then((tx) => setPaymentTx(tx))
      .catch(() => {});
    
    // First, try to use estimatedDelivery from order object
    if (order.estimatedDelivery) {
      const deliveryDate = typeof order.estimatedDelivery === 'string' 
        ? new Date(order.estimatedDelivery)
        : order.estimatedDelivery;
      if (!isNaN(deliveryDate.getTime())) {
        setEstimatedDeliveryDate(deliveryDate);
        return;
      }
    }
    
    // If not in order, fetch estimated delivery from delivery_bookings for COD deadline
    (async () => {
      try {
        const { data } = await supabase
          .from('delivery_bookings')
          .select('estimated_delivery')
          .eq('order_id', realOrderId)
          .single();
        if (data?.estimated_delivery) {
          setEstimatedDeliveryDate(new Date(data.estimated_delivery));
        }
      } catch (err) {
        // Silently ignore if no delivery booking exists
        console.warn('[OrderConfirmation] Could not fetch estimated delivery:', err);
      }
    })();
  }, [order.id, order.estimatedDelivery]);

  // Handle Android hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true; // Prevent default back behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        subscription.remove();
      };
    }, [isQuickCheckout, navigation])
  );
  
  const handleBack = () => {
    // Navigate back to appropriate screen based on checkout type
    if (isQuickCheckout) {
      // From ProductDetail (Buy Now) - go to Shop tab
      navigation.replace('MainTabs', {
        screen: 'Shop',
        params: {
          category: undefined,
          searchQuery: undefined,
          view: undefined,
        },
      });
    } else {
      // From Cart - go back to Cart tab
      navigation.replace('MainTabs', {
        screen: 'Cart',
        params: undefined,
      });
    }
  };
  
  const handleViewPurchases = () => {
    navigation.navigate('Orders', {});
  };

  const handleViewOrderStatus = () => {
    navigation.navigate('DeliveryTracking', { order });
  };

  return (
    <LinearGradient
      colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Back Button Header */}
        <View style={styles.headerContainer}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Order Confirmation</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <LinearGradient
              colors={[COLORS.primary, '#D97706']}
              style={styles.successIconGradient}
            >
              <CheckCircle size={80} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
          </View>

          {/* Success Message */}
          <Text style={styles.title}>Order Placed Successfully!</Text>
          <Text style={styles.subtitle}>
            Your order has been confirmed. Payment method: {getPaymentMethodDisplay()}
          </Text>


          {/* Rewards Card */}
          {earnedBazcoins > 0 && (
            <View style={styles.rewardsCard}>
              <View style={styles.rewardsIconContainer}>
                <Flame size={24} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              <View style={styles.rewardsInfo}>
                <Text style={styles.rewardsTitle}>Rewards Earned!</Text>
                <Text style={styles.rewardsValue}>You earned {earnedBazcoins.toLocaleString()} Bazcoins</Text>
              </View>
            </View>
          )}

          {/* Order Number Card */}
          <View style={styles.orderNumberCard}>
            <Text style={styles.orderNumberLabel}>Order Number</Text>
            <Text style={styles.orderNumber}>#{order.transactionId}</Text>
          </View>

          {/* Payment Info Card */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CreditCard size={20} color="#D97706" />
              <Text style={styles.sectionTitle}>Payment Information</Text>
            </View>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                <Text style={{ fontSize: 14, color: '#6B7280' }}>Method</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>{getPaymentMethodDisplay()}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#FDF2E9' }}>
                <Text style={{ fontSize: 14, color: '#6B7280' }}>Status</Text>
                <View style={{
                  paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
                  backgroundColor: getOrderStatus().backgroundColor,
                }}>
                  <Text style={{
                    fontSize: 12, fontWeight: '700',
                    color: getOrderStatus().textColor,
                  }}>
                    {getOrderStatus().status}
                  </Text>
                </View>
              </View>
              {paymentTx && (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#FDF2E9' }}>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>Amount</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary }}>₱{paymentTx.amount.toLocaleString()}</Text>
                  </View>
                  {paymentTx.gatewayPaymentIntentId && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#FDF2E9' }}>
                      <Text style={{ fontSize: 14, color: '#6B7280' }}>Transaction ID</Text>
                      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{paymentTx.gatewayPaymentIntentId.slice(0, 16)}...</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Package size={20} color="#D97706" />
              <Text style={styles.sectionTitle}>Order Summary</Text>
            </View>
            <View style={styles.card}>
              {order.items.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.productRow,
                    index < order.items.length - 1 && styles.productRowBorder,
                  ]}
                >
                  <Image
                    source={{ uri: safeImageUri(item.image) }}
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.productQty}>Qty: {item.quantity}</Text>
                  </View>
                  <Text style={styles.productPrice}>
                    ₱{((item.price ?? 0) * item.quantity).toLocaleString()}
                  </Text>
                </View>
              ))}

              {/* Campaign Discount */}
              {(order as any).campaignDiscounts && (order as any).campaignDiscounts.length > 0 && (order as any).campaignDiscounts[0].discountAmount > 0 && (
                <View style={styles.totalRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Tag size={14} color="#DC2626" />
                    <Text style={[styles.totalLabel, { marginLeft: 4 }]}>
                      Campaign Discount
                    </Text>
                  </View>
                  <Text style={[styles.totalAmount, { color: '#DC2626' }]}>
                    -₱{(order as any).campaignDiscounts[0].discountAmount?.toLocaleString()}
                  </Text>
                </View>
              )}

              {/* Voucher Discount */}
              {order.voucherInfo && (order.voucherInfo.discountAmount || 0) > 0 && (
                <View style={styles.totalRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Tag size={14} color="#10B981" />
                    <Text style={[styles.totalLabel, { marginLeft: 4 }]}>
                      Voucher {order.voucherInfo.code && `(${order.voucherInfo.code})`}
                    </Text>
                  </View>
                  <Text style={[styles.totalAmount, { color: '#10B981' }]}>
                    -₱{order.voucherInfo.discountAmount?.toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>₱{order.total.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* COD Payment Instruction Section */}
          {(() => {
            const paymentMethod = order.paymentMethod;
            const isCOD = typeof paymentMethod === 'string'
              ? paymentMethod.toLowerCase() === 'cod'
              : (paymentMethod as any)?.type?.toLowerCase() === 'cod';
            
            if (!isCOD) return null;
            
            const formattedDeadline = formatDatePH(estimatedDeliveryDate);
            
            return (
              <View style={styles.section}>
                <View style={styles.codInstructionBox}>
                  <Text style={styles.codTitle}>💳 Payment on Delivery</Text>
                  <Text style={styles.codText}>
                    You'll pay the full amount to the delivery driver when they arrive. Please have the exact amount ready.
                  </Text>
                  {formattedDeadline && (
                    <Text style={styles.codDeadline}>
                      Payment Due: {formattedDeadline}
                    </Text>
                  )}
                </View>
              </View>
            );
          })()}

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.viewOrderButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleViewOrderStatus}
            >
              <Text style={styles.viewOrderButtonText}>Track Order Status</Text>
              <ChevronRight size={20} color={COLORS.primary} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.viewAllOrdersButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleViewPurchases}
            >
              <Text style={styles.viewAllOrdersButtonText}>See My Purchases</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.continueButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            >
              <Home size={20} color="#FFFFFF" />
              <Text style={styles.continueButtonText}>Continue Shopping</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeadline,
  },
  successIconContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  successIconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textHeadline,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  orderNumberCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  orderNumberLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827', // Black
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  productRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#FDF2E9',
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  productInfo: {
    flex: 1,
    marginLeft: 16,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textHeadline,
    marginBottom: 6,
  },
  productQty: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textHeadline,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FDF2E9',
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textHeadline,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  codInstructionBox: {
    backgroundColor: '#FFFBF0',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  codTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  codText: {
    fontSize: 12,
    color: '#7C2D12',
    lineHeight: 16,
  },
  codDeadline: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  buttonsContainer: {
    gap: 16,
  },
  viewOrderButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: 8,
  },
  viewOrderButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  viewAllOrdersButton: {
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewAllOrdersButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  continueButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  rewardsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    marginHorizontal: 4,
    marginBottom: 24,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  rewardsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FB8C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#FB8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rewardsInfo: {
    flex: 1,
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A3412',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rewardsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#431407',
    marginTop: 2,
  },
});
