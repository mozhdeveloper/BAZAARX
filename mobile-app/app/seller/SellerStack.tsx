import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SellerTabs from './SellerTabs';
import SellerAnalyticsScreen from './(tabs)/analytics';
import SellerStoreProfileScreen from './store-profile';
import SellerEarningsScreen from './earnings';
import SellerPOSScreen from './pos';
import SellerDiscountsScreen from './discounts';
import SellerMessagesScreen from './messages';
import SellerReviewsScreen from './reviews';
import SellerNotificationsScreen from './notifications';
import SellerReturnDetailScreen from './ReturnDetailScreen';
import SellerOrderDetailScreen from './OrderDetailScreen';
import TicketListScreen from '../tickets/TicketListScreen';
import SellerHelpCenterScreen from './SellerHelpCenterScreen';
import SellerCreateTicketScreen from './SellerCreateTicketScreen';
import TicketDetailScreen from '../tickets/TicketDetailScreen';

export type SellerStackParamList = {
  SellerTabs: { screen?: string } | undefined;
  Analytics: undefined;
  StoreProfile: undefined;
  Earnings: undefined;
  POS: undefined;
  Discounts: undefined;
  Messages: undefined;
  Reviews: undefined;
  Notifications: undefined;
  ReturnDetail: { returnId: string };
  SellerOrderDetail: { orderId: string };
  TicketList: undefined;
  SellerHelpCenter: undefined;
  SellerCreateTicket: undefined;
  SellerTicketDetail: { ticketId: string };
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
      <Stack.Screen name="Discounts" component={SellerDiscountsScreen} />
      <Stack.Screen name="Messages" component={SellerMessagesScreen} />
      <Stack.Screen name="Reviews" component={SellerReviewsScreen} />
      <Stack.Screen name="Notifications" component={SellerNotificationsScreen} />
      <Stack.Screen name="ReturnDetail" component={SellerReturnDetailScreen} />
      <Stack.Screen name="SellerOrderDetail" component={SellerOrderDetailScreen} />
      <Stack.Screen name="TicketList" component={TicketListScreen} />
      <Stack.Screen name="SellerHelpCenter" component={SellerHelpCenterScreen} />
      <Stack.Screen name="SellerCreateTicket" component={SellerCreateTicketScreen} />
      <Stack.Screen name="SellerTicketDetail" component={TicketDetailScreen} />
    </Stack.Navigator>
  );
}
