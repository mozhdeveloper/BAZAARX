import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap, CheckCircle2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../src/lib/supabase';
import { useSellerStore } from '../../src/stores/sellerStore';
import { useAuthStore } from '../../src/stores/authStore';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function SellerLoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          Alert.alert('Profile Error', 'Could not retrieve user profile.');
          return;
        }

        if (profile.user_type !== 'seller') {
          await supabase.auth.signOut();
          Alert.alert('Access Denied', 'This account is not a registered seller.');
          return;
        }

        const { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select('store_name, approval_status, business_permit_url, valid_id_url, proof_of_address_url, dti_registration_url, tax_id_url')
          .eq('id', authData.user.id)
          .single();

        if (sellerError || !sellerData) {
          Alert.alert('Error', 'Seller record not found.');
        } else {
          useSellerStore.getState().updateSellerInfo({
            storeName: sellerData.store_name,
            email: authData.user.email,
            approval_status: sellerData.approval_status,
            business_permit_url: sellerData.business_permit_url,
            valid_id_url: sellerData.valid_id_url,
            proof_of_address_url: sellerData.proof_of_address_url,
            dti_registration_url: sellerData.dti_registration_url,
            tax_id_url: sellerData.tax_id_url,
          });
          
          // Sync with AuthStore
          useAuthStore.getState().addRole('seller');
          useAuthStore.getState().switchRole('seller');
        }

        navigation.replace('SellerStack');
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('seller@bazaarph.com');
    setPassword('password');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Top Section with Logo */}
        <View style={styles.topSection}>
          <LinearGradient
            colors={['#FFF', '#FFF9F1']}
            style={styles.backgroundGradient}
          />
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
            />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to manage your BazaarX Store.</Text>
        </View>

        {/* Demo Access Card */}
        <Pressable style={styles.demoCard} onPress={fillDemoCredentials}>
          <View style={styles.demoInfo}>
            <View style={styles.demoTag}>
              <Text style={styles.demoTagText}>QUICK ACCESS</Text>
            </View>
            <Text style={styles.demoLabel}>Demo Seller Account</Text>
          </View>
          <View style={styles.demoButton}>
            <Text style={styles.demoButtonText}>Auto-Fill</Text>
          </View>
        </Pressable>

        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputWrapper, emailFocused && styles.inputFocused]}>
              <Mail size={20} color={emailFocused ? '#FF6A00' : '#9CA3AF'} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                // onFocus={() => setEmailFocused(true)}
                // onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrapper, passwordFocused && styles.inputFocused]}>
              <Lock size={20} color={passwordFocused ? '#FF6A00' : '#9CA3AF'} />
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                value={password}
                onChangeText={setPassword}
                // onFocus={() => setPasswordFocused(true)}
                // onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} color="#9CA3AF" /> : <Eye size={20} color="#9CA3AF" />}
              </Pressable>
            </View>
          </View>

          <View style={styles.optionsRow}>
            <Pressable style={styles.checkboxContainer}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>Remember me</Text>
            </Pressable>
            <Pressable>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={['#FF6A00', '#FF8C42']}
              style={styles.loginGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.loginContent}>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                  <ArrowRight size={20} color="#FFF" />
                </View>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to BazaarX? </Text>
          <Pressable onPress={() => navigation.navigate('SellerSignup')}>
            <Text style={styles.signupLink}>Create an account</Text>
          </Pressable>
        </View>

        <View style={styles.backToHome}>
          <Pressable onPress={() => navigation.navigate('SellerAuthChoice')}>
            <Text style={styles.backLink}>← Back to BazaarPH</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  topSection: {
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    backgroundColor: '#FF6A00',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    marginBottom: 25,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  demoCard: {
    marginHorizontal: 25,
    backgroundColor: '#FFF5F0',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FFE4D6',
    marginBottom: 30,
  },
  demoInfo: {
    flex: 1,
  },
  demoTag: {
    backgroundColor: '#FFE4D6',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  demoTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6A00',
    letterSpacing: 1,
  },
  demoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  demoButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE4D6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  demoButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6A00',
  },
  form: {
    paddingHorizontal: 25,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  inputFocused: {
    borderColor: '#FF6A00',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 25,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 14,
    color: '#FF6A00',
    fontWeight: '700',
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  loginGradient: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 35,
  },
  footerText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  signupLink: {
    fontSize: 15,
    color: '#FF6A00',
    fontWeight: '700',
  },
  backToHome: {
    alignItems: 'center',
    marginTop: 25,
  },
  backLink: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '700',
  },
});
