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
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
} from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export default function StoreProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = React.useState(true);
  const [seller, setSeller] = React.useState<any>(null);
  const [expandedSections, setExpandedSections] = React.useState({
    business: true,
    banking: false,
    categories: false,
    documents: false,
  });

  const [formData, setFormData] = useState({
    storeName: '',
    storeDescription: '',
    phone: '',
    ownerName: '',
    email: '',
  });

  const getSectionStatus = (data: any, fields: string[]) => {
    if (isVerified) return 'Verified';
    if (!data) return 'Action Required';

    const filledFields = fields.filter(field => !!data[field]);
    if (filledFields.length === 0) return 'Action Required';
    if (filledFields.length < fields.length) return 'Incomplete';
    return isPending ? 'Under Review' : 'Under Review';
  };

  const statusColors: any = {
    'Verified': '#10B981',
    'Under Review': '#F59E0B',
    'Incomplete': '#6366F1',
    'Action Required': '#EF4444',
  };

  const [businessForm, setBusinessForm] = useState({
    businessName: '',
    businessType: '',
    businessRegistrationNumber: '',
    taxIdNumber: '',
    businessAddress: '',
    city: '',
    province: '',
    postalCode: '',
  });

  const [bankingForm, setBankingForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
  });

  const [editSection, setEditSection] = useState<'basic' | 'business' | 'banking' | null>(null);
  const [storeLogoUri, setStoreLogoUri] = useState<string | null>(null);

  const fetchSellerData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Fetch seller data
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', user.id)
        .single();

      if (sellerError) {
        console.error('Error fetching seller:', sellerError);
        throw sellerError;
      }

      // Fetch profile data separately to avoid join issues
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        console.warn('Error fetching profile:', profileError);
        // Don't throw, just use what we have from seller
      }

      if (sellerData) {
        // Construct full name if available
        const profileName = profileData 
          ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()
          : null;

        const mergedData = {
          ...sellerData,
          owner_name: profileName || profileData?.first_name || sellerData.owner_name,
          email: profileData?.email || sellerData.email,
          phone: profileData?.phone || sellerData.phone,
        };
        
        setSeller(mergedData);
        setFormData({
          storeName: sellerData.store_name || '',
          storeDescription: sellerData.store_description || '',
          phone: mergedData.phone || '',
          ownerName: mergedData.owner_name || '',
          email: mergedData.email || '',
        });
        setBusinessForm({
          businessName: sellerData.business_name || '',
          businessType: sellerData.business_type || '',
          businessRegistrationNumber: sellerData.business_registration_number || '',
          taxIdNumber: sellerData.tax_id_number || '',
          businessAddress: sellerData.business_address || '',
          city: sellerData.city || '',
          province: sellerData.province || '',
          postalCode: sellerData.postal_code || '',
        });
        setBankingForm({
          bankName: sellerData.bank_name || '',
          accountName: sellerData.account_name || '',
          accountNumber: sellerData.account_number || '',
        });
        setStoreLogoUri(sellerData.avatar_url || null);
      }
    } catch (error: any) {
      console.error('Error fetching seller data:', error);
      Alert.alert('Error', 'Failed to fetch seller data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    let sellersSubscription: any;
    let profilesSubscription: any;

    fetchSellerData();

    const setupSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      sellersSubscription = supabase
        .channel('sellers-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sellers', filter: `id=eq.${user.id}` },
          (payload) => {
            if (payload.new) {
              setSeller((prev: any) => ({ ...prev, ...payload.new }));
            }
          }
        )
        .subscribe();

      profilesSubscription = supabase
        .channel('profiles-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            if (payload.new && Object.keys(payload.new).length > 0) {
              const newData = payload.new as any;
              setSeller((prev: any) => ({
                ...prev,
                owner_name: newData.full_name || `${newData.first_name || ''} ${newData.last_name || ''}`.trim(),
                email: newData.email || '',
                phone: newData.phone || '',
              }));
              setFormData((prev) => ({
                ...prev,
                ownerName: newData.full_name || `${newData.first_name || ''} ${newData.last_name || ''}`.trim(),
                email: newData.email || '',
                phone: newData.phone || '',
              }));
            }
          }
        )
        .subscribe();
    };

    setupSubscriptions();

    return () => {
      if (sellersSubscription) supabase.removeChannel(sellersSubscription);
      if (profilesSubscription) supabase.removeChannel(profilesSubscription);
    };
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isVerified = seller?.is_verified || seller?.approval_status === 'approved';
  const isPending = seller?.approval_status === 'pending';
  const isRejected = seller?.approval_status === 'rejected';

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
    ]);
  };

  const [newCategory, setNewCategory] = useState('');

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const currentCategories = seller?.store_category || [];
      if (currentCategories.includes(newCategory.trim())) {
        Alert.alert('Info', 'Category already exists');
        return;
      }
      const updatedCategories = [...currentCategories, newCategory.trim()];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('sellers')
        .update({ store_category: updatedCategories })
        .eq('id', user.id);

      if (error) throw error;

      setSeller({ ...seller, store_category: updatedCategories });
      setNewCategory('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const handleRemoveCategory = async (category: string) => {
    try {
      const updatedCategories = (seller?.store_category || []).filter((c: string) => c !== category);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('sellers')
        .update({ store_category: updatedCategories })
        .eq('id', user.id);

      if (error) throw error;

      setSeller({ ...seller, store_category: updatedCategories });
    } catch (error) {
      Alert.alert('Error', 'Failed to remove category');
    }
  };

  const handleSaveBasic = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update basic seller info
      const { error: sellerError } = await supabase
        .from('sellers')
        .update({
          store_name: formData.storeName,
          store_description: formData.storeDescription,
        })
        .eq('id', user.id);

      if (sellerError) throw sellerError;

      // Update profile info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.ownerName,
          email: formData.email,
          phone: formData.phone,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setSeller((prev: any) => ({
        ...prev,
        store_name: formData.storeName,
        store_description: formData.storeDescription,
        owner_name: formData.ownerName,
        email: formData.email,
        phone: formData.phone,
      }));
      setEditSection(null);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Save basic error:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleSaveBusiness = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sellers')
        .update({
          business_name: businessForm.businessName,
          business_type: businessForm.businessType,
          business_registration_number: businessForm.businessRegistrationNumber,
          tax_id_number: businessForm.taxIdNumber,
          business_address: businessForm.businessAddress,
          city: businessForm.city,
          province: businessForm.province,
          postal_code: businessForm.postalCode,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSeller((prev: any) => ({ ...prev, ...data }));
        Alert.alert('Success', 'Business information updated');
      }
      setEditSection(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to save business information');
    }
  };

  const handleSaveBanking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sellers')
        .update({
          bank_name: bankingForm.bankName,
          account_name: bankingForm.accountName,
          account_number: bankingForm.accountNumber,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSeller((prev: any) => ({ ...prev, ...data }));
        Alert.alert('Success', 'Banking information updated');
      }
      setEditSection(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to save banking information');
    }
  };

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const handleDocumentUpload = async (docKey: string, columnName: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploadingDoc(docKey);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${docKey}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Use FileSystem to read as base64 for robust upload
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64' as any,
      });
      const arrayBuffer = decode(base64);

      const { error: uploadError } = await supabase.storage
        .from('seller-documents')
        .upload(filePath, arrayBuffer, {
          contentType: file.mimeType || 'application/octet-stream',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('seller-documents')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('sellers')
        .update({ [columnName]: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSeller((prev: any) => ({ ...prev, [columnName]: publicUrl }));
      Alert.alert('Success', `${docKey} uploaded successfully`);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', `Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSave = () => {
    if (editSection === 'basic') handleSaveBasic();
    else if (editSection === 'business') handleSaveBusiness();
    else if (editSection === 'banking') handleSaveBanking();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Loading Profile...</Text>
      </View>
    );
  }

  if (!seller) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <AlertCircle size={48} color="#EF4444" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>Store Not Found</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 }}>We couldn't retrieve your store profile information.</Text>
        <TouchableOpacity
          style={[styles.saveButton, { marginTop: 24, paddingHorizontal: 32 }]}
          onPress={fetchSellerData}
        >
          <Text style={styles.saveButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - Edge to Edge Orange - Match orders/dashboard style */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color="#1F2937" strokeWidth={2.5} />
          </Pressable>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Store Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your business details</Text>
          </View>
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
              {storeLogoUri && typeof storeLogoUri === 'string' && storeLogoUri.trim() ? (
                <Image source={{ uri: storeLogoUri }} style={styles.logoContainer} />
              ) : (
                <View style={styles.logoContainer}>
                  <Text style={styles.logoText}>{seller?.store_name?.charAt(0)}</Text>
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
              <Text style={styles.storeName} numberOfLines={1}>{seller?.store_name || 'Your Store'}</Text>
              <View style={styles.storeUrlRow}>
                <Globe size={12} color="#6B7280" strokeWidth={2} />
                <Text style={styles.storeUrl} numberOfLines={1}>bazaarph.com/store/{seller?.id}</Text>
              </View>
            </View>
          </View>

          {/* Row 2: Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Award size={16} color="#6B7280" strokeWidth={2} />
              <Text style={styles.statLabel}>Rating</Text>
              <Text style={styles.statValue}>{seller?.rating || '0'}/5</Text>
            </View>
            <View style={styles.statCard}>
              <Package size={16} color="#6B7280" strokeWidth={2} />
              <Text style={styles.statLabel}>Products</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
            <View style={styles.statCard}>
              <TrendingUp size={16} color="#6B7280" strokeWidth={2} />
              <Text style={styles.statLabel}>Sales</Text>
              <Text style={styles.statValue}>{seller?.total_sales || 0}</Text>
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
              <User size={20} color="#D97706" strokeWidth={2} />
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
                <Text style={styles.infoValue}>{seller?.owner_name || 'Not provided'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{seller?.email}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{seller?.phone || 'Not provided'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Store Name</Text>
                <Text style={styles.infoValue}>{seller?.store_name || 'Your Store'}</Text>
              </View>
              <View style={[styles.infoItem, styles.infoItemFull]}>
                <Text style={styles.infoLabel}>Store Description</Text>
                <Text style={styles.infoValue}>{seller?.store_description || 'No description added'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Business Information */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('business')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleRow}>
              <Building2 size={20} color="#D97706" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Business Information</Text>
              {(() => {
                const status = getSectionStatus(seller, ['business_name', 'business_type', 'business_registration_number', 'tax_id_number', 'business_address', 'city', 'province']);
                return (
                  <View style={styles.sectionStatus}>
                    <View style={[styles.statusIndicator, { backgroundColor: statusColors[status] }]} />
                    <Text style={[styles.statusText, { color: statusColors[status] }]}>
                      {status}
                    </Text>
                  </View>
                );
              })()}
            </View>
            {expandedSections.business ? <ChevronUp size={20} color="#6B7280" /> : <ChevronDown size={20} color="#6B7280" />}
          </TouchableOpacity>

          {expandedSections.business && (
            <>
              <View style={{ marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {!isVerified && editSection !== 'business' && (
                  <TouchableOpacity
                    onPress={() => setEditSection('business')}
                    style={styles.editIconButton}
                  >
                    <Edit2 size={16} color="#6B7280" strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>

              {editSection === 'business' ? (
                <View style={styles.formContent}>
                  <View style={styles.formFieldFull}>
                    <Text style={styles.fieldLabel}>Business Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={businessForm.businessName}
                      onChangeText={(text) => setBusinessForm({ ...businessForm, businessName: text })}
                      placeholder="As registered with DTI/SEC"
                    />
                  </View>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.fieldLabel}>Business Type</Text>
                      <TextInput
                        style={styles.textInput}
                        value={businessForm.businessType}
                        onChangeText={(text) => setBusinessForm({ ...businessForm, businessType: text })}
                        placeholder="e.g. Sole Proprietorship"
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.fieldLabel}>Reg Number</Text>
                      <TextInput
                        style={styles.textInput}
                        value={businessForm.businessRegistrationNumber}
                        onChangeText={(text) => setBusinessForm({ ...businessForm, businessRegistrationNumber: text })}
                        placeholder="Registration #"
                      />
                    </View>
                  </View>
                  <View style={styles.formFieldFull}>
                    <Text style={styles.fieldLabel}>Tax ID Number (TIN)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={businessForm.taxIdNumber}
                      onChangeText={(text) => setBusinessForm({ ...businessForm, taxIdNumber: text })}
                      placeholder="000-000-000-000"
                    />
                  </View>
                  <View style={styles.formFieldFull}>
                    <Text style={styles.fieldLabel}>Business Address</Text>
                    <TextInput
                      style={styles.textInput}
                      value={businessForm.businessAddress}
                      onChangeText={(text) => setBusinessForm({ ...businessForm, businessAddress: text })}
                      placeholder="Street, Barangay"
                    />
                  </View>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.fieldLabel}>City</Text>
                      <TextInput
                        style={styles.textInput}
                        value={businessForm.city}
                        onChangeText={(text) => setBusinessForm({ ...businessForm, city: text })}
                        placeholder="City"
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.fieldLabel}>Province</Text>
                      <TextInput
                        style={styles.textInput}
                        value={businessForm.province}
                        onChangeText={(text) => setBusinessForm({ ...businessForm, province: text })}
                        placeholder="Province"
                      />
                    </View>
                  </View>
                  <View style={styles.formActions}>
                    <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                      <Text style={styles.saveButtonText}>Save Business Info</Text>
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
                    <Text style={styles.infoLabel}>Business Name</Text>
                    <Text style={styles.infoValue}>{seller?.business_name || 'Not provided'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Business Type</Text>
                    <Text style={styles.infoValue}>{seller?.business_type || 'Not provided'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Registration Number</Text>
                    <Text style={[styles.infoValue, styles.monoText]}>{seller?.business_registration_number || 'Not provided'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Tax ID Number (TIN)</Text>
                    <Text style={[styles.infoValue, styles.monoText]}>{seller?.tax_id_number || 'Not provided'}</Text>
                  </View>
                  <View style={[styles.infoItem, styles.infoItemFull]}>
                    <Text style={styles.infoLabel}>Business Address</Text>
                    <Text style={styles.infoValue}>
                      {seller?.business_address
                        ? `${seller?.business_address}, ${seller?.city}, ${seller?.province} ${seller?.postal_code || ''}`
                        : 'Not provided'}
                    </Text>
                  </View>
                </View>
              )}

              {isVerified && (
                <View style={[styles.verifiedAlert, { marginTop: 16 }]}>
                  <CheckCircle size={16} color="#10B981" strokeWidth={2} />
                  <Text style={styles.verifiedAlertText}>
                    Verified business details cannot be edited.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Banking Information */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('banking')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleRow}>
              <CreditCard size={20} color="#D97706" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Banking Information</Text>
              <View style={styles.sectionStatus}>
                {(() => {
                  const status = getSectionStatus(seller, ['bank_name', 'account_name', 'account_number']);
                  return (
                    <>
                      <View style={[styles.statusIndicator, { backgroundColor: statusColors[status] }]} />
                      <Text style={[styles.statusText, { color: statusColors[status] }]}>
                        {status}
                      </Text>
                    </>
                  );
                })()}
              </View>
            </View>
            {expandedSections.banking ? <ChevronUp size={20} color="#6B7280" /> : <ChevronDown size={20} color="#6B7280" />}
          </TouchableOpacity>

          {expandedSections.banking && (
            <>
              <View style={{ marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {!isVerified && editSection !== 'banking' && (
                  <TouchableOpacity
                    onPress={() => setEditSection('banking')}
                    style={styles.editIconButton}
                  >
                    <Edit2 size={16} color="#6B7280" strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>

              {editSection === 'banking' ? (
                <View style={styles.formContent}>
                  <View style={styles.formFieldFull}>
                    <Text style={styles.fieldLabel}>Bank Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={bankingForm.bankName}
                      onChangeText={(text) => setBankingForm({ ...bankingForm, bankName: text })}
                      placeholder="e.g. BDO, BPI, GCash"
                    />
                  </View>
                  <View style={styles.formFieldFull}>
                    <Text style={styles.fieldLabel}>Account Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={bankingForm.accountName}
                      onChangeText={(text) => setBankingForm({ ...bankingForm, accountName: text })}
                      placeholder="Full Name on Account"
                    />
                  </View>
                  <View style={styles.formFieldFull}>
                    <Text style={styles.fieldLabel}>Account Number</Text>
                    <TextInput
                      style={styles.textInput}
                      value={bankingForm.accountNumber}
                      onChangeText={(text) => setBankingForm({ ...bankingForm, accountNumber: text })}
                      placeholder="Account Number"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formActions}>
                    <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                      <Text style={styles.saveButtonText}>Save Banking Info</Text>
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
                    <Text style={styles.infoLabel}>Bank Name</Text>
                    <Text style={styles.infoValue}>{seller?.bank_name || 'Not provided'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Account Name</Text>
                    <Text style={styles.infoValue}>{seller?.account_name || 'Not provided'}</Text>
                  </View>
                  <View style={[styles.infoItem, styles.infoItemFull]}>
                    <Text style={styles.infoLabel}>Account Number</Text>
                    <Text style={[styles.infoValue, styles.monoText]}>
                      {seller?.account_number ? `****${seller.account_number.slice(-4)}` : 'Not provided'}
                    </Text>
                  </View>
                </View>
              )}

              {isVerified && (
                <View style={[styles.verifiedAlert, { marginTop: 16 }]}>
                  <CheckCircle size={16} color="#10B981" strokeWidth={2} />
                  <Text style={styles.verifiedAlertText}>
                    Banking details are secured and locked.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Verification Documents */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('documents')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleRow}>
              <FileText size={20} color="#D97706" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Verification Documents</Text>
              <View style={styles.sectionStatus}>
                {(() => {
                  const requiredDocs = ['business_permit_url', 'valid_id_url', 'proof_of_address_url', 'dti_registration_url', 'tax_id_url'];
                  const status = getSectionStatus(seller, requiredDocs);
                  return (
                    <>
                      <View style={[styles.statusIndicator, { backgroundColor: statusColors[status] }]} />
                      <Text style={[styles.statusText, { color: statusColors[status] }]}>
                        {status}
                      </Text>
                    </>
                  );
                })()}
              </View>
            </View>
            {expandedSections.documents ? <ChevronUp size={20} color="#6B7280" /> : <ChevronDown size={20} color="#6B7280" />}
          </TouchableOpacity>

          {expandedSections.documents && (
            <>
              {[
                { name: 'Business Permit', key: 'business_permit_url', label: 'Business Permit/DTI' },
                { name: 'Government ID', key: 'valid_id_url', label: 'Government-Issued ID' },
                { name: 'Proof of Address', key: 'proof_of_address_url', label: 'Proof of Address' },
                { name: 'DTI/SEC', key: 'dti_registration_url', label: 'DTI/SEC Registration' },
                { name: 'BIR TIN', key: 'tax_id_url', label: 'BIR Tax ID (TIN)' },
              ].map((doc) => (
                <View key={doc.key} style={styles.documentCard}>
                  <View style={styles.documentHeader}>
                    <View style={styles.documentIconContainer}>
                      <View style={[styles.documentIcon, seller?.[doc.key] ? styles.documentIconVerified : styles.documentIconPending]}>
                        <FileText size={20} color={seller?.[doc.key] ? '#10B981' : '#F59E0B'} strokeWidth={2} />
                      </View>
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentTitle}>{doc.label}</Text>
                        <Text style={styles.documentSubtitle}>
                          {seller?.[doc.key] ? 'Document uploaded' : 'Not Provided'}
                        </Text>
                      </View>
                    </View>
                    {!isVerified && (
                      <TouchableOpacity
                        style={[styles.viewButton, { backgroundColor: uploadingDoc === doc.name ? '#F3F4F6' : '#FFFFFF' }]}
                        onPress={() => handleDocumentUpload(doc.name, doc.key)}
                        disabled={!!uploadingDoc}
                      >
                        {uploadingDoc === doc.name ? (
                          <Clock size={16} color="#6B7280" />
                        ) : (
                          <Upload size={16} color="#6B7280" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              {!isVerified && !isPending && (
                <View style={[styles.pendingAlert, { marginTop: 8 }]}>
                  <AlertCircle size={16} color="#F59E0B" strokeWidth={2} />
                  <Text style={styles.pendingAlertText}>
                    Ensure all documents are clear and valid. Verification takes 1-2 business days.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Store Categories */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('categories')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleRow}>
              <Package size={20} color="#D97706" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Store Categories</Text>
            </View>
            {expandedSections.categories ? <ChevronUp size={20} color="#6B7280" /> : <ChevronDown size={20} color="#6B7280" />}
          </TouchableOpacity>

          {expandedSections.categories && (
            <>
              {!isVerified && (
                <View style={styles.categoryInputRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    value={newCategory}
                    onChangeText={setNewCategory}
                    placeholder="Add a category..."
                  />
                  <TouchableOpacity
                    style={styles.addCategoryButton}
                    onPress={handleAddCategory}
                  >
                    <Text style={styles.addCategoryText}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.categoriesContainer}>
                {seller?.store_category && seller.store_category.length > 0 ? (
                  seller.store_category.map((category: string, index: number) => (
                    <View key={index} style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{category}</Text>
                      {!isVerified && (
                        <TouchableOpacity
                          onPress={() => handleRemoveCategory(category)}
                          style={styles.removeCategoryButton}
                        >
                          <X size={12} color="#C2410C" strokeWidth={3} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.noCategoriesText}>No categories selected</Text>
                )}
              </View>
              {!isVerified && seller?.store_category?.length > 0 && (
                <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8 }}>Click (X) to remove a category</Text>
              )}
            </>
          )}
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
    backgroundColor: '#FFF4EC',
  },
  headerContainer: {
    backgroundColor: '#FFF4EC',
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 20,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 10,
    borderRadius: 12,
  },
  headerTitleRow: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
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
    backgroundColor: '#D97706',
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
    backgroundColor: '#D97706',
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
    backgroundColor: '#FFF4EC',
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
    backgroundColor: '#D97706',
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
  rejectionAlert: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEF2F2',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  rejectionText: {
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },
  sectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  addCategoryButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  addCategoryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  removeCategoryButton: {
    marginLeft: 8,
    backgroundColor: 'rgba(194, 65, 12, 0.1)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
