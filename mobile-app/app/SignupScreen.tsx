import React, { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupFormData } from '../src/lib/schemas';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
    Dimensions,
    Image,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { CardStyleInterpolators } from '@react-navigation/stack';
import { supabase } from '../src/lib/supabase';
import { authService } from '../src/services/authService';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { getRedirectUri, processAuthSessionResultUrl } from '../src/utils/urlUtils';

WebBrowser.maybeCompleteAuthSession();



type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
    const [loading, setLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
    const [emailStatusMessage, setEmailStatusMessage] = useState('');
    const emailCheckRequestIdRef = useRef(0);

    const {
        control,
        handleSubmit,
        setError,
        clearErrors,
        formState: { errors, isValid },
        watch,
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
        mode: 'onChange',
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
        },
    });

    const watchedEmail = watch('email');
    const trimmedEmail = watchedEmail?.trim() || '';

    useEffect(() => {
        navigation.setOptions({
            animation: 'slide_from_right',
        });
    }, [navigation]);

    useEffect(() => {
        if (!trimmedEmail) {
            setEmailStatus('idle');
            setEmailStatusMessage('');
            clearErrors('email');
            return;
        }

        // Basic format check before server check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setEmailStatus('invalid');
            return;
        }

        const requestId = ++emailCheckRequestIdRef.current;
        setEmailStatus('checking');
        setEmailStatusMessage('Checking email availability...');

        const timer = setTimeout(async () => {
            const exists = await authService.checkEmailExists(trimmedEmail);
            if (requestId !== emailCheckRequestIdRef.current) return;

            if (exists) {
                setEmailStatus('taken');
                setEmailStatusMessage('Email is already taken.');
                setError('email', { type: 'manual', message: 'Email is already taken' });
            } else {
                setEmailStatus('available');
                setEmailStatusMessage('Email is available.');
                // We don't clearErrors('email') here because it might have zod errors
                // But if it's available, we don't need the 'manual' error anymore
                if (errors.email?.type === 'manual') {
                    clearErrors('email');
                }
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [trimmedEmail]);

    const handleSignup = async (formData: SignupFormData) => {
        const { firstName, lastName, email, phone, password } = formData;

        if (emailStatus === 'taken') {
            Alert.alert('Error', 'Email is already taken');
            return;
        }

        // NORMALLY WE SIGN UP HERE, BUT WE NOW DELAY UNTIL TERMS ARE ACCEPTED
        try {
            const signupData = {
                firstName,
                lastName,
                email: email.trim(),
                phone,
                password,
                user_type: 'buyer' as const
            };

            // Persist signup data to store to survive deep link redirects
            useAuthStore.getState().setPendingSignup(signupData);

            // Navigate to Terms first - THE EMAIL WILL BE SENT FROM THERE
            navigation.replace('Terms', { signupData });
        } catch (error: any) {
            console.error('Signup Preparation Error:', error);
            Alert.alert('Error', 'Failed to prepare account data.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
            console.log('[SignupScreen] Starting Google Sign-In...');

            const redirectUrl = getRedirectUri();
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: false,
                },
            });

            if (error) {
                Alert.alert('Google Sign-In Error', error.message);
                setIsGoogleLoading(false);
                return;
            }

            if (!data?.url) {
                Alert.alert('Error', 'Failed to initialize Google Sign-In.');
                setIsGoogleLoading(false);
                return;
            }

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

            try {
                if (result.type === 'cancel' || result.type === 'dismiss') {
                    setIsGoogleLoading(false);
                    return;
                }

                // Process the URL returned by openAuthSessionAsync on iOS
                if (result.type === 'success' && result.url) {
                    console.log('[SignupScreen] Manual URL processing from AuthSession result...');
                    await processAuthSessionResultUrl(result.url, supabase);
                }

                // Wait for session - check immediately, then wait briefly if needed
                console.log('[SignupScreen] Checking for established session...');
                let session: any = null;
                const { data: initialCheck } = await supabase.auth.getSession();
                session = initialCheck.session;

                if (!session) {
                    console.log('[SignupScreen] Session not found immediately, waiting for auth event (max 5s)...');
                    try {
                        await new Promise<void>((resolve, reject) => {
                            const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
                            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
                                if (event === 'SIGNED_IN' && s) {
                                    session = s;
                                    clearTimeout(timeout);
                                    subscription.unsubscribe();
                                    resolve();
                                }
                            });
                        });
                    } catch (e) {
                        console.log('[SignupScreen] Event wait timed out, performing final check...');
                        const { data: finalCheck } = await supabase.auth.getSession();
                        session = finalCheck.session;
                    }
                }

                if (session) {
                    console.log('[SignupScreen] ✅ Session confirmed. Processing success logic...');
                    const userId = session.user.id;

                    // POLICY ENFORCEMENT: Check for unauthorized Google linking
                    const { data: identityData } = await supabase.auth.getUserIdentities();
                    const identities = identityData?.identities || [];
                    const emailIdentity = identities.find(id => id.provider === 'email');
                    const googleIdentity = identities.find(id => id.provider === 'google');

                    if (emailIdentity && googleIdentity) {
                        const isExplicitlyLinked = !!session.user.user_metadata?.google_explicitly_linked;
                        const linkAgeMs = Date.now() - new Date(googleIdentity.created_at || Date.now()).getTime();
                        if (!isExplicitlyLinked && linkAgeMs < 300000) {
                            console.log('[SignupScreen] 🛡️ Google Link Policy Blocked');
                            await supabase.auth.unlinkIdentity(googleIdentity);
                            await useAuthStore.getState().signOut();
                            Alert.alert('Security Notice', 'This Google account is not yet linked. Please use email/password.');
                            setIsGoogleLoading(false);
                            return;
                        }
                    }

                    const isComplete = await authService.isOnboardingComplete(userId);
                    
                    const signupData = { 
                        email: session.user.email || '',
                        firstName: session.user.user_metadata?.first_name || 
                                  session.user.user_metadata?.full_name?.split(' ')[0] || '',
                        lastName: session.user.user_metadata?.last_name || 
                                 session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
                        phone: session.user.phone || '',
                        user_type: 'buyer' as const
                    };

                    // Persist to store so CategoryPreference screen can find it
                    useAuthStore.getState().setPendingSignup(signupData);

                    if (isComplete) {
                        Alert.alert('Notice', 'User has already been registered, redirecting to homepage.');
                        navigation.replace('MainTabs', { screen: 'Home' });
                    } else {
                        navigation.replace('Terms', { signupData });
                    }
                } else {
                    Alert.alert('Sign-In Incomplete', 'We were unable to complete the sign-in process. Please try again.');
                    setIsGoogleLoading(false);
                }
            } catch (authError) {
                console.error('[SignupScreen] Auth process error:', authError);
                Alert.alert('Error', 'An unexpected error occurred during sign-in.');
                setIsGoogleLoading(false);
            }
        } catch (error) {
            console.error('[SignupScreen] Google Sign-In exception:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            setIsGoogleLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    <View style={styles.header}>
                        <Pressable
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <ArrowLeft size={20} color="#6B7280" />
                        </Pressable>
                        <Text style={[styles.title, { color: COLORS.textHeadline }]}>Create Account</Text>
                        <Text style={[styles.subtitle, { color: COLORS.textMuted }]}>Join BazaarX today</Text>
                    </View>

                    <View style={styles.form}>
                        {/* Name Fields Row */}
                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>First Name</Text>
                                <Controller
                                    control={control}
                                    name="firstName"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View style={[styles.inputWrapper, errors.firstName && styles.inputWrapperError]}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Juan"
                                                placeholderTextColor="#9CA3AF"
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                            />
                                        </View>
                                    )}
                                />
                                {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
                            </View>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.label}>Last Name</Text>
                                <Controller
                                    control={control}
                                    name="lastName"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View style={[styles.inputWrapper, errors.lastName && styles.inputWrapperError]}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Dela Cruz"
                                                placeholderTextColor="#9CA3AF"
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                            />
                                        </View>
                                    )}
                                />
                                {errors.lastName && <Text style={styles.errorText}>{errors.lastName.message}</Text>}
                            </View>
                        </View>

                        {/* Email */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={[
                                        styles.inputWrapper,
                                        errors.email && styles.inputWrapperError,
                                        emailStatus === 'available' && styles.inputWrapperSuccess,
                                    ]}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="juan@example.ph"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                        />
                                    </View>
                                )}
                            />
                            {errors.email ? (
                                <Text style={styles.errorText}>{errors.email.message}</Text>
                            ) : emailStatusMessage ? (
                                <Text
                                    style={[
                                        styles.emailStatusText,
                                        emailStatus === 'available' && styles.emailStatusSuccess,
                                        emailStatus === 'checking' && styles.emailStatusChecking,
                                    ]}
                                >
                                    {emailStatusMessage}
                                </Text>
                            ) : null}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Phone Number</Text>
                            <Controller
                                control={control}
                                name="phone"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={[styles.inputWrapper, errors.phone && styles.inputWrapperError]}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="09123456789"
                                            placeholderTextColor="#9CA3AF"
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

                        {/* Password */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <Controller
                                control={control}
                                name="password"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="••••••••"
                                            placeholderTextColor="#9CA3AF"
                                            secureTextEntry={!showPassword}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                        />
                                        <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                            {showPassword ? <EyeOff size={20} color="#9CA3AF" /> : <Eye size={20} color="#9CA3AF" />}
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
                                        <TextInput
                                            style={styles.input}
                                            placeholder="••••••••"
                                            placeholderTextColor="#9CA3AF"
                                            secureTextEntry={!showConfirmPassword}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                        />
                                        <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                            {showConfirmPassword ? <EyeOff size={20} color="#9CA3AF" /> : <Eye size={20} color="#9CA3AF" />}
                                        </Pressable>
                                    </View>
                                )}
                            />
                            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}
                        </View>

                        <Pressable 
                            style={[styles.signupButton, (loading || !isValid || emailStatus === 'taken') && styles.signupButtonDisabled]} 
                            onPress={handleSubmit(handleSignup)} 
                            disabled={loading || !isValid || emailStatus === 'taken'}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>Sign Up</Text>
                                </>
                            )}
                        </Pressable>
                    </View>

                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <Pressable
                        style={styles.googleButton}
                        onPress={handleGoogleSignIn}
                        disabled={isGoogleLoading}
                    >
                        {isGoogleLoading ? (
                            <ActivityIndicator color="#6B7280" />
                        ) : (
                            <>
                                <Image
                                    source={{ uri: 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png' }}
                                    style={styles.googleIcon}
                                />
                                <Text style={styles.googleButtonText}>Sign up with Google</Text>
                            </>
                        )}
                    </Pressable>

                    {/* Footer */}
                    <View style={styles.loginSection}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <Pressable onPress={() => navigation.goBack()}>
                            <Text style={styles.loginLink}>Sign In</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background || '#F9FAFB' },
    scrollContent: { padding: 24, flexGrow: 1 },
    header: { marginBottom: 24, marginTop: 0, alignItems: 'center' },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
    subtitle: { fontSize: 14 },
    form: { marginBottom: 24 },
    row: { flexDirection: 'row', marginBottom: 0 },
    inputContainer: { flexDirection: 'column', marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 6 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 48,
    },
    inputWrapperError: {
        borderColor: '#DC2626',
    },
    inputWrapperSuccess: {
        borderColor: '#16A34A',
    },
    input: { flex: 1, fontSize: 15, color: '#111827' },
    emailStatusText: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '500',
    },
    emailStatusError: {
        color: '#DC2626',
    },
    emailStatusSuccess: {
        color: '#15803D',
    },
    emailStatusChecking: {
        color: '#92400E',
    },
    errorText: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '500',
        color: '#DC2626',
    },
    eyeIcon: {
        padding: 4,
    },
    signupButton: {
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#D97706',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    signupButtonDisabled: {
        opacity: 0.6,
    },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    loginSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    loginText: {
        fontSize: 14,
        color: '#6B7280',
    },
    loginLink: {
        fontSize: 14,
        color: '#D97706',
        fontWeight: '700',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 1.2,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 12,
        marginBottom: 24,
    },
    googleIcon: {
        width: 20,
        height: 20,
    },
    googleButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
});
