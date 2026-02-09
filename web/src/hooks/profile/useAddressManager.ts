import { useState, useEffect } from 'react';
import { useBuyerStore } from '@/stores/buyerStore';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Address } from '@/stores/buyerStore';

export const useAddressManager = (userId: string) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addresses, setAddresses, addAddress, updateAddress, deleteAddress: deleteAddressFromStore } = useBuyerStore();
    const { toast } = useToast();

    // Load addresses from Supabase
    useEffect(() => {
        const loadAddresses = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const { data, error: fetchError } = await supabase
                    .from('addresses')
                    .select('*')
                    .eq('user_id', userId);

                if (fetchError) throw fetchError;

                if (data) {
                    const formattedAddresses: Address[] = data.map(addr => ({
                        id: addr.id,
                        label: addr.label,
                        firstName: addr.first_name,
                        lastName: addr.last_name,
                        fullName: `${addr.first_name} ${addr.last_name}`,
                        phone: addr.phone,
                        street: addr.street,
                        barangay: addr.barangay,
                        city: addr.city,
                        region: addr.region,
                        province: addr.province,
                        postalCode: addr.zip_code,
                        isDefault: addr.is_default
                    }));

                    setAddresses(formattedAddresses);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load addresses';
                setError(errorMessage);
                console.error('Error loading addresses:', err);
            } finally {
                setLoading(false);
            }
        };

        loadAddresses();
    }, [userId, setAddresses]);

    const addNewAddress = async (addressData: Omit<Address, 'id' | 'fullName'>) => {
        if (!userId) {
            toast({
                title: "Error",
                description: "User not authenticated",
                variant: "destructive"
            });
            return null;
        }

        setSaving(true);
        setError(null);

        try {
            // Handle Default logic in DB
            if (addressData.isDefault) {
                await supabase
                    .from('addresses')
                    .update({ is_default: false })
                    .eq('user_id', userId);

                // Update local store to unset all defaults
                const updatedLocalAddresses = addresses.map(addr => ({ ...addr, isDefault: false }));
                setAddresses(updatedLocalAddresses);
            }

            const dbPayload = {
                user_id: userId,
                label: addressData.label,
                first_name: addressData.firstName,
                last_name: addressData.lastName,
                phone: addressData.phone,
                street: addressData.street,
                region: addressData.region,
                province: addressData.province,
                city: addressData.city,
                barangay: addressData.barangay,
                zip_code: addressData.postalCode,
                is_default: addressData.isDefault,
            };

            const { data, error: insertError } = await supabase
                .from('addresses')
                .insert([dbPayload])
                .select()
                .single();

            if (insertError) throw insertError;

            // Add to local Zustand store
            const newAddress: Address = {
                ...addressData,
                id: data.id,
                fullName: `${data.first_name} ${data.last_name}`
            };

            addAddress(newAddress);

            toast({ title: "Address added successfully" });
            return newAddress;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add address';
            setError(errorMessage);
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
            return null;
        } finally {
            setSaving(false);
        }
    };

    const updateExistingAddress = async (addressId: string, updates: Partial<Address>) => {
        setSaving(true);
        setError(null);

        try {
            // Handle Default logic in DB
            if (updates.isDefault) {
                await supabase
                    .from('addresses')
                    .update({ is_default: false })
                    .eq('user_id', userId);

                // Update local store to unset all defaults
                const updatedLocalAddresses = addresses.map(addr => ({ ...addr, isDefault: false }));
                setAddresses(updatedLocalAddresses);
            }

            const dbPayload: any = {};
            if (updates.label !== undefined) dbPayload.label = updates.label;
            if (updates.firstName !== undefined) dbPayload.first_name = updates.firstName;
            if (updates.lastName !== undefined) dbPayload.last_name = updates.lastName;
            if (updates.phone !== undefined) dbPayload.phone = updates.phone;
            if (updates.street !== undefined) dbPayload.street = updates.street;
            if (updates.region !== undefined) dbPayload.region = updates.region;
            if (updates.province !== undefined) dbPayload.province = updates.province;
            if (updates.city !== undefined) dbPayload.city = updates.city;
            if (updates.barangay !== undefined) dbPayload.barangay = updates.barangay;
            if (updates.postalCode !== undefined) dbPayload.zip_code = updates.postalCode;
            if (updates.isDefault !== undefined) dbPayload.is_default = updates.isDefault;

            const { error: updateError } = await supabase
                .from('addresses')
                .update(dbPayload)
                .eq('id', addressId);

            if (updateError) throw updateError;

            // Update local Zustand store
            updateAddress(addressId, updates);

            toast({ title: "Address updated successfully" });
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update address';
            setError(errorMessage);
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const deleteAddress = async (addressId: string) => {
        setSaving(true);
        setError(null);

        try {
            // Delete from Supabase Database
            const { error: deleteError } = await supabase
                .from('addresses')
                .delete()
                .eq('id', addressId);

            if (deleteError) throw deleteError;

            // Delete from Local Zustand Store
            deleteAddressFromStore(addressId);

            toast({
                title: "Address deleted",
                description: "The address has been removed from your profile.",
            });
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete address';
            setError(errorMessage);
            toast({
                title: "Error deleting address",
                description: errorMessage,
                variant: "destructive",
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const setDefaultAddress = async (addressId: string) => {
        if (!userId) return false;

        setSaving(true);
        setError(null);

        try {
            // Update Local Store (Optimistic UI)
            updateAddress(addressId, { isDefault: true });

            // Unset all defaults for this user
            await supabase
                .from('addresses')
                .update({ is_default: false })
                .eq('user_id', userId);

            // Set new default
            const { error: updateError } = await supabase
                .from('addresses')
                .update({ is_default: true })
                .eq('id', addressId);

            if (updateError) throw updateError;

            toast({
                title: "Default Address Updated",
                description: "Your primary shipping address has been updated.",
            });
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to set default address';
            setError(errorMessage);
            console.error("Error setting default address:", err);
            toast({
                title: "Update Failed",
                description: errorMessage,
                variant: "destructive"
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    return {
        addresses,
        loading,
        saving,
        error,
        addAddress: addNewAddress,
        updateAddress: updateExistingAddress,
        deleteAddress,
        setDefaultAddress
    };
};