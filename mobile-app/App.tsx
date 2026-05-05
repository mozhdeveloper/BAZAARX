import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinkingOptions, NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { FlaskConical, Home, MessageCircle, ShoppingCart, Store, User } from 'lucide-react-native';
import React, { useRef } from 'react';
import { AppState, AppStateStatus, LogBox, Linking, Platform, Alert } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CartItem } from './src/types';

// ---------------------------------------------------------------------------
// Eager imports — critical-path screens loaded at startup
// ---------------------------------------------------------------------------
import CartScreen from './app/CartScreen';
import HomeScreen from './app/HomeScreen';
import LoginScreen from './app/LoginScreen';
import MessagesScreen from './app/MessagesScreen';
import OnboardingScreen from './app/OnboardingScreen';
import ProfileScreen from './app/ProfileScreen';
import ShopScreen from './app/ShopScreen';
import SignupScreen from './app/SignupScreen';
import SplashScreen from './app/SplashScreen';

import AddressSetupScreen from './app/onboarding/AddressSetupScreen';
import CategoryPreferenceScreen from './app/onboarding/CategoryPreferenceScreen';

// ---------------------------------------------------------------------------
// ALL other screens use getComponent — loaded only when navigated to
// ---------------------------------------------------------------------------

// Import types
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { supabase } from './src/lib/supabase';
import { chatService } from './src/services/chatService';
import { pushNotificationService, PushNotificationData } from './src/services/pushNotificationService';
import { useAuthStore } from './src/stores/authStore';
import { useGlobalNotifications } from './src/hooks/useGlobalNotifications';
import type { Order, Product } from './src/types';
import { runFullNetworkDiagnostics, logDetailedError } from './src/utils/networkDebug';

// Navigation reference for imperative navigation (used for logout redirect)
export const navigationRef = React.createRef<any>();

