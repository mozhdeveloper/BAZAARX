import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView,
    Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Store, Phone, Eye, EyeOff, ArrowRight, Check, XCircle } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';

export default function SellerSignupScreen({ navigation }: any) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        storeName: '',
        phone: '',
        storeDescription: '',
    });

    // Validation States
    const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [storeStatus, setStoreStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

    // --- LIVE EMAIL CHECK ---
    useEffect(() => {
        const checkEmail = async () => {
            if (formData.email.length < 5 || !formData.email.includes('@')) {
                setEmailStatus('idle');
                return;
            }

            setEmailStatus('checking');
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('email', formData.email.trim().toLowerCase())
                    .maybeSingle();

                if (error) throw error;
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
            // Updated validation: store name doesn't need an '@'
            if (formData.storeName.trim().length < 3) {
                setStoreStatus('idle');
                return;
            }

            setStoreStatus('checking');
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('full_name', formData.storeName.trim())
                    .maybeSingle();

                if (error) throw error;
                setStoreStatus(data ? 'taken' : 'available');
            } catch (err) {
                setStoreStatus('idle');
            }
        };

        const timeoutId = setTimeout(checkStore, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.storeName]);

    // Step 1 Validation: All fields filled, passwords match, email is unique
    const isStep1Valid =
        formData.email.includes('@') &&
        formData.password.length >= 6 &&
        formData.password === formData.confirmPassword &&
        emailStatus === 'available';

    // Step 2 Validation: Store name unique and phone provided
    const isStep2Valid =
        storeStatus === 'available' &&
        formData.phone.length > 5;

    const handleFinalSignup = async () => {
        if (!isStep2Valid) {
            Alert.alert("Error", "Please ensure the store name is available and phone is entered.");
            return;
        }

        setLoading(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email.trim(),
                password: formData.password,
                options: { data: { role: 'seller', store_name: formData.storeName } }
            });

            if (authError) throw authError;

            if (authData.user) {
                // Add a small delay for trigger synchronization if needed
                await new Promise(resolve => setTimeout(resolve, 1000));

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
                    approval_status: 'pending'
                });

                if (sellerError) throw sellerError;

                Alert.alert('Success', 'Application submitted! We will review your shop.');
                navigation.navigate('Login');
            }
        } catch (error: any) {
            Alert.alert('Signup Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    <Text style={styles.mainTitle}>Seller Registration</Text>

                    {/* Progress Bar */}
                    <View style={styles.progressWrapper}>
                        <View style={styles.progressBg}>
                            <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
                        </View>
                        <View style={styles.stepsContainer}>
                            <Text style={[styles.stepLabel, step >= 1 && styles.activeLabel]}>Account</Text>
                            <Text style={[styles.stepLabel, step >= 2 && styles.activeLabel]}>Store Details</Text>
                        </View>
                    </View>

                    {step === 1 ? (
                        <View style={styles.form}>
                            <Text style={styles.sectionTitle}>Step 1: Account Credentials</Text>

                            <View style={[styles.inputWrapper, emailStatus === 'taken' && styles.errorBorder]}>
                                <Mail size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Business Email"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={formData.email}
                                    onChangeText={(v) => setFormData({ ...formData, email: v })}
                                />
                                {emailStatus === 'checking' && <ActivityIndicator size="small" color="#FF6A00" />}
                                {emailStatus === 'available' && <Check size={18} color="green" />}
                                {emailStatus === 'taken' && <XCircle size={18} color="red" />}
                            </View>
                            {emailStatus === 'taken' && <Text style={styles.errorText}>Email already registered</Text>}

                            <View style={styles.inputWrapper}>
                                <Lock size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password (min. 6 chars)"
                                    secureTextEntry={!showPassword}
                                    value={formData.password}
                                    onChangeText={(v) => setFormData({ ...formData, password: v })}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
                                </Pressable>
                            </View>

                            <View style={styles.inputWrapper}>
                                <Lock size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm Password"
                                    secureTextEntry
                                    value={formData.confirmPassword}
                                    onChangeText={(v) => setFormData({ ...formData, confirmPassword: v })}
                                />
                            </View>

                            <Pressable
                                style={[styles.primaryButton, !isStep1Valid && styles.disabledButton]}
                                onPress={() => setStep(2)}
                                disabled={!isStep1Valid}
                            >
                                <LinearGradient
                                    colors={isStep1Valid ? ['#FF6A00', '#FF8C42'] : ['#E5E7EB', '#E5E7EB']}
                                    style={styles.gradient}
                                >
                                    <Text style={[styles.buttonText, !isStep1Valid && { color: '#9CA3AF' }]}>Continue</Text>
                                    <ArrowRight size={20} color={isStep1Valid ? "#FFF" : "#9CA3AF"} />
                                </LinearGradient>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            <Text style={styles.sectionTitle}>Step 2: Store Information</Text>

                            <View style={[styles.inputWrapper, storeStatus === 'taken' && styles.errorBorder]}>
                                <Store size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Store Name"
                                    value={formData.storeName}
                                    onChangeText={(v) => setFormData({ ...formData, storeName: v })}
                                />
                                {storeStatus === 'checking' && <ActivityIndicator size="small" color="#FF6A00" />}
                                {storeStatus === 'available' && <Check size={18} color="green" />}
                                {storeStatus === 'taken' && <XCircle size={18} color="red" />}
                            </View>
                            {storeStatus === 'taken' && <Text style={styles.errorText}>Store name is already taken</Text>}

                            <View style={styles.inputWrapper}>
                                <Phone size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Phone Number"
                                    keyboardType="phone-pad"
                                    value={formData.phone}
                                    onChangeText={(v) => setFormData({ ...formData, phone: v })}
                                />
                            </View>

                            <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                                <TextInput
                                    style={[styles.input, { marginLeft: 0 }]}
                                    placeholder="Store Description (Optional)"
                                    multiline
                                    numberOfLines={4}
                                    value={formData.storeDescription}
                                    onChangeText={(v) => setFormData({ ...formData, storeDescription: v })}
                                />
                            </View>

                            <View style={styles.row}>
                                <Pressable style={styles.backButton} onPress={() => setStep(1)}>
                                    <Text style={styles.backButtonText}>Back</Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.flexButton, (!isStep2Valid || loading) && styles.disabledButton]}
                                    onPress={handleFinalSignup}
                                    disabled={!isStep2Valid || loading}
                                >
                                    <LinearGradient
                                        colors={isStep2Valid ? ['#FF6A00', '#FF8C42'] : ['#E5E7EB', '#E5E7EB']}
                                        style={styles.gradient}
                                    >
                                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.buttonText, !isStep2Valid && { color: '#9CA3AF' }]}>Submit Application</Text>}
                                    </LinearGradient>
                                </Pressable>
                            </View>
                        </View>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    scrollContent: { padding: 24 },
    mainTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 20, color: '#111827' },
    progressWrapper: { marginBottom: 30 },
    progressBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#FF6A00' },
    stepsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    stepLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
    activeLabel: { color: '#FF6A00' },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20, color: '#374151' },
    form: { gap: 16 },
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
    input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' },
    errorBorder: { borderColor: 'red' },
    errorText: { color: 'red', fontSize: 12, marginTop: -12, marginLeft: 5 },
    primaryButton: { borderRadius: 12, overflow: 'hidden', marginTop: 10 },
    disabledButton: { opacity: 0.7 },
    flexButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    gradient: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    buttonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    row: { flexDirection: 'row', gap: 12, marginTop: 10 },
    backButton: { flex: 0.4, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    backButtonText: { color: '#6B7280', fontWeight: '600' }
});