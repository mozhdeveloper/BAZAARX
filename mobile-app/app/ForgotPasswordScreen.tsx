import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { authService } from '../src/services/authService';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSendReset = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(trimmedEmail);
      Alert.alert(
        'Reset Link Sent',
        'Check your email for the password reset link. Open it on this device to continue.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send password reset email.');
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
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#7C2D12" />
          </Pressable>

          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your account email to receive a reset link.</Text>

          <View style={styles.inputWrapper}>
            <Mail size={18} color="#9CA3AF" />
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

          <Pressable style={styles.button} onPress={handleSendReset} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
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
    paddingTop: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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