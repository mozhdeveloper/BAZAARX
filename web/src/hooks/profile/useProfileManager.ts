import { useState, useEffect, useRef } from 'react';
import { useBuyerStore } from '@/stores/buyerStore';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useProfileManager = (userId: string) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { profile, setProfile, updateProfile, initializeBuyerProfile } = useBuyerStore();
    const { toast } = useToast();
    const sellerStatusCache = useRef<{ checkedAt: number; value: boolean } | null>(null);

    // Initialize buyer profile if not already loaded
    useEffect(() => {
        const initializeProfile = async () => {
            if (!profile && userId) {
                try {
                    setLoading(true);
                    // Initialize the buyer profile, creating the record if it doesn't exist
                    await initializeBuyerProfile(userId, {});
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to initialize profile');
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        initializeProfile();
    }, [profile, userId, initializeBuyerProfile]);

    const updateProfileData = async (updates: Partial<typeof profile>) => {
        if (!profile?.id) {
            toast({
                title: "Error",
                description: "Profile not initialized",
                variant: "destructive"
            });
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Update Supabase
            const profileUpdates: Record<string, unknown> = {
                updated_at: new Date().toISOString()
            };

            if (updates.firstName !== undefined) {
                profileUpdates.first_name = updates.firstName;
            }

            if (updates.lastName !== undefined) {
                profileUpdates.last_name = updates.lastName;
            }

            if (updates.phone !== undefined) {
                profileUpdates.phone = updates.phone;
            }

            const { error: supabaseError } = await supabase
                .from('profiles')
                .update(profileUpdates)
                .eq('id', profile.id);

            if (supabaseError) throw supabaseError;

            // Update local store
            setProfile({ ...profile, ...updates });

            toast({
                title: "Profile Updated",
                description: "Your changes have been saved successfully.",
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
            setError(errorMessage);
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const uploadAvatar = async (file: File) => {
        if (!profile?.id) {
            toast({
                title: "Error",
                description: "Profile not initialized",
                variant: "destructive"
            });
            return null;
        }

        setSaving(true);
        setError(null);

        try {
            // Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar_${profile.id}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('profile-avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data } = supabase.storage
                .from('profile-avatars')
                .getPublicUrl(filePath);

            const publicUrl = data.publicUrl;

            // Update buyer avatar
            await updateProfile({ avatar_url: publicUrl } as any);
            setProfile({ ...profile, avatar: publicUrl });

            return publicUrl;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar';
            setError(errorMessage);
            toast({
                title: "Upload Failed",
                description: errorMessage,
                variant: "destructive"
            });
            return null;
        } finally {
            setSaving(false);
        }
    };

    const checkSellerStatus = async (options?: { force?: boolean }): Promise<boolean> => {
        if (!profile?.id) return false;

        const cacheTtlMs = 5 * 60 * 1000;
        const cached = sellerStatusCache.current;
        const now = Date.now();

        if (!options?.force && cached && now - cached.checkedAt < cacheTtlMs) {
            return cached.value;
        }

        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('id')
                .eq('user_id', profile.id)
                .eq('role', 'seller')
                .maybeSingle();

            if (error) throw error;

            const isSeller = Boolean(data?.id);
            sellerStatusCache.current = { checkedAt: now, value: isSeller };
            return isSeller;
        } catch (err) {
            console.error('Error checking seller status:', err);
            return false;
        }
    };

    return {
        profile,
        loading,
        saving,
        error,
        updateProfile: updateProfileData,
        uploadAvatar,
        checkSellerStatus
    };
};