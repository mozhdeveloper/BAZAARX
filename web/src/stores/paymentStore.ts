/**
 * Payment Store — Zustand store for payment & payout management
 * 
 * Buyer: View transactions, manage saved payment methods
 * Seller: Manage payout settings, view payouts & earnings
 */

import { create } from 'zustand';
import { payMongoService } from '@/services/payMongoService';
import type {
  PaymentTransaction,
  SellerPayoutSettings,
  SellerPayout,
  SellerEarningsSummary,
  PaymentResult,
} from '@/types/payment.types';
import type { PayoutMethod } from '@/types/database.types';

// ============================================================================
// Store Types
// ============================================================================

interface PaymentState {
  // Buyer
  transactions: PaymentTransaction[];
  transactionsLoading: boolean;

  // Seller
  payoutSettings: SellerPayoutSettings | null;
  payouts: SellerPayout[];
  earningsSummary: SellerEarningsSummary | null;
  payoutsLoading: boolean;
  settingsLoading: boolean;

  // Actions — Buyer
  loadBuyerTransactions: (buyerId: string) => Promise<void>;
  getTransactionByOrder: (orderId: string) => Promise<PaymentTransaction | null>;
  confirmPayment: (transactionId: string) => Promise<PaymentResult>;

  // Actions — Seller
  loadPayoutSettings: (sellerId: string) => Promise<void>;
  savePayoutSettings: (sellerId: string, settings: {
    payoutMethod: PayoutMethod;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    ewalletProvider?: 'gcash' | 'maya' | null;
    ewalletNumber?: string;
    autoPayout?: boolean;
    minPayoutAmount?: number;
  }) => Promise<void>;
  loadSellerPayouts: (sellerId: string) => Promise<void>;
  loadEarningsSummary: (sellerId: string) => Promise<void>;
}

// ============================================================================
// Store
// ============================================================================

export const usePaymentStore = create<PaymentState>()((set) => ({
  // Initial state
  transactions: [],
  transactionsLoading: false,
  payoutSettings: null,
  payouts: [],
  earningsSummary: null,
  payoutsLoading: false,
  settingsLoading: false,

  // ── Buyer Actions ─────────────────────────────────────────────────────

  loadBuyerTransactions: async (buyerId: string) => {
    set({ transactionsLoading: true });
    try {
      const transactions = await payMongoService.getBuyerTransactions(buyerId);
      set({ transactions });
    } finally {
      set({ transactionsLoading: false });
    }
  },

  getTransactionByOrder: async (orderId: string) => {
    return payMongoService.getTransactionByOrderId(orderId);
  },

  confirmPayment: async (transactionId: string) => {
    return payMongoService.confirmPayment(transactionId);
  },

  // ── Seller Actions ────────────────────────────────────────────────────

  loadPayoutSettings: async (sellerId: string) => {
    set({ settingsLoading: true });
    try {
      const payoutSettings = await payMongoService.getPayoutSettings(sellerId);
      set({ payoutSettings });
    } finally {
      set({ settingsLoading: false });
    }
  },

  savePayoutSettings: async (sellerId: string, settings) => {
    set({ settingsLoading: true });
    try {
      await payMongoService.savePayoutSettings(sellerId, settings);
      const payoutSettings = await payMongoService.getPayoutSettings(sellerId);
      set({ payoutSettings });
    } finally {
      set({ settingsLoading: false });
    }
  },

  loadSellerPayouts: async (sellerId: string) => {
    set({ payoutsLoading: true });
    try {
      const payouts = await payMongoService.getSellerPayouts(sellerId);
      set({ payouts });
    } finally {
      set({ payoutsLoading: false });
    }
  },

  loadEarningsSummary: async (sellerId: string) => {
    try {
      const earningsSummary = await payMongoService.getSellerEarningsSummary(sellerId);
      set({ earningsSummary });
    } catch {
      // Non-critical — don't block other UI
    }
  },
}));
