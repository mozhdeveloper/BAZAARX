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
    // Geographic codes for shipping accuracy
    barangayCode?: string;
    cityCode?: string;
    provinceCode?: string;
    regionCode?: string;
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
        // Use dedicated columns for name/phone (DB has first_name, last_name, phone_number)
        // Fall back to parsing address_line_1 for legacy rows
        let firstName = a.first_name || '';
        let lastName = a.last_name || '';
        let phone = a.phone_number || '';
        let street = a.address_line_1 || '';

        // Legacy fallback: if dedicated columns are empty, try parsing address_line_1
        if (!firstName && !phone && street) {
            const parts = street.split(', ');
            if (parts.length >= 3) {
                const possiblePhone = parts[1];
                if (/^\d{10,11}$/.test(possiblePhone?.replace(/\D/g, ''))) {
                    const nameParts = parts[0].split(' ');
                    firstName = nameParts[0] || '';
                    lastName = nameParts.slice(1).join(' ') || '';
                    phone = possiblePhone;
                    street = parts.slice(2).join(', ');
                }
            }
        }

        // Extract geo codes from coordinates JSONB if present
        const coords = a.coordinates || null;
        const barangayCode = coords?.barangay_code || undefined;
        const cityCode = coords?.city_code || undefined;
        const provinceCode = coords?.province_code || undefined;
        const regionCode = coords?.region_code || undefined;

        // Clean coordinates to just lat/lng for the frontend
        const cleanCoords = coords && coords.latitude != null && coords.longitude != null
            ? { latitude: Number(coords.latitude), longitude: Number(coords.longitude) }
            : null;

        return {
            id: a.id,
            label: a.label || 'Address',
            firstName,
            lastName,
            phone,
            street,
            barangay: a.barangay || '',
            city: a.city || '',
            province: a.province || '',
            region: a.region || '',
            zipCode: a.postal_code || '',
            landmark: a.landmark || a.address_line_2 || null,
            deliveryInstructions: a.delivery_instructions || null,
            addressType: a.address_type || 'residential',
            isDefault: a.is_default || false,
            coordinates: cleanCoords,
            barangayCode,
            cityCode,
            provinceCode,
            regionCode,
        };
    }

    private mapToDB(address: AddressInsert | AddressUpdate, userId?: string) {
        const dbPayload: any = {};

        // Use dedicated columns for name/phone/street
        if (address.firstName !== undefined) dbPayload.first_name = address.firstName;
        if (address.lastName !== undefined) dbPayload.last_name = address.lastName;
        if (address.phone !== undefined) dbPayload.phone_number = address.phone;
        if (address.street !== undefined) dbPayload.address_line_1 = address.street;

        if (address.label !== undefined) dbPayload.label = address.label;
        if (address.landmark !== undefined) dbPayload.landmark = address.landmark;
        if (address.barangay !== undefined) dbPayload.barangay = address.barangay;
        if (address.city !== undefined) dbPayload.city = address.city;
        if (address.province !== undefined) dbPayload.province = address.province;
        if (address.region !== undefined) dbPayload.region = address.region;
        if (address.zipCode !== undefined) dbPayload.postal_code = address.zipCode;
        if (address.deliveryInstructions !== undefined) dbPayload.delivery_instructions = address.deliveryInstructions;
        if (address.addressType !== undefined) dbPayload.address_type = address.addressType;
        if (address.isDefault !== undefined) dbPayload.is_default = address.isDefault;

        // Store coordinates + geo codes in JSONB coordinates field
        if (address.coordinates !== undefined || (address as any).barangayCode !== undefined) {
            dbPayload.coordinates = {
                ...(address.coordinates || {}),
                ...(((address as any).barangayCode) ? { barangay_code: (address as any).barangayCode } : {}),
                ...(((address as any).cityCode) ? { city_code: (address as any).cityCode } : {}),
                ...(((address as any).provinceCode) ? { province_code: (address as any).provinceCode } : {}),
                ...(((address as any).regionCode) ? { region_code: (address as any).regionCode } : {}),
            };
        }

        if (userId) dbPayload.user_id = userId;

        return dbPayload;
    }

    async getAddresses(userId: string): Promise<Address[]> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured');
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('shipping_addresses')
                .select('*')
                .eq('user_id', userId)
                .order('is_default', { ascending: false });

            if (error) {
                // Handle 404 - table may not exist
                if (error.code === '42P01' || error.code === 'PGRST116') {
                    console.warn('shipping_addresses table not found');
                    return [];
                }
                throw error;
            }
            return (data || []).map(a => this.mapFromDB(a));
        } catch (error) {
            console.error('Error fetching addresses:', error);
            return []; // Return empty instead of throwing
        }
    }

    async getDefaultAddress(userId: string): Promise<Address | null> {
        if (!isSupabaseConfigured()) return null;

        try {
            const { data, error } = await supabase
                .from('shipping_addresses')
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
                .from('shipping_addresses')
                .insert([this.mapToDB(address, userId)])
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
                .from('shipping_addresses')
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
                .from('shipping_addresses')
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
                .from('shipping_addresses')
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
            .from('shipping_addresses')
            .update({ is_default: false })
            .eq('user_id', userId);

        if (error) console.error('Error clearing default addresses:', error);
    }

    subscribeToAddressChanges(userId: string, callback: () => void) {
        if (!isSupabaseConfigured()) return { unsubscribe: () => { } };

        const channel = supabase
            .channel(`shipping_addresses_${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'shipping_addresses',
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

    /**
     * Save or update the current delivery location to the database.
     * This is used when user selects a location from HomeScreen's location modal.
     * It creates a "Current Location" address or updates the existing one.
     * Auto-fills first_name, last_name, phone_number from the user's profile.
     */
    async saveCurrentDeliveryLocation(
        userId: string, 
        address: string, 
        coords: { latitude: number; longitude: number } | null,
        details?: {
            street?: string;
            barangay?: string;
            city?: string;
            province?: string;
            region?: string;
            postalCode?: string;
            firstName?: string;
            lastName?: string;
            phone?: string;
            landmark?: string;
            deliveryInstructions?: string;
        }
    ): Promise<Address | null> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured, skipping DB save');
            return null;
        }

        try {
            // Use provided details if available, otherwise parse address string
            let street = details?.street || '';
            let barangay = details?.barangay || '';
            let city = details?.city || '';
            let province = details?.province || '';
            let region = details?.region || '';
            let postalCode = details?.postalCode || '';
            
            // Fallback: parse address string if no details provided
            if (!street && !city) {
                const parts = address.split(',').map(p => p.trim());
                street = parts[0] || address;
                city = parts[1] || '';
                province = parts[2] || '';
            }

            // Use name/phone from details if provided, otherwise fetch from profile
            let firstName = details?.firstName || '';
            let lastName = details?.lastName || '';
            let phone = details?.phone || '';
            if (!firstName && !phone) {
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('first_name, last_name, phone')
                        .eq('id', userId)
                        .single();
                    if (profile) {
                        firstName = profile.first_name || '';
                        lastName = profile.last_name || '';
                        phone = profile.phone || '';
                    }
                } catch (e) {
                    console.log('[addressService] Could not fetch profile for auto-fill:', e);
                }
            }

            // Fetch ALL "Current Location" rows for this user (there may be duplicates from past bugs)
            const { data: existingRows, error: fetchError } = await supabase
                .from('shipping_addresses')
                .select('*')
                .eq('user_id', userId)
                .eq('label', 'Current Location')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const addressData = {
                user_id: userId,
                label: 'Current Location',
                first_name: firstName,
                last_name: lastName,
                phone_number: phone,
                address_line_1: street,
                address_line_2: null as string | null,
                barangay: barangay,
                city: city,
                province: province,
                region: region,
                postal_code: postalCode,
                landmark: details?.landmark || null,
                delivery_instructions: details?.deliveryInstructions || null,
                address_type: 'residential' as const,
                is_default: false,
                coordinates: coords,
            };

            if (existingRows && existingRows.length > 0) {
                // Keep the most recent one, delete any duplicates
                const keepId = existingRows[0].id;

                if (existingRows.length > 1) {
                    const duplicateIds = existingRows.slice(1).map(r => r.id);
                    await supabase
                        .from('shipping_addresses')
                        .delete()
                        .in('id', duplicateIds);
                }

                // Update the kept row
                const { data, error } = await supabase
                    .from('shipping_addresses')
                    .update(addressData)
                    .eq('id', keepId)
                    .select()
                    .single();

                if (error) throw error;
                return this.mapFromDB(data);
            } else {
                // Create new "Current Location" address
                const { data, error } = await supabase
                    .from('shipping_addresses')
                    .insert([addressData])
                    .select()
                    .single();

                if (error) throw error;
                return this.mapFromDB(data);
            }
        } catch (error) {
            console.error('Error saving current delivery location:', error);
            throw new Error('Failed to save current delivery location.');
        }
    }

    /**
     * Get the current delivery location from the database.
     * Falls back to default address if no "Current Location" exists.
     */
    async getCurrentDeliveryLocation(userId: string): Promise<Address | null> {
        if (!isSupabaseConfigured()) return null;

        try {
            // First try to get "Current Location" 
            const { data: currentLoc, error: currentError } = await supabase
                .from('shipping_addresses')
                .select('*')
                .eq('user_id', userId)
                .eq('label', 'Current Location')
                .single();

            if (currentLoc && !currentError) {
                return this.mapFromDB(currentLoc);
            }

            // Fall back to default address
            return this.getDefaultAddress(userId);
        } catch (error) {
            console.error('Error fetching current delivery location:', error);
            return null;
        }
    }
}

export const addressService = AddressService.getInstance();
