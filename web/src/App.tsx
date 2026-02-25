import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles/globals.css";
import { Toaster } from "./components/ui/toaster";
import ScrollToTop from "./components/ScrollToTop";
// import { OrderNotificationModal } from './components/OrderNotificationModal'; // Disabled for testing
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import SearchPage from "./pages/SearchPage";
import CollectionsPage from "./pages/CollectionsPage";
import StoresPage from "./pages/StoresPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import DeliveryTrackingPage from "./pages/DeliveryTrackingPage";

// Enhanced Buyer Pages
import EnhancedCartPage from "./pages/EnhancedCartPage";
import BuyerProfilePage from "./pages/BuyerProfilePage";
import SellerStorefrontPage from "./pages/SellerStorefrontPage";
import ReviewsPage from "./pages/ReviewsPage";
import BuyerReviewsPage from "./pages/BuyerReviewsPage";
import BuyerFollowingPage from "./pages/BuyerFollowingPage";
import BuyerSettingsPage from "./pages/BuyerSettingsPage";
import BuyerLoginPage from "./pages/BuyerLoginPage";
import BuyerSignupPage from "./pages/BuyerSignupPage";
import { ProtectedBuyerRoute } from "./components/ProtectedBuyerRoute";

// Seller Pages
import { SellerLogin, SellerRegister } from "./pages/SellerAuth";
import { SellerAuthChoice } from "./pages/SellerAuthChoice";
import { SellerOnboarding } from "./pages/SellerOnboarding";
import { SellerPendingApproval } from "./pages/SellerPendingApproval";
import { SellerDashboard } from "./pages/SellerDashboard";
import { SellerStoreProfile } from "./pages/SellerStoreProfile";
import { SellerEarnings } from "./pages/SellerEarnings";
import { SellerProducts, AddProduct } from "./pages/SellerProducts";
import { SellerOrders } from "./pages/SellerOrders";
import { SellerReturns } from "./pages/SellerReturns";
import { SellerReviews } from "./pages/SellerReviews";
import { SellerAnalytics } from "./pages/SellerAnalytics";
import { SellerSettings } from "./pages/SellerSettings";
import SellerFlashSales from "./pages/SellerFlashSales";
import SellerDiscounts from "./pages/SellerDiscounts";
import SellerMessages from "./pages/SellerMessages";
import SellerProductStatus from "./pages/SellerProductStatus";
import SellerPOS from "./pages/SellerPOS";
import { ProtectedSellerRoute } from "./components/ProtectedSellerRoute";

// Admin Pages
import AdminAuth from "./pages/AdminAuth";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCategories from "./pages/AdminCategories";
import AdminSellers from "./pages/AdminSellers";
import AdminBuyers from "./pages/AdminBuyers";
import AdminOrders from "./pages/AdminOrders";
import AdminVouchers from "./pages/AdminVouchers";
import AdminReviewModeration from "./pages/AdminReviewModeration";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminSettings from "./pages/AdminSettings";
import AdminProducts from "./pages/AdminProducts";
import AdminProductRequests from "./pages/AdminProductRequests";
import AdminFlashSales from "./pages/AdminFlashSales";
import AdminPayouts from "./pages/AdminPayouts";
import AdminProfile from "./pages/AdminProfile";
import AdminProductApprovals from "./pages/AdminProductApprovals";

function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Buyer Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<BuyerLoginPage />} />
          <Route path="/signup" element={<BuyerSignupPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/enhanced-cart"
            element={
              <ProtectedBuyerRoute>
                <EnhancedCartPage />
              </ProtectedBuyerRoute>
            }
          />
          <Route path="/checkout"
            element={
              <ProtectedBuyerRoute>
                <CheckoutPage />
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
            path="/delivery-tracking/:orderId"
            element={
              <ProtectedBuyerRoute>
                <DeliveryTrackingPage />
              </ProtectedBuyerRoute>
            }
          />
          <Route path="/orders"
            element={
              <ProtectedBuyerRoute>
                <OrdersPage />
              </ProtectedBuyerRoute>
            }
          />
          <Route path="/order/:orderId"
            element={
              <ProtectedBuyerRoute>
                <OrderDetailPage />
              </ProtectedBuyerRoute>
            }
          />

          <Route path="/profile"
            element={
              <ProtectedBuyerRoute>
                <BuyerProfilePage />
              </ProtectedBuyerRoute>
            }
          />
          <Route path="/seller/:sellerId" element={<SellerStorefrontPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/my-reviews"
            element={
              <ProtectedBuyerRoute>
                <BuyerReviewsPage />
              </ProtectedBuyerRoute>
            }
          />
          <Route path="/following"
            element={
              <ProtectedBuyerRoute>
                <BuyerFollowingPage />
              </ProtectedBuyerRoute>
            }
          />
          <Route path="/settings"
            element={
              <ProtectedBuyerRoute>
                <BuyerSettingsPage />
              </ProtectedBuyerRoute>
            }
          />
          {/* Seller Routes */}
          <Route path="/seller/auth" element={<SellerAuthChoice />} />
          <Route path="/seller/login" element={<SellerLogin />} />
          <Route path="/seller/register" element={<SellerRegister />} />
          <Route path="/seller/onboarding" element={<SellerOnboarding />} />
          <Route
            path="/seller/pending-approval"
            element={<SellerPendingApproval />}
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
            path="/seller/flash-sales"
            element={
              <ProtectedSellerRoute>
                <SellerFlashSales />
              </ProtectedSellerRoute>
            }
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

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminAuth />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/sellers" element={<AdminSellers />} />
          <Route path="/admin/buyers" element={<AdminBuyers />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/vouchers" element={<AdminVouchers />} />
          <Route path="/admin/reviews" element={<AdminReviewModeration />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route
            path="/admin/product-approvals"
            element={<AdminProductApprovals />}
          />
          <Route
            path="/admin/product-requests"
            element={<AdminProductRequests />}
          />
          <Route path="/admin/flash-sales" element={<AdminFlashSales />} />
          <Route path="/admin/payouts" element={<AdminPayouts />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Routes>

        {/* Global components that need Router context */}
        {/* <OrderNotificationModal /> - Disabled for testing */}
      </Router>
      <Toaster />
    </>
  );
}

export default App;
