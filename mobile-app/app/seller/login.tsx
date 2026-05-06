import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sellerLoginSchema, type LoginFormData } from '../../src/lib/schemas';
import { COLORS } from '../../src/constants/theme';
import { ChevronDown, ChevronUp, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/sellerStore';
import { useAuthStore as useGlobalAuthStore } from '../../src/stores/authStore';
import { useLockoutStore } from '../../src/stores/lockoutStore';
import { useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  const lockoutStore = useLockoutStore();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(sellerLoginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const watchedEmail = watch('email');
  const watchedPassword = watch('password');

  // Handle lockout countdown
  useEffect(() => {
    const remaining = lockoutStore.getRemainingLockoutTime(watchedEmail);
    if (remaining > 0) {
      setLockoutTimer(remaining);
    }
  }, [watchedEmail]);

  useEffect(() => {
    let interval: any;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const isButtonDisabled = loading || !watchedEmail || !watchedPassword || !isValid || lockoutTimer > 0;

  const selectTestAccount = (account: typeof TEST_SELLER_ACCOUNTS[0]) => {
    setValue('email', account.email, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true });
    setShowMoreOptions(false);
  };

  const handleLogin = async (formData: LoginFormData) => {
    const { email, password } = formData;

    const remaining = lockoutStore.getRemainingLockoutTime(email);
    if (remaining > 0) {
      setLockoutTimer(remaining);
      Alert.alert(
        'Too Many Attempts',
        `Please wait ${remaining} seconds before trying again.`
      );
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        // Record failure for lockout
        lockoutStore.recordFailure(email);
        const newRemaining = lockoutStore.getRemainingLockoutTime(email);
        if (newRemaining > 0) {
          setLockoutTimer(newRemaining);
          throw new Error(`${authError.message}\n\nToo many failed attempts. You are locked out for ${newRemaining} seconds.`);
        }
        throw authError;
      }

      if (authData.user) {
        // Record success to reset attempts
        lockoutStore.recordSuccess(email);

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

        // Sync with Global Auth Store to ensure root navigation respects the role
        useGlobalAuthStore.getState().addRole('seller');
        useGlobalAuthStore.getState().switchRole('seller');

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
    setValue('email', 'seller1@bazaarph.com');
    setValue('password', 'Test@123456');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logo}
              />
            </View>
            <Text style={[styles.title, { color: COLORS.textHeadline }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: COLORS.textMuted }]}>Sign in to manage your BazaarX Store</Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
                    <Mail size={18} color={errors.email ? COLORS.error : COLORS.gray400} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your store email"
                      placeholderTextColor={COLORS.gray400}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>
                )}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </Pressable>
              </View>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                    <Lock size={18} color={errors.password ? COLORS.error : COLORS.gray400} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor={COLORS.gray400}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={COLORS.gray400} />
                      ) : (
                        <Eye size={18} color={COLORS.gray400} />
                      )}
                    </Pressable>
                  </View>
                )}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
            </View>

            {lockoutTimer > 0 && (
              <View style={styles.lockoutContainer}>
                <Text style={styles.lockoutText}>
                  Temporarily locked due to too many failed attempts.
                </Text>
                <Text style={styles.lockoutTimer}>
                  Retry in {lockoutTimer}s
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.loginButton, isButtonDisabled && styles.loginButtonDisabled]}
              onPress={handleSubmit(handleLogin)}
              disabled={isButtonDisabled}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </View>

          {/* More Options Section (Demo Accounts) */}
          <View style={styles.moreOptionsContainer}>
            <Pressable
              style={styles.moreOptionsTrigger}
              onPress={() => setShowMoreOptions(!showMoreOptions)}
            >
              <Text style={styles.moreOptionsTitle}>More options</Text>
              {showMoreOptions ? (
                <ChevronUp size={18} color={COLORS.gray400} />
              ) : (
                <ChevronDown size={18} color={COLORS.gray400} />
              )}
            </Pressable>

            {showMoreOptions && (
              <View style={styles.moreOptionsContent}>
                <Text style={styles.demoTitle}>TEST SELLER ACCOUNTS</Text>
                {TEST_SELLER_ACCOUNTS.map((account, index) => (
                  <Pressable
                    key={index}
                    style={styles.testAccountCard}
                    onPress={() => selectTestAccount(account)}
                  >
                    <View style={styles.testAccountInfo}>
                      <Text style={styles.testAccountName}>{account.name}</Text>
                      <Text style={styles.testAccountEmail}>{account.email}</Text>
                    </View>
                    <View style={styles.testAccountBadge}>
                      <Text style={styles.testAccountBadgeText}>Demo</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>New to BazaarX? </Text>
            <Pressable onPress={() => navigation.navigate('SellerSignup')}>
              <Text style={styles.signupLink}>Create an account</Text>
            </Pressable>
          </View>

          <View style={styles.backToSection}>
            <Pressable onPress={() => navigation.navigate('SellerAuthChoice')}>
              <Text style={styles.backToText}>← Back to BazaarPH</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#FFFFFF' },
  scrollContent: { padding: 24, flexGrow: 1 },
  header: { marginBottom: 32, marginTop: 16, alignItems: 'center' },
  logoWrapper: {
    width: 64,
    height: 64,
    backgroundColor: '#D97706',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  logo: { width: 44, height: 44, borderRadius: 8 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center' },
  form: { marginBottom: 24 },
  inputContainer: { flexDirection: 'column', marginBottom: 20 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.gray400, marginBottom: 8 },
  forgotText: { fontSize: 13, color: COLORS.gray400, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  inputWrapperError: { borderColor: COLORS.error },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: COLORS.textHeadline, fontWeight: '500' },
  eyeIcon: { padding: 4 },
  errorText: { fontSize: 12, color: COLORS.error, marginTop: 4 },
  loginButton: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#D97706',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  loginButtonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  moreOptionsContainer: { marginBottom: 24 },
  moreOptionsTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  moreOptionsTitle: { fontSize: 14, color: COLORS.gray400, fontWeight: '600' },
  moreOptionsContent: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginTop: 8,
  },
  demoTitle: { fontSize: 11, fontWeight: '800', color: COLORS.gray400, letterSpacing: 1, marginBottom: 12 },
  testAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  testAccountInfo: { flex: 1 },
  testAccountName: { fontSize: 13, fontWeight: '700', color: COLORS.textHeadline },
  testAccountEmail: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  testAccountBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  testAccountBadgeText: { fontSize: 10, fontWeight: '700', color: '#D97706' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  footerText: { fontSize: 14, color: COLORS.textMuted },
  signupLink: { fontSize: 14, color: '#D97706', fontWeight: '700' },
  backToSection: { alignItems: 'center', paddingBottom: 24 },
  backToText: { fontSize: 14, color: COLORS.gray400, fontWeight: '600' },
  lockoutContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
  },
  lockoutText: {
    color: COLORS.error,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  lockoutTimer: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
});
