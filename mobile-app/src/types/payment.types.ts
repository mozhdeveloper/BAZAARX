/**
 * Payment Gateway Types
 * PayMongo sandbox integration for Philippine marketplace (Mobile)
 */

import type {
  GatewayPaymentType,
  PaymentTransactionStatus,
  PayoutStatus,
  PayoutMethod,
} from './database.types';

export type { GatewayPaymentType, PayoutMethod, PaymentTransactionStatus, PayoutStatus };

// ============================================================================
// PayMongo API Types
// ============================================================================

export interface PayMongoConfig {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
  webhookSecret?: string;
  isSandbox: boolean;
}

export interface PaymentIntent {
  id: string;
  type: 'payment_intent';
  attributes: {
    amount: number;
    currency: string;
    description?: string;
    statement_descriptor?: string;
    status: 'awaiting_payment_method' | 'awaiting_next_action' | 'processing' | 'succeeded' | 'failed';
    payment_method_allowed: GatewayPaymentType[];
    client_key: string;
    last_payment_error?: {
      failed_code: string;
      failed_message: string;
      payment_method_id: string;
    } | null;
    metadata?: Record<string, string>;
    created_at: number;
    updated_at: number;
  };
}

export interface PaymentMethod {
  id: string;
  type: 'payment_method';
  attributes: {
    type: GatewayPaymentType;
    billing?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      };
    };
    details?: {
      last4?: string;
      exp_month?: number;
      exp_year?: number;
      bank_code?: string;
    };
    created_at: number;
    updated_at: number;
  };
}

export interface PaymentSource {
  id: string;
  type: 'source';
  attributes: {
    type: 'gcash' | 'grab_pay';
    amount: number;
    currency: string;
    status: 'pending' | 'chargeable' | 'cancelled' | 'expired' | 'paid' | 'failed';
    redirect: {
      checkout_url: string;
      success: string;
      failed: string;
    };
    billing?: PaymentMethod['attributes']['billing'];
    created_at: number;
  };
}

// ============================================================================
// Application Payment Types
// ============================================================================

export interface CreatePaymentRequest {
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  paymentType: GatewayPaymentType;
  description?: string;
  billing?: {
    name: string;
    email: string;
    phone?: string;
  };
  cardDetails?: {
    cardNumber: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  };
  returnUrl?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  status: PaymentTransactionStatus;
  gatewayIntentId?: string;
  checkoutUrl?: string;
  redirectUrl?: string;
  clientKey?: string;
  referenceNumber?: string;
  error?: string;
}

/** Escrow hold status on a payment transaction */
export type EscrowStatus = 'none' | 'held' | 'released' | 'refunded';

export interface PaymentTransaction {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  gateway: string;
  gatewayPaymentIntentId: string | null;
  gatewayPaymentMethodId: string | null;
  gatewaySourceId: string | null;
  gatewayCheckoutUrl: string | null;
  amount: number;
  currency: string;
  paymentType: GatewayPaymentType;
  status: PaymentTransactionStatus;
  description: string | null;
  statementDescriptor: string | null;
  metadata: Record<string, any>;
  failureReason: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  // Escrow fields
  escrowStatus: EscrowStatus;
  escrowHeldAt: string | null;
  escrowReleaseAt: string | null;
  escrowReleasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Seller Payout Types
// ============================================================================

export interface SellerPayoutSettings {
  id: string;
  sellerId: string;
  payoutMethod: PayoutMethod;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  ewalletProvider: 'gcash' | 'maya' | null;
  ewalletNumber: string | null;
  autoPayout: boolean;
  minPayoutAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SellerPayout {
  id: string;
  sellerId: string;
  orderId: string | null;
  paymentTransactionId: string | null;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  payoutMethod: PayoutMethod;
  payoutAccountDetails: Record<string, any>;
  status: PayoutStatus;
  processedAt: string | null;
  failureReason: string | null;
  // Escrow fields
  escrowTransactionId: string | null;
  releaseAfter: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerEarningsSummary {
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  platformFees: number;
  netIncome: number;
  transactionCount: number;
}

/** Sandbox test card numbers */
export const SANDBOX_TEST_CARDS = {
  visa: { number: '4343434343434345', expMonth: 12, expYear: 2029, cvc: '123' },
  mastercard: { number: '5555444444444457', expMonth: 12, expYear: 2029, cvc: '123' },
  declined: { number: '4000000000000002', expMonth: 12, expYear: 2029, cvc: '123' },
  insufficientFunds: { number: '4000000000009995', expMonth: 12, expYear: 2029, cvc: '123' },
} as const;

/** Sandbox test e-wallet accounts */
export const SANDBOX_TEST_WALLETS = {
  gcash: { phone: '09171234567', otp: '123456' },
  maya: { phone: '09181234567', otp: '123456' },
  grabPay: { phone: '09191234567', otp: '123456' },
} as const;
