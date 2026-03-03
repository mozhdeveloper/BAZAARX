import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SellerTabs from './SellerTabs';

// All other screens use getComponent for deferred loading

export type SellerStackParamList = {
  SellerTabs: { screen?: string } | undefined;
  Analytics: undefined;
  StoreProfile: undefined;
  Earnings: undefined;
  POS: undefined;
  Discounts: undefined;
  BoostProduct: undefined;
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
      <Stack.Screen name="Analytics" getComponent={() => require('./(tabs)/analytics').default} />
      <Stack.Screen name="StoreProfile" getComponent={() => require('./store-profile').default} />
      <Stack.Screen name="Earnings" getComponent={() => require('./earnings').default} />
      <Stack.Screen name="POS" getComponent={() => require('./pos').default} />
      <Stack.Screen name="Discounts" getComponent={() => require('./discounts').default} />
      <Stack.Screen name="BoostProduct" getComponent={() => require('./boost-product').default} />
      <Stack.Screen name="Messages" getComponent={() => require('./messages').default} />
      <Stack.Screen name="Reviews" getComponent={() => require('./reviews').default} />
      <Stack.Screen name="Notifications" getComponent={() => require('./notifications').default} />
      <Stack.Screen name="ReturnDetail" getComponent={() => require('./ReturnDetailScreen').default} />
      <Stack.Screen name="SellerOrderDetail" getComponent={() => require('./OrderDetailScreen').default} />
      <Stack.Screen name="TicketList" getComponent={() => require('../tickets/TicketListScreen').default} />
      <Stack.Screen name="SellerHelpCenter" getComponent={() => require('./SellerHelpCenterScreen').default} />
      <Stack.Screen name="SellerCreateTicket" getComponent={() => require('./SellerCreateTicketScreen').default} />
      <Stack.Screen name="SellerTicketDetail" getComponent={() => require('../tickets/TicketDetailScreen').default} />
    </Stack.Navigator>
  );
}
