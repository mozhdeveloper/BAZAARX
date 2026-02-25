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
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (profileError) throw profileError;

                if (!profile?.id) {
                    setIsSeller(false);
                    return;
                }

                const { data: sellerRole, error: roleError } = await supabase
                    .from('user_roles')
                    .select('id')
                    .eq('user_id', profile.id)
                    .eq('role', 'seller')
                    .maybeSingle();

                if (roleError) throw roleError;

                setIsSeller(Boolean(sellerRole?.id));
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
