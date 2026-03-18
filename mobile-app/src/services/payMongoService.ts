/**
 * PayMongo Gateway Service — Mobile (React Native / Expo)
 *
 * Sandbox-first: works without real API keys.
 * In production, real PayMongo API calls are used.
 *
 * Key differences from web:
 * - Uses process.env.EXPO_PUBLIC_* instead of import.meta.env
 * - E-wallet redirects via Linking.openURL + bazaarx:// deep links
 * - No window.location — uses configurable deep link scheme
 */

import { Linking } from 'react-native';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { PaymentTransactionStatus } from '../types/database.types';
import type {
  PaymentIntent,
  PaymentMethod,
  PaymentSource,
  PayMongoConfig,
  CreatePaymentRequest,
  PaymentResult,
  PaymentTransaction,
  SellerPayoutSettings,
  SellerPayout,
  SellerEarningsSummary,
  GatewayPaymentType,
  PayoutMethod,
} from '../types/payment.types';

// ============================================================================
// Configuration
// ============================================================================

const PAYMONGO_CONFIG: PayMongoConfig = {
  publicKey: process.env.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY || 'pk_test_sandbox_key',
  secretKey: process.env.EXPO_PUBLIC_PAYMONGO_SECRET_KEY || 'sk_test_sandbox_key',
  baseUrl: process.env.EXPO_PUBLIC_PAYMONGO_BASE_URL || 'https://api.paymongo.com/v1',
  webhookSecret: process.env.EXPO_PUBLIC_PAYMONGO_WEBHOOK_SECRET,
  isSandbox: (process.env.EXPO_PUBLIC_PAYMONGO_SANDBOX ?? 'true') === 'true',
};

const PLATFORM_FEE_RATE = 0.05; // 5% platform fee
const DEEP_LINK_SCHEME = 'bazaarx://';

// ============================================================================
// PayMongo Gateway Service
// ============================================================================

export class PayMongoGatewayService {
  private static instance: PayMongoGatewayService;
  private config: PayMongoConfig;

  private constructor() {
    this.config = PAYMONGO_CONFIG;
  }

  static getInstance(): PayMongoGatewayService {
    if (!PayMongoGatewayService.instance) {
      PayMongoGatewayService.instance = new PayMongoGatewayService();
    }
    return PayMongoGatewayService.instance;
  }

  get isSandbox(): boolean {
    return this.config.isSandbox;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BUYER: Create Payment
  // ──────────────────────────────────────────────────────────────────────────

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { paymentType } = request;
    const transaction = await this.createTransactionRecord(request);

    try {
      let result: PaymentResult;

      switch (paymentType) {
        case 'card':
          result = await this.processCardPayment(transaction.id, request);
          break;
        case 'gcash':
        case 'maya':
        case 'grab_pay':
          result = await this.processEWalletPayment(transaction.id, request);
          break;
        case 'bank_transfer':
          result = await this.processBankTransfer(transaction.id, request);
          break;
        case 'cod':
          result = await this.processCODPayment(transaction.id, request);
          break;
        default:
          throw new Error(`Unsupported payment type: ${paymentType}`);
      }

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payment processing failed';
      await this.updateTransactionStatus(transaction.id, 'failed', {
        failureReason: message,
      });
      throw new Error(message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Card Payment Flow
  // ──────────────────────────────────────────────────────────────────────────

  private async processCardPayment(transactionId: string, request: CreatePaymentRequest): Promise<PaymentResult> {
    const intent = await this.apiCreatePaymentIntent({
      amount: Math.round(request.amount * 100),
      currency: 'PHP',
      payment_method_allowed: ['card'],
      description: request.description || `Order payment — ${request.orderId}`,
      statement_descriptor: 'BAZAAR',
      metadata: {
        order_id: request.orderId,
        buyer_id: request.buyerId,
        transaction_id: transactionId,
      },
    });

    const paymentMethod = await this.apiCreatePaymentMethod({
      type: 'card',
      details: request.cardDetails ? {
        card_number: request.cardDetails.cardNumber,
        exp_month: request.cardDetails.expMonth,
        exp_year: request.cardDetails.expYear,
        cvc: request.cardDetails.cvc,
      } : undefined,
      billing: request.billing ? {
        name: request.billing.name,
        email: request.billing.email,
        phone: request.billing.phone,
      } : undefined,
    });

    const returnUrl = request.returnUrl || `${DEEP_LINK_SCHEME}payment/callback`;

    const attachedIntent = await this.apiAttachPaymentIntent(
      intent.id,
      paymentMethod.id,
      returnUrl,
    );

    await this.updateTransactionStatus(transactionId, 'processing', {
      gatewayPaymentIntentId: intent.id,
      gatewayPaymentMethodId: paymentMethod.id,
    });

    const status = attachedIntent.attributes.status;

    if (status === 'succeeded') {
      await this.onPaymentSuccess(transactionId, request);
      return {
        success: true,
        transactionId,
        status: 'paid',
        gatewayIntentId: intent.id,
      };
    }

    if (status === 'awaiting_next_action') {
      await this.updateTransactionStatus(transactionId, 'awaiting_payment');
      return {
        success: true,
        transactionId,
        status: 'awaiting_payment',
        gatewayIntentId: intent.id,
        clientKey: attachedIntent.attributes.client_key,
      };
    }

    throw new Error(`Unexpected payment status: ${status}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // E-Wallet Payment Flow (GCash, Maya, GrabPay)
  // ──────────────────────────────────────────────────────────────────────────

  private async processEWalletPayment(transactionId: string, request: CreatePaymentRequest): Promise<PaymentResult> {
    const { amount, paymentType } = request;

    const sourceTypeMap: Record<string, 'gcash' | 'grab_pay' | 'paymaya'> = {
      gcash: 'gcash',
      maya: 'paymaya',
      grab_pay: 'grab_pay',
    };
    const sourceType = sourceTypeMap[paymentType] || 'gcash';

    const source = await this.apiCreateSource({
      type: sourceType as 'gcash' | 'grab_pay',
      amount: Math.round(amount * 100),
      currency: 'PHP',
      redirect: {
        success: `${DEEP_LINK_SCHEME}payment/success?txn=${transactionId}`,
        failed: `${DEEP_LINK_SCHEME}payment/failed?txn=${transactionId}`,
      },
      billing: request.billing ? {
        name: request.billing.name,
        email: request.billing.email,
        phone: request.billing.phone,
      } : undefined,
    });

    await this.updateTransactionStatus(transactionId, 'awaiting_payment', {
      gatewaySourceId: source.id,
      gatewayCheckoutUrl: source.attributes.redirect.checkout_url,
    });

    return {
      success: true,
      transactionId,
      status: 'awaiting_payment',
      checkoutUrl: source.attributes.redirect.checkout_url,
    };
  }

  /**
   * Open e-wallet checkout URL in device browser.
   * After payment, user is redirected back via bazaarx:// deep link.
   */
  async openEWalletCheckout(checkoutUrl: string): Promise<void> {
    const canOpen = await Linking.canOpenURL(checkoutUrl);
    if (canOpen) {
      await Linking.openURL(checkoutUrl);
    } else {
      throw new Error('Cannot open payment page. Please try again.');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Bank Transfer Flow
  // ──────────────────────────────────────────────────────────────────────────

  private async processBankTransfer(transactionId: string, _request: CreatePaymentRequest): Promise<PaymentResult> {
    const reference = `BZR-${Date.now().toString(36).toUpperCase()}`;

    await this.updateTransactionStatus(transactionId, 'awaiting_payment', {
      metadata: {
        bankReference: reference,
        bankInstructions: 'Transfer to BDO Account: 1234-5678-9012. Use reference number as remarks.',
      },
    });

    return {
      success: true,
      transactionId,
      status: 'awaiting_payment',
      referenceNumber: reference,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // COD Payment Flow
  // ──────────────────────────────────────────────────────────────────────────

  private async processCODPayment(transactionId: string, _request: CreatePaymentRequest): Promise<PaymentResult> {
    await this.updateTransactionStatus(transactionId, 'awaiting_payment', {
      metadata: { codNote: 'Payment to be collected on delivery' },
    });

    return {
      success: true,
      transactionId,
      status: 'awaiting_payment',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Payment Confirmation
  // ──────────────────────────────────────────────────────────────────────────

  async confirmPayment(transactionId: string): Promise<PaymentResult> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { data: txn, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error || !txn) throw new Error('Transaction not found');
    if (txn.status === 'paid') {
      return { success: true, transactionId, status: 'paid' };
    }

    // Check PayMongo intent
    if (txn.gateway_payment_intent_id) {
      const intent = await this.apiRetrievePaymentIntent(txn.gateway_payment_intent_id);
      if (intent.attributes.status === 'succeeded') {
        await this.onPaymentSuccess(transactionId, {
          orderId: txn.order_id,
          buyerId: txn.buyer_id,
          sellerId: txn.seller_id,
          amount: Number(txn.amount),
          paymentType: txn.payment_type as GatewayPaymentType,
        });
        return { success: true, transactionId, status: 'paid' };
      }
      if (intent.attributes.status === 'failed') {
        const msg = intent.attributes.last_payment_error?.failed_message || 'Payment failed';
        await this.updateTransactionStatus(transactionId, 'failed', { failureReason: msg });
        return { success: false, transactionId, status: 'failed', error: msg };
      }
      return { success: true, transactionId, status: 'processing' };
    }

    // Check source status (GCash/Maya)
    if (txn.gateway_source_id) {
      const source = await this.apiRetrieveSource(txn.gateway_source_id);
      if (source.attributes.status === 'paid' || source.attributes.status === 'chargeable') {
        await this.onPaymentSuccess(transactionId, {
          orderId: txn.order_id,
          buyerId: txn.buyer_id,
          sellerId: txn.seller_id,
          amount: Number(txn.amount),
          paymentType: txn.payment_type as GatewayPaymentType,
        });
        return { success: true, transactionId, status: 'paid' };
      }
      if (source.attributes.status === 'cancelled' || source.attributes.status === 'expired') {
        await this.updateTransactionStatus(transactionId, 'failed', { failureReason: 'Payment cancelled or expired' });
        return { success: false, transactionId, status: 'failed', error: 'Payment cancelled' };
      }
    }

    return { success: true, transactionId, status: 'processing' };
  }

  async confirmCODPayment(orderId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { data: txn } = await supabase
      .from('payment_transactions')
      .select('id, buyer_id, seller_id, amount, payment_type')
      .eq('order_id', orderId)
      .eq('payment_type', 'cod')
      .eq('status', 'awaiting_payment')
      .single();

    if (txn) {
      await this.onPaymentSuccess(txn.id, {
        orderId,
        buyerId: txn.buyer_id,
        sellerId: txn.seller_id,
        amount: Number(txn.amount),
        paymentType: txn.payment_type as GatewayPaymentType,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Refunds
  // ──────────────────────────────────────────────────────────────────────────

  async refundPayment(transactionId: string, amount?: number): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { data: txn } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('status', 'paid')
      .single();

    if (!txn) throw new Error('Paid transaction not found');

    const refundAmount = amount || Number(txn.amount);
    const isPartial = refundAmount < Number(txn.amount);

    if (txn.gateway_payment_intent_id) {
      await this.apiCreateRefund(txn.gateway_payment_intent_id, Math.round(refundAmount * 100));
    }

    await this.updateTransactionStatus(transactionId, isPartial ? 'partially_refunded' : 'refunded', {
      refundedAt: new Date().toISOString(),
    });

    // Mark escrow as refunded
    await supabase
      .from('payment_transactions')
      .update({ escrow_status: 'refunded', updated_at: new Date().toISOString() })
      .eq('id', transactionId);

    await supabase
      .from('orders')
      .update({
        payment_status: isPartial ? 'partially_refunded' : 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', txn.order_id);

    await supabase
      .from('seller_payouts')
      .update({ status: 'on_hold', updated_at: new Date().toISOString() })
      .eq('payment_transaction_id', transactionId)
      .in('status', ['pending', 'on_hold']);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SELLER: Payout Settings
  // ──────────────────────────────────────────────────────────────────────────

  async getPayoutSettings(sellerId: string): Promise<SellerPayoutSettings | null> {
    if (!isSupabaseConfigured()) return null;

    const { data } = await supabase
      .from('seller_payout_settings')
      .select('*')
      .eq('seller_id', sellerId)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      sellerId: data.seller_id,
      payoutMethod: data.payout_method as PayoutMethod,
      bankName: data.bank_name,
      bankAccountName: data.bank_account_name,
      bankAccountNumber: data.bank_account_number,
      ewalletProvider: data.ewallet_provider as "gcash" | "maya" | null,
      ewalletNumber: data.ewallet_number,
      autoPayout: data.auto_payout ?? false,
      minPayoutAmount: Number(data.min_payout_amount),
      createdAt: data.created_at ?? '',
      updatedAt: data.updated_at ?? '',
    };
  }

  async savePayoutSettings(sellerId: string, settings: Partial<SellerPayoutSettings>): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const payload: Record<string, any> = {
      seller_id: sellerId,
      updated_at: new Date().toISOString(),
    };
    if (settings.payoutMethod !== undefined) payload.payout_method = settings.payoutMethod;
    if (settings.bankName !== undefined) payload.bank_name = settings.bankName;
    if (settings.bankAccountName !== undefined) payload.bank_account_name = settings.bankAccountName;
    if (settings.bankAccountNumber !== undefined) payload.bank_account_number = settings.bankAccountNumber;
    if (settings.ewalletProvider !== undefined) payload.ewallet_provider = settings.ewalletProvider;
    if (settings.ewalletNumber !== undefined) payload.ewallet_number = settings.ewalletNumber;
    if (settings.autoPayout !== undefined) payload.auto_payout = settings.autoPayout;
    if (settings.minPayoutAmount !== undefined) payload.min_payout_amount = settings.minPayoutAmount;

    const { error } = await supabase
      .from('seller_payout_settings')
      .upsert(payload as any, { onConflict: 'seller_id' });

    if (error) throw new Error(error.message || 'Failed to save payout settings');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SELLER: View Payouts
  // ──────────────────────────────────────────────────────────────────────────

  async getSellerPayouts(sellerId: string, limit = 50): Promise<SellerPayout[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('seller_payouts')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.id,
      sellerId: p.seller_id,
      orderId: p.order_id,
      paymentTransactionId: p.payment_transaction_id,
      grossAmount: Number(p.gross_amount),
      platformFee: Number(p.platform_fee),
      netAmount: Number(p.net_amount),
      currency: p.currency,
      payoutMethod: p.payout_method,
      payoutAccountDetails: p.payout_account_details,
      status: p.status,
      processedAt: p.processed_at,
      failureReason: p.failure_reason,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })) as unknown as SellerPayout[];
  }

  async getSellerEarningsSummary(sellerId: string): Promise<SellerEarningsSummary> {
    if (!isSupabaseConfigured()) {
      return { totalEarnings: 0, pendingPayouts: 0, completedPayouts: 0, platformFees: 0, netIncome: 0, transactionCount: 0 };
    }

    const { data: payouts } = await supabase
      .from('seller_payouts')
      .select('gross_amount, platform_fee, net_amount, status')
      .eq('seller_id', sellerId);

    if (!payouts || payouts.length === 0) {
      return { totalEarnings: 0, pendingPayouts: 0, completedPayouts: 0, platformFees: 0, netIncome: 0, transactionCount: 0 };
    }

    const summary: SellerEarningsSummary = {
      totalEarnings: 0,
      pendingPayouts: 0,
      completedPayouts: 0,
      platformFees: 0,
      netIncome: 0,
      transactionCount: payouts.length,
    };

    for (const p of payouts) {
      const gross = Number(p.gross_amount);
      const fee = Number(p.platform_fee);
      const net = Number(p.net_amount);

      summary.totalEarnings += gross;
      summary.platformFees += fee;
      summary.netIncome += net;

      if (p.status === 'completed') summary.completedPayouts += net;
      else if (p.status === 'pending' || p.status === 'processing') summary.pendingPayouts += net;
    }

    return summary;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BUYER: Transaction History
  // ──────────────────────────────────────────────────────────────────────────

  async getBuyerTransactions(buyerId: string, limit = 50): Promise<PaymentTransaction[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(this.transformTransaction);
  }

  async getTransactionByOrderId(orderId: string): Promise<PaymentTransaction | null> {
    if (!isSupabaseConfigured()) return null;

    const { data } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data ? this.transformTransaction(data) : null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internal: Payment Success Handler
  // ──────────────────────────────────────────────────────────────────────────

  private async onPaymentSuccess(
    transactionId: string,
    request: Pick<CreatePaymentRequest, 'orderId' | 'buyerId' | 'sellerId' | 'amount' | 'paymentType'>,
  ): Promise<void> {
    const now = new Date().toISOString();
    const escrowReleaseAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Mark transaction as paid and put in escrow
    await supabase
      .from('payment_transactions')
      .update({
        status: 'paid',
        paid_at: now,
        escrow_status: 'held',
        escrow_held_at: now,
        escrow_release_at: escrowReleaseAt,
        updated_at: now,
      })
      .eq('id', transactionId);

    await supabase
      .from('orders')
      .update({ payment_status: 'paid', paid_at: now, updated_at: now })
      .eq('id', request.orderId);

    await supabase.from('order_status_history').insert({
      order_id: request.orderId,
      status: 'payment_received',
      note: `Payment of ₱${request.amount.toLocaleString()} received via ${request.paymentType}. Funds held in escrow.`,
      changed_by_role: 'system',
    });

    const platformFee = Math.round(request.amount * PLATFORM_FEE_RATE * 100) / 100;
    const netAmount = Math.round((request.amount - platformFee) * 100) / 100;

    const { data: settings } = await supabase
      .from('seller_payout_settings')
      .select('payout_method, bank_name, bank_account_number, ewallet_provider, ewallet_number')
      .eq('seller_id', request.sellerId)
      .single();

    await supabase.from('seller_payouts').insert({
      seller_id: request.sellerId,
      order_id: request.orderId,
      payment_transaction_id: transactionId,
      escrow_transaction_id: transactionId,
      gross_amount: request.amount,
      platform_fee: platformFee,
      net_amount: netAmount,
      payout_method: settings?.payout_method || 'bank_transfer',
      payout_account_details: settings ? {
        bankName: settings.bank_name,
        accountNumber: settings.bank_account_number,
        ewalletProvider: settings.ewallet_provider,
        ewalletNumber: settings.ewallet_number,
      } : {},
      status: 'on_hold',
      release_after: escrowReleaseAt,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internal: Transaction Record Management
  // ──────────────────────────────────────────────────────────────────────────

  private async createTransactionRecord(request: CreatePaymentRequest): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert({
        order_id: request.orderId,
        buyer_id: request.buyerId,
        seller_id: request.sellerId,
        amount: request.amount,
        payment_type: request.paymentType,
        description: request.description || `Payment for order`,
        statement_descriptor: 'BAZAAR',
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) throw new Error('Failed to create payment transaction');
    return { id: data.id };
  }

  private async updateTransactionStatus(
    transactionId: string,
    status: PaymentTransactionStatus,
    extra?: Record<string, any>,
  ): Promise<void> {
    const update: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (extra?.gatewayPaymentIntentId) update.gateway_payment_intent_id = extra.gatewayPaymentIntentId;
    if (extra?.gatewayPaymentMethodId) update.gateway_payment_method_id = extra.gatewayPaymentMethodId;
    if (extra?.gatewaySourceId) update.gateway_source_id = extra.gatewaySourceId;
    if (extra?.gatewayCheckoutUrl) update.gateway_checkout_url = extra.gatewayCheckoutUrl;
    if (extra?.failureReason) update.failure_reason = extra.failureReason;
    if (extra?.paidAt) update.paid_at = extra.paidAt;
    if (extra?.refundedAt) update.refunded_at = extra.refundedAt;
    if (extra?.metadata) update.metadata = extra.metadata;

    await supabase
      .from('payment_transactions')
      .update(update)
      .eq('id', transactionId);
  }

  private transformTransaction(row: any): PaymentTransaction {
    return {
      id: row.id,
      orderId: row.order_id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      gateway: row.gateway,
      gatewayPaymentIntentId: row.gateway_payment_intent_id,
      gatewayPaymentMethodId: row.gateway_payment_method_id,
      gatewaySourceId: row.gateway_source_id,
      gatewayCheckoutUrl: row.gateway_checkout_url,
      amount: Number(row.amount),
      currency: row.currency,
      paymentType: row.payment_type,
      status: row.status,
      description: row.description,
      statementDescriptor: row.statement_descriptor,
      metadata: row.metadata || {},
      failureReason: row.failure_reason,
      paidAt: row.paid_at,
      refundedAt: row.refunded_at,
      escrowStatus: row.escrow_status ?? 'none',
      escrowHeldAt: row.escrow_held_at,
      escrowReleaseAt: row.escrow_release_at,
      escrowReleasedAt: row.escrow_released_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PayMongo API Calls (Sandbox-aware)
  // ──────────────────────────────────────────────────────────────────────────

  private get authHeader(): string {
    // btoa is available in React Native (Hermes engine)
    const encoded = btoa(this.config.secretKey + ':');
    return 'Basic ' + encoded;
  }

  private async apiCreatePaymentIntent(params: {
    amount: number;
    currency: string;
    payment_method_allowed: string[];
    description?: string;
    statement_descriptor?: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent> {
    if (this.config.isSandbox) {
      return this.sandboxCreatePaymentIntent(params);
    }

    const res = await fetch(`${this.config.baseUrl}/payment_intents`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { attributes: params } }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.errors?.[0]?.detail || 'Failed to create payment intent');
    return json.data;
  }

  private async apiCreatePaymentMethod(params: {
    type: string;
    details?: any;
    billing?: any;
  }): Promise<PaymentMethod> {
    if (this.config.isSandbox) {
      return this.sandboxCreatePaymentMethod(params);
    }

    const encoded = btoa(this.config.publicKey + ':');
    const res = await fetch(`${this.config.baseUrl}/payment_methods`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + encoded,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { attributes: params } }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.errors?.[0]?.detail || 'Failed to create payment method');
    return json.data;
  }

  private async apiAttachPaymentIntent(
    intentId: string,
    paymentMethodId: string,
    returnUrl: string,
  ): Promise<PaymentIntent> {
    if (this.config.isSandbox) {
      return this.sandboxAttachPaymentIntent(intentId);
    }

    const res = await fetch(`${this.config.baseUrl}/payment_intents/${intentId}/attach`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: { attributes: { payment_method: paymentMethodId, return_url: returnUrl } },
      }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.errors?.[0]?.detail || 'Failed to attach payment method');
    return json.data;
  }

  private async apiRetrievePaymentIntent(intentId: string): Promise<PaymentIntent> {
    if (this.config.isSandbox) {
      return this.sandboxRetrievePaymentIntent(intentId);
    }

    const res = await fetch(`${this.config.baseUrl}/payment_intents/${intentId}`, {
      headers: { 'Authorization': this.authHeader },
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.errors?.[0]?.detail || 'Failed to retrieve payment intent');
    return json.data;
  }

  private async apiCreateSource(params: {
    type: 'gcash' | 'grab_pay';
    amount: number;
    currency: string;
    redirect: { success: string; failed: string };
    billing?: any;
  }): Promise<PaymentSource> {
    if (this.config.isSandbox) {
      return this.sandboxCreateSource(params);
    }

    const res = await fetch(`${this.config.baseUrl}/sources`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { attributes: params } }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.errors?.[0]?.detail || 'Failed to create source');
    return json.data;
  }

  private async apiRetrieveSource(sourceId: string): Promise<PaymentSource> {
    if (this.config.isSandbox) {
      return this.sandboxRetrieveSource(sourceId);
    }

    const res = await fetch(`${this.config.baseUrl}/sources/${sourceId}`, {
      headers: { 'Authorization': this.authHeader },
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.errors?.[0]?.detail || 'Failed to retrieve source');
    return json.data;
  }

  private async apiCreateRefund(paymentIntentId: string, amountCentavos: number): Promise<void> {
    if (this.config.isSandbox) return;

    const res = await fetch(`${this.config.baseUrl}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountCentavos,
            payment_id: paymentIntentId,
            reason: 'requested_by_customer',
          },
        },
      }),
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.errors?.[0]?.detail || 'Refund failed');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Sandbox Simulation Methods
  // ──────────────────────────────────────────────────────────────────────────