export type TabParamList = {
  Home: undefined;
  Shop: { category?: string; searchQuery?: string; view?: 'featured' };
  Cart: { selectedCartItemIds?: string[] } | undefined;
  Messages: undefined;
  Profile: undefined;
  Discover: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  CategoryPreference: { signupData: any };
  AddressSetup: { signupData: any };
  Login: { from?: string } | undefined;
  Signup: undefined;
  EmailVerification: { email: string; otpAlreadySent?: boolean; signupData?: any };
  EmailConfirmed: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  SellerLogin: undefined;
  SellerSignup: undefined;
  SellerFinalize: undefined;
  SellerAuthChoice: undefined;
  BecomeSeller: undefined;
  SellerStack: undefined;
  AdminStack: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
  ProductListing: { searchQuery: string };
  SearchResults: { searchQuery: string };
  ProductDetail: { product?: Product; productId?: string };
  Checkout: {
    selectedItems?: CartItem[];
    deliveryAddress?: string;
    deliveryCoordinates?: { latitude: number; longitude: number };
    isGift?: boolean;
    recipientName?: string;
    registryLocation?: string;
    recipientId?: string;
  };
  PaymentGateway: {
    paymentMethod: string;
    order?: Order;
    isQuickCheckout?: boolean;
    earnedBazcoins?: number;
    checkoutPayload?: any;
    bazcoinDiscount?: number;
    appliedVoucher?: any;
    isGift?: boolean;
    isAnonymous?: boolean;
    recipientId?: string;
  };
  OrderConfirmation: { order: Order; earnedBazcoins?: number; isQuickCheckout?: boolean };
  OrderResult: {
    order: Order;
    status: 'success' | 'failed' | 'processing' | 'pending_3ds' | 'insufficient_funds' | 'card_expired' | 'invalid_cvc' | 'fraudulent' | 'generic_decline' | 'processor_blocked';
    earnedBazcoins?: number;
    paymentMethod?: string;
    transactionID?: string;
    errorCode?: string;
    errorMessage?: string;
  };
  Orders: { initialTab?: 'all' | 'pending' | 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'received' | 'reviewed' | 'returned' | 'cancelled' };
  OrderDetail: { order: Order };
  SellerOrderDetail: { orderId: string };
  DeliveryTracking: { order: Order };
  FlashSale: undefined;
  FollowingShops: undefined;
  Wishlist: undefined;
  SharedWishlist: { wishlistId?: string; userId?: string };
  FindWishlist: undefined;
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
  SellerDemand: undefined;
  BrowseRequests: { initialSearch?: string } | undefined;
  CreateProductRequest: undefined;
  CreateTicket: undefined;
  TicketDetail: { ticketId: string };
  Messages: undefined;
  Categories: { categoryId?: string; categoryName?: string } | undefined;
  AddProduct: undefined;
  PaymentCallback: {
    type: 'success' | 'failed' | 'callback' | 'sandbox-ewallet';
    txn?: string;
    src?: string;
  };
  Chat: {
    conversation: any; // Using any to avoid circular dependency or import issues, but ideally Conversation type
    currentUserId: string;
    userType: 'buyer' | 'seller';
  };
  Favorites: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Deep link configuration for payment callbacks and OAuth
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['bazaarx://', 'exp://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
      PaymentCallback: {
        path: 'payment/:type',
        parse: {
          type: (type: string) => type as 'success' | 'failed' | 'callback' | 'sandbox-ewallet',
          txn: (txn: string) => txn,
          src: (src: string) => src,
        },
      },
      // OAuth callback deep link for Google Sign-In redirect
      // Matches:
      // - exp://192.168.x.x:8081/--/auth/callback (Expo Go)
      // - bazaarx://auth/callback (native)
      // When Supabase redirects after Google auth, this route captures it
      Login: {
        path: 'auth/callback',
        parse: {},
      },
    },
  },
  async getInitialURL() {
    // Handle notification-opened app cold start
    const url = await Linking.getInitialURL();
    if (url != null) {
      console.log('[App] Initial URL from cold start:', url);
      return url;
    }
    // Handle app launched from deep link
    return undefined;
  },
};

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  // Real-time in-app foreground notifications for order status changes
  useGlobalNotifications();
  const [unreadMsgCount, setUnreadMsgCount] = React.useState(0);
  const unsubChatRef = useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const fetchCount = () =>
      chatService.getUnreadCount(user.id, 'buyer').then((count) => {
        if (active) setUnreadMsgCount(count);
      });

    fetchCount();

    if (!unsubChatRef.current) {
      unsubChatRef.current = chatService.subscribeToConversations(
        user.id,
        'buyer',
        () => { void fetchCount(); }
      );
    }

    const interval = setInterval(fetchCount, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  React.useEffect(() => {
    return () => {
      if (unsubChatRef.current) {
        unsubChatRef.current();
        unsubChatRef.current = null;
      }
    };
  }, []);

  return (
    <ErrorBoundary>
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
        <Tab.Screen
          name="Discover"
          getComponent={() => require('./app/DiscoverScreen').default}
          options={{
            tabBarLabel: 'Lab',
            tabBarIcon: ({ color, size }) => <FlaskConical size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
    </ErrorBoundary>
  );
}

export default function App() {
  const { user } = useAuthStore();
  const sessionVerified = useAuthStore((s) => s.sessionVerified);
  const appState = useRef(AppState.currentState);
  const hasOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const hasSeenWelcome = useAuthStore((s) => s.hasSeenWelcome);

  // Handle logout and T&C enforcement navigation
  React.useEffect(() => {
    if (!navigationRef.current || !sessionVerified) {
      console.log(`[App] 🚦 Navigation guard: ref=${!!navigationRef.current}, verified=${sessionVerified}`);
      return;
    }

    console.log(`[App] 🧭 Routing check: user=${!!user}, onboarding=${hasOnboarding}, welcome=${hasSeenWelcome}`);

    if (!user) {
      // User has logged out or session check confirmed no user
      if (hasSeenWelcome) {
        console.log('[App] 🚪 Redirecting to Login...');
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        console.log('[App] 🏁 Redirecting to Onboarding...');
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
    } else {
      // User is authenticated, redirection to MainTabs happens in SplashScreen
      // or after a successful Login. App.tsx usually doesn't force a redirect TO Home
      // while the user is mid-session, unless there's a specific reason.
      console.log('[App] ✅ User authenticated, staying on current screen.');
    }
  }, [user, sessionVerified, hasOnboarding, hasSeenWelcome]);

  React.useEffect(() => {
    // Suppress noisy warnings that are already handled in supabase.ts
    LogBox.ignoreLogs([
      'AuthApiError: Invalid Refresh Token',
      'Invalid Refresh Token',
      'Refresh Token Not Found',
      '[Push] Token registration failed',
      'expo-notifications: Android Push notifications',
      '`expo-notifications` functionality is not fully supported in Expo Go',
      'expo-notifications: Android Push notifications (remote notifications)',
      'Use a development build instead of Expo Go',
    ]);

    // Helper function: Process auth deep link with retries and iOS delay
    const processAuthDeepLink = async (deepLinkUrl: string, maxAttempts = 3): Promise<{ success: boolean; error?: string }> => {
      // 1. Delay on iOS to allow the networking stack to wake up
      if (Platform.OS === 'ios') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`[App] 🔐 Deep link auth attempt ${attempt}/${maxAttempts}...`);

          if (/[?&#]code=([^&#]+)/.test(deepLinkUrl)) {
            // PKCE Flow
            const { error } = await supabase.auth.exchangeCodeForSession(deepLinkUrl);
            if (error) throw error;
            console.log('[App] ✅ Session established via code exchange.');
            return { success: true };
          } else if (/[?&#]error=([^&#]+)/.test(deepLinkUrl)) {
            // Handle deep link errors directly (e.g., expired OTP)
            const parts = deepLinkUrl.includes('#') ? deepLinkUrl.split('#')[1] : deepLinkUrl.split('?')[1];
            if (!parts) return { success: false, error: 'Auth error parameter found but URL is malformed' };

            const params: Record<string, string> = {};
            parts.split('&').forEach(part => {
              const [key, val] = part.split('=');
              if (key && val) params[key] = decodeURIComponent(val.replace(/\+/g, ' '));
            });

            return { success: false, error: params.error_description || 'Authentication failed (link may be expired)' };
          } else if (deepLinkUrl.includes('access_token=') || deepLinkUrl.includes('refresh_token=')) {
            // Fragment Flow
            const parts = deepLinkUrl.includes('#') ? deepLinkUrl.split('#')[1] : deepLinkUrl.split('?')[1];
            if (!parts) throw new Error('Invalid fragment URL');

            const params: Record<string, string> = {};
            parts.split('&').forEach(part => {
              const [key, val] = part.split('=');
              if (key && val) params[key] = decodeURIComponent(val);
            });

            if (params.access_token || params.refresh_token) {
              const { error } = await supabase.auth.setSession({
                access_token: params.access_token || '',
                refresh_token: params.refresh_token || '',
              });
              if (error) throw error;
              console.log('[App] ✅ Session established successfully from fragment.');
              return { success: true };
            } else {
              throw new Error('No tokens found in fragment');
            }
          }

          return { success: false, error: 'Unrecognized auth deep link format' };
        } catch (err: any) {
          logDetailedError(`AuthDeepLink (Attempt ${attempt}/${maxAttempts})`, err, deepLinkUrl);

          // Don't retry on auth/validation errors, only network errors
          const isNetworkError =
            err?.message?.includes('Network request failed') ||
            err?.message?.includes('timeout') ||
            err?.message?.includes('ETIMEDOUT') ||
            err?.message?.includes('ECONNREFUSED') ||
            err?.name === 'AuthRetryableFetchError';

          if (attempt === maxAttempts || !isNetworkError) {
            console.error(`[App] ❌ Deep link auth failed after ${attempt} attempt(s):`, err?.message);

            if (isNetworkError) {
              console.log('[App] 🔍 Running network diagnostics...');
              const diagnostics = await runFullNetworkDiagnostics();
              return {
                success: false,
                error: `Network error after ${maxAttempts} attempts. See logs for diagnostics.`
              };
            }

            return {
              success: false,
              error: err?.message || 'Deep link auth failed'
            };
          }

          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`[App] ⏳ Retrying in ${waitTime / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      return { success: false, error: 'Deep link auth failed after all retries' };
    };

    // Deep link listener for handling OAuth and Email confirmation redirects
    const unsubscribeDeepLink = Linking.addEventListener('url', async ({ url }) => {
      console.log('[App] Deep link received:', url);

      if (/[?&#]code=/.test(url) || url.includes('access_token=') || url.includes('refresh_token=') || /[?&#]error=/.test(url)) {
        console.log('[App] 🔐 Processing auth deep link...');
        const isResetPassword = url.includes('reset-password');
        const result = await processAuthDeepLink(url, 3);
        if (!result.success) {
          console.error('[App] ❌ Deep link auth flow failed:', result.error);
          Alert.alert('Authentication Failed', result.error);
          navigationRef.current?.navigate('Login');
        } else if (isResetPassword) {
          console.log('[App] 🎯 Reset password link detected, navigating to ResetPassword screen...');
          // Small delay to ensure session is fully propagated before navigation
          setTimeout(() => {
            navigationRef.current?.navigate('ResetPassword');
          }, 500);
        }
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[App] Auth state change:', event, session?.user?.email);

      if (event === 'SIGNED_OUT') {
        // Only call signOut if we still have local user data and aren't already signing out.
        // This prevents the loop: checkSession -> signOut -> SIGNED_OUT -> signOut
        const authState = useAuthStore.getState();
        if (authState.user && !authState.loading) {
          console.log('[App] 🚪 SIGNED_OUT event: clearing local session...');
          authState.signOut();
        }
      } else if (event === 'PASSWORD_RECOVERY') {

        console.log('[App] 🔑 PASSWORD_RECOVERY event');
      } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        // Session restored/signed in — sync auth store
        console.log(`[App] 🔐 ${event} event fired, calling checkSession...`);
        useAuthStore.getState().checkSession?.();
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeDeepLink.remove();
    };
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

  // ─── Push Notifications: register token on login, route taps ──────────
  React.useEffect(() => {
    if (!user?.id) {
      // Always set up handlers (no-op if already torn down)
      pushNotificationService.teardownHandlers();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await pushNotificationService.register(user.id);
        if (cancelled) return;

        pushNotificationService.setupHandlers((data: PushNotificationData) => {
          // Deep-link based on payload type
          const nav = navigationRef.current;
          if (!nav) return;

          try {
            switch (data?.type) {
              case 'order':
              case 'order_update':
                if (data.orderId) {
                  nav.navigate('OrderDetail', { order: { id: data.orderId } });
                } else {
                  nav.navigate('Orders');
                }
                break;
              case 'seller_order':
                nav.navigate('SellerOrderDetail', { orderId: data.orderId });
                break;
              case 'chat':
              case 'message':
              case 'new_message':
                nav.navigate('Messages');
                break;
              case 'return':
                nav.navigate('ReturnOrders');
                break;
              default:
                nav.navigate('Notifications');
            }
          } catch (err) {
            console.warn('[Push] Deep link nav failed:', err);
          }
        });
      } catch (err) {
        console.warn('[Push] Setup failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      pushNotificationService.teardownHandlers();
    };
  }, [user?.id]);

  // Unregister token when user explicitly signs out
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        const previousUserId = useAuthStore.getState().user?.id;
        if (previousUserId) {
          await pushNotificationService.unregister(previousUserId).catch(() => { });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <NavigationContainer linking={linking} ref={navigationRef}>
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
                name="ForgotPassword"
                getComponent={() => require('./app/ForgotPasswordScreen').default}
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="ResetPassword"
                getComponent={() => require('./app/ResetPasswordScreen').default}
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="EmailVerification"
                getComponent={() => require('./app/onboarding/EmailVerificationScreen').default}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="EmailConfirmed"
                getComponent={() => require('./app/onboarding/EmailConfirmedScreen').default}
                options={{ animation: 'fade' }}
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
                name="SellerFinalize"
                getComponent={() => require('./app/seller/finalize').default}
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
              <Stack.Screen name="ProductListing" getComponent={() => require('./app/ProductListingScreen').default} options={{ headerShown: false }} />
              <Stack.Screen name="SearchResults" getComponent={() => require('./app/SearchResultsScreen').default} options={{ headerShown: false }} />
              <Stack.Screen name="ProductDetail" getComponent={() => require('./app/ProductDetailScreen').default} />
              <Stack.Screen name="Checkout" getComponent={() => require('./app/CheckoutScreen').default} />
              <Stack.Screen name="PaymentGateway" getComponent={() => require('./app/PaymentGatewayScreen').default} options={{ headerShown: false }} />
              <Stack.Screen name="PaymentCallback" getComponent={() => require('./app/PaymentCallbackScreen').default} options={{ headerShown: false }} />
              <Stack.Screen name="OrderConfirmation" getComponent={() => require('./app/OrderConfirmation').default} />
              <Stack.Screen name="OrderResult" getComponent={() => require('./app/OrderResultScreen').default} options={{ headerShown: false }} />
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
              <Stack.Screen name="FindWishlist" getComponent={() => require('./app/FindWishlistScreen').default} />
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
              <Stack.Screen name="SellerDemand" getComponent={() => require('./app/SellerDemandScreen').default} options={{ headerShown: false }} />
              <Stack.Screen name="BrowseRequests" getComponent={() => require('./app/BrowseRequestsScreen').default} options={{ headerShown: false }} />
              <Stack.Screen name="CreateProductRequest" getComponent={() => require('./app/CreateProductRequestScreen').default} options={{ headerShown: false }} />
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
              <Stack.Screen name="Favorites" getComponent={() => require('./app/FavoritesScreen').default} />
              <Stack.Screen name="AdminStack" getComponent={() => require('./app/admin/AdminStack').default} options={{ headerShown: false }} />
            </Stack.Navigator>
          </NavigationContainer>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
