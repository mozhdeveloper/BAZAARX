import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  FolderTree,
  MessageSquare,
  Zap,
  Users,
  DollarSign,
  Ticket,
  Star,
  BarChart3,
  User,
  LogOut,
  X,
  Shield,
  Headphones,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AdminStackParamList } from '../../app/admin/AdminStack';
import { useAdminAuth } from '../stores/adminStore';
import { COLORS } from '../constants/theme';

type NavigationProp = StackNavigationProp<AdminStackParamList>;

interface AdminDrawerProps {
  visible: boolean;
  onClose: () => void;
}

interface DrawerItem {
  label: string;
  icon: React.ReactNode;
  route: keyof AdminStackParamList;
  isTab?: boolean;
}

export default function AdminDrawer({ visible, onClose }: AdminDrawerProps) {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAdminAuth();

  const menuItems: DrawerItem[] = [
    { label: 'Categories', icon: <FolderTree size={22} color="#6B7280" />, route: 'Categories' },
    { label: 'Product Requests', icon: <MessageSquare size={22} color="#6B7280" />, route: 'ProductRequests' },
    { label: 'Flash Sales', icon: <Zap size={22} color="#6B7280" />, route: 'FlashSales' },
    { label: 'Buyers', icon: <Users size={22} color="#6B7280" />, route: 'Buyers' },
    { label: 'Payouts', icon: <DollarSign size={22} color="#6B7280" />, route: 'Payouts' },
    { label: 'Vouchers', icon: <Ticket size={22} color="#6B7280" />, route: 'Vouchers' },
    { label: 'Reviews', icon: <Star size={22} color="#6B7280" />, route: 'Reviews' },
    { label: 'Analytics', icon: <BarChart3 size={22} color="#6B7280" />, route: 'Analytics' },
    { label: 'Support Tickets', icon: <Headphones size={22} color="#7C3AED" />, route: 'SupportTickets' },
    { label: 'Profile', icon: <User size={22} color="#6B7280" />, route: 'Profile' },
  ];

  const handleNavigate = (route: keyof AdminStackParamList) => {
    onClose();
    navigation.navigate(route as never);
  };

  const handleLogout = () => {
    onClose();
    logout();
    navigation.navigate('AdminLogin' as never);
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={onClose} />

      {/* Drawer */}
      <View style={styles.drawer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Shield size={24} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.brandText}>BazaarPH Admin</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0) || 'A'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
              <Text style={styles.userRole}>{user?.role?.replace('_', ' ') || 'Administrator'}</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
          <Text style={styles.menuTitle}>MENU</Text>
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={() => handleNavigate(item.route)}
            >
              {item.icon}
              <Text style={styles.menuItemText}>{item.label}</Text>
            </Pressable>
          ))}

          {/* Logout */}
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
            onPress={handleLogout}
          >
            <LogOut size={22} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>BazaarPH Admin v1.0</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    textTransform: 'capitalize',
  },
  menu: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuItemPressed: {
    backgroundColor: '#F3F4F6',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  logoutButtonPressed: {
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
