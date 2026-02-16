import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Store, ShoppingCart, MessageCircle, User } from 'lucide-react-native';
import type { CartItem } from './src/types';

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
import FlashSaleScreen from './app/FlashSaleScreen';
import ProfileScreen from './app/ProfileScreen';
import FollowingShopsScreen from './app/FollowingShopsScreen';
import WishlistScreen from './app/WishlistScreen';
import SharedWishlistScreen from './app/SharedWishlistScreen';
import FindRegistryScreen from './app/FindRegistryScreen';
import AddressesScreen from './app/AddressesScreen';
import SettingsScreen from './app/SettingsScreen';
import NotificationsScreen from './app/NotificationsScreen';
import NotificationSettingsScreen from './app/NotificationSettingsScreen';
import PaymentMethodsScreen from './app/PaymentMethodsScreen';
import HelpCenterScreen from './app/HelpCenterScreen';
import PrivacyPolicyScreen from './app/PrivacyPolicyScreen';
import SellerLoginScreen from './app/seller/login';
import SellerSignupScreen from './app/seller/signup';
import SellerAuthChoiceScreen from './app/seller/auth';
import BecomeSellerScreen from './app/seller/BecomeSellerScreen';
import SellerStack from './app/seller/SellerStack';
import AdminStack from './app/admin/AdminStack';
import AllStoresScreen from './app/AllStoresScreen';
import StoreDetailScreen from './app/StoreDetailScreen';
import ReturnRequestScreen from './app/ReturnRequestScreen';
import ReturnDetailScreen from './app/ReturnDetailScreen';
import ReturnOrdersScreen from './app/ReturnOrdersScreen';
import HistoryScreen from './app/HistoryScreen';
import AddProductScreen from '@/components/seller/AddProductScreen';
import SellerOrderDetailScreen from './app/seller/OrderDetailScreen';

// Ticketing Module
import CreateTicketScreen from './app/tickets/CreateTicketScreen';
import TicketDetailScreen from './app/tickets/TicketDetailScreen';
import MessagesScreen from './app/MessagesScreen';
import ChatScreen from './src/components/ChatScreen';
import AIChatScreen from './app/AIChatScreen';
import { ProductContext, StoreContext } from './src/services/aiChatService';

// Onboarding Screens
import TermsScreen from './app/onboarding/TermsScreen';
import CategoryPreferenceScreen from './app/onboarding/CategoryPreferenceScreen';
import AddressSetupScreen from './app/onboarding/AddressSetupScreen';

// Import types
import type { Product, Order } from './src/types';

export type TabParamList = {
  Home: undefined;
  Shop: { category?: string; searchQuery?: string; customResults?: Product[] };
  Cart: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Terms: { signupData: any };
  CategoryPreference: { signupData: any };
  AddressSetup: { signupData: any };
  Login: undefined;
  Signup: undefined;
  SellerLogin: undefined;
  SellerSignup: undefined;
  SellerAuthChoice: undefined;
  BecomeSeller: undefined;
  SellerStack: undefined;
  AdminStack: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
  ProductDetail: { product: Product };
  Checkout: {
    selectedItems?: CartItem[];
    deliveryAddress?: string;
    deliveryCoordinates?: { latitude: number; longitude: number };
    isGift?: boolean;
    recipientName?: string;
    registryLocation?: string;
    recipientId?: string;
  };
  PaymentGateway: { paymentMethod: string; order: Order; isQuickCheckout?: boolean };
  OrderConfirmation: { order: Order };
  Orders: { initialTab?: 'toPay' | 'toShip' | 'toReceive' | 'completed' | 'returns' | 'cancelled' };
  OrderDetail: { order: Order };
  SellerOrderDetail: { orderId: string };
  DeliveryTracking: { order: Order };
  FlashSale: undefined;
  FollowingShops: undefined;
  Wishlist: undefined;
  SharedWishlist: { wishlistId?: string; userId?: string };
  FindRegistry: undefined;
  Addresses: undefined;
  Settings: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  PaymentMethods: undefined;
  HelpSupport: { activeTab?: 'tickets' | 'faq' } | undefined;
  PrivacyPolicy: undefined;
  AllStores: { title?: string };
  StoreDetail: { store: any };
  ReturnRequest: { order: Order };
  ReturnDetail: { returnId: string };
  ReturnOrders: undefined;
  History: undefined;
  CreateTicket: undefined;
  TicketDetail: { ticketId: string };
  Messages: undefined;
  AddProduct: undefined;
  Chat: {
    conversation: any; // Using any to avoid circular dependency or import issues, but ideally Conversation type
    currentUserId: string;
    userType: 'buyer' | 'seller';
  };
  AIChat: {
    product?: ProductContext;
    store?: StoreContext;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F4A300', // Golden Orange
        tabBarInactiveTintColor: '#92400E', // Warm Brown
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 70 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#FFE0A3', // Pastel Gold
          backgroundColor: '#FFF9E5', // Pale Warm Cream
          shadowColor: '#F4A300', // Golden Shadow
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
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
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

import { supabase } from './src/lib/supabase';
import { useAuthStore } from './src/stores/authStore';
import { LogBox } from 'react-native';

// ... (existing imports)

export default function App() {
  React.useEffect(() => {
    // Suppress refresh token errors - they're handled automatically by auth service
    LogBox.ignoreLogs([
      'AuthApiError: Invalid Refresh Token',
      'Invalid Refresh Token',
      'Refresh Token Not Found'
    ]);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logout();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
              name="Terms"
              component={TermsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="CategoryPreference"
              component={CategoryPreferenceScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="AddressSetup"
              component={AddressSetupScreen}
              options={{ animation: 'slide_from_right' }}
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
              name="BecomeSeller"
              component={BecomeSellerScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
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
            <Stack.Screen name="Orders" component={OrdersScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen
              name="SellerOrderDetail"
              component={SellerOrderDetailScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen name="DeliveryTracking" component={DeliveryTrackingScreen} />
            <Stack.Screen name="FlashSale" component={FlashSaleScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FollowingShops" component={FollowingShopsScreen} />
            <Stack.Screen name="Wishlist" component={WishlistScreen} />
            <Stack.Screen name="SharedWishlist" component={SharedWishlistScreen} />
            <Stack.Screen name="FindRegistry" component={FindRegistryScreen} />
            <Stack.Screen name="Addresses" component={AddressesScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
            <Stack.Screen name="AllStores" component={AllStoresScreen} />
            <Stack.Screen name="StoreDetail" component={StoreDetailScreen} />
            <Stack.Screen name="ReturnRequest" component={ReturnRequestScreen} />
            <Stack.Screen name="ReturnDetail" component={ReturnDetailScreen} />
            <Stack.Screen name="ReturnOrders" component={ReturnOrdersScreen} options={{ headerShown: false }} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="HelpSupport" component={HelpCenterScreen} />
            <Stack.Screen name="CreateTicket" component={CreateTicketScreen} />
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
            <Stack.Screen name="Messages" component={MessagesScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="AddProduct" component={AddProductScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="AIChat" component={AIChatScreen} options={{ animation: 'slide_from_bottom' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
