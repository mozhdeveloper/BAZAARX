/**
 * Payment Service
 * Handles payment method management for buyers
 * Integrates with Supabase database and storage
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

  private constructor() {}

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
      // Fetch payment methods from buyers table
      const { data: buyer, error } = await supabase
        .from('buyers')
        .select('payment_methods')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          return [];
        }
        throw error;
      }
      
      return buyer?.payment_methods || [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return []; // Return empty array instead of throwing
    }
  }

  async addPaymentMethod(userId: string, method: PaymentMethodData): Promise<PaymentMethod> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot add payment method');
    }

    try {
      // Create the payment method object
      const paymentMethod: PaymentMethod = {
        id: `${method.type}_${Date.now()}`,
        type: method.type,
        brand: method.brand,
        last4: method.last4,
        expiry: method.expiry,
        accountNumber: method.accountNumber,
        isDefault: method.isDefault
      };

      // If setting as default, update existing methods
      if (method.isDefault) {
        await this.unsetDefaultPaymentMethods(userId);
      }

      // Update the buyer's payment methods array
      const { error } = await supabase.rpc('add_payment_method', {
        user_id: userId,
        payment_method_data: paymentMethod
      });

      if (error) throw error;
      
      return paymentMethod;
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
      const { error } = await supabase.rpc('delete_payment_method', {
        user_id: userId,
        method_id: methodId
      });

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
      // First unset all defaults
      await this.unsetDefaultPaymentMethods(userId);
      
      // Then set the new default
      const { error } = await supabase.rpc('set_default_payment_method', {
        user_id: userId,
        method_id: methodId
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      throw new Error(error.message || 'Failed to set default payment method.');
    }
  }

  private async unsetDefaultPaymentMethods(userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      const { error } = await supabase.rpc('unset_default_payment_methods', {
        user_id: userId
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error unsetting default payment methods:', error);
      // Don't throw here as this is a helper method
    }
  }

  async syncPaymentMethods(userId: string, paymentMethods: PaymentMethod[]): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot sync payment methods');
    }

    try {
      const { error } = await supabase
        .from('buyers')
        .update({ payment_methods: paymentMethods })
        .eq('id', userId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error syncing payment methods:', error);
      throw new Error(error.message || 'Failed to sync payment methods.');
    }
  }
}

export const paymentService = PaymentService.getInstance();