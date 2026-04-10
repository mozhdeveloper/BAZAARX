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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../src/lib/supabase';
import { authService } from '../src/services/authService';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

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
                // Navigate to Email verification (OTP already sent during signUp)
                navigation.replace('EmailVerification', { email: email.trim(), otpAlreadySent: true });
            }
        } catch (error: any) {
            console.error('Signup Error:', error);
            Alert.alert('Error', error.message || 'Failed to create account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <View style={styles.header}>
                        <Pressable 
                            style={styles.backButton} 
                            onPress={() => navigation.goBack()}
                            hitSlop={8}
                        >
                            <ArrowLeft size={24} color="#7C2D12" />
                        </Pressable>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join BazaarX today</Text>
                    </View>

                    <View style={styles.form}>
                        {/* Name Fields Row */}
                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>First Name</Text>
                                <View style={styles.inputWrapper}>
                                    <User size={18} color="#9CA3AF" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Juan"
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
                                <Mail size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="juan@example.ph"
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
                                <Phone size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="09123456789"
                                    keyboardType="phone-pad"
                                    onChangeText={(v) => setFormData({ ...formData, phone: v })}
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    secureTextEntry={!showPassword}
                                    onChangeText={(v) => setFormData({ ...formData, password: v })}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
                                </Pressable>
                            </View>
                            {!!livePasswordError && <Text style={styles.passwordErrorText}>{livePasswordError}</Text>}
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    secureTextEntry={!showConfirmPassword}
                                    onChangeText={(v) => setFormData({ ...formData, confirmPassword: v })}
                                />
                                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
                                </Pressable>
                            </View>
                        </View>

                        <Pressable style={styles.signupButton} onPress={handleSignup} disabled={loading}>
                            <LinearGradient colors={['#D97706', '#B45309']} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {loading ? <ActivityIndicator color="#FFF" /> : (
                                    <>
                                        <Text style={styles.buttonText}>Sign Up</Text>
                                        <ArrowRight size={20} color="#FFF" />
                                    </>
                                )}
                            </LinearGradient>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    // ... styles remain same
    scrollContent: { padding: 24, flexGrow: 1 },
    header: { marginBottom: 32, marginTop: 20 },
    backButton: { position: 'absolute', left: 0, top: 0, zIndex: 10 },
    title: { fontSize: 28, fontWeight: '800', color: '#7C2D12', marginBottom: 8, textAlign: 'center', marginTop: 40 }, // Warm Brown
    subtitle: { fontSize: 14, color: '#78350F', textAlign: 'center' }, // Soft Warm Brown
    form: { marginBottom: 24 },
    row: { flexDirection: 'row', marginBottom: 0 },
    inputContainer: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 54,
    },
    inputWrapperError: {
        borderColor: '#DC2626',
    },
    inputWrapperSuccess: {
        borderColor: '#16A34A',
    },
    input: { flex: 1, marginLeft: 10, fontSize: 15, color: '#111827' },
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
    signupButton: { borderRadius: 12, overflow: 'hidden', marginTop: 10 },
    gradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    buttonText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});