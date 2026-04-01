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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap, CheckCircle2, ChevronDown, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/sellerStore';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Test seller accounts - All have password: Test@123456
const TEST_SELLER_ACCOUNTS = [
  { email: 'seller1@bazaarph.com', password: 'Test@123456', name: "Maria's Fashion Boutique 👗" },
  { email: 'seller2@bazaarph.com', password: 'Test@123456', name: 'TechHub Electronics 📱' },
  { email: 'seller3@bazaarph.com', password: 'Test@123456', name: 'Beauty Essentials PH 💄' },
];

export default function SellerLoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTestAccounts, setShowTestAccounts] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const selectTestAccount = (account: typeof TEST_SELLER_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setShowTestAccounts(false);
  };

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
        // Verify seller exists in sellers table
        const { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select('id, store_name, approval_status, avatar_url')
          .eq('id', authData.user.id)
          .single();

        if (sellerError || !sellerData) {
          await supabase.auth.signOut();
          Alert.alert('Access Denied', 'This account is not registered as a seller.');
          return;
        }

        // Get profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          Alert.alert('Profile Error', 'Could not retrieve user profile.');
          return;
        }

        // Sync with AuthStore (using new schema: first_name + last_name)
        const firstName = (profile as any)?.first_name || '';
        const lastName = (profile as any)?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || sellerData.store_name || 'BazaarX Seller';

        // FIXED: Use useAuthStore.getState() - the actual Zustand store for seller auth
        useAuthStore.getState().setUser({
          id: authData.user.id,
          name: fullName,
          email: authData.user.email || '',
          phone: (profile as any)?.phone || '',
          avatar: sellerData.avatar_url || (profile as any)?.avatar_url || ''
        });

        // Fetch verification documents from related table
        const { data: verificationDocs } = await supabase
          .from('seller_verification_documents')
          .select('business_permit_url, valid_id_url, proof_of_address_url, dti_registration_url, tax_id_url')
          .eq('seller_id', authData.user.id)
          .single();

        // Sync with AuthStore (seller info)
        useAuthStore.getState().updateSellerInfo({
          id: authData.user.id,
          store_name: sellerData.store_name,
          email: authData.user.email,
          approval_status: sellerData.approval_status as any,
          verification_documents: {
            business_permit_url: verificationDocs?.business_permit_url || '',
            valid_id_url: verificationDocs?.valid_id_url || '',
            proof_of_address_url: verificationDocs?.proof_of_address_url || '',
            dti_registration_url: verificationDocs?.dti_registration_url || '',
            tax_id_url: verificationDocs?.tax_id_url || '',
          },
        });

        // Set roles and switch to seller role
        useAuthStore.getState().addRole('seller');
        useAuthStore.getState().switchRole('seller');

        // Fetch seller orders from database (not buyer orders)
        const { useOrderStore } = await import('../../src/stores/orderStore');
        useOrderStore.getState().fetchSellerOrders(authData.user.id);

        // Fetch seller products from database
        const { useProductStore } = await import('../../src/stores/sellerStore');
        useProductStore.getState().fetchProducts({ sellerId: authData.user.id });

        navigation.replace('SellerStack');
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    // Use first test seller account credentials
    setEmail('seller1@bazaarph.com');
    setPassword('Test@123456');
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

        {/* Test Credentials Card */}
        <View style={styles.testCredsContainer}>
          <View style={styles.testCredsHeader}>
            <Text style={styles.testCredsTitle}>🧪 TEST SELLER ACCOUNTS</Text>
          </View>
          {TEST_SELLER_ACCOUNTS.map((account, index) => (
            <Pressable
              key={index}
              style={styles.testCredButton}
              onPress={() => selectTestAccount(account)}
            >
              <View style={styles.testCredAvatar}>
                <Text style={styles.testCredAvatarText}>{account.name.split(' ').pop()}</Text>
              </View>
              <View style={styles.testCredLeft}>
                <Text style={styles.testCredLabel}>{account.name.split(' ').slice(0, -1).join(' ')}</Text>
                <Text style={styles.testCredEmail}>{account.email}</Text>
              </View>
              <View style={styles.testCredPwBadge}>
                <Text style={styles.testCredPw}>Test@123456</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputWrapper, emailFocused && styles.inputFocused]}>
              <Mail size={20} color={emailFocused ? '#D97706' : '#9CA3AF'} />
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
              <Lock size={20} color={passwordFocused ? '#D97706' : '#9CA3AF'} />
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
              colors={['#D97706', '#B45309']}
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
    backgroundColor: '#D97706',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D97706',
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
  testCredsContainer: {
    marginHorizontal: 25,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  testCredsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  testCredsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.8,
  },
  testCredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  testCredAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  testCredAvatarText: {
    fontSize: 18,
  },
  testCredLeft: {
    flex: 1,
  },
  testCredLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  testCredEmail: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  testCredPwBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  testCredPw: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
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
    backgroundColor: '#FFF4EC',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  inputFocused: {
    borderColor: '#D97706',
    backgroundColor: '#FFFFFF',
    shadowColor: '#D97706',
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
    color: '#D97706',
    fontWeight: '700',
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#D97706',
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
    color: '#D97706',
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
