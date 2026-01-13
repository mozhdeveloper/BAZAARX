import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBuyerStore } from "../stores/buyerStore";
import Header from "../components/Header";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function EnhancedCartPage() {
  const navigate = useNavigate();
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

  const totalItems = getCartItemCount();
  const totalAmount = getCartTotal();

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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Shopping Cart
          </h1>
          <p className="text-gray-600">
            {totalItems} {totalItems === 1 ? "item" : "items"} from{" "}
            {Object.keys(groupedCart).length} seller
            {Object.keys(groupedCart).length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items - Grouped by Seller */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence>
              {Object.entries(groupedCart).map(
                ([sellerId, group], sellerIndex) => (
                  <motion.div
                    key={sellerId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: sellerIndex * 0.1 }}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm"
                  >
                    {/* Seller Header */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={group.seller.avatar}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">
                                {group.seller.name}
                              </span>
                              {group.seller.isVerified && (
                                <Badge variant="outline" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {group.seller.rating}
                              </span>
                              <span className="flex items-center gap-1">
                                <Store className="h-3 w-3" />
                                {group.seller.location}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/seller/${sellerId}`)}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          >
                            <Store className="h-4 w-4 mr-1" />
                            Visit Shop
                          </Button>
                          <Button
                            variant={
                              isFollowing(sellerId) ? "outline" : "default"
                            }
                            size="sm"
                            onClick={() =>
                              isFollowing(sellerId)
                                ? unfollowShop(sellerId)
                                : followShop(sellerId)
                            }
                            className={
                              isFollowing(sellerId)
                                ? "text-red-600 border-red-200 hover:bg-red-50"
                                : "bg-orange-500 hover:bg-orange-600"
                            }
                          >
                            <Heart
                              className={cn(
                                "h-4 w-4 mr-1",
                                isFollowing(sellerId) && "fill-current"
                              )}
                            />
                            {isFollowing(sellerId) ? "Following" : "Follow"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Product Items */}
                    <div className="p-6 space-y-4">
                      {group.items.map((item, itemIndex) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: sellerIndex * 0.1 + itemIndex * 0.05,
                          }}
                          className="flex gap-4 p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                        >
                          {/* Product Image */}
                          <img
                            src={item.image}
                            alt=""
                            className="w-20 h-20 object-cover rounded-lg"
                          />

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 mb-2">
                              {item.name}
                            </h4>

                            {/* Price Section */}
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-lg font-semibold text-orange-600">
                                ₱{(item.price * item.quantity).toLocaleString()}
                              </span>
                              {item.originalPrice && (
                                <span className="text-sm text-gray-500 line-through">
                                  ₱
                                  {(
                                    item.originalPrice * item.quantity
                                  ).toLocaleString()}
                                </span>
                              )}
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 border border-gray-200 rounded-lg">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateCartQuantity(
                                      item.id,
                                      item.quantity - 1
                                    )
                                  }
                                  className="h-8 w-8 p-0 hover:bg-gray-100"
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-10 text-center font-medium text-sm">
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
                                  className="h-8 w-8 p-0 hover:bg-gray-100"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Seller Total */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">
                          Seller Total
                        </span>
                        <span className="text-lg font-bold text-orange-600">
                          ₱
                          {(
                            group.subtotal + group.shippingFee
                          ).toLocaleString()}
                        </span>
                      </div>
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
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-4">
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
                  <span>Items ({totalItems})</span>
                  <span>
                    ₱
                    {Object.values(groupedCart)
                      .reduce((sum, group) => sum + group.subtotal, 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>
                    ₱
                    {Object.values(groupedCart)
                      .reduce((sum, group) => sum + group.shippingFee, 0)
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
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                Proceed to Checkout
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
