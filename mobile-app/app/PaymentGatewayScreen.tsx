import React, { useEffect, useState, useCallback } from 'react';
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
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Lock, CheckCircle, Shield, CreditCard, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Order } from '../src/types';
import { COLORS } from '../src/constants/theme';
import { BASIC_TEST_CARDS, SCENARIO_TEST_CARDS, getTestCardByNumber } from '../src/constants/testCards';
import { AlertCircle } from 'lucide-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentGateway'>;

import { useCartStore } from '../src/stores/cartStore';
import { usePaymentStore } from '../src/stores/paymentStore';
import type { GatewayPaymentType } from '../src/types/database.types';

export default function PaymentGatewayScreen({ navigation, route }: Props) {
  type RouteParams = { 
    paymentMethod: string; 
    order?: Order; 
    checkoutPayload?: any;
    isQuickCheckout?: boolean;
    earnedBazcoins?: number;
    bazcoinDiscount?: number;
    appliedVoucher?: any;
    isGift?: boolean;
    isAnonymous?: boolean;
    recipientId?: string;
  };
  
  const params = route.params as RouteParams;
  const { paymentMethod: rawPaymentMethod, order, checkoutPayload, isQuickCheckout, earnedBazcoins = 0, bazcoinDiscount = 0, appliedVoucher, isGift = false, isAnonymous = false, recipientId } = params;
  const paymentMethod = rawPaymentMethod || 'card';
  
  console.log('[PaymentGateway] Route params received:', {
    hasOrder: !!order,
    orderId: order?.orderId,
    orderTotal: order?.total,
    orderSellerId: order?.sellerId,
    orderBuyerId: order?.buyerId,
    hasCheckoutPayload: !!checkoutPayload,
    paymentMethod
  });
  
  const { clearCart, clearQuickOrder, removeItems } = useCartStore();
  const { createPayment, confirmPayment, openEWalletCheckout, isSandbox } = usePaymentStore();
  const [status, setStatus] = useState<'idle' | 'processing' | 'approved' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // E-Wallet State
  const [mobileNumber, setMobileNumber] = useState('');
  const [mpin, setMpin] = useState('');

  // Card State
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumberError, setCardNumberError] = useState<string | null>(null);
  
  // Order tracking for new card flow
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const insets = useSafeAreaInsets();

  // Prevent back navigation while payment is processing
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (status === 'processing') {
          Alert.alert(
            'Payment in Progress',
            'Your payment is being processed. Please wait for it to complete before going back.',
            [{ text: 'OK', onPress: () => {} }],
            { cancelable: false }
          );
          return true; // Prevent back navigation
        }
        return false; // Allow back navigation
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);

      return () => subscription.remove();
    }, [status])
  );

  // Map UI payment method slug to GatewayPaymentType
  const methodSlug = paymentMethod.toLowerCase();
  const showCardForm = methodSlug === 'card' || methodSlug === 'paymongo';

  const getGatewayPaymentType = (): GatewayPaymentType => {
    switch (methodSlug) {
      case 'gcash': return 'gcash';
      case 'paymaya': return 'maya';
      case 'card':
      case 'paymongo': return 'card';
      case 'cod': return 'cod';
      case 'bank_transfer': return 'bank_transfer';
      case 'grab_pay': return 'grab_pay';
      default: return 'card';
    }
  };

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
      return !cardNumberError && cardNumber.length >= 16 && expiryDate.length >= 5 && cvv.length >= 3 && cardName.length > 3;
    }
    // GCash/Maya validation
    return mobileNumber.length >= 10 && mpin.length >= 4;
  };

  // Format card number with spaces (4343 4343 4343 4345)
  const formatCardNumber = (num: string): string => {
    const cleaned = num.replace(/\D/g, '').substring(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  // Format expiry date (12/25)
  const formatExpiryDate = (date: string): string => {
    const cleaned = date.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 2) return cleaned;
    return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
  };

  const handlePayment = async () => {
    if (!isFormValid()) return;

    setStatus('processing');
    setErrorMessage(null);

    try {
      let currentOrder = order || createdOrder;
      let paymentOrderId: string;
      let paymentBuyerId: string;
      let paymentSellerId: string;
      let paymentTotal: number;

      // ✅ FIX: Don't create orders here - CheckoutScreen already creates complete orders with items via processCheckout
      // Only use the order that was passed from CheckoutScreen
      // This prevents duplicate empty orders from appearing in the Orders screen

      // Now we have a valid order, use its IDs for payment
      if (!currentOrder) {
        throw new Error('Unable to create order. Please try again.');
      }

      if (!currentOrder.buyerId) {
        throw new Error('Buyer ID is missing. Please go back and try again.');
      }
      if (!currentOrder.sellerId) {
        throw new Error('Seller ID is missing. Please go back and try again.');
      }
      if (!currentOrder.orderId) {
        throw new Error('Order ID is missing. Please go back and try again.');
      }

      paymentOrderId = currentOrder.orderId || currentOrder.id;
      paymentBuyerId = currentOrder.buyerId;
      paymentSellerId = currentOrder.sellerId;
      paymentTotal = currentOrder.total;

      const gatewayType = getGatewayPaymentType();

      // Parse expiry for card
      let expMonth: number | undefined;
      let expYear: number | undefined;
      if (showCardForm && expiryDate.includes('/')) {
        const [mm, yy] = expiryDate.split('/');
        expMonth = parseInt(mm, 10);
        expYear = 2000 + parseInt(yy, 10);
      }

      const result = await createPayment({
        orderId: paymentOrderId,
        buyerId: paymentBuyerId,
        sellerId: paymentSellerId,
        amount: paymentTotal,
        paymentType: gatewayType,
        billing: showCardForm ? { name: cardName, email: '' } : { name: '', email: '', phone: `+63${mobileNumber}` },
        cardDetails: showCardForm ? {
          cardNumber: cardNumber,
          expMonth: expMonth || 12,
          expYear: expYear || 2030,
          cvc: cvv,
        } : undefined,
      });

      if (result.status === 'paid') {
        // Payment succeeded (card sandbox, COD confirmed)
        onPaymentApproved(currentOrder);
        return;
      }

      if (result.checkoutUrl && (gatewayType === 'gcash' || gatewayType === 'maya' || gatewayType === 'grab_pay')) {
        if (isSandbox) {
          // Sandbox: skip browser redirect, auto-confirm
          const confirmed = await confirmPayment(result.transactionId);
          if (confirmed.status === 'paid') {
            onPaymentApproved(currentOrder);
          } else {
            setStatus('failed');
            setErrorMessage('Sandbox e-wallet payment could not be confirmed');
          }
        } else {
          // Production: open e-wallet checkout in browser
          await openEWalletCheckout(result.checkoutUrl);
          // After user returns via deep link, confirmPayment will be called
          const confirmed = await confirmPayment(result.transactionId);
          if (confirmed.status === 'paid') {
            onPaymentApproved(currentOrder);
          } else {
            setStatus('idle');
          }
        }
        return;
      }

      if (result.referenceNumber) {
        // Bank transfer — show reference and approve
        const amount = order?.total || checkoutPayload?.totalAmount || 0;
        Alert.alert(
          'Bank Transfer',
          `Reference: ${result.referenceNumber}\n\nPlease transfer ₱${amount.toLocaleString()} and use this reference number.`,
          [{ text: 'OK', onPress: () => onPaymentApproved(currentOrder) }],
        );
        return;
      }

      if (result.status === 'awaiting_payment') {
        // COD or other awaiting
        onPaymentApproved(currentOrder);
        return;
      }

      // Fallback: mark as approved for sandbox
      if (isSandbox) {
        onPaymentApproved(currentOrder);
      }
    } catch (err: any) {
      setStatus('failed');
      setErrorMessage(err?.message || 'Payment failed. Please try again.');
    }
  };

  const onPaymentApproved = async (existingOrder: Order | undefined) => {
    setStatus('approved');

    try {
      let finalOrder = existingOrder;

      if (!finalOrder) {
        throw new Error('Order object is missing from payment flow');
      }

      // ✅ FIX: Don't call processCheckout here - it was already called in CheckoutScreen
      // ProcessCheckout in CheckoutScreen created all the database orders and items
      // We just need to mark the order as paid
      
      finalOrder.isPaid = true;

      setTimeout(() => {
        // Remove only the items that were checked out from the cart
        if (isQuickCheckout) {
          clearQuickOrder();
        } else {
          // Only remove the items that were actually purchased (from checkoutPayload)
          if (checkoutPayload && checkoutPayload.items && Array.isArray(checkoutPayload.items)) {
            const cartItemIdsToRemove = checkoutPayload.items
              .map((item: any) => item.cartItemId)
              .filter((id: string) => id); // Filter out undefined/null IDs
            
            if (cartItemIdsToRemove.length > 0) {
              console.log('[PaymentGateway] Removing checked out items from cart:', cartItemIdsToRemove);
              removeItems(cartItemIdsToRemove);
            }
          } else {
            // Fallback: if no checkoutPayload.items, don't clear the cart (keep user's other items)
            console.log('[PaymentGateway] No checkoutPayload.items found, keeping cart intact');
          }
        }
        
        // Go to OrderConfirmation to show order confirmation
        if (finalOrder) {
          navigation.replace('OrderConfirmation', { order: finalOrder, earnedBazcoins, isQuickCheckout });
        } else {
          throw new Error('Order object is missing');
        }
      }, 1500);
    } catch (err: any) {
      console.error('[PaymentGateway] Error in onPaymentApproved:', err);
      setStatus('failed');
      setErrorMessage(err?.message || 'Failed to complete payment. Please contact support.');
    }
  };

  if (status === 'approved') {
    return (
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.successContainer}>
            <View style={styles.successIconContainer}>
              <LinearGradient
                colors={[COLORS.primary, '#D97706']}
                style={styles.successIconGradient}
              >
                <CheckCircle size={80} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </View>
            <Text style={styles.successTitle}>Payment Approved!</Text>
            <Text style={styles.successSubtitle}>Your order has been confirmed successfully</Text>
            <View style={styles.redirectBadge}>
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.successRedirect}>Redirecting to tracking...</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerTop}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.headerIconButton}
              disabled={status === 'processing'}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>Secure Checkout</Text>
            <View style={styles.securedBadge}>
              <Lock size={16} color="#10B981" strokeWidth={2.5} />
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Payment Details Summary */}
          <View style={styles.billContainer}>
            <View style={styles.billDetailsHeader}>
              <Text style={styles.billDetailsTitle}>Payment Details</Text>
            </View>

            {/* Subtotal */}
            <View style={styles.billDetailRow}>
              <Text style={styles.billDetailLabel}>Subtotal</Text>
              <Text style={styles.billDetailValue}>₱ {((order?.total || checkoutPayload?.totalAmount || 0) - (order?.shippingFee || checkoutPayload?.shippingFee || 0) + (order?.discount || checkoutPayload?.discount || 0)).toLocaleString()}</Text>
            </View>

            {/* Shipping Fee */}
            {(order?.shippingFee || checkoutPayload?.shippingFee) ? (
              <View style={styles.billDetailRow}>
                <Text style={styles.billDetailLabel}>Shipping</Text>
                <Text style={styles.billDetailValue}>₱ {(order?.shippingFee || checkoutPayload?.shippingFee || 0).toLocaleString()}</Text>
              </View>
            ) : null}

            {/* Discount / Voucher */}
            {(order?.discount || checkoutPayload?.discount) ? (
              <View style={styles.billDetailRow}>
                <Text style={[styles.billDetailLabel, { color: COLORS.success }]}>Discount</Text>
                <Text style={[styles.billDetailValue, { color: COLORS.success }]}>-₱ {(order?.discount || checkoutPayload?.discount || 0).toLocaleString()}</Text>
              </View>
            ) : null}

            {/* Bazcoin Discount */}
            {bazcoinDiscount > 0 ? (
              <View style={styles.billDetailRow}>
                <Text style={[styles.billDetailLabel, { color: COLORS.success }]}>Bazcoin Discount</Text>
                <Text style={[styles.billDetailValue, { color: COLORS.success }]}>-₱ {bazcoinDiscount.toLocaleString()}</Text>
              </View>
            ) : null}

            {/* Divider */}
            <View style={styles.billDetailDivider} />

            {/* Total Amount */}
            <View style={styles.billDetailRowTotal}>
              <Text style={styles.billDetailLabelTotal}>Total Amount</Text>
              <Text style={styles.billAmountTotal}>₱ {(order?.total || checkoutPayload?.totalAmount || 0).toLocaleString()}</Text>
            </View>
          </View>

          {/* Payment Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Enter Payment Details</Text>

            {showCardForm ? (
              // Credit/Debit Card Form (Card & PayMongo)
              <>
                {/* Test Card Selector (Development/Sandbox Only) */}
                {__DEV__ && (
                  <View style={styles.testCardSelector}>
                    <View style={styles.testCardHeader}>
                      <Zap size={16} color="#1F2937" fill="#D97706" />
                      <Text style={styles.testCardTitle}>Quick Fill Test Cards</Text>
                    </View>
                    <Text style={styles.testCardDesc}>Click a card to auto-fill for testing:</Text>
                    <View style={styles.testCardGrid}>
                      {/* Basic Success Cards */}
                      {BASIC_TEST_CARDS.slice(0, 3).map((card) => (
                        <Pressable
                          key={card.number}
                          style={styles.testCardButton}
                          onPress={() => {
                            console.log('[PaymentGateway] Auto-filling test card:', card.number);
                            setCardNumber(card.number);
                            setCardName('TEST CARD');
                            setExpiryDate(card.expiry);
                            setCvv(card.cvc);
                            setCardNumberError(null);
                          }}
                        >
                          <Text style={styles.testCardBrand}>✓ {card.brand}</Text>
                          <Text style={styles.testCardScenario} numberOfLines={2}>
                            {card.scenario}
                          </Text>
                        </Pressable>
                      ))}
                      {/* Error Scenario Cards */}
                      {SCENARIO_TEST_CARDS.slice(0, 3).map((card) => (
                        <Pressable
                          key={card.number}
                          style={[styles.testCardButton, styles.testCardButtonError]}
                          onPress={() => {
                            console.log('[PaymentGateway] Auto-filling error test card:', card.number);
                            setCardNumber(card.number);
                            setCardName('TEST CARD');
                            setExpiryDate(card.expiry);
                            setCvv(card.cvc);
                            setCardNumberError(null);
                          }}
                        >
                          <Text style={styles.testCardBrand}>✗ {card.errorCode}</Text>
                          <Text style={styles.testCardScenario} numberOfLines={2}>
                            {card.scenario}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Card Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Card Number</Text>
                  <View style={styles.inputWrapper}>
                    <View style={[styles.prefix, { paddingHorizontal: 12 }]}>
                      <CreditCard size={20} color="#6B7280" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor="#9CA3AF"
                      value={formatCardNumber(cardNumber)}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/\D/g, '').substring(0, 16);
                        setCardNumber(cleaned);
                        
                        // Real-time validation: validate as soon as card number is complete (16 digits)
                        if (cleaned.length === 16) {
                          const testCard = getTestCardByNumber(cleaned);
                          if (!testCard) {
                            setCardNumberError('Card number does not match card type. Please use a valid PayMongo test card.');
                          } else {
                            setCardNumberError(null);
                          }
                        } else {
                          // Clear error if card number is incomplete
                          setCardNumberError(null);
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={19}
                      editable={status !== 'processing'}
                      accessibilityLabel="Card Number Input"
                    />
                  </View>
                </View>
                {cardNumberError && (
                  <View style={styles.inputErrorContainer}>
                    <AlertCircle size={14} color="#EF4444" strokeWidth={2} />
                    <Text style={styles.inputErrorText}>{cardNumberError}</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {/* Expiry Date */}
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Expiry Date</Text>
                    <TextInput
                      style={[styles.input, styles.fullWidthInput]}
                      placeholder="MM/YY"
                      placeholderTextColor="#9CA3AF"
                      value={expiryDate}
                      onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                      keyboardType="number-pad"
                      maxLength={5}
                      editable={status !== 'processing'}
                      accessibilityLabel="Expiry Date Input (MM/YY)"
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
                        onChangeText={(text) => {
                          const cleaned = text.replace(/\D/g, '').substring(0, 4);
                          setCvv(cleaned);
                        }}
                        keyboardType="number-pad"
                        maxLength={4}
                        secureTextEntry
                        editable={status !== 'processing'}
                        accessibilityLabel="CVV Input"
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
                    editable={status !== 'processing'}
                    accessibilityLabel="Cardholder Name Input"
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
                      accessibilityLabel="Mobile Number Input"
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
                    accessibilityLabel={methodSlug === 'gcash' ? "MPIN Input" : "Password Input"}
                  />
                </View>
              </>
            )}

            {/* Provider Info */}
            <View style={styles.providerInfo}>
              <Shield size={16} color="#6B7280" />
              <Text style={styles.providerInfoText}>
                You'll be charged ₱{(order?.total || checkoutPayload?.totalAmount || 0).toLocaleString()} via {getMethodName()}
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

          {/* Error Message */}
          {status === 'failed' && errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable onPress={() => { setStatus('idle'); setErrorMessage(null); }}>
                <Text style={styles.errorRetry}>Tap to try again</Text>
              </Pressable>
            </View>
          )}

          {/* Sandbox Badge */}
          {isSandbox && (
            <View style={styles.sandboxBadge}>
              <Text style={styles.sandboxText}>SANDBOX MODE — No real charges</Text>
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
            accessibilityLabel={`Pay ${(order?.total || checkoutPayload?.totalAmount || 0).toLocaleString()} pesos`}
            accessibilityRole="button"
          >
            <Text style={styles.payButtonText}>
              {status === 'processing' ? 'Processing...' : `Pay ₱${(order?.total || checkoutPayload?.totalAmount || 0).toLocaleString()}`}
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
    backgroundColor: COLORS.background,
  },

  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  billDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  billDetailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeadline,
    flex: 1,
  },
  billDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  billDetailLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  billDetailValue: {
    fontSize: 13,
    color: COLORS.textHeadline,
    fontWeight: '600',
  },
  billDetailDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  billDetailRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  billDetailLabelTotal: {
    fontSize: 14,
    color: COLORS.textHeadline,
    fontWeight: '700',
  },
  billAmountTotal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#C53030',
    letterSpacing: 0.5,
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
    marginBottom: 32,
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
  successTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textHeadline,
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 17,
    color: COLORS.textPrimary,
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  redirectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  successRedirect: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '700',
    textAlign: 'center',
  },
  inputIconRight: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  errorContainer: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorRetry: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 8,
  },
  sandboxBadge: {
    marginHorizontal: 24,
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    alignItems: 'center',
  },
  sandboxText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.5,
  },

  // Test Card Selector
  testCardSelector: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  testCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  testCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  testCardDesc: {
    fontSize: 11,
    color: '#1F2937',
    marginBottom: 8,
    fontWeight: '500',
  },
  testCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  testCardButton: {
    flex: 1,
    minWidth: '45%',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  testCardButtonError: {
    borderColor: '#F87171',
  },
  testCardBrand: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  testCardScenario: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '500',
  },
  inputErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  inputErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});
