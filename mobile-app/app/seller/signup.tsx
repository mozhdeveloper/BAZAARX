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
import { useSellerStore } from '../../src/stores/sellerStore';
import { useAuthStore } from '../../src/stores/authStore';

const { width } = Dimensions.get('window');

export default function SellerSignupScreen() {
    const navigation = useNavigation<any>();
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
    const [error, setError] = useState('');

    // --- LIVE EMAIL CHECK ---
    useEffect(() => {
        const checkEmail = async () => {
            if (formData.email.length < 5 || !formData.email.includes('@')) {
                setEmailStatus('idle');
                return;
            }

            setEmailStatus('checking');
            try {
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('email', formData.email.trim().toLowerCase())
                    .maybeSingle();

                if (fetchError) throw fetchError;
                setEmailStatus(data ? 'taken' : 'available');
            } catch (err) {
                setEmailStatus('idle');
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
                    .from('profiles')
                    .select('full_name')
                    .eq('full_name', formData.storeName.trim())
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
            if (formData.password !== formData.confirmPassword) {
                setError("Passwords do not match");
                return;
            }
            if (formData.password.length < 6) {
                setError("Password must be at least 6 characters");
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
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email.trim(),
                password: formData.password,
                options: { data: { role: 'seller', store_name: formData.storeName } }
            });

            if (authError) throw authError;

            if (authData.user) {
                // Update Profile
                const { error: profileError } = await supabase.from('profiles').update({
                    full_name: formData.storeName,
                    phone: formData.phone,
                    user_type: 'seller'
                }).eq('id', authData.user.id);

                if (profileError) throw profileError;

                // Insert Seller
                const { error: sellerError } = await supabase.from('sellers').insert({
                    id: authData.user.id,
                    store_name: formData.storeName,
                    business_name: formData.storeName,
                    store_description: formData.storeDescription,
                    business_address: formData.storeAddress,
                    approval_status: 'pending'
                });

                if (sellerError) throw sellerError;

                // Sync data to store - IMPORTANT: Include the seller ID
                useSellerStore.getState().updateSellerInfo({
                    id: authData.user.id, // This is critical for QA and product queries
                    storeName: formData.storeName,
                    email: formData.email,
                    approval_status: 'pending'
                });

                // Sync roles to AuthStore
                useAuthStore.getState().addRole('seller');
                useAuthStore.getState().switchRole('seller');

                Alert.alert(
                    'Success',
                    'Application submitted! We will review your shop.',
                    [{ text: 'OK', onPress: () => navigation.replace('SellerStack') }]
                );
            }
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
                                        {emailStatus === 'checking' && <ActivityIndicator size="small" color="#FF6A00" />}
                                        {emailStatus === 'available' && <CheckCircle2 size={18} color="#10B981" />}
                                        {emailStatus === 'taken' && <XCircle size={18} color="#EF4444" />}
                                    </View>
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
                                        colors={['#FF6A00', '#FF8C42']}
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
                                            colors={['#FF6A00', '#FF8C42']}
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
        shadowColor: '#FF6A00',
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
        backgroundColor: '#FF6A00',
        shadowColor: '#FF6A00',
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
        backgroundColor: '#FF6A00',
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
        color: '#FF6A00',
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
        borderColor: '#FEE2E2',
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
        backgroundColor: '#F9FAFB',
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

    primaryButton: { borderRadius: 16, overflow: 'hidden', marginTop: 10, elevation: 4, shadowColor: '#FF6A00', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12 },
    buttonGradient: { height: 56, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 },
    buttonText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },

    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
    backButton: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
    backButtonText: { fontSize: 16, color: '#6B7280', fontWeight: '700' },

    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    footerText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
    loginLink: { fontSize: 15, color: '#FF6A00', fontWeight: '700' },

    backToHome: { alignItems: 'center', marginTop: 20 },
    backLink: { fontSize: 14, color: '#9CA3AF', fontWeight: '700' },
});