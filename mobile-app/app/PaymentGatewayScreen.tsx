import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, CheckCircle, Shield, CreditCard } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Order } from '../src/types';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentGateway'>;

import { useCartStore } from '../src/stores/cartStore';

// ... (existing imports)

export default function PaymentGatewayScreen({ navigation, route }: Props) {
  const { paymentMethod: rawPaymentMethod, order, isQuickCheckout } = route.params as { paymentMethod: string; order: Order; isQuickCheckout?: boolean };
  const paymentMethod = rawPaymentMethod || 'card';
  
  const { clearCart, clearQuickOrder } = useCartStore();
  const [status, setStatus] = useState<'idle' | 'processing' | 'approved'>('idle');
  
  // E-Wallet State
  const [mobileNumber, setMobileNumber] = useState('');
  const [mpin, setMpin] = useState('');

  // Card State
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const insets = useSafeAreaInsets();

  // Derived state for method type
  const methodSlug = paymentMethod.toLowerCase();
  const showCardForm = methodSlug === 'card' || methodSlug === 'paymongo';

  const getMethodName = () => {
    switch (methodSlug) {
      case 'gcash':
        return 'GCash';
      case 'paymongo':
        return 'PayMongo';
      case 'paymaya':
        return 'Maya';
      case 'card':
        return 'Credit/Debit Card';
      default:
        return paymentMethod;
    }
  };

  const getProviderLogo = () => {
    switch (methodSlug) {
      case 'gcash':
        return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/GCash_logo.svg/1200px-GCash_logo.svg.png';
      case 'paymongo':
        return 'https://assets-global.website-files.com/5fa1ba98fbbf0c79e0e9b8e5/5fa2bbdd23434d02fd9fdfce_paymongo_logo.svg';
      case 'paymaya':
        return 'https://www.maya.ph/hubfs/maya-logo-2023.svg';
      case 'card':
        return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png';
      default:
        return 'https://via.placeholder.com/80';
    }
  };

  const isFormValid = () => {
    if (showCardForm) {
      return cardNumber.length >= 16 && expiryDate.length >= 5 && cvv.length >= 3 && cardName.length > 3;
    }
    // GCash/Maya validation
    return mobileNumber.length >= 10 && mpin.length >= 4;
  };

  const handlePayment = () => {
    if (!isFormValid()) return;

    setStatus('processing');

    // Simulate payment processing
    setTimeout(() => {
      setStatus('approved');
      
      // Clear cart/quick order after successful payment
      if (isQuickCheckout) {
        clearQuickOrder();
      } else {
        clearCart();
      }

      // After showing "Payment Approved!", navigate to Track Order screen
      setTimeout(() => {
        navigation.replace('DeliveryTracking', { order });
      }, 1500);
    }, 3000);
  };

  if (status === 'approved') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <CheckCircle size={100} color="#10B981" strokeWidth={2} />
          </View>
          <Text style={styles.successTitle}>Payment Approved!</Text>
          <Text style={styles.successSubtitle}>Your order has been confirmed</Text>
          <Text style={styles.successRedirect}>Redirecting to tracking...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Minimalist White Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            disabled={status === 'processing'}
          >
            <ArrowLeft size={24} color="#374151" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Secure Checkout</Text>
          <View style={styles.securedBadge}>
            <Lock size={16} color="#10B981" strokeWidth={2.5} />
          </View>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Merchant & Amount Summary */}
          <View style={styles.billContainer}>
            <View style={styles.billLeft}>
              <Text style={styles.billLabel}>Total Amount</Text>
              <Text style={styles.billAmount}>₱ {order.total.toLocaleString()}</Text>
            </View>
            <View style={styles.providerLogoContainer}>
              <Image
                source={{ uri: getProviderLogo() }}
                style={styles.providerLogo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Payment Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Enter Payment Details</Text>

            {showCardForm ? (
              // Credit/Debit Card Form (Card & PayMongo)
              <>
                {/* Card Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Card Number</Text>
                  <View style={styles.inputWrapper}>
                    <View style={[styles.prefix, { paddingHorizontal: 12 }]}>
                      <CreditCard size={20} color="#6B7280" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="0000 0000 0000 0000"
                      placeholderTextColor="#9CA3AF"
                      value={cardNumber}
                      onChangeText={(text) => setCardNumber(text.replace(/\D/g, '').substring(0, 16))}
                      keyboardType="number-pad"
                      maxLength={16}
                      editable={status !== 'processing'}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {/* Expiry Date */}
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Expiry Date</Text>
                    <TextInput
                      style={[styles.input, styles.fullWidthInput]}
                      placeholder="MM/YY"
                      placeholderTextColor="#9CA3AF"
                      value={expiryDate}
                      onChangeText={setExpiryDate}
                      keyboardType="number-pad"
                      maxLength={5}
                      editable={status !== 'processing'}
                    />
                  </View>

                  {/* CVV */}
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>CVV / CVC</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, styles.fullWidthInput]}
                        placeholder="123"
                        placeholderTextColor="#9CA3AF"
                        value={cvv}
                        onChangeText={setCvv}
                        keyboardType="number-pad"
                        maxLength={4}
                        secureTextEntry
                        editable={status !== 'processing'}
                      />
                      <View style={styles.inputIconRight}>
                        <Lock size={16} color="#9CA3AF" />
                      </View>
                    </View>
                  </View>
                </View>

                {/* Cardholder Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cardholder Name</Text>
                  <TextInput
                    style={[styles.input, styles.fullWidthInput]}
                    placeholder="Name on Card"
                    placeholderTextColor="#9CA3AF"
                    value={cardName}
                    onChangeText={setCardName}
                    autoCapitalize="characters"
                    editable={status !== 'processing'}
                  />
                </View>
              </>
            ) : (
              // E-Wallet Form (GCash / Maya)
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {methodSlug === 'gcash' ? 'GCash Mobile Number' : 'Maya Mobile Number'}
                  </Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.prefix}>
                      <Text style={styles.prefixText}>+63</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="9XX XXX XXXX"
                      placeholderTextColor="#9CA3AF"
                      value={mobileNumber}
                      onChangeText={setMobileNumber}
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={status !== 'processing'}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {methodSlug === 'gcash' ? 'MPIN' : 'Password / OTP'}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.fullWidthInput]}
                    placeholder={methodSlug === 'gcash' ? "Enter your 4-digit MPIN" : "Enter password"}
                    placeholderTextColor="#9CA3AF"
                    value={mpin}
                    onChangeText={setMpin}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={status !== 'processing'}
                  />
                </View>
              </>
            )}

            {/* Provider Info */}
            <View style={styles.providerInfo}>
              <Shield size={16} color="#6B7280" />
              <Text style={styles.providerInfoText}>
                You'll be charged ₱{order.total.toLocaleString()} via {getMethodName()}
              </Text>
            </View>
          </View>

          {/* Processing Indicator */}
          {status === 'processing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#FF5722" />
              <Text style={styles.processingText}>Connecting to {getMethodName()}...</Text>
              <Text style={styles.processingSubtext}>Please wait while we verify your payment</Text>
            </View>
          )}
        </ScrollView>

        {/* Fixed Bottom Action Bar */}
        <View style={[styles.footerBar, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[
              styles.payButton,
              (!isFormValid() || status === 'processing') && styles.payButtonDisabled
            ]}
            onPress={handlePayment}
            disabled={!isFormValid() || status === 'processing'}
          >
            <Text style={styles.payButtonText}>
              {status === 'processing' ? 'Processing...' : `Pay ₱${order.total.toLocaleString()}`}
            </Text>
          </Pressable>

          {/* Trust Footer */}
          <View style={styles.trustFooter}>
            <Shield size={14} color="#9CA3AF" />
            <Text style={styles.trustText}>256-bit SSL Encrypted • Powered by {getMethodName()}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Minimalist White Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    textAlign: 'center',
  },
  securedBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
  },

  // Scroll Content
  scrollContent: {
    flex: 1,
  },

  // Bill Summary Container
  billContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billLeft: {
    flex: 1,
  },
  billLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  billAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.5,
  },
  providerLogoContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  providerLogo: {
    width: 50,
    height: 50,
  },

  // Payment Form
  formContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: 56,
    justifyContent: 'center',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: 56,
  },
  fullWidthInput: {
    borderRadius: 12,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  providerInfoText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },

  // Processing State
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },

  // Fixed Footer Action Bar
  footerBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  payButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  trustText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Success Screen
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  successRedirect: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  inputIconRight: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
});
