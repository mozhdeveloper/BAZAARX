import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
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
    <View style={[styles.container, { height: 70 + insets.bottom, paddingBottom: 10 + insets.bottom }]}>
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
            <View style={styles.iconContainer}>
              <Icon
                size={24}
                color={isActive ? COLORS.primary : '#9CA3AF'}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.name}
            </Text>
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
    backgroundColor: '#FFFBF0', // Soft Parchment Cream
    paddingTop: 10,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 20,
    shadowColor: '#D97706', // Soft Amber Glow
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 15,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    marginTop: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 2,
    color: '#9CA3AF',
  },
  labelActive: {
    color: COLORS.primary,
  },
});

export default BuyerBottomNav;
