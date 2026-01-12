import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  Package,
  CheckSquare,
  UserCheck,
  ShoppingBag,
  Settings,
} from 'lucide-react-native';

// Tab Screens
import AdminDashboardScreen from './(tabs)/dashboard';
import AdminProductsScreen from './(tabs)/products';
import AdminProductApprovalsScreen from './(tabs)/product-approvals';
import AdminSellersScreen from './(tabs)/sellers';
import AdminOrdersScreen from './(tabs)/orders';
import AdminSettingsScreen from './(tabs)/settings';

export type AdminTabParamList = {
  Dashboard: undefined;
  Products: undefined;
  'QA Approvals': undefined;
  Sellers: undefined;
  Orders: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF5722',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Products"
        component={AdminProductsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Package size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="QA Approvals"
        component={AdminProductApprovalsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <CheckSquare size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Sellers"
        component={AdminSellersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <UserCheck size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={AdminOrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <ShoppingBag size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={AdminSettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
