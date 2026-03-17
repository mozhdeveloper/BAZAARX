/**
 * Payment Store (Mobile)
 * Zustand store for PayMongo payment state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { payMongoService } from '../services/payMongoService';
import type { GatewayPaymentType } from '../types/database.types';
import type {
  CreatePaymentRequest,
  PaymentResult,
  PaymentTransaction,
  SellerPayoutSettings,
  SellerPayout,
  SellerEarningsSummary,
} from '../types/payment.types';

interface PaymentStore {
  // State
  currentPayment: PaymentResult | null;
  transactions: PaymentTransaction[];
  payoutSettings: SellerPayoutSettings | null;
  sellerPayouts: SellerPayout[];
  earningsSummary: SellerEarningsSummary | null;
  loading: boolean;
  error: string | null;
  isSandbox: boolean;

  // Buyer Actions
  createPayment: (request: CreatePaymentRequest) => Promise<PaymentResult>;
  confirmPayment: (transactionId: string) => Promise<PaymentResult>;
  openEWalletCheckout: (checkoutUrl: string) => Promise<void>;
  fetchBuyerTransactions: (buyerId: string) => Promise<void>;
  getTransactionByOrderId: (orderId: string) => Promise<PaymentTransaction | null>;

  // Seller Actions
  fetchPayoutSettings: (sellerId: string) => Promise<void>;
  savePayoutSettings: (sellerId: string, settings: Partial<SellerPayoutSettings>) => Promise<void>;
  fetchSellerPayouts: (sellerId: string) => Promise<void>;
  fetchEarningsSummary: (sellerId: string) => Promise<void>;

  // COD
  confirmCODPayment: (orderId: string) => Promise<void>;

  // Refund
  refundPayment: (transactionId: string, amount?: number) => Promise<void>;

  // Sandbox e-wallet helper
  sandboxCompleteEWallet: (sourceId: string) => void;

  // Reset
  clearPaymentState: () => void;
}

export const usePaymentStore = create<PaymentStore>()(
  persist(
    (set, get) => ({
      currentPayment: null,
      transactions: [],
      payoutSettings: null,
      sellerPayouts: [],
      earningsSummary: null,
      loading: false,
      error: null,
      isSandbox: payMongoService.isSandbox,

      createPayment: async (request: CreatePaymentRequest) => {
        set({ loading: true, error: null });
        try {
          const result = await payMongoService.createPayment(request);
          set({ currentPayment: result, loading: false });
          return result;
        } catch (err: any) {
          const message = err?.message || 'Payment failed';
          set({ error: message, loading: false });
          throw err;
        }
      },

      confirmPayment: async (transactionId: string) => {
        set({ loading: true, error: null });
        try {
          const result = await payMongoService.confirmPayment(transactionId);
          set({ currentPayment: result, loading: false });
          return result;
        } catch (err: any) {
          const message = err?.message || 'Payment confirmation failed';
          set({ error: message, loading: false });
          throw err;
        }
      },

      openEWalletCheckout: async (checkoutUrl: string) => {
        await payMongoService.openEWalletCheckout(checkoutUrl);
      },

      fetchBuyerTransactions: async (buyerId: string) => {
        set({ loading: true });
        try {
          const transactions = await payMongoService.getBuyerTransactions(buyerId);
          set({ transactions, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      getTransactionByOrderId: async (orderId: string) => {
        return payMongoService.getTransactionByOrderId(orderId);
      },

      fetchPayoutSettings: async (sellerId: string) => {
        try {
          const settings = await payMongoService.getPayoutSettings(sellerId);
          set({ payoutSettings: settings });
        } catch {
          // ignore
        }
      },

      savePayoutSettings: async (sellerId: string, settings: Partial<SellerPayoutSettings>) => {
        set({ loading: true, error: null });
        try {
          await payMongoService.savePayoutSettings(sellerId, settings);
          // Refetch after save
          const updated = await payMongoService.getPayoutSettings(sellerId);
          set({ payoutSettings: updated, loading: false });
        } catch (err: any) {
          set({ error: err?.message || 'Failed to save settings', loading: false });
          throw err;
        }
      },

      fetchSellerPayouts: async (sellerId: string) => {
        set({ loading: true });
        try {
          const payouts = await payMongoService.getSellerPayouts(sellerId);
          set({ sellerPayouts: payouts, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      fetchEarningsSummary: async (sellerId: string) => {
        try {
          const summary = await payMongoService.getSellerEarningsSummary(sellerId);
          set({ earningsSummary: summary });
        } catch {
          // ignore
        }
      },

      confirmCODPayment: async (orderId: string) => {
        set({ loading: true, error: null });
        try {
          await payMongoService.confirmCODPayment(orderId);
          set({ loading: false });
        } catch (err: any) {
          set({ error: err?.message || 'COD confirmation failed', loading: false });
          throw err;
        }
      },

      refundPayment: async (transactionId: string, amount?: number) => {
        set({ loading: true, error: null });
        try {
          await payMongoService.refundPayment(transactionId, amount);
          set({ loading: false });
        } catch (err: any) {
          set({ error: err?.message || 'Refund failed', loading: false });
          throw err;
        }
      },

      sandboxCompleteEWallet: (sourceId: string) => {
        payMongoService.sandboxCompleteEWalletPayment(sourceId);
      },

      clearPaymentState: () => {
        set({
          currentPayment: null,
          error: null,
          loading: false,
        });
      },
    }),
    {
      name: 'payment-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        transactions: state.transactions,
        payoutSettings: state.payoutSettings,
        earningsSummary: state.earningsSummary,
      }),
    },
  ),
);
