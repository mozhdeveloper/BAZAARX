import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Home, Store, ShoppingCart, MessageCircle, User } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

interface NavItem {
  name: string;
  icon: React.ElementType;
  screen: string;
  tabScreen?: string;
}

const navItems: NavItem[] = [
  { name: 'Home', icon: Home, screen: 'MainTabs', tabScreen: 'Home' },
  { name: 'Shop', icon: Store, screen: 'MainTabs', tabScreen: 'Shop' },
  { name: 'Cart', icon: ShoppingCart, screen: 'MainTabs', tabScreen: 'Cart' },
  { name: 'Messages', icon: MessageCircle, screen: 'MainTabs', tabScreen: 'Messages' },
  { name: 'Profile', icon: User, screen: 'MainTabs', tabScreen: 'Profile' },
];

interface BuyerBottomNavProps {
  activeTab?: string;
}

export function BuyerBottomNav({ activeTab }: BuyerBottomNavProps) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const handlePress = (item: NavItem) => {
    if (item.tabScreen) {
      navigation.navigate(item.screen, { screen: item.tabScreen });
    } else {
      navigation.navigate(item.screen);
    }
  };

  // Determine active tab based on current route or prop
  const currentActive = activeTab || route.name;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentActive === item.tabScreen || currentActive === item.name;
        
        return (
          <Pressable
            key={item.name}
            style={styles.navItem}
            onPress={() => handlePress(item)}
            accessibilityLabel={item.name}
            accessibilityRole="button"
          >
            <Icon
              size={24}
              color={isActive ? COLORS.primary : '#9CA3AF'}
              strokeWidth={isActive ? 2.5 : 2}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

export default BuyerBottomNav;
