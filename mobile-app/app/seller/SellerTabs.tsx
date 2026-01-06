import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Package, ShoppingCart, TrendingUp, Settings } from 'lucide-react-native';
import SellerDashboardScreen from './(tabs)/dashboard';
import SellerProductsScreen from './(tabs)/products';
import SellerOrdersScreen from './(tabs)/orders';
import SellerAnalyticsScreen from './(tabs)/analytics';
import SellerSettingsScreen from './(tabs)/settings';

export type SellerTabParamList = {
  Dashboard: undefined;
  Products: undefined;
  Orders: undefined;
  Analytics: undefined;
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
          fontSize: 12,
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
      />
      <Tab.Screen
        name="Orders"
        component={SellerOrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={SellerAnalyticsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} strokeWidth={2.5} />,
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
