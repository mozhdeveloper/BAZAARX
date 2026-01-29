import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface Address {
    id: string;
    label: string;
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    barangay: string;
    city: string;
    province: string;
    region: string;
    zipCode: string;
    landmark: string | null;
    deliveryInstructions: string | null;
    addressType: 'residential' | 'commercial';
    isDefault: boolean;
    coordinates: { latitude: number; longitude: number } | null;
}

export type AddressInsert = Omit<Address, 'id'>;
export type AddressUpdate = Partial<AddressInsert>;

export class AddressService {
    private static instance: AddressService;

    private constructor() { }

    public static getInstance(): AddressService {
        if (!AddressService.instance) {
            AddressService.instance = new AddressService();
        }
        return AddressService.instance;
    }

    private mapFromDB(a: any): Address {
        return {
            id: a.id,
            label: a.label,
            firstName: a.first_name,
            lastName: a.last_name,
            phone: a.phone,
            street: a.street,
            barangay: a.barangay || '',
            city: a.city,
            province: a.province,
            region: a.region,
            zipCode: a.zip_code,
            landmark: a.landmark,
            deliveryInstructions: a.delivery_instructions,
            addressType: a.address_type,
            isDefault: a.is_default,
            coordinates: a.coordinates,
        };
    }

    private mapToDB(address: AddressInsert | AddressUpdate) {
        const dbPayload: any = {};
        if (address.label !== undefined) dbPayload.label = address.label;
        if (address.firstName !== undefined) dbPayload.first_name = address.firstName;
        if (address.lastName !== undefined) dbPayload.last_name = address.lastName;
        if (address.phone !== undefined) dbPayload.phone = address.phone;
        if (address.street !== undefined) dbPayload.street = address.street;
        if (address.barangay !== undefined) dbPayload.barangay = address.barangay;
        if (address.city !== undefined) dbPayload.city = address.city;
        if (address.province !== undefined) dbPayload.province = address.province;
        if (address.region !== undefined) dbPayload.region = address.region;
        if (address.zipCode !== undefined) dbPayload.zip_code = address.zipCode;
        if (address.landmark !== undefined) dbPayload.landmark = address.landmark;
        if (address.deliveryInstructions !== undefined) dbPayload.delivery_instructions = address.deliveryInstructions;
        if (address.addressType !== undefined) dbPayload.address_type = address.addressType;
        if (address.isDefault !== undefined) dbPayload.is_default = address.isDefault;
        if (address.coordinates !== undefined) dbPayload.coordinates = address.coordinates;
        return dbPayload;
    }

    async getAddresses(userId: string): Promise<Address[]> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured');
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('addresses')
                .select('*')
                .eq('user_id', userId)
                .order('is_default', { ascending: false });

            if (error) throw error;
            return (data || []).map(this.mapFromDB);
        } catch (error) {
            console.error('Error fetching addresses:', error);
            throw new Error('Failed to load saved addresses.');
        }
    }

    async getDefaultAddress(userId: string): Promise<Address | null> {
        if (!isSupabaseConfigured()) return null;

        try {
            const { data, error } = await supabase
                .from('addresses')
                .select('*')
                .eq('user_id', userId)
                .eq('is_default', true)
                .single();

            if (error) return null; // It's okay if no default exists
            return this.mapFromDB(data);
        } catch (error) {
            console.error('Error fetching default address:', error);
            return null;
        }
    }

    async createAddress(userId: string, address: AddressInsert): Promise<Address> {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

        try {
            if (address.isDefault) {
                await this.clearDefaults(userId);
            }

            const { data, error } = await supabase
                .from('addresses')
                .insert([{ ...this.mapToDB(address), user_id: userId }])
                .select()
                .single();

            if (error) throw error;
            return this.mapFromDB(data);
        } catch (error) {
            console.error('Error creating address:', error);
            throw new Error('Failed to save new address.');
        }
    }

    async updateAddress(userId: string, addressId: string, updates: AddressUpdate): Promise<Address> {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

        try {
            if (updates.isDefault) {
                await this.clearDefaults(userId);
            }

            const { data, error } = await supabase
                .from('addresses')
                .update(this.mapToDB(updates))
                .eq('id', addressId)
                .select()
                .single();

            if (error) throw error;
            return this.mapFromDB(data);
        } catch (error) {
            console.error('Error updating address:', error);
            throw new Error('Failed to update address.');
        }
    }

    async deleteAddress(addressId: string): Promise<void> {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

        try {
            const { error } = await supabase
                .from('addresses')
                .delete()
                .eq('id', addressId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting address:', error);
            throw new Error('Failed to delete address.');
        }
    }

    async setDefaultAddress(userId: string, addressId: string): Promise<void> {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

        try {
            await this.clearDefaults(userId);
            const { error } = await supabase
                .from('addresses')
                .update({ is_default: true })
                .eq('id', addressId);

            if (error) throw error;
        } catch (error) {
            console.error('Error setting default address:', error);
            throw new Error('Failed to set default address.');
        }
    }

    private async clearDefaults(userId: string): Promise<void> {
        const { error } = await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', userId);

        if (error) console.error('Error clearing default addresses:', error);
    }

    subscribeToAddressChanges(userId: string, callback: () => void) {
        if (!isSupabaseConfigured()) return { unsubscribe: () => { } };

        const channel = supabase
            .channel(`addresses_${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'addresses',
                filter: `user_id=eq.${userId}`
            }, callback)
            .subscribe();

        return {
            unsubscribe: () => {
                supabase.removeChannel(channel);
            }
        };
    }

    /**
     * Fetch Bazcoins balance for a user
     */
    async getBazcoins(userId: string): Promise<number> {
        if (!isSupabaseConfigured()) return 0;

        try {
            const { data, error } = await supabase
                .from('buyers')
                .select('bazcoins')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data?.bazcoins || 0;
        } catch (error) {
            console.error('Error fetching Bazcoins:', error);
            return 0;
        }
    }

    /**
     * Subscribe to Bazcoins changes for a user
     */
    subscribeToBazcoinChanges(userId: string, onChange: (newBalance: number) => void) {
        if (!isSupabaseConfigured()) return { unsubscribe: () => { } };

        const channel = supabase
            .channel(`buyers_bazcoins_${userId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'buyers',
                filter: `id=eq.${userId}`
            }, (payload: any) => {
                const newBalance = (payload.new && 'bazcoins' in payload.new) ? (payload.new as any).bazcoins : undefined;
                if (typeof newBalance === 'number') {
                    onChange(newBalance);
                }
            })
            .subscribe();

        return {
            unsubscribe: () => {
                supabase.removeChannel(channel);
            }
        };
    }
}

export const addressService = AddressService.getInstance();
