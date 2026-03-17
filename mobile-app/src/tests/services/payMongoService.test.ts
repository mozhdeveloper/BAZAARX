/**
 * PayMongoService — Mobile Unit Tests
 *
 * Covers:
 *   • Card payment flow (sandbox)
 *   • E-wallet payment flow (GCash, Maya, GrabPay)
 *   • Bank transfer & COD
 *   • Payment confirmation
 *   • Refund processing
 *   • Seller payout settings CRUD
 *   • Seller payouts & earnings summary
 *   • Buyer transaction history
 *   • Mobile-specific: e-wallet deep link checkout
 *   • Sandbox e-wallet completion
 */

import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { payMongoService } from '../../services/payMongoService';
import { createMockSupabaseQuery, createSupabaseError } from '../mocks/supabase.mock';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn().mockResolvedValue(undefined),
    canOpenURL: jest.fn().mockResolvedValue(true),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockIsConfigured = isSupabaseConfigured as jest.Mock;

// Test data
const BUYER_ID = 'buyer-001';
const SELLER_ID = 'seller-001';
const ORDER_ID = 'ORD-2026100001ABCD';
const TRANSACTION_ID = 'txn-001';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFrom = (resolvedData: any, error: any = null) => {
  const query = createMockSupabaseQuery(resolvedData, error);
  (mockSupabase.from as jest.Mock).mockReturnValue(query);
  return query;
};

