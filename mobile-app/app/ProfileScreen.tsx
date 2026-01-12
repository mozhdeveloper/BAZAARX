import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, MapPin, CreditCard, Bell, HelpCircle, Shield, ChevronRight, Store, Star, Package, Heart, Settings, Edit2, Power } from 'lucide-react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = '#FF5722';
  
  const profile = {
    firstName: user?.name.split(' ')[0] || 'Jonathan',
    lastName: user?.name.split(' ')[1] || 'Doe',
    email: user?.email || 'jonathan.doe@example.com',
    phone: user?.phone || '+63 912 345 6789',
    memberSince: 'January 2024',
    totalOrders: 12,
    loyaltyPoints: 1250,
    wishlistCount: 45,
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
    { icon: Heart, label: 'Wishlist', onPress: () => navigation.navigate('Shop', { category: 'wishlist' }) },
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. BRANDED ORANGE HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: BRAND_COLOR }]}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <User size={50} color={BRAND_COLOR} strokeWidth={1.5} />
            </View>
            <Pressable style={styles.editBtn}>
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
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: BRAND_COLOR }]}>{profile.totalOrders}</Text>
            <Text style={styles.statLab}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: BRAND_COLOR }]}>{profile.wishlistCount}</Text>
            <Text style={styles.statLab}>Wishlist</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: BRAND_COLOR }]}>{profile.loyaltyPoints}</Text>
            <Text style={styles.statLab}>Points</Text>
          </View>
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
    </View>
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
    elevation: 5
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
    borderColor: '#FF5722'
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
});