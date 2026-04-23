import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useSellerStore } from '../../src/stores/sellerStore';
import { authService } from '../../src/services/authService';
import { COLORS } from '../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2 } from 'lucide-react-native';

export default function SellerFinalizeScreen() {
    const navigation = useNavigation<any>();
    const { updateSellerInfo, addRole, switchRole } = useSellerStore();

    useEffect(() => {
        finalizeSellerAccount();
    }, []);

    const finalizeSellerAccount = async () => {
        try {
            const signupData = useAuthStore.getState().pendingSignupData;
            
            if (!signupData) {
                throw new Error('Missing signup data. Please try registering again.');
            }

            const normalizedEmail = signupData.email.trim().toLowerCase();

            // Ensure we have a valid session after verification
            await useAuthStore.getState().checkSession();
            let currentUser = useAuthStore.getState().user;

            // If no session exists (e.g., they verified in a different browser and deep-linking failed),
            // we attempt a silent login since we have their email and password from the form
            if (!currentUser) {
                if (signupData.password) {
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email: normalizedEmail,
                        password: signupData.password,
                    });
                    
                    if (signInError) throw new Error('Credentials mismatch. Please log in again.');
                    currentUser = {
                        id: signInData.user.id,
                        email: signInData.user.email || '',
                        name: signupData.storeName || signupData.firstName || '',
                        roles: ['buyer'] // Default
                    } as any;
                } else {
                    throw new Error('Authentication failed. Please log in manually.');
                }
            }

            if (!currentUser?.id) throw new Error('Account initialization failed.');
            const userId = currentUser.id;

            // 1. Create/Ensure Profile data is updated
            await supabase
                .from('profiles')
                .update({
                    first_name: signupData.storeName || signupData.firstName || '',
                    phone: signupData.phone || '',
                })
                .eq('id', userId);

            // 2. Add 'seller' role
            await authService.addUserRole(userId, 'seller');

            // 3. Create or Update Seller core record
            if (signupData.storeName) {
                const { error: sellerError } = await supabase
                    .from('sellers')
                    .upsert({
                        id: userId,
                        store_name: signupData.storeName,
                        store_description: signupData.storeDescription || '',
                        approval_status: 'pending',
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                if (sellerError) throw sellerError;

                // 4. Create or Update Seller Business Profile (for address)
                if (signupData.storeAddress) {
                    const { error: bizProfileError } = await supabase
                        .from('seller_business_profiles')
                        .upsert({
                            seller_id: userId,
                            address_line_1: signupData.storeAddress,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'seller_id' });

                    if (bizProfileError) throw bizProfileError;
                }

                // 5. Update Seller Store & Switch to Seller
                updateSellerInfo({
                    id: userId,
                    store_name: signupData.storeName,
                    email: normalizedEmail,
                    approval_status: 'pending'
                });
            }

            addRole('seller');
            switchRole('seller');

            // Sync with Global Auth Store to ensure root navigation respects the role
            useAuthStore.getState().addRole('seller');
            useAuthStore.getState().switchRole('seller');

            // Clear pending data
            useAuthStore.getState().setPendingSignup(null);

            // Navigate to Dashboard
            navigation.replace('SellerStack');

        } catch (err: any) {
            console.error('Finalize seller error:', err);
            Alert.alert('Setup Error', err.message || 'We could not complete your seller profile setup.', [
                { text: 'Go to Home', onPress: () => navigation.replace('MainTabs', { screen: 'Home' }) }
            ]);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <CheckCircle2 size={64} color={COLORS.success} style={{ marginBottom: 24 }} />
                <Text style={styles.title}>Email Verified!</Text>
                <Text style={styles.subtitle}>Setting up your shop...</Text>
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background || '#F9FAFB',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textHeadline,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
});
