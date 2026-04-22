import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, StatusBar, Modal, TextInput, ActivityIndicator, Image, Animated, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { User, MapPin, CreditCard, Bell, HelpCircle, Shield, ChevronRight, Store, Star, Package, Heart, Settings, Edit2, Power, X, Camera, RotateCcw, Clock, Gift, Truck, Wallet, MessageSquarePlus, ArrowRight, Lock } from 'lucide-react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { useSellerStore } from '../src/stores/sellerStore';
import { useWishlistStore } from '../src/stores/wishlistStore';
import { supabase } from '../src/lib/supabase';
import { COLORS } from '../src/constants/theme';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { ContributorBadge } from '../src/components/ContributorBadge';
import type { ContributorTier } from '../src/stores/commentStore';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, signOut, updateProfile, isGuest } = useAuthStore();
  const { seller } = useSellerStore();
  const wishlistItems = useWishlistStore(state => state.items);
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = COLORS.primary;

  const isSeller = user?.roles?.includes('seller') || (seller && seller.id === user?.id && !!seller.store_name);

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
  const [isSwitching, setIsSwitching] = React.useState(false);
  const avatarBase64Ref = React.useRef<{ base64: string; mimeType: string } | null>(null);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  
  // Seller Switch State
  const [switchModalVisible, setSwitchModalVisible] = React.useState(false);
  const [switchPassword, setSwitchPassword] = React.useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = React.useState(false);

  useEffect(() => {
    if (editModalVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(Dimensions.get('window').height);
    }
  }, [editModalVisible, slideAnim]);

  // Bazcoins State
  const [bazcoins, setBazcoins] = React.useState(0);
  const [totalOrders, setTotalOrders] = React.useState(0);
  const [contributorTier, setContributorTier] = React.useState<ContributorTier>('none');

  // Fetch Bazcoins and orders from Supabase
  React.useEffect(() => {
    if (!user?.id || isGuest) return;

    const fetchProfileData = async () => {
      try {
        // 1. Fetch Bazcoins
        const { data: buyerData } = await supabase
          .from('buyers')
          .select('bazcoins')
          .eq('id', user.id)
          .single();

        if (buyerData) setBazcoins(buyerData.bazcoins || 0);

        // 1b. Fetch Contributor Tier
        const { data: tierData } = await supabase
          .from('contributor_tiers')
          .select('tier')
          .eq('user_id', user.id)
          .single();

        if (tierData) setContributorTier(tierData.tier as ContributorTier);

        // 2. Fetch Total Order Count
        // We use { count: 'exact', head: true } to get the number of rows without downloading the data
        const { count, error: orderError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('buyer_id', user.id); // Use 'seller_id' if you want orders sold by this user

        if (!orderError && count !== null) {
          setTotalOrders(count);
        }

        // 3. Fetch Identities
        // (Moved to Settings)
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };

    fetchProfileData();

    // ... keep your existing realtime subscription for bazcoins ...
  }, [user?.id, isGuest]);

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
      // Store base64 for reliable upload via ref
      avatarBase64Ref.current = {
        base64: result.assets[0].base64 || '',
        mimeType: result.assets[0].mimeType || 'image/jpeg',
      };
    }
  };

  const uploadAvatar = async (uri: string, userId: string) => {
    try {
      const base64Data = avatarBase64Ref.current?.base64;
      const mimeType = avatarBase64Ref.current?.mimeType || 'image/jpeg';

      if (!base64Data) {
        throw new Error('No image data available. Please select the image again.');
      }

      // Convert base64 to ArrayBuffer (most reliable in React Native)
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Determine file extension from mime type
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
      };
      const fileExt = extMap[mimeType] || 'jpg';
      const fileName = `avatar_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(filePath, bytes.buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Clean up stored base64
      avatarBase64Ref.current = null;

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

      // 1. Update profiles table (first_name, last_name, phone — NO avatar_url)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editFirstName,
          last_name: editLastName,
          phone: editPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Update buyers table (avatar_url lives here)
      const { error: buyerError } = await supabase
        .from('buyers')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (buyerError) throw buyerError;

      const fullName = `${editFirstName} ${editLastName}`.trim();
      updateProfile({
        name: fullName,
        phone: editPhone,
        email: editEmail,
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
    firstName: user?.name.split(' ')[0] || 'BazaarX',
    lastName: user?.name.split(' ').length > 1 ? user?.name.split(' ').slice(1).join(' ') : '',
    email: user?.email || 'user@bazaarx.ph',
    phone: user?.phone || 'No phone number',
    memberSince: 'January 2024',
    totalOrders: totalOrders,
    loyaltyPoints: bazcoins,
    wishlistCount: wishlistItems.length,
  };

  // 1. Add state for dynamic counts
  const [orderCounts, setOrderCounts] = React.useState({
    toPay: 0,
    toShip: 0,
    toReceive: 0,
    toReview: 0,
  });

  // 2. Fetch counts from Supabase shipment_status
  React.useEffect(() => {
    if (!user?.id || isGuest) return;

    const fetchOrderCounts = async () => {
      try {
        const { data: orders, error } = await supabase
          .from('orders')
          .select('shipment_status')
          .eq('buyer_id', user.id);

        if (!error && orders) {
          const counts = { toPay: 0, toShip: 0, toReceive: 0, toReview: 0 };

          orders.forEach(order => {
            const status = order.shipment_status?.toLowerCase();
            if (['pending', 'pending_payment'].includes(status)) counts.toPay++;
            else if (['processing', 'ready_to_ship'].includes(status)) counts.toShip++;
            else if (['shipped', 'out_for_delivery'].includes(status)) counts.toReceive++;
            else if (['delivered', 'received'].includes(status)) counts.toReview++;
          });
          setOrderCounts(counts);
        }
      } catch (e) {
        console.error('Error fetching badge counts:', e);
      }
    };

    fetchOrderCounts();
  }, [user?.id, isGuest]);

  const OrderStatusItem = ({ icon: Icon, label, badge, onPress }: any) => (
    <Pressable style={styles.statusItem} onPress={onPress}>
      <View>
        <Icon size={28} color={COLORS.textHeadline} strokeWidth={1.5} />
        {badge > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.statusLabel}>{label}</Text>
    </Pressable>
  );



  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(); // Calls supabase.auth.signOut() + clears store
              // App.tsx's user watcher resets navigation to Splash → Login
            } catch (err) {
              Alert.alert('Error', 'Could not log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const accountMenuItems = [
    { icon: Clock, label: 'History', onPress: () => navigation.navigate('History') },
    { icon: Heart, label: 'Wishlist', onPress: () => navigation.navigate('Wishlist') },
    { icon: RotateCcw, label: 'My Returns', onPress: () => navigation.navigate('ReturnOrders') },
    { icon: MapPin, label: 'My Addresses', onPress: () => navigation.navigate('Addresses') },
    { icon: Store, label: 'Following Shops', onPress: () => navigation.navigate('FollowingShops') },
    { icon: Package, label: 'My Requests', onPress: () => navigation.navigate('MyRequests') },
  ];

  const settingsMenuItems = [
    { icon: CreditCard, label: 'Payment Methods', onPress: () => navigation.navigate('PaymentMethods') },
    { icon: Bell, label: 'Notifications', onPress: () => navigation.navigate('NotificationSettings') },
    { icon: Settings, label: 'Account Settings', onPress: () => navigation.navigate('Settings') },
  ];

  const supportMenuItems = [
    { icon: HelpCircle, label: 'Help & Support', onPress: () => navigation.navigate('HelpSupport') },
    { icon: Shield, label: 'Privacy Policy', onPress: () => navigation.navigate('PrivacyPolicy') },
  ];


  const handleSellerSwitch = async () => {
    // If we already know they are a seller, show the password gate
    if (isSeller) {
      setSwitchModalVisible(true);
      setSwitchPassword('');
      return;
    }

    // If not known locally, check with server
    setIsSwitching(true);
    try {
      const isActuallySeller = await useAuthStore.getState().checkForSellerAccount();

      if (isActuallySeller) {
        // If they just found out they are a seller, show the password gate
        setSwitchModalVisible(true);
        setSwitchPassword('');
      } else {
        // Really not a seller, go to registration choice
        navigation.navigate('BecomeSeller');
      }
    } catch (error) {
      console.error('Error switching to seller:', error);
      Alert.alert(
        'Connection Error',
        'Could not verify your seller account. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSwitching(false);
    }
  };

  const confirmSellerSwitch = async () => {
    if (!switchPassword.trim()) {
      Alert.alert('Error', 'Please enter your seller password');
      return;
    }

    setIsVerifyingPassword(true);
    try {
      // Verify using the seller credentials — same email, seller-specific password
      // (set during BecomeSellerScreen via supabase.auth.updateUser or seller/signup.tsx registration)
      const email = user?.email || '';
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: switchPassword,
      });

      if (signInError || !authData.user) {
        throw new Error('Incorrect seller password. Please use the password you created when registering as a seller.');
      }

      // Verify the account actually has a seller role in the DB
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('id, store_name, approval_status')
        .eq('id', authData.user.id)
        .single();

      if (sellerError || !sellerData) {
        throw new Error('No seller profile found for this account.');
      }

      // Password verified and seller exists — switch role
      setSwitchModalVisible(false);
      useAuthStore.getState().switchRole('seller');
      navigation.navigate('SellerStack');

    } catch (error: any) {
      Alert.alert('Access Denied', error.message || 'Incorrect seller password');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  if (!user || isGuest) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View
          style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: COLORS.primary }]}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <User size={50} color={BRAND_COLOR} strokeWidth={1.5} />
              </View>
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.userName, { color: '#FFFFFF' }]}>Guest User</Text>
              <Text style={[styles.userSub, { color: 'rgba(255, 255, 255, 0.8)' }]}>Welcome to BazaarX!</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.menuGroup, { marginTop: 20 }]}>
            {/* Main Actions for Guest */}
            <Text style={styles.groupTitle}>Account</Text>
            <View style={styles.card}>
              <Pressable style={[styles.menuItem, styles.borderBottom]} onPress={() => navigation.getParent()?.navigate('Login')}>
                <View style={styles.iconContainer}>
                  <User size={20} color={BRAND_COLOR} strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>Login / Sign Up</Text>
                <ChevronRight size={18} color={COLORS.textMuted} />
              </Pressable>

              <Pressable style={styles.menuItem} onPress={() => navigation.navigate('SellerAuthChoice')}>
                <View style={styles.iconContainer}>
                  <Store size={20} color={BRAND_COLOR} strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>Start Selling</Text>
                <ChevronRight size={18} color={COLORS.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.menuGroup}>
            <Text style={styles.groupTitle}>Support</Text>
            <View style={styles.card}>
              {supportMenuItems.map((item, i) => (
                <Pressable key={i} style={[styles.menuItem, i !== supportMenuItems.length - 1 && styles.borderBottom]} onPress={item.onPress}>
                  <View style={styles.iconContainer}>
                    <item.icon size={20} color={COLORS.textMuted} strokeWidth={2} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <ChevronRight size={18} color={COLORS.textMuted} />
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View
          style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: COLORS.primary }]}
        >
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
              <Text style={[styles.userName, { color: '#FFFFFF' }]}>{`${profile.firstName} ${profile.lastName}`.trim()}</Text>
              {contributorTier !== 'none' && (
                <View style={{ marginTop: 4, marginBottom: 2 }}>
                  <ContributorBadge tier={contributorTier} size="sm" />
                </View>
              )}
              {/* Integrated Stats */}
              <View style={styles.headerStatsRow}>
                <Pressable
                  style={({ pressed }) => [styles.headerStatItem, pressed && { opacity: 0.7 }]}
                  onPress={() => navigation.navigate('Orders', { initialTab: 'pending' })}
                >
                  <Text style={styles.headerStatVal}>{profile.totalOrders}</Text>
                  <Text style={styles.headerStatLabel}>Orders</Text>
                </Pressable>

                <View style={styles.headerStatDivider} />
                <Pressable
                  style={({ pressed }) => [styles.headerStatItem, pressed && { opacity: 0.7 }]}
                  onPress={() => Alert.alert('Bazcoins', `You have ${profile.loyaltyPoints} Bazcoins available to redeem!`)}
                >
                  <Text style={styles.headerStatVal}>{profile.loyaltyPoints}</Text>
                  <Text style={styles.headerStatLabel}>Bazcoins</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
        {/* My Purchases Section */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupTitle}>My Purchases</Text>
          <View style={styles.purchasesContainer}>
            <View style={styles.purchasesGrid}>
              {[
                { label: 'Pending', tab: 'pending', icon: Wallet },
                { label: 'Processing', tab: 'confirmed', icon: Package },
                { label: 'Shipped', tab: 'shipped', icon: Truck },
                { label: 'Delivered', tab: 'delivered', icon: Star, badge: 1 },
              ].map((item, idx) => (
                <Pressable
                  key={idx}
                  style={styles.purchaseItem}
                  onPress={() => navigation.navigate('Orders', { initialTab: item.tab as any })}
                >
                  <View style={styles.iconWrapper}>
                    <item.icon size={23} color={BRAND_COLOR} strokeWidth={2} />
                    {item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.purchaseLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* 3. MENU GROUPS (Neat White Cards) */}
        <View style={styles.menuGroup}>
          <Text style={styles.groupTitle}>Activity</Text>
          <View style={styles.card}>
            {accountMenuItems.map((item, i) => (
              <Pressable key={i} style={[styles.menuItem, i !== accountMenuItems.length - 1 && styles.borderBottom]} onPress={item.onPress}>
                <View style={styles.iconContainer}>
                  <item.icon size={20} color={BRAND_COLOR} strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight size={18} color={COLORS.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.menuGroup}>
          <Text style={styles.groupTitle}>Settings</Text>
          <View style={styles.card}>
            {settingsMenuItems.map((item, i) => (
              <Pressable key={i} style={[styles.menuItem, styles.borderBottom]} onPress={item.onPress}>
                <View style={styles.iconContainer}>
                  <item.icon size={20} color={BRAND_COLOR} strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight size={18} color={COLORS.textMuted} />
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
                  <item.icon size={20} color={BRAND_COLOR} strokeWidth={2} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight size={18} color={COLORS.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* 3.5 SELLING SWITCH (Moved to Footer) */}
        <Pressable
          style={styles.sellerPortalButton}
          onPress={handleSellerSwitch}
          disabled={isSwitching}
        >
          {isSwitching ? (
            <ActivityIndicator size="small" color="#D97706" />
          ) : (
            <Store size={20} color="#D97706" strokeWidth={2.5} />
          )}
          <Text style={styles.sellerPortalText}>
            {isSwitching ? 'Checking Account...' : (isSeller ? 'Switch to Seller Mode' : 'Start Selling')}
          </Text>
          {!isSwitching && <ArrowRight size={18} color="#D97706" />}
        </Pressable>

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
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                paddingBottom: insets.bottom + 20,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setEditModalVisible(false)}><X size={24} color={COLORS.textHeadline} /></Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Avatar Section */}
              <View style={styles.avatarSection}>
                <Pressable style={{ position: 'relative', marginBottom: 8 }} onPress={handlePickImage}>
                  <View style={styles.avatarContainer}>
                    {editAvatar ? (
                      <Image source={{ uri: editAvatar }} style={styles.avatarImageLarge} />
                    ) : (
                      <User size={50} color={BRAND_COLOR} />
                    )}
                  </View>
                  <View style={[styles.cameraBadge, { backgroundColor: BRAND_COLOR }]}>
                    <Camera size={14} color="#FFF" />
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
          </Animated.View>
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



      {/* SELLER SWITCH PASSWORD MODAL */}
      <Modal
        visible={switchModalVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setSwitchModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.centeredModalOverlay}
        >
          <View style={styles.passwordModalContent}>
            <View style={styles.passwordModalHeader}>
              <View style={styles.passwordIconContainer}>
                <Store size={24} color="#D97706" />
              </View>
              <Text style={styles.passwordModalTitle}>Switch to Seller Mode</Text>
              <Text style={styles.passwordModalSubtitle}>Enter the password you set when registering as a seller</Text>
            </View>

            <View style={styles.passwordInputContainer}>
              <View style={styles.passwordInputWrapper}>
                <Lock size={18} color={COLORS.gray400} style={{ marginRight: 12 }} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Seller password"
                  placeholderTextColor={COLORS.gray400}
                  value={switchPassword}
                  onChangeText={setSwitchPassword}
                  secureTextEntry
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.passwordModalActions}>
              <Pressable 
                style={styles.passwordCancelBtn} 
                onPress={() => setSwitchModalVisible(false)}
                disabled={isVerifyingPassword}
              >
                <Text style={styles.passwordCancelText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.passwordConfirmBtn, isVerifyingPassword && styles.disabledBtn]} 
                onPress={confirmSellerSwitch}
                disabled={isVerifyingPassword}
              >
                {isVerifyingPassword ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.passwordConfirmText}>Verify & Switch</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative'
  },
  avatarCircle: {
    width: 80,
    height: 80,
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
    width: 28,
    height: 28,
    borderRadius: 16,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary
  },
  headerInfo: {
    flex: 1,
    marginLeft: 20
  },
  userName: { fontSize: 22, fontWeight: '800', color: COLORS.textHeadline, marginBottom: 2 },
  userSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  headerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  headerStatItem: {
    alignItems: 'flex-start',
    marginRight: 12,
  },
  headerStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerStatDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 12,
  },

  // Order Status Styles
  statusItem: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  scrollContent: { paddingBottom: 40 },
  purchasesContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },

  viewHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewHistoryText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  purchasesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  purchaseItem: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32, // Reduced size as there's no bg
    height: 32,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 1,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  purchaseLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  menuGroup: { marginTop: 25, paddingHorizontal: 20 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: '#D97706', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 10, marginBottom: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 15, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textHeadline },

  // Footer & Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  sellerPortalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 8,
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D97706',
  },
  sellerPortalText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D97706',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  footer: { alignItems: 'center', marginTop: 30, gap: 4 },
  versionText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  footerText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },

  // Modal Styles (FIXED MISSING PROPERTIES)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textHeadline },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
  },
  avatarImageLarge: { width: '100%', height: '100%' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF'
  },
  changePhotoText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: COLORS.textHeadline
  },
  saveButton: {
    marginTop: 30, paddingVertical: 15, borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', elevation: 3
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },


  // Seller Password Modal Styles
  passwordModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  passwordModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  passwordIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  passwordModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textHeadline,
    marginBottom: 4,
  },
  passwordModalSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  passwordInputContainer: {
    marginBottom: 24,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderWidth: 1.5,
    borderColor: COLORS.gray100,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textHeadline,
  },
  passwordModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  passwordCancelBtn: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  passwordCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  passwordConfirmBtn: {
    flex: 2,
    height: 52,
    backgroundColor: '#D97706',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  passwordConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
