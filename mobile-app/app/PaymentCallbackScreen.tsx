/**
 * PaymentCallbackScreen
 * 
 * Handles deep link callbacks from PayMongo e-wallet payments.
 * Routes:
 *   bazaarx://payment/success?txn={transactionId}
 *   bazaarx://payment/failed?txn={transactionId}
 *   bazaarx://payment/callback?txn={transactionId}
 *   bazaarx://payment/sandbox-ewallet?src={sourceId}
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { usePaymentStore } from '../src/stores/paymentStore';

type PaymentCallbackRouteProp = RouteProp<RootStackParamList, 'PaymentCallback'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PaymentCallbackScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentCallbackRouteProp>();
  const { confirmPayment, sandboxCompleteEWallet } = usePaymentStore();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [message, setMessage] = useState('Processing payment...');

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    const { type, txn, src } = route.params;

    try {
      if (type === 'sandbox-ewallet' && src) {
        // Sandbox e-wallet: auto-complete the source
        setMessage('Completing sandbox e-wallet payment...');
        await sandboxCompleteEWallet(src);
        setStatus('success');
        setMessage('Sandbox payment completed!');
        setTimeout(() => navigation.navigate('Orders', {}), 1500);
        return;
      }

      if (type === 'success' && txn) {
        // E-wallet returned successfully — confirm the payment
        setMessage('Confirming payment...');
        await confirmPayment(txn);
        setStatus('success');
        setMessage('Payment successful!');
        setTimeout(() => navigation.navigate('Orders', {}), 1500);
        return;
      }

      if (type === 'failed' && txn) {
        setStatus('failed');
        setMessage('Payment was not completed. You can try again from your orders.');
        setTimeout(() => navigation.navigate('Orders', {}), 2500);
        return;
      }

      if (type === 'callback' && txn) {
        // Generic callback — check payment status
        setMessage('Verifying payment status...');
        await confirmPayment(txn);
        setStatus('success');
        setMessage('Payment verified!');
        setTimeout(() => navigation.navigate('Orders', {}), 1500);
        return;
      }

      // Unknown type — go to orders
      navigation.navigate('Orders', {});
    } catch (error) {
      setStatus('failed');
      setMessage('Could not verify payment. Please check your orders.');
      setTimeout(() => navigation.navigate('Orders', {}), 2500);
    }
  }

  return (
    <View style={styles.container}>
      {status === 'processing' && (
        <ActivityIndicator size="large" color="#FF6B00" />
      )}
      {status === 'success' && (
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>✓</Text>
        </View>
      )}
      {status === 'failed' && (
        <View style={[styles.iconCircle, styles.failedCircle]}>
          <Text style={styles.icon}>✕</Text>
        </View>
      )}
      <Text style={[styles.message, status === 'failed' && styles.failedText]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  failedCircle: {
    backgroundColor: '#EF4444',
  },
  icon: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  failedText: {
    color: '#EF4444',
  },
});
