import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useSellerCheck = (userEmail: string | undefined) => {
    const [isSeller, setIsSeller] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkSellerStatus = async () => {
            if (!userEmail) {
                setIsSeller(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Check if the user exists in the profiles table with user_type = 'seller'
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id, user_type')
                    .eq('email', userEmail)
                    .single();

                if (fetchError) {
                    // If error is due to no rows found, that's fine - user is not registered as seller
                    if (fetchError.code === 'PGRST116') { // Row not found
                        setIsSeller(false);
                    } else {
                        throw fetchError;
                    }
                } else if (data && data.user_type === 'seller') {
                    setIsSeller(true);
                } else {
                    setIsSeller(false);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to check seller status';
                setError(errorMessage);
                console.error('Error checking seller status:', err);
                setIsSeller(false);
            } finally {
                setLoading(false);
            }
        };

        checkSellerStatus();
    }, [userEmail]);

    return {
        isSeller,
        loading,
        error
    };
};