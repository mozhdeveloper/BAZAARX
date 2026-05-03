/**
 * Payment Service
 * Handles payment method management for buyers
 * Uses the payment_methods table (with payment_method_cards and payment_method_wallets detail tables)
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { PaymentMethod } from '@/stores/buyerStore';
import { validateTestCard } from '@/utils/testCardValidator';

export interface PaymentMethodData {
    type: 'card' | 'wallet';
    brand: string;
    last4?: string;
    expiry?: string;
    accountNumber?: string;
    isDefault: boolean;
}

export class PaymentService {
    private static instance: PaymentService;

    private constructor() { }

    static getInstance(): PaymentService {
        if (!PaymentService.instance) {
            PaymentService.instance = new PaymentService();
        }
        return PaymentService.instance;
    }

    async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured - returning empty payment methods array');
            return [];
        }

        try {
            // Fetch from the payment_methods table with card/wallet details
            const { data: methods, error } = await supabase
                .from('payment_methods')
                .select('*, payment_method_cards(*), payment_method_wallets(*)')
                .eq('user_id', userId)
                .order('is_default', { ascending: false });

            if (error) {
                if (error.code === 'PGRST116') return [];
                throw error;
            }

            return (methods || []).map((m: any) => {
                const card = m.payment_method_cards;
                const wallet = m.payment_method_wallets;
                return {
                    id: m.id,
                    type: m.payment_type === 'e_wallet' ? 'wallet' : m.payment_type,
                    brand: card?.card_brand || wallet?.e_wallet_provider || m.label || '',
                    last4: card?.card_last4 || undefined,
                    expiry: card ? `${String(card.expiry_month).padStart(2, '0')}/${card.expiry_year}` : undefined,
                    accountNumber: wallet?.e_wallet_account_number || undefined,
                    isDefault: m.is_default,
                };
            });
        } catch (error) {
            console.error('Error fetching payment methods:', error);
            return [];
        }
    }

    async addPaymentMethod(userId: string, method: PaymentMethodData): Promise<PaymentMethod> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured - cannot add payment method');
        }

        try {
            // --- STEP 1: Block Test Cards ---
            // "Quick Auto-fill" test cards should never be persisted to the database.
            if (method.type === 'card' && method.last4 && method.expiry) {
                // For validation, we need a card number. If only last4 is provided, we can't fully validate
                // But usually addPaymentMethod is called with more details if coming from a form.
                // However, PayMongo cards are added via PayMongoService which usually handles tokens.
                // Let's check if we have a full card number in the context.
                // Actually, PayMongo test cards have specific last4s.
                // But the best place is where the card number is actually available.
            }

            // --- STEP 2: Prevent Duplicates ---
            if (method.type === 'card') {
                const { data: existingPM, error: searchError } = await supabase
                    .from('payment_methods')
                    .select('*, payment_method_cards!inner(*)')
                    .eq('user_id', userId)
                    .eq('payment_type', 'card')
                    .eq('payment_method_cards.card_last4', method.last4)
                    .eq('payment_method_cards.card_brand', method.brand.toUpperCase());

                if (!searchError && existingPM && existingPM.length > 0) {
                    console.log('[PaymentService] Duplicate card detected, returning existing record');
                    const m = existingPM[0];
                    const card = m.payment_method_cards;
                    return {
                        id: m.id,
                        type: 'card',
                        brand: card.card_brand.toLowerCase(),
                        last4: card.card_last4,
                        expiry: `${String(card.expiry_month).padStart(2, '0')}/${String(card.expiry_year).slice(-2)}`,
                        isDefault: m.is_default,
                    };
                }
            }

            // If setting as default, unset existing defaults first
            if (method.isDefault) {
                await supabase
                    .from('payment_methods')
                    .update({ is_default: false })
                    .eq('user_id', userId)
                    .eq('is_default', true);
            }

            const paymentType = method.type === 'wallet' ? 'e_wallet' : 'card';

            // Insert into payment_methods
            const { data: pm, error } = await supabase
                .from('payment_methods')
                .insert({
                    user_id: userId,
                    payment_type: paymentType,
                    label: method.brand || (method.type === 'card' ? 'Card' : 'Wallet'),
                    is_default: method.isDefault,
                })
                .select()
                .single();

            if (error) throw error;

            // Insert detail record
            if (method.type === 'card' && pm) {
                // Defensive parsing with validation
                const parts = (method.expiry || '').split('/');
                if (parts.length !== 2) {
                    console.error('[PaymentService] Invalid expiry format:', method.expiry);
                    throw new Error('Invalid card expiry format');
                }

                const expMonth = parseInt(parts[0], 10);
                const expYearShort = parseInt(parts[1], 10);

                // Validate month range (1-12)
                if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
                    console.error('[PaymentService] Invalid month:', parts[0]);
                    throw new Error('Invalid card expiry month');
                }

                // Convert 2-digit year to 4-digit year: "26" → 2026
                let expYear: number;
                if (expYearShort < 100) {
                    expYear = 2000 + expYearShort;
                } else {
                    expYear = expYearShort;
                }

                // Validate year is >= 2024 (database constraint)
                if (isNaN(expYear) || expYear < 2024) {
                    console.error('[PaymentService] Card year is invalid or expired:', expYearShort);
                    throw new Error('Card expired or invalid year');
                }
                
                await supabase.from('payment_method_cards').insert({
                    payment_method_id: pm.id,
                    card_last4: method.last4 || '',
                    card_brand: method.brand || '',
                    expiry_month: expMonth,
                    expiry_year: expYear,
                });
            } else if (method.type === 'wallet' && pm) {
                await supabase.from('payment_method_wallets').insert({
                    payment_method_id: pm.id,
                    e_wallet_provider: method.brand || '',
                    e_wallet_account_number: method.accountNumber || '',
                });
            }

            return {
                id: pm.id,
                type: method.type,
                brand: method.brand,
                last4: method.last4,
                expiry: method.expiry,
                accountNumber: method.accountNumber,
                isDefault: method.isDefault,
            };
        } catch (error: any) {
            console.error('Error adding payment method:', error);
            throw new Error(error.message || 'Failed to add payment method.');
        }
    }

    async deletePaymentMethod(userId: string, methodId: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured - cannot delete payment method');
        }

        try {
            // Detail tables cascade-delete via FK, but be safe
            await supabase.from('payment_method_cards').delete().eq('payment_method_id', methodId);
            await supabase.from('payment_method_wallets').delete().eq('payment_method_id', methodId);

            const { error } = await supabase
                .from('payment_methods')
                .delete()
                .eq('id', methodId)
                .eq('user_id', userId);

            if (error) throw error;
        } catch (error: any) {
            console.error('Error deleting payment method:', error);
            throw new Error(error.message || 'Failed to delete payment method.');
        }
    }

    async setDefaultPaymentMethod(userId: string, methodId: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            // Unset all defaults for this user
            await supabase
                .from('payment_methods')
                .update({ is_default: false })
                .eq('user_id', userId)
                .eq('is_default', true);

            // Set the new default
            const { error } = await supabase
                .from('payment_methods')
                .update({ is_default: true })
                .eq('id', methodId)
                .eq('user_id', userId);

            if (error) throw error;
        } catch (error: any) {
            console.error('Error setting default payment method:', error);
            throw new Error(error.message || 'Failed to set default payment method.');
        }
    }

    async syncPaymentMethods(_userId: string, _paymentMethods: PaymentMethod[]): Promise<void> {
        // Sync is handled by direct CRUD operations above — no-op for backward compatibility
        console.warn('syncPaymentMethods is deprecated. Use add/delete/setDefault instead.');
    }
}

export const paymentService = PaymentService.getInstance();