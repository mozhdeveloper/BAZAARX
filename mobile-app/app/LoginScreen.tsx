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
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Store, X, Beaker } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { supabase } from '../src/lib/supabase';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const TEST_ACCOUNTS = [
  { emoji: '👩', label: 'Buyer 1 — Anna Cruz', email: 'buyer1@gmail.com', password: 'Test@123456' },
  { emoji: '👨', label: 'Buyer 2 — Juan Reyes', email: 'buyer2@gmail.com', password: 'Test@123456' },
  { emoji: '👩', label: 'Buyer 3 — Sofia Lim', email: 'buyer3@gmail.com', password: 'Test@123456' },
];

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const trimmedEmail = email.trim();

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
    setEmail(selectedEmail);
    setPassword(selectedPassword);
    setShowTestModal(false);
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

          {/* Developer Tool: Test Accounts Trigger */}
          <Pressable 
            style={styles.demoTriggerButton}
            onPress={() => setShowTestModal(true)}
          >
            <Beaker size={16} color="#6B7280" />
            <Text style={styles.demoTriggerText}>Load Demo Credentials</Text>
          </Pressable>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#FF6A00" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#FF6A00" style={styles.inputIcon} />
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

            <Pressable style={styles.forgotPassword} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>

            <Pressable
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#FF6A00', '#E65F00']}
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

          {/* Footer Actions */}
          <View style={styles.registerSection}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.guestButton}
            onPress={() => {
              useAuthStore.getState().loginAsGuest();
              navigation.replace('MainTabs', { screen: 'Home' });
            }}
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </Pressable>

          <Pressable
            style={styles.sellerPortalButton}
            onPress={() => navigation.navigate('SellerAuthChoice')}
          >
            <Store size={20} color="#FF6A00" strokeWidth={2.5} />
            <Text style={styles.sellerPortalText}>Start Selling</Text>
            <ArrowRight size={18} color="#FF6A00" />
          </Pressable>

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
    backgroundColor: COLORS.background || '#F9FAFB',
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
    marginBottom: 20,
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
    color: '#111827',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#FF6A00',
    fontWeight: '700',
  },
  loginButton: {
    borderRadius: 28, // Updated to Pill Shape per guidelines
    overflow: 'hidden',
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  sellerPortalButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF5F0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#FF6A00',
  },
  sellerPortalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6A00',
  },
  
  // ── Demo Trigger ──────────────────────────────────────────
  demoTriggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
  },
  demoTriggerText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // ── Modal Styles ──────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Per guidelines
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, // Per guidelines
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
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  testAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  testAccountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F0',
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
    color: '#111827',
    marginBottom: 2,
  },
  testAccountEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  testAccountBadge: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testAccountBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6A00',
  },
});