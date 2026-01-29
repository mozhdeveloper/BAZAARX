/**
 * UserService
 * Handles all profile and user-related operations
 * Following the Service Layer Architecture pattern
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface UserProfile {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
    bazcoins?: number;
    user_type: 'buyer' | 'seller' | 'admin';
    updated_at?: string;
}

export class UserService {
    private static instance: UserService;

    private constructor() { }

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    /**
     * Get user profile by ID
     */
    async getProfile(userId: string): Promise<UserProfile | null> {
        if (!isSupabaseConfigured()) return null;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[UserService] Error fetching profile:', error);
            throw error;
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Failed to update profile');

            return data;
        } catch (error) {
            console.error('[UserService] Error updating profile:', error);
            throw error;
        }
    }

    /**
     * Upload user avatar
     */
    async uploadAvatar(userId: string, blob: Blob, fileExt: string): Promise<string> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            const fileName = `avatar_${userId}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('profile-avatars')
                .upload(filePath, blob, {
                    contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('profile-avatars').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error('[UserService] Error uploading avatar:', error);
            throw error;
        }
    }

    async updateBazcoins(userId: string, balance: number): Promise<void> {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
        const { error } = await supabase.from('buyers').update({ bazcoins: balance }).eq('id', userId);
        if (error) throw error;
    }
}

export const userService = UserService.getInstance();
