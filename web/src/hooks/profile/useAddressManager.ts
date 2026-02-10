import { useEffect, useState } from 'react';
import { useBuyerStore } from '@/stores/buyerStore';
import { useToast } from '@/hooks/use-toast';
import type { Address } from '@/stores/buyerStore';

export const useAddressManager = (userId: string) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {
        addresses,
        addAddress: addAddressInStore,
        updateAddress: updateAddressInStore,
        deleteAddress: deleteAddressFromStore,
        setDefaultAddress: setDefaultAddressInStore,
        syncAddressesWithService
    } = useBuyerStore();
    const { toast } = useToast();

    useEffect(() => {
        const loadAddresses = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                await syncAddressesWithService();
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load addresses';
                setError(errorMessage);
                console.error('Error loading addresses:', err);
            } finally {
                setLoading(false);
            }
        };

        loadAddresses();
    }, [userId, syncAddressesWithService]);

    const addAddress = async (addressData: Omit<Address, 'id' | 'fullName'>) => {
        if (!userId) {
            toast({
                title: 'Error',
                description: 'User not authenticated',
                variant: 'destructive'
            });
            return false;
        }

        setSaving(true);
        setError(null);

        try {
            const fullName = `${addressData.firstName} ${addressData.lastName}`.trim();
            const newAddress: Address = {
                ...addressData,
                id: `local-${Date.now()}`,
                fullName
            };

            await addAddressInStore(newAddress);
            await syncAddressesWithService();

            toast({ title: 'Address added successfully' });
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add address';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive'
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const updateAddress = async (addressId: string, updates: Partial<Address>) => {
        setSaving(true);
        setError(null);

        try {
            const fullName = updates.firstName || updates.lastName
                ? `${updates.firstName || ''} ${updates.lastName || ''}`.trim()
                : undefined;
            const updatedAddress = {
                ...updates,
                ...(fullName ? { fullName } : {})
            };

            await updateAddressInStore(addressId, updatedAddress);
            await syncAddressesWithService();

            toast({ title: 'Address updated successfully' });
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update address';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive'
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
            await deleteAddressFromStore(addressId);
            await syncAddressesWithService();

            toast({
                title: 'Address deleted',
                description: 'The address has been removed from your profile.',
            });
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete address';
            setError(errorMessage);
            toast({
                title: 'Error deleting address',
                description: errorMessage,
                variant: 'destructive',
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
            await setDefaultAddressInStore(addressId);
            await syncAddressesWithService();

            toast({
                title: 'Default Address Updated',
                description: 'Your primary shipping address has been updated.',
            });
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to set default address';
            setError(errorMessage);
            console.error('Error setting default address:', err);
            toast({
                title: 'Update Failed',
                description: errorMessage,
                variant: 'destructive'
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
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress
    };
};
