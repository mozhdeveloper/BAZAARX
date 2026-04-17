import React, { useEffect, useRef, useState } from 'react';
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

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '', // Added field
    });

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePhone = (phone: string) => /^(\+63|0)?9\d{9}$/.test(phone.replace(/\s/g, ''));
    const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (!/[!@#$%^&*(),.?":{}|<>\-_[\]\\/`~+=;']/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        if (/\s/.test(password)) {
            errors.push('Password must not contain spaces');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    };

    const trimmedEmail = formData.email.trim();
    const livePasswordValidation = formData.password.length > 0 ? validatePassword(formData.password) : null;
    const livePasswordError = livePasswordValidation && !livePasswordValidation.valid ? livePasswordValidation.errors[0] : '';
    const showEmailError = emailTouched && (emailStatus === 'invalid' || emailStatus === 'taken');
    const showEmailSuccess = emailTouched && emailStatus === 'available';

    useEffect(() => {
        navigation.setOptions({
            animation: 'slide_from_right',
        });
    }, [navigation]);

    useEffect(() => {
        if (!emailTouched) return;

        if (!trimmedEmail) {
            setEmailStatus('idle');
            setEmailStatusMessage('');
            return;
        }

        if (!validateEmail(trimmedEmail)) {
            setEmailStatus('invalid');
            setEmailStatusMessage('Please enter a valid email address.');
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
            } else {
                setEmailStatus('available');
                setEmailStatusMessage('Email is available.');
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [trimmedEmail, emailTouched]);

    const handleSignup = async () => {
        const { firstName, lastName, email, phone, password, confirmPassword } = formData;

        // Validations
        if (!firstName || !lastName || !email || !phone || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (!validateEmail(email.trim())) {
            Alert.alert('Error', 'Invalid email address');
            return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            Alert.alert('Error', passwordValidation.errors[0] || 'Password does not meet minimum security requirements.');
            return;
        }

        const isEmailTaken = await authService.checkEmailExists(email.trim());
        if (isEmailTaken) {
            Alert.alert('Error', 'Email is already taken');
            return;
        }

        if (!validatePhone(phone)) {
            Alert.alert('Error', 'Invalid phone number');
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
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Juan"
                                        placeholderTextColor="#9CA3AF"
                                        onChangeText={(v) => setFormData({ ...formData, firstName: v })}
                                    />
                                </View>
                            </View>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Text style={styles.label}>Last Name</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Dela Cruz"
                                        placeholderTextColor="#9CA3AF"
                                        onChangeText={(v) => setFormData({ ...formData, lastName: v })}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Email */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={[
                                styles.inputWrapper,
                                showEmailError && styles.inputWrapperError,
                                showEmailSuccess && styles.inputWrapperSuccess,
                            ]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="juan@example.ph"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={formData.email}
                                    onChangeText={(v) => {
                                        setFormData({ ...formData, email: v });
                                        if (!emailTouched && v.length > 0) {
                                            setEmailTouched(true);
                                        }
                                    }}
                                    onBlur={() => setEmailTouched(true)}
                                />
                            </View>
                            {emailTouched && trimmedEmail.length > 0 && emailStatusMessage ? (
                                <Text
                                    style={[
                                        styles.emailStatusText,
                                        emailStatus === 'available' && styles.emailStatusSuccess,
                                        (emailStatus === 'invalid' || emailStatus === 'taken') && styles.emailStatusError,
                                        emailStatus === 'checking' && styles.emailStatusChecking,
                                    ]}
                                >
                                    {emailStatusMessage}
                                </Text>
                            ) : null}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="09123456789"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                    onChangeText={(v) => setFormData({ ...formData, phone: v })}
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry={!showPassword}
                                    onChangeText={(v) => setFormData({ ...formData, password: v })}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    {showPassword ? <EyeOff size={20} color="#9CA3AF" /> : <Eye size={20} color="#9CA3AF" />}
                                </Pressable>
                            </View>
                            {!!livePasswordError && <Text style={styles.passwordErrorText}>{livePasswordError}</Text>}
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry={!showConfirmPassword}
                                    onChangeText={(v) => setFormData({ ...formData, confirmPassword: v })}
                                />
                                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                    {showConfirmPassword ? <EyeOff size={20} color="#9CA3AF" /> : <Eye size={20} color="#9CA3AF" />}
                                </Pressable>
                            </View>
                        </View>

                        <Pressable style={[styles.signupButton, loading && styles.signupButtonDisabled]} onPress={handleSignup} disabled={loading}>
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
    passwordErrorText: {
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
