import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator, Image
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Store, Phone, CheckCircle2, XCircle, ArrowLeft, MapPin, AlignLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../src/lib/supabase';
import { useSellerStore } from '../../src/stores/sellerStore';
import { becomeSellerSchema, type BecomeSellerFormData } from '../../src/lib/schemas';
import { COLORS } from '../../src/constants/theme';

export default function BecomeSellerScreen() {
    const navigation = useNavigation<any>();
    const { user, updateSellerInfo, addRole, switchRole } = useSellerStore();
    const [isLoading, setIsLoading] = useState(false);
    const [storeStatus, setStoreStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isValid },
    } = useForm<BecomeSellerFormData>({
        resolver: zodResolver(becomeSellerSchema),
        mode: 'onChange',
        defaultValues: {
            storeName: '',
            phone: user?.phone || '',
            storeAddress: '',
            storeDescription: '',
        },
    });

    const watchedStoreName = watch('storeName');

    // --- LIVE STORE NAME CHECK ---
    useEffect(() => {
        const checkStore = async () => {
            if (!watchedStoreName || watchedStoreName.trim().length < 3) {
                setStoreStatus('idle');
                return;
            }

            setStoreStatus('checking');
            try {
                const { data, error: fetchError } = await supabase
                    .from('sellers')
                    .select('store_name')
                    .ilike('store_name', watchedStoreName.trim())
                    .maybeSingle();

                if (fetchError) throw fetchError;
                setStoreStatus(data ? 'taken' : 'available');
            } catch (err) {
                setStoreStatus('idle');
            }
        };

        const timeoutId = setTimeout(checkStore, 500);
        return () => clearTimeout(timeoutId);
    }, [watchedStoreName]);

    const onSubmit = async (data: BecomeSellerFormData) => {
        if (storeStatus === 'taken') {
            Alert.alert('Error', 'Store name is already taken');
            return;
        }

        setIsLoading(true);

        try {
            // Get current user directly from Supabase to ensure we have the correct ID
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !authUser) {
                throw new Error('User session not found. Please login again.');
            }

            const userId = authUser.id;

            // 1. Add seller role to user_roles table (new normalized schema)
            const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role: 'seller'
                })
                .select()
                .single();

            // Ignore duplicate key errors (user already has seller role)
            if (roleError && !roleError.message?.includes('duplicate key')) {
                throw roleError;
            }

            // 2. Update profile phone if provided
            if (data.phone) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ phone: data.phone })
                    .eq('id', userId);
                if (profileError) throw profileError;
            }

            // 3. Insert into sellers table (upsert in case they are retrying)
            const { error: sellerError } = await supabase.from('sellers').upsert({
                id: userId,
                store_name: data.storeName,
                store_description: data.storeDescription || null,
                owner_name: user?.name || null,
                approval_status: 'pending'
            });

            if (sellerError) throw sellerError;

            // 4. Sync data to local stores
            updateSellerInfo({
                id: userId,
                store_name: data.storeName,
                email: authUser.email,
                approval_status: 'pending',
                store_description: data.storeDescription,
                phone: data.phone,
                business_profile: {
                    address_line_1: data.storeAddress,
                },
            });

            // 5. Sync roles to AuthStore
            addRole('seller');
            switchRole('seller');

            Alert.alert(
                'Success',
                'Your store has been created!',
                [{ text: 'Go to Dashboard', onPress: () => navigation.replace('SellerStack') }]
            );

        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to create store. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                            <ArrowLeft size={20} color={COLORS.gray600} />
                        </Pressable>
                        <View style={styles.logoContainer}>
                            <Store size={32} color={COLORS.primary} strokeWidth={2} />
                        </View>
                        <Text style={styles.title}>Setup Your Store</Text>
                        <Text style={styles.subtitle}>Enter your business details to start selling.</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Store Name */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Store Name</Text>
                            <Controller
                                control={control}
                                name="storeName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={[
                                        styles.inputWrapper,
                                        errors.storeName && styles.inputWrapperError,
                                        storeStatus === 'taken' && styles.inputWrapperError
                                    ]}>
                                        <Store size={18} color={COLORS.gray400} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your store name"
                                            placeholderTextColor={COLORS.gray400}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            autoCapitalize="words"
                                        />
                                        {storeStatus === 'checking' && <ActivityIndicator size="small" color={COLORS.primary} />}
                                        {storeStatus === 'available' && <CheckCircle2 size={18} color={COLORS.success} />}
                                        {storeStatus === 'taken' && <XCircle size={18} color={COLORS.error} />}
                                    </View>
                                )}
                            />
                            {errors.storeName ? (
                                <Text style={styles.errorText}>{errors.storeName.message}</Text>
                            ) : storeStatus === 'taken' ? (
                                <Text style={styles.errorText}>This store name is already taken</Text>
                            ) : null}
                        </View>

                        {/* Phone Number */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Phone Number</Text>
                            <Controller
                                control={control}
                                name="phone"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={[styles.inputWrapper, errors.phone && styles.inputWrapperError]}>
                                        <Phone size={18} color={COLORS.gray400} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="09123456789"
                                            placeholderTextColor={COLORS.gray400}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                )}
                            />
                            {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}
                        </View>

                        {/* Store Address */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Store Address</Text>
                            <Controller
                                control={control}
                                name="storeAddress"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={[styles.inputWrapper, errors.storeAddress && styles.inputWrapperError]}>
                                        <MapPin size={18} color={COLORS.gray400} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="City, Province"
                                            placeholderTextColor={COLORS.gray400}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                        />
                                    </View>
                                )}
                            />
                            {errors.storeAddress && <Text style={styles.errorText}>{errors.storeAddress.message}</Text>}
                        </View>

                        {/* Store Description */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Store Description</Text>
                            <Controller
                                control={control}
                                name="storeDescription"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={[
                                        styles.inputWrapper,
                                        styles.textAreaWrapper,
                                        errors.storeDescription && styles.inputWrapperError
                                    ]}>
                                        <AlignLeft size={18} color={COLORS.gray400} style={[styles.inputIcon, { marginTop: 2 }]} />
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            placeholder="Describe your store and products..."
                                            placeholderTextColor={COLORS.gray400}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            multiline
                                            numberOfLines={4}
                                            textAlignVertical="top"
                                        />
                                    </View>
                                )}
                            />
                        </View>

                        <Pressable
                            style={[styles.submitButton, (isLoading || !isValid || storeStatus === 'taken') && styles.buttonDisabled]}
                            onPress={handleSubmit(onSubmit)}
                            disabled={isLoading || !isValid || storeStatus === 'taken'}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.buttonText}>Activate Seller Account</Text>
                            )}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background || '#FFFBF0',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 32,
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: COLORS.gray100,
    },
    logoContainer: {
        width: 80,
        height: 80,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: COLORS.textHeadline,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 22,
    },
    form: {
        gap: 20,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.gray500,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: COLORS.gray200,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 52,
    },
    textAreaWrapper: {
        height: 120,
        alignItems: 'flex-start',
        paddingVertical: 14,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textHeadline,
        height: '100%',
    },
    textArea: {
        paddingTop: 0,
    },
    inputWrapperError: {
        borderColor: COLORS.error,
    },
    errorText: {
        fontSize: 12,
        color: COLORS.error,
        marginTop: 4,
        marginLeft: 4,
    },
    submitButton: {
        marginTop: 12,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

