import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminTabsNavigator from './AdminTabs';
import AdminLoginScreen from './login';

// Standalone admin pages
import AdminCategoriesScreen from './(pages)/categories';
import AdminProductRequestsScreen from './(pages)/product-requests';
import AdminFlashSalesScreen from './(pages)/flash-sales';
import AdminBuyersScreen from './(pages)/buyers';
import AdminPayoutsScreen from './(pages)/payouts';
import AdminVouchersScreen from './(pages)/vouchers';
import AdminReviewsScreen from './(pages)/reviews';
import AdminAnalyticsScreen from './(pages)/analytics';
import AdminProfileScreen from './(pages)/profile';

export type AdminStackParamList = {
  AdminLogin: undefined;
  AdminTabs: undefined;
  Categories: undefined;
  ProductRequests: undefined;
  FlashSales: undefined;
  Buyers: undefined;
  Payouts: undefined;
  Vouchers: undefined;
  Reviews: undefined;
  Analytics: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<AdminStackParamList>();

export default function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F5F5F7' },
      }}
    >
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="AdminTabs" component={AdminTabsNavigator} />
      <Stack.Screen name="Categories" component={AdminCategoriesScreen} />
      <Stack.Screen name="ProductRequests" component={AdminProductRequestsScreen} />
      <Stack.Screen name="FlashSales" component={AdminFlashSalesScreen} />
      <Stack.Screen name="Buyers" component={AdminBuyersScreen} />
      <Stack.Screen name="Payouts" component={AdminPayoutsScreen} />
      <Stack.Screen name="Vouchers" component={AdminVouchersScreen} />
      <Stack.Screen name="Reviews" component={AdminReviewsScreen} />
      <Stack.Screen name="Analytics" component={AdminAnalyticsScreen} />
      <Stack.Screen name="Profile" component={AdminProfileScreen} />
    </Stack.Navigator>
  );
}
