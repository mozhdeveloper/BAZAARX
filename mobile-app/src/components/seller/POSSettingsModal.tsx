/**
 * POS Settings Modal Component - Mobile
 * Full-featured settings editor matching web functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Settings,
  X,
  Save,
  Banknote,
  CreditCard,
  Wallet,
  Building2,
  Scan,
  Receipt,
  Percent,
  DollarSign,
  Users,
  AlertCircle,
  Volume2,
  VolumeX,
  Check,
} from 'lucide-react-native';
import {
  getPOSSettings,
  savePOSSettings,
  DEFAULT_POS_SETTINGS,
  type POSSettings,
} from '../../services/posSettingsService';

interface POSSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  sellerId: string;
  onSettingsSaved?: (settings: POSSettings) => void;
}

type TabType = 'general' | 'tax' | 'receipt';

export function POSSettingsModal({
  visible,
  onClose,
  sellerId,
  onSettingsSaved,
}: POSSettingsModalProps) {
  const [settings, setSettings] = useState<POSSettings>(DEFAULT_POS_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings when modal opens
  useEffect(() => {
    if (visible && sellerId) {
      loadSettings();
    }
  }, [visible, sellerId]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const loadedSettings = await getPOSSettings(sellerId);
      setSettings(loadedSettings);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = <K extends keyof POSSettings>(
    key: K,
    value: POSSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const togglePaymentMethod = (method: 'enableCash' | 'enableCard' | 'enableEwallet' | 'enableBankTransfer') => {
    updateSetting(method, !settings[method]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await savePOSSettings(sellerId, settings);
      if (success) {
        setHasChanges(false);
        onSettingsSaved?.(settings);
        Alert.alert('Success', 'Settings saved successfully!', [
          { text: 'OK', onPress: () => onClose() },
        ]);
      } else {
        Alert.alert('Error', 'Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before closing?',
        [
          { text: 'Discard', style: 'destructive', onPress: onClose },
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: handleSave },
        ]
      );
    } else {
      onClose();
    }
  };

  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'general' && styles.tabActive]}
        onPress={() => setActiveTab('general')}
      >
        <Settings size={18} color={activeTab === 'general' ? '#FF6A00' : '#6B7280'} />
        <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>
          General
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'tax' && styles.tabActive]}
        onPress={() => setActiveTab('tax')}
      >
        <Percent size={18} color={activeTab === 'tax' ? '#FF6A00' : '#6B7280'} />
        <Text style={[styles.tabText, activeTab === 'tax' && styles.tabTextActive]}>
          Tax
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'receipt' && styles.tabActive]}
        onPress={() => setActiveTab('receipt')}
      >
        <Receipt size={18} color={activeTab === 'receipt' ? '#FF6A00' : '#6B7280'} />
        <Text style={[styles.tabText, activeTab === 'receipt' && styles.tabTextActive]}>
          Receipt
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderGeneralTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Payment Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.card}>
          <View style={styles.paymentGrid}>
            <TouchableOpacity
              style={[
                styles.paymentButton,
                settings.enableCash && styles.paymentButtonActive,
              ]}
              onPress={() => togglePaymentMethod('enableCash')}
            >
              <Banknote size={20} color={settings.enableCash ? '#FF6A00' : '#9CA3AF'} />
              <Text
                style={[
                  styles.paymentButtonText,
                  settings.enableCash && styles.paymentButtonTextActive,
                ]}
              >
                Cash
              </Text>
              {settings.enableCash && (
                <View style={styles.checkIcon}>
                  <Check size={12} color="#FF6A00" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentButton,
                settings.enableCard && styles.paymentButtonActive,
              ]}
              onPress={() => togglePaymentMethod('enableCard')}
            >
              <CreditCard size={20} color={settings.enableCard ? '#FF6A00' : '#9CA3AF'} />
              <Text
                style={[
                  styles.paymentButtonText,
                  settings.enableCard && styles.paymentButtonTextActive,
                ]}
              >
                Card
              </Text>
              {settings.enableCard && (
                <View style={styles.checkIcon}>
                  <Check size={12} color="#FF6A00" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentButton,
                settings.enableEwallet && styles.paymentButtonActive,
              ]}
              onPress={() => togglePaymentMethod('enableEwallet')}
            >
              <Wallet size={20} color={settings.enableEwallet ? '#FF6A00' : '#9CA3AF'} />
              <Text
                style={[
                  styles.paymentButtonText,
                  settings.enableEwallet && styles.paymentButtonTextActive,
                ]}
              >
                E-Wallet
              </Text>
              {settings.enableEwallet && (
                <View style={styles.checkIcon}>
                  <Check size={12} color="#FF6A00" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentButton,
                settings.enableBankTransfer && styles.paymentButtonActive,
              ]}
              onPress={() => togglePaymentMethod('enableBankTransfer')}
            >
              <Building2 size={20} color={settings.enableBankTransfer ? '#FF6A00' : '#9CA3AF'} />
              <Text
                style={[
                  styles.paymentButtonText,
                  settings.enableBankTransfer && styles.paymentButtonTextActive,
                ]}
              >
                Bank
              </Text>
              {settings.enableBankTransfer && (
                <View style={styles.checkIcon}>
                  <Check size={12} color="#FF6A00" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Barcode Scanner */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Barcode Scanner</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Scan size={20} color="#8B5CF6" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Enable Barcode Scanner</Text>
                <Text style={styles.settingDescription}>
                  Scan products with camera
                </Text>
              </View>
            </View>
            <Switch
              value={settings.enableBarcodeScanner}
              onValueChange={(value) => updateSetting('enableBarcodeScanner', value)}
              trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
              thumbColor="#FFF"
            />
          </View>

          {settings.enableBarcodeScanner && (
            <View style={[styles.settingRow, styles.settingRowNoBorder]}>
              <View style={styles.settingLeft}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Auto-add to Cart</Text>
                  <Text style={styles.settingDescription}>
                    Add scanned products automatically
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.autoAddOnScan}
                onValueChange={(value) => updateSetting('autoAddOnScan', value)}
                trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
                thumbColor="#FFF"
              />
            </View>
          )}
        </View>
      </View>

      {/* Sound & Alerts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sound & Alerts</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              {settings.enableSoundEffects ? (
                <Volume2 size={20} color="#10B981" />
              ) : (
                <VolumeX size={20} color="#9CA3AF" />
              )}
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Sound Effects</Text>
                <Text style={styles.settingDescription}>
                  Play sounds for scans and sales
                </Text>
              </View>
            </View>
            <Switch
              value={settings.enableSoundEffects}
              onValueChange={(value) => updateSetting('enableSoundEffects', value)}
              trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
              thumbColor="#FFF"
            />
          </View>
        </View>
      </View>

      {/* Store Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Store Information</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Store Name</Text>
            <TextInput
              style={styles.input}
              value={settings.storeName}
              onChangeText={(text) => updateSetting('storeName', text)}
              placeholder="Enter store name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={settings.storePhone}
              onChangeText={(text) => updateSetting('storePhone', text)}
              placeholder="Enter phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={settings.storeAddress}
              onChangeText={(text) => updateSetting('storeAddress', text)}
              placeholder="Enter store address"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderTaxTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Tax Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tax Configuration</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Percent size={20} color="#3B82F6" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Enable Tax</Text>
                <Text style={styles.settingDescription}>
                  Calculate tax on sales
                </Text>
              </View>
            </View>
            <Switch
              value={settings.enableTax}
              onValueChange={(value) => updateSetting('enableTax', value)}
              trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
              thumbColor="#FFF"
            />
          </View>

          {settings.enableTax && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tax Name</Text>
                <TextInput
                  style={styles.input}
                  value={settings.taxLabel}
                  onChangeText={(text) => updateSetting('taxLabel', text)}
                  placeholder="e.g., VAT, Sales Tax"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tax Rate (%)</Text>
                <TextInput
                  style={styles.input}
                  value={settings.taxRate.toString()}
                  onChangeText={(text) => {
                    const rate = parseFloat(text) || 0;
                    updateSetting('taxRate', rate);
                  }}
                  placeholder="12"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Tax Included in Price</Text>
                    <Text style={styles.settingDescription}>
                      {settings.taxIncludedInPrice
                        ? 'Prices already include tax'
                        : 'Tax will be added to prices'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.taxIncludedInPrice}
                  onValueChange={(value) => updateSetting('taxIncludedInPrice', value)}
                  trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
                  thumbColor="#FFF"
                />
              </View>

              {/* Tax Preview */}
              <View style={styles.taxPreview}>
                <Text style={styles.taxPreviewTitle}>Tax Preview (₱1,000 sale)</Text>
                <View style={styles.taxPreviewContent}>
                  {settings.taxIncludedInPrice ? (
                    <>
                      <View style={styles.taxPreviewRow}>
                        <Text style={styles.taxPreviewLabel}>Net Amount:</Text>
                        <Text style={styles.taxPreviewValue}>
                          ₱{(1000 / (1 + settings.taxRate / 100)).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.taxPreviewRow}>
                        <Text style={styles.taxPreviewLabel}>
                          {settings.taxLabel} ({settings.taxRate}%):
                        </Text>
                        <Text style={styles.taxPreviewValue}>
                          ₱{(1000 - 1000 / (1 + settings.taxRate / 100)).toFixed(2)}
                        </Text>
                      </View>
                      <View style={[styles.taxPreviewRow, styles.taxPreviewTotal]}>
                        <Text style={styles.taxPreviewTotalLabel}>Total:</Text>
                        <Text style={styles.taxPreviewTotalValue}>₱1,000.00</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.taxPreviewRow}>
                        <Text style={styles.taxPreviewLabel}>Subtotal:</Text>
                        <Text style={styles.taxPreviewValue}>₱1,000.00</Text>
                      </View>
                      <View style={styles.taxPreviewRow}>
                        <Text style={styles.taxPreviewLabel}>
                          {settings.taxLabel} ({settings.taxRate}%):
                        </Text>
                        <Text style={styles.taxPreviewValue}>
                          ₱{((1000 * settings.taxRate) / 100).toFixed(2)}
                        </Text>
                      </View>
                      <View style={[styles.taxPreviewRow, styles.taxPreviewTotal]}>
                        <Text style={styles.taxPreviewTotalLabel}>Total:</Text>
                        <Text style={styles.taxPreviewTotalValue}>
                          ₱{(1000 * (1 + settings.taxRate / 100)).toFixed(2)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderReceiptTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Receipt Customization */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Receipt Customization</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Receipt Header</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={settings.receiptHeader}
              onChangeText={(text) => updateSetting('receiptHeader', text)}
              placeholder="Header message on receipt"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Receipt Footer</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={settings.receiptFooter}
              onChangeText={(text) => updateSetting('receiptFooter', text)}
              placeholder="Footer message on receipt"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Show Tax Breakdown</Text>
                <Text style={styles.settingDescription}>
                  Display tax details on receipt
                </Text>
              </View>
            </View>
            <Switch
              value={settings.showTaxBreakdown}
              onValueChange={(value) => updateSetting('showTaxBreakdown', value)}
              trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
              thumbColor="#FFF"
            />
          </View>
        </View>
      </View>

      {/* Info Note */}
      <View style={styles.infoNote}>
        <AlertCircle size={16} color="#92400E" />
        <Text style={styles.infoNoteText}>
          Changes to receipt settings will apply to all future transactions.
        </Text>
      </View>
    </ScrollView>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Settings size={24} color="#FFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>POS Settings</Text>
              <Text style={styles.headerSubtitle}>Configure your point of sale</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        {hasChanges && (
          <View style={styles.saveBar}>
            <Text style={styles.saveBarText}>You have unsaved changes</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={styles.saveButton}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Save size={16} color="#FFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs */}
        {renderTabs()}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6A00" />
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'general' && renderGeneralTab()}
            {activeTab === 'tax' && renderTaxTab()}
            {activeTab === 'receipt' && renderReceiptTab()}
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF6A00',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  saveBarText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF6A00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#FF6A00',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FF6A00',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  paymentButtonActive: {
    borderColor: '#FF6A00',
    backgroundColor: '#FFF5F0',
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  paymentButtonTextActive: {
    color: '#FF6A00',
    fontWeight: '600',
  },
  checkIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingRowNoBorder: {
    borderBottomWidth: 0,
    paddingLeft: 28,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  settingDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  taxPreview: {
    backgroundColor: '#FFF5F0',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
  },
  taxPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  taxPreviewContent: {
    gap: 8,
  },
  taxPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taxPreviewLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  taxPreviewValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  taxPreviewTotal: {
    borderTopWidth: 1,
    borderTopColor: '#FDBA74',
    paddingTop: 8,
    marginTop: 4,
  },
  taxPreviewTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  taxPreviewTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    marginBottom: 32,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});
