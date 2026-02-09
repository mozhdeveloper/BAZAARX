import { useState, useEffect } from 'react';
import { useBuyerStore } from '@/stores/buyerStore';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useProfileManager = (userId: string) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { profile, updateProfile, initializeBuyerProfile } = useBuyerStore();
    const { toast } = useToast();

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
            const { error: supabaseError } = await supabase
                .from('profiles')
                .update({
                    full_name: updates.firstName && updates.lastName
                        ? `${updates.firstName} ${updates.lastName}`
                        : undefined,
                    phone: updates.phone,
                    avatar_url: updates.avatar,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.id);

            if (supabaseError) throw supabaseError;

            // Update local store
            updateProfile(updates);

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

            // Update profile with new avatar
            await updateProfileData({ avatar: publicUrl });

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

    const checkSellerStatus = async (): Promise<boolean> => {
        if (!profile?.email) return false;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, user_type')
                .eq('email', profile.email)
                .single();

            if (error) {
                // If error is due to no rows found, that's fine - user is not registered as seller
                if (error.code === 'PGRST116') {
                    return false;
                }
                throw error;
            }

            return data?.user_type === 'seller';
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