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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingBag, Mail, Lock, Eye, EyeOff, ArrowRight, Store, Shield, ChevronDown, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { supabase } from '../src/lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

// Test accounts with conversations - All have password: Buyer123!
const TEST_ACCOUNTS = [
  { email: 'anna.cruz@gmail.com', password: 'Buyer123!', name: 'Anna Marie Cruz', note: '2 conversations' },
  { email: 'miguel.santos@gmail.com', password: 'Buyer123!', name: 'Miguel Antonio Santos', note: '3 conversations' },
  { email: 'sofia.reyes@gmail.com', password: 'Buyer123!', name: 'Sofia Gabrielle Reyes', note: '3 conversations' },
  { email: 'carlos.garcia@gmail.com', password: 'Buyer123!', name: 'Carlos Miguel Garcia', note: '3 conversations' },
  { email: 'isabella.fernandez@gmail.com', password: 'Buyer123!', name: 'Isabella Rose Fernandez', note: '3 conversations' },
  { email: 'rafael.mendoza@gmail.com', password: 'Buyer123!', name: 'Rafael Jose Mendoza', note: '2 conversations' },
  { email: 'gabriela.torres@gmail.com', password: 'Buyer123!', name: 'Gabriela Maria Torres', note: '3 conversations' },
  { email: 'daniel.villanueva@gmail.com', password: 'Buyer123!', name: 'Daniel James Villanueva', note: '2 conversations' },
];


export default function LoginScreen({ navigation }: Props) {
  // const login = useAuthStore((state) => state.login); // Deprecated
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTestAccounts, setShowTestAccounts] = useState(false);

  const selectTestAccount = (account: typeof TEST_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setShowTestAccounts(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      // 2. Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert('Login Error', error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // 3. Fetch the profile to check user_type (buyer/seller)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          Alert.alert('Profile Error', 'Could not fetch user profile.');
        } else {
          // Allow both buyers and sellers to login
          // SYNC USER TO GLOBAL STORE
          const { data: profileDetails } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileDetails) {
            useAuthStore.getState().setUser({
              id: data.user.id,
              name: profileDetails.full_name || 'BazaarX User',
              email: data.user.email || '',
              phone: profileDetails.phone || '',
              avatar: profileDetails.avatar_url || ''
            });

            // If user is a seller, we might want to ensure they have the role in the store
            if (profile.user_type === 'seller') {
              useAuthStore.getState().addRole('seller');
            }
          }

          navigation.replace('MainTabs', { screen: 'Home' });
        }
      }
    } catch (err) {
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
            <Text style={styles.brandName}>BazaarX</Text>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.subtitle}>Sign in to continue shopping</Text>
          </View>

          {/* Demo Credentials Banner */}
          <Pressable
            style={styles.demoBanner}
            onPress={() => setShowTestAccounts(true)}
          >
            <View style={styles.demoContent}>
              <Text style={styles.demoTitle}>🧪 Test Accounts</Text>
              <Text style={styles.demoText}>Tap to select a test account</Text>
              <View style={styles.demoHintRow}>
                <Text style={styles.demoHint}>All accounts have messages & data</Text>
                <ChevronDown size={16} color="#F97316" />
              </View>
            </View>
          </Pressable>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
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

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
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

            {/* Login Button */}
            <Pressable
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#FF6A00', '#FF8C42']}
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

      {/* Test Accounts Modal */}
      <Modal
        visible={showTestAccounts}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTestAccounts(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Test Account</Text>
              <Pressable onPress={() => setShowTestAccounts(false)}>
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView style={styles.accountsList}>
              {TEST_ACCOUNTS.map((account, index) => (
                <Pressable
                  key={index}
                  style={styles.accountItem}
                  onPress={() => selectTestAccount(account)}
                >
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountEmail}>{account.email}</Text>
                    <Text style={styles.accountDetails}>
                      � Password: {account.password} • {account.note}
                    </Text>
                  </View>
                  <ArrowRight size={20} color="#FF6A00" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#111827',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  demoBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  demoContent: {
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6A00',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 13,
    color: '#F97316',
    marginBottom: 4,
  },
  demoHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  demoHint: {
    fontSize: 12,
    color: '#FF6A00',
    fontWeight: '600',
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
  adminPortalButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  adminPortalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  accountsList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  accountDetails: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
