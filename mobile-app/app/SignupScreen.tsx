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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { CardStyleInterpolators } from '@react-navigation/stack';
import { supabase } from '../src/lib/supabase';
import { authService } from '../src/services/authService';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
    const [loading, setLoading] = useState(false);
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

        // PERFORM SIGNUP
        setLoading(true);
        try {
            const result = await authService.signUp(email.trim(), password, {
                first_name: firstName,
                last_name: lastName,
                phone,
                user_type: 'buyer',
                email: email.trim(),
                password,
            });

            if (result?.user) {
                // Persist signup data to store to survive deep link redirects
                useAuthStore.getState().setPendingSignup({
                    firstName,
                    lastName,
                    email: email.trim(),
                    phone,
                    password,
                    user_type: 'buyer'
                });

                // Navigate to Email verification
                navigation.replace('EmailVerification', { email: email.trim() });
            }
        } catch (error: any) {
            console.error('Signup Error:', error);
            Alert.alert('Error', error.message || 'Failed to create account.');
        } finally {
            setLoading(false);
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
});
