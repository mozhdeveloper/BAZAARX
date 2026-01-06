import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Clock, 
  Package, 
  Truck, 
  CheckCircle, 
  Phone, 
  User, 
  Receipt, 
  ArrowLeft,
  Navigation,
  Zap,
  X,
  MessageCircle,
  Printer,
  Share2
} from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { BazaarFooter } from '../components/layout/BazaarFooter';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ReviewModal } from '../components/ReviewModal';

function DeliveryTrackingPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { orders } = useCartStore();
  const [showReceipt, setShowReceipt] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Find the order
  const order = orders.find(o => o.id === orderId) || orders[orders.length - 1];
  
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">The order you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')} className="bg-orange-500 hover:bg-orange-600">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Dummy tracking data
  const deliverySteps = [
    {
      id: 1,
      title: "Order Confirmed",
      description: "Your order has been placed and confirmed",
      time: "10:30 AM",
      status: currentStep >= 1 ? 'completed' : 'pending',
      location: {
        name: "BazaarPH Warehouse - Metro Manila",
        lat: 14.5995,
        lng: 120.9842
      }
    },
    {
      id: 2,
      title: "Package Prepared",
      description: "Your items are being packed for shipping",
      time: "11:15 AM", 
      status: currentStep >= 2 ? 'completed' : currentStep === 1 ? 'current' : 'pending',
      location: {
        name: "Processing Center - Quezon City",
        lat: 14.6760,
        lng: 121.0437
      }
    },
    {
      id: 3,
      title: "Out for Delivery",
      description: "Package is on the way to your location",
      time: "2:45 PM",
      status: currentStep >= 3 ? 'completed' : currentStep === 2 ? 'current' : 'pending',
      location: {
        name: "Distribution Hub - Makati City",
        lat: 14.5547,
        lng: 121.0244
      }
    },
    {
      id: 4,
      title: "Delivered",
      description: "Package delivered successfully",
      time: "4:20 PM",
      status: currentStep >= 4 ? 'completed' : currentStep === 3 ? 'current' : 'pending',
      location: {
        name: "Your Address - " + order.shippingAddress.city,
        lat: 14.5995,
        lng: 120.9842
      }
    }
  ];

  // Simulate tracking progress
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev < 4 ? prev + 1 : prev;
        
        // Cross-store sync: Update order status based on delivery step
        if (orderId) {
          // Update buyer order status
          const { updateOrderStatus } = useCartStore.getState();
          
          if (next === 2) {
            updateOrderStatus(orderId, 'confirmed');
          } else if (next === 3) {
            updateOrderStatus(orderId, 'shipped');
          } else if (next === 4) {
            updateOrderStatus(orderId, 'delivered');
            
            // Also update seller order to delivered and paid
            import('../stores/sellerStore').then(({ useOrderStore }) => {
              const sellerStore = useOrderStore.getState();
              sellerStore.updateOrderStatus(orderId, 'delivered');
              sellerStore.updatePaymentStatus(orderId, 'paid');
            }).catch(error => {
              console.error('Failed to update seller order status:', error);
            });
          }
        }
        
        // Show review modal when delivery is complete (step 4)
        if (next === 4 && prev === 3) {
          setTimeout(() => {
            setShowReviewModal(true);
          }, 2000); // Show modal 2 seconds after delivery completes
        }
        return next;
      });
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
  }, []);

  // Update animated progress based on current step
  useEffect(() => {
    const progress = (currentStep / deliverySteps.length) * 100;
    setAnimatedProgress(progress);
  }, [currentStep, deliverySteps.length]);

  const getEstimatedDeliveryTime = () => {
    const now = new Date();
    const estimatedTime = new Date(now.getTime() + (2 - (currentStep / deliverySteps.length) * 2) * 60 * 60 * 1000);
    return estimatedTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/orders')}
                className="p-2 hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
                <p className="text-sm text-gray-600">Order #{order.id} • {order.date}</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              {order.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 mb-8 justify-center"
        >
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigator.share?.({ title: 'Order Tracking', url: window.location.href })}
            className="border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Tracking
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowReceipt(true)}
            className="border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            <Receipt className="w-4 h-4 mr-2" />
            View Receipt
          </Button>          {currentStep === 4 && (
            <Button 
              size="sm"
              onClick={() => setShowReviewModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Rate & Review
            </Button>
          )}        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Modern Interactive Map */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Navigation className="w-5 h-5 text-orange-600" />
                  </div>
                  Live Tracking
                </CardTitle>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  In Transit
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Enhanced Map Visualization */}
              <div className="relative h-96 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
                {/* Map Background Grid */}
                <div className="absolute inset-0 opacity-10">
                  <div className="grid grid-cols-12 grid-rows-12 w-full h-full">
                    {Array.from({ length: 144 }).map((_, i) => (
                      <div key={i} className="border border-gray-300" />
                    ))}
                  </div>
                </div>
                
                {/* Route Path with Animation */}
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 2 }}>
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="50%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d="M 60,320 Q 120,280 200,240 Q 280,200 360,120 Q 420,80 480,60"
                    stroke="url(#routeGradient)"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="10,5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: animatedProgress / 100 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                </svg>
                
                {/* Delivery Checkpoints */}
                {deliverySteps.map((step, index) => {
                  const positions = [
                    { x: 60, y: 320 }, // Pickup
                    { x: 200, y: 240 }, // Hub 1
                    { x: 360, y: 120 }, // Hub 2
                    { x: 480, y: 60 }   // Delivery
                  ];
                  
                  return (
                    <motion.div
                      key={step.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{ 
                        left: positions[index].x, 
                        top: positions[index].y,
                        zIndex: 10
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: index <= currentStep ? 1.2 : 0.8, 
                        opacity: 1 
                      }}
                      transition={{ delay: index * 0.3 }}
                    >
                      <div className={`relative ${
                        step.status === 'completed' 
                          ? 'animate-pulse' 
                          : step.status === 'current'
                            ? 'animate-bounce'
                            : ''
                      }`}>
                        <div className={`w-6 h-6 rounded-full border-3 ${
                          step.status === 'completed' 
                            ? 'bg-green-500 border-green-600 shadow-lg shadow-green-500/50' 
                            : step.status === 'current'
                              ? 'bg-orange-500 border-orange-600 shadow-lg shadow-orange-500/50 animate-ping'
                              : 'bg-gray-300 border-gray-400'
                        }`} />
                        
                        {/* Location Tooltip */}
                        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-3 py-2 shadow-lg border whitespace-nowrap text-xs font-medium z-20">
                          <div className="text-gray-900">{step.location.name.split(' - ')[1]}</div>
                          <div className="text-gray-500">{step.time}</div>
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t rotate-45"></div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Animated Delivery Truck */}
                <motion.div
                  className="absolute z-30"
                  animate={{
                    x: [60, 200, 360, 480][currentStep] - 20,
                    y: [320, 240, 120, 60][currentStep] - 20
                  }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                  </div>
                </motion.div>

                {/* Speed and Distance Info */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">{Math.round(45 + Math.random() * 20)} km/h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{(15 - (currentStep * 3.5)).toFixed(1)} km left</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-semibold text-orange-900">Estimated Arrival</p>
                      <p className="text-sm text-orange-700">Today, {getEstimatedDeliveryTime()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-600">
                      {Math.max(0, Math.round((2 - (currentStep / deliverySteps.length) * 2) * 60))} mins
                    </p>
                    <p className="text-xs text-orange-600">remaining</p>
                  </div>
                </div>
                <Progress value={animatedProgress} className="h-3" />
                <p className="text-sm text-orange-600 mt-2 font-medium">{Math.round(animatedProgress)}% Complete</p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Progress Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Delivery Progress</h3>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${animatedProgress}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">{Math.round(animatedProgress)}% Complete</p>
              </div>

              {/* Delivery Steps */}
              <div className="space-y-4">
                {deliverySteps.map((step, index) => {
                  const isCompleted = step.status === 'completed';
                  const isCurrent = step.status === 'current';
                  
                  return (
                    <motion.div
                      key={step.id}
                      className="flex items-start gap-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mt-1 ${
                        isCompleted 
                          ? 'bg-green-500 border-green-600 text-white' 
                          : isCurrent
                            ? 'bg-blue-500 border-blue-600 text-white animate-pulse'
                            : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`font-medium ${
                              isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {step.location.name}
                            </h4>
                            <p className={`text-sm ${
                              isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                              {step.description}
                            </p>
                          </div>
                          <span className={`text-xs font-medium ${
                            isCompleted || isCurrent ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {step.time}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Enhanced Order Information Card */}
            <Card className="border-2 border-orange-100">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Package className="w-5 h-5 text-orange-600" />
                  </div>
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Order Summary */}
                <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-orange-900">Order #{order.id}</h4>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-orange-600 font-medium">Order Date</p>
                      <p className="text-orange-800">{order.date}</p>
                    </div>
                    <div>
                      <p className="text-orange-600 font-medium">Total Amount</p>
                      <p className="text-orange-800 font-bold text-lg">₱{order.total.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <div className="p-1 bg-blue-100 rounded">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    Customer Details
                  </h4>
                  
                  <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{order.shippingAddress.fullName}</p>
                        <p className="text-sm text-gray-600">{order.shippingAddress.street}</p>
                        <p className="text-sm text-gray-600">
                          {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Contact Number</p>
                        <p className="text-sm text-gray-600">{order.shippingAddress.phone}</p>
                      </div>
                    </div>

                    {order.trackingNumber && (
                      <div className="flex items-start gap-3">
                        <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Tracking Number</p>
                          <p className="text-sm font-mono text-gray-600 bg-white px-3 py-2 rounded border">
                            {order.trackingNumber}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Items ({order.items.length})</h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity} • ₱{item.price.toLocaleString()} each</p>
                        </div>
                        <p className="font-medium text-gray-900">₱{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <Button 
                    onClick={() => setShowReceipt(true)}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    View Full Receipt
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
                    onClick={() => alert('Opening support chat...')}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Need Help? Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Receipt Modal */}
      <AnimatePresence>
        {showReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
            onClick={() => setShowReceipt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modern Receipt Header */}
              <div className="relative p-6 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white text-center">
                <button
                  onClick={() => setShowReceipt(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center justify-center mb-4">
                  <img 
                    src="/Logo.png" 
                    alt="BazaarPH Logo" 
                    className="w-16 h-16 rounded-xl bg-white/20 p-2"
                    onError={(e) => {
                      // Fallback to text logo if image fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling!.classList.remove('hidden');
                    }}
                  />
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center font-bold text-2xl hidden">
                    B
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-1">BazaarPH</h2>
                <p className="text-orange-100">Your Premium Marketplace</p>
                <div className="mt-4 p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <p className="font-medium">Official Receipt</p>
                  <p className="text-sm text-orange-100">Order #{order.id}</p>
                </div>
              </div>

              {/* Receipt Content */}
              <div className="p-6 space-y-6">
                {/* Order Information */}
                <div className="text-center pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Purchase Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">{order.date}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <Badge className="bg-green-100 text-green-800">{order.status}</Badge>
                    </div>
                  </div>
                </div>

                {/* Items with Enhanced Design */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-500" />
                    Items Purchased
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity} × ₱{item.price.toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-gray-900">₱{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Information */}
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-500" />
                    Delivery Address
                  </h4>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{order.shippingAddress.fullName}</p>
                    <p className="text-gray-600">{order.shippingAddress.street}</p>
                    <p className="text-gray-600">
                      {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
                    </p>
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />
                      {order.shippingAddress.phone}
                    </p>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="space-y-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900">Payment Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">₱{(order.total - 50).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span className="font-medium">₱50</span>
                    </div>
                    <div className="border-t border-orange-200 pt-2">
                      <div className="flex justify-between text-base">
                        <span className="font-bold text-gray-900">Total Amount</span>
                        <span className="font-bold text-orange-600 text-lg">₱{order.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Receipt Footer */}
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Thank you for shopping with BazaarPH!</p>
                  <p className="text-xs text-gray-400">
                    For support, contact us at support@bazaarph.com
                  </p>
                  <div className="flex justify-center gap-4 mt-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.print()}
                      className="border-orange-200 text-orange-600 hover:bg-orange-50"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print Receipt
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => navigator.share?.({ title: 'BazaarPH Receipt', text: `Receipt for order #${order.id}` })}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        orderId={order.id}
        sellerId="seller-1"
        sellerName={order.items[0]?.seller || "BazaarPH Store"}
        items={order.items.map(item => ({
          id: item.id,
          name: item.name,
          image: item.image
        }))}
      />

      <BazaarFooter />
    </div>
  );
};

export default DeliveryTrackingPage;