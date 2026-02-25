import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, TextInput } from 'react-native';
import { ArrowLeft, Settings as SettingsIcon, Bell, Shield, Globe, Palette, Mail, Save, Key } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../src/constants/theme';

export default function AdminSettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // General Settings
  const [platformName, setPlatformName] = useState('BazaarPH');
  const [supportEmail, setSupportEmail] = useState('support@bazaarph.com');
  const [contactPhone, setContactPhone] = useState('+63 2 8123 4567');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  
  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newOrderNotifications, setNewOrderNotifications] = useState(true);
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [sellerRegistration, setSellerRegistration] = useState(true);
  const [sellerNotifications, setSellerNotifications] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [disputeNotifications, setDisputeNotifications] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);
  
  // Security
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30 minutes');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Email
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('noreply@bazaarph.com');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [enableSSL, setEnableSSL] = useState(true);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Platform configuration</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* General Settings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Globe size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>General Settings</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Platform Name</Text>
            <TextInput
              style={styles.textInput}
              value={platformName}
              onChangeText={setPlatformName}
              placeholder="Enter platform name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Support Email</Text>
            <TextInput
              style={styles.textInput}
              value={supportEmail}
              onChangeText={setSupportEmail}
              placeholder="support@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Maintenance Mode</Text>
              <Text style={styles.settingDesc}>Temporarily disable the platform</Text>
            </View>
            <Switch
              value={maintenanceMode}
              onValueChange={setMaintenanceMode}
              trackColor={{ false: '#E5E7EB', true: '#FED7AA' }}
              thumbColor={maintenanceMode ? COLORS.primary : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Bell size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDesc}>Receive notifications via email</Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: '#E5E7EB', true: '#FED7AA' }}
              thumbColor={emailNotifications ? COLORS.primary : '#F3F4F6'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Order Notifications</Text>
              <Text style={styles.settingDesc}>Get notified about new orders</Text>
            </View>
            <Switch
              value={orderNotifications}
              onValueChange={setOrderNotifications}
              trackColor={{ false: '#E5E7EB', true: '#FED7AA' }}
              thumbColor={orderNotifications ? COLORS.primary : '#F3F4F6'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Seller Registrations</Text>
              <Text style={styles.settingDesc}>Alerts for new seller applications</Text>
            </View>
            <Switch
              value={sellerNotifications}
              onValueChange={setSellerNotifications}
              trackColor={{ false: '#E5E7EB', true: '#FED7AA' }}
              thumbColor={sellerNotifications ? COLORS.primary : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Security Settings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Shield size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Security</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
              <Text style={styles.settingDesc}>Add extra layer of security</Text>
            </View>
            <Switch
              value={twoFactorAuth}
              onValueChange={setTwoFactorAuth}
              trackColor={{ false: '#E5E7EB', true: '#FED7AA' }}
              thumbColor={twoFactorAuth ? COLORS.primary : '#F3F4F6'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Session Timeout (minutes)</Text>
            <TextInput
              style={styles.textInput}
              value={sessionTimeout}
              onChangeText={setSessionTimeout}
              placeholder="30"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Appearance Settings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Palette size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Appearance</Text>
          </View>

          <View style={styles.colorPreview}>
            <Text style={styles.colorLabel}>Primary Brand Color</Text>
            <View style={styles.colorBox}>
              <View style={[styles.colorSwatch, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.colorValue}>#FF5722</Text>
            </View>
          </View>
        </View>

        {/* Email Settings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Mail size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Email Configuration</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SMTP Host</Text>
            <TextInput
              style={styles.textInput}
              value="smtp.gmail.com"
              placeholder="smtp.example.com"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SMTP Port</Text>
            <TextInput
              style={styles.textInput}
              value="587"
              placeholder="587"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Save Button */}
        <Pressable 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  headerTitleContainer: { gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: '#FFFFFF', opacity: 0.9 },
  scrollView: { flex: 1, padding: 16 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIconContainer: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  textInput: { backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', borderWidth: 1, borderColor: '#E5E7EB' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  settingInfo: { flex: 1, marginRight: 16 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  settingDesc: { fontSize: 12, color: '#6B7280' },
  colorPreview: { paddingVertical: 12 },
  colorLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 },
  colorBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8 },
  colorSwatch: { width: 40, height: 40, borderRadius: 8, borderWidth: 2, borderColor: '#E5E7EB' },
  colorValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10, marginBottom: 24, elevation: 2 },
  saveButtonDisabled: { backgroundColor: '#FCA5A5', opacity: 0.7 },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
