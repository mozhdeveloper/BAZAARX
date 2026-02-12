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
import { CheckCircle, HelpCircle } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Order } from '../src/types';
import { safeImageUri } from '../src/utils/imageUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderConfirmation'>;

export default function OrderConfirmation({ navigation, route }: Props) {
  const { order } = route.params as { order: Order };
  
  const handleViewPurchases = () => {
    navigation.navigate('Orders', {});
  };

  const handleViewOrderStatus = () => {
    navigation.navigate('DeliveryTracking', { order });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <CheckCircle size={64} color="#FF5722" strokeWidth={3} />
        </View>

        {/* Product Thumbnails */}
        <View style={styles.thumbnailsContainer}>
          {order.items.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.thumbnailWrapper}>
              <Image
                source={{ uri: safeImageUri(item.image) }}
                style={styles.thumbnail}
              />
            </View>
          ))}
        </View>

        {/* Success Message */}
        <Text style={styles.successTitle}>Checkout Successful.</Text>
        <Text style={styles.successSubtitle}>
          Your order has been confirmed and {order.isPaid ? 'paid successfully' : 'will be paid on delivery'}!
        </Text>

        {/* Order Info */}
        <View style={styles.orderInfo}>
          <Text style={styles.totalAmount}>₱{order.total.toLocaleString()}</Text>
          <Text style={styles.orderId}>Order #{order.transactionId}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleViewPurchases}
          >
            <Text style={styles.primaryButtonText}>See My Purchases</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleViewOrderStatus}
          >
            <Text style={styles.secondaryButtonText}>See Order Status</Text>
          </Pressable>

          <Pressable
            style={styles.helpButton}
            onPress={() => {}}
          >
            <HelpCircle size={18} color="#FF5722" strokeWidth={2.5} />
            <Text style={styles.helpButtonText}>I need help with this</Text>
          </Pressable>
        </View>

        {/* You might also like section */}
        <View style={styles.recommendationsSection}>
          <View style={styles.recommendationsHeader}>
            <Text style={styles.recommendationsTitle}>💡 You might also like</Text>
            <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Shop', params: {} })}>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </View>
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
  content: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF4ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  thumbnailWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  orderInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF5722',
    letterSpacing: 0.3,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  helpButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF5722',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  recommendationsSection: {
    width: '100%',
    marginTop: 40,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5722',
  },
});