  private sandboxIntents = new Map<string, PaymentIntent>();
  private sandboxSources = new Map<string, PaymentSource>();

  private sandboxCreatePaymentIntent(params: any): PaymentIntent {
    const id = `pi_sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const intent: PaymentIntent = {
      id,
      type: 'payment_intent',
      attributes: {
        amount: params.amount,
        currency: params.currency,
        description: params.description,
        statement_descriptor: params.statement_descriptor,
        status: 'awaiting_payment_method',
        payment_method_allowed: params.payment_method_allowed,
        client_key: `client_key_${id}`,
        metadata: params.metadata,
        created_at: Date.now() / 1000,
        updated_at: Date.now() / 1000,
      },
    };
    this.sandboxIntents.set(id, intent);
    return intent;
  }

  private sandboxCreatePaymentMethod(params: any): PaymentMethod {
    const id = `pm_sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      id,
      type: 'payment_method',
      attributes: {
        type: params.type,
        billing: params.billing,
        details: params.details ? {
          last4: params.details.card_number?.slice(-4),
          exp_month: params.details.exp_month,
          exp_year: params.details.exp_year,
        } : undefined,
        created_at: Date.now() / 1000,
        updated_at: Date.now() / 1000,
      },
    };
  }

  private sandboxAttachPaymentIntent(intentId: string): PaymentIntent {
    const intent = this.sandboxIntents.get(intentId);
    if (!intent) throw new Error('Payment intent not found');
    intent.attributes.status = 'succeeded';
    intent.attributes.updated_at = Date.now() / 1000;
    return intent;
  }

  private sandboxRetrievePaymentIntent(intentId: string): PaymentIntent {
    const intent = this.sandboxIntents.get(intentId);
    if (!intent) throw new Error('Payment intent not found');
    return intent;
  }

  private sandboxCreateSource(params: any): PaymentSource {
    const id = `src_sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    // In sandbox on mobile, the checkout URL uses the deep link scheme
    // so the "redirect" simulates an instant approval
    const source: PaymentSource = {
      id,
      type: 'source',
      attributes: {
        type: params.type,
        amount: params.amount,
        currency: params.currency,
        status: 'pending',
        redirect: {
          checkout_url: `${DEEP_LINK_SCHEME}payment/sandbox-ewallet?src=${id}`,
          success: params.redirect.success,
          failed: params.redirect.failed,
        },
        billing: params.billing,
        created_at: Date.now() / 1000,
      },
    };
    this.sandboxSources.set(id, source);
    return source;
  }

  private sandboxRetrieveSource(sourceId: string): PaymentSource {
    const source = this.sandboxSources.get(sourceId);
    if (!source) throw new Error('Source not found');
    // Sandbox: auto-mark as paid when retrieved
    source.attributes.status = 'paid';
    return source;
  }

  /**
   * Sandbox helper: mark e-wallet payment as completed.
   * Called when handling the sandbox deep link callback.
   */
  sandboxCompleteEWalletPayment(sourceId: string): void {
    const source = this.sandboxSources.get(sourceId);
    if (source) {
      source.attributes.status = 'paid';
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const payMongoService = PayMongoGatewayService.getInstance();
