import React, { useState } from 'react';
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
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { supabase } from '../src/lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

        if (!validateEmail(email)) {
            Alert.alert('Error', 'Invalid email address');
            return;
        }

        if (!validatePhone(phone)) {
            Alert.alert('Error', 'Invalid phone number');
            return;
        }

        setLoading(true);

        // 1. SIGNUP CALL
        // Note: With 'Confirm Email' OFF, this creates the user AND logs them in immediately
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone,
                    role: 'buyer', // This is what the trigger will read
                },
            },
        });

        setLoading(false);

        if (error) {
            Alert.alert('Signup Failed', error.message);
        } else if (data.user) {
            Alert.alert('Success', 'Welcome to BazaarX!');
            // Since they are auto-logged in, you can redirect them to the home screen
            // or back to login to ensure the store state updates correctly
            navigation.replace('Login');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <View style={styles.header}>
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
                            <View style={styles.inputWrapper}>
                                <Mail size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="juan@example.ph"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    onChangeText={(v) => setFormData({ ...formData, email: v })}
                                />
                            </View>
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
                            <LinearGradient colors={['#FF6A00', '#FF8C42']} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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
    container: { flex: 1, backgroundColor: '#FFF' },
    scrollContent: { padding: 24, flexGrow: 1 },
    header: { marginBottom: 32, alignItems: 'center', marginTop: 20 },
    title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#6B7280' },
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
    input: { flex: 1, marginLeft: 10, fontSize: 15, color: '#111827' },
    signupButton: { borderRadius: 12, overflow: 'hidden', marginTop: 10 },
    gradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    buttonText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});