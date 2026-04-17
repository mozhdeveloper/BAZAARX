import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sellerSignupSchema, type SellerSignupFormData } from '../../src/lib/schemas';
import { COLORS } from '../../src/constants/theme';
import {
    View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator, Dimensions, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Store, Phone, Eye, EyeOff, ArrowRight, Check, XCircle, ChevronRight, CheckCircle2, UserCheck, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../src/lib/supabase';
import { authService } from '../../src/services/authService';
import { useSellerStore, useAuthStore } from '../../src/stores/sellerStore';

const { width } = Dimensions.get('window');

export default function SellerSignupScreen() {
    const navigation = useNavigation<any>();
    const { updateSellerInfo, addRole, switchRole } = useSellerStore();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Validation States
    const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [emailMode, setEmailMode] = useState<'new' | 'buyer-only' | 'blocked' | null>(null);
    const [storeStatus, setStoreStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [emailMessage, setEmailMessage] = useState('');

    const {
        control,
        handleSubmit,
        trigger,
        setError,
        clearErrors,
        formState: { errors, isValid },
        watch,
    } = useForm<SellerSignupFormData>({
        resolver: zodResolver(sellerSignupSchema),
        mode: 'onChange',
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
            storeName: '',
            phone: '',
            storeAddress: '',
            storeDescription: '',
        },
    });

    const watchedEmail = watch('email');
    const watchedStoreName = watch('storeName');
    const trimmedEmail = watchedEmail?.trim().toLowerCase() || '';
    const trimmedStoreName = watchedStoreName?.trim() || '';

    useEffect(() => {
        navigation.setOptions({
            animation: 'slide_from_right',
        });
    }, [navigation]);

    // --- LIVE EMAIL CHECK ---
    useEffect(() => {
        if (!trimmedEmail) {
            setEmailStatus('idle');
            setEmailMessage('');
            setEmailMode(null);
            clearErrors('email');
            return;
        }

        // Basic format check before server check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setEmailStatus('idle');
            setEmailMode(null);
            return;
        }

        setEmailStatus('checking');
        const timeoutId = setTimeout(async () => {
            try {
                const status = await authService.getEmailRoleStatus(trimmedEmail);

                if (!status.exists) {
                    setEmailStatus('available');
                    setEmailMessage('Email is available.');
                    setEmailMode('new');
                    if (errors.email?.type === 'manual') clearErrors('email');
                    return;
                }

                const roles = status.roles;
                const isBuyerOnly = roles.length > 0 && roles.every((role) => role === 'buyer');

                if (isBuyerOnly) {
                    setEmailStatus('available');
                    setEmailMessage('Existing buyer account found. You can upgrade to seller.');
                    setEmailMode('buyer-only');
                    if (errors.email?.type === 'manual') clearErrors('email');
                    return;
                }

                const hasSellerRole = roles.includes('seller');
                setEmailStatus('taken');
                setEmailMode('blocked');
                const msg = hasSellerRole
                    ? 'This email is already registered as a seller.'
                    : 'This email is already registered with restricted roles.';
                setEmailMessage(msg);
                setError('email', { type: 'manual', message: msg });
            } catch (err) {
                setEmailStatus('idle');
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [trimmedEmail]);

    // --- LIVE STORE NAME CHECK ---
    useEffect(() => {
        if (trimmedStoreName.length < 3) {
            setStoreStatus('idle');
            if (errors.storeName?.type === 'manual') clearErrors('storeName');
            return;
        }

        setStoreStatus('checking');
        const timeoutId = setTimeout(async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('sellers')
                    .select('store_name')
                    .ilike('store_name', trimmedStoreName)
                    .maybeSingle();

                if (fetchError) throw fetchError;
                if (data) {
                    setStoreStatus('taken');
                    setError('storeName', { type: 'manual', message: 'This store name is already taken' });
                } else {
                    setStoreStatus('available');
                    if (errors.storeName?.type === 'manual') clearErrors('storeName');
                }
            } catch (err) {
                setStoreStatus('idle');
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [trimmedStoreName]);

    const handleNextStep = async () => {
        const isValidStep1 = await trigger(['email', 'password', 'confirmPassword']);
        if (isValidStep1 && emailStatus !== 'taken') {
            setStep(2);
        }
    };

    const handleFinalSignup = async (formData: SellerSignupFormData) => {
        if (emailStatus === 'taken' || storeStatus === 'taken') return;

        setLoading(true);
        try {
            const normalizedEmail = formData.email.trim().toLowerCase();
            const latestStatus = await authService.getEmailRoleStatus(normalizedEmail);
            const roles = latestStatus.roles;
            const isBuyerOnly = latestStatus.exists && roles.length > 0 && roles.every((role) => role === 'buyer');

            let userId: string;

            if (isBuyerOnly) {
                if (!latestStatus.userId) throw new Error('Account mismatch detected.');

                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password: formData.password,
                });

                if (signInError) throw new Error('Incorrect password for existing buyer account.');

                userId = signInData.user.id;

                await authService.registerBuyerAsSeller(userId, {
                    store_name: formData.storeName,
                    store_description: formData.storeDescription || '',
                    owner_name: formData.storeName,
                });

                await supabase
                    .from('sellers')
                    .update({
                        business_name: formData.storeName,
                        business_address: formData.storeAddress,
                    } as any)
                    .eq('id', userId);
            } else {
                const result = await authService.signUp(normalizedEmail, formData.password, {
                    first_name: formData.storeName,
                    phone: formData.phone,
                    user_type: 'seller',
                    email: normalizedEmail,
                    password: formData.password,
                });

                if (!result?.user) throw new Error('Signup failed.');
                userId = result.user.id;

                const { error: sellerError } = await supabase.from('sellers').insert({
                    id: userId,
                    store_name: formData.storeName,
                    business_name: formData.storeName,
                    store_description: formData.storeDescription || '',
                    business_address: formData.storeAddress,
                    approval_status: 'pending'
                });

                if (sellerError) throw sellerError;
            }

            updateSellerInfo({
                id: userId,
                store_name: formData.storeName,
                email: formData.email,
                approval_status: 'pending'
            });

            addRole('seller');
            switchRole('seller');

            Alert.alert('Success', 'Application submitted! We will review your shop.', [
                { text: 'OK', onPress: () => navigation.replace('SellerStack') }
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Signup failed.');
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
                        <Pressable style={styles.backArrow} onPress={() => navigation.goBack()}>
                            <ArrowLeft size={20} color={COLORS.gray400} />
                        </Pressable>
                        <View style={styles.logoWrapper}>
                            <Image
                                source={require('../../assets/icon.png')}
                                style={styles.logo}
                            />
                        </View>
                        <Text style={[styles.title, { color: COLORS.textHeadline }]}>Join BazaarX</Text>
                        <Text style={[styles.subtitle, { color: COLORS.textMuted }]}>Create your seller account today</Text>
                    </View>

                    {/* Progress Indicator */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressLineBase} />
                        <View style={[styles.progressLineActive, { width: step === 1 ? '0%' : '100%' }]} />
                        <View style={styles.stepsRow}>
                            <View style={[styles.stepDot, step >= 1 && styles.activeDot]}>
                                {step > 1 ? <Check size={14} color="#FFF" /> : <Text style={styles.stepNum}>1</Text>}
                            </View>
                            <View style={[styles.stepDot, step >= 2 && styles.activeDot]}>
                                <Text style={[styles.stepNum, step < 2 && styles.inactiveNum]}>2</Text>
                            </View>
                        </View>
                        <View style={styles.stepLabels}>
                            <Text style={[styles.stepLabel, step >= 1 && styles.activeLabel]}>Account</Text>
                            <Text style={[styles.stepLabel, step >= 2 && styles.activeLabel]}>Store Details</Text>
                        </View>
                    </View>

                    <View style={styles.form}>
                        <View style={{ display: step === 1 ? 'flex' : 'none' }}>
                            <View style={styles.stepContent}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Email Address</Text>
                                    <Controller
                                        control={control}
                                        name="email"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <View style={[styles.inputWrapper, (errors.email) && styles.inputWrapperError]}>
                                                <Mail size={18} color={errors.email ? COLORS.error : COLORS.gray400} />
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Enter your store email"
                                                    placeholderTextColor={COLORS.gray400}
                                                    autoCapitalize="none"
                                                    keyboardType="email-address"
                                                    onBlur={onBlur}
                                                    onChangeText={onChange}
                                                    value={value}
                                                />
                                                {emailStatus === 'checking' && <ActivityIndicator size="small" color="#D97706" />}
                                                {emailStatus === 'available' && <CheckCircle2 size={18} color={COLORS.success} />}
                                            </View>
                                        )}
                                    />
                                    {errors.email ? (
                                        <Text style={styles.errorText}>{errors.email.message}</Text>
                                    ) : !!emailMessage && emailStatus !== 'idle' ? (
                                        <Text style={[styles.statusText, emailStatus === 'available' ? styles.statusSuccess : styles.statusChecking]}>
                                            {emailMessage}
                                        </Text>
                                    ) : null}
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Password</Text>
                                    <Controller
                                        control={control}
                                        name="password"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                                                <Lock size={18} color={errors.password ? COLORS.error : COLORS.gray400} />
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Create a strong password"
                                                    placeholderTextColor={COLORS.gray400}
                                                    secureTextEntry={!showPassword}
                                                    onBlur={onBlur}
                                                    onChangeText={onChange}
                                                    value={value}
                                                />
                                                <Pressable onPress={() => setShowPassword(!showPassword)}>
                                                    {showPassword ? <EyeOff size={18} color={COLORS.gray400} /> : <Eye size={18} color={COLORS.gray400} />}
                                                </Pressable>
                                            </View>
                                        )}
                                    />
                                    {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Confirm Password</Text>
                                    <Controller
                                        control={control}
                                        name="confirmPassword"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputWrapperError]}>
                                                <Lock size={18} color={errors.confirmPassword ? COLORS.error : COLORS.gray400} />
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Confirm your password"
                                                    placeholderTextColor={COLORS.gray400}
                                                    secureTextEntry={!showConfirmPassword}
                                                    onBlur={onBlur}
                                                    onChangeText={onChange}
                                                    value={value}
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
                                    style={[styles.primaryButton, (loading || emailStatus === 'checking' || emailStatus === 'taken') && styles.buttonDisabled]}
                                    onPress={handleNextStep}
                                    disabled={loading || emailStatus === 'checking' || emailStatus === 'taken'}
                                >
                                    <Text style={styles.buttonText}>Next: Store Info</Text>
                                    <ArrowRight size={20} color="#FFF" />
                                </Pressable>
                            </View>
                        </View>

                        <View style={{ display: step === 2 ? 'flex' : 'none' }}>
                            <View style={styles.stepContent}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Store Name</Text>
                                    <Controller
                                        control={control}
                                        name="storeName"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <View style={[styles.inputWrapper, errors.storeName && styles.inputWrapperError]}>
                                                <Store size={18} color={errors.storeName ? COLORS.error : COLORS.gray400} />
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="What's your shop called?"
                                                    placeholderTextColor={COLORS.gray400}
                                                    onBlur={onBlur}
                                                    onChangeText={onChange}
                                                    value={value}
                                                />
                                                {storeStatus === 'checking' && <ActivityIndicator size="small" color="#D97706" />}
                                                {storeStatus === 'available' && <CheckCircle2 size={18} color={COLORS.success} />}
                                            </View>
                                        )}
                                    />
                                    {errors.storeName && <Text style={styles.errorText}>{errors.storeName.message}</Text>}
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Phone Number</Text>
                                    <Controller
                                        control={control}
                                        name="phone"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <View style={[styles.inputWrapper, errors.phone && styles.inputWrapperError]}>
                                                <Phone size={18} color={errors.phone ? COLORS.error : COLORS.gray400} />
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Contact number"
                                                    placeholderTextColor={COLORS.gray400}
                                                    keyboardType="phone-pad"
                                                    onBlur={onBlur}
                                                    onChangeText={onChange}
                                                    value={value}
                                                />
                                            </View>
                                        )}
                                    />
                                    {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Store Address</Text>
                                    <Controller
                                        control={control}
                                        name="storeAddress"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <View style={[styles.inputWrapper, errors.storeAddress && styles.inputWrapperError]}>
                                                <TextInput
                                                    style={[styles.input, { marginLeft: 0 }]}
                                                    placeholder="Full store address"
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

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Store Description (Optional)</Text>
                                    <Controller
                                        control={control}
                                        name="storeDescription"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                                                <TextInput
                                                    style={[styles.input, { marginLeft: 0 }]}
                                                    placeholder="Tell customers about your shop"
                                                    placeholderTextColor={COLORS.gray400}
                                                    multiline
                                                    numberOfLines={4}
                                                    onBlur={onBlur}
                                                    onChangeText={onChange}
                                                    value={value}
                                                />
                                            </View>
                                        )}
                                    />
                                </View>

                                <View style={styles.buttonRow}>
                                    <Pressable style={styles.backBtn} onPress={() => setStep(1)}>
                                        <Text style={styles.backBtnText}>Back</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.primaryButton, { flex: 2 }, (loading || storeStatus === 'checking' || storeStatus === 'taken') && styles.buttonDisabled]}
                                        onPress={handleSubmit(handleFinalSignup, (errs) => {
                                            const firstError = Object.values(errs)[0];
                                            if (firstError) {
                                                Alert.alert('Form Missing Data', firstError.message || 'Please check all fields.');
                                            }
                                        })}
                                        disabled={loading || storeStatus === 'checking' || storeStatus === 'taken'}
                                    >
                                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Submit Shop</Text>}
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <Pressable onPress={() => navigation.navigate('SellerLogin')}>
                            <Text style={styles.loginLink}>Sign in</Text>
                        </Pressable>
                    </View>

                    <View style={styles.backToHome}>
                        <Pressable onPress={() => navigation.replace('SellerAuthChoice')}>
                            <Text style={styles.backLink}>← Back to BazaarPH</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background || '#FFFFFF' },
    scrollContent: { padding: 24, paddingBottom: 40 },
    header: { marginBottom: 32, alignItems: 'center' },
    backArrow: { position: 'absolute', left: 0, top: 0, padding: 8 },
    logoWrapper: {
        width: 64,
        height: 64,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    logo: { width: 44, height: 44, borderRadius: 8 },
    title: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
    subtitle: { fontSize: 15, textAlign: 'center' },

    progressContainer: { marginBottom: 40, paddingHorizontal: 20 },
    progressLineBase: { position: 'absolute', top: 20, left: 40, right: 40, height: 2, backgroundColor: '#F3F4F6' },
    progressLineActive: { position: 'absolute', top: 20, left: 40, height: 2, backgroundColor: '#D97706' },
    stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    stepDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    activeDot: { backgroundColor: '#D97706' },
    stepNum: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    inactiveNum: { color: COLORS.gray400 },
    stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    stepLabel: { fontSize: 12, color: COLORS.gray400, fontWeight: '600' },
    activeLabel: { color: '#D97706' },

    form: { marginBottom: 24 },
    stepContent: { gap: 0 },
    inputContainer: { flexDirection: 'column', marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: COLORS.gray400, marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 52,
        gap: 12,
    },
    inputWrapperError: { borderColor: COLORS.error },
    input: { flex: 1, fontSize: 15, color: COLORS.textHeadline, fontWeight: '500' },
    errorText: { fontSize: 12, color: COLORS.error, marginTop: 4 },
    statusText: { fontSize: 12, marginTop: 4, fontWeight: '600' },
    statusSuccess: { color: COLORS.success },
    statusChecking: { color: '#92400E' },

    primaryButton: {
        borderRadius: 14,
        backgroundColor: '#D97706',
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    buttonRow: { flexDirection: 'row', gap: 12 },
    backBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    backBtnText: { fontSize: 15, color: COLORS.gray400, fontWeight: '700' },

    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    footerText: { fontSize: 14, color: COLORS.textMuted },
    loginLink: { fontSize: 14, color: '#D97706', fontWeight: '700' },
    backToHome: { alignItems: 'center', marginBottom: 40 },
    backLink: { fontSize: 14, color: COLORS.gray400, fontWeight: '600' },
});
