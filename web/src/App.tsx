import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./styles/globals.css";
import { Toaster } from "./components/ui/toaster";
import ScrollToTop from "./components/ScrollToTop";
import { ChatBubble } from "./components/ChatBubbleAI";
import { ProtectedSellerRoute } from "./components/ProtectedSellerRoute";
import TrackingForm from "./components/TrackingForm";
import PageLoader from "./components/PageLoader";
import { usePresence } from './hooks/usePresence'; import { ErrorBoundary } from "react-error-boundary";
import { OrderErrorFallback } from "./components/OrderErrorFallback";

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
const ProfileComponentsTest = lazy(() => import("./pages/ProfileComponentsTest"));
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

// QA Team pages
const QADashboard = lazy(() => import("./pages/QADashboard"));
const AdminQADashboard = lazy(() => import("./pages/AdminQADashboard"));

function App() {
  // 👉 NEW: This single line powers the entire global presence system!
  usePresence();

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
                // <ProtectedBuyerRoute>
                <BuyerOnboardingPage />
                // </ProtectedBuyerRoute>
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
                // <ProtectedBuyerRoute>
                <EnhancedCartPage />
                // </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                // <ProtectedBuyerRoute>
                <CheckoutPage />
                // </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/order-confirmation/:orderId"
              element={
                // <ProtectedBuyerRoute>
                <OrderConfirmationPage />
                // </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/delivery-tracking/:orderNumber"
              element={
                // <ProtectedBuyerRoute>
                <DeliveryTrackingPage />
                // </ProtectedBuyerRoute>
              }
            />
            <Route path="/payment/success" element={<PaymentCallbackPage />} />
            <Route path="/payment/failed" element={<PaymentCallbackPage />} />
            <Route path="/payment/sandbox-ewallet" element={<PaymentCallbackPage />} />
            <Route
              path="/orders"
              element={
                // <ProtectedBuyerRoute>
                <OrdersPage />
                // </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/order/:orderId"
              element={
                // <ProtectedBuyerRoute>
                <ErrorBoundary FallbackComponent={OrderErrorFallback}>
                  <OrderDetailPage />
                </ErrorBoundary>
                // </ProtectedBuyerRoute>
              }
            />

            <Route
              path="/profile"
              element={
                // <ProtectedBuyerRoute>
                <BuyerProfilePage />
                // </ProtectedBuyerRoute>
              }
            />
            {/* Temporary test route for Phase 1 refactoring */}
            <Route
              path="/test-profile-components"
              element={<ProfileComponentsTest />}
            />
            <Route
              path="/seller/:sellerId"
              element={<SellerStorefrontPage />}
            />
            <Route
              path="/messages"
              element={
                // <ProtectedBuyerRoute>
                <MessagesPage />
                // </ProtectedBuyerRoute>
              }
            />

            <Route
              path="/following"
              element={
                // <ProtectedBuyerRoute>
                <BuyerFollowingPage />
                // </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/my-requests"
              element={
                //<ProtectedBuyerRoute>
                <BuyerProductRequestsPage />
                //</ProtectedBuyerRoute>
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
                //<ProtectedBuyerRoute>
                <BuyerSettingsPage />
                //</ProtectedBuyerRoute>
              }
            />
            <Route
              path="/buyer-support"
              element={
                //<ProtectedBuyerRoute>
                <BuyerSupport />
                //</ProtectedBuyerRoute>
              }
            />
            <Route
              path="/my-tickets"
              element={
                //<ProtectedBuyerRoute>
                <MyTickets />
                //</ProtectedBuyerRoute>
              }
            />
            <Route
              path="/returns"
              element={
                // <ProtectedBuyerRoute>
                <BuyerReturnsListPage />
                // </ProtectedBuyerRoute>
              }
            />
            <Route
              path="/order/:orderId/return"
              element={
                // <ProtectedBuyerRoute>
                <BuyerReturnRequestPage />
                // </ProtectedBuyerRoute>
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
                  <SellerDashboard />
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
                  <SellerOrders />
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
                  <SellerPOS />
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
              path="/seller/announcements"
              element={
                <ProtectedSellerRoute>
                  <SellerAnnouncementsPage />
                </ProtectedSellerRoute>
              }
            />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminAuth />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route
              path="/admin/categories"
              element={<AdminCategories />}
            />
            <Route path="/admin/sellers" element={<AdminSellers />} />
            <Route path="/admin/buyers" element={<AdminBuyers />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/vouchers" element={<AdminVouchers />} />
            <Route
              path="/admin/reviews"
              element={<AdminReviewModeration />}
            />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route
              path="/admin/product-requests"
              element={<AdminProductRequests />}
            />
            <Route
              path="/admin/flash-sales"
              element={<AdminFlashSales />}
            />
            <Route path="/admin/payouts" element={<AdminPayouts />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route
              path="/admin/analytics"
              element={<AdminAnalytics />}
            />
            <Route path="/admin/tickets" element={<AdminTickets />} />
            <Route path="/admin/trusted-brands" element={<AdminTrustedBrands />} />
            <Route path="admin/announcements" element={<AdminAnnouncementsPage />} />
            <Route path="/admin/product-approvals" element={<QADashboard />} />
            <Route path="/admin/qa-dashboard" element={<AdminQADashboard />} />
            <Route path="/admin/returns" element={<AdminReturns />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
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
