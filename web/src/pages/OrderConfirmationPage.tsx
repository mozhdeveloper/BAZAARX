import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, Truck, MapPin, Phone, CreditCard, ArrowRight, Home } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { Button } from '../components/ui/button';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById } = useCartStore();

  const order = orderId ? getOrderById(orderId) : null;

  useEffect(() => {
    if (!order) {
      navigate('/');
    }
  }, [order, navigate]);

  if (!order) {
    return null;
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getPaymentMethodDisplay = (method: typeof order.paymentMethod) => {
    switch (method.type) {
      case 'card':
        return `Credit/Debit Card ending in ${method.details}`;
      case 'gcash':
        return `GCash (${method.details})`;
      case 'paymaya':
        return `PayMaya (${method.details})`;
      case 'cod':
        return 'Cash on Delivery';
      default:
        return method.type;
    }
  };

  const getOrderSteps = (orderStatus: string) => {
    const steps = [
      {
        id: 'confirmed',
        title: 'Order Confirmed',
        description: 'Your order has been placed successfully',
        icon: CheckCircle,
        completed: true,
        current: orderStatus === 'pending',
      },
      {
        id: 'processing',
        title: 'Processing',
        description: 'We\'re preparing your items',
        icon: Package,
        completed: ['confirmed', 'shipped', 'delivered'].includes(orderStatus),
        current: orderStatus === 'confirmed',
      },
      {
        id: 'shipped',
        title: 'Shipped',
        description: `Your order is on its way${order.trackingNumber ? ` (${order.trackingNumber})` : ''}`,
        icon: Truck,
        completed: ['delivered'].includes(orderStatus),
        current: orderStatus === 'shipped',
      },
      {
        id: 'delivered',
        title: 'Delivered',
        description: 'Order has been delivered',
        icon: CheckCircle,
        completed: orderStatus === 'delivered',
        current: false,
      },
    ];

    return steps;
  };

  const orderSteps = getOrderSteps(order.status);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-lg text-gray-600 mb-4">
            Thank you for your purchase. Your order has been successfully placed.
          </p>
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <span className="text-sm text-green-800">Order ID:</span>
            <span className="text-sm font-mono font-medium text-green-900">{order.id}</span>
          </div>
        </motion.div>

        {/* Order Progress */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Status</h2>
          <div className="relative">
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200"></div>
            <div className="space-y-8">
              {orderSteps.map((step) => (
                <div key={step.id} className="relative flex items-center">
                  <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${step.completed
                      ? 'bg-green-100 text-green-600'
                      : step.current
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div className="ml-6">
                    <h3 className={`text-lg font-semibold ${step.completed || step.current ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-gray-200 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Order Date:</span>
                <span className="text-gray-900">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estimated Delivery:</span>
                <span className="text-gray-900">{formatDate(order.estimatedDelivery)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Method:</span>
                <span className="text-gray-900">{getPaymentMethodDisplay(order.paymentMethod)}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between font-medium">
                <span className="text-gray-900">Total Amount:</span>
                <span className="text-[var(--brand-primary)]">₱{order.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 mb-3">Items Ordered</h4>
              <div className="space-y-3">
                {order.items.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">by {item.seller}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      ₱{(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Shipping Information */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white border border-gray-200 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Information</h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Delivery Address</span>
                </div>
                <div className="pl-6 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.street}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.province}</p>
                  <p>{order.shippingAddress.postalCode}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Contact Number</span>
                </div>
                <div className="pl-6 text-sm text-gray-600">
                  {order.shippingAddress.phone}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Payment</span>
                </div>
                <div className="pl-6 text-sm text-gray-600">
                  {getPaymentMethodDisplay(order.paymentMethod)}
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">What's Next?</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• You'll receive an SMS/email confirmation shortly</li>
                <li>• We'll notify you when your order is being prepared</li>
                <li>• Track your order anytime in "My Orders"</li>
                <li>• Estimated delivery: {formatDate(order.estimatedDelivery)}</li>
              </ul>
            </div>
          </motion.section>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mt-12"
        >
          <Button
            onClick={() => navigate('/orders')}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white"
          >
            <Package className="w-4 h-4 mr-2" />
            View My Orders
          </Button>
          <Button
            onClick={() => navigate('/shop')}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Continue Shopping
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </motion.div>
      </div>

      <BazaarFooter />
    </div>
  );
}