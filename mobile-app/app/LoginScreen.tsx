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
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingBag, Mail, Lock, Eye, EyeOff, ArrowRight, Store } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { supabase } from '../src/lib/supabase';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;


export default function LoginScreen({ navigation }: Props) {
  // const login = useAuthStore((state) => state.login); // Deprecated
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const trimmedEmail = email.trim();
  const showEmailError = emailTouched && trimmedEmail.length > 0 && !validateEmail(trimmedEmail);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (error) {
        Alert.alert('Login Error', error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Verify buyer role exists
        const { data: buyerData, error: buyerError } = await supabase
          .from('buyers')
          .select('id, bazcoins, avatar_url')
          .eq('id', data.user.id)
          .single();

        if (buyerError || !buyerData) {
          Alert.alert('Access Denied', 'This account is not registered as a buyer.');
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        // Get profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone')
          .eq('id', data.user.id)
          .single();

        const firstName = (profileData as any)?.first_name || '';
        const lastName = (profileData as any)?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'BazaarX User';
        const bazcoins = (buyerData as any)?.bazcoins ?? 0;

        // Sync user to global store
        useAuthStore.getState().setUser({
          id: data.user.id,
          name: fullName,
          email: data.user.email || '',
          phone: (profileData as any)?.phone || '',
          avatar: (buyerData as any)?.avatar_url || 
                  (profileData as any)?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=FF6B35&color=fff`,
          bazcoins: bazcoins
        });

        // Update last login
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);

        // Fetch orders
        const { useOrderStore } = await import('../src/stores/orderStore');
        useOrderStore.getState().fetchOrders(data.user.id);

        navigation.replace('MainTabs', { screen: 'Home' });
      }
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('buyer@bazaarx.ph');
    setPassword('password');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.brandName, { color: COLORS.textHeadline }]}>BazaarX</Text>
            <Text style={[styles.welcomeText, { color: COLORS.textHeadline }]}>Welcome back!</Text>
            <Text style={[styles.subtitle, { color: COLORS.textMuted }]}>Sign in to continue shopping</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, showEmailError && styles.inputWrapperError]}>
                <Mail size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (!emailTouched && value.length > 0) {
                      setEmailTouched(true);
                    }
                  }}
                  onBlur={() => setEmailTouched(true)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
              {showEmailError ? (
                <Text style={styles.errorText}>Please enter a valid email address.</Text>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#EA580C" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Forgot Password */}
            <Pressable style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>

            {/* Test Credentials Panel 
            <View style={styles.testCredsContainer}>
              <View style={styles.testCredsHeader}>
                <Text style={styles.testCredsTitle}>🧪 Test Credentials — tap to fill</Text>
              </View>
              {[
                { emoji: '👩', label: 'Buyer 1 — Anna Cruz', email: 'buyer1@gmail.com', password: 'Test@123456' },
                { emoji: '👨', label: 'Buyer 2 — Juan Reyes', email: 'buyer2@gmail.com', password: 'Test@123456' },
                { emoji: '👩', label: 'Buyer 3 — Sofia Lim', email: 'buyer3@gmail.com', password: 'Test@123456' },
              ].map((cred) => (
                <Pressable
                  key={cred.email}
                  style={styles.testCredButton}
                  onPress={() => {
                    setEmail(cred.email);
                    setPassword(cred.password);
                  }}
                >
                  <View style={styles.testCredAvatar}>
                    <Text style={styles.testCredAvatarText}>{cred.emoji}</Text>
                  </View>
                  <View style={styles.testCredLeft}>
                    <Text style={styles.testCredLabel}>{cred.label}</Text>
                    <Text style={styles.testCredEmail}>{cred.email}</Text>
                  </View>
                  <View style={styles.testCredPwBadge}>
                    <Text style={styles.testCredPw}>Test@123456</Text>
                  </View>
                </Pressable>
              ))}
              <View style={styles.testCredsDivider} />
              <View style={styles.testCredsPortalRow}>
                <Pressable
                  style={[styles.testCredsPortalBtn, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}
                  onPress={() => navigation.navigate('SellerAuthChoice')}
                >
                  <Store size={14} color="#D97706" />
                  <Text style={[styles.testCredsPortalText, { color: '#92400E' }]}>Seller Portal</Text>
                </Pressable>
                <Pressable
                  style={[styles.testCredsPortalBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                  onPress={() => navigation.navigate('AdminStack')}
                >
                  <Text style={[styles.testCredsPortalText, { color: '#1E40AF' }]}>🛡️ Admin Portal</Text>
                </Pressable>
              </View>
            </View>
            */}

            {/* Login Button */}
            <Pressable
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#D97706', '#B45309']} // Amber Gradient
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <ArrowRight size={20} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Register Link */}
          <View style={styles.registerSection}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </Pressable>
          </View>

          {/* Guest Access */}
          <Pressable
            style={styles.guestButton}
            onPress={() => {
              useAuthStore.getState().loginAsGuest();
              navigation.replace('MainTabs', { screen: 'Home' });
            }}
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </Pressable>

          {/* Seller Portal Link */}
          <Pressable
            style={styles.sellerPortalButton}
            onPress={() => navigation.navigate('SellerAuthChoice')}
          >
            <Store size={20} color="#FF5722" strokeWidth={2.5} />
            <Text style={styles.sellerPortalText}>Start Selling</Text>
            <ArrowRight size={18} color="#FF5722" />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textHeadline, // Warm Brown
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textHeadline, // Warm Brown
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperError: {
    borderColor: '#DC2626',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#FF6A00',
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  registerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  registerLink: {
    fontSize: 14,
    color: '#FF6A00',
    fontWeight: '700',
  },
  guestButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  sellerPortalButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF5F0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF5722',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sellerPortalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF5722',
  },
  // ── Test Credentials Panel ──────────────────────────────────────────
  testCredsContainer: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  testCredsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  testCredsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  testCredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
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
    fontSize: 16,
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
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  testCredPw: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  testCredsDivider: {
    height: 1,
    backgroundColor: '#FDE68A',
    marginVertical: 10,
  },
  testCredsPortalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  testCredsPortalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  testCredsPortalText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
