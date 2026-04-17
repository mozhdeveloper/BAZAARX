import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../src/lib/schemas';
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
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Store,
  X,
  Beaker,
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { authService } from '../src/services/authService';
import { supabase } from '../src/lib/supabase';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const TEST_ACCOUNTS = [
  { emoji: '👩', label: 'Buyer 1 — Anna Cruz', email: 'buyer1@gmail.com', password: 'Test@123456' },
  { emoji: '👨', label: 'Buyer 2 — Juan Reyes', email: 'buyer2@gmail.com', password: 'Test@123456' },
  { emoji: '👩', label: 'Buyer 3 — Sofia Lim', email: 'buyer3@gmail.com', password: 'Test@123456' },
];

export default function LoginScreen({ navigation }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = async (formData: LoginFormData) => {
    const { email, password } = formData;
    const trimmedEmail = email.trim();

    setIsLoading(true);

    try {
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

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone')
          .eq('id', data.user.id)
          .single();

        const firstName = (profileData as any)?.first_name || '';
        const lastName = (profileData as any)?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'BazaarX User';
        const bazcoins = (buyerData as any)?.bazcoins ?? 0;

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

        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);

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

  const autofillCredentials = (selectedEmail: string, selectedPassword: string) => {
    setValue('email', selectedEmail, { shouldValidate: true });
    setValue('password', selectedPassword, { shouldValidate: true });
    setShowTestModal(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Create dynamic redirect URL for Expo Go vs Production
      const redirectUrl = AuthSession.makeRedirectUri({ path: 'auth/callback' });
      console.log('👉 Add THIS exactly to Custom Redirect URIs in Supabase:', redirectUrl);

      // Step 1: Get OAuth URL from Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        Alert.alert('Google Sign-In Error', error.message);
        setIsGoogleLoading(false);
        return;
      }

      if (!data?.url) {
        Alert.alert('Error', 'Failed to initialize Google Sign-In');
        setIsGoogleLoading(false);
        return;
      }

      // Step 2: Open browser for user to authenticate with Google
      // When user confirms, Supabase redirects to bazaarx://auth/callback
      // The OS will route this back to the app, and deep linking + onAuthStateChange
      // will automatically handle session setup and checkSession() call
      const result = await WebBrowser.openBrowserAsync(data.url);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('[LoginScreen] Google Sign-In canceled by user');
        setIsGoogleLoading(false);
        return;
      }

      // Step 3: Browser closed (either by redirect or user dismissal)
      // The deep link handler will have processed the OAuth redirect
      // and onAuthStateChange will have triggered checkSession()
      // Wait a moment for session to settle, then check if authenticated

      await new Promise(resolve => setTimeout(resolve, 800));

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        console.log('[LoginScreen] Google Sign-In successful, session established');

        // Session is established and auth store should be synced via onAuthStateChange
        // Now navigate to main app
        // Use replace to prevent going back to login
        navigation.replace('MainTabs', { screen: 'Home' });
      } else {
        Alert.alert(
          'Error',
          'Google Sign-In completed but session was not established. Please try again.'
        );
        setIsGoogleLoading(false);
      }
    } catch (error) {
      console.error('[LoginScreen] Google Sign-In error:', error);
      Alert.alert(
        'Google Sign-In Error',
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      );
      setIsGoogleLoading(false);
    }
  };

  React.useEffect(() => {
    navigation.setOptions({
      animation: 'slide_from_right',
    });
  }, [navigation]);

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
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue shopping</Text>
          </View>

          {/* Login Form */}
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
                      placeholder="Enter your email"
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
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
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

            <Pressable
              style={[styles.loginButton, (isLoading || !isValid) && styles.loginButtonDisabled]}
              onPress={handleSubmit(handleLogin)}
              disabled={isLoading || !isValid}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
          >
            {isGoogleLoading ? (
              <ActivityIndicator color={COLORS.gray500} />
            ) : (
              <>
                <Image
                  source={{ uri: 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </>
            )}
          </Pressable>

          {/* More Options Section */}
          <View style={styles.moreOptionsSection}>
            <Pressable
              style={styles.moreOptionsTrigger}
              onPress={() => setShowMoreOptions(!showMoreOptions)}
            >
              <Text style={styles.moreOptionsTriggerText}>More options</Text>
              {showMoreOptions ? (
                <ChevronUp size={16} color={COLORS.gray400} />
              ) : (
                <ChevronDown size={16} color={COLORS.gray400} />
              )}
            </Pressable>

            {showMoreOptions && (
              <View style={styles.moreOptionsContent}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    useAuthStore.getState().loginAsGuest();
                    navigation.replace('MainTabs', { screen: 'Home' });
                  }}
                >
                  <User size={18} color={COLORS.gray400} />
                  <Text style={styles.secondaryButtonText}>Continue as Guest</Text>
                </Pressable>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('SellerAuthChoice')}
                >
                  <Store size={18} color={COLORS.gray400} />
                  <Text style={styles.secondaryButtonText}>Start Selling</Text>
                </Pressable>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => setShowTestModal(true)}
                >
                  <Beaker size={18} color={COLORS.gray400} />
                  <Text style={styles.secondaryButtonText}>Load Demo Credentials</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.registerSection}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Demo Credentials Modal */}
      <Modal
        visible={showTestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Demo Account</Text>
              <Pressable onPress={() => setShowTestModal(false)} style={styles.modalCloseButton}>
                <X size={24} color="#111827" />
              </Pressable>
            </View>

            {TEST_ACCOUNTS.map((acc, index) => (
              <Pressable
                key={index}
                style={styles.testAccountRow}
                onPress={() => autofillCredentials(acc.email, acc.password)}
              >
                <View style={styles.testAccountAvatar}>
                  <Text style={styles.testAccountEmoji}>{acc.emoji}</Text>
                </View>
                <View style={styles.testAccountInfo}>
                  <Text style={styles.testAccountLabel}>{acc.label}</Text>
                  <Text style={styles.testAccountEmail}>{acc.email}</Text>
                </View>
                <View style={styles.testAccountBadge}>
                  <Text style={styles.testAccountBadgeText}>Auto-fill</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#FFFBF0',
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
    marginTop: 32,
    marginBottom: 24,
  },
  logoContainer: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textHeadline,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  form: {
    marginTop: 32,
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textHeadline,
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: COLORS.gray400,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  inputWrapperError: {
    borderColor: COLORS.error,
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray200,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray400,
    letterSpacing: 1.2,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textHeadline,
  },
  moreOptionsSection: {
    marginTop: 24,
  },
  moreOptionsTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  moreOptionsTriggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray400,
  },
  moreOptionsContent: {
    marginTop: 8,
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  registerText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  registerLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textHeadline,
  },
  modalCloseButton: {
    padding: 4,
  },
  testAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  testAccountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  testAccountEmoji: {
    fontSize: 20,
  },
  testAccountInfo: {
    flex: 1,
  },
  testAccountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textHeadline,
    marginBottom: 2,
  },
  testAccountEmail: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  testAccountBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  testAccountBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
