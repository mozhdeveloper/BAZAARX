/**
 * OrderResultScreen
 * Displays different order/payment result scenarios similar to web checkout success page
 * Shows: Success, Failed, Processing, and different payment scenarios
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, AlertCircle, Clock, RefreshCw, ChevronRight, Home, Flame } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Order } from '../src/types';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderResult'>;

export type PaymentResultStatus = 
  | 'success' 
  | 'failed' 
  | 'processing' 
  | 'pending_3ds'
  | 'insufficient_funds'
  | 'card_expired'
  | 'invalid_cvc'
  | 'fraudulent'
  | 'generic_decline'
  | 'processor_blocked';

export interface OrderResultParams {
  order: Order;
  status: PaymentResultStatus;
  earnedBazcoins?: number;
  paymentMethod?: string;
  transactionID?: string;
  errorCode?: string;
  errorMessage?: string;
}

export default function OrderResultScreen({ navigation, route }: Props) {
  const params = route.params as OrderResultParams;
  const { 
    order, 
    status = 'success', 
    earnedBazcoins = 0,
    paymentMethod = order?.paymentMethod || 'Card',
    transactionID = order?.transactionId || 'TXN-PENDING',
    errorCode = '',
    errorMessage = '',
  } = params;

  const isSuccess = status === 'success';
  const isFailed = status === 'failed' || ['insufficient_funds', 'card_expired', 'invalid_cvc', 'fraudulent', 'generic_decline', 'processor_blocked'].includes(status);
  const isProcessing = status === 'processing' || status === 'pending_3ds';

  const getStatusIcon = () => {
    if (isProcessing) {
      return <ActivityIndicator size={80} color={COLORS.primary} />;
    }
    if (isSuccess) {
      return <CheckCircle size={80} color="#10B981" strokeWidth={1.5} />;
    }
    return <AlertCircle size={80} color="#EF4444" strokeWidth={1.5} />;
  };

  const getStatusTitle = (): string => {
    switch (status) {
      case 'success':
        return 'Order Placed Successfully!';
      case 'processing':
        return 'Processing Payment...';
      case 'pending_3ds':
        return 'Complete 3D Secure';
      case 'insufficient_funds':
        return 'Insufficient Funds';
      case 'card_expired':
        return 'Card Expired';
      case 'invalid_cvc':
        return 'Invalid CVC';
      case 'fraudulent':
        return 'Transaction Blocked';
      case 'generic_decline':
        return 'Payment Declined';
      case 'processor_blocked':
        return 'Processor Blocked';
      default:
        return 'Payment Failed';
    }
  };

  const getStatusMessage = (): string => {
    if (isSuccess) {
      return `Your order has been confirmed. Payment method: ${paymentMethod}`;
    }
    if (isProcessing && status === 'pending_3ds') {
      return 'Please complete 3D Secure authentication to finalize your payment.';
    }
    if (isProcessing) {
      return 'Your payment is being processed. Please wait...';
    }

    // Failed scenarios
    switch (status) {
      case 'insufficient_funds':
        return 'Your card does not have sufficient funds. Please use a different card or payment method.';
      case 'card_expired':
        return 'The card you used has expired. Please use a valid card.';
      case 'invalid_cvc':
        return 'The CVC/CVV you entered is incorrect. Please try again.';
      case 'fraudulent':
        return 'This transaction was flagged as suspicious. Please contact your bank.';
      case 'generic_decline':
        return 'Your payment could not be processed. Please try a different card or contact us.';
      case 'processor_blocked':
        return 'Your transaction was blocked by the payment processor. Please contact your bank.';
      default:
        return errorMessage || 'Your payment could not be completed. Please try again.';
    }
  };

  const getBackgroundColors = () => {
    if (isSuccess) {
      return ['#ECFDF5', '#D1FAE5', '#ECFDF5'];
    }
    if (isFailed) {
      return ['#FEF2F2', '#FEE2E2', '#FEF2F2'];
    }
    return ['#FFFBF5', '#FDF2E9', '#FFFBF5'];
  };

  const handleContinue = () => {
    if (isSuccess) {
      navigation.navigate('Orders', {});
    } else {
      // For failed/processing, allow retry
      navigation.navigate('Checkout', {});
    }
  };

  const handleRetry = () => {
    navigation.navigate('Checkout', {});
  };

  return (
    <LinearGradient
      colors={getBackgroundColors() as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Icon */}
          <View style={styles.iconContainer}>
            <View style={[
              styles.iconCircle,
              isSuccess && styles.iconCircleSuccess,
              isFailed && styles.iconCircleFailed,
              isProcessing && styles.iconCircleProcessing,
            ]}>
              {getStatusIcon()}
            </View>
          </View>

          {/* Status Title */}
          <Text style={styles.title}>{getStatusTitle()}</Text>
          
          {/* Status Message */}
          <Text style={[
            styles.message,
            isFailed && styles.messageFailed,
            isProcessing && styles.messageProcessing,
          ]}>
            {getStatusMessage()}
          </Text>

          {/* Rewards Card (only on success) */}
          {isSuccess && earnedBazcoins > 0 && (
            <View style={styles.rewardsCard}>
              <View style={styles.rewardsIconContainer}>
                <Flame size={24} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              <View style={styles.rewardsInfo}>
                <Text style={styles.rewardsTitle}>Rewards Earned!</Text>
                <Text style={styles.rewardsValue}>
                  You earned {earnedBazcoins.toLocaleString()} Bazcoins
                </Text>
              </View>
            </View>
          )}

          {/* Order Number Card */}
          {(isSuccess || order) && (
            <View style={styles.orderNumberCard}>
              <Text style={styles.orderNumberLabel}>Order Number</Text>
              <Text style={styles.orderNumber}>#{transactionID}</Text>
            </View>
          )}

          {/* Payment Information Card */}
          <View style={styles.paymentCard}>
            <Text style={styles.cardTitle}>Payment Information</Text>
            
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Method</Text>
              <Text style={styles.paymentValue}>{paymentMethod}</Text>
            </View>

            <View style={styles.paymentRowDivider} />

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Status</Text>
              <View style={[
                styles.statusBadge,
                isSuccess && styles.statusBadgeSuccess,
                isFailed && styles.statusBadgeFailed,
                isProcessing && styles.statusBadgeProcessing,
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  isSuccess && styles.statusBadgeTextSuccess,
                  isFailed && styles.statusBadgeTextFailed,
                  isProcessing && styles.statusBadgeTextProcessing,
                ]}>
                  {isSuccess ? 'Confirmed' : isFailed ? 'Declined' : 'Processing'}
                </Text>
              </View>
            </View>

            {order?.total && (
              <>
                <View style={styles.paymentRowDivider} />
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Amount</Text>
                  <Text style={styles.paymentAmountValue}>
                    ₱{order.total.toLocaleString()}
                  </Text>
                </View>
              </>
            )}

            {transactionID && (
              <>
                <View style={styles.paymentRowDivider} />
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Transaction ID</Text>
                  <Text style={styles.transactionIdValue} numberOfLines={1}>
                    {transactionID}
                  </Text>
                </View>
              </>
            )}

            {errorCode && (
              <>
                <View style={styles.paymentRowDivider} />
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Error Code</Text>
                  <Text style={styles.errorCodeValue}>{errorCode}</Text>
                </View>
              </>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {isSuccess ? (
              <Pressable
                style={styles.primaryButton}
                onPress={handleContinue}
              >
                <Text style={styles.primaryButtonText}>View My Orders</Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </Pressable>
            ) : isFailed ? (
              <>
                <Pressable
                  style={[styles.primaryButton, styles.retryButton]}
                  onPress={handleRetry}
                >
                  <RefreshCw size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('Orders', {})}
                >
                  <Text style={styles.secondaryButtonText}>Go to Orders</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={styles.primaryButton}
                onPress={handleContinue}
                disabled
              >
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Processing...</Text>
              </Pressable>
            )}
          </View>

          {/* Help Link */}
          <Pressable style={styles.helpButton}>
            <Text style={styles.helpButtonText}>Need help? Contact Support</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  iconCircleFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  iconCircleProcessing: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  messageFailed: {
    color: '#DC2626',
    fontWeight: '500',
  },
  messageProcessing: {
    color: '#D97706',
  },
  rewardsCard: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: 'rgba(217, 119, 6, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  rewardsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rewardsInfo: {
    flex: 1,
  },
  rewardsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  rewardsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orderNumberCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDF2E9',
  },
  orderNumberLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  paymentCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDF2E9',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentRowDivider: {
    height: 1,
    backgroundColor: '#FDF2E9',
    marginVertical: 4,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentAmountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  statusBadgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusBadgeFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusBadgeProcessing: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  statusBadgeTextSuccess: {
    color: '#10B981',
  },
  statusBadgeTextFailed: {
    color: '#EF4444',
  },
  statusBadgeTextProcessing: {
    color: '#D97706',
  },
  transactionIdValue: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  errorCodeValue: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  actionsContainer: {
    width: '100%',
    marginBottom: 16,
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#EF4444',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  helpButton: {
    paddingVertical: 12,
  },
  helpButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
