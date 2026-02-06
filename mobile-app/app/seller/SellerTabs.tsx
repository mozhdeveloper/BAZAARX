import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Package, ShoppingCart, CreditCard, Settings, FileCheck } from 'lucide-react-native';
import SellerDashboardScreen from './(tabs)/dashboard';
import SellerProductsScreen from './(tabs)/products';
import SellerQAProductsScreen from './(tabs)/qa-products';
import SellerOrdersScreen from './(tabs)/orders';
import SellerPOSScreen from './pos';
import SellerSettingsScreen from './(tabs)/settings';
import { useSellerStore, useAuthStore } from '../../src/stores/sellerStore';

export type SellerTabParamList = {
  Dashboard: undefined;
  Products: undefined;
  'QA Products': undefined;
  Orders: undefined;
  'POS Lite': undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<SellerTabParamList>();

export default function SellerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF5722',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={SellerDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tab.Screen
        name="Products"
        component={SellerProductsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} strokeWidth={2.5} />,
        }}
        listeners={{
          tabPress: (e) => {
            const { seller } = useAuthStore.getState();
            if (seller?.approval_status === 'pending') {
              e.preventDefault();
            }
          },
        }}
      />
      <Tab.Screen
        name="QA Products"
        component={SellerQAProductsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <FileCheck size={size} color={color} strokeWidth={2.5} />,
        }}
        listeners={{
          tabPress: (e) => {
            const { seller } = useAuthStore.getState();
            if (seller?.approval_status === 'pending') {
              e.preventDefault();
            }
          },
        }}
      />
      <Tab.Screen
        name="Orders"
        component={SellerOrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} strokeWidth={2.5} />,
        }}
        listeners={{
          tabPress: (e) => {
            const { seller } = useAuthStore.getState();
            if (seller?.approval_status === 'pending') {
              e.preventDefault();
            }
          },
        }}
      />
      <Tab.Screen
        name="POS Lite"
        component={SellerPOSScreen}
        options={{
          tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} strokeWidth={2.5} />,
        }}
        listeners={{
          tabPress: (e) => {
            const { seller } = useAuthStore.getState();
            if (seller?.approval_status === 'pending') {
              e.preventDefault();
            }
          },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SellerSettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} strokeWidth={2.5} />,
        }}
      />
    </Tab.Navigator>
  );
}
