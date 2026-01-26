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
import SellerReturnDetailScreen from './ReturnDetailScreen';

export type SellerStackParamList = {
  SellerTabs: undefined;
  Analytics: undefined;
  StoreProfile: undefined;
  Earnings: undefined;
  POS: undefined;
  FlashSales: undefined;
  Messages: undefined;
  Reviews: undefined;
  ReturnDetail: { returnId: string };
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
      <Stack.Screen name="ReturnDetail" component={SellerReturnDetailScreen} />
    </Stack.Navigator>
  );
}
