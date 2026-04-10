import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Mail, ArrowRight, Clock } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { COLORS } from '../../src/constants/theme';
import { authService } from '../../src/services/authService';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailVerification'>;

const RESEND_COOLDOWN = 60; // seconds

export default function EmailVerificationScreen({ navigation, route }: Props) {
  const { email, otpAlreadySent } = route.params;
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(otpAlreadySent ? 0 : RESEND_COOLDOWN);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Computed: button appears when cooldown reaches 0
  const canResend = resendCooldown <= 0;

  // Auto-send OTP on mount (only if not already sent during signup)
  useEffect(() => {
    if (!otpAlreadySent) {
      sendOTPOnMount();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (otpAlreadySent || resendCooldown <= 0) return;

    intervalRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const sendOTPOnMount = async () => {
    try {
      await authService.sendOTP(email);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send verification code');
    }
  };

  const handleContinue = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authService.verifyOTP(email, code);
      
      if (result) {
        // User is now authenticated - navigate to Terms
        navigation.navigate('Terms', { signupData: null });
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setLoading(true);
    setError(null);

    try {
      await authService.sendOTP(email);
      setResendCooldown(RESEND_COOLDOWN);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Header (Matching Signup Header but with Back button) */}
          <View style={[styles.header, { paddingTop: 20 }]}>
             <Pressable
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <ChevronLeft size={28} color="#7C2D12" />
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center', marginRight: 32 }}>
                 <Text style={styles.headerLabel}>Verify Email</Text>
              </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Content (Centered like Signup) */}
            <View style={styles.content}>
              <Text style={styles.title}>Verify your email</Text>
              <Text style={styles.subtitle}>
                {otpAlreadySent
                  ? 'We sent a 6-digit code to '
                  : 'We\'ll send a 6-digit code to '}
                <Text style={styles.emailText}>{email}</Text>
              </Text>

              <View style={styles.formContainer}>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#D97706" style={{ marginRight: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#9CA3AF"
                    value={code}
                    onChangeText={(text) => {
                      setCode(text);
                      if (error) setError(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                {error && (
                  <Text style={styles.errorText}>{error}</Text>
                )}

                <Pressable
                  style={[styles.continueButton, loading && styles.buttonDisabled]}
                  onPress={handleContinue}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={loading ? ['#9CA3AF', '#6B7280'] : ['#D97706', '#B45309']}
                    style={styles.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.continueButtonText}>Verify & Continue</Text>
                        <ArrowRight size={20} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>Didn't receive the code? </Text>
                  {canResend ? (
                    <Pressable onPress={handleResend} disabled={loading}>
                      <Text style={[styles.resendText, loading && styles.resendDisabled]}>
                        Resend Code
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.cooldownContainer}>
                      <Clock size={14} color="#9CA3AF" />
                      <Text style={styles.cooldownText}>
                        Resend in {formatTime(resendCooldown)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C2D12',
  },
  content: {
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#7C2D12',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  emailText: {
    fontWeight: '700',
    color: '#D97706',
  },
  formContainer: {
    width: '100%',
    marginTop: 40,
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
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },
  resendDisabled: {
    color: '#9CA3AF',
  },
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cooldownText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});
