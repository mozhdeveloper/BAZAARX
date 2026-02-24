import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, HelpCircle, Package, ChevronRight, Home, Flame } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Order } from '../src/types';
import { safeImageUri } from '../src/utils/imageUtils';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderConfirmation'>;

export default function OrderConfirmation({ navigation, route }: Props) {
  const { order, earnedBazcoins = 0 } = route.params as { order: Order; earnedBazcoins?: number };
  
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
            Your order has been confirmed and {order.isPaid ? 'paid successfully' : 'will be paid on delivery'}!
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

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>₱{order.total.toLocaleString()}</Text>
              </View>
            </View>
          </View>

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
