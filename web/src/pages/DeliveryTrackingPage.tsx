import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
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
  Share2,
} from "lucide-react";
import { useCartStore } from "../stores/cartStore";
import { BazaarFooter } from "../components/layout/BazaarFooter";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ReviewModal } from "../components/ReviewModal";
import { supabase } from "@/lib/supabase";
import { Order } from "../stores/cartStore";

function DeliveryTrackingPage() {
  const navigate = useNavigate();
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [dbOrder, setDbOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Fetch the order from Supabase
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderNumber) return;

      setIsLoading(true);
      try {
        // Try fetching by ID first, then by order_number
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            orderNumber,
          );

        let query = supabase.from("orders").select(`
            *,
            order_items (
              *,
              variant:product_variants(id, variant_name, size, color, price, thumbnail_url)
            ),
            recipient:order_recipients (
              first_name,
              last_name,
              phone,
              email
            ),
            address:shipping_addresses (
              label,
              address_line_1,
              address_line_2,
              city,
              province,
              region,
              postal_code
            )
          `);

        if (isUuid) {
          query = query.eq("id", orderNumber);
        } else {
          query = query.eq("order_number", orderNumber);
        }

        const { data: orderData, error } = await query.maybeSingle();

        if (error) throw error;

        if (orderData) {
          // Map shipment_status from database to frontend status
          const shipmentStatusMap: Record<string, Order["status"]> = {
            pending: "pending",
            processing: "confirmed",
            shipped: "shipped",
            delivered: "delivered",
            cancelled: "cancelled",
            returned: "cancelled",
          };

          // Use shipment_status as the primary status indicator
          const dbShipmentStatus = orderData.shipment_status || 'pending';
          const mappedStatus = shipmentStatusMap[dbShipmentStatus] || "pending";

          // Compute total from order items
          const items = orderData.order_items || [];
          const computedTotal = items.reduce((sum: number, item: any) => {
            const itemPrice = (item.variant?.price || item.price || 0);
            return sum + (item.quantity * itemPrice);
          }, 0);

          const mappedOrder: Order = {
            id: orderData.id,
            orderNumber: orderData.order_number,
            total: computedTotal || orderData.total_amount || 0,
            status: mappedStatus,
            isPaid: orderData.payment_status === "paid",
            createdAt: new Date(orderData.created_at),
            date: new Date(orderData.created_at).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            estimatedDelivery: new Date(
              orderData.estimated_delivery_date ||
              Date.now() + 3 * 24 * 60 * 60 * 1000,
            ),
            items: items.map((item: any) => ({
              id: item.id,
              name: item.product_name,
              price: item.variant?.price || item.price || 0,
              quantity: item.quantity || 1,
              image:
                item.variant?.thumbnail_url ||
                item.product_images?.[0] ||
                "https://placehold.co/100?text=Product",
              seller: item.seller_name || "Bazaar Merchant",
            })),
            shippingAddress: {
              fullName: orderData.recipient
                ? `${orderData.recipient.first_name} ${orderData.recipient.last_name}`
                : orderData.buyer_name || "Guest",
              street: orderData.address?.address_line_1 || "",
              city: orderData.address?.city || "",
              province: orderData.address?.province || "",
              postalCode: orderData.address?.postal_code || "",
              phone: orderData.recipient?.phone || orderData.buyer_phone || "",
            },
            paymentMethod: {
              type: (orderData.payment_method as any)?.type || "cod",
              details: (orderData.payment_method as any)?.details || "",
            },
            trackingNumber: orderData.tracking_number || undefined,
          };

          setDbOrder(mappedOrder);

          // Map status to currentStep
          const stepMap: Record<string, number> = {
            pending: 1,
            confirmed: 2,
            shipped: 3,
            delivered: 4,
            cancelled: 1,
          };
          setCurrentStep(stepMap[mappedOrder.status] || 1);
        }
      } catch (err) {
        console.error("Error fetching order details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderNumber]);

  // Update animated progress based on current step
  useEffect(() => {
    // We use 4 as the total steps since it's constant for deliverySteps
    const progress = (currentStep / 4) * 100;
    setAnimatedProgress(progress);
  }, [currentStep]);

  const order = dbOrder;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--brand-wash)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium tracking-wide">
            Tracking your package...
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Order Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The order you're looking for doesn't exist.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
          >
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
      status: currentStep >= 1 ? "completed" : "pending",
      location: {
        name: "BazaarPH Warehouse - Metro Manila",
        lat: 14.5995,
        lng: 120.9842,
      },
    },
    {
      id: 2,
      title: "Package Prepared",
      description: "Your items are being packed for shipping",
      time: "11:15 AM",
      status:
        currentStep >= 2
          ? "completed"
          : currentStep === 1
            ? "current"
            : "pending",
      location: {
        name: "Processing Center - Quezon City",
        lat: 14.676,
        lng: 121.0437,
      },
    },
    {
      id: 3,
      title: "Out for Delivery",
      description: "Package is on the way to your location",
      time: "2:45 PM",
      status:
        currentStep >= 3
          ? "completed"
          : currentStep === 2
            ? "current"
            : "pending",
      location: {
        name: "Distribution Hub - Makati City",
        lat: 14.5547,
        lng: 121.0244,
      },
    },
    {
      id: 4,
      title: "Delivered",
      description: "Package delivered successfully",
      time: "4:20 PM",
      status:
        currentStep >= 4
          ? "completed"
          : currentStep === 3
            ? "current"
            : "pending",
      location: {
        name: "Your Address - " + order.shippingAddress.city,
        lat: 14.5995,
        lng: 120.9842,
      },
    },
  ];

  const getEstimatedDeliveryTime = () => {
    const now = new Date();
    const estimatedTime = new Date(
      now.getTime() +
      (2 - (currentStep / deliverySteps.length) * 2) * 60 * 60 * 1000,
    );
    return estimatedTime.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--brand-wash)]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/orders")}
                className="p-2 hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Track Your Order
                </h1>
                <p className="text-sm text-gray-600">
                  Order #{order.orderNumber} • {order.date}
                </p>
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
          className="flex gap-4 mb-8 justify-center flex-wrap"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigator.share?.({
                title: "Order Tracking",
                url: window.location.href,
              })
            }
            className="border-[var(--brand-primary)]/30 text-[var(--brand-primary)] hover:bg-[var(--brand-wash)]"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Tracking
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReceipt(true)}
            className="border-[var(--brand-primary)]/30 text-[var(--brand-primary)] hover:bg-[var(--brand-wash)]"
          >
            <Receipt className="w-4 h-4 mr-2" />
            View Receipt
          </Button>
          {order?.trackingNumber && order?.status === "shipped" && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-mono text-blue-900">
                {order.trackingNumber}
              </span>
            </div>
          )}
          {currentStep === 4 && (
            <Button
              size="sm"
              onClick={() => setShowReviewModal(true)}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Rate & Review
            </Button>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Modern Interactive Map */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-[var(--brand-wash)] rounded-lg">
                    <Navigation className="w-5 h-5 text-[var(--brand-primary)]" />
                  </div>
                  Live Tracking
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
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
                <svg
                  className="absolute inset-0 w-full h-full"
                  style={{ zIndex: 2 }}
                >
                  <defs>
                    <linearGradient
                      id="routeGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
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
                    { x: 480, y: 60 }, // Delivery
                  ];

                  return (
                    <motion.div
                      key={step.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: positions[index].x,
                        top: positions[index].y,
                        zIndex: 10,
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: index <= currentStep ? 1.2 : 0.8,
                        opacity: 1,
                      }}
                      transition={{ delay: index * 0.3 }}
                    >
                      <div
                        className={`relative ${step.status === "completed"
                          ? "animate-pulse"
                          : step.status === "current"
                            ? "animate-bounce"
                            : ""
                          }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-3 ${step.status === "completed"
                            ? "bg-green-500 border-green-600 shadow-lg shadow-green-500/50"
                            : step.status === "current"
                              ? "bg-[var(--brand-primary)] border-[var(--brand-primary-dark)] shadow-lg shadow-[var(--brand-primary)]/50 animate-ping"
                              : "bg-gray-300 border-gray-400"
                            }`}
                        />

                        {/* Location Tooltip */}
                        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-3 py-2 shadow-lg border whitespace-nowrap text-xs font-medium z-20">
                          <div className="text-gray-900">
                            {step.location.name.split(" - ")[1]}
                          </div>
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
                    x: [60, 200, 360, 480][currentStep - 1] - 20,
                    y: [320, 240, 120, 60][currentStep - 1] - 20,
                  }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] rounded-xl flex items-center justify-center text-white shadow-lg">
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
                      <span className="font-medium">
                        {Math.round(45 + Math.random() * 20)} km/h
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">
                        {(15 - currentStep * 3.5).toFixed(1)} km left
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="p-6 bg-[var(--brand-wash)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[var(--brand-primary)]" />
                    <div>
                      <p className="font-semibold text-[var(--text-headline)]">
                        Estimated Arrival
                      </p>
                      <p className="text-sm text-[var(--text-primary)]">
                        Today, {getEstimatedDeliveryTime()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[var(--brand-primary)]">
                      {Math.max(
                        0,
                        Math.round(
                          (2 - (currentStep / deliverySteps.length) * 2) * 60,
                        ),
                      )}{" "}
                      mins
                    </p>
                    <p className="text-xs text-[var(--brand-primary)]">remaining</p>
                  </div>
                </div>
                <Progress value={animatedProgress} className="h-3" />
                <p className="text-sm text-[var(--brand-primary)] mt-2 font-medium">
                  {Math.round(animatedProgress)}% Complete
                </p>
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
                <h3 className="text-lg font-semibold text-gray-900">
                  Delivery Progress
                </h3>
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
                <p className="text-sm text-gray-600 mt-2">
                  {Math.round(animatedProgress)}% Complete
                </p>
              </div>

              {/* Delivery Steps */}
              <div className="space-y-4">
                {deliverySteps.map((step, index) => {
                  const isCompleted = step.status === "completed";
                  const isCurrent = step.status === "current";

                  return (
                    <motion.div
                      key={step.id}
                      className="flex items-start gap-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mt-1 ${isCompleted
                          ? "bg-green-500 border-green-600 text-white"
                          : isCurrent
                            ? "bg-blue-500 border-blue-600 text-white animate-pulse"
                            : "bg-gray-100 border-gray-300 text-gray-400"
                          }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4
                              className={`font-medium ${isCompleted || isCurrent
                                ? "text-gray-900"
                                : "text-gray-500"
                                }`}
                            >
                              {step.location.name}
                            </h4>
                            <p
                              className={`text-sm ${isCompleted || isCurrent
                                ? "text-gray-600"
                                : "text-gray-400"
                                }`}
                            >
                              {step.description}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-medium ${isCompleted || isCurrent
                              ? "text-gray-500"
                              : "text-gray-400"
                              }`}
                          >
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
            <Card className="border-2 border-[var(--brand-wash-gold)]/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-[var(--brand-wash)] rounded-lg">
                    <Package className="w-5 h-5 text-[var(--brand-primary)]" />
                  </div>
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Order Summary */}
                <div className="p-4 bg-[var(--brand-wash)] rounded-xl border border-[var(--brand-wash-gold)]/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-[var(--text-headline)]">
                      Order #{order.orderNumber || order.id}
                    </h4>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--brand-primary)] font-medium">Order Date</p>
                      <p className="text-[var(--text-primary)]">{order.date}</p>
                    </div>
                    <div>
                      <p className="text-[var(--brand-primary)] font-medium">
                        Total Amount
                      </p>
                      <p className="text-[var(--text-headline)] font-bold text-lg">
                        ₱{(order.total || 0).toLocaleString()}
                      </p>
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
                        <p className="font-medium text-gray-900">
                          {order.shippingAddress.fullName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {order.shippingAddress.street}
                        </p>
                        <p className="text-sm text-gray-600">
                          {order.shippingAddress.city},{" "}
                          {order.shippingAddress.province}{" "}
                          {order.shippingAddress.postalCode}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Contact Number
                        </p>
                        <p className="text-sm text-gray-600">
                          {order.shippingAddress.phone}
                        </p>
                      </div>
                    </div>

                    {order.trackingNumber && (
                      <div className="flex items-start gap-3">
                        <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">
                            Tracking Number
                          </p>
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
                  <h4 className="font-semibold text-gray-900">
                    Items ({order.items.length})
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity} • ₱
                            {(item.price || 0).toLocaleString()} each
                          </p>
                        </div>
                        <p className="font-medium text-gray-900">
                          ₱{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <Button
                    onClick={() => setShowReceipt(true)}
                    className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    View Full Receipt
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-[var(--brand-primary)]/30 text-[var(--brand-primary)] hover:bg-[var(--brand-wash)]"
                    onClick={() => alert("Opening support chat...")}
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
              <div className="relative p-6 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white text-center">
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
                      target.style.display = "none";
                      target.nextElementSibling!.classList.remove("hidden");
                    }}
                  />
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center font-bold text-2xl hidden">
                    B
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-1">BazaarPH</h2>
                <p className="text-white/80">Your Premium Marketplace</p>
                <div className="mt-4 p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <p className="font-medium">Official Receipt</p>
                  <p className="text-sm text-white/80">Order #{order.orderNumber || order.id}</p>
                </div>
              </div>

              {/* Receipt Content */}
              <div className="p-6 space-y-6">
                {/* Order Information */}
                <div className="text-center pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Purchase Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">{order.date}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <Badge className="bg-green-100 text-green-800">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Items with Enhanced Design */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-[var(--brand-primary)]" />
                    Items Purchased
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--brand-primary)]/10 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-[var(--brand-primary)]" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity} × ₱
                              {(item.price || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold text-gray-900">
                          ₱{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                        </p>
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
                    <p className="font-medium text-gray-900">
                      {order.shippingAddress.fullName}
                    </p>
                    <p className="text-gray-600">
                      {order.shippingAddress.street}
                    </p>
                    <p className="text-gray-600">
                      {order.shippingAddress.city},{" "}
                      {order.shippingAddress.province}{" "}
                      {order.shippingAddress.postalCode}
                    </p>
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />
                      {order.shippingAddress.phone}
                    </p>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="space-y-3 p-4 bg-[var(--brand-wash)] border border-[var(--brand-primary)]/10 rounded-lg">
                  <h4 className="font-semibold text-gray-900">
                    Payment Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">
                        ₱{Math.max(0, (order.total || 0) - 50).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span className="font-medium">₱50</span>
                    </div>
                    <div className="border-t border-[var(--brand-primary)]/20 pt-2">
                      <div className="flex justify-between text-base">
                        <span className="font-bold text-gray-900">
                          Total Amount
                        </span>
                        <span className="font-bold text-[var(--brand-primary)] text-lg">
                          ₱{(order.total || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Receipt Footer */}
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">
                    Thank you for shopping with BazaarPH!
                  </p>
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
                      onClick={() =>
                        navigator.share?.({
                          title: "BazaarPH Receipt",
                          text: `Receipt for order #${order.id}`,
                        })
                      }
                      className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
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
        displayOrderId={order.orderNumber}
        sellerId="seller-1"
        sellerName={order.items[0]?.seller || "BazaarPH Store"}
        items={order.items.map((item) => ({
          id: item.id,
          name: item.name,
          image: item.image,
        }))}
      />

      <BazaarFooter />
    </div>
  );
}

export default DeliveryTrackingPage;
