import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Package, MapPin, CreditCard, ChevronRight, Home } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Order } from '../src/types';
import { safeImageUri } from '../src/utils/imageUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderConfirmation'>;

export default function OrderConfirmationScreen({ route, navigation }: Props) {
  const { order } = route.params;

  useEffect(() => {
    // Prevent going back to checkout
    navigation.addListener('beforeRemove', (e) => {
      if (e.data.action.type === 'GO_BACK') {
        e.preventDefault();
      }
    });
  }, [navigation]);

  const handleViewOrder = () => {
    navigation.navigate('OrderDetail', { order });
  };

  const handleContinueShopping = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  const handleViewAllOrders = () => {
    navigation.navigate('MainTabs', { screen: 'Orders', params: {} });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Success Icon */}
        <View style={styles.successIconContainer}>
          <LinearGradient
            colors={['#FF6A00', '#FF8C42']}
            style={styles.successIconGradient}
          >
            <CheckCircle size={80} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
        </View>

        {/* Success Message */}
        <Text style={styles.title}>Order Placed Successfully!</Text>
        <Text style={styles.subtitle}>
          Your order has been received and is being processed
        </Text>

        {/* Order Number */}
        <View style={styles.orderNumberCard}>
          <Text style={styles.orderNumberLabel}>Order Number</Text>
          <Text style={styles.orderNumber}>#{order.transactionId}</Text>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={20} color="#FF6A00" />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>
          <View style={styles.card}>
            {order.items.map((item, index) => (
              <View
                key={item.id}
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
                  {item.selectedVariant && (item.selectedVariant.size || item.selectedVariant.color) && (
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                      {item.selectedVariant.size && (
                        <Text style={{ fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                          {item.selectedVariant.size}
                        </Text>
                      )}
                      {item.selectedVariant.color && (
                        <Text style={{ fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                          {item.selectedVariant.color}
                        </Text>
                      )}
                    </View>
                  )}
                  <Text style={styles.productQty}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.productPrice}>
                  ₱{((item.price ?? 0) * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₱{order.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color="#FF6A00" />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.addressName}>{order.shippingAddress.name}</Text>
            <Text style={styles.addressPhone}>{order.shippingAddress.phone}</Text>
            <Text style={styles.addressText}>{order.shippingAddress.address}</Text>
            <Text style={styles.addressText}>
              {order.shippingAddress.city}, {order.shippingAddress.postalCode}
            </Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color="#FF6A00" />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.paymentText}>{order.paymentMethod}</Text>
          </View>
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <Text style={styles.stepText}>
              You'll receive an order confirmation email shortly
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <Text style={styles.stepText}>
              Track your order status in the Orders tab
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <Text style={styles.stepText}>
              Estimated delivery: 3-5 business days
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <Pressable onPress={handleViewOrder} style={styles.viewOrderButton}>
            <Text style={styles.viewOrderButtonText}>View Order Details</Text>
            <ChevronRight size={20} color="#FF6A00" />
          </Pressable>

          <Pressable onPress={handleViewAllOrders} style={styles.viewAllOrdersButton}>
            <Text style={styles.viewAllOrdersButtonText}>View All Orders</Text>
          </Pressable>

          <Pressable onPress={handleContinueShopping} style={styles.continueButton}>
            <Home size={20} color="#FFFFFF" />
            <Text style={styles.continueButtonText}>Continue Shopping</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  successIconContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  successIconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  orderNumberCard: {
    backgroundColor: '#FFF5ED',
    borderWidth: 2,
    borderColor: '#FF6A00',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  orderNumberLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6A00',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  productRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productQty: {
    fontSize: 13,
    color: '#6B7280',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6A00',
  },
  addressName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  paymentText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  nextStepsCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginTop: 6,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  buttonsContainer: {
    gap: 12,
  },
  viewOrderButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFF5ED',
    borderWidth: 2,
    borderColor: '#FF6A00',
    gap: 8,
  },
  viewOrderButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6A00',
  },
  viewAllOrdersButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  viewAllOrdersButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  continueButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FF6A00',
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
