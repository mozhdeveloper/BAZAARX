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
  Linking,
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
import { useLockoutStore } from '../src/stores/lockoutStore';
import { useEffect } from 'react';

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
  const [lockoutTimer, setLockoutTimer] = useState(0);

  const lockoutStore = useLockoutStore();

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

  const watchedEmail = watch('email');

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

  const handleLogin = async (formData: LoginFormData) => {
    const { email, password } = formData;
    const trimmedEmail = email.trim();

    const remaining = lockoutStore.getRemainingLockoutTime(trimmedEmail);
    if (remaining > 0) {
      setLockoutTimer(remaining);
      Alert.alert(
        'Too Many Attempts',
        `Please wait ${remaining} seconds before trying again.`
      );
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (error) {
        // Record failure for lockout
        lockoutStore.recordFailure(trimmedEmail);
        const newRemaining = lockoutStore.getRemainingLockoutTime(trimmedEmail);
        
        if (newRemaining > 0) {
          setLockoutTimer(newRemaining);
          Alert.alert('Login Error', `${error.message}\n\nYou are locked out for ${newRemaining} seconds.`);
        } else {
          Alert.alert('Login Error', error.message);
        }
        
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Record success to reset attempts
        lockoutStore.recordSuccess(trimmedEmail);
        
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
      console.log('[LoginScreen] Starting Google Sign-In with Supabase default redirect...');

      // Use Supabase's default callback URL (no custom redirect needed)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('[LoginScreen] OAuth URL generation error:', error);
        Alert.alert('Google Sign-In Error', error.message);
        setIsGoogleLoading(false);
        return;
      }

      if (!data?.url) {
        console.error('[LoginScreen] No OAuth URL returned from Supabase');
        Alert.alert('Error', 'Failed to initialize Google Sign-In. Check console logs.');
        setIsGoogleLoading(false);
        return;
      }

      console.log('[LoginScreen] OAuth URL obtained, opening browser...');

      // Open browser for user to authenticate with Google
      // Supabase handles the redirect to https://ijdpbfrcvdflzwytxncj.supabase.co/auth/v1/callback
      const result = await WebBrowser.openBrowserAsync(data.url);
      console.log('[LoginScreen] Browser result:', result.type);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('[LoginScreen] Google Sign-In canceled by user');
        setIsGoogleLoading(false);
        return;
      }

      // Browser closed - wait for auth state change event (token arrived via deep link)
      console.log('[LoginScreen] Browser closed. Waiting for session...');

      // Create a promise that resolves when auth state changes to SIGNED_IN
      const authStatePromise = new Promise<void>((resolve, reject) => {
        let timeout: ReturnType<typeof setTimeout>;
        let unsubscribe: (() => void) | null = null;

        timeout = setTimeout(() => {
          if (unsubscribe) unsubscribe();
          console.error('[LoginScreen] ⏱️ Auth state timeout: 30 seconds passed without SIGNED_IN event');
          reject(new Error('Auth state change timeout'));
        }, 30000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log(`[LoginScreen] onAuthStateChange event: ${event}`);
          console.log(`[LoginScreen]   Session user: ${session?.user?.email || 'none'}`);

          if (event === 'SIGNED_IN' && session?.user) {
            console.log('[LoginScreen] ✅ SIGNED_IN event received!');
            console.log('[LoginScreen] User:', session.user.email);
            clearTimeout(timeout);
            if (unsubscribe) unsubscribe();
            resolve();
          }
        });

        // Store the unsubscribe function
        unsubscribe = () => subscription.unsubscribe();
      });

      try {
        await authStatePromise;
        console.log('[LoginScreen] Auth success, checking onboarding status...');
        
        // Get the verified user ID from the newly established session
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;

        if (userId) {
          // POLICY ENFORCEMENT: Check for unauthorized Google linking
          const { data: identityData } = await supabase.auth.getUserIdentities();
          const identities = identityData?.identities || [];
          const emailIdentity = identities.find(id => id.provider === 'email');
          const googleIdentity = identities.find(id => id.provider === 'google');

          if (emailIdentity && googleIdentity) {
            const isExplicitlyLinked = !!sessionData.session?.user.user_metadata?.google_explicitly_linked;
            const linkAgeMs = Date.now() - new Date(googleIdentity.created_at || Date.now()).getTime();
            if (!isExplicitlyLinked && linkAgeMs < 300000) {
              console.log('[LoginScreen] 🛡️ Google Link Policy Blocked');
              await supabase.auth.unlinkIdentity(googleIdentity);
              await useAuthStore.getState().signOut();
              Alert.alert('Security Notice', 'This Google account is not yet linked to your BazaarX account. Please use your email and password instead, then link Google from your profile settings.');
              setIsGoogleLoading(false);
              return;
            }
          }

          const isComplete = await authService.isOnboardingComplete(userId);
          
          if (isComplete) {
            console.log('[LoginScreen] Onboarding complete. Navigating to Home.');
            navigation.replace('MainTabs', { screen: 'Home' });
          } else {
            console.log('[LoginScreen] Onboarding incomplete. Redirecting to Terms.');
            const signupData = { 
              email: sessionData.session?.user?.email || '',
              firstName: sessionData.session?.user?.user_metadata?.first_name || 
                        sessionData.session?.user?.user_metadata?.full_name?.split(' ')[0] || '',
              lastName: sessionData.session?.user?.user_metadata?.last_name || 
                       sessionData.session?.user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
              phone: sessionData.session?.user?.phone || '',
              user_type: 'buyer' as const
            };

            // Persist to store so CategoryPreference screen can find it
            useAuthStore.getState().setPendingSignup(signupData);

            navigation.replace('Terms', { signupData });
          }
        } else {
          // Fallback if session is somehow missing after SIGNED_IN event
          navigation.replace('MainTabs', { screen: 'Home' });
        }
      } catch (authError) {
        console.error('[LoginScreen] ❌ Auth state error:', authError);

        // Double-check if session exists despite error
        const { data: finalCheck } = await supabase.auth.getSession();
        if (finalCheck.session?.user) {
          console.log('[LoginScreen] ⚠️ Session EXISTS but event timeout. Navigating anyway...');
          const user = finalCheck.session.user;
          const userId = user.id;

          // POLICY ENFORCEMENT: Check for unauthorized Google linking
          const { data: identityData } = await supabase.auth.getUserIdentities();
          const identities = identityData?.identities || [];
          const emailIdentity = identities.find(id => id.provider === 'email');
          const googleIdentity = identities.find(id => id.provider === 'google');

          if (emailIdentity && googleIdentity) {
            const isExplicitlyLinked = !!user.user_metadata?.google_explicitly_linked;
            const linkAgeMs = Date.now() - new Date(googleIdentity.created_at || Date.now()).getTime();
            if (!isExplicitlyLinked && linkAgeMs < 300000) {
              console.log('[LoginScreen] 🛡️ Google Link Policy Blocked (Recovery)');
              await supabase.auth.unlinkIdentity(googleIdentity);
              await useAuthStore.getState().signOut();
              Alert.alert('Security Notice', 'This Google account is not yet linked. Please use email/password.');
              setIsGoogleLoading(false);
              return;
            }
          }

          const isComplete = await authService.isOnboardingComplete(userId);
          
          if (isComplete) {
            navigation.replace('MainTabs', { screen: 'Home' });
          } else {
            const signupData = { 
              email: finalCheck.session.user.email || '',
              firstName: finalCheck.session.user.user_metadata?.first_name || 
                        finalCheck.session.user.user_metadata?.full_name?.split(' ')[0] || '',
              lastName: finalCheck.session.user.user_metadata?.last_name || 
                       finalCheck.session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
              phone: finalCheck.session.user.phone || '',
              user_type: 'buyer' as const
            };
            useAuthStore.getState().setPendingSignup(signupData);
            navigation.replace('Terms', { signupData });
          }
          return;
        }

        Alert.alert(
          'Sign-In Incomplete',
          'We were unable to complete the sign-in process. Please try again.'
        );
        setIsGoogleLoading(false);
      }
    } catch (error) {
      console.error('[LoginScreen] Google Sign-In exception:', error);
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
              style={[styles.loginButton, (isLoading || !isValid || lockoutTimer > 0) && styles.loginButtonDisabled]}
              onPress={handleSubmit(handleLogin)}
              disabled={isLoading || !isValid || lockoutTimer > 0}
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
    fontWeight: '700',
    color: COLORS.primary,
  },
  lockoutContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
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
