/**
 * Address Service
 * Handles all address-related database operations
 * Uses shipping_addresses table
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Address } from '@/stores/buyerStore';

export type AddressInsert = {
    user_id: string;
    label: string;
    address_line_1: string;
    address_line_2?: string;
    barangay?: string;
    city: string;
    province: string;
    region: string;
    postal_code: string;
    landmark?: string;
    delivery_instructions?: string;
    is_default?: boolean;
    address_type?: 'residential' | 'commercial';
    coordinates?: { lat: number; lng: number };
};

export type AddressUpdate = Partial<Omit<AddressInsert, 'user_id'>>;

export class AddressService {
    private static instance: AddressService;

    private constructor() { }

    public static getInstance(): AddressService {
        if (!AddressService.instance) {
            AddressService.instance = new AddressService();
        }
        return AddressService.instance;
    }

    /**
     * Get all addresses for a user
     */
    async getUserAddresses(userId: string): Promise<Address[]> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured - cannot fetch addresses');
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('shipping_addresses')
                .select('*')
                .eq('user_id', userId)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                // Handle 404 - table may not exist
                if (error.code === '42P01' || error.code === 'PGRST116' || (error as any).status === 404) {
                    console.warn('shipping_addresses table not found');
                    return [];
                }
                throw error;
            }

            // Map database addresses to Address interface
            return (data || []).map((addr) => this.mapToAddress(addr));
        } catch (error) {
            console.error('Error fetching addresses:', error);
            return []; // Return empty array instead of throwing
        }
    }

    /**
     * Create a new address
     */
    async createAddress(address: AddressInsert): Promise<Address> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured - cannot create address');
        }

        try {
            const { data, error } = await supabase
                .from('shipping_addresses')
                .insert([address])
                .select()
                .single();

            if (error) {
                // Check for foreign key constraint error (profile doesn't exist)
                if (error.code === '23503' && error.message?.includes('shipping_addresses_user_id_fkey')) {
                    console.error('Profile not found for user:', address.user_id);
                    throw new Error('Please log out and log back in to refresh your session.');
                }
                throw error;
            }
            if (!data) throw new Error('No data returned upon address creation');

            return this.mapToAddress(data);
        } catch (error: any) {
            console.error('Error creating address:', error);
            throw new Error(error.message || 'Failed to create address.');
        }
    }

    /**
     * Update an existing address
     */
    async updateAddress(id: string, updates: AddressUpdate): Promise<Address> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured - cannot update address');
        }

        try {
            const { data, error } = await supabase
                .from('shipping_addresses')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('No data returned upon address update');

            return this.mapToAddress(data);
        } catch (error) {
            console.error('Error updating address:', error);
            throw new Error('Failed to update address.');
        }
    }

    /**
     * Delete an address
     */
    async deleteAddress(id: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured - cannot delete address');
        }

        try {
            const { error } = await supabase
                .from('shipping_addresses')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting address:', error);
            throw new Error('Failed to delete address.');
        }
    }

    /**
     * Set an address as default
     */
    async setDefaultAddress(userId: string, addressId: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            // First, unset all other addresses as default
            const { error: unsetError } = await supabase
                .from('shipping_addresses')
                .update({ is_default: false })
                .eq('user_id', userId);

            if (unsetError) throw unsetError;

            // Then set the selected address as default
            const { error: setError } = await supabase
                .from('shipping_addresses')
                .update({ is_default: true })
                .eq('id', addressId);

            if (setError) throw setError;
        } catch (error) {
            console.error('Error setting default address:', error);
            throw new Error('Failed to set default address.');
        }
    }

    /**
     * Get default address for a user
     */
    async getDefaultAddress(userId: string): Promise<Address | null> {
        if (!isSupabaseConfigured()) {
            return null;
        }

        try {
            const { data, error } = await supabase
                .from('shipping_addresses')
                .select('*')
                .eq('user_id', userId)
                .eq('is_default', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116' || error.code === '42P01') {
                    // No default address found or table doesn't exist
                    return null;
                }
                throw error;
            }

            return this.mapToAddress(data);
        } catch (error) {
            console.error('Error fetching default address:', error);
            return null; // Return null instead of throwing
        }
    }

    /**
     * Map database response to Address frontend model
     * shipping_addresses table structure:
     * - address_line_1 (street)
     * - address_line_2 
     * - postal_code (not zip_code)
     * - no first_name/last_name/phone (those are on buyer profile)
     */
    private mapToAddress(data: any): Address {
        return {
            id: data.id,
            label: data.label || 'Address',
            firstName: '', // Not stored in shipping_addresses
            lastName: '',  // Not stored in shipping_addresses
            fullName: '',  // Will be filled from buyer profile
            phone: '',     // Not stored in shipping_addresses
            street: data.address_line_1 || '',
            barangay: data.barangay || '',
            city: data.city || '',
            province: data.province || '',
            region: data.region || '',
            postalCode: data.postal_code || '',
            isDefault: data.is_default || false,
            coordinates: data.coordinates,
        };
    }
}

export const addressService = AddressService.getInstance();
