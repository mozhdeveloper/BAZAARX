import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Store, ShoppingCart, MessageCircle, User } from 'lucide-react-native';
import { AppState, AppStateStatus, LogBox } from 'react-native';
import type { CartItem } from './src/types';

// ---------------------------------------------------------------------------
// Eager imports — critical-path screens loaded at startup
// ---------------------------------------------------------------------------
import SplashScreen from './app/SplashScreen';
import OnboardingScreen from './app/OnboardingScreen';
import LoginScreen from './app/LoginScreen';
import SignupScreen from './app/SignupScreen';
import HomeScreen from './app/HomeScreen';
import ShopScreen from './app/ShopScreen';
import CartScreen from './app/CartScreen';
import ProfileScreen from './app/ProfileScreen';
import MessagesScreen from './app/MessagesScreen';

// Onboarding flow (shown right after signup — keep eager)
import TermsScreen from './app/onboarding/TermsScreen';
import CategoryPreferenceScreen from './app/onboarding/CategoryPreferenceScreen';
import AddressSetupScreen from './app/onboarding/AddressSetupScreen';

// ---------------------------------------------------------------------------
// ALL other screens use getComponent — loaded only when navigated to
// ---------------------------------------------------------------------------

// Import types
import type { Product, Order } from './src/types';
import { supabase } from './src/lib/supabase';
import { useAuthStore } from './src/stores/authStore';
import { chatService } from './src/services/chatService';

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
  PaymentGateway: { paymentMethod: string; order: Order; isQuickCheckout?: boolean; earnedBazcoins?: number };
  OrderConfirmation: { order: Order; earnedBazcoins?: number };
  Orders: { initialTab?: 'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'reviewed' | 'returned' | 'cancelled' };
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
  ChatSupport: undefined;
  PrivacyPolicy: undefined;
  UserGuide: undefined;
  TermsOfService: undefined;
  AllStores: { title?: string };
  StoreDetail: { store: any };
  ReturnRequest: { order: Order };
  ReturnDetail: { returnId: string };
  ReturnOrders: undefined;
  History: undefined;
  MyRequests: undefined;
  LabPipeline: undefined;
  ProductRequestDetail: { requestId: string };
  CreateTicket: undefined;
  TicketDetail: { ticketId: string };
  Messages: undefined;
  Categories: undefined;
  AddProduct: undefined;
  Chat: {
    conversation: any; // Using any to avoid circular dependency or import issues, but ideally Conversation type
    currentUserId: string;
    userType: 'buyer' | 'seller';
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [unreadMsgCount, setUnreadMsgCount] = React.useState(0);

  React.useEffect(() => {
    if (!user?.id) return;
    const fetchCount = () =>
      chatService.getUnreadCount(user.id, 'buyer').then(setUnreadMsgCount);
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

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
          borderTopWidth: 0, // Removed border for cleaner look with shadow
          backgroundColor: '#FFFBF0', // Soft Parchment Cream
          borderTopLeftRadius: 30,
          borderTopRightRadius: 20,
          shadowColor: '#D97706', // Soft Amber Glow
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 15,
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
          tabBarBadge: unreadMsgCount > 0 ? (unreadMsgCount > 9 ? '9+' : unreadMsgCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#D97706',
            borderWidth: 1,
            borderColor: '#FFD89A',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '900',
            minWidth: 20,
            height: 20,
            borderRadius: 10,
          },
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
  const { user } = useAuthStore();
  const appState = useRef(AppState.currentState);

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

  // Global Presence Listener
  React.useEffect(() => {
    if (!user?.id) return;

    // Mark online as soon as they log in or open the app
    chatService.updateUserPresence(user.id, 'online', 'mobile');

    // Listen to the app moving to background/foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        chatService.updateUserPresence(user.id, 'online', 'mobile');
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        chatService.updateUserPresence(user.id, 'offline', 'mobile');
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      chatService.updateUserPresence(user.id, 'offline', 'mobile');
    };
  }, [user?.id]);

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
              getComponent={() => require('./app/seller/login').default}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="SellerSignup"
              getComponent={() => require('./app/seller/signup').default}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="SellerAuthChoice"
              getComponent={() => require('./app/seller/auth').default}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen
              name="BecomeSeller"
              getComponent={() => require('./app/seller/BecomeSellerScreen').default}
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            <Stack.Screen
              name="SellerStack"
              getComponent={() => require('./app/seller/SellerStack').default}
              options={{ headerShown: false }}
            />

            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="ProductDetail" getComponent={() => require('./app/ProductDetailScreen').default} />
            <Stack.Screen name="Checkout" getComponent={() => require('./app/CheckoutScreen').default} />
            <Stack.Screen name="PaymentGateway" getComponent={() => require('./app/PaymentGatewayScreen').default} options={{ headerShown: false }} />
            <Stack.Screen name="OrderConfirmation" getComponent={() => require('./app/OrderConfirmation').default} />
            <Stack.Screen name="Orders" getComponent={() => require('./app/OrdersScreen').default} options={{ headerShown: false }} />
            <Stack.Screen name="OrderDetail" getComponent={() => require('./app/OrderDetailScreen').default} />
            <Stack.Screen
              name="SellerOrderDetail"
              getComponent={() => require('./app/seller/OrderDetailScreen').default}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="DeliveryTracking" getComponent={() => require('./app/DeliveryTrackingScreen').default} />
            <Stack.Screen name="FlashSale" getComponent={() => require('./app/FlashSaleScreen').default} options={{ headerShown: false }} />
            <Stack.Screen name="FollowingShops" getComponent={() => require('./app/FollowingShopsScreen').default} />
            <Stack.Screen name="Wishlist" getComponent={() => require('./app/WishlistScreen').default} />
            <Stack.Screen name="SharedWishlist" getComponent={() => require('./app/SharedWishlistScreen').default} />
            <Stack.Screen name="FindRegistry" getComponent={() => require('./app/FindRegistryScreen').default} />
            <Stack.Screen name="Addresses" getComponent={() => require('./app/AddressesScreen').default} />
            <Stack.Screen name="Settings" getComponent={() => require('./app/SettingsScreen').default} />
            <Stack.Screen name="Notifications" getComponent={() => require('./app/NotificationsScreen').default} />
            <Stack.Screen name="NotificationSettings" getComponent={() => require('./app/NotificationSettingsScreen').default} />
            <Stack.Screen name="PaymentMethods" getComponent={() => require('./app/PaymentMethodsScreen').default} />
            <Stack.Screen name="AllStores" getComponent={() => require('./app/AllStoresScreen').default} />
            <Stack.Screen name="StoreDetail" getComponent={() => require('./app/StoreDetailScreen').default} />
            <Stack.Screen name="ReturnRequest" getComponent={() => require('./app/ReturnRequestScreen').default} />
            <Stack.Screen name="ReturnDetail" getComponent={() => require('./app/ReturnDetailScreen').default} />
            <Stack.Screen name="ReturnOrders" getComponent={() => require('./app/ReturnOrdersScreen').default} options={{ headerShown: false }} />
            <Stack.Screen name="History" getComponent={() => require('./app/HistoryScreen').default} />
            <Stack.Screen name="MyRequests" getComponent={() => require('./app/MyRequestsScreen').default} />
            <Stack.Screen name="LabPipeline" getComponent={() => require('./app/LabPipelineScreen').default} options={{ headerShown: false }} />
            <Stack.Screen name="ProductRequestDetail" getComponent={() => require('./app/ProductRequestDetailScreen').default} options={{ headerShown: false }} />
            <Stack.Screen name="HelpSupport" getComponent={() => require('./app/HelpCenterScreen').default} />
            <Stack.Screen name="ChatSupport" getComponent={() => require('./app/ChatSupportScreen').default} options={{ headerShown: false }} />
            <Stack.Screen name="CreateTicket" getComponent={() => require('./app/tickets/CreateTicketScreen').default} />
            <Stack.Screen name="TicketDetail" getComponent={() => require('./app/tickets/TicketDetailScreen').default} />
            <Stack.Screen name="Messages" getComponent={() => require('./app/MessagesScreen').default} />
            <Stack.Screen name="PrivacyPolicy" getComponent={() => require('./app/PrivacyPolicyScreen').default} />
            <Stack.Screen name="UserGuide" getComponent={() => require('./app/UserGuideScreen').default} />
            <Stack.Screen name="TermsOfService" getComponent={() => require('./app/TermsOfServiceScreen').default} />
            <Stack.Screen name="AddProduct" getComponent={() => require('./src/components/seller/AddProductScreen').default} />
            <Stack.Screen name="Chat" getComponent={() => require('./src/components/ChatScreen').default} />
            <Stack.Screen name="Categories" getComponent={() => require('./app/CategoriesScreen').default} />
            <Stack.Screen name="AdminStack" getComponent={() => require('./app/admin/AdminStack').default} options={{ headerShown: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}