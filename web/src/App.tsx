import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./styles/globals.css";
import { Toaster } from "./components/ui/toaster";
import ScrollToTop from "./components/ScrollToTop";
import { ChatBubble } from "./components/ChatBubbleAI";
import { ProtectedSellerRoute } from "./components/ProtectedSellerRoute";
import { ProtectedBuyerRoute } from "./components/ProtectedBuyerRoute";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import TrackingForm from "./components/TrackingForm";
import PageLoader from "./components/PageLoader";
import { usePresence } from './hooks/usePresence'; import { ErrorBoundary } from "react-error-boundary";
import { OrderErrorFallback } from "./components/OrderErrorFallback";
import { AppErrorFallback } from "./components/AppErrorFallback";
import { supabase } from "./lib/supabase";

// for google auth
import { authService } from "./services/authService";
import { useBuyerStore, deriveBuyerName } from "./stores/buyerStore";

// ---------------------------------------------------------------------------
// Lazy-loaded pages — each becomes its own Vite chunk, loaded on first visit
// ---------------------------------------------------------------------------

// Helper: wrap named exports so React.lazy (which requires default) works
const lazyNamed = <T extends Record<string, any>>(
  factory: () => Promise<T>,
  name: keyof T
) => lazy(() => factory().then((m) => ({ default: m[name] as React.ComponentType<any> })));

