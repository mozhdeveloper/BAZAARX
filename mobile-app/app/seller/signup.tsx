import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator, Dimensions, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Store, Phone, Eye, EyeOff, ArrowRight, Check, XCircle, ChevronRight, CheckCircle2, UserCheck } from 'lucide-react-native';
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

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        storeName: '',
        phone: '',
        storeDescription: '',
        storeAddress: '',
    });

    // Validation States
    const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [storeStatus, setStoreStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [emailMessage, setEmailMessage] = useState('');
    const [error, setError] = useState('');

    const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    // --- LIVE EMAIL CHECK ---
    useEffect(() => {
        const checkEmail = async () => {
            const normalizedEmail = formData.email.trim().toLowerCase();

            if (!normalizedEmail) {
                setEmailStatus('idle');
                setEmailMessage('');
                return;
            }

            if (!validateEmail(normalizedEmail)) {
                setEmailStatus('taken');
                setEmailMessage('Please enter a valid email format.');
                return;
            }

            setEmailStatus('checking');
            try {
                const status = await authService.getEmailRoleStatus(normalizedEmail);

                if (!status.exists) {
                    setEmailStatus('available');
                    setEmailMessage('Email is available.');
                    return;
                }

                const roles = status.roles;
                const isBuyerOnly = roles.length > 0 && roles.every((role) => role === 'buyer');

                if (isBuyerOnly) {
                    setEmailStatus('available');
                    setEmailMessage('Existing buyer account found. You can continue to create a seller profile.');
                    return;
                }

                const hasSellerRole = roles.includes('seller');
                setEmailStatus('taken');
                setEmailMessage(
                    hasSellerRole
                        ? 'This email is already registered as a seller. Please sign in instead.'
                        : 'This email is already registered with restricted roles. Use another email.'
                );
            } catch (err) {
                setEmailStatus('idle');
                setEmailMessage('');
            }
        };

        const timeoutId = setTimeout(checkEmail, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.email]);

    // --- LIVE STORE NAME CHECK ---
    useEffect(() => {
        const checkStore = async () => {
            if (formData.storeName.trim().length < 3) {
                setStoreStatus('idle');
                return;
            }

            setStoreStatus('checking');
            try {
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

    const handleNextStep = () => {
        if (step === 1) {
            if (!formData.email || !formData.password || !formData.confirmPassword) {
                setError("Please fill in all fields");
                return;
            }
            if (!validateEmail(formData.email.trim())) {
                setError("Please enter a valid email address");
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError("Passwords do not match");
                return;
            }
            if (formData.password.length < 6) {
                setError("Password must be at least 6 characters");
                return;
            }
            if (emailStatus === 'checking') {
                setError("Checking email status. Please wait.");
                return;
            }
            if (emailStatus === 'taken') {
                setError("Email is already registered");
                return;
            }
            setError("");
            setStep(2);
        }
    };

    const handleFinalSignup = async () => {
        if (!formData.storeName) {
            setError("Store name is required");
            return;
        }

        if (storeStatus === 'taken') {
            setError("Store name is already taken");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const normalizedEmail = formData.email.trim().toLowerCase();
            const latestStatus = await authService.getEmailRoleStatus(normalizedEmail);
            const roles = latestStatus.roles;
            const isBuyerOnly = latestStatus.exists && roles.length > 0 && roles.every((role) => role === 'buyer');

            let userId: string;

            if (isBuyerOnly) {
                if (!latestStatus.userId) {
                    throw new Error('Unable to find buyer account for this email.');
                }

                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password: formData.password,
                });

                if (signInError || !signInData.user) {
                    throw new Error('Incorrect password for existing buyer account.');
                }

                if (signInData.user.id !== latestStatus.userId) {
                    throw new Error('Account mismatch detected. Please try again.');
                }

                const sellerResult = await authService.registerBuyerAsSeller(latestStatus.userId, {
                    store_name: formData.storeName,
                    store_description: formData.storeDescription,
                    owner_name: formData.storeName,
                });

                if (!sellerResult) {
                    throw new Error('Failed to upgrade buyer account to seller.');
                }

                userId = latestStatus.userId;

                await supabase
                    .from('sellers')
                    .update({
                        business_name: formData.storeName,
                        business_address: formData.storeAddress,
                    } as any)
                    .eq('id', userId);
            } else {
                // Use authService for proper profile and user_roles creation
                const result = await authService.signUp(
                    normalizedEmail,
                    formData.password,
                    {
                        first_name: formData.storeName,
                        phone: formData.phone,
                        user_type: 'seller',
                        email: normalizedEmail,
                        password: formData.password,
                    }
                );

                if (!result || !result.user) throw new Error('Signup failed. Please try again.');

                userId = result.user.id;

                // Insert Seller record
                const { error: sellerError } = await supabase.from('sellers').insert({
                    id: userId,
                    store_name: formData.storeName,
                    business_name: formData.storeName,
                    store_description: formData.storeDescription,
                    business_address: formData.storeAddress,
                    approval_status: 'pending'
                });

                if (sellerError) throw sellerError;
            }

            // Sync data to store - IMPORTANT: Include the seller ID
            updateSellerInfo({
                id: userId,
                store_name: formData.storeName,
                email: formData.email,
                approval_status: 'pending'
            });

            // Sync roles to AuthStore
            addRole('seller');
            switchRole('seller');

            Alert.alert(
                'Success',
                'Application submitted! We will review your shop.',
                [{ text: 'OK', onPress: () => navigation.replace('SellerStack') }]
            );
        } catch (err: any) {
            setError(err.message || 'Signup failed. Please try again.');
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
                        <View style={styles.logoWrapper}>
                            <Image
                                source={require('../../assets/icon.png')}
                                style={styles.logo}
                            />
                        </View>
                        <Text style={styles.title}>Join BazaarPH</Text>
                        <Text style={styles.subtitle}>Create your seller account to get started.</Text>
                    </View>

                    {/* Progress Indicator */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressRow}>
                            <View style={[styles.stepCircle, step >= 1 && styles.activeCircle]}>
                                {step > 1 ? <CheckCircle2 size={20} color="#FFF" /> : <Text style={styles.stepNumber}>1</Text>}
                            </View>
                            <View style={[styles.progressLine, step === 2 && styles.activeLine]} />
                            <View style={[styles.stepCircle, step === 2 && styles.activeCircle]}>
                                <Text style={[styles.stepNumber, step < 2 && styles.inactiveNumber]}>2</Text>
                            </View>
                        </View>
                        <View style={styles.progressLabels}>
                            <Text style={[styles.progressLabel, step >= 1 && styles.activeLabel]}>Account</Text>
                            <Text style={[styles.progressLabel, step === 2 && styles.activeLabel]}>Store Details</Text>
                        </View>
                    </View>

                    {/* Error Message */}
                    {error && (
                        <View style={styles.errorCard}>
                            <XCircle size={18} color="#EF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <View style={styles.form}>
                        {step === 1 ? (
                            <View style={styles.stepContent}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Email Address</Text>
                                    <View style={[styles.inputWrapper, emailStatus === 'taken' && styles.errorInput]}>
                                        <Mail size={18} color="#9CA3AF" />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your email"
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            value={formData.email}
                                            onChangeText={(v) => {
                                                setFormData({ ...formData, email: v });
                                                if (error) setError("");
                                            }}
                                        />
                                        {emailStatus === 'checking' && <ActivityIndicator size="small" color="#D97706" />}
                                        {emailStatus === 'available' && <CheckCircle2 size={18} color="#10B981" />}
                                        {emailStatus === 'taken' && <XCircle size={18} color="#EF4444" />}
                                    </View>
                                    {(emailStatus === 'checking' || !!emailMessage) && (
                                        <Text
                                            style={[
                                                styles.emailStatusText,
                                                emailStatus === 'available' && styles.emailStatusSuccess,
                                                emailStatus === 'taken' && styles.emailStatusError,
                                                emailStatus === 'checking' && styles.emailStatusChecking,
                                            ]}
                                        >
                                            {emailStatus === 'checking' ? 'Checking email availability...' : emailMessage}
                                        </Text>
                                    )}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Password</Text>
                                    <View style={styles.inputWrapper}>
                                        <Lock size={18} color="#9CA3AF" />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Create a password"
                                            secureTextEntry={!showPassword}
                                            value={formData.password}
                                            onChangeText={(v) => {
                                                setFormData({ ...formData, password: v });
                                                if (error) setError("");
                                            }}
                                        />
                                        <Pressable onPress={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
                                        </Pressable>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Confirm Password</Text>
                                    <View style={styles.inputWrapper}>
                                        <Lock size={18} color="#9CA3AF" />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Confirm your password"
                                            secureTextEntry={!showConfirmPassword}
                                            value={formData.confirmPassword}
                                            onChangeText={(v) => {
                                                setFormData({ ...formData, confirmPassword: v });
                                                if (error) setError("");
                                            }}
                                        />
                                        <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                            {showConfirmPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
                                        </Pressable>
                                    </View>
                                </View>

                                <Pressable style={styles.primaryButton} onPress={handleNextStep}>
                                    <LinearGradient
                                        colors={['#D97706', '#B45309']}
                                        style={styles.buttonGradient}
                                    >
                                        <Text style={styles.buttonText}>Next: Store Info</Text>
                                        <ArrowRight size={20} color="#FFF" />
                                    </LinearGradient>
                                </Pressable>
                            </View>
                        ) : (
                            <View style={styles.stepContent}>
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
                                        {storeStatus === 'checking' && <ActivityIndicator size="small" color="#D97706" />}
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

                                <View style={styles.buttonRow}>
                                    <Pressable style={styles.backButton} onPress={() => setStep(1)}>
                                        <Text style={styles.backButtonText}>Back</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.primaryButton, { flex: 2 }]}
                                        onPress={handleFinalSignup}
                                        disabled={loading}
                                    >
                                        <LinearGradient
                                            colors={['#D97706', '#B45309']}
                                            style={styles.buttonGradient}
                                        >
                                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Create Account</Text>}
                                        </LinearGradient>
                                    </Pressable>
                                </View>
                            </View>
                        )}
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
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { paddingBottom: 40 },
    header: {
        paddingTop: 30,
        paddingBottom: 25,
        alignItems: 'center',
        paddingHorizontal: 25,
    },
    logoWrapper: {
        width: 64,
        height: 64,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFE4D6',
    },
    logo: { width: 50, height: 50, borderRadius: 12 },
    title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#6B7280', fontWeight: '500', textAlign: 'center' },

    progressContainer: {
        marginHorizontal: 40,
        marginBottom: 30,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    activeCircle: {
        backgroundColor: '#D97706',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    stepNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    inactiveNumber: {
        color: '#9CA3AF',
    },
    progressLine: {
        flex: 1,
        height: 4,
        backgroundColor: '#F3F4F6',
        marginHorizontal: -5,
    },
    activeLine: {
        backgroundColor: '#D97706',
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingHorizontal: -10,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
    },
    activeLabel: {
        color: '#D97706',
    },

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
        borderColor: '#FEF2F2',
    },
    errorText: {
        fontSize: 13,
        color: '#EF4444',
        fontWeight: '600',
        flex: 1,
    },

    form: { paddingHorizontal: 25 },
    stepContent: { gap: 15 },
    inputGroup: { marginBottom: 5 },
    label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginLeft: 4 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF4EC',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 12,
    },
    errorInput: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    input: { flex: 1, fontSize: 16, color: '#111827', fontWeight: '600' },
    emailStatusText: {
        marginTop: 6,
        marginLeft: 4,
        fontSize: 12,
        fontWeight: '600',
    },
    emailStatusSuccess: {
        color: '#059669',
    },
    emailStatusError: {
        color: '#DC2626',
    },
    emailStatusChecking: {
        color: '#92400E',
    },

    primaryButton: { borderRadius: 16, overflow: 'hidden', marginTop: 10, elevation: 4, shadowColor: '#D97706', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12 },
    buttonGradient: { height: 56, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 },
    buttonText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },

    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
    backButton: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: '#FFF4EC', borderWidth: 1, borderColor: '#E5E7EB' },
    backButtonText: { fontSize: 16, color: '#6B7280', fontWeight: '700' },

    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    footerText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
    loginLink: { fontSize: 15, color: '#D97706', fontWeight: '700' },

    backToHome: { alignItems: 'center', marginTop: 20 },
    backLink: { fontSize: 14, color: '#9CA3AF', fontWeight: '700' },
});