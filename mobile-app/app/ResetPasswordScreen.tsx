import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { authService } from '../src/services/authService';
import { supabase } from '../src/lib/supabase';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ navigation }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (value: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (value.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[A-Z]/.test(value)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(value)) errors.push('Password must contain at least one lowercase letter');
    if (!/\d/.test(value)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*(),.?":{}|<>\-_[\]\\/`~+=;']/.test(value)) {
      errors.push('Password must contain at least one special character');
    }
    if (/\s/.test(value)) errors.push('Password must not contain spaces');

    return { valid: errors.length === 0, errors };
  };

  useEffect(() => {
    const applyRecoverySessionFromUrl = async (url: string) => {
      if (!url || !url.includes('reset-password')) return;

      const hashPart = url.split('#')[1] || '';
      const queryPart = url.split('?')[1]?.split('#')[0] || '';
      const params = new URLSearchParams(hashPart || queryPart);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    };

    const init = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        try {
          await applyRecoverySessionFromUrl(initialUrl);
        } catch {
          Alert.alert('Notice', 'Reset link session could not be prepared. Please open the reset link again.');
        }
      }
    };

    void init();

    const sub = Linking.addEventListener('url', (event) => {
      void applyRecoverySessionFromUrl(event.url);
    });

    return () => sub.remove();
  }, []);

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please complete all password fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      Alert.alert('Error', passwordValidation.errors[0] || 'Password does not meet minimum security requirements.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.updatePassword(password);
      Alert.alert('Success', 'Your password has been updated. Please sign in.', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update password. Please retry from your email link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>Choose a strong password for your account.</Text>

          <View style={styles.inputWrapper}>
            <Lock size={18} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowPassword((v) => !v)}>
              {showPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
            </Pressable>
          </View>

          <View style={[styles.inputWrapper, { marginTop: 12 }]}>
            <Lock size={18} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowConfirmPassword((v) => !v)}>
              {showConfirmPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
            </Pressable>
          </View>

          <Pressable style={styles.button} onPress={handleUpdatePassword} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Update Password</Text>}
          </Pressable>
        </View>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#7C2D12',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#78350F',
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#D97706',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});