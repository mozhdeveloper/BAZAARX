/**
 * Payment Service
 * Handles payment method management for buyers
 * Uses the payment_methods table (with payment_method_cards and payment_method_wallets detail tables)
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { PaymentMethod } from '@/stores/buyerStore';

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
                const [expMonth, expYear] = (method.expiry || '').split('/');
                await supabase.from('payment_method_cards').insert({
                    payment_method_id: pm.id,
                    card_last4: method.last4 || '',
                    card_brand: method.brand || '',
                    expiry_month: parseInt(expMonth) || 1,
                    expiry_year: parseInt(expYear) || 2026,
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