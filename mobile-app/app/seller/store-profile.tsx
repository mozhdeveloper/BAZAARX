import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Mail,
  User,
  Camera,
  Edit2,
  Globe,
  Award,
  Package,
  TrendingUp,
  Users,
  Building2,
  CreditCard,
  FileText,
  CheckCircle,
  Lock,
  AlertCircle,
  Clock,
  Eye,
  Upload,
} from 'lucide-react-native';

export default function StoreProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();
  const [editSection, setEditSection] = useState<'basic' | null>(null);
  const [storeLogoUri, setStoreLogoUri] = useState<string | null>(null);

  const isVerified = true; // Mock verified status
  const seller = {
    storeName: 'My Awesome Store',
    id: 'seller123',
    rating: '4.8',
    totalSales: 1234,
    storeDescription: 'Quality products at affordable prices. We offer the best selection of electronics and gadgets.',
    ownerName: 'Juan Dela Cruz',
    email: 'seller@bazaarph.com',
    phone: '+63 917 123 4567',
    businessName: 'My Awesome Business Inc.',
    businessType: 'Corporation',
    businessRegistrationNumber: 'BRN-2024-12345',
    taxIdNumber: '123-456-789-000',
    businessAddress: '123 Main St',
    city: 'Manila',
    province: 'Metro Manila',
    postalCode: '1000',
    bankName: 'BDO Unibank',
    accountName: 'My Awesome Store',
    accountNumber: '1234567890',
    joinDate: '2024-01-15',
    storeCategory: ['Electronics', 'Gadgets', 'Accessories'],
  };

  const [formData, setFormData] = useState({
    storeName: seller.storeName,
    storeDescription: seller.storeDescription,
    phone: seller.phone,
    ownerName: seller.ownerName,
    email: seller.email,
  });

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to update your store logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setStoreLogoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleCaptureImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your camera to capture a store logo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setStoreLogoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  const handleCameraPress = () => {
    Alert.alert('Update Store Logo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: handleCaptureImage,
      },
      {
        text: 'Choose from Library',
        onPress: handlePickImage,
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const handleSave = () => {
    // Save logic here
    setEditSection(null);
  };

  return (
    <View style={styles.container}>
      {/* Header - Edge to Edge Orange - Match orders/dashboard style */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: '#FF5722' }]}>
        <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>Store Profile</Text>
            <View style={{ width: 40 }} />
        </View>

        {isVerified && (
          <View style={[styles.headerBadge, { position: 'absolute', right: 20, top: insets.top + 14 }]}>
              <CheckCircle size={16} color="#10B981" strokeWidth={2.5} />
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Store Header Card */}
        <View style={styles.storeHeaderCard}>
          {/* Row 1: Logo with Camera Button + Store Name & URL */}
          <View style={styles.storeHeaderRow1}>
            {/* Logo Section */}
            <View style={styles.logoWrapper}>
              {storeLogoUri ? (
                <Image source={{ uri: storeLogoUri }} style={styles.logoContainer} />
              ) : (
                <View style={styles.logoContainer}>
                  <Text style={styles.logoText}>{seller.storeName?.charAt(0)}</Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.cameraButton} 
                activeOpacity={0.7}
                onPress={handleCameraPress}
              >
                <Camera size={14} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Store Info */}
            <View style={styles.storeInfoColumn}>
              <Text style={styles.storeName} numberOfLines={1}>{seller.storeName || 'Your Store'}</Text>
              <View style={styles.storeUrlRow}>
                <Globe size={12} color="#6B7280" strokeWidth={2} />
                <Text style={styles.storeUrl} numberOfLines={1}>bazaarph.com/store/{seller.id}</Text>
              </View>
            </View>
          </View>

          {/* Row 2: Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Award size={16} color="#6B7280" strokeWidth={2} />
              <Text style={styles.statLabel}>Rating</Text>
              <Text style={styles.statValue}>{seller.rating}/5</Text>
            </View>
            <View style={styles.statCard}>
              <Package size={16} color="#6B7280" strokeWidth={2} />
              <Text style={styles.statLabel}>Products</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
            <View style={styles.statCard}>
              <TrendingUp size={16} color="#6B7280" strokeWidth={2} />
              <Text style={styles.statLabel}>Sales</Text>
              <Text style={styles.statValue}>{seller.totalSales}</Text>
            </View>
            <View style={styles.statCard}>
              <Users size={16} color="#6B7280" strokeWidth={2} />
              <Text style={styles.statLabel}>Followers</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
          </View>
        </View>

        {/* Owner & Contact Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <User size={20} color="#FF6A00" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Owner & Contact Information</Text>
            </View>
            {editSection !== 'basic' && (
              <TouchableOpacity
                onPress={() => setEditSection('basic')}
                style={styles.editIconButton}
              >
                <Edit2 size={16} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {editSection === 'basic' ? (
            <View style={styles.formContent}>
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Owner Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.ownerName}
                    onChangeText={(text) => setFormData({ ...formData, ownerName: text })}
                    placeholder="Full name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    placeholder="email@example.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                  />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    placeholder="+63 XXX XXX XXXX"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Store Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.storeName}
                    onChangeText={(text) => setFormData({ ...formData, storeName: text })}
                    placeholder="Your store name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              <View style={styles.formFieldFull}>
                <Text style={styles.fieldLabel}>Store Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.storeDescription}
                  onChangeText={(text) => setFormData({ ...formData, storeDescription: text })}
                  placeholder="Describe your store and what you sell..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.formActions}>
                <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEditSection(null)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Owner Name</Text>
                <Text style={styles.infoValue}>{seller.ownerName || 'Not provided'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{seller.email}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{seller.phone || 'Not provided'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Store Name</Text>
                <Text style={styles.infoValue}>{seller.storeName || 'Your Store'}</Text>
              </View>
              <View style={[styles.infoItem, styles.infoItemFull]}>
                <Text style={styles.infoLabel}>Store Description</Text>
                <Text style={styles.infoValue}>{seller.storeDescription || 'No description added'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Business Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Building2 size={20} color="#FF6A00" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Business Information</Text>
            </View>
            {isVerified ? (
                <View style={styles.verifiedLockBadge}>
                  <Lock size={12} color="#10B981" strokeWidth={2.5} />
                  <Text style={styles.verifiedLockText}>Verified & Locked</Text>
                </View>
              ) : ( 
              <View style={styles.pendingBadge}>
                <AlertCircle size={12} color="#F59E0B" strokeWidth={2.5} />
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            )}
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Business Name</Text>
              <Text style={styles.infoValue}>{seller.businessName || 'Not provided'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Business Type</Text>
              <Text style={styles.infoValue}>{seller.businessType || 'Not provided'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Registration Number</Text>
              <Text style={[styles.infoValue, styles.monoText]}>{seller.businessRegistrationNumber || 'Not provided'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tax ID Number (TIN)</Text>
              <Text style={[styles.infoValue, styles.monoText]}>{seller.taxIdNumber || 'Not provided'}</Text>
            </View>
            <View style={[styles.infoItem, styles.infoItemFull]}>
              <Text style={styles.infoLabel}>Business Address</Text>
              <Text style={styles.infoValue}>
                {seller.businessAddress && seller.city && seller.province && seller.postalCode
                  ? `${seller.businessAddress}, ${seller.city}, ${seller.province} ${seller.postalCode}`
                  : 'Not provided'}
              </Text>
            </View>
          </View>

          {isVerified && (
            <View style={styles.verifiedAlert}>
              <CheckCircle size={16} color="#10B981" strokeWidth={2} />
              <Text style={styles.verifiedAlertText}>
                Your business information has been verified and cannot be edited. Contact support if you need to make changes.
              </Text>
            </View>
          )}
        </View>

        {/* Banking Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <CreditCard size={20} color="#FF6A00" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Banking Information</Text>
              
            </View>
            {isVerified ? (
                <View style={styles.verifiedLockBadge}>
                  <Lock size={12} color="#10B981" strokeWidth={2.5} />
                  <Text style={styles.verifiedLockText}>Verified & Locked</Text>
                </View>
              ) : ( 
                <View style={styles.pendingBadge}>
                  <AlertCircle size={12} color="#F59E0B" strokeWidth={2.5} />
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              )}
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Bank Name</Text>
              <Text style={styles.infoValue}>{seller.bankName || 'Not provided'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Account Name</Text>
              <Text style={styles.infoValue}>{seller.accountName || 'Not provided'}</Text>
            </View>
            <View style={[styles.infoItem, styles.infoItemFull]}>
              <Text style={styles.infoLabel}>Account Number</Text>
              <Text style={[styles.infoValue, styles.monoText]}>
                {seller.accountNumber ? `****${seller.accountNumber.slice(-4)}` : 'Not provided'}
              </Text>
            </View>
          </View>

          {isVerified && (
            <View style={styles.verifiedAlert}>
              <CheckCircle size={16} color="#10B981" strokeWidth={2} />
              <Text style={styles.verifiedAlertText}>
                Your banking information has been verified and secured. Contact support if you need to update these details.
              </Text>
            </View>
          )}
        </View>

        {/* Verification Documents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <FileText size={20} color="#FF6A00" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Verification Documents</Text>
            </View>
            {isVerified ? (
              <View style={styles.verifiedStatusBadge}>
                <CheckCircle size={12} color="#10B981" strokeWidth={2.5} />
                <Text style={styles.verifiedStatusText}>All Verified</Text>
              </View>
            ) : (
              <View style={styles.reviewBadge}>
                <Clock size={12} color="#F59E0B" strokeWidth={2.5} />
                <Text style={styles.reviewText}>Under Review</Text>
              </View>
            )}
          </View>

          {/* Document Cards */}
          <View style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={styles.documentIconContainer}>
                <View style={[styles.documentIcon, isVerified ? styles.documentIconVerified : styles.documentIconPending]}>
                  <FileText size={20} color={isVerified ? '#10B981' : '#F59E0B'} strokeWidth={2} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentTitle}>Government-Issued ID</Text>
                  <Text style={styles.documentSubtitle}>Submitted during registration</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.viewButton}>
                <Eye size={16} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {isVerified && (
              <View style={styles.verifiedStatusRow}>
                <CheckCircle size={14} color="#10B981" strokeWidth={2} />
                <Text style={styles.verifiedDateText}>Verified on {new Date(seller.joinDate).toLocaleDateString()}</Text>
              </View>
            )}
          </View>

          <View style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={styles.documentIconContainer}>
                <View style={[styles.documentIcon, isVerified ? styles.documentIconVerified : styles.documentIconPending]}>
                  <Building2 size={20} color={isVerified ? '#10B981' : '#F59E0B'} strokeWidth={2} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentTitle}>Business Permit/DTI</Text>
                  <Text style={styles.documentSubtitle}>Business registration document</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.viewButton}>
                <Eye size={16} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {isVerified && (
              <View style={styles.verifiedStatusRow}>
                <CheckCircle size={14} color="#10B981" strokeWidth={2} />
                <Text style={styles.verifiedDateText}>Verified on {new Date(seller.joinDate).toLocaleDateString()}</Text>
              </View>
            )}
          </View>

          <View style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={styles.documentIconContainer}>
                <View style={[styles.documentIcon, isVerified ? styles.documentIconVerified : styles.documentIconPending]}>
                  <CreditCard size={20} color={isVerified ? '#10B981' : '#F59E0B'} strokeWidth={2} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentTitle}>Bank Account Verification</Text>
                  <Text style={styles.documentSubtitle}>Proof of bank account ownership</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.viewButton}>
                <Eye size={16} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {isVerified && (
              <View style={styles.verifiedStatusRow}>
                <CheckCircle size={14} color="#10B981" strokeWidth={2} />
                <Text style={styles.verifiedDateText}>Verified on {new Date(seller.joinDate).toLocaleDateString()}</Text>
              </View>
            )}
          </View>

          {!isVerified && (
            <View style={styles.pendingAlert}>
              <AlertCircle size={16} color="#F59E0B" strokeWidth={2} />
              <Text style={styles.pendingAlertText}>
                Your documents are currently being reviewed by our team. This usually takes 1-2 business days. You'll be notified once verification is complete.
              </Text>
            </View>
          )}
        </View>

        {/* Store Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Store Categories</Text>
          <View style={styles.categoriesContainer}>
            {seller.storeCategory && seller.storeCategory.length > 0 ? (
              seller.storeCategory.map((category, index) => (
                <View key={index} style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noCategoriesText}>No categories selected</Text>
            )}
          </View>
        </View>

        {/* Store Banner */}
        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Store Banner</Text>
          <View style={styles.bannerUploadContainer}>
            <Upload size={32} color="#9CA3AF" strokeWidth={2} />
            <Text style={styles.bannerUploadText}>Click to upload store banner</Text>
            <Text style={styles.bannerUploadSubtext}>Recommended size: 1200x400px (Max 5MB)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerContainer: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  scrollView: {
    flex: 1,
  },
  storeHeaderCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  storeHeaderRow1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  logoWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6A00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  storeInfoColumn: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 6,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  storeUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeUrl: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lastSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  editIconButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    paddingVertical: 3,
  },
  infoItemFull: {
    width: '100%',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  monoText: {
    fontFamily: 'monospace',
  },
  formContent: {
    gap: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formField: {
    flex: 1,
  },
  formFieldFull: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF6A00',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  verifiedLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    flexShrink: 0,
  },
  verifiedLockText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '500',
  },
  verifiedAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
  },
  verifiedAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
  verifiedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verifiedStatusText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reviewText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '500',
  },
  documentCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentIconVerified: {
    backgroundColor: '#ECFDF5',
  },
  documentIconPending: {
    backgroundColor: '#FEF3C7',
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  documentSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  viewButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
  },
  verifiedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  verifiedDateText: {
    fontSize: 11,
    color: '#047857',
  },
  pendingAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
  },
  pendingAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#FED7AA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#C2410C',
  },
  noCategoriesText: {
    fontSize: 14,
    color: '#6B7280',
  },
  bannerUploadContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  bannerUploadText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  bannerUploadSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
