import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, X, ShoppingBag, ArrowLeft, Truck } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { Button } from '../components/ui/button';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, getTotalItems, getTotalPrice } = useCartStore();
  
  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  const shippingFee = items.length > 0 && !items.every(item => item.isFreeShipping) ? 50 : 0;
  const finalTotal = totalPrice + shippingFee;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some amazing products to get started!</p>
            <Button 
              onClick={() => navigate('/shop')}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white"
            >
              Continue Shopping
            </Button>
          </motion.div>
        </div>
        
        <BazaarFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-gray-600">{totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Product Image */}
                  <div 
                    className="w-full sm:w-24 h-48 sm:h-24 bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => navigate(`/product/${item.id}`)}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 
                          className="font-semibold text-gray-900 cursor-pointer hover:text-[var(--brand-primary)] transition-colors"
                          onClick={() => navigate(`/product/${item.id}`)}
                        >
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">by {item.seller}</p>
                        {item.isFreeShipping && (
                          <div className="flex items-center gap-1 mt-1">
                            <Truck className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-600 font-medium">Free shipping</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-[var(--brand-primary)]">
                          ₱{item.price.toLocaleString()}
                        </span>
                        {item.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">
                            ₱{item.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 hover:bg-gray-100 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-4 py-2 font-medium min-w-[60px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-2 hover:bg-gray-100 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-sm text-gray-600">
                          Subtotal: ₱{(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-gray-50 rounded-xl p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({totalItems} items)</span>
                  <span>₱{totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping Fee</span>
                  <span>
                    {shippingFee === 0 ? (
                      <span className="text-green-600 font-medium">Free</span>
                    ) : (
                      `₱${shippingFee}`
                    )}
                  </span>
                </div>
                <hr className="border-gray-300" />
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-[var(--brand-primary)]">₱{finalTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white"
                >
                  Proceed to Checkout
                </Button>
                <Button
                  onClick={() => navigate('/shop')}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Continue Shopping
                </Button>
              </div>

              {/* Free Shipping Notice */}
              {items.some(item => !item.isFreeShipping) && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <Truck className="w-4 h-4 inline mr-1" />
                    Add ₱{Math.max(0, 500 - totalPrice)} more for free shipping on all items!
                  </p>
                </div>
              )}

              {/* Security Notice */}
              <div className="mt-4 text-xs text-gray-500 text-center">
                🔒 Secure checkout with 256-bit SSL encryption
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <BazaarFooter />
    </div>
  );
}