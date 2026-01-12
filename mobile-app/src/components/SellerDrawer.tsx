import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellerStackParamList } from '../../app/seller/SellerStack';
import {
  X,
  LayoutDashboard,
  Package,
  FileCheck,
  ShoppingCart,
  TrendingUp,
  Settings,
  Store,
  DollarSign,
  Zap,
  MessageSquare,
  Star,
  CreditCard,
  User,
  LogOut,
} from 'lucide-react-native';
import { useSellerStore } from '../stores/sellerStore';

interface MenuItem {
  icon: any;
  label: string;
  route: keyof SellerStackParamList | 'Tab';
  inTab?: boolean;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

interface SellerDrawerProps {
  visible: boolean;
  onClose: () => void;
}

type SellerNavigationProp = NativeStackNavigationProp<SellerStackParamList>;

export default function SellerDrawer({ visible, onClose }: SellerDrawerProps) {
  const navigation = useNavigation<SellerNavigationProp>();
  const insets = useSafeAreaInsets();
  const { seller, logout } = useSellerStore();

  const handleNavigation = (route: keyof SellerStackParamList | 'Tab') => {
    onClose();
    if (route !== 'Tab') {
      navigation.navigate(route);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    // Navigate back to seller login via the root stack
    navigation.getParent()?.navigate('SellerLogin' as never);
  };

  const menuItems: MenuSection[] = [
    {
      label: 'Main Navigation',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', route: 'Tab', inTab: true },
        { icon: Package, label: 'Products', route: 'Tab', inTab: true },
        { icon: FileCheck, label: 'QA Products', route: 'Tab', inTab: true },
        { icon: ShoppingCart, label: 'Orders', route: 'Tab', inTab: true },
        { icon: TrendingUp, label: 'Analytics', route: 'Tab', inTab: true },
      ],
    },
    {
      label: 'Store Management',
      items: [
        { icon: Store, label: 'Store Profile', route: 'StoreProfile' },
        { icon: DollarSign, label: 'Earnings', route: 'Earnings' },
        { icon: CreditCard, label: 'POS (Point of Sale)', route: 'POS' },
        { icon: Zap, label: 'Flash Sales', route: 'FlashSales' },
      ],
    },
    {
      label: 'Communication',
      items: [
        { icon: MessageSquare, label: 'Messages', route: 'Messages' },
        { icon: Star, label: 'Reviews', route: 'Reviews' },
      ],
    },
    {
      label: 'Account',
      items: [
        { icon: Settings, label: 'Settings', route: 'Tab', inTab: true },
      ],
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.drawer, { paddingTop: insets.top }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.profileSection}>
              <View style={styles.avatarCircle}>
                <User size={32} color="#FF5722" strokeWidth={2} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.storeName}>{seller.storeName}</Text>
                <Text style={styles.sellerName}>{seller.ownerName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            {menuItems.map((section, sectionIndex) => (
              <View key={sectionIndex} style={styles.menuSection}>
                <Text style={styles.sectionLabel}>{section.label}</Text>
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={itemIndex}
                      style={styles.menuItem}
                      onPress={() => handleNavigation(item.route)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.menuItemContent}>
                        <View style={styles.iconContainer}>
                          <Icon size={20} color="#FF5722" strokeWidth={2} />
                        </View>
                        <Text style={styles.menuItemLabel}>{item.label}</Text>
                      </View>
                      {item.inTab && (
                        <View style={styles.tabBadge}>
                          <Text style={styles.tabBadgeText}>Tab</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Logout */}
            <View style={styles.menuSection}>
              <TouchableOpacity
                style={[styles.menuItem, styles.logoutItem]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemContent}>
                  <View style={[styles.iconContainer, styles.logoutIcon]}>
                    <LogOut size={20} color="#EF4444" strokeWidth={2} />
                  </View>
                  <Text style={[styles.menuItemLabel, styles.logoutText]}>Logout</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.drawerFooter}>
            <Text style={styles.footerText}>BazaarX Seller v1.0</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  drawer: {
    width: '85%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  sellerName: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  menuScroll: {
    flex: 1,
  },
  menuSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  logoutItem: {
    marginTop: 8,
  },
  logoutIcon: {
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    color: '#EF4444',
  },
  drawerFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
