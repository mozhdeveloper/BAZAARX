import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Animated,
  Dimensions,
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
  Bell,
  LifeBuoy,
} from 'lucide-react-native';
import { useSellerStore } from '../stores/sellerStore';
import { useAuthStore } from '../stores/authStore';

interface MenuItem {
  icon: any;
  label: string;
  route: string;
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
  const { switchRole } = useAuthStore();

  const drawerWidth = Math.min(Dimensions.get('window').width * 0.85, 320);
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const [showModal, setShowModal] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      // Slide in
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out then hide
      Animated.timing(translateX, {
        toValue: -drawerWidth,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowModal(false));
    }
  }, [visible, translateX, drawerWidth]);

  const closeWithAnimation = (callback?: () => void) => {
    Animated.timing(translateX, {
      toValue: -drawerWidth,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      onClose();
      if (callback) {
        callback();
      }
    });
  };

  // SellerDrawer.tsx

  const handleNavigation = (route: string) => {
    closeWithAnimation(() => {
      // List of routes that exist inside SellerTabs.tsx
      const tabRoutes = ['Dashboard', 'Products', 'QA Products', 'Orders', 'Settings'];

      if (tabRoutes.includes(route)) {
        // Use the name defined in SellerStack.tsx ('SellerTabs')
        // and pass the specific screen as a parameter
        navigation.navigate('SellerTabs', { screen: route } as any);
      } else {
        // Standard navigation for items in SellerStack.tsx
        navigation.navigate(route as any);
      }
    });
  };

  const handleSwitchToBuyer = () => {
    closeWithAnimation(() => {
        switchRole('buyer');
        navigation.navigate('MainTabs' as never);
    });
  };

  const handleLogout = () => {
    closeWithAnimation(() => {
      logout();
      // Navigate back to seller login via the root stack
      navigation.getParent()?.navigate('SellerLogin' as never);
    });
  };

  const menuItems: MenuSection[] = [
    // {
    //   label: 'Main Navigation',
    //   items: [
    //     { icon: LayoutDashboard, label: 'Dashboard', route: 'Dashboard', inTab: true },
    //     { icon: Package, label: 'Products', route: 'Products', inTab: true },
    //     { icon: FileCheck, label: 'QA Products', route: 'QA Products', inTab: true },
    //     { icon: ShoppingCart, label: 'Orders', route: 'Orders', inTab: true },
    //     { icon: CreditCard, label: 'POS (Point of Sale)', route: 'POS', inTab: true },
    //   ],
    // },
    {
      label: 'Store Management',
      items: [
        { icon: Store, label: 'Store Profile', route: 'StoreProfile' },
        { icon: DollarSign, label: 'Earnings', route: 'Earnings' },
        { icon: Zap, label: 'Flash Sales', route: 'FlashSales' },
        { icon: TrendingUp, label: 'Analytics', route: 'Analytics' }
      ],
    },
    {
      label: 'Communication',
      items: [
        { icon: Bell, label: 'Notifications', route: 'Notifications' },
        { icon: MessageSquare, label: 'Messages', route: 'Messages' },
        { icon: Star, label: 'Reviews', route: 'Reviews' },
      ],
    },
    {
      label: 'Account',
      items: [
        { icon: Settings, label: 'Settings', route: 'Settings', inTab: true },
        { icon: LifeBuoy, label: 'Help Center', route: 'SellerHelpCenter' },
      ],
    },
  ];

  return (
    <Modal
      visible={showModal}
      transparent={true}
      onRequestClose={() => closeWithAnimation()}
    >
      <Pressable style={styles.overlay} onPress={() => closeWithAnimation()}>
        <Animated.View style={[styles.drawer, { paddingTop: insets.top, transform: [{ translateX }] }]} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <TouchableOpacity style={styles.profileSection} onPress={() => handleNavigation('StoreProfile')} activeOpacity={0.8}>
              <View style={styles.avatarCircle}>
                <User size={28} color="#FF5722" strokeWidth={2} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.storeName} numberOfLines={1} ellipsizeMode="tail">{seller?.store_name || 'Store'}</Text>
                <Text style={styles.sellerName} numberOfLines={1} ellipsizeMode="tail">{seller?.owner_name || 'Seller'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => closeWithAnimation()} style={styles.closeButton}>
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
                      style={[
                        styles.menuItem,
                        (seller?.approval_status === 'pending' && item.route !== 'StoreProfile') && styles.disabledMenuItem
                      ]}
                      onPress={() => {
                        if (seller?.approval_status === 'pending' && item.route !== 'StoreProfile') return;
                        handleNavigation(item.route);
                      }}
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

            {/* Switch to Buyer */}
            <View style={styles.menuSection}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleSwitchToBuyer}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemContent}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
                    <User size={20} color="#0EA5E9" strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={styles.menuItemLabel}>Switch to Buyer</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>Shop on BazaarX</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

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
        </Animated.View>
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
    paddingVertical: 12,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  sellerName: {
    fontSize: 12,
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
  disabledMenuItem: {
    opacity: 0.4,
  },
});
