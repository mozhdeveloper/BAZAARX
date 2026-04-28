import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Switch, Alert, StatusBar, ActivityIndicator, Modal, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { ArrowLeft, Globe, DollarSign, Moon, Volume2, Download, RefreshCw, Trash2, ShieldCheck } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { processAuthSessionResultUrl } from '../src/utils/urlUtils';

WebBrowser.maybeCompleteAuthSession();

import { supabase } from '../src/lib/supabase';
import { COLORS } from '../src/constants/theme';
import { BuyerBottomNav } from '../src/components/BuyerBottomNav';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const resetOnboarding = useAuthStore((state) => state.resetOnboarding);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [showGoogleAlreadyLinkedModal, setShowGoogleAlreadyLinkedModal] = useState(false);
  const insets = useSafeAreaInsets();

  const { user } = useAuthStore();

  // Fetch link status
  React.useEffect(() => {
    const fetchLinkStatus = async () => {
      try {
        const { data: identityData } = await supabase.auth.getUserIdentities();
        if (identityData?.identities) {
          setIsGoogleLinked(identityData.identities.some(id => id.provider === 'google'));
        }
      } catch (error) {
        console.error('Error fetching link status:', error);
      }
    };
    fetchLinkStatus();
  }, []);

  const handleLinkGoogle = async () => {
    if (isGoogleLinked) {
      Alert.alert('Unlink Google', 'Are you sure you want to unlink your Google account?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLinkingGoogle(true);
              const { data } = await supabase.auth.getUserIdentities();
              const googleIdentity = data?.identities?.find(id => id.provider === 'google');
              if (googleIdentity) {
                const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
                if (error) throw error;
                
                await supabase.auth.updateUser({
                  data: { google_explicitly_linked: false }
                });

                setIsGoogleLinked(false);
                Alert.alert('Success', 'Google account unlinked.');
              }
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not unlink account.');
            } finally {
              setIsLinkingGoogle(false);
            }
          }
        }
      ]);
      return;
    }

    setIsLinkingGoogle(true);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ path: 'auth/callback' });
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        }
      });
      if (error) {
        const errorMsg = error.message?.toLowerCase() || '';
        const isAlreadyLinked =
          errorMsg.includes('already') ||
          errorMsg.includes('registered') ||
          errorMsg.includes('email_exists') ||
          errorMsg.includes('identity_already_exists') ||
          errorMsg.includes('is already linked');

        if (isAlreadyLinked) {
          setShowGoogleAlreadyLinkedModal(true);
          setIsLinkingGoogle(false);
          return;
        }
        throw error;
      }
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'cancel' || result.type === 'dismiss') {
          setIsLinkingGoogle(false);
          return;
        }

        if (result.type === 'success' && result.url) {
          await processAuthSessionResultUrl(result.url, supabase);
        }

        await new Promise(resolve => setTimeout(resolve, 800));
        const { data: identityData } = await supabase.auth.getUserIdentities();
        const linked = identityData?.identities?.some(id => id.provider === 'google') || false;
        setIsGoogleLinked(linked);
        if (linked) {
          await supabase.auth.updateUser({
            data: { google_explicitly_linked: true }
          });
          Alert.alert('Success', 'Google account linked!');
        }
      }
    } catch (e) {
      console.error('Google link error:', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const promptDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.\n\nUnder the Data Privacy Act (RA 10173), you have the right to erasure.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => promptDeletePassword(),
        },
      ],
    );
  };

  const promptDeletePassword = () => {
    Alert.prompt(
      'Confirm Password',
      'Enter your password to confirm account deletion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: (password: string | undefined) => { if (password) deleteAccount(password); },
        },
      ],
      'secure-text',
    );
  };

  const deleteAccount = async (password: string) => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { password, confirm: true },
      });
      if (error || data?.error) {
        const msg = data?.message || data?.error || error?.message || 'Failed to delete account';
        Alert.alert('Error', msg);
        return;
      }
      await supabase.auth.signOut();
      Alert.alert('Account Deleted', 'Your account has been permanently deleted.', [
        { text: 'OK', onPress: () => navigation.navigate('Onboarding') },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

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
        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingCard}>
            <Pressable style={[styles.settingItem, styles.borderBottom]} onPress={() => navigation.navigate('Addresses')}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
                  <Globe size={20} color="#6B7280" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Delivery Addresses</Text>
                  <Text style={styles.settingSubtitle}>Manage where your orders are sent</Text>
                </View>
              </View>
              <ArrowLeft size={18} color="#9CA3AF" style={{ transform: [{ rotate: '180deg' }] }} />
            </Pressable>

            <Pressable style={styles.settingItem} onPress={() => navigation.navigate('PaymentMethods')}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
                  <DollarSign size={20} color="#6B7280" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Payment Methods</Text>
                  <Text style={styles.settingSubtitle}>Your saved cards and wallets</Text>
                </View>
              </View>
              <ArrowLeft size={18} color="#9CA3AF" style={{ transform: [{ rotate: '180deg' }] }} />
            </Pressable>
          </View>
        </View>

        {/* Linked Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linked Accounts</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
                  <Image 
                    source={{ uri: 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png' }}
                    style={{ width: 20, height: 20 }}
                  />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Google</Text>
                  <Text style={styles.settingSubtitle}>
                    {isGoogleLinked ? 'Connected to Google' : 'Link your Google account'}
                  </Text>
                </View>
              </View>
              {isLinkingGoogle ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Switch
                  value={isGoogleLinked}
                  onValueChange={handleLinkGoogle}
                  trackColor={{ false: '#D1D5DB', true: COLORS.success }}
                  thumbColor="#FFFFFF"
                />
              )}
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
                trackColor={{ false: '#D1D5DB', true: '#FB8C00' }}
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
                trackColor={{ false: '#D1D5DB', true: '#FB8C00' }}
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
                trackColor={{ false: '#D1D5DB', true: '#FB8C00' }}
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

        {/* Account — Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Account</Text>

          <View style={[styles.settingCard, styles.dangerCard]}>
            <Pressable
              style={styles.settingItem}
              onPress={promptDeleteAccount}
              disabled={isDeleting}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Trash2 size={20} color="#EF4444" />
                  )}
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: '#EF4444' }]}>Delete Account</Text>
                  <Text style={styles.settingSubtitle}>
                    Permanently remove your account and all data
                  </Text>
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

      {/* Google Already Linked Modal */}
      <Modal
        visible={showGoogleAlreadyLinkedModal}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShowGoogleAlreadyLinkedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.googleAlreadyLinkedModalContent}>
            <View style={styles.googleModalIconContainer}>
              <View style={[styles.googleModalIcon, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.googleModalIconText}>⚠️</Text>
              </View>
            </View>

            <Text style={styles.googleModalTitle}>Google Account Already Linked</Text>

            <Text style={styles.googleModalMessage}>
              This Google account is already linked to another BazaarX account. Please try signing in with a different Google account.
            </Text>

            <View style={styles.googleModalButtonContainer}>
              <Pressable
                style={[styles.googleModalButton, styles.googleModalButtonCancel]}
                onPress={() => setShowGoogleAlreadyLinkedModal(false)}
              >
                <Text style={styles.googleModalButtonTextCancel}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.googleModalButton, styles.googleModalButtonRetry]}
                onPress={async () => {
                  setShowGoogleAlreadyLinkedModal(false);
                  await handleLinkGoogle();
                }}
                disabled={isLinkingGoogle}
              >
                {isLinkingGoogle ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.googleModalButtonText}>Try Another Account</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer Bottom Nav */}
      <BuyerBottomNav activeTab="Profile" />
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
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  versionText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  footerText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  copyrightText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleAlreadyLinkedModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    marginHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  googleModalIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  googleModalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleModalIconText: {
    fontSize: 36,
  },
  googleModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textHeadline,
    marginBottom: 12,
    textAlign: 'center',
  },
  googleModalMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  googleModalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  googleModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleModalButtonCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  googleModalButtonTextCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textHeadline,
  },
  googleModalButtonRetry: {
    backgroundColor: COLORS.primary,
  },
  googleModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
