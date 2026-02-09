import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBuyerStore } from "../stores/buyerStore";
import Header from "../components/Header";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Tag,
  Store,
  Heart,
  Star,
  Shield,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function EnhancedCartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cartItems,
    groupedCart,
    updateCartQuantity,
    removeFromCart,
    validateVoucher,
    applyVoucher,
    getCartTotal,
    getCartItemCount,
    groupCartBySeller,
    followShop,
    unfollowShop,
    isFollowing,
    clearQuickOrder,
    toggleItemSelection,
    toggleSellerSelection,
    selectAllItems,
    getSelectedTotal,
    getSelectedCount,
  } = useBuyerStore();

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState("");
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  // Clear quick order when user navigates to cart
  useEffect(() => {
    clearQuickOrder();
  }, []);

  useEffect(() => {
    groupCartBySeller();
  }, [cartItems]);

  // Track processed navigation to prevent re-selecting if user unselects
  const processedKeyRef = useRef<string | null>(null);

  // Handle auto-selection from navigation state (e.g. Buy Again)
  useEffect(() => {
    const state = location.state as { selectedItems?: string[] } | null;

    // Check if we have items selection request and cart has items
    if (state?.selectedItems && state.selectedItems.length > 0 && cartItems.length > 0) {
      // If we already processed this navigation key, don't force selection again
      if (processedKeyRef.current === location.key) {
        return;
      }

      // Small timeout to ensure store state is settled
      const timer = setTimeout(() => {
        // Then select the requested items
        state.selectedItems.forEach(id => {
          // Find all matching items (handling variants)
          const items = cartItems.filter(i => i.id === id);
          items.forEach(item => {
            // Select if not already selected
            if (!item.selected) {
              toggleItemSelection(item.id, item.selectedVariant?.id);
            }
          });
        });
      }, 500);

      // Mark this navigation as processed
      processedKeyRef.current = location.key;

      return () => clearTimeout(timer);
    }
  }, [location.state, cartItems, location.key]); // Depend on cartItems to ensure fresh state

  const totalItems = getCartItemCount();
  const selectedCount = getSelectedCount();
  const selectedTotal = getSelectedTotal();
  const totalAmount = selectedTotal; // Use selected total for display

  // Calculate "Select All" state
  const allSelected = cartItems.length > 0 && cartItems.every(item => item.selected);
  const someSelected = cartItems.some(item => item.selected) && !allSelected;

  const handleApplyVoucher = async (sellerId?: string) => {
    if (!voucherCode.trim()) {
      setVoucherError("Please enter a voucher code");
      return;
    }

    setIsApplyingVoucher(true);
    setVoucherError("");

    try {
      const voucher = await validateVoucher(voucherCode, sellerId);

      if (voucher) {
        applyVoucher(voucher, sellerId);
        setVoucherCode("");
        setVoucherError("");
      } else {
        setVoucherError("Invalid voucher code or minimum order not met");
      }
    } catch (error) {
      setVoucherError("Failed to validate voucher");
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-64 h-64 mx-auto mb-8 relative">
              <img
                src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=400&fit=crop"
                alt="Empty cart"
                className="w-full h-full object-cover rounded-2xl"
              />
              <div className="absolute inset-0 bg-orange-500/10 rounded-2xl" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Start shopping and discover amazing products from trusted sellers!
            </p>
            <Button
              onClick={() => navigate("/shop")}
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              Start Shopping
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="mb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-[#ff6a00] transition-colors mb-4 group"
            >
              <div className="p-1.5">
                <ChevronLeft className="w-4 h-4 mt-2" />
              </div>
              <span className="font-medium text-sm mt-2">Continue Shopping</span>
            </button>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Shopping Cart
              </h1>
            </div>
          </div>


        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-2">
          {/* Cart Items - Grouped by Seller */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sticky Select All Bar */}
            <div className="sticky top-4 z-10 bg-gray-50/95 backdrop-blur-sm py-2 flex items-center justify-end gap-2 -mb-4">
              <Checkbox
                checked={allSelected || (someSelected ? "indeterminate" : false)}
                onCheckedChange={(checked) => selectAllItems(checked === true)}
              />
              <span className="text-xs font-small text-gray-600">Select All Items ({totalItems})</span>
            </div>

            <AnimatePresence>
              {Object.entries(groupedCart).map(
                ([sellerId, group], sellerIndex) => (
                  <motion.div
                    key={sellerId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: sellerIndex * 0.1 }}
                    className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-lg transition-shadow"
                  >
                    {/* Seller Header */}
                    <div className="border-b border-gray-100 pb-2 mb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={group.items.every(item => item.selected)}
                            onCheckedChange={(checked) => toggleSellerSelection(sellerId, checked === true)}
                          />
                          <img
                            src={group.seller.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">
                                {group.seller.name}
                              </span>
                              {group.seller.isVerified && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                  Verified
                                </Badge>
                              )}
                              <button
                                onClick={() => navigate(`/seller/${sellerId}`)}
                                className="text-xs text-gray-400 hover:text-[#ff6a00] flex items-center transition-colors ml-2"
                              >
                                Visit Shop <ChevronRight className="h-3 w-3 ml-0.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product Items */}
                    <div className="space-y-0">
                      {group.items.map((item, itemIndex) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: sellerIndex * 0.1 + itemIndex * 0.05,
                          }}
                          className="flex items-center justify-between gap-3 w-full border-b border-gray-50 pb-4 pt-4 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Checkbox
                              checked={item.selected || false}
                              onCheckedChange={() => toggleItemSelection(item.id, item.selectedVariant?.id)}
                            />

                            {/* Product Image */}
                            <img
                              src={item.image}
                              alt=""
                              className="w-16 h-16 object-cover rounded-md border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => navigate(`/product/${item.id}`)}
                            />

                            {/* Product Details */}
                            <div className="flex-1 min-w-0">
                              <h4
                                className="font-medium text-gray-900 text-sm mb-1 truncate cursor-pointer hover:text-[#ff6a00] transition-colors"
                                onClick={() => navigate(`/product/${item.id}`)}
                              >
                                {item.name}
                              </h4>

                              {/* Quantity Controls */}
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm font-bold text-[#FF5722]">
                                  ₱{(item.price * item.quantity).toLocaleString()}
                                </span>
                                {item.originalPrice && (
                                  <span className="text-xs text-gray-400 line-through">
                                    ₱{(item.originalPrice * item.quantity).toLocaleString()}
                                  </span>
                                )}

                                <div className="flex items-center gap-2 border border-gray-200 rounded-md bg-white">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      updateCartQuantity(
                                        item.id,
                                        item.quantity - 1
                                      )
                                    }
                                    className="h-6 w-6 p-0 hover:bg-base hover:text-red-500"
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center font-medium text-xs">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      updateCartQuantity(
                                        item.id,
                                        item.quantity + 1
                                      )
                                    }
                                    className="h-6 w-6 p-0 hover:bg-base hover:text-green-500"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Seller Total */}
                    <div className="flex justify-end items-center pt-2 border-t border-gray-50 mt-2">
                      <span className="text-sm text-gray-500 mr-2">
                        Seller Total:
                      </span>
                      <span className="text-lg font-bold text-[#FF5722]">
                        ₱
                        {(
                          group.subtotal + group.shippingFee
                        ).toLocaleString()}
                      </span>
                    </div>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Order Summary
              </h3>

              {/* Voucher Section */}
              <div className="mb-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-900">
                      Apply Voucher
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter voucher code"
                      value={voucherCode}
                      onChange={(e) =>
                        setVoucherCode(e.target.value.toUpperCase())
                      }
                      className="flex-1"
                    />
                    <Button
                      onClick={() => handleApplyVoucher()}
                      disabled={isApplyingVoucher || !voucherCode.trim()}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      Apply
                    </Button>
                  </div>
                  {voucherError && (
                    <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                      <AlertCircle className="h-4 w-4" />
                      {voucherError}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span>Selected ({selectedCount})</span>
                  <span>
                    ₱
                    {/* Only sum selected items subtotal */}
                    {Object.values(groupedCart)
                      .reduce((sum, group) => sum + group.items.filter(i => i.selected).reduce((is, i) => is + (i.selectedVariant?.price || i.price) * i.quantity, 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>
                    ₱
                    {/* Only sum shipping for groups with selected items */}
                    {Object.values(groupedCart)
                      .reduce((sum, group) => {
                        const hasSelected = group.items.some(i => i.selected);
                        return sum + (hasSelected ? group.shippingFee : 0);
                      }, 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-orange-600">
                    ₱{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => navigate("/checkout")}
                size="lg"
                disabled={selectedCount === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Proceed to Checkout ({selectedCount})
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
