import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sellerSignupSchema, type SellerSignupFormData } from '../../src/lib/schemas';
import { COLORS } from '../../src/constants/theme';
import {
    View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator, Dimensions, Image, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Store, Phone, Eye, EyeOff, ArrowRight, Check, XCircle, ChevronRight, CheckCircle2, UserCheck, ArrowLeft, Square, CheckSquare, Clock, ExternalLink } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../src/lib/supabase';
import { authService } from '../../src/services/authService';
import { useSellerStore, useAuthStore } from '../../src/stores/sellerStore';
import { useAuthStore as useGlobalAuthStore } from '../../src/stores/authStore';

const { width } = Dimensions.get('window');

export default function SellerSignupScreen() {
    const navigation = useNavigation<any>();
    const { updateSellerInfo, addRole, switchRole } = useSellerStore();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [checking, setChecking] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const intervalRef = useRef<any>(null);

    // Validation States
    const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [emailMode, setEmailMode] = useState<'new' | 'buyer-only' | 'blocked' | null>(null);
    const [storeStatus, setStoreStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [emailMessage, setEmailMessage] = useState('');

    // Verification States
    const [verificationSent, setVerificationSent] = useState(false);
    const [pendingEmail, setPendingEmail] = useState('');

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

    // Add polling cleanup
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // Cooldown timer logic
    useEffect(() => {
        let timer: any;
        if (resendCooldown > 0) {
            timer = setInterval(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleNextStep = async () => {
        const isValidStep1 = await trigger(['email', 'password', 'confirmPassword']);
        if (isValidStep1 && emailStatus !== 'taken') {
            await startVerification();
        }
    };

    const startVerification = async () => {
        setLoading(true);
        try {
            const email = watch('email').trim().toLowerCase();
            const password = watch('password');
            setPendingEmail(email);

            const status = await authService.getEmailRoleStatus(email);
            
            if (status.exists) {
                // User already exists (likely a buyer)
                // We check if they are already verified
                const isVerified = await authService.checkVerificationStatus(email);
                if (isVerified) {
                    setStep(3);
                    return;
                }
                // If not verified, resend link
                await authService.resendVerificationLink(email);
            } else {
                // New user - sign up
                await authService.signUp(email, password, {
                    user_type: 'buyer', // Default to buyer first, then add seller in step 3
                    email: email,
                    password: password,
                    has_accepted_terms: true,
                });
            }

            setVerificationSent(true);
            setStep(2);
            startPolling();
            setResendCooldown(60);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to start verification.');
        } finally {
            setLoading(false);
        }
    };

    const startPolling = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(async () => {
            try {
                const verified = await authService.checkVerificationStatus(pendingEmail);
                if (verified) {
                    stopPolling();
                    setStep(3);
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        }, 3000);
    };

    const stopPolling = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const checkVerificationManually = async () => {
        setChecking(true);
        try {
            const verified = await authService.checkVerificationStatus(pendingEmail);
            if (verified) {
                stopPolling();
                setStep(3);
            } else {
                Alert.alert('Not Verified Yet', 'Please click the link in your email to continue.');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to check status.');
        } finally {
            setChecking(false);
        }
    };

    const resendLink = async () => {
        if (resendCooldown > 0) return;
        setLoading(true);
        try {
            await authService.resendVerificationLink(pendingEmail);
            setResendCooldown(60);
            Alert.alert('Link Resent', 'A new confirmation link has been sent to your email.');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to resend link.');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalSignup = async (formData: SellerSignupFormData) => {
        setLoading(true);
        try {
            const normalizedEmail = formData.email.trim().toLowerCase();
            
            // Ensure we have a valid session after verification
            await useAuthStore.getState().checkSession();
            let currentUser = useAuthStore.getState().user;

            // If no session exists (e.g., they verified in a different browser and deep-linking failed),
            // we attempt a silent login since we have their email and password from the form
            if (!currentUser) {
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password: formData.password,
                });
                
                if (signInError) throw new Error('Credentials mismatch. Please log in again.');
                currentUser = {
                    id: signInData.user.id,
                    email: signInData.user.email || '',
                    name: formData.storeName,
                    roles: ['buyer'] // Default
                } as any;
            }

            if (!currentUser?.id) throw new Error('Account initialization failed.');
            const userId = currentUser.id;

            // 1. Create/Ensure Profile data is updated
            await supabase
                .from('profiles')
                .update({
                    first_name: formData.storeName,
                    phone: formData.phone,
                })
                .eq('id', userId);

            // 2. Add 'seller' role
            await authService.addUserRole(userId, 'seller');

            // 3. Create or Update Seller core record
            const { error: sellerError } = await supabase
                .from('sellers')
                .upsert({
                    id: userId,
                    store_name: formData.storeName,
                    store_description: formData.storeDescription || '',
                    approval_status: 'pending',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (sellerError) throw sellerError;

            // 4. Create or Update Seller Business Profile (for address)
            const { error: bizProfileError } = await supabase
                .from('seller_business_profiles')
                .upsert({
                    seller_id: userId,
                    address_line_1: formData.storeAddress,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'seller_id' });

            if (bizProfileError) throw bizProfileError;

            // 4. Update Global Store & Switch to Seller
            updateSellerInfo({
                id: userId,
                store_name: formData.storeName,
                email: normalizedEmail,
                approval_status: 'pending'
            });

            addRole('seller');
            switchRole('seller');

            // Sync with Global Auth Store to ensure root navigation respects the role
            useGlobalAuthStore.getState().addRole('seller');
            useGlobalAuthStore.getState().switchRole('seller');

            Alert.alert('Success', 'Application submitted! We will review your shop.', [
                { text: 'OK', onPress: () => navigation.replace('SellerStack') }
            ]);
        } catch (err: any) {
            console.error('Final signup error:', err);
            Alert.alert('Error', err.message || 'Signup completion failed.');
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
                        <View style={[styles.progressLineActive, { width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }]} />
                        <View style={styles.stepsRow}>
                            <View style={[styles.stepDot, step >= 1 && styles.activeDot]}>
                                {step > 1 ? <Check size={14} color="#FFF" /> : <Text style={styles.stepNum}>1</Text>}
                            </View>
                            <View style={[styles.stepDot, step >= 2 && styles.activeDot]}>
                                {step > 2 ? <Check size={14} color="#FFF" /> : <Text style={[styles.stepNum, step < 2 && styles.inactiveNum]}>2</Text>}
                            </View>
                            <View style={[styles.stepDot, step >= 3 && styles.activeDot]}>
                                <Text style={[styles.stepNum, step < 3 && styles.inactiveNum]}>3</Text>
                            </View>
                        </View>
                        <View style={styles.stepLabels}>
                            <Text style={[styles.stepLabel, step >= 1 && styles.activeLabel]}>Account</Text>
                            <Text style={[styles.stepLabel, step >= 2 && styles.activeLabel]}>Email</Text>
                            <Text style={[styles.stepLabel, step >= 3 && styles.activeLabel]}>Store</Text>
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

                                <View style={styles.termsContainer}>
                                    <Pressable 
                                        style={styles.checkboxBase} 
                                        onPress={() => setAcceptedTerms(!acceptedTerms)}
                                    >
                                        {acceptedTerms ? (
                                            <CheckSquare size={20} color="#D97706" />
                                        ) : (
                                            <Square size={20} color={COLORS.gray400} />
                                        )}
                                    </Pressable>
                                    <View style={styles.termsTextContainer}>
                                        <Text style={styles.termsText}>I agree to the </Text>
                                        <Pressable onPress={() => setShowTermsModal(true)}>
                                            <Text style={styles.termsLink}>Terms and Conditions</Text>
                                        </Pressable>
                                    </View>
                                </View>

                                <Pressable
                                    style={[
                                        styles.primaryButton, 
                                        (loading || emailStatus === 'checking' || emailStatus === 'taken' || !acceptedTerms || !watch('email') || !watch('password') || !watch('confirmPassword')) && styles.buttonDisabled
                                    ]}
                                    onPress={handleNextStep}
                                    disabled={loading || emailStatus === 'checking' || emailStatus === 'taken' || !acceptedTerms || !watch('email') || !watch('password') || !watch('confirmPassword')}
                                >
                                    {loading ? <ActivityIndicator color="#FFF" /> : (
                                        <>
                                            <Text style={styles.buttonText}>Next: Verify Email</Text>
                                            <ArrowRight size={20} color="#FFF" />
                                        </>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                        
                        {/* Step 2: Confirmation Link Verification */}
                        <View style={{ display: step === 2 ? 'flex' : 'none' }}>
                            <View style={styles.stepContent}>
                                <View style={styles.emailVerifyContainer}>
                                    <View style={styles.mailIconCircle}>
                                        <Mail size={48} color="#D97706" />
                                    </View>
                                    <Text style={[styles.verifyTitle, { color: COLORS.textHeadline }]}>Confirm Your Email</Text>
                                    <Text style={[styles.verifySubtitle, { color: COLORS.textMuted }]}>
                                        We've sent a confirmation link to{'\n'}
                                        <Text style={{ fontWeight: '700', color: COLORS.textHeadline }}>{pendingEmail}</Text>
                                    </Text>
                                    
                                    <View style={styles.instructionCard}>
                                        <View style={styles.instructionRow}>
                                            <View style={styles.instructionDot}>
                                                <Text style={styles.instructionNum}>1</Text>
                                            </View>
                                            <Text style={styles.instructionText}>Check your inbox and spam folder</Text>
                                        </View>
                                        <View style={styles.instructionRow}>
                                            <View style={styles.instructionDot}>
                                                <Text style={styles.instructionNum}>2</Text>
                                            </View>
                                            <Text style={styles.instructionText}>Click the verification link in the email</Text>
                                        </View>
                                        <View style={styles.instructionRow}>
                                            <View style={styles.instructionDot}>
                                                <Text style={styles.instructionNum}>3</Text>
                                            </View>
                                            <Text style={styles.instructionText}>Return here to complete your setup</Text>
                                        </View>
                                    </View>
                                </View>

                                <Pressable
                                    style={[styles.primaryButton, (checking) && styles.buttonDisabled]}
                                    onPress={checkVerificationManually}
                                    disabled={checking}
                                >
                                    {checking ? <ActivityIndicator color="#FFF" /> : (
                                        <>
                                            <Text style={styles.buttonText}>I've Verified My Email</Text>
                                            <ArrowRight size={20} color="#FFF" />
                                        </>
                                    )}
                                </Pressable>

                                <View style={styles.resendContainer}>
                                    <View style={styles.cooldownRow}>
                                        <Clock size={16} color={COLORS.gray400} />
                                        <Text style={[styles.resendText, { color: COLORS.textMuted }]}>
                                            {resendCooldown > 0 
                                                ? `Resend available in ${resendCooldown}s` 
                                                : "Didn't receive the link?"}
                                        </Text>
                                    </View>
                                    <Pressable onPress={resendLink} disabled={loading || resendCooldown > 0}>
                                        <Text style={[styles.resendLink, (loading || resendCooldown > 0) && styles.resendDisabled]}>Resend Link</Text>
                                    </Pressable>
                                </View>

                                <Pressable
                                    style={styles.backBtn}
                                    onPress={() => {
                                        stopPolling();
                                        setStep(1);
                                    }}
                                >
                                    <Text style={styles.backBtnText}>← Back to Account</Text>
                                </Pressable>
                            </View>
                        </View>

                        <View style={{ display: step === 3 ? 'flex' : 'none' }}>
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
                                    <Pressable style={styles.backBtn} onPress={() => setStep(2)}>
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

                {/* TERMS MODAL */}
                <Modal
                    visible={showTermsModal}
                    animationType="slide"
                    transparent={true}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Terms & Conditions</Text>
                                <Pressable onPress={() => setShowTermsModal(false)} style={styles.modalCloseIcon}>
                                    <XCircle size={24} color={COLORS.gray400} />
                                </Pressable>
                            </View>
                            <ScrollView style={styles.modalScroll}>
                                <Text style={styles.termsSectionTitle}>1. Seller Agreement</Text>
                                <Text style={styles.termsBodyText}>
                                    By registering as a seller on BazaarX, you agree to provide accurate information about your business and products. You are responsible for maintaining the quality of items listed and fulfilling orders in a timely manner.
                                </Text>
                                <Text style={styles.termsSectionTitle}>2. Commissions and Fees</Text>
                                <Text style={styles.termsBodyText}>
                                    BazaarX charges a standard platform fee on successful transactions. By joining, you accept our current fee structure, which is subject to change with notice.
                                </Text>
                                <Text style={styles.termsSectionTitle}>3. Product Compliance</Text>
                                <Text style={styles.termsBodyText}>
                                    Sellers must ensure that all products comply with local laws and platform policies. Prohibited items will be removed, and repeat violations may lead to account suspension.
                                </Text>
                                <Text style={styles.termsSectionTitle}>4. Data Privacy</Text>
                                <Text style={styles.termsBodyText}>
                                    We handle your data in accordance with our Privacy Policy. You agree not to misuse customer data provided for order fulfillment.
                                </Text>
                                <View style={{ height: 40 }} />
                            </ScrollView>
                            <Pressable 
                                style={styles.modalCloseButton}
                                onPress={() => {
                                    setAcceptedTerms(true);
                                    setShowTermsModal(false);
                                }}
                            >
                                <Text style={styles.modalCloseButtonText}>I Accept</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
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

    // Email Verification Styles
    emailVerifyContainer: { alignItems: 'center', marginBottom: 40 },
    verifyTitle: { fontSize: 24, fontWeight: '800', marginBottom: 12, marginTop: 20 },
    verifySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    resendContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 24 },
    resendText: { fontSize: 13, fontWeight: '500' },
    resendLink: { fontSize: 13, color: '#D97706', fontWeight: '700', textDecorationLine: 'underline' },
    resendDisabled: { opacity: 0.6 },

    mailIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    instructionCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    instructionDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#D97706',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    instructionNum: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    instructionText: {
        fontSize: 14,
        color: COLORS.textHeadline,
        fontWeight: '500',
        flex: 1,
    },
    cooldownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginRight: 8,
    },

    // Terms Styling
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 8,
        paddingHorizontal: 4,
    },
    checkboxBase: {
        marginRight: 10,
    },
    termsTextContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        flex: 1,
    },
    termsText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    termsLink: {
        fontSize: 14,
        color: '#D97706',
        fontWeight: '700',
        textDecorationLine: 'underline',
    },

    // Modal Styling
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textHeadline,
    },
    modalCloseIcon: {
        padding: 4,
    },
    modalScroll: {
        flex: 1,
    },
    termsSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textHeadline,
        marginTop: 16,
        marginBottom: 8,
    },
    termsBodyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        lineHeight: 22,
    },
    modalCloseButton: {
        backgroundColor: '#D97706',
        borderRadius: 14,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    modalCloseButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

