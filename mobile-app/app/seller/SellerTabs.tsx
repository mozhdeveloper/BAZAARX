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
        tabBarActiveTintColor: '#D97706',
        tabBarInactiveTintColor: '#92400E', // Match the brown color from screenshot
        tabBarStyle: {
          backgroundColor: '#FFFBF0', // Cream background
          borderTopWidth: 1, // Flat border
          borderTopColor: '#FDE68A', // Light amber/gold border on top
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 2,
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