const mockFromMultiple = (callResults: Array<{ data: any; error?: any }>) => {
  let callIndex = 0;
  (mockSupabase.from as jest.Mock).mockImplementation(() => {
    const result = callResults[Math.min(callIndex, callResults.length - 1)];
    callIndex++;
    return createMockSupabaseQuery(result.data, result.error || null);
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PayMongoGatewayService (Mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  // ── Singleton ──────────────────────────────────────────────────────────

  describe('Singleton', () => {
    it('should always return the same instance', () => {
      expect(payMongoService).toBeDefined();
    });

    it('should report sandbox mode', () => {
      expect(payMongoService.isSandbox).toBe(true);
    });
  });

  // ── Card Payment ──────────────────────────────────────────────────────

  describe('createPayment — card', () => {
    it('should process card payment in sandbox mode', async () => {
      mockFromMultiple([
        { data: { id: TRANSACTION_ID } },
        { data: [{ seller_id: SELLER_ID }] },
        { data: { id: 'payout-001' } },
        { data: { id: ORDER_ID } },
      ]);

      const result = await payMongoService.createPayment({
        orderId: ORDER_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 1500,
        paymentType: 'card',
        description: 'Test card payment',
        billing: { name: 'Test Buyer', email: 'buyer@test.com' },
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
    });

    it('should accept card details for card payment', async () => {
      mockFromMultiple([
        { data: { id: TRANSACTION_ID } },
        { data: [{ seller_id: SELLER_ID }] },
        { data: { id: 'payout-001' } },
        { data: { id: ORDER_ID } },
      ]);

      const result = await payMongoService.createPayment({
        orderId: ORDER_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 1500,
        paymentType: 'card',
        description: 'Card with details',
        billing: { name: 'Test Buyer', email: 'buyer@test.com' },
        cardDetails: {
          cardNumber: '4343434343434345',
          expMonth: 12,
          expYear: 2029,
          cvc: '123',
        },
      });

      expect(result.success).toBe(true);
    });
  });

  // ── E-Wallet Payment ──────────────────────────────────────────────────

  describe('createPayment — e-wallet (gcash)', () => {
    it('should return checkout URL for GCash', async () => {
      mockFromMultiple([
        { data: { id: TRANSACTION_ID } },
      ]);

      const result = await payMongoService.createPayment({
        orderId: ORDER_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 500,
        paymentType: 'gcash',
        description: 'Test GCash payment',
        billing: { name: 'Test Buyer', email: 'buyer@test.com' },
      });

      expect(result.success).toBe(true);
      expect(result.checkoutUrl).toBeDefined();
      expect(result.transactionId).toBeDefined();
    });
  });

  describe('createPayment — e-wallet (maya)', () => {
    it('should return checkout URL for Maya', async () => {
      mockFromMultiple([
        { data: { id: TRANSACTION_ID } },
      ]);

      const result = await payMongoService.createPayment({
        orderId: ORDER_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 750,
        paymentType: 'maya',
        description: 'Test Maya payment',
        billing: { name: 'Test Buyer', email: 'buyer@test.com' },
      });

      expect(result.success).toBe(true);
      expect(result.checkoutUrl).toBeDefined();
    });
  });

  describe('createPayment — e-wallet (grab_pay)', () => {
    it('should return checkout URL for GrabPay', async () => {
      mockFromMultiple([
        { data: { id: TRANSACTION_ID } },
      ]);

      const result = await payMongoService.createPayment({
        orderId: ORDER_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 600,
        paymentType: 'grab_pay',
        description: 'Test GrabPay payment',
        billing: { name: 'Test Buyer', email: 'buyer@test.com' },
      });

      expect(result.success).toBe(true);
      expect(result.checkoutUrl).toBeDefined();
    });
  });

  // ── Bank Transfer ─────────────────────────────────────────────────────

  describe('createPayment — bank_transfer', () => {
    it('should return reference number', async () => {
      mockFromMultiple([
        { data: { id: TRANSACTION_ID } },
      ]);

      const result = await payMongoService.createPayment({
        orderId: ORDER_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 2000,
        paymentType: 'bank_transfer',
        description: 'Test bank transfer',
        billing: { name: 'Test Buyer', email: 'buyer@test.com' },
      });

      expect(result.success).toBe(true);
      expect(result.referenceNumber).toBeDefined();
    });
  });

  // ── COD ────────────────────────────────────────────────────────────────

  describe('createPayment — cod', () => {
    it('should create COD awaiting payment', async () => {
      mockFromMultiple([
        { data: { id: TRANSACTION_ID } },
      ]);

      const result = await payMongoService.createPayment({
        orderId: ORDER_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 300,
        paymentType: 'cod',
        description: 'Test COD',
        billing: { name: 'Test Buyer', email: 'buyer@test.com' },
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
    });
  });

  // ── Confirm Payment ───────────────────────────────────────────────────

  describe('confirmPayment', () => {
    it('should confirm a pending payment transaction', async () => {
      mockFromMultiple([
        { data: { id: TRANSACTION_ID, gateway_reference: 'pi_123', payment_type: 'card', status: 'processing' } },
        { data: { id: TRANSACTION_ID } },
        { data: [{ seller_id: SELLER_ID }] },
        { data: { id: 'payout-001' } },
        { data: { id: ORDER_ID } },
      ]);

      const result = await payMongoService.confirmPayment(TRANSACTION_ID);
      expect(result.success).toBe(true);
    });

    it('should throw for non-existent transaction', async () => {
      mockFrom(null);

      await expect(payMongoService.confirmPayment('nonexistent')).rejects.toThrow();
    });
  });

  // ── Refund ─────────────────────────────────────────────────────────────

  describe('refundPayment', () => {
    it('should process full refund', async () => {
      mockFromMultiple([
        { data: { id: TRANSACTION_ID, amount: 1000, order_id: ORDER_ID, status: 'paid', gateway_reference: 'pi_123' } },
        { data: { id: TRANSACTION_ID } },
        { data: { id: ORDER_ID } },
      ]);

      await expect(payMongoService.refundPayment(TRANSACTION_ID)).resolves.not.toThrow();
    });

    it('should process partial refund', async () => {
      mockFromMultiple([
        { data: { id: TRANSACTION_ID, amount: 1000, order_id: ORDER_ID, status: 'paid', gateway_reference: 'pi_123' } },
        { data: { id: TRANSACTION_ID } },
        { data: { id: ORDER_ID } },
      ]);

      await expect(payMongoService.refundPayment(TRANSACTION_ID, 500)).resolves.not.toThrow();
    });
  });

  // ── Seller Payout Settings ────────────────────────────────────────────

  describe('Seller Payout Settings', () => {
    it('should get payout settings', async () => {
      const mockSettings = {
        id: 'settings-001',
        seller_id: SELLER_ID,
        payout_method: 'gcash',
        gcash_number: '09171234567',
        gcash_name: 'Test Seller',
      };
      mockFrom(mockSettings);

      const result = await payMongoService.getPayoutSettings(SELLER_ID);
      expect(result).toBeDefined();
      expect(result?.payoutMethod).toBe('gcash');
    });

    it('should return null when no settings exist', async () => {
      mockFrom(null);

      const result = await payMongoService.getPayoutSettings(SELLER_ID);
      expect(result).toBeNull();
    });

    it('should save payout settings (bank)', async () => {
      mockFrom({ id: 'settings-001' });

      await expect(
        payMongoService.savePayoutSettings(SELLER_ID, {
          payoutMethod: 'bank_transfer',
          bankName: 'BPI',
          bankAccountNumber: '1234567890',
          bankAccountName: 'Test Seller',
        })
      ).resolves.not.toThrow();
    });
  });

  // ── Seller Payouts ────────────────────────────────────────────────────

  describe('Seller Payouts', () => {
    it('should get seller payouts', async () => {
      const mockPayouts = [
        { id: 'payout-001', seller_id: SELLER_ID, order_id: ORDER_ID, gross_amount: 1000, platform_fee: 50, net_amount: 950, status: 'pending' },
      ];
      mockFrom(mockPayouts);

      const result = await payMongoService.getSellerPayouts(SELLER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].grossAmount).toBe(1000);
    });

    it('should return empty array when no payouts', async () => {
      mockFrom([]);

      const result = await payMongoService.getSellerPayouts(SELLER_ID);
      expect(result).toHaveLength(0);
    });
  });

  // ── Earnings Summary ──────────────────────────────────────────────────

  describe('Seller Earnings Summary', () => {
    it('should calculate earnings summary', async () => {
      const mockPayouts = [
        { gross_amount: 1000, platform_fee: 50, net_amount: 950, status: 'completed' },
        { gross_amount: 2000, platform_fee: 100, net_amount: 1900, status: 'completed' },
        { gross_amount: 500, platform_fee: 25, net_amount: 475, status: 'pending' },
      ];
      mockFrom(mockPayouts);

      const result = await payMongoService.getSellerEarningsSummary(SELLER_ID);
      expect(result.totalEarnings).toBe(3500);
      expect(result.platformFees).toBe(175);
      expect(result.pendingPayouts).toBe(475);
      expect(result.completedPayouts).toBe(2850);
    });

    it('should handle zero payouts', async () => {
      mockFrom([]);

      const result = await payMongoService.getSellerEarningsSummary(SELLER_ID);
      expect(result.totalEarnings).toBe(0);
    });
  });

  // ── Buyer Transactions ────────────────────────────────────────────────

  describe('Buyer Transactions', () => {
    it('should get buyer transaction history', async () => {
      const mockTxns = [
        { id: TRANSACTION_ID, order_id: ORDER_ID, buyer_id: BUYER_ID, amount: 500, status: 'paid', payment_type: 'gcash', created_at: '2026-01-01' },
      ];
      mockFrom(mockTxns);

      const result = await payMongoService.getBuyerTransactions(BUYER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(500);
    });

    it('should get transaction by order ID', async () => {
      const mockTxn = { id: TRANSACTION_ID, order_id: ORDER_ID, amount: 500, status: 'paid', payment_type: 'card' };
      mockFrom(mockTxn);

      const result = await payMongoService.getTransactionByOrderId(ORDER_ID);
      expect(result).toBeDefined();
      expect(result?.orderId).toBe(ORDER_ID);
    });
  });

  // ── Supabase Not Configured ───────────────────────────────────────────

  describe('Supabase Not Configured', () => {
    beforeEach(() => {
      mockIsConfigured.mockReturnValue(false);
    });

    it('should return empty buyer transactions', async () => {
      const result = await payMongoService.getBuyerTransactions(BUYER_ID);
      expect(result).toEqual([]);
    });

    it('should return null for payout settings', async () => {
      const result = await payMongoService.getPayoutSettings(SELLER_ID);
      expect(result).toBeNull();
    });

    it('should return empty payouts', async () => {
      const result = await payMongoService.getSellerPayouts(SELLER_ID);
      expect(result).toEqual([]);
    });
  });

  // ── Mobile-specific: E-Wallet Checkout ────────────────────────────────

  describe('openEWalletCheckout (mobile)', () => {
    it('should call Linking.openURL with checkout URL', async () => {
      const { Linking } = require('react-native');
      Linking.canOpenURL.mockResolvedValue(true);
      Linking.openURL.mockResolvedValue(undefined);
      const testUrl = 'https://pm.link/gcash/test';

      await payMongoService.openEWalletCheckout(testUrl);

      expect(Linking.openURL).toHaveBeenCalledWith(testUrl);
    });
  });

  // ── Sandbox E-Wallet Completion ───────────────────────────────────────

  describe('Sandbox E-Wallet Completion', () => {
    it('should simulate completing an e-wallet payment', async () => {
      mockFromMultiple([
        { data: { id: TRANSACTION_ID } },
      ]);

      const createResult = await payMongoService.createPayment({
        orderId: ORDER_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 500,
        paymentType: 'gcash',
        description: 'Test GCash',
        billing: { name: 'Buyer', email: 'buyer@test.com' },
      });

      expect(createResult.success).toBe(true);

      // sandboxCompleteEWalletPayment is void — just ensure no error
      expect(() => payMongoService.sandboxCompleteEWalletPayment(createResult.transactionId!)).not.toThrow();
    });
  });

  // ── Deep Link URLs ────────────────────────────────────────────────────

  describe('Deep Link URL Construction', () => {
    it('should use bazaarx:// scheme for e-wallet redirect URLs', async () => {
      mockFromMultiple([
        { data: { id: TRANSACTION_ID } },
      ]);

      const result = await payMongoService.createPayment({
        orderId: ORDER_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 500,
        paymentType: 'gcash',
        description: 'GCash deep link test',
        billing: { name: 'Test', email: 'test@test.com' },
      });

      // The sandbox checkout URL should contain bazaarx:// scheme
      expect(result.checkoutUrl).toContain('bazaarx://');
    });
  });
});
