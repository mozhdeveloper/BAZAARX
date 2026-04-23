import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Linking,
  Dimensions,
  AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, ArrowRight, Clock, ExternalLink, CheckCircle2 } from 'lucide-react-native';
import { CardStyleInterpolators } from '@react-navigation/stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { COLORS } from '../../src/constants/theme';
import { authService } from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailVerification'>;

const RESEND_COOLDOWN = 60; // seconds

export default function EmailVerificationScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const intervalRef = useRef<any>(null);
  const pollingRef = useRef<any>(null);

  // Computed: button appears when cooldown reaches 0
  const canResend = resendCooldown <= 0;

  useEffect(() => {
    navigation.setOptions({
      animation: 'slide_from_right',
    });

    // Start polling on mount
    startPolling();

    return () => {
      stopPolling();
    };
  }, [navigation]);

  const startPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => {
      checkStatus(false);
    }, 3000); // Check every 3 seconds
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Countdown timer logic
  useEffect(() => {
    if (resendCooldown <= 0) return;

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
  }, [resendCooldown]);

  const checkStatus = async (isManual = false) => {
    // Prevent automatic polling when app is in the background
    if (!isManual && AppState.currentState !== 'active') {
      return;
    }

    if (isManual) setChecking(true);
    try {
      const isVerified = await authService.checkVerificationStatus(email);
      if (isVerified) {
        stopPolling(); // Stop polling immediately on success

        // Sync the session to the auth store so we have the user ID
        await useAuthStore.getState().checkSession();

        // Retrieve persistent signup data
        // Retrieve signup data from params or persistent store
        const signupData = route.params?.signupData || useAuthStore.getState().pendingSignupData;
        console.log('[EmailVerification] Navigating to next screen with signupData:', signupData ? 'Exists' : 'MISSING');

        // Check user type and navigate accordingly
        if (signupData?.user_type === 'seller') {
          navigation.replace('SellerFinalize');
        } else {
          // User is now authenticated and finished with onboarding - navigate to Home
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }
      } else if (isManual) {
        Alert.alert(
          'Not Verified Yet',
          'We couldn\'t verify your email confirmation yet. Please make sure you clicked the link in the email we sent you.',
          [
            { text: 'OK' },
            { text: 'Resend Link', onPress: handleResend }
          ]
        );
      }
    } catch (err: any) {
      if (isManual) {
        Alert.alert('Error', err.message || 'Verification check failed');
      }
    } finally {
      if (isManual) setChecking(false);
    }
  };

  const handleCheckStatus = () => checkStatus(true);

  const handleOpenEmail = async () => {
    try {
      await Linking.openURL('mailto:');
    } catch (err) {
      Alert.alert('Error', 'Could not open email app. Please open it manually.');
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setLoading(true);
    try {
      await authService.resendVerificationLink(email);
      setResendCooldown(RESEND_COOLDOWN);
      Alert.alert('Link Sent', 'A new verification link has been sent to your email');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend link');
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
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ArrowLeft size={20} color="#6B7280" />
            </Pressable>
            <Text style={styles.headerLabel}>Verify Email</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Illustration Placeholder/Icon */}
              <View style={styles.illustrationContainer}>
                <View
                  style={styles.iconCircle}
                >
                  <Mail size={56} color="#D97706" strokeWidth={1.5} />
                  <View style={styles.checkBadge}>
                    <CheckCircle2 size={24} color="#16A34A" />
                  </View>
                </View>
              </View>

              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We've sent a verification link to{' '}
                <Text style={styles.emailText}>{email}</Text>.
                Please click the link to confirm your account.
              </Text>

              <View style={styles.actionContainer}>
                <Pressable
                  style={[styles.primaryButton, checking && styles.buttonDisabled]}
                  onPress={handleCheckStatus}
                  disabled={checking}
                >
                  {checking ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>I've verified my email</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleOpenEmail}
                >
                  <Text style={styles.secondaryButtonText}>Open Email App</Text>
                  <ExternalLink size={18} color="#D97706" />
                </Pressable>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>Didn't receive the link? </Text>
                  {canResend ? (
                    <Pressable onPress={handleResend} disabled={loading}>
                      <Text style={[styles.resendText, loading && styles.resendDisabled]}>
                        Resend Link
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
    backgroundColor: COLORS.background || '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 0,
    marginTop: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  content: {
    paddingTop: 40,
    alignItems: 'center',
  },
  illustrationContainer: {
    marginBottom: 40,
    marginTop: 20,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
    position: 'relative',
    backgroundColor: '#FFFBF0',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  emailText: {
    fontWeight: '700',
    color: '#D97706',
  },
  actionContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#D97706',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D97706',
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cooldownText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
});
