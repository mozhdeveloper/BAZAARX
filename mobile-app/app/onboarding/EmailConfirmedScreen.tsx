import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { COLORS } from '../../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailConfirmed'>;

export default function EmailConfirmedScreen({ navigation }: Props) {
  const handleGoToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.content}>
          <View style={styles.illustrationContainer}>
            <LinearGradient
              colors={['#FFFBF0', '#FDE68A']}
              style={styles.iconCircle}
            >
              <CheckCircle2 size={70} color="#D97706" strokeWidth={1.5} />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.subtitle}>
            Your email address has been successfully confirmed. Your account is now active and ready to use.
          </Text>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionText}>
              Please sign in with your credentials to start exploring the marketplace.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable
              style={styles.primaryButton}
              onPress={handleGoToLogin}
            >
              <Text style={styles.buttonText}>Go to Login</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#F9FAFB',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  illustrationContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    width: '100%',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  instructionText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#D97706',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
