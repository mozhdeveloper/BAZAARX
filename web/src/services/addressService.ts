/**
 * Address Service
 * Handles all address-related database operations
 * Adheres to the Class-based Service Layer Architecture
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Address } from '@/stores/buyerStore';

export type AddressInsert = {
    user_id: string;
    label: string;
    first_name: string;
    last_name: string;
    phone: string;
    street: string;
    barangay?: string;
    city: string;
    province: string;
    region: string;
    zip_code: string;
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
                .from('addresses')
                .select('*')
                .eq('user_id', userId)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map database addresses to Address interface
            return (data || []).map((addr) => this.mapToAddress(addr));
        } catch (error) {
            console.error('Error fetching addresses:', error);
            throw new Error('Failed to fetch addresses.');
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
                .from('addresses')
                .insert([address])
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('No data returned upon address creation');

            return this.mapToAddress(data);
        } catch (error) {
            console.error('Error creating address:', error);
            throw new Error('Failed to create address.');
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
                .from('addresses')
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
                .from('addresses')
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
                .from('addresses')
                .update({ is_default: false })
                .eq('user_id', userId);

            if (unsetError) throw unsetError;

            // Then set the selected address as default
            const { error: setError } = await supabase
                .from('addresses')
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
                .from('addresses')
                .select('*')
                .eq('user_id', userId)
                .eq('is_default', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No default address found
                    return null;
                }
                throw error;
            }

            return this.mapToAddress(data);
        } catch (error) {
            console.error('Error fetching default address:', error);
            throw new Error('Failed to fetch default address.');
        }
    }

    /**
     * Map database response to Address frontend model
     */
    private mapToAddress(data: any): Address {
        return {
            id: data.id,
            label: data.label,
            firstName: data.first_name,
            lastName: data.last_name,
            fullName: `${data.first_name} ${data.last_name}`,
            phone: data.phone,
            street: data.street,
            barangay: data.barangay || '',
            city: data.city,
            province: data.province,
            region: data.region,
            postalCode: data.zip_code,
            isDefault: data.is_default,
            coordinates: data.coordinates,
        };
    }
}

export const addressService = AddressService.getInstance();
