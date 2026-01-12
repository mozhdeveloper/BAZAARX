import React, { useState } from 'react';
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
  Menu,
  Eye,
  Save,
  FileText,
  CheckCircle,
  Clock,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSellerStore } from '../../../src/stores/sellerStore';

type SettingTab = 'profile' | 'store' | 'documents' | 'notifications' | 'security' | 'payments';

export default function SellerSettingsScreen() {
  const navigation = useNavigation();
  const { seller, updateSellerInfo } = useSellerStore();
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState<SettingTab>('profile');
  
  // Profile
  const [ownerName, setOwnerName] = useState(seller.ownerName);
  const [email, setEmail] = useState(seller.email);
  const [phone, setPhone] = useState(seller.phone);

  // Store & Business
  const [storeName, setStoreName] = useState(seller.storeName);
  const [businessName, setBusinessName] = useState(seller.businessName);
  const [storeDescription, setStoreDescription] = useState(seller.storeDescription);
  const [businessType, setBusinessType] = useState(seller.businessType);
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState(seller.businessRegistrationNumber);
  const [taxIdNumber, setTaxIdNumber] = useState(seller.taxIdNumber);

  // Address
  const [address, setAddress] = useState(seller.businessAddress);
  const [city, setCity] = useState(seller.city);
  const [province, setProvince] = useState(seller.province);
  const [postalCode, setPostalCode] = useState(seller.postalCode);
  
  // Payments
  const [bankName, setBankName] = useState(seller.bankName);
  const [accountName, setAccountName] = useState(seller.accountName);
  const [accountNumber, setAccountNumber] = useState(seller.accountNumber);
  const [gcashNumber, setGcashNumber] = useState(''); // Assuming distinct from phone

  const [notifications, setNotifications] = useState({
    newOrders: true,
    orderUpdates: true,
    promotions: false,
    reviews: true,
    messages: true,
    lowStock: true,
  });

  const handleSave = () => {
    updateSellerInfo({
      ownerName,
      email,
      phone,
      storeName,
      businessName,
      storeDescription,
      businessType,
      businessRegistrationNumber,
      taxIdNumber,
      businessAddress: address,
      city,
      province,
      postalCode,
      bankName,
      accountName,
      accountNumber,
    });
    Alert.alert('Success', 'Settings saved successfully!');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => navigation.navigate('Login' as never),
      },
    ]);
  };

  const handleSwitchToBuyer = () => {
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
              <Text style={styles.sectionTitle}>Owner Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Enter full name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        );

      case 'store':
        return (
          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Store Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Store Name</Text>
                <TextInput
                  style={styles.input}
                  value={storeName}
                  onChangeText={setStoreName}
                  placeholder="Enter store name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Store Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={storeDescription}
                  onChangeText={setStoreDescription}
                  placeholder="Describe your store"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Business Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name</Text>
                <TextInput
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Registered business name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Type</Text>
                <TextInput
                  style={styles.input}
                  value={businessType}
                  onChangeText={(text: any) => setBusinessType(text)}
                  placeholder="e.g. Sole Proprietorship"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Registration Number (DTI/SEC)</Text>
                <TextInput
                  style={styles.input}
                  value={businessRegistrationNumber}
                  onChangeText={setBusinessRegistrationNumber}
                  placeholder="Enter registration number"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tax ID Number (TIN)</Text>
                <TextInput
                  style={styles.input}
                  value={taxIdNumber}
                  onChangeText={setTaxIdNumber}
                  placeholder="Enter TIN"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Business Address</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter street address"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter city"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, styles.flexInput]}>
                  <Text style={styles.inputLabel}>Province</Text>
                  <TextInput
                    style={styles.input}
                    value={province}
                    onChangeText={setProvince}
                    placeholder="Province"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={[styles.inputGroup, styles.flexInput]}>
                  <Text style={styles.inputLabel}>Postal Code</Text>
                  <TextInput
                    style={styles.input}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    placeholder="Zip Code"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
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

              {seller.documents.map((doc) => (
                <View key={doc.id} style={styles.documentItem}>
                  <View style={styles.documentIcon}>
                    <FileText size={24} color="#FF5722" strokeWidth={2} />
                  </View>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName}>{doc.type.replace('_', ' ').toUpperCase()}</Text>
                    <Text style={styles.documentFile}>{doc.fileName}</Text>
                    <Text style={styles.documentDate}>Uploaded on {doc.uploadDate}</Text>
                  </View>
                  <View style={styles.documentStatus}>
                    {doc.isVerified ? (
                      <CheckCircle size={20} color="#10B981" strokeWidth={2.5} />
                    ) : (
                      <Clock size={20} color="#F59E0B" strokeWidth={2.5} />
                    )}
                  </View>
                </View>
              ))}
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
                  trackColor={{ false: '#E5E7EB', true: '#FF5722' }}
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
                  trackColor={{ false: '#E5E7EB', true: '#FF5722' }}
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
                  trackColor={{ false: '#E5E7EB', true: '#FF5722' }}
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
                  trackColor={{ false: '#E5E7EB', true: '#FF5722' }}
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
                  trackColor={{ false: '#E5E7EB', true: '#FF5722' }}
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
                  trackColor={{ false: '#E5E7EB', true: '#FF5722' }}
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
          </View>
        );

      case 'payments':
        return (
          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Bank Account</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bank Name</Text>
                <TextInput
                  style={styles.input}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Enter bank name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Number</Text>
                <TextInput
                  style={styles.input}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Enter account number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Name</Text>
                <TextInput
                  style={styles.input}
                  value={accountName}
                  onChangeText={setAccountName}
                  placeholder="Enter account name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>GCash</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>GCash Number</Text>
                <TextInput
                  style={styles.input}
                  value={gcashNumber}
                  onChangeText={setGcashNumber}
                  placeholder="Enter GCash number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Immersive Edge-to-Edge Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.menuButton}>
              <Menu size={24} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Store Settings</Text>
              <Text style={styles.headerSubtitle}>Manage your store</Text>
            </View>
          </View>
          <Pressable style={styles.notificationButton}>
            <Bell size={22} color="#FFFFFF" strokeWidth={2.5} />
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
                <Text style={styles.avatarText}>{seller.storeLogo}</Text>
              </View>
              <Pressable style={styles.cameraBadge} onPress={handleCameraPress}>
                <Camera size={14} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Store Info */}
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{seller.storeName}</Text>
              <Text style={styles.storeEmail}>{seller.email}</Text>
            </View>

            {/* Preview Button */}
            <Pressable style={styles.previewButton}>
              <Eye size={16} color="#FF5722" strokeWidth={2.5} />
              <Text style={styles.previewText}>Preview</Text>
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
              <User size={20} color="#FF5722" strokeWidth={2.5} />
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
    backgroundColor: '#F5F5F7',
  },
  header: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
  menuButton: {
    padding: 4,
  },
  headerTitleContainer: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500',
  },
  notificationButton: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FF5722',
  },
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
    marginTop: -20,
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
    backgroundColor: '#FFF5F0',
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
    backgroundColor: '#FF5722',
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
    color: '#FF5722',
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
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
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
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F0',
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
    backgroundColor: '#FFF5F0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF5722',
    alignItems: 'center',
  },
  enableButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF5722',
  },
  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#FF5722',
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
    borderColor: '#FFF5F0',
  },
  switchAccountContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchAccountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F0',
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
    backgroundColor: '#FEE2E2',
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
});
