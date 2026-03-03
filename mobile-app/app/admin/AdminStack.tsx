import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminTabsNavigator from './AdminTabs';
import AdminLoginScreen from './login';

// All other admin pages use getComponent for deferred loading

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
  SupportTickets: undefined;
  SupportTicketDetail: { ticketId: string };
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
      <Stack.Screen name="Categories" getComponent={() => require('./(pages)/categories').default} />
      <Stack.Screen name="ProductRequests" getComponent={() => require('./(pages)/product-requests').default} />
      <Stack.Screen name="FlashSales" getComponent={() => require('./(pages)/flash-sales').default} />
      <Stack.Screen name="Buyers" getComponent={() => require('./(pages)/buyers').default} />
      <Stack.Screen name="Payouts" getComponent={() => require('./(pages)/payouts').default} />
      <Stack.Screen name="Vouchers" getComponent={() => require('./(pages)/vouchers').default} />
      <Stack.Screen name="Reviews" getComponent={() => require('./(pages)/reviews').default} />
      <Stack.Screen name="Analytics" getComponent={() => require('./(pages)/analytics').default} />
      <Stack.Screen name="Profile" getComponent={() => require('./(pages)/profile').default} />
      <Stack.Screen name="SupportTickets" getComponent={() => require('./(pages)/support').default} />
      <Stack.Screen name="SupportTicketDetail" getComponent={() => require('./(pages)/support-ticket-detail').default} />
    </Stack.Navigator>
  );
}
