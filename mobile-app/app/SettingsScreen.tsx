import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Switch, Alert, StatusBar, ActivityIndicator, Modal, Image, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { ArrowLeft, Globe, DollarSign, Moon, Volume2, Download, RefreshCw, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { processAuthSessionResultUrl } from '../src/utils/urlUtils';
import { authService } from '../src/services/authService';

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
  const [isPureGoogleUser, setIsPureGoogleUser] = useState(false);
  const [showLinkConfirmModal, setShowLinkConfirmModal] = useState(false);

  // Delete-account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteCountdown, setDeleteCountdown] = useState(10);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const countdownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const insets = useSafeAreaInsets();

  const { user, hasCompletedOnboarding } = useAuthStore();

  // Fetch link status + detect pure-Google user (Rule 1)
  React.useEffect(() => {
    const fetchLinkStatus = async () => {
      try {
        const { data: identityData } = await supabase.auth.getUserIdentities();
        if (identityData?.identities) {
          const identities = identityData.identities;
          const hasGoogle = identities.some(id => id.provider === 'google');
          const hasEmail = identities.some(id => id.provider === 'email');
          setIsGoogleLinked(hasGoogle);
          // Pure Google user = signed up via Google with no email/password identity
          setIsPureGoogleUser(hasGoogle && !hasEmail);
        }
      } catch (error) {
        console.error('Error fetching link status:', error);
      }
    };
    fetchLinkStatus();
  }, []);

  // Called when user taps the Google toggle
  const handleGoogleToggle = () => {
    if (isGoogleLinked) {
      // UNLINK flow
      if (isPureGoogleUser) {
        // Rule 1: Block unlink for pure-Google users
        Alert.alert(
          'Cannot Unlink',
          'Your account was created with Google Sign-In. Google is your only sign-in method — unlinking it would lock you out of your account.\n\nTo unlink, first set an email and password from your profile settings.'
        );
        return;
      }
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
    } else {
      // LINK flow — show pre-link confirmation modal first
      setShowLinkConfirmModal(true);
    }
  };

  // Actual linking logic, called after user confirms via modal
  const proceedWithGoogleLink = async () => {
    setShowLinkConfirmModal(false);
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
        const googleIdentity = identityData?.identities?.find(id => id.provider === 'google');
        const linked = !!googleIdentity;

        if (linked && googleIdentity) {
          const googleEmail = (googleIdentity.identity_data as any)?.email?.toLowerCase();
          const userEmail = user?.email?.toLowerCase();

          // Rule 2: Block if Google email doesn't match signed-in email
          if (googleEmail && userEmail && googleEmail !== userEmail) {
            console.log('[SettingsScreen] 🛡️ Email mismatch — rolling back link');
            await supabase.auth.unlinkIdentity(googleIdentity);
            setIsGoogleLinked(false);
            Alert.alert(
              'Email Mismatch',
              `The Google account email (${googleEmail}) does not match your BazaarX account email (${userEmail}).\n\nYou can only link a Google account that uses the same email address.`
            );
            return;
          }

          // Rule 3: Block if Google email already belongs to a different registered user
          if (googleEmail) {
            const emailExists = await authService.checkEmailExists(googleEmail);
            const isSameUser = googleEmail === userEmail;
            if (emailExists && !isSameUser) {
              console.log('[SettingsScreen] 🛡️ Email already registered — rolling back link');
              await supabase.auth.unlinkIdentity(googleIdentity);
              setIsGoogleLinked(false);
              Alert.alert(
                'Account Already Exists',
                'This Google account is already associated with another BazaarX account. Please use a different Google account.'
              );
              return;
            }
          }

          // All checks passed — confirm the link
          setIsGoogleLinked(true);
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

  const openDeleteModal = () => {
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteCountdown(10);
    setDeleteError(null);
    setShowDeleteModal(true);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setDeleteCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const closeDeleteModal = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteCountdown(10);
    setDeleteError(null);
  };

  const deleteAccount = async () => {
    if (!deletePassword.trim()) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { password: deletePassword, confirm: true },
      });
      if (error || data?.error) {
        const msg = data?.message || data?.error || error?.message || 'Failed to delete account';
        setDeleteError(msg);
        return;
      }
      await supabase.auth.signOut();
      closeDeleteModal();
      Alert.alert('Account Deleted', 'Your account has been permanently deleted.', [
        { text: 'OK', onPress: () => navigation.navigate('Onboarding') },
      ]);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will clear your selected interests. You can complete the onboarding again directly from here.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetOnboarding();
            Alert.alert('Success', 'Onboarding status reset successfully.');
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
                    {isPureGoogleUser
                      ? 'Primary sign-in method — cannot unlink'
                      : isGoogleLinked
                        ? 'Connected to Google'
                        : 'Link your Google account'}
                  </Text>
                </View>
              </View>
              {isLinkingGoogle ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <View style={isPureGoogleUser && isGoogleLinked ? { opacity: 0.4 } : undefined}>
                  <Switch
                    value={isGoogleLinked}
                    onValueChange={handleGoogleToggle}
                    trackColor={{ false: '#D1D5DB', true: COLORS.success }}
                    thumbColor="#FFFFFF"
                    disabled={isPureGoogleUser && isGoogleLinked}
                  />
                </View>
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
              onPress={() => {
                if (hasCompletedOnboarding) {
                  handleResetOnboarding();
                } else {
                  navigation.navigate('CategoryPreference', { signupData: undefined });
                }
              }}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: hasCompletedOnboarding ? '#F3F4F6' : '#FEF3E8' }]}>
                  <RefreshCw size={20} color={hasCompletedOnboarding ? "#9CA3AF" : "#F59E0B"} />
                </View>
                <View style={styles.settingTextContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.settingTitle, { color: COLORS.textHeadline }]}>
                      {hasCompletedOnboarding ? 'Reset Onboarding' : 'Complete Onboarding'}
                    </Text>
                  </View>
                  <Text style={[styles.settingSubtitle, { color: COLORS.textMuted }]}>
                    {hasCompletedOnboarding ? 'Show onboarding screen again' : 'Select your interests to personalize your experience'}
                  </Text>
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
              onPress={openDeleteModal}
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

      {/* ── Pre-Link Confirmation Modal ── */}
      <Modal
        visible={showLinkConfirmModal}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShowLinkConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.googleAlreadyLinkedModalContent}>
            <View style={styles.googleModalIconContainer}>
              <View style={[styles.googleModalIcon, { backgroundColor: '#DBEAFE' }]}>
                <ShieldCheck size={36} color="#2563EB" strokeWidth={2} />
              </View>
            </View>

            <Text style={styles.googleModalTitle}>Link Google Account</Text>

            <Text style={styles.googleModalMessage}>
              You can only link a Google account that uses the same email as your current BazaarX account:
            </Text>

            <View style={styles.linkConfirmEmailBadge}>
              <Text style={styles.linkConfirmEmailText}>{user?.email || 'N/A'}</Text>
            </View>

            <Text style={[styles.googleModalMessage, { marginTop: 12, color: COLORS.textMuted, fontSize: 13 }]}>
              If your Google account uses a different email, the linking will be blocked.
            </Text>

            <View style={styles.googleModalButtonContainer}>
              <Pressable
                style={[styles.googleModalButton, styles.googleModalButtonCancel]}
                onPress={() => setShowLinkConfirmModal(false)}
              >
                <Text style={styles.googleModalButtonTextCancel}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.googleModalButton, styles.googleModalButtonRetry]}
                onPress={proceedWithGoogleLink}
              >
                <Text style={styles.googleModalButtonText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
              This Google account is already linked to another account. Please try a different Google account.
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
                  await proceedWithGoogleLink();
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

      {/* ── Delete Account Confirmation Modal ── */}
      <Modal
        visible={showDeleteModal}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            {/* Icon */}
            <View style={styles.deleteModalIconWrap}>
              <Trash2 size={32} color="#EF4444" strokeWidth={2} />
            </View>

            {/* Title */}
            <Text style={styles.deleteModalTitle}>Delete Account?</Text>

            {/* Warning body */}
            <Text style={styles.deleteModalBody}>
              This will{' '}
              <Text style={{ fontWeight: '800', color: '#EF4444' }}>permanently</Text>{' '}
              delete your account and ALL associated data. This action{' '}
              <Text style={{ fontWeight: '800' }}>cannot be undone</Text>.
            </Text>

            <Text style={styles.deleteModalLegal}>
              Under the Data Privacy Act (RA 10173) you have the right to erasure.
            </Text>

            {/* Error Message */}
            {deleteError && (
              <View style={styles.deleteErrorContainer}>
                <AlertTriangle size={16} color="#EF4444" style={styles.deleteErrorIcon} />
                <Text style={styles.deleteErrorText}>{deleteError}</Text>
              </View>
            )}

            {/* Countdown badge */}
            {deleteCountdown > 0 ? (
              <View style={styles.deleteCountdownBadge}>
                <Text style={styles.deleteCountdownLabel}>Please wait</Text>
                <Text style={styles.deleteCountdownNumber}>{deleteCountdown}s</Text>
              </View>
            ) : (
              <>
                {/* Password field — shown only after countdown */}
                <View style={styles.deletePasswordWrap}>
                  <TextInput
                    style={styles.deletePasswordInput}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showDeletePassword}
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    onPress={() => setShowDeletePassword(v => !v)}
                    style={styles.deletePasswordToggle}
                  >
                    <Text style={styles.deletePasswordToggleText}>
                      {showDeletePassword ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* Actions */}
            <View style={styles.deleteModalActions}>
              <Pressable
                style={styles.deleteCancelButton}
                onPress={closeDeleteModal}
                disabled={isDeleting}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.deleteConfirmButton,
                  (deleteCountdown > 0 || !deletePassword.trim() || isDeleting) && styles.deleteConfirmButtonDisabled,
                ]}
                onPress={deleteAccount}
                disabled={deleteCountdown > 0 || !deletePassword.trim() || isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.deleteConfirmText}>
                    {deleteCountdown > 0 ? `Wait ${deleteCountdown}s…` : 'Delete Forever'}
                  </Text>
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

  // ── Delete Modal ──────────────────────────────────────────
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    width: '90%',
  },
  deleteModalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalBody: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 10,
  },
  deleteModalLegal: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  deleteCountdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 24,
  },
  deleteCountdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  deleteCountdownNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#EF4444',
    minWidth: 30,
    textAlign: 'center',
  },
  deletePasswordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  deletePasswordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
  },
  deletePasswordToggle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deletePasswordToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deleteCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmButtonDisabled: {
    backgroundColor: '#FCA5A5',
  },
  deleteConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  deleteErrorIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  deleteErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '500',
    lineHeight: 18,
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

  // ── Pre-link Confirmation Modal ─────────────────────────────
  linkConfirmEmailBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    alignSelf: 'center',
  },
  linkConfirmEmailText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D4ED8',
    textAlign: 'center',
  },
});
