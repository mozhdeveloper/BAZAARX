import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/globals.css';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrdersPage from './pages/OrdersPage';
import DeliveryTrackingPage from './pages/DeliveryTrackingPage';

// Enhanced Buyer Pages
import EnhancedCartPage from './pages/EnhancedCartPage';
import BuyerProfilePage from './pages/BuyerProfilePage';
import SellerStorefrontPage from './pages/SellerStorefrontPage';
import ReviewsPage from './pages/ReviewsPage';

// Seller Pages
import { SellerLogin, SellerRegister } from './pages/SellerAuth';
import { SellerDashboard } from './pages/SellerDashboard';
import { SellerProducts, AddProduct } from './pages/SellerProducts';
import { SellerOrders } from './pages/SellerOrders';

// Admin Pages
import AdminAuth from './pages/AdminAuth';
import AdminDashboard from './pages/AdminDashboard';
import AdminCategories from './pages/AdminCategories';
import AdminSellers from './pages/AdminSellers';
import AdminBuyers from './pages/AdminBuyers';

function App() {
  return (
    <Router>
      <Routes>
        {/* Buyer Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/enhanced-cart" element={<EnhancedCartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
        <Route path="/delivery-tracking/:orderId" element={<DeliveryTrackingPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/profile" element={<BuyerProfilePage />} />
        <Route path="/seller/:sellerId" element={<SellerStorefrontPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        
        {/* Seller Routes */}
        <Route path="/seller/login" element={<SellerLogin />} />
        <Route path="/seller/register" element={<SellerRegister />} />
        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="/seller/products" element={<SellerProducts />} />
        <Route path="/seller/products/add" element={<AddProduct />} />
        <Route path="/seller/orders" element={<SellerOrders />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminAuth />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/sellers" element={<AdminSellers />} />
        <Route path="/admin/buyers" element={<AdminBuyers />} />
      </Routes>
    </Router>
  );
}

export default App;
