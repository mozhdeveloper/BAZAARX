import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, StatusBar, Modal, TextInput, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { User, MapPin, CreditCard, Bell, HelpCircle, Shield, ChevronRight, Store, Star, Package, Heart, Settings, Edit2, Power, X, Camera, RotateCcw, Clock } from 'lucide-react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { useWishlistStore } from '../src/stores/wishlistStore';
import { supabase } from '../src/lib/supabase';
import { COLORS } from '../src/constants/theme';
import { decode } from 'base64-arraybuffer';
import { GuestLoginModal } from '../src/components/GuestLoginModal';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout, updateProfile, isGuest } = useAuthStore();
  const wishlistItems = useWishlistStore(state => state.items);
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = COLORS.primary;

  // Guest Modal State
  const [showGuestModal, setShowGuestModal] = React.useState(false);

  // Edit State
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [editFirstName, setEditFirstName] = React.useState('');
  const [editLastName, setEditLastName] = React.useState('');
  const [editPhone, setEditPhone] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editAvatar, setEditAvatar] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);



  const openEditModal = () => {
    setEditFirstName(user?.name.split(' ')[0] || '');
    setEditLastName(user?.name.split(' ').slice(1).join(' ') || '');
    setEditPhone(user?.phone || '');
    setEditEmail(user?.email || '');
    setEditAvatar(user?.avatar || '');
    setEditModalVisible(true);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setEditAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string, userId: string) => {
    try {
      // 1. Read file as base64 (ImagePicker can return base64)
      // Since we requested base64 in launchImageLibraryAsync, looking for asset.base64
      //However, if we only have URI, we need to read it. 
      // Simplified approach: Re-read or assume we can upload via FormData if supported, 
      // but React Native with Supabase usually works best with ArrayBuffer or Blob.
      
      // Let's use the fetch-blob polyfill method which is reliable in RN
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = uri.split('.').pop();
      const fileName = `avatar_${userId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-avatars') // consistency with storage.ts
        .upload(filePath, blob, {
          contentType: 'image/jpeg', // Force jpeg if we can't detect
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('profile-avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  const handleSaveProfile = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (!user?.id) return;

    setIsSaving(true);
    try {
      let avatarUrl = editAvatar;

      // Check if avatar has changed and is a local file (file://)
      if (editAvatar && editAvatar.startsWith('file://')) {
        avatarUrl = await uploadAvatar(editAvatar, user.id);
      }

      const updates = {
        full_name: `${editFirstName} ${editLastName}`.trim(),
        phone: editPhone,
        avatar_url: avatarUrl,
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      updateProfile({
        name: updates.full_name,
        phone: updates.phone,
        email: editEmail, // Email usually doesn't change here without re-auth, but keep it
        avatar: avatarUrl
      });

      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (error) {
       Alert.alert('Error', 'Failed to update profile');
       console.error(error);
    } finally {
       setIsSaving(false);
    }
  };

  const profile = {
    firstName: user?.name.split(' ')[0] || 'Jonathan',
    lastName: user?.name.split(' ')[1] || 'Doe',
    email: user?.email || 'jonathan.doe@example.com',
    phone: user?.phone || '+63 912 345 6789',
    memberSince: 'January 2024',
    totalOrders: 12,
    loyaltyPoints: 1250,
    wishlistCount: wishlistItems.length,
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.getParent()?.navigate('Login');
          },
        },
      ]
    );
  };

  const accountMenuItems = [
    { icon: Package, label: 'My Orders', onPress: () => navigation.navigate('Orders', {}) },
    { icon: Clock, label: 'History', onPress: () => navigation.navigate('History') },
    { icon: Heart, label: 'Wishlist', onPress: () => navigation.navigate('Wishlist') },
    { icon: MapPin, label: 'My Addresses', onPress: () => navigation.navigate('Addresses') },
    { icon: Store, label: 'Following Shops', onPress: () => navigation.navigate('FollowingShops') },
  ];

  const settingsMenuItems = [
    { icon: CreditCard, label: 'Payment Methods', onPress: () => navigation.navigate('PaymentMethods') },
    { icon: Bell, label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
    { icon: Settings, label: 'Account Settings', onPress: () => navigation.navigate('Settings') },
  ];

  const supportMenuItems = [
    { icon: HelpCircle, label: 'Help & Support', onPress: () => navigation.navigate('HelpSupport') },
    { icon: Shield, label: 'Privacy Policy', onPress: () => navigation.navigate('PrivacyPolicy') },
  ];


  if (isGuest) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: BRAND_COLOR }]}>
          <View style={styles.profileHeader}>
             <View style={styles.avatarWrapper}>
                <View style={styles.avatarCircle}>
                  <User size={50} color={BRAND_COLOR} strokeWidth={1.5} />
                </View>
             </View>
             <View style={styles.headerInfo}>
               <Text style={styles.userName}>Guest User</Text>
               <Text style={styles.userSub}>Welcome to BazaarX!</Text>
             </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Main Actions for Guest */}
          <View style={styles.card}>
             <Pressable style={[styles.menuItem, styles.borderBottom]} onPress={() => navigation.getParent()?.navigate('Login')}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFF5F0' }]}>
                   <User size={20} color={BRAND_COLOR} strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>Login / Sign Up</Text>
                <ChevronRight size={18} color="#D1D5DB" />
             </Pressable>

             <Pressable style={styles.menuItem} onPress={() => navigation.navigate('SellerLogin')}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFF5F0' }]}>
                   <Store size={20} color={BRAND_COLOR} strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>Start Selling</Text>
                <ChevronRight size={18} color="#D1D5DB" />
             </Pressable>
          </View>

           <View style={[styles.menuGroup, { marginTop: 25 }]}>
              <Text style={styles.groupTitle}>Support</Text>
              <View style={styles.card}>
                {supportMenuItems.map((item, i) => (
                  <Pressable key={i} style={[styles.menuItem, i !== supportMenuItems.length - 1 && styles.borderBottom]} onPress={item.onPress}>
                    <View style={styles.iconContainer}>
                      <item.icon size={20} color="#6B7280" strokeWidth={2} />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <ChevronRight size={18} color="#D1D5DB" />
                  </Pressable>
                ))}
              </View>
           </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 1. BRANDED ORANGE HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: BRAND_COLOR }]}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <User size={50} color={BRAND_COLOR} strokeWidth={1.5} />
              )}
            </View>
            <Pressable style={styles.editBtn} onPress={openEditModal}>
              <Edit2 size={14} color={BRAND_COLOR} strokeWidth={2.5} />
            </Pressable>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{profile.firstName} {profile.lastName}</Text>
            <Text style={styles.userSub}>{profile.email}</Text>
            <Text style={styles.userSub}>{profile.phone}</Text>
          </View>
        </View>

        {/* 2. STATS ROW (Integrated into Header Design) */}
        <View style={styles.statsCard}>
          <Pressable
            style={({ pressed }) => [styles.statBox, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('Orders', { initialTab: 'toPay' })}
          >
            <Text style={[styles.statVal, { color: BRAND_COLOR }]}>{profile.totalOrders}</Text>
            <Text style={styles.statLab}>Orders</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable
            style={({ pressed }) => [styles.statBox, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('Wishlist')}
          >
            <Text style={[styles.statVal, { color: BRAND_COLOR }]}>{profile.wishlistCount}</Text>
            <Text style={styles.statLab}>Wishlist</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable
            style={({ pressed }) => [styles.statBox, pressed && { opacity: 0.7 }]}
            onPress={() => Alert.alert('Bazcoins', `You have ${profile.loyaltyPoints} Bazcoins available to redeem!`)}
          >
            <Text style={[styles.statVal, { color: '#EAB308' }]}>{profile.loyaltyPoints}</Text>
            <Text style={styles.statLab}>Bazcoins</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* 3. MENU GROUPS (Neat White Cards) */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupTitle}>Activity</Text>
          <View style={styles.card}>
            {accountMenuItems.map((item, i) => (
              <Pressable key={i} style={[styles.menuItem, i !== accountMenuItems.length - 1 && styles.borderBottom]} onPress={item.onPress}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFF5F0' }]}>
                  <item.icon size={20} color={BRAND_COLOR} strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight size={18} color="#D1D5DB" />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.menuGroup}>
          <Text style={styles.groupTitle}>Selling</Text>
          <View style={styles.card}>
             <Pressable style={styles.menuItem} onPress={() => navigation.navigate('SellerLogin')}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFF5F0' }]}>
                   <Store size={20} color={BRAND_COLOR} strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>Start Selling</Text>
                <ChevronRight size={18} color="#D1D5DB" />
             </Pressable>
          </View>
        </View>

        <View style={styles.menuGroup}>
          <Text style={styles.groupTitle}>Settings</Text>
          <View style={styles.card}>
            {settingsMenuItems.map((item, i) => (
              <Pressable key={i} style={[styles.menuItem, i !== settingsMenuItems.length - 1 && styles.borderBottom]} onPress={item.onPress}>
                <View style={styles.iconContainer}>
                  <item.icon size={20} color="#6B7280" strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight size={18} color="#D1D5DB" />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.menuGroup}>
          <Text style={styles.groupTitle}>Support</Text>
          <View style={styles.card}>
            {supportMenuItems.map((item, i) => (
              <Pressable key={i} style={[styles.menuItem, i !== supportMenuItems.length - 1 && styles.borderBottom]} onPress={item.onPress}>
                <View style={styles.iconContainer}>
                  <item.icon size={20} color="#6B7280" strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight size={18} color="#D1D5DB" />
              </Pressable>
            ))}
          </View>
        </View>

        {/* 4. LOGOUT BUTTON */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Power size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>Member since {profile.memberSince}</Text>
        </View>
      </ScrollView>


      {/* EDIT PROFILE MODAL */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true} onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setEditModalVisible(false)}><X size={24} color="#1F2937" /></Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Avatar Section */}
              <View style={styles.avatarSection}>
                <Pressable style={styles.avatarContainer} onPress={handlePickImage}>
                  {editAvatar ? (
                    <Image source={{ uri: editAvatar }} style={styles.avatarImageLarge} />
                  ) : (
                    <User size={50} color={BRAND_COLOR} />
                  )}
                  <View style={[styles.cameraBadge, { backgroundColor: BRAND_COLOR }]}>
                    <Camera size={12} color="#FFF" />
                  </View>
                </Pressable>
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </View>

              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput style={styles.input} value={editFirstName} onChangeText={setEditFirstName} placeholder="First Name" />

              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput style={styles.input} value={editLastName} onChangeText={setEditLastName} placeholder="Last Name" />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Phone" keyboardType="phone-pad" />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} placeholder="Email" keyboardType="email-address" />

              <Pressable style={[styles.saveButton, { backgroundColor: BRAND_COLOR }]} onPress={handleSaveProfile} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <GuestLoginModal
        visible={showGuestModal}
        onClose={() => {
          // Just navigate home without hiding the modal first to prevent revealing the profile screen
          navigation.navigate('Home');
        }}
        message="Sign up to view your profile and orders."
        hideCloseButton={true}
        cancelText="Go back to Home"
      />
    </View >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    paddingHorizontal: 25,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  avatarWrapper: { position: 'relative' },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,

    elevation: 5,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  editBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary
  },
  headerInfo: { marginLeft: 20 },
  userName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  userSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLab: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  statDivider: { width: 1, height: '50%', backgroundColor: '#F3F4F6', alignSelf: 'center' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
  menuGroup: { marginBottom: 25 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 10, marginBottom: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 15, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  iconContainer: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#374151' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2'
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },

  footer: { alignItems: 'center', marginTop: 30, gap: 4 },
  versionText: { fontSize: 12, color: '#D1D5DB', fontWeight: '600' },
  footerText: { fontSize: 12, color: '#D1D5DB', fontWeight: '500' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  avatarImageLarge: { width: '100%', height: '100%' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  changePhotoText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: '#1F2937' },
  saveButton: { marginTop: 30, paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});