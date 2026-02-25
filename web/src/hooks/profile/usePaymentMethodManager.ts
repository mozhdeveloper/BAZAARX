import { useState } from 'react';
import { useBuyerStore } from '@/stores/buyerStore';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod } from '@/stores/buyerStore';

export const usePaymentMethodManager = (userId: string) => {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { profile, addCard, deleteCard: deleteCardFromStore, setDefaultPaymentMethod: setDefaultInStore } = useBuyerStore();
    const { toast } = useToast();

    const addPaymentMethod = async (methodData: Omit<PaymentMethod, 'id'>) => {
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
            const newMethod: PaymentMethod = {
                ...methodData,
                id: `${methodData.type}_${Date.now()}`
            };

            // Add to store
            addCard(newMethod);

            // If this is set as default, update the default
            if (methodData.isDefault) {
                setDefaultInStore(newMethod.id);
            }

            toast({
                title: methodData.type === 'card' ? "Card Added" : "Wallet Linked",
                description: `Your ${methodData.brand} has been saved successfully.`,
            });

            return newMethod;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add payment method';
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

    const deletePaymentMethod = (methodId: string) => {
        setSaving(true);
        setError(null);

        try {
            deleteCardFromStore(methodId);

            toast({
                title: "Payment Method Removed",
                description: "The payment method has been deleted.",
            });

            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete payment method';
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

    const setDefaultPaymentMethod = (methodId: string) => {
        setSaving(true);
        setError(null);

        try {
            setDefaultInStore(methodId);

            toast({
                title: "Default Updated",
                description: "Your default payment method has been updated.",
            });

            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to set default payment method';
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

    return {
        paymentMethods: profile?.paymentMethods || [],
        saving,
        error,
        addPaymentMethod,
        deletePaymentMethod,
        setDefaultPaymentMethod
    };
};