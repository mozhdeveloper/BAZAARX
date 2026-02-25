import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Switch, Alert, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Globe, DollarSign, Moon, Volume2, Download, RefreshCw } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { COLORS } from '../src/constants/theme';
import { BuyerBottomNav } from '../src/components/BuyerBottomNav';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const resetOnboarding = useAuthStore((state) => state.resetOnboarding);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);
  const insets = useSafeAreaInsets();

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset your onboarding status. You will see the onboarding screen on next launch.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            resetOnboarding();
            Alert.alert('Success', 'Onboarding status reset. Please restart the app.');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>Settings</Text>
            <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#EFF6FF' }]}>
                  <Globe size={20} color="#3B82F6" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Language</Text>
                  <Text style={styles.settingSubtitle}>English</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#DCFCE7' }]}>
                  <DollarSign size={20} color="#10B981" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Currency</Text>
                  <Text style={styles.settingSubtitle}>PHP (₱)</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Display Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
                  <Moon size={20} color="#6B7280" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Dark Mode</Text>
                  <Text style={styles.settingSubtitle}>Enable dark theme</Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#D1D5DB', true: '#FB8C00' }} // Warm Orange
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEF3E8' }]}>
                  <Volume2 size={20} color="#F59E0B" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Sound Effects</Text>
                  <Text style={styles.settingSubtitle}>Play sounds for actions</Text>
                </View>
              </View>
              <Switch
                value={soundEffects}
                onValueChange={setSoundEffects}
                trackColor={{ false: '#D1D5DB', true: '#FB8C00' }} // Warm Orange
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#EDE9FE' }]}>
                  <Download size={20} color="#8B5CF6" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Auto Download Images</Text>
                  <Text style={styles.settingSubtitle}>Download images over WiFi</Text>
                </View>
              </View>
              <Switch
                value={autoDownload}
                onValueChange={setAutoDownload}
                trackColor={{ false: '#D1D5DB', true: '#FB8C00' }} // Warm Orange
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Developer Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer Options</Text>
          
          <View style={styles.settingCard}>
            <Pressable 
              style={styles.settingItem}
              onPress={handleResetOnboarding}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                  <RefreshCw size={20} color="#EF4444" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Reset Onboarding</Text>
                  <Text style={styles.settingSubtitle}>Show onboarding screen again</Text>
                </View>
              </View>
            </Pressable>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>BazaarX Mobile</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.copyrightText}>© 2024 BazaarX. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BuyerBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textHeadline,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 70,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appInfoText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  versionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  copyrightText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
