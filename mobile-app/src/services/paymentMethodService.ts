/**
 * Payment Method Service - Mobile
 * Handles saving, loading, and managing buyer's payment methods (PayMongo cards)
 * Uses existing Supabase tables: payment_methods, payment_method_cards
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { validateTestCard } from '../utils/testCardValidator';

export interface SavedPaymentMethod {
  id: string;
  userId: string;
  cardBrand: 'visa' | 'mastercard';
  lastFour: string;
  expiryDate: string; // MM/YY format
  cardholderName: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CardDetailsForStorage {
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
}

const STORAGE_KEY = 'saved_payment_methods';
const SYNC_CACHE_KEY = 'payment_methods_synced';

export class PaymentMethodService {
  private static instance: PaymentMethodService;

  private constructor() {}

  static getInstance(): PaymentMethodService {
    if (!PaymentMethodService.instance) {
      PaymentMethodService.instance = new PaymentMethodService();
    }
    return PaymentMethodService.instance;
  }

  /**
   * Get all saved payment methods for a user
   * Fetches from payment_methods + payment_method_cards join
   */
  async getSavedPaymentMethods(userId: string): Promise<SavedPaymentMethod[]> {
    try {
      // Try to fetch from Supabase
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('*, payment_method_cards(*)')
          .eq('user_id', userId)
          .eq('payment_type', 'card')
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Map database format to app format
          const methods = data.map((m: any) => {
            const card = Array.isArray(m.payment_method_cards) ? m.payment_method_cards[0] : m.payment_method_cards;
            return {
              id: m.id,
              userId: m.user_id,
              cardBrand: (card?.card_brand || 'visa').toLowerCase() as 'visa' | 'mastercard',
              lastFour: card?.card_last4 || '',
              expiryDate: card ? `${String(card.expiry_month).padStart(2, '0')}/${String(card.expiry_year).slice(-2)}` : '',
              cardholderName: m.label || '',
              isDefault: m.is_default,
              createdAt: m.created_at,
              updatedAt: m.updated_at,
            };
          });

          // Cache locally
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(methods));
          return methods;
        }
      }

      // Fallback: Load from AsyncStorage
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('[PaymentMethod] Error fetching saved payment methods:', error);
      // Last resort: return empty array
      return [];
    }
  }

  /**
   * Save a new payment method (PayMongo card)
   * Only stores last 4 digits + metadata (never full card number)
   */
  async savePaymentMethod(
    userId: string,
    cardDetails: CardDetailsForStorage,
    isDefault: boolean = false
  ): Promise<SavedPaymentMethod | null> {
    try {
      if (!userId) {
        console.error('[PaymentMethod] User ID required to save payment method');
        return null;
      }

      // Extract card brand from card number
      const cardBrand = this.detectCardBrand(cardDetails.cardNumber);
      const lastFour = cardDetails.cardNumber.slice(-4);
      const parts = cardDetails.expiryDate.split('/');
      
      if (parts.length !== 2) {
        console.error('[PaymentMethod] Invalid expiry date format');
        return null;
      }
      
      const expMonth = parseInt(parts[0], 10);
      const expYearShort = parseInt(parts[1], 10);
      
      // Validate month is 01-12
      if (expMonth < 1 || expMonth > 12) {
        console.error('[PaymentMethod] Invalid expiry month');
        return null;
      }
      
      // Convert 2-digit year to 4-digit year
      // If year is less than 100, add 2000. Otherwise assume it's already 4-digit.
      let expYear: number;
      if (expYearShort < 100) {
        expYear = 2000 + expYearShort;
      } else {
        expYear = expYearShort;
      }
      
      // Validate expiry year is valid (must be at least 2024)
      if (expYear < 2024) {
        console.error('[PaymentMethod] Card year is invalid or expired');
        return null;
      }

      // --- STEP 1: Block Test Cards ---
      // Per requirements, "Quick Auto-fill" test cards should never be persisted
      const testValidation = validateTestCard(cardDetails.cardNumber, cardDetails.expiryDate, cardDetails.cvv);
      if (testValidation.isTestCard) {
        console.log('[PaymentMethod] Test card detected, skipping database persistence');
        return null;
      }

      // Save to Supabase if configured
      if (isSupabaseConfigured()) {
        // --- STEP 2: Prevent Duplicates ---
        // Check if card with same last4 and brand already exists for this user
        const { data: existingCards, error: searchError } = await supabase
          .from('payment_methods')
          .select('*, payment_method_cards!inner(*)')
          .eq('user_id', userId)
          .eq('payment_type', 'card')
          .eq('payment_method_cards.card_last4', lastFour)
          .eq('payment_method_cards.card_brand', cardBrand.toUpperCase());

        if (!searchError && existingCards && existingCards.length > 0) {
          console.log('[PaymentMethod] Duplicate card detected, returning existing record');
          const m = existingCards[0];
          const card = Array.isArray(m.payment_method_cards) ? m.payment_method_cards[0] : m.payment_method_cards;
          
          const existingMethod: SavedPaymentMethod = {
            id: m.id,
            userId: m.user_id,
            cardBrand: (card?.card_brand || 'visa').toLowerCase() as 'visa' | 'mastercard',
            lastFour: card?.card_last4 || '',
            expiryDate: card ? `${String(card.expiry_month).padStart(2, '0')}/${String(card.expiry_year).slice(-2)}` : '',
            cardholderName: m.label || '',
            isDefault: m.is_default,
            createdAt: m.created_at,
            updatedAt: m.updated_at,
          };

          // If we want to ensure it's set as default if requested
          if (isDefault && !m.is_default) {
            await this.setDefaultPaymentMethod(userId, m.id);
            existingMethod.isDefault = true;
          }

          return existingMethod;
        }

        // If setting as default, unset other defaults
        if (isDefault) {
          await supabase
            .from('payment_methods')
            .update({ is_default: false })
            .eq('user_id', userId)
            .eq('is_default', true);
        }

        // Insert into payment_methods
        const { data: pm, error: pmError } = await supabase
          .from('payment_methods')
          .insert({
            user_id: userId,
            payment_type: 'card',
            label: `${cardBrand} ••••${lastFour}`,
            is_default: isDefault,
            is_verified: false,
          })
          .select()
          .single();

        if (pmError) {
          console.error('[PaymentMethod] Error creating payment method record:', pmError);
          return null;
        }

        // Insert into payment_method_cards
        if (pm) {
          const { error: cardError } = await supabase
            .from('payment_method_cards')
            .insert({
              payment_method_id: pm.id,
              card_last4: lastFour,
              card_brand: cardBrand.toUpperCase(),
              expiry_month: expMonth,
              expiry_year: expYear,
            });

          if (cardError) {
            console.error('[PaymentMethod] Error creating card record:', cardError);
            return null;
          }

          const newMethod: SavedPaymentMethod = {
            id: pm.id,
            userId,
            cardBrand: cardBrand as 'visa' | 'mastercard',
            lastFour,
            expiryDate: cardDetails.expiryDate,
            cardholderName: cardDetails.cardName,
            isDefault,
            createdAt: pm.created_at,
            updatedAt: pm.updated_at,
          };

          // Refresh cache
          await this.getSavedPaymentMethods(userId);
          return newMethod;
        }
      }

      // Fallback: Save to AsyncStorage only
      const newMethod: SavedPaymentMethod = {
        id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId,
        cardBrand: cardBrand as 'visa' | 'mastercard',
        lastFour,
        expiryDate: cardDetails.expiryDate,
        cardholderName: cardDetails.cardName,
        isDefault,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const existing = await this.getSavedPaymentMethods(userId);
      
      // If setting as default, unset others
      if (isDefault) {
        existing.forEach(m => m.isDefault = false);
      }

      existing.push(newMethod);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

      return newMethod;
    } catch (error) {
      console.error('[PaymentMethod] Error saving payment method:', error);
      return null;
    }
  }

  /**
   * Delete a saved payment method
   */
  async deletePaymentMethod(userId: string, methodId: string): Promise<boolean> {
    try {
      // Delete from Supabase if configured
      if (isSupabaseConfigured()) {
        // Delete card details first (should cascade, but be safe)
        await supabase
          .from('payment_method_cards')
          .delete()
          .eq('payment_method_id', methodId);

        // Then delete payment method
        const { error } = await supabase
          .from('payment_methods')
          .delete()
          .eq('id', methodId)
          .eq('user_id', userId);

        if (error) {
          console.error('[PaymentMethod] Error deleting from Supabase:', error);
        } else {
          // Refresh cache
          await this.getSavedPaymentMethods(userId);
          return true;
        }
      }

      // Fallback: Delete from AsyncStorage
      const existing = await this.getSavedPaymentMethods(userId);
      const filtered = existing.filter(m => m.id !== methodId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      return true;
    } catch (error) {
      console.error('[PaymentMethod] Error deleting payment method:', error);
      return false;
    }
  }

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(userId: string, methodId: string): Promise<boolean> {
    try {
      // Update in Supabase if configured
      if (isSupabaseConfigured()) {
        // Unset all others
        await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true);

        // Set this one as default
        const { error } = await supabase
          .from('payment_methods')
          .update({ is_default: true })
          .eq('id', methodId)
          .eq('user_id', userId);

        if (error) {
          console.error('[PaymentMethod] Error setting default:', error);
        } else {
          await this.getSavedPaymentMethods(userId);
          return true;
        }
      }

      // Fallback: Update AsyncStorage
      const existing = await this.getSavedPaymentMethods(userId);
      existing.forEach(m => m.isDefault = m.id === methodId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

      return true;
    } catch (error) {
      console.error('[PaymentMethod] Error setting default:', error);
      return false;
    }
  }

  /**
   * Detect card brand from card number
   */
  private detectCardBrand(cardNumber: string): 'visa' | 'mastercard' {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'visa';
    if (cleaned.startsWith('5')) return 'mastercard';
    // Add more brands as needed (Amex, Discover, etc.)
    return 'visa'; // Default to Visa
  }

  /**
   * Format card number for display (show last 4 only)
   */
  formatCardForDisplay(brand: 'visa' | 'mastercard', lastFour: string): string {
    const emoji = brand === 'visa' ? '💳' : brand === 'mastercard' ? '💳' : '💳';
    return `${emoji} ${brand.toUpperCase()} ••••${lastFour}`;
  }

  /**
   * Clear all cached payment methods
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[PaymentMethod] Error clearing cache:', error);
    }
  }
}

export const paymentMethodService = PaymentMethodService.getInstance();
