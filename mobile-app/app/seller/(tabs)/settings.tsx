import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Store,
  Bell,
  Shield,
  CreditCard,
  LogOut,
  Camera,
  Settings as SettingsIcon,
  Eye,
  Save,
  FileText,
  CheckCircle,
  Clock,
  Menu,
  Edit3,
  AlertTriangle,
  Trash2,
  Palmtree,
} from 'lucide-react-native';
import { supabase } from '../../../src/lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { useSellerStore } from '../../../src/stores/sellerStore';
import { useAuthStore } from '../../../src/stores/authStore';
import SellerDrawer from '../../../src/components/SellerDrawer';

type SettingTab = 'profile' | 'store' | 'documents' | 'notifications' | 'security' | 'payments' | 'store-status';

export default function SellerSettingsScreen() {
  const navigation = useNavigation();
  const { seller, updateSellerInfo, setVacationMode, disableVacationMode, loadSellerProfile } = useSellerStore();
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState<SettingTab>('profile');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sellerLoadAttempted, setSellerLoadAttempted] = useState(false);

  // Auto-load seller profile if it's null (e.g. user signed in via global authStore
  // and entered the seller area without going through the seller login flow).
  useEffect(() => {
    if (seller || sellerLoadAttempted) return;
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      setSellerLoadAttempted(true);
      return;
    }
    (async () => {
      try {
        await loadSellerProfile?.(userId);
      } finally {
        setSellerLoadAttempted(true);
      }
    })();
  }, [seller, sellerLoadAttempted, loadSellerProfile]);

  // Edit modes
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [isEditingPayments, setIsEditingPayments] = useState(false);

  // Vacation mode state
  const [vacationReason, setVacationReason] = useState('');

  useEffect(() => {
    if (seller?.vacation_reason) {
      setVacationReason(seller.vacation_reason);
    } else {
      setVacationReason('');
    }
  }, [seller?.vacation_reason]);

  const handleVacationToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await setVacationMode(vacationReason || undefined);
      if (success) {
        Alert.alert('Success', 'Vacation mode enabled. Buyers cannot purchase your products.');
      }
    } else {
      const success = await disableVacationMode();
      if (success) {
        Alert.alert('Success', 'Vacation mode disabled. Your store is now open for business.');
      }
    }
  };

  // Profile - matches database schema (sellers table)
  const [ownerName, setOwnerName] = useState(seller?.owner_name || '');
  const [email, setEmail] = useState(seller?.email || '');
  const [phone, setPhone] = useState(seller?.phone || '');

  // Store & Business - matches database schema (sellers + business_profiles tables)
  const [storeName, setStoreName] = useState(seller?.store_name || '');
  const [businessName, setBusinessName] = useState(seller?.store_name || ''); // Using store_name as business name
  const [storeDescription, setStoreDescription] = useState(seller?.store_description || '');
  const [businessType, setBusinessType] = useState(seller?.business_profile?.business_type || '');
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState(seller?.business_profile?.business_registration_number || '');
  const [taxIdNumber, setTaxIdNumber] = useState(seller?.business_profile?.tax_id_number || '');

  // Address - matches database schema (business_profiles table)
  const [address, setAddress] = useState(seller?.business_profile?.address_line_1 || '');
  const [city, setCity] = useState(seller?.business_profile?.city || '');
  const [province, setProvince] = useState(seller?.business_profile?.province || '');
  const [postalCode, setPostalCode] = useState(seller?.business_profile?.postal_code || '');

  // Payments - matches database schema (payout_accounts table)
  const [bankName, setBankName] = useState(seller?.payout_account?.bank_name || '');
  const [accountName, setAccountName] = useState(seller?.payout_account?.account_name || '');
  const [accountNumber, setAccountNumber] = useState(seller?.payout_account?.account_number || '');
  const [gcashNumber, setGcashNumber] = useState(''); // Assuming distinct from phone

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE' || !deletePassword) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { password: deletePassword, confirm: true },
      });
      if (error || data?.error) {
        const msg = data?.message || data?.error || error?.message || 'Failed to delete account';
        setDeleteError(msg);
        return;
      }
      const { logout } = useAuthStore.getState();
      logout();
      await supabase.auth.signOut();
      navigation.navigate('Login' as never);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const [notifications, setNotifications] = useState({
    newOrders: true,
    orderUpdates: true,
    promotions: false,
    reviews: true,
    messages: true,
    lowStock: true,
  });

  // Early return if seller is null
  if (!seller) {
    const stillLoading = !sellerLoadAttempted;
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        {stillLoading ? (
          <>
            <ActivityIndicator size="large" color="#D97706" />
            <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading seller data...</Text>
          </>
        ) : (
          <>
            <AlertTriangle size={32} color="#D97706" />
            <Text style={{ marginTop: 12, fontWeight: '600', fontSize: 16, color: '#111827', textAlign: 'center' }}>
              We couldn&apos;t load your seller profile
            </Text>
            <Text style={{ marginTop: 6, color: '#6B7280', textAlign: 'center' }}>
              You may not have a seller account yet, or your session expired.
            </Text>
          </>
        )}

        <Pressable
          style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F3F4F6', borderRadius: 8 }}
          onPress={() => {
            useAuthStore.getState().switchRole('buyer');
            navigation.navigate('MainTabs' as never);
          }}
        >
          <Text style={{ color: '#111827', fontWeight: '600' }}>Switch to Buyer</Text>
        </Pressable>

        <Pressable
          style={{ marginTop: 10, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FEE2E2', borderRadius: 8 }}
          onPress={async () => {
            try {
              await useAuthStore.getState().signOut?.();
            } catch (e) {
              console.warn('[SellerSettings] signOut failed:', e);
            }
            // App.tsx handles redirection to Login centrally
          }}
        >
          <Text style={{ color: '#B91C1C', fontWeight: '600' }}>Sign Out</Text>
        </Pressable>
      </View>
    );
  }

  const handleSave = async () => {
    // If on store-status tab and vacation mode is enabled, save the reason
    if (selectedTab === 'store-status' && seller?.is_vacation_mode) {
      await setVacationMode(vacationReason || undefined);
    }

    updateSellerInfo({
      owner_name: ownerName,
      email,
      phone,
      store_name: storeName,
      store_description: storeDescription,
      business_profile: {
        business_type: businessType,
        business_registration_number: businessRegistrationNumber,
        tax_id_number: taxIdNumber,
        address_line_1: address,
        city,
        province,
        postal_code: postalCode,
      },
      payout_account: {
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
      },
    });
    // Reset edit modes
    setIsEditingProfile(false);
    setIsEditingStore(false);
    setIsEditingPayments(false);
    Alert.alert('Success', 'Settings saved successfully!');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await useAuthStore.getState().signOut?.();
          } catch (e) {
            console.warn('[SellerSettings] signOut failed:', e);
          }
          // The central App.tsx listener will handle navigation to Login
          // because it watches the authStore user state.
        },
      },
    ]);
  };

  const handleSwitchToBuyer = async () => {
    const authStore = useAuthStore.getState();
    authStore.switchRole('buyer');

    // Ensure buyer data is loaded if it's the first switch
    if (authStore.user?.id) {
      const { useOrderStore } = await import('../../../src/stores/orderStore');
      // Only fetch if we currently have dummy data or none
      if (useOrderStore.getState().orders.length <= 8) { // dummyOrders has exactly 8 items
        useOrderStore.getState().fetchOrders(authStore.user.id);
      }
    }

    navigation.navigate('MainTabs' as never);
  };

  const handleCameraPress = () => {
    Alert.alert('Upload Photo', 'This feature will be available in the next update.');
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'profile':
        return (
          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Owner Information</Text>
                <Pressable
                  style={styles.editButton}
                  onPress={() => setIsEditingProfile(!isEditingProfile)}
                >
                  <Edit3 size={18} color={isEditingProfile ? '#D97706' : '#6B7280'} strokeWidth={2.5} />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={[styles.input, !isEditingProfile && styles.inputDisabled]}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Enter full name"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditingProfile}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={[styles.input, !isEditingProfile && styles.inputDisabled]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={isEditingProfile}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={[styles.input, !isEditingProfile && styles.inputDisabled]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  editable={isEditingProfile}
                />
              </View>
            </View>
          </View>
        );

      case 'store':
        return (
          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Store Details</Text>
                <Pressable
                  style={styles.editButton}
                  onPress={() => setIsEditingStore(!isEditingStore)}
                >
                  <Edit3 size={18} color={isEditingStore ? '#D97706' : '#6B7280'} strokeWidth={2.5} />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Store Name</Text>
                <TextInput
                  style={[styles.input, !isEditingStore && styles.inputDisabled]}
                  value={storeName}
                  onChangeText={setStoreName}
                  placeholder="Enter store name"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditingStore}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Store Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, !isEditingStore && styles.inputDisabled]}
                  value={storeDescription}
                  onChangeText={setStoreDescription}
                  placeholder="Describe your store"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={isEditingStore}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Business Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name</Text>
                <TextInput
                  style={[styles.input, !isEditingStore && styles.inputDisabled]}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Registered business name"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditingStore}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Type</Text>
                <TextInput
                  style={[styles.input, !isEditingStore && styles.inputDisabled]}
                  value={businessType}
                  onChangeText={(text: any) => setBusinessType(text)}
                  placeholder="e.g. Sole Proprietorship"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditingStore}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Registration Number (DTI/SEC)</Text>
                <TextInput
                  style={[styles.input, !isEditingStore && styles.inputDisabled]}
                  value={businessRegistrationNumber}
                  onChangeText={setBusinessRegistrationNumber}
                  placeholder="Enter registration number"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditingStore}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tax ID Number (TIN)</Text>
                <TextInput
                  style={[styles.input, !isEditingStore && styles.inputDisabled]}
                  value={taxIdNumber}
                  onChangeText={setTaxIdNumber}
                  placeholder="Enter TIN"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditingStore}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Business Address</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput
                  style={[styles.input, !isEditingStore && styles.inputDisabled]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter street address"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditingStore}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={[styles.input, !isEditingStore && styles.inputDisabled]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter city"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditingStore}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, styles.flexInput]}>
                  <Text style={styles.inputLabel}>Province</Text>
                  <TextInput
                    style={[styles.input, !isEditingStore && styles.inputDisabled]}
                    value={province}
                    onChangeText={setProvince}
                    placeholder="Province"
                    placeholderTextColor="#9CA3AF"
                    editable={isEditingStore}
                  />
                </View>
                <View style={[styles.inputGroup, styles.flexInput]}>
                  <Text style={styles.inputLabel}>Postal Code</Text>
                  <TextInput
                    style={[styles.input, !isEditingStore && styles.inputDisabled]}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    placeholder="Zip Code"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    editable={isEditingStore}
                  />
                </View>
              </View>
            </View>
          </View>
        );

      case 'documents':
        return (
          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Legal Documents</Text>
              <Text style={styles.sectionDescription}>
                Documents submitted for business verification.
              </Text>

              {/* Document URLs from verification_documents table */}
              {seller.verification_documents?.business_permit_url && (
                <View style={styles.documentItem}>
                  <View style={styles.documentIcon}>
                    <FileText size={24} color="#D97706" strokeWidth={2} />
                  </View>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName}>BUSINESS PERMIT</Text>
                    <Text style={styles.documentFile}>business_permit.pdf</Text>
                  </View>
                  <View style={styles.documentStatus}>
                    <CheckCircle size={20} color="#10B981" strokeWidth={2.5} />
                  </View>
                </View>
              )}
              {seller.verification_documents?.valid_id_url && (
                <View style={styles.documentItem}>
                  <View style={styles.documentIcon}>
                    <FileText size={24} color="#D97706" strokeWidth={2} />
                  </View>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName}>VALID ID</Text>
                    <Text style={styles.documentFile}>valid_id.pdf</Text>
                  </View>
                  <View style={styles.documentStatus}>
                    <CheckCircle size={20} color="#10B981" strokeWidth={2.5} />
                  </View>
                </View>
              )}
            </View>
          </View>
        );

      case 'notifications':
        return (
          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Notification Preferences</Text>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>New Orders</Text>
                  <Text style={styles.toggleDescription}>
                    Get notified when you receive a new order
                  </Text>
                </View>
                <Switch
                  value={notifications.newOrders}
                  onValueChange={(value) =>
                    setNotifications({ ...notifications, newOrders: value })
                  }
                  trackColor={{ false: '#E5E7EB', true: '#D97706' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E5E7EB"
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Order Updates</Text>
                  <Text style={styles.toggleDescription}>
                    Status changes and shipping updates
                  </Text>
                </View>
                <Switch
                  value={notifications.orderUpdates}
                  onValueChange={(value) =>
                    setNotifications({ ...notifications, orderUpdates: value })
                  }
                  trackColor={{ false: '#E5E7EB', true: '#D97706' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E5E7EB"
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Promotions</Text>
                  <Text style={styles.toggleDescription}>
                    Marketing tips and promotional offers
                  </Text>
                </View>
                <Switch
                  value={notifications.promotions}
                  onValueChange={(value) =>
                    setNotifications({ ...notifications, promotions: value })
                  }
                  trackColor={{ false: '#E5E7EB', true: '#D97706' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E5E7EB"
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Customer Reviews</Text>
                  <Text style={styles.toggleDescription}>
                    New ratings and reviews on your products
                  </Text>
                </View>
                <Switch
                  value={notifications.reviews}
                  onValueChange={(value) =>
                    setNotifications({ ...notifications, reviews: value })
                  }
                  trackColor={{ false: '#E5E7EB', true: '#D97706' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E5E7EB"
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Messages</Text>
                  <Text style={styles.toggleDescription}>
                    Customer inquiries and chat messages
                  </Text>
                </View>
                <Switch
                  value={notifications.messages}
                  onValueChange={(value) =>
                    setNotifications({ ...notifications, messages: value })
                  }
                  trackColor={{ false: '#E5E7EB', true: '#D97706' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E5E7EB"
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Low Stock Alerts</Text>
                  <Text style={styles.toggleDescription}>
                    When product inventory is running low
                  </Text>
                </View>
                <Switch
                  value={notifications.lowStock}
                  onValueChange={(value) =>
                    setNotifications({ ...notifications, lowStock: value })
                  }
                  trackColor={{ false: '#E5E7EB', true: '#D97706' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E5E7EB"
                />
              </View>
            </View>
          </View>
        );

      case 'security':
        return (
          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Password & Security</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter current password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
              <Text style={styles.sectionDescription}>
                Add an extra layer of security to your account
              </Text>

              <Pressable style={styles.enableButton}>
                <Text style={styles.enableButtonText}>Enable 2FA</Text>
              </Pressable>
            </View>

            {/* Danger Zone */}
            <View style={[styles.formSection, { marginBottom: 0 }]}>
              <View style={styles.dangerZoneCard}>
                <View style={styles.dangerZoneHeader}>
                  <AlertTriangle size={18} color="#DC2626" strokeWidth={2.5} />
                  <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
                </View>
                <Text style={styles.dangerZoneDescription}>
                  Permanently delete your seller account, store, products, and all associated data.
                  Active payouts must be settled first. This complies with RA 10173.
                </Text>
                <Pressable
                  style={styles.deleteAccountButton}
                  onPress={() => { setDeleteError(''); setShowDeleteModal(true); }}
                >
                  <Trash2 size={16} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );

      case 'payments':
        return (
          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bank Account</Text>
                <Pressable
                  style={styles.editButton}
                  onPress={() => setIsEditingPayments(!isEditingPayments)}
                >
                  <Edit3 size={18} color={isEditingPayments ? '#D97706' : '#6B7280'} strokeWidth={2.5} />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bank Name</Text>
                <TextInput
                  style={[styles.input, !isEditingPayments && styles.inputDisabled]}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Enter bank name"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditingPayments}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Number</Text>
                <TextInput
                  style={[styles.input, !isEditingPayments && styles.inputDisabled]}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Enter account number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  editable={isEditingPayments}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Name</Text>
                <TextInput
                  style={[styles.input, !isEditingPayments && styles.inputDisabled]}
                  value={accountName}
                  onChangeText={setAccountName}
                  placeholder="Enter account name"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditingPayments}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>GCash</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>GCash Number</Text>
                <TextInput
                  style={[styles.input, !isEditingPayments && styles.inputDisabled]}
                  value={gcashNumber}
                  onChangeText={setGcashNumber}
                  placeholder="Enter GCash number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  editable={isEditingPayments}
                />
              </View>
            </View>
          </View>
        );

      case 'store-status':
        return (
          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Palmtree size={20} color="#EA580C" strokeWidth={2.5} />
                  <Text style={styles.sectionTitle}>Store Status</Text>
                </View>
              </View>

              <View style={[styles.switchRow, { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16 }]}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={styles.switchLabel}>Vacation Mode</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    When enabled, buyers can still see your products but cannot purchase them.
                  </Text>
                </View>
                <Switch
                  value={seller?.is_vacation_mode || false}
                  onValueChange={handleVacationToggle}
                  trackColor={{ false: '#E5E7EB', true: '#FDBA74' }}
                  thumbColor={seller?.is_vacation_mode ? '#EA580C' : '#F3F4F6'}
                />
              </View>

              {seller?.is_vacation_mode && (
                <View style={[styles.inputGroup, { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#FFEDD5' }]}>
                  <Text style={styles.inputLabel}>Vacation Reason</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {['vacation', 'personal', 'maintenance', 'other'].map((reason) => (
                      <Pressable
                        key={reason}
                        onPress={() => setVacationReason(reason)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: vacationReason === reason ? '#EA580C' : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: vacationReason === reason ? '#EA580C' : '#E5E7EB',
                        }}
                      >
                        <Text style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: vacationReason === reason ? '#FFFFFF' : '#6B7280',
                          textTransform: 'capitalize',
                        }}>
                          {reason}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        );
    }
  };

  // Null guard for seller
  if (!seller) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, color: '#9CA3AF' }}>Loading seller information...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!isDeleting) { setShowDeleteModal(false); setDeletePassword(''); setDeleteConfirmText(''); setDeleteError(''); } }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <AlertTriangle size={20} color="#DC2626" strokeWidth={2.5} />
              <Text style={styles.modalTitle}>Delete Seller Account</Text>
            </View>
            <Text style={styles.modalDescription}>
              This will permanently delete your store, all products, and seller data.
              Ensure all pending orders and payouts are settled. This action cannot be undone (RA 10173).
            </Text>

            {!!deleteError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{deleteError}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm your password</Text>
              <TextInput
                style={styles.input}
                placeholder="Your current password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
                editable={!isDeleting}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Type <Text style={{ fontWeight: '800', color: '#DC2626' }}>DELETE</Text> to confirm
              </Text>
              <TextInput
                style={styles.input}
                placeholder="DELETE"
                placeholderTextColor="#9CA3AF"
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                editable={!isDeleting}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalCancelButton, isDeleting && styles.buttonDisabled]}
                onPress={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteConfirmText(''); setDeleteError(''); }}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalDeleteButton,
                  (isDeleting || deleteConfirmText !== 'DELETE' || !deletePassword) && styles.buttonDisabled,
                ]}
                onPress={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== 'DELETE' || !deletePassword}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Trash2 size={16} color="#FFFFFF" strokeWidth={2.5} />
                )}
                <Text style={styles.modalDeleteText}>
                  {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Seller Drawer */}
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      {/* Immersive Edge-to-Edge Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.iconContainer} onPress={() => setDrawerVisible(true)}>
              <Menu size={24} color="#1F2937" strokeWidth={2} />
            </Pressable>
            <View>
              <Text style={styles.headerTitle} numberOfLines={1}>Store Settings</Text>
              <View style={styles.subtitleRow}>
                <Store size={12} color="#4B5563" style={{ marginRight: 6 }} />
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  Seller Mode • Manage your store
                </Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.notificationButton} onPress={() => navigation.getParent()?.navigate('Notifications')}>
            <Bell size={22} color="#1F2937" strokeWidth={2.5} />
            <View style={styles.notificationBadge} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Store Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.identityContent}>
            {/* Avatar with Camera Badge */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{seller.store_name?.[0]?.toUpperCase() || 'S'}</Text>
              </View>
              <Pressable style={styles.cameraBadge} onPress={handleCameraPress}>
                <Camera size={14} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Store Info */}
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{seller.store_name}</Text>
              <Text style={styles.storeEmail}>{seller.email}</Text>
            </View>

            {/* Preview Button */}
            <Pressable style={styles.previewButton}>
              <Eye size={20} color="#D97706" strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        {/* Navigation Pill Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillTabs}
        >
          <Pressable
            style={[
              styles.pillTab,
              selectedTab === 'profile' && styles.pillTabActive,
            ]}
            onPress={() => setSelectedTab('profile')}
          >
            <Text
              style={[
                styles.pillTabText,
                selectedTab === 'profile' && styles.pillTabTextActive,
              ]}
            >
              Profile
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.pillTab,
              selectedTab === 'store' && styles.pillTabActive,
            ]}
            onPress={() => setSelectedTab('store')}
          >
            <Text
              style={[
                styles.pillTabText,
                selectedTab === 'store' && styles.pillTabTextActive,
              ]}
            >
              Store Info
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.pillTab,
              selectedTab === 'documents' && styles.pillTabActive,
            ]}
            onPress={() => setSelectedTab('documents')}
          >
            <Text
              style={[
                styles.pillTabText,
                selectedTab === 'documents' && styles.pillTabTextActive,
              ]}
            >
              Documents
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.pillTab,
              selectedTab === 'notifications' && styles.pillTabActive,
            ]}
            onPress={() => setSelectedTab('notifications')}
          >
            <Text
              style={[
                styles.pillTabText,
                selectedTab === 'notifications' && styles.pillTabTextActive,
              ]}
            >
              Notifications
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.pillTab,
              selectedTab === 'security' && styles.pillTabActive,
            ]}
            onPress={() => setSelectedTab('security')}
          >
            <Text
              style={[
                styles.pillTabText,
                selectedTab === 'security' && styles.pillTabTextActive,
              ]}
            >
              Security
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.pillTab,
              selectedTab === 'payments' && styles.pillTabActive,
            ]}
            onPress={() => setSelectedTab('payments')}
          >
            <Text
              style={[
                styles.pillTabText,
                selectedTab === 'payments' && styles.pillTabTextActive,
              ]}
            >
              Payments
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.pillTab,
              selectedTab === 'store-status' && styles.pillTabActive,
            ]}
            onPress={() => setSelectedTab('store-status')}
          >
            <Text
              style={[
                styles.pillTabText,
                selectedTab === 'store-status' && styles.pillTabTextActive,
              ]}
            >
              Store Status
            </Text>
          </Pressable>
        </ScrollView>

        {/* Form Content */}
        {renderTabContent()}

        {/* Save Button */}
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Save size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </Pressable>

        {/* Switch to Buyer Button */}
        <Pressable style={styles.switchAccountButton} onPress={handleSwitchToBuyer}>
          <View style={styles.switchAccountContent}>
            <View style={styles.switchAccountIcon}>
              <User size={20} color="#D97706" strokeWidth={2.5} />
            </View>
            <View style={styles.switchAccountInfo}>
              <Text style={styles.switchAccountTitle}>Switch to Buyer Mode</Text>
              <Text style={styles.switchAccountSubtitle}>
                Continue shopping as a customer
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Logout Button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" strokeWidth={2.5} />
          <Text style={styles.logoutText}>Logout from Store</Text>
        </Pressable>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF0',
  },
  header: {
    backgroundColor: '#FFF4EC', // Peach Background
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 20,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)', // Subtle dark overlay
    padding: 10,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800', // Bold Charcoal text
    color: '#1F2937',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#4B5563', // Gray Subtitle
    fontWeight: '500',
  },
  notificationButton: { position: 'relative' },
  notificationBadge: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFF4EC' },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // Store Identity Card
  identityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  identityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  storeEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
  },
  // Pill Tabs
  pillTabs: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  pillTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillTabActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  pillTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  pillTabTextActive: {
    color: '#FFFFFF',
  },
  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF4EC',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  inputGroup: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF4EC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  flexInput: {
    flex: 1,
  },
  // Document Item
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4EC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  documentFile: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  documentDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  documentStatus: {
    padding: 4,
  },
  // Toggle Item (for notifications)
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Enable Button (for 2FA)
  enableButton: {
    backgroundColor: '#FFF4EC',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D97706',
    alignItems: 'center',
  },
  enableButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D97706',
  },
  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Switch Account Button
  switchAccountButton: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFF4EC',
  },
  switchAccountContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchAccountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  switchAccountInfo: {
    flex: 1,
  },
  switchAccountTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  switchAccountSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  // Danger Zone
  dangerZoneCard: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    padding: 16,
    gap: 10,
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dangerZoneTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  dangerZoneDescription: {
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 19,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 4,
  },
  deleteAccountButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Delete Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#DC2626',
  },
  modalDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  modalDeleteButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#DC2626',
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
});