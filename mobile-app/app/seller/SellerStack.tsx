import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SellerTabs from './SellerTabs';
import SellerAnalyticsScreen from './(tabs)/analytics';
import SellerStoreProfileScreen from './store-profile';
import SellerEarningsScreen from './earnings';
import SellerPOSScreen from './pos';
import SellerFlashSalesScreen from './flash-sales';
import SellerMessagesScreen from './messages';
import SellerReviewsScreen from './reviews';
import SellerNotificationsScreen from './notifications';
import SellerReturnDetailScreen from './ReturnDetailScreen';
import TicketListScreen from '../tickets/TicketListScreen';

export type SellerStackParamList = {
  SellerTabs: { screen?: string } | undefined;
  Analytics: undefined;
  StoreProfile: undefined;
  Earnings: undefined;
  POS: undefined;
  FlashSales: undefined;
  Messages: undefined;
  Reviews: undefined;
  Notifications: undefined;
  ReturnDetail: { returnId: string };
  TicketList: undefined;
};

const Stack = createNativeStackNavigator<SellerStackParamList>();

export default function SellerStack() {
  return (
    <Stack.Navigator
      initialRouteName="SellerTabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="SellerTabs" component={SellerTabs} />
      <Stack.Screen name="Analytics" component={SellerAnalyticsScreen} />
      <Stack.Screen name="StoreProfile" component={SellerStoreProfileScreen} />
      <Stack.Screen name="Earnings" component={SellerEarningsScreen} />
      <Stack.Screen name="POS" component={SellerPOSScreen} />
      <Stack.Screen name="FlashSales" component={SellerFlashSalesScreen} />
      <Stack.Screen name="Messages" component={SellerMessagesScreen} />
      <Stack.Screen name="Reviews" component={SellerReviewsScreen} />
      <Stack.Screen name="Notifications" component={SellerNotificationsScreen} />
      <Stack.Screen name="ReturnDetail" component={SellerReturnDetailScreen} />
      <Stack.Screen name="TicketList" component={TicketListScreen} />
    </Stack.Navigator>
  );
}
