import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator, Dimensions, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Store, Phone, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../src/lib/supabase';
import { useSellerStore, useAuthStore } from '../../src/stores/sellerStore';

export default function BecomeSellerScreen() {
    const navigation = useNavigation<any>();
    const { user, updateSellerInfo, addRole, switchRole } = useSellerStore();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        storeName: '',
        phone: user?.phone || '',
        storeDescription: '',
        storeAddress: '',
    });

    // Validation States
    const [storeStatus, setStoreStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [error, setError] = useState('');

    // --- LIVE STORE NAME CHECK ---
    useEffect(() => {
        const checkStore = async () => {
            if (formData.storeName.trim().length < 3) {
                setStoreStatus('idle');
                return;
            }

            setStoreStatus('checking');
            try {
                // Check if store name exists in profiles (as full_name, per existing logic) or sellers table
                // Existing logic checks profiles.full_name, let's verify sellers.store_name too for robustness
                const { data, error: fetchError } = await supabase
                    .from('sellers')
                    .select('store_name')
                    .ilike('store_name', formData.storeName.trim())
                    .maybeSingle();

                if (fetchError) throw fetchError;
                setStoreStatus(data ? 'taken' : 'available');
            } catch (err) {
                setStoreStatus('idle');
            }
        };

        const timeoutId = setTimeout(checkStore, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.storeName]);

    const handleCreateStore = async () => {
        if (!formData.storeName) {
            setError("Store name is required");
            return;
        }

        if (storeStatus === 'taken') {
            setError("Store name is already taken");
            return;
        }

        if (!user?.id) {
            setError("User session not found. Please login again.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // 1. Add seller role to user_roles table (new normalized schema)
            const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: user.id,
                    role: 'seller'
                })
                .select()
                .single();

            // Ignore duplicate key errors (user already has seller role)
            if (roleError && !roleError.message?.includes('duplicate key')) {
                throw roleError;
            }

            // 2. Update profile phone if provided
            if (formData.phone) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ phone: formData.phone })
                    .eq('id', user.id);
                if (profileError) throw profileError;
            }

            // 3. Insert into sellers table
            const { error: sellerError } = await supabase.from('sellers').upsert({
                id: user.id,
                store_name: formData.storeName,
                store_description: formData.storeDescription,
                owner_name: user.name || null,
                approval_status: 'pending'
            });

            if (sellerError) throw sellerError;

            // 3. Sync data to local stores
            updateSellerInfo({
                id: user.id,
                store_name: formData.storeName,
                email: user.email,
                approval_status: 'pending',
                store_description: formData.storeDescription,
                phone: formData.phone,
                business_profile: {
                  address_line_1: formData.storeAddress,
                },
            });

            // 4. Sync roles to AuthStore
            addRole('seller');
            switchRole('seller');

            Alert.alert(
                'Success',
                'Your store has been created!',
                [{ text: 'Go to Dashboard', onPress: () => navigation.replace('SellerStack') }]
            );

        } catch (err: any) {
            setError(err.message || 'Failed to create store. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Header Section */}
                    <View style={styles.header}>
                        <Pressable style={styles.backButtonAbsolute} onPress={() => navigation.goBack()}>
                            <ArrowLeft size={24} color="#374151" />
                        </Pressable>
                        <View style={styles.logoWrapper}>
                            <Store size={32} color="#FF6A00" />
                        </View>
                        <Text style={styles.title}>Setup Your Store</Text>
                        <Text style={styles.subtitle}>Enter your business details to start selling.</Text>
                    </View>

                    {/* Error Message */}
                    {error && (
                        <View style={styles.errorCard}>
                            <XCircle size={18} color="#EF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Store Name *</Text>
                            <View style={[styles.inputWrapper, storeStatus === 'taken' && styles.errorInput]}>
                                <Store size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your store name"
                                    value={formData.storeName}
                                    onChangeText={(v) => {
                                        setFormData({ ...formData, storeName: v });
                                        if (error) setError("");
                                    }}
                                />
                                {storeStatus === 'checking' && <ActivityIndicator size="small" color="#FF6A00" />}
                                {storeStatus === 'available' && <CheckCircle2 size={18} color="#10B981" />}
                                {storeStatus === 'taken' && <XCircle size={18} color="#EF4444" />}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={styles.inputWrapper}>
                                <Phone size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="+63 912 345 6789"
                                    keyboardType="phone-pad"
                                    value={formData.phone}
                                    onChangeText={(v) => setFormData({ ...formData, phone: v })}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Store Address</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[styles.input, { marginLeft: 0 }]}
                                    placeholder="City, Province"
                                    value={formData.storeAddress}
                                    onChangeText={(v) => setFormData({ ...formData, storeAddress: v })}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Store Description</Text>
                            <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                                <TextInput
                                    style={[styles.input, { marginLeft: 0 }]}
                                    placeholder="Describe your store and products"
                                    multiline
                                    numberOfLines={4}
                                    value={formData.storeDescription}
                                    onChangeText={(v) => setFormData({ ...formData, storeDescription: v })}
                                />
                            </View>
                        </View>

                        <Pressable
                            style={styles.primaryButton}
                            onPress={handleCreateStore}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#FF6A00', '#FF8C42']}
                                style={styles.buttonGradient}
                            >
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Activate Seller Account</Text>}
                            </LinearGradient>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { paddingBottom: 40 },
    header: {
        paddingTop: 20,
        paddingBottom: 25,
        alignItems: 'center',
        paddingHorizontal: 25,
        position: 'relative',
    },
    backButtonAbsolute: {
        position: 'absolute',
        left: 20,
        top: 20,
        padding: 8,
        zIndex: 10,
    },
    logoWrapper: {
        width: 64,
        height: 64,
        backgroundColor: '#FFF5F0',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 20,
    },
    title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 5 },
    subtitle: { fontSize: 15, color: '#6B7280', fontWeight: '500', textAlign: 'center' },

    errorCard: {
        marginHorizontal: 25,
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    errorText: { fontSize: 13, color: '#EF4444', fontWeight: '600', flex: 1 },

    form: { paddingHorizontal: 25, gap: 15 },
    inputGroup: { marginBottom: 5 },
    label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginLeft: 4 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 12,
    },
    errorInput: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
    input: { flex: 1, fontSize: 16, color: '#111827', fontWeight: '600' },

    primaryButton: { borderRadius: 16, overflow: 'hidden', marginTop: 10, elevation: 2 },
    buttonGradient: { height: 56, justifyContent: 'center', alignItems: 'center' },
    buttonText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
});
