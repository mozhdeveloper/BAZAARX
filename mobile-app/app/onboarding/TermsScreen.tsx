import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckSquare, Square, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../src/constants/theme';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Terms'>;

export default function TermsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [agreed, setAgreed] = useState(false);

  const handleContinue = () => {
    if (agreed) {
      navigation.navigate('CategoryPreference', { signupData: route.params.signupData });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* STANDARD HEADER */}
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
         <View style={styles.headerTop}>
             <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                <ArrowLeft size={24} color={COLORS.textHeadline} />
             </Pressable>
             <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>Terms & Conditions</Text>
             <View style={{ width: 24 }} />
        </View>
        <Text style={[styles.headerSubtitle, { color: COLORS.textMuted }]}>Please review and accept our terms</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.text}>
          Welcome to BazaarX. By accessing or using our mobile application, you agree to be bound by these Terms and Conditions.
        </Text>

        <Text style={styles.sectionTitle}>2. Use of Service</Text>
        <Text style={styles.text}>
          You agree to use the service only for lawful purposes and in accordance with the full terms available on our website. You are responsible for maintaining the confidentiality of your account.
        </Text>

        <Text style={styles.sectionTitle}>3. Privacy Policy</Text>
        <Text style={styles.text}>
          Your privacy is important to us. Please review our Privacy Policy to understand how we collect and use your information.
        </Text>

        <Text style={styles.sectionTitle}>4. User Content</Text>
        <Text style={styles.text}>
          You retain ownership of any content you submit, but you grant BazaarX a license to use, reproduce, and display such content in connection with the service.
        </Text>
        
         <Text style={styles.sectionTitle}>5. Termination</Text>
        <Text style={styles.text}>
          We reserve the right to suspend or terminate your account if you violate these terms or engage in harmful conduct.
        </Text>
        
        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={styles.checkboxContainer} 
          onPress={() => setAgreed(!agreed)}
        >
          {agreed ? (
            <CheckSquare size={24} color="#FF6A00" />
          ) : (
            <Square size={24} color="#9CA3AF" />
          )}
          <Text style={styles.checkboxLabel}>
            I agree to the Terms and Conditions
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, !agreed && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!agreed}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
  },
  backButton: {
      padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 8,
  },
  spacer: {
    height: 40,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