// Public / Buyer pages (default exports)
const HomePage = lazy(() => import("./pages/HomePage"));
const SellerLandingPage = lazy(() => import("./pages/SellerLandingPage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const StoresPage = lazy(() => import("./pages/StoresPage"));
const FlashSalesPage = lazy(() => import("./pages/FlashSalesPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmationPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage"));
const DeliveryTrackingPage = lazy(() => import("./pages/DeliveryTrackingPage"));
const PaymentCallbackPage = lazy(() => import("./pages/PaymentCallbackPage"));
const RegistryAndGiftingPage = lazy(() => import("./pages/RegistryAndGiftingPage"));
const SharedRegistryPage = lazy(() => import("./pages/SharedRegistryPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const AboutUsPage = lazy(() => import("./pages/AboutUsPage"));

// Enhanced Buyer pages (default exports)
const EnhancedCartPage = lazy(() => import("./pages/EnhancedCartPage"));
const BuyerProfilePage = lazy(() => import("./pages/BuyerProfilePage"));
const SellerStorefrontPage = lazy(() => import("./pages/SellerStorefrontPage"));
const BuyerFollowingPage = lazy(() => import("./pages/BuyerFollowingPage"));
const BuyerSettingsPage = lazy(() => import("./pages/BuyerSettingsPage"));
const BuyerProductRequestsPage = lazy(() => import("./pages/BuyerProductRequestsPage"));
const ProductRequestDetailPage = lazy(() => import("./pages/ProductRequestDetailPage"));
const CommunityRequestsPage = lazy(() => import("./pages/CommunityRequestsPage"));
const BuyerLoginPage = lazy(() => import("./pages/BuyerLoginPage"));
const BuyerSignupPage = lazy(() => import("./pages/BuyerSignupPage"));
const BuyerSupport = lazyNamed(() => import("./pages/BuyerSupport"), "BuyerSupport");
const MyTickets = lazy(() => import("./pages/MyTickets"));
const BuyerOnboardingPage = lazy(() => import("./pages/BuyerOnboardingPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const BuyerReturnRequestPage = lazy(() => import("./pages/BuyerReturnRequestPage"));
const BuyerReturnsListPage = lazy(() => import("./pages/BuyerReturnsListPage"));

// Seller auth pages (named exports)
const SellerLogin = lazyNamed(() => import("./pages/SellerAuth"), "SellerLogin");
const SellerRegister = lazyNamed(() => import("./pages/SellerAuth"), "SellerRegister");
const SellerAuthChoice = lazyNamed(() => import("./pages/SellerAuthChoice"), "SellerAuthChoice");
const SellerOnboarding = lazyNamed(() => import("./pages/SellerOnboarding"), "SellerOnboarding");

// Seller protected pages (named exports)
const UnverifiedSellerPortal = lazyNamed(() => import("./pages/UnverifiedSellerPortal"), "UnverifiedSellerPortal");
const SellerDashboard = lazyNamed(() => import("./pages/SellerDashboard"), "SellerDashboard");
const SellerStoreProfile = lazyNamed(() => import("./pages/SellerStoreProfile"), "SellerStoreProfile");
const SellerEarnings = lazyNamed(() => import("./pages/SellerEarnings"), "SellerEarnings");
const SellerProducts = lazyNamed(() => import("./pages/SellerProducts"), "SellerProducts");
const AddProduct = lazyNamed(() => import("./pages/SellerProducts"), "AddProduct");
const SellerOrders = lazyNamed(() => import("./pages/SellerOrders"), "SellerOrders");
const SellerReturns = lazyNamed(() => import("./pages/SellerReturns"), "SellerReturns");
const SellerReviews = lazyNamed(() => import("./pages/SellerReviews"), "SellerReviews");
const SellerAnalytics = lazyNamed(() => import("./pages/SellerAnalytics"), "SellerAnalytics");
const SellerSettings = lazyNamed(() => import("./pages/SellerSettings"), "SellerSettings");
const SellerAccountBlocked = lazyNamed(() => import("./pages/SellerAccountBlocked"), "SellerAccountBlocked");
const AdminReturns = lazy(() => import("./pages/AdminReturns"));

// Seller protected pages (default exports)
const SellerNotifications = lazy(() => import("./pages/SellerNotifications"));
const SellerDiscounts = lazy(() => import("./pages/SellerDiscounts"));
const SellerBoostProduct = lazy(() => import("./pages/SellerBoostProduct"));
const SellerMessages = lazy(() => import("./pages/SellerMessages"));
const SellerProductStatus = lazy(() => import("./pages/SellerProductStatus"));
const SellerPOS = lazy(() => import("./pages/SellerPOS"));
const SellerPOSSettings = lazy(() => import("./pages/SellerPOSSettings"));
const SellerHelpCenter = lazy(() => import("./pages/SellerHelpCenter"));
const SellerMyTickets = lazy(() => import("./pages/SellerMyTickets"));
const SellerBuyerReports = lazy(() => import("./pages/SellerBuyerReports"));
const SellerAnnouncementsPage = lazy(() => import("./pages/SellerAnnouncementsPage"));
const SellerMarketing = lazy(() => import("./pages/SellerMarketing"));
const BuyerAnnouncementsPage = lazy(() => import("./pages/BuyerAnnouncementsPage"));

// Admin pages (default exports)
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminCategories = lazy(() => import("./pages/AdminCategories"));
const AdminSellers = lazy(() => import("./pages/AdminSellers"));
const AdminBuyers = lazy(() => import("./pages/AdminBuyers"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminVouchers = lazy(() => import("./pages/AdminVouchers"));
const AdminReviewModeration = lazy(() => import("./pages/AdminReviewModeration"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const AdminProductRequests = lazy(() => import("./pages/AdminProductRequests"));
const AdminFlashSales = lazy(() => import("./pages/AdminFlashSales"));
const AdminPayouts = lazy(() => import("./pages/AdminPayouts"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
// AdminProductApprovals removed - consolidated into QADashboard
const AdminTickets = lazy(() => import("./pages/AdminTickets"));
const AdminTrustedBrands = lazy(() => import("./pages/AdminTrustedBrands"));
const AdminAnnouncementsPage = lazy(() => import("./pages/AdminAnnouncementsPage"));
const AdminCRM = lazy(() => import("./pages/AdminCRM"));
const AdminNotificationSettings = lazy(() => import("./pages/AdminNotificationSettings"));

// QA Team pages
const QADashboard = lazy(() => import("./pages/QADashboard"));
const AdminQADashboard = lazy(() => import("./pages/AdminQADashboard"));

function App() {
  // 👉 NEW: This single line powers the entire global presence system!
  usePresence();

  // Global auth state listener — handles token refresh, sign-out, and session sync
  useEffect(() => {
    const handleAuthChange = async (event: string, session: any) => {
      // Track if this is an OAuth redirect (INITIAL_SESSION after page load with token)
      const isOAuthRedirect = event === 'INITIAL_SESSION' && window.location.hash.includes('access_token');

      // 1. Catch BOTH events: SIGNED_IN (direct login) and INITIAL_SESSION (page load after Google redirect)
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const { user } = session;

        try {
          // Extract details provided by Google
          const email = user.email || "";
          const googleFirstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || "";
          const googleLastName = user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || "";

          // Set minimal local profile immediately to prevent "Sign In" flicker after redirect
          // Use Google's avatar_url if available, otherwise use fallback
          const instantName = deriveBuyerName({
            first_name: googleFirstName,
            last_name: googleLastName,
            full_name: user.user_metadata?.full_name || null,
            email,
          });

          const avatarUrl = user.user_metadata?.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(instantName.displayFullName)}&background=FF6B35&color=fff`;

          useBuyerStore.getState().setProfile({
            id: user.id,
            email,
            firstName: instantName.firstName,
            lastName: instantName.lastName,
            phone: "",
            avatar: avatarUrl,
            bazcoins: 0,
            memberSince: new Date(),
            totalOrders: 0,
            totalSpent: 0,
            preferences: {},
          } as any);

          // 2. CREATE/UPDATE PROFILE: Force insert into the 'profiles' table
          const { error: profileUpsertError } = await supabase.from('profiles').upsert({
            id: user.id,
            email: email,
            first_name: googleFirstName,
            last_name: googleLastName,
            last_login_at: new Date().toISOString(),
          } as any, { onConflict: 'id' });

          if (profileUpsertError) {
             console.error("Failed to save profile to DB:", profileUpsertError);
          }

          // 3. CREATE BUYER & ROLE: This handles the 'buyers' and 'user_roles' tables
          await authService.createBuyerAccount(user.id);

          // 4. Fetch the latest profile to sync with the store
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          const { data: buyerData } = await supabase
            .from("buyers")
            .select("bazcoins, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          const profile = (profileData as any) || {};
          const buyer = (buyerData as any) || {};

          // 5. Derive names safely
          const { firstName, lastName, displayFullName } = deriveBuyerName({
            first_name: profile.first_name || googleFirstName,
            last_name: profile.last_name || googleLastName,
            full_name: user.user_metadata?.full_name || null, 
            email: email,
          });

          // 6. Update the global store so the UI changes from "Sign In" to the Profile Avatar
          useBuyerStore.getState().setProfile({
            id: user.id,
            email: email,
            firstName,
            lastName,
            phone: profile.phone || "",
            avatar: buyer.avatar_url || 
                    user.user_metadata?.avatar_url || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayFullName)}&background=FF6B35&color=fff`,
            bazcoins: buyer.bazcoins || 0,
            memberSince: profile.created_at ? new Date(profile.created_at) : new Date(),
            totalOrders: 0,
            totalSpent: 0,
            preferences: {}, 
          } as any);

          // 7. Initialize the cart (non-blocking)
          void useBuyerStore.getState().initializeCart();

          // 8. Redirect to shop if this was an OAuth redirect
          if (isOAuthRedirect) {
            window.location.hash = '/shop';
          }
          
        } catch (err) {
          console.error("Error during Google Auth sync:", err);
        }
      }

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('seller-auth-storage');
        localStorage.removeItem('admin-auth');
        localStorage.removeItem('buyer-store');
        useBuyerStore.getState().logout();
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      void handleAuthChange(event, session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Router>
        <ScrollToTop />
        <ChatBubble />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Buyer Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/sell" element={<SellerLandingPage />} />
            <Route path="/login" element={<BuyerLoginPage />} />
            <Route path="/signup" element={<BuyerSignupPage />} />
            <Route
              path="/buyer-onboarding"
              element={
                <ProtectedBuyerRoute>
                  <BuyerOnboardingPage />
                </ProtectedBuyerRoute>
              }
            />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/announcements" element={<BuyerAnnouncementsPage />} />
            <Route path="/flash-sales" element={<FlashSalesPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/stores" element={<StoresPage />} />
            <Route path="/about-us" element={<AboutUsPage />} />
            <Route
              path="/product/:id"
              element={<ProductDetailPage />}
            />
            <Route
              path="/registry"
              element={<RegistryAndGiftingPage />}
            />
            <Route
              path="/registry/:id"
              element={<SharedRegistryPage />}
            />
            <Route
              path="/enhanced-cart"
              element={
                <ProtectedBuyerRoute>
                  <ErrorBoundary FallbackComponent={AppErrorFallback}>
                    <EnhancedCartPage />
                  </ErrorBoundary>
                </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedBuyerRoute>
                  <ErrorBoundary FallbackComponent={AppErrorFallback}>
                    <CheckoutPage />
                  </ErrorBoundary>
                </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/order-confirmation/:orderId"
              element={
                <ProtectedBuyerRoute>
                  <OrderConfirmationPage />
                </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/delivery-tracking/:orderNumber"
              element={
                <ProtectedBuyerRoute>
                  <DeliveryTrackingPage />
                </ProtectedBuyerRoute>
              }
            />
            <Route path="/payment/success" element={<PaymentCallbackPage />} />
            <Route path="/payment/failed" element={<PaymentCallbackPage />} />
            <Route path="/payment/sandbox-ewallet" element={<PaymentCallbackPage />} />
            <Route
              path="/orders"
              element={
                <ProtectedBuyerRoute>
                  <OrdersPage />
                </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/order/:orderId"
              element={
                <ProtectedBuyerRoute>
                  <ErrorBoundary FallbackComponent={OrderErrorFallback}>
                    <OrderDetailPage />
                  </ErrorBoundary>
                </ProtectedBuyerRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedBuyerRoute>
                  <BuyerProfilePage />
                </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/seller/:sellerId"
              element={<SellerStorefrontPage />}
            />
            <Route
              path="/messages"
              element={
                <ProtectedBuyerRoute>
                  <MessagesPage />
                </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/following"
              element={
                <ProtectedBuyerRoute>
                  <BuyerFollowingPage />
                </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/my-requests"
              element={
                <ProtectedBuyerRoute>
                  <BuyerProductRequestsPage />
                </ProtectedBuyerRoute>
              }
            />
            <Route path="/requests" element={<CommunityRequestsPage />} />
            <Route
              path="/requests/:id"
              element={<ProductRequestDetailPage />}
            />
            <Route
              path="/settings"
              element={
                <ProtectedBuyerRoute>
                  <BuyerSettingsPage />
                </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/buyer-support"
              element={
                <ProtectedBuyerRoute>
                  <BuyerSupport />
                </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/my-tickets"
              element={
                <ProtectedBuyerRoute>
                  <MyTickets />
                </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/returns"
              element={
                <ProtectedBuyerRoute>
                  <BuyerReturnsListPage />
                </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/order/:orderId/return"
              element={
                <ProtectedBuyerRoute>
                  <BuyerReturnRequestPage />
                </ProtectedBuyerRoute>
              }
            />
            <Route path="/track-delivery" element={<TrackingForm />} />
            {/* Seller Routes */}
            <Route path="/seller/auth" element={<SellerAuthChoice />} />
            <Route path="/seller/login" element={<SellerLogin />} />
            <Route
              path="/seller/register"
              element={<SellerRegister />}
            />
            <Route
              path="/seller/onboarding"
              element={<SellerOnboarding />}
            />
            <Route
              path="/seller/pending-approval"
              element={<Navigate to="/seller/unverified" replace />}
            />
            <Route
              path="/seller/unverified"
              element={
                <ProtectedSellerRoute>
                  <UnverifiedSellerPortal />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/verification-requirements"
              element={<Navigate to="/seller/unverified" replace />}
            />
            <Route
              path="/seller/account-blocked"
              element={
                <ProtectedSellerRoute>
                  <SellerAccountBlocked />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller"
              element={
                <ProtectedSellerRoute>
                  <ErrorBoundary FallbackComponent={AppErrorFallback}>
                    <SellerDashboard />
                  </ErrorBoundary>
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/profile"
              element={
                <ProtectedSellerRoute>
                  <SellerStoreProfile />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/store-profile"
              element={
                <ProtectedSellerRoute>
                  <SellerStoreProfile />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/earnings"
              element={
                <ProtectedSellerRoute>
                  <SellerEarnings />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/products"
              element={
                <ProtectedSellerRoute>
                  <SellerProducts />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/products/add"
              element={
                <ProtectedSellerRoute>
                  <AddProduct />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/product-status-qa"
              element={
                <ProtectedSellerRoute>
                  <SellerProductStatus />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/orders"
              element={
                <ProtectedSellerRoute>
                  <ErrorBoundary FallbackComponent={AppErrorFallback}>
                    <SellerOrders />
                  </ErrorBoundary>
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/notifications"
              element={
                <ProtectedSellerRoute>
                  <SellerNotifications />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/returns"
              element={
                <ProtectedSellerRoute>
                  <SellerReturns />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/pos"
              element={
                <ProtectedSellerRoute>
                  <ErrorBoundary FallbackComponent={AppErrorFallback}>
                    <SellerPOS />
                  </ErrorBoundary>
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/pos-settings"
              element={
                <ProtectedSellerRoute>
                  <SellerPOSSettings />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/flash-sales"
              element={<Navigate to="/seller/discounts" replace />}
            />
            <Route
              path="/seller/discounts"
              element={
                <ProtectedSellerRoute>
                  <SellerDiscounts />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/boost"
              element={
                <ProtectedSellerRoute>
                  <SellerBoostProduct />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/messages"
              element={
                <ProtectedSellerRoute>
                  <SellerMessages />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/reviews"
              element={
                <ProtectedSellerRoute>
                  <SellerReviews />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/analytics"
              element={
                <ProtectedSellerRoute>
                  <SellerAnalytics />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/settings"
              element={
                <ProtectedSellerRoute>
                  <SellerSettings />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/help-center"
              element={
                <ProtectedSellerRoute>
                  <SellerHelpCenter />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/my-tickets"
              element={
                <ProtectedSellerRoute>
                  <SellerMyTickets />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/buyer-reports"
              element={
                <ProtectedSellerRoute>
                  <SellerBuyerReports />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/marketing"
              element={
                <ProtectedSellerRoute>
                  <SellerMarketing />
                </ProtectedSellerRoute>
              }
            />
            <Route
              path="/seller/announcements"
              element={
                <ProtectedSellerRoute>
                  <SellerAnnouncementsPage />
                </ProtectedSellerRoute>
              }
            />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminAuth />} />
            <Route path="/admin" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><ErrorBoundary FallbackComponent={AppErrorFallback}><AdminDashboard /></ErrorBoundary></ProtectedAdminRoute>} />
            <Route path="/admin/categories" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><ErrorBoundary FallbackComponent={AppErrorFallback}><AdminCategories /></ErrorBoundary></ProtectedAdminRoute>} />
            <Route path="/admin/sellers" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><ErrorBoundary FallbackComponent={AppErrorFallback}><AdminSellers /></ErrorBoundary></ProtectedAdminRoute>} />
            <Route path="/admin/buyers" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><AdminBuyers /></ProtectedAdminRoute>} />
            <Route path="/admin/orders" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><ErrorBoundary FallbackComponent={AppErrorFallback}><AdminOrders /></ErrorBoundary></ProtectedAdminRoute>} />
            <Route path="/admin/vouchers" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><AdminVouchers /></ProtectedAdminRoute>} />
            <Route path="/admin/reviews" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin', 'moderator']}><AdminReviewModeration /></ProtectedAdminRoute>} />
            <Route path="/admin/products" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin', 'qa_team']}><AdminProducts /></ProtectedAdminRoute>} />
            <Route path="/admin/product-requests" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><AdminProductRequests /></ProtectedAdminRoute>} />
            <Route path="/admin/flash-sales" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><AdminFlashSales /></ProtectedAdminRoute>} />
            <Route path="/admin/payouts" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><AdminPayouts /></ProtectedAdminRoute>} />
            <Route path="/admin/profile" element={<ProtectedAdminRoute><AdminProfile /></ProtectedAdminRoute>} />
            <Route path="/admin/analytics" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><ErrorBoundary FallbackComponent={AppErrorFallback}><AdminAnalytics /></ErrorBoundary></ProtectedAdminRoute>} />
            <Route path="/admin/tickets" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin', 'moderator']}><AdminTickets /></ProtectedAdminRoute>} />
            <Route path="/admin/trusted-brands" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><AdminTrustedBrands /></ProtectedAdminRoute>} />
            <Route path="/admin/announcements" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><AdminAnnouncementsPage /></ProtectedAdminRoute>} />
            <Route path="/admin/crm" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><AdminCRM /></ProtectedAdminRoute>} />
            <Route path="/admin/notifications" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><AdminNotificationSettings /></ProtectedAdminRoute>} />
            <Route path="/admin/product-approvals" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin', 'qa_team']}><QADashboard /></ProtectedAdminRoute>} />
            <Route path="/admin/qa-dashboard" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin', 'qa_team']}><AdminQADashboard /></ProtectedAdminRoute>} />
            <Route path="/admin/returns" element={<ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}><AdminReturns /></ProtectedAdminRoute>} />
            <Route path="/admin/settings" element={<ProtectedAdminRoute allowedRoles={['super_admin']}><ErrorBoundary FallbackComponent={AppErrorFallback}><AdminSettings /></ErrorBoundary></ProtectedAdminRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>

        {/* Global components that need Router context */}
        {/* <OrderNotificationModal /> - Disabled for testing */}
      </Router>
      <Toaster />
    </>
  );
}

export default App;
