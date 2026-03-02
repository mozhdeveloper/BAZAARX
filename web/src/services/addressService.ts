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

const isValidPhone = (value: string) => /^\+?\d{10,13}$/.test(value.replace(/\s+/g, ''));
const isValidPostalCode = (value: string) => /^\d{4,6}$/.test(value.trim());

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
        const { data: { session } } = await supabase.auth.getSession();
        
        // Safety Guard: Only fetch if the userId matches the active session
        if (!session || session.user.id !== userId) {
            console.warn('Unauthorized address fetch attempt blocked');
            return [];
        }

        const { data, error } = await supabase
            .from('shipping_addresses')
            .select('*')
            .eq('user_id', userId)
            .order('is_default', { ascending: false });

        if (error) throw error;
        return (data || []).map(this.mapToAddress);
    }

    /**
     * Create a new address
     */
    async createAddress(address: AddressInsert): Promise<Address> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured - cannot create address');
        }

        this.validateAddressInsert(address);

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

        this.validateAddressUpdate(updates);

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
            await this.ensureAddressNotInActiveOrder(id);

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

    private validateAddressInsert(address: AddressInsert) {
        if (!address.address_line_1?.trim()) {
            throw new Error('Street address is required.');
        }

        if (!address.city?.trim()) {
            throw new Error('City is required.');
        }

        if (!address.province?.trim()) {
            throw new Error('Province is required.');
        }

        if (!address.region?.trim()) {
            throw new Error('Region is required.');
        }

        if (!address.postal_code?.trim()) {
            throw new Error('Postal code is required.');
        }

        if (!isValidPostalCode(address.postal_code)) {
            throw new Error('Postal code format is invalid.');
        }

        if (address.address_line_1) {
            const parts = address.address_line_1.split(',').map(part => part.trim());
            if (parts.length >= 2) {
                const maybePhone = parts.find(part => isValidPhone(part));
                if (maybePhone && !isValidPhone(maybePhone)) {
                    throw new Error('Phone format is invalid.');
                }
            }
        }
    }

    private validateAddressUpdate(updates: AddressUpdate) {
        if (updates.postal_code !== undefined && !isValidPostalCode(updates.postal_code)) {
            throw new Error('Postal code format is invalid.');
        }

        if (updates.address_line_1) {
            const parts = updates.address_line_1.split(',').map(part => part.trim());
            const maybePhone = parts.find(part => isValidPhone(part));
            if (maybePhone && !isValidPhone(maybePhone)) {
                throw new Error('Phone format is invalid.');
            }
        }
    }

    private async ensureAddressNotInActiveOrder(addressId: string) {
        const activeStatuses = [
            'waiting_for_seller',
            'processing',
            'ready_to_ship',
            'shipped',
            'out_for_delivery'
        ];

        const { data, error } = await supabase
            .from('orders')
            .select('id')
            .eq('address_id', addressId)
            .in('shipment_status', activeStatuses)
            .limit(1);

        if (error) {
            throw error;
        }

        if (data && data.length > 0) {
            throw new Error('This address is used in an active order and cannot be deleted.');
        }
    }

    /**
     * Map database response to Address frontend model
     * shipping_addresses table structure:
     * - address_line_1 (may include "Name, Phone, Street" format)
     * - address_line_2
     * - postal_code
     */
    private mapToAddress(data: any): Address {
        const defaultCountry = 'Philippines';
        const addressLine1 = data.address_line_1 || '';
        const parts = addressLine1.split(', ').map((part: string) => part.trim()).filter(Boolean);

        let fullName = '';
        let phone = '';
        let street = addressLine1;

        if (parts.length >= 3 && /^\d{10,11}$/.test(parts[1]?.replace(/\D/g, ''))) {
            fullName = parts[0];
            phone = parts[1];
            street = parts.slice(2).join(', ');
        } else if (parts.length >= 2) {
            if (/^\d{10,11}$/.test(parts[0]?.replace(/\D/g, ''))) {
                phone = parts[0];
                street = parts.slice(1).join(', ');
            } else {
                fullName = parts[0];
                street = parts.slice(1).join(', ');
            }
        }

        if (data.address_line_2) {
            street = `${street}, ${data.address_line_2}`;
        }

        return {
            id: data.id,
            label: data.label || 'Address',
            firstName: fullName ? fullName.split(' ')[0] : '',
            lastName: fullName ? fullName.split(' ').slice(1).join(' ') : '',
            fullName,
            phone,
            street,
            barangay: data.barangay || '',
            city: data.city || '',
            province: data.province || '',
            region: data.region || '',
            postalCode: data.postal_code || '',
            country: defaultCountry,
            isDefault: data.is_default || false,
            landmark: data.landmark || '',
            deliveryInstructions: data.delivery_instructions || '',
            coordinates: data.coordinates,
        };
    }
}

export const addressService = AddressService.getInstance();
