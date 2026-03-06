import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, Clock } from 'lucide-react-native';
import { Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { COLORS } from '../src/constants/theme';
import { BuyerBottomNav } from '../src/components/BuyerBottomNav';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethods'>;

export default function PaymentMethodsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Payment Methods</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Coming Soon Body */}
      <View style={styles.body}>
        <View style={styles.iconWrapper}>
          <CreditCard size={52} color="#D97706" strokeWidth={1.5} />
        </View>

        <View style={styles.badge}>
          <Clock size={13} color="#D97706" strokeWidth={2.5} />
          <Text style={styles.badgeText}>Coming Soon</Text>
        </View>

        <Text style={styles.title}>Payment Methods</Text>
        <Text style={styles.subtitle}>
          Manage your saved cards and bank accounts for faster checkout. This feature is currently
          under development.
        </Text>

        <View style={styles.featureList}>
          {[
            'Save credit & debit cards',
            'Link bank accounts',
            'Set a default payment method',
            'Secure encrypted storage',
          ].map((item) => (
            <View key={item} style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <BuyerBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#D97706', letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 10, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  featureList: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 20,
    gap: 14,
  },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D97706' },
  featureText: { fontSize: 14, color: '#374151', fontWeight: '500' },
});
