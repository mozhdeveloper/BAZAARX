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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Zap, CheckCircle, ArrowRight } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerLogin'>;

export default function SellerLoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = () => {
    if (email === 'seller@bazaarx.ph' && password === 'seller123') {
      navigation.replace('SellerStack');
    } else if (email === 'buyer@bazaarx.ph' && password === 'password') {
      Alert.alert('Wrong Portal', 'These are buyer credentials. Please use seller credentials.');
    } else {
      Alert.alert('Login Failed', 'Invalid credentials. Use demo credentials below.');
    }
  };

  const fillCredentials = (type: 'buyer' | 'seller') => {
    if (type === 'buyer') {
      setEmail('buyer@bazaarx.ph');
      setPassword('password');
    } else {
      setEmail('seller@bazaarx.ph');
      setPassword('seller123');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Logo Section */}
        <View style={styles.logoSection}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>Seller Centre</Text>
          <Text style={styles.subtitle}>Manage your store & inventory</Text>
        </View>

        {/* Premium Login Form */}
        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View
              style={[
                styles.inputWrapper,
                emailFocused && styles.inputWrapperFocused,
              ]}
            >
              <Mail
                size={20}
                color={emailFocused ? '#FF5722' : '#9CA3AF'}
                strokeWidth={2}
              />
              <TextInput
                style={styles.input}
                placeholder="seller@bazaarx.ph"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                passwordFocused && styles.inputWrapperFocused,
              ]}
            >
              <Lock
                size={20}
                color={passwordFocused ? '#FF5722' : '#9CA3AF'}
                strokeWidth={2}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Premium Login Button */}
          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
            ]}
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </Pressable>

          {/* Forgot Password */}
          <Pressable style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </Pressable>
        </View>

        {/* Developer/Demo Access Section */}
        <View style={styles.demoSection}>
          <View style={styles.demoHeader}>
            <Zap size={18} color="#FF5722" strokeWidth={2.5} />
            <Text style={styles.demoTitle}>Developer / Demo Access</Text>
          </View>

          {/* Buyer Credentials Row */}
          <Pressable
            style={styles.demoRow}
            onPress={() => fillCredentials('buyer')}
          >
            <View style={styles.demoInfo}>
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>BUYER</Text>
              </View>
              <View style={styles.demoCredentials}>
                <Text style={styles.demoEmail}>buyer@bazaarx.ph</Text>
                <Text style={styles.demoPassword}>password</Text>
              </View>
            </View>
            <View style={styles.tapToFillButton}>
              <Text style={styles.tapToFillText}>Tap to Fill</Text>
            </View>
          </Pressable>

          {/* Seller Credentials Row */}
          <Pressable
            style={styles.demoRow}
            onPress={() => fillCredentials('seller')}
          >
            <View style={styles.demoInfo}>
              <View style={[styles.demoBadge, styles.demoBadgeSeller]}>
                <Text style={styles.demoBadgeTextSeller}>SELLER</Text>
              </View>
              <View style={styles.demoCredentials}>
                <Text style={styles.demoEmail}>seller@bazaarx.ph</Text>
                <Text style={styles.demoPassword}>seller123</Text>
              </View>
            </View>
            <View style={[styles.tapToFillButton, styles.tapToFillButtonSeller]}>
              <Text style={[styles.tapToFillText, styles.tapToFillTextSeller]}>
                Tap to Fill
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
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
    paddingHorizontal: 24,
  },
  // Premium Logo Section
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 48,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
    borderRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Premium Form
  formContainer: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: '#FF5722',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#FF5722',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.2,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotPasswordText: {
    fontSize: 15,
    color: '#FF5722',
    fontWeight: '700',
  },
  // Developer/Demo Access Section
  demoSection: {
    backgroundColor: '#FFF5F0',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FF5722',
    borderStyle: 'dashed',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE4D6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  demoInfo: {
    flex: 1,
    gap: 8,
  },
  demoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 0.5,
  },
  demoBadgeSeller: {
    backgroundColor: '#FF5722',
  },
  demoBadgeTextSeller: {
    color: '#FFFFFF',
  },
  demoCredentials: {
    gap: 2,
  },
  demoEmail: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  demoPassword: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  tapToFillButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tapToFillButtonSeller: {
    backgroundColor: '#FF5722',
  },
  tapToFillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  tapToFillTextSeller: {
    color: '#FFFFFF',
  },
  // Success Screen
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#FFF5F0',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#FF5722',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginTop: 16,
  },
  enterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FF5722',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    width: '100%',
  },
  enterButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16,
  },
});
