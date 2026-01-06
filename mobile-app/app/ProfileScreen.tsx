import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { User, MapPin, CreditCard, Bell, HelpCircle, Shield, LogOut, ChevronRight, Store, Star, Package, Heart, Settings, Edit2, Power } from 'lucide-react-native';
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
  
  // Dummy profile data matching web version (use auth store user if available)
  const profile = {
    firstName: user?.name.split(' ')[0] || 'John',
    lastName: user?.name.split(' ')[1] || 'Doe',
    email: user?.email || 'john.doe@example.com',
    phone: user?.phone || '+63 912 345 6789',
    memberSince: 'January 2024',
    totalOrders: 12,
    totalSpent: 45280,
    loyaltyPoints: 1250,
    averageRating: 4.8,
    wishlistCount: 45,
    followingCount: 8,
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
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
    { icon: Package, label: 'My Orders', onPress: () => navigation.navigate('Orders', {}), color: '#FF5722' },
    { icon: Heart, label: 'Wishlist', onPress: () => navigation.navigate('Shop', { category: 'wishlist' }), color: '#FF5722' },
    { icon: MapPin, label: 'My Addresses', onPress: () => navigation.navigate('Addresses'), color: '#FF5722' },
    { icon: Store, label: 'Following Shops', onPress: () => navigation.navigate('FollowingShops'), color: '#FF5722' },
  ];

  const settingsMenuItems = [
    { icon: CreditCard, label: 'Payment Methods', onPress: () => navigation.navigate('PaymentMethods'), color: '#6B7280' },
    { icon: Bell, label: 'Notifications', onPress: () => navigation.navigate('Notifications'), color: '#6B7280' },
    { icon: Settings, label: 'Account Settings', onPress: () => navigation.navigate('Settings'), color: '#6B7280' },
  ];

  const supportMenuItems = [
    { icon: HelpCircle, label: 'Help & Support', onPress: () => navigation.navigate('HelpSupport'), color: '#6B7280' },
    { icon: Shield, label: 'Privacy Policy', onPress: () => navigation.navigate('PrivacyPolicy'), color: '#6B7280' },
  ];

  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Orange Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          {/* Profile Section Inside Orange Header */}
          <View style={styles.profileContainer}>
            {/* Avatar with White Border */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <User size={56} color="#FF5722" strokeWidth={1.5} />
              </View>
              {/* White Edit Button */}
              <Pressable style={styles.editIconButton}>
                <Edit2 size={16} color="#FF5722" strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* User Info */}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{profile.firstName} {profile.lastName}</Text>
              <Text style={styles.userEmail}>{profile.email}</Text>
              <Text style={styles.userPhone}>{profile.phone}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={styles.statIconCircle}>
              <Package size={20} color="#FF5722" strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{profile.totalOrders}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIconCircle}>
              <Heart size={20} color="#FF5722" strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{profile.wishlistCount}</Text>
            <Text style={styles.statLabel}>Wishlist</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIconCircle}>
              <Star size={20} color="#FF5722" strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{profile.loyaltyPoints}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>

        {/* My Account Card */}
        <View style={styles.menuCard}>
          <Text style={styles.cardTitle}>My Account</Text>
          {accountMenuItems.map((item, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <item.icon size={20} color={item.color} strokeWidth={2} />
                </View>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <ChevronRight size={20} color="#D1D5DB" strokeWidth={2} />
            </Pressable>
          ))}
        </View>

        {/* Settings Card */}
        <View style={styles.menuCard}>
          <Text style={styles.cardTitle}>Settings</Text>
          {settingsMenuItems.map((item, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <item.icon size={20} color={item.color} strokeWidth={2} />
                </View>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <ChevronRight size={20} color="#D1D5DB" strokeWidth={2} />
            </Pressable>
          ))}
        </View>

        {/* Support Card */}
        <View style={styles.menuCard}>
          <Text style={styles.cardTitle}>Support</Text>
          {supportMenuItems.map((item, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <item.icon size={20} color={item.color} strokeWidth={2} />
                </View>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <ChevronRight size={20} color="#D1D5DB" strokeWidth={2} />
            </Pressable>
          ))}
        </View>

        {/* Logout Card */}
        <View style={styles.logoutCard}>
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
            onPress={handleLogout}
          >
            <Power size={20} color="#EF4444" strokeWidth={2} />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>Member since {profile.memberSince}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  // ===== EDGE-TO-EDGE ORANGE HEADER =====
  header: {
    backgroundColor: '#FF5722',
    paddingBottom: 32,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileContainer: {
    alignItems: 'center',
  },
  // Avatar with thick white border
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  // White circular edit button with orange icon
  editIconButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FF5722',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  // User info in white text
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 4,
    fontWeight: '500',
  },
  userPhone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  // ===== SCROLL VIEW =====
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // ===== QUICK STATS CARD =====
  statsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 100,
    backgroundColor: '#FFF3F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E5E7EB',
  },
  // ===== MENU CARDS =====
  menuCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuItemPressed: {
    opacity: 0.6,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 100,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  // ===== LOGOUT CARD (RED THEME) =====
  logoutCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
  },
  logoutButtonPressed: {
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 0.3,
  },
  // ===== FOOTER =====
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    gap: 6,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
