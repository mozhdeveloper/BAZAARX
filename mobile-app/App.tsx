import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Home, Store, ShoppingCart, Package, User } from 'lucide-react-native';

// Import screens
import SplashScreen from './app/SplashScreen';
import OnboardingScreen from './app/OnboardingScreen';
import LoginScreen from './app/LoginScreen';
import SignupScreen from './app/SignupScreen';
import HomeScreen from './app/HomeScreen';
import ShopScreen from './app/ShopScreen';
import ProductDetailScreen from './app/ProductDetailScreen';
import CartScreen from './app/CartScreen';
import CheckoutScreen from './app/CheckoutScreen';
import PaymentGatewayScreen from './app/PaymentGatewayScreen';
import OrderConfirmationScreen from './app/OrderConfirmation';
import OrdersScreen from './app/OrdersScreen';
import OrderDetailScreen from './app/OrderDetailScreen';
import DeliveryTrackingScreen from './app/DeliveryTrackingScreen';
import ProfileScreen from './app/ProfileScreen';
import FollowingShopsScreen from './app/FollowingShopsScreen';
import WishlistScreen from './app/WishlistScreen';
import AddressesScreen from './app/AddressesScreen';
import SettingsScreen from './app/SettingsScreen';
import NotificationsScreen from './app/NotificationsScreen';
import PaymentMethodsScreen from './app/PaymentMethodsScreen';
import HelpSupportScreen from './app/HelpSupportScreen';
import PrivacyPolicyScreen from './app/PrivacyPolicyScreen';
import SellerLoginScreen from './app/seller/login';
import SellerSignupScreen from './app/seller/signup';
import SellerAuthChoiceScreen from './app/seller/auth';
import SellerStack from './app/seller/SellerStack';
import AdminStack from './app/admin/AdminStack';
import AllStoresScreen from './app/AllStoresScreen';
import StoreDetailScreen from './app/StoreDetailScreen';
import ReturnRequestScreen from './app/ReturnRequestScreen';
import ReturnDetailScreen from './app/ReturnDetailScreen';
import ReturnOrdersScreen from './app/ReturnOrdersScreen';
import HistoryScreen from './app/HistoryScreen';

// Import types
import type { Product, Order } from './src/types';

export type TabParamList = {
  Home: undefined;
  Shop: { category?: string; searchQuery?: string; customResults?: Product[] };
  Cart: undefined;
  Orders: { initialTab?: 'toPay' | 'toShip' | 'toReceive' | 'completed' | 'returns' | 'cancelled' };
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
  SellerLogin: undefined;
  SellerSignup: undefined;
  SellerAuthChoice: undefined;
  SellerStack: undefined;
  AdminStack: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
  ProductDetail: { product: Product };
  Checkout: undefined;
  PaymentGateway: { paymentMethod: string; order: Order; isQuickCheckout?: boolean };
  OrderConfirmation: { order: Order };
  OrderDetail: { order: Order };
  DeliveryTracking: { order: Order };
  FollowingShops: undefined;
  Wishlist: undefined;
  Addresses: undefined;
  Settings: undefined;
  Notifications: undefined;
  PaymentMethods: undefined;
  HelpSupport: undefined;
  PrivacyPolicy: undefined;
  AllStores: undefined;
  StoreDetail: { store: any };
  ReturnRequest: { order: Order };
  ReturnDetail: { returnId: string };
  ReturnOrders: undefined;
  History: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6A00',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Store size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
          tabBarLabel: 'Track Order',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="Splash"
            component={SplashScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="SellerLogin"
            component={SellerLoginScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="SellerSignup"
            component={SellerSignupScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="SellerAuthChoice"
            component={SellerAuthChoiceScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="SellerStack"
            component={SellerStack}
            options={{ headerShown: false }}
          />

          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="PaymentGateway" component={PaymentGatewayScreen} options={{ headerShown: false }} />
          <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="DeliveryTracking" component={DeliveryTrackingScreen} />
          <Stack.Screen name="FollowingShops" component={FollowingShopsScreen} />
          <Stack.Screen name="Wishlist" component={WishlistScreen} />
          <Stack.Screen name="Addresses" component={AddressesScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
          <Stack.Screen name="AllStores" component={AllStoresScreen} />
          <Stack.Screen name="StoreDetail" component={StoreDetailScreen} />
          <Stack.Screen name="ReturnRequest" component={ReturnRequestScreen} />
          <Stack.Screen name="ReturnDetail" component={ReturnDetailScreen} />
          <Stack.Screen name="ReturnOrders" component={ReturnOrdersScreen} options={{ headerShown: false }} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
