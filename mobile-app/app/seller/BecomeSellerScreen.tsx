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
import { useSellerStore, useAuthStore } from '../../src/stores/sellerStore';
import { useAuthStore as useGlobalAuthStore } from '../../src/stores/authStore';
import { becomeSellerTwoStepSchema, type BecomeSellerTwoStepFormData } from '../../src/lib/schemas';
import { COLORS } from '../../src/constants/theme';
import { Lock, Eye, EyeOff, Check, ChevronRight, Mail } from 'lucide-react-native';

export default function BecomeSellerScreen() {
    const navigation = useNavigation<any>();
    const { updateSellerInfo, addRole, switchRole } = useSellerStore();
    // Bug fix: Read email from the global auth store, not the seller store
    // (seller store user is null when the user is a buyer becoming a seller)
    const globalUser = useGlobalAuthStore((s) => s.user);
    const [isLoading, setIsLoading] = useState(false);
    const [storeStatus, setStoreStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        control,
        handleSubmit,
        watch,
        trigger,
        formState: { errors },
    } = useForm<BecomeSellerTwoStepFormData>({
        resolver: zodResolver(becomeSellerTwoStepSchema),
        mode: 'onChange',
        defaultValues: {
            storeName: '',
            phone: globalUser?.phone || '',
            storeAddress: '',
            storeDescription: '',
            password: '',
            confirmPassword: '',
        },
    });

    // Watch individual fields for per-step validity instead of relying on isValid
    const [watchedStoreName, watchedPhone, watchedAddress, watchedPassword, watchedConfirm] =
        watch(['storeName', 'phone', 'storeAddress', 'password', 'confirmPassword']);

    // Step 1 is ready when required store fields are filled and store name is not taken
    const isStep1Ready =
        watchedStoreName?.trim().length >= 3 &&
        !!watchedPhone &&
        watchedAddress?.trim().length >= 5 &&
        storeStatus !== 'taken' &&
        storeStatus !== 'checking';

    // Step 2 is ready when both password fields are filled and match, with no errors
    const isStep2Ready =
        watchedPassword?.length >= 8 &&
        watchedConfirm?.length >= 1 &&
        watchedPassword === watchedConfirm &&
        !errors.password &&
        !errors.confirmPassword;


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

    const handleNextStep = async () => {
        const isStepValid = await trigger(['storeName', 'phone', 'storeAddress']);
        if (isStepValid && storeStatus !== 'taken' && storeStatus !== 'checking') {
            setStep(2);
        } else if (storeStatus === 'taken') {
            Alert.alert('Store Name Taken', 'Please choose another name for your shop.');
        }
    };

    const onSubmit = async (data: BecomeSellerTwoStepFormData) => {
        console.log('Submitting BecomeSeller form...', data);
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

            // Update user password for the "Seller Account Variant"
            // This sets the separate password for this identity/account
            const { error: passwordError } = await supabase.auth.updateUser({
                password: data.password
            });

            if (passwordError) {
                console.error('Password update error:', passwordError);
                throw new Error(`Failed to set seller password: ${passwordError.message}`);
            }

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
                owner_name: globalUser?.name || null,
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

            // 6. Sync with Global Auth Store
            useGlobalAuthStore.getState().addRole('seller');
            useGlobalAuthStore.getState().switchRole('seller');

            Alert.alert(
                'Success',
                'Your store has been created and your seller variant is active!',
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
                        <Pressable style={styles.backButton} onPress={() => step === 2 ? setStep(1) : navigation.goBack()}>
                            <ArrowLeft size={20} color={COLORS.gray600} />
                        </Pressable>
                        <View style={styles.logoContainer}>
                            <Store size={32} color={COLORS.primary} strokeWidth={2} />
                        </View>
                        <Text style={styles.title}>Setup Your Store</Text>
                        <Text style={styles.subtitle}>
                            {step === 1
                                ? 'Enter your business details to start selling.'
                                : 'Secure your seller account with a password.'}
                        </Text>
                    </View>

                    {/* Progress Indicator */}
                    <View style={styles.progressContainer}>
                        <View style={styles.stepsRow}>
                            <View style={styles.progressLineBase} />
                            <View style={[styles.progressLineActive, step >= 2 && { right: 14 }]} />
                            
                            <View style={[styles.stepDot, step >= 1 && styles.activeDot]}>
                                {step > 1 ? <Check size={14} color="#FFF" /> : <Text style={styles.stepNum}>1</Text>}
                            </View>
                            <View style={[styles.stepDot, step >= 2 && styles.activeDot]}>
                                <Text style={[styles.stepNum, step < 2 && styles.inactiveNum]}>2</Text>
                            </View>
                        </View>
                        <View style={styles.stepLabels}>
                            <Text style={[styles.stepLabel, step >= 1 && styles.activeLabel]}>Store Details</Text>
                            <Text style={[styles.stepLabel, step >= 2 && styles.activeLabel]}>Security</Text>
                        </View>
                    </View>

                    {/* Form */}
                    {/* Form */}
                    <View style={styles.form}>
                        {/* Step 1: Store Details */}
                        <View style={{ display: step === 1 ? 'flex' : 'none', gap: 20 }}>
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
                                style={[styles.submitButton, (!isStep1Ready || isLoading) && styles.buttonDisabled]}
                                onPress={handleNextStep}
                                disabled={!isStep1Ready || isLoading}
                            >
                                <Text style={styles.buttonText}>Continue to Security</Text>
                                <ChevronRight size={20} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        {/* Step 2: Security */}
                        <View style={{ display: step === 2 ? 'flex' : 'none', gap: 20 }}>
                            {/* Email — display only, sourced from the global auth session */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Account Email</Text>
                                <View style={[styles.inputWrapper, styles.disabledInput]}>
                                    <Mail size={18} color={COLORS.gray400} style={styles.inputIcon} />
                                    <Text style={[styles.input, styles.emailText]}>
                                        {globalUser?.email || 'No email found'}
                                    </Text>
                                </View>
                                <Text style={styles.helperText}>Your seller account will be linked to this email.</Text>
                            </View>

                            {/* Password */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Seller Password</Text>
                                <Controller
                                    control={control}
                                    name="password"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                                            <Lock size={18} color={COLORS.gray400} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Create seller password"
                                                placeholderTextColor={COLORS.gray400}
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                                secureTextEntry={!showPassword}
                                            />
                                            <Pressable onPress={() => setShowPassword(!showPassword)}>
                                                {showPassword ? <EyeOff size={18} color={COLORS.gray400} /> : <Eye size={18} color={COLORS.gray400} />}
                                            </Pressable>
                                        </View>
                                    )}
                                />
                                {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
                            </View>

                            {/* Confirm Password */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Confirm Password</Text>
                                <Controller
                                    control={control}
                                    name="confirmPassword"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputWrapperError]}>
                                            <Lock size={18} color={COLORS.gray400} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Confirm password"
                                                placeholderTextColor={COLORS.gray400}
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                                secureTextEntry={!showConfirmPassword}
                                            />
                                            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                {showConfirmPassword ? <EyeOff size={18} color={COLORS.gray400} /> : <Eye size={18} color={COLORS.gray400} />}
                                            </Pressable>
                                        </View>
                                    )}
                                />
                                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}
                            </View>

                            <Pressable
                                style={[styles.submitButton, (!isStep2Ready || isLoading) && styles.buttonDisabled]}
                                onPress={handleSubmit(
                                    onSubmit,
                                    (errors) => {
                                        console.log('Form values at failure:', watch());
                                        console.log('Form validation failed:', errors);
                                        // Handle cases where some errors might be invisible
                                        const errorMessages = Object.values(errors)
                                            .map(err => err?.message)
                                            .filter(Boolean);
                                        if (errorMessages.length > 0) {
                                            Alert.alert('Validation Error', errorMessages[0] as string);
                                        }
                                    }
                                )}
                                disabled={!isStep2Ready || isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Activate Seller Account</Text>
                                )}
                            </Pressable>

                            <Pressable style={styles.backButton2} onPress={() => setStep(1)}>
                                <ArrowLeft size={16} color={COLORS.gray500} />
                                <Text style={styles.backButton2Text}>Back to Store Details</Text>
                            </Pressable>
                        </View>
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
    // Two-step styles
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    progressLineBase: {
        position: 'absolute',
        top: '50%',
        left: 14,
        right: 14,
        height: 2,
        backgroundColor: COLORS.gray200,
        zIndex: 0,
        marginTop: -1,
    },
    progressLineActive: {
        position: 'absolute',
        top: '50%',
        left: 14,
        height: 2,
        backgroundColor: COLORS.primary,
        zIndex: 1,
        marginTop: -1,
    },
    stepsRow: {
        width: '60%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 2,
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: COLORS.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeDot: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    stepNum: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
    },
    inactiveNum: {
        color: COLORS.gray400,
    },
    stepLabels: {
        position: 'absolute',
        bottom: -20,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 60,
    },
    stepLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.gray400,
    },
    activeLabel: {
        color: COLORS.textHeadline,
    },
    disabledInput: {
        backgroundColor: COLORS.gray100,
        borderColor: COLORS.gray200,
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 4,
        marginLeft: 4,
    },
    emailText: {
        color: COLORS.gray500,
        fontSize: 15,
        lineHeight: 52,
        height: '100%',
    },
    backButton2: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1.5,
        borderColor: COLORS.gray200,
        borderRadius: 14,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
    },
    backButton2Text: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.gray500,
    },
});

