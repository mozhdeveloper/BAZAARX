import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  Calendar,
  MapPin,
  Star,
  ChevronLeft,
  ArrowLeft,
  RotateCcw,
  X,
  ShoppingBag,
  Store,
  ChevronRight,
} from "lucide-react";
import { useCartStore } from "../stores/cartStore";
import { Button } from "../components/ui/button";
import { useBuyerStore } from "../stores/buyerStore";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import TrackingModal from "../components/TrackingModal";
import ReturnRefundModal from "../components/ReturnRefundModal";
import { ReviewModal } from "../components/ReviewModal";
import { cn } from "../lib/utils";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../lib/supabase";

export default function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, updateOrderStatus, updateOrderWithReturnRequest } =
    useCartStore();
  const { addToCart, profile, initializeCart } = useBuyerStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  
  const statusFilter = searchParams.get("status") || "pending";
  const setStatusFilter = (status: string) => {
    setSearchParams(prev => {
      prev.set("status", status);
      return prev;
    });
  };
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<string | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [orderToReturn, setOrderToReturn] = useState<any>(null);
  const [viewReturnDetails, setViewReturnDetails] = useState<any>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [orderToReview, setOrderToReview] = useState<any>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // Cancel order state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  const CANCEL_REASONS = [
    "Changed my mind",
    "Found a better price elsewhere",
    "Ordered by mistake",
    "Delivery time too long",
    "Want to change shipping address",
    "Want to modify order items",
    "Other"
  ];

  // Helper function to parse date strings (MM/DD/YYYY format)
  const parseDate = (dateString: string | Date): Date => {
    if (dateString instanceof Date) return dateString;

    // Handle MM/DD/YYYY format
    const parts = dateString.split("/");
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }

    return new Date(dateString);
  };

  // Check if order is within 7-day return window
  const isWithinReturnWindow = (order: any): boolean => {
    if (order.status !== "delivered") return false;

    // Use actual delivery date, otherwise fallback to creation date (safer than new Date() which forces window open)
    const dateReference = order.deliveryDate
      ? parseDate(order.deliveryDate)
      : order.createdAt
      ? parseDate(order.createdAt)
      : null;

    if (!dateReference) return false; // If no date reference, assume window closed to be safe

    const currentDate = new Date();
    const daysDifference = Math.floor(
      (currentDate.getTime() - dateReference.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysDifference <= 7 && daysDifference >= 0;
  };

  const handleReturnSubmit = (data: any) => {
    // In a real app, this would submit to an API
    console.log("Return request submitted:", data);

    // Update order with return request data
    if (data.orderId) {
      const returnRequestData = {
        reason: data.reason,
        solution: data.solution,
        comments: data.comments,
        files: data.files,
        refundAmount: data.refundAmount,
        submittedAt: new Date(),
      };

      updateOrderWithReturnRequest(data.orderId, returnRequestData);
    }

    setReturnModalOpen(false);
    setOrderToReturn(null);
    setStatusFilter("returned"); // Switch view to returned tab

    toast({
      title: "Return Request Submitted",
      description:
        "We have received your return request and will process it shortly.",
      duration: 5000,
    });
  };

  const handleReviewSubmit = () => {
    // Mark order as reviewed
    if (orderToReview) {
      updateOrderStatus(orderToReview.id, "reviewed");
    }

    setReviewModalOpen(false);
    setOrderToReview(null);
    setStatusFilter("reviewed");

    toast({
      title: "Review Submitted",
      description: "Thank you for your feedback!",
      duration: 5000,
    });
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel?.dbId || !cancelReason) return;

    const reason = cancelReason === "Other" ? otherReason : cancelReason;
    console.log("Order cancelled with reason:", reason); // TODO: Add cancellation_reason column to orders table if you want to persist this

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          // Note: Add 'cancellation_reason' column to orders table to persist: cancellation_reason: reason
        })
        .eq("id", orderToCancel.dbId);

      if (error) throw error;

      useCartStore.setState({
        orders: orders.map((o: any) =>
          o.id === orderToCancel.id ? { ...o, status: "cancelled" } : o
        ),
      });

      toast({
        title: "Order Cancelled",
        description: "Your order has been moved to the Cancelled list.",
      });
      setStatusFilter("cancelled");
    } catch (e) {
      console.error("Error canceling order:", e);
      toast({
        title: "Error",
        description: "Failed to cancel order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelModalOpen(false);
      setOrderToCancel(null);
      setCancelReason("");
      setOtherReason("");
    }
  };

  // Show success message for newly created orders
  const newOrderId = (
    location.state as { newOrderId?: string; fromCheckout?: boolean } | null
  )?.newOrderId;
  const fromCheckout = (location.state as { fromCheckout?: boolean } | null)
    ?.fromCheckout;
  const [showSuccessBanner, setShowSuccessBanner] = useState(!!fromCheckout);

  // Fetch orders from Supabase
  useEffect(() => {
    const fetchOrders = async () => {
      if (!profile?.id) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            *,
            items:order_items (*),
            seller:sellers (store_name, id)
          `,
          )
          .eq("buyer_id", profile.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Map database shape to UI expected shape
        const mappedOrders = (data || []).map((order) => {
          const statusMap: Record<string, string> = {
            pending_payment: "pending",
            paid: "confirmed",
            processing: "confirmed",
            ready_to_ship: "confirmed",
            shipped: "shipped",
            out_for_delivery: "shipped",
            delivered: "delivered",
            completed: "delivered",
            cancelled: "cancelled",
            returned: "returned",
            refunded: "returned",
          };

          const status = statusMap[order.status] || "pending";
          const sa = order.shipping_address as any;

          const createdAt = new Date(order.created_at);
          const estimatedDelivery = order.estimated_delivery_date
            ? new Date(order.estimated_delivery_date)
            : new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
          const pm = order.payment_method as any;

          return {
            id: order.order_number || order.id,
            dbId: order.id,
            orderNumber: order.order_number,
            createdAt: createdAt,
            date: createdAt.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            status: status as any,
            isPaid: order.payment_status === "paid",
            total: order.total_amount,
            deliveryDate: order.actual_delivery_date
              ? new Date(order.actual_delivery_date)
              : undefined,
            estimatedDelivery: estimatedDelivery,
            items: (order.items || []).map((item: any) => ({
              id: item.product_id, // Map the actual product_id so Buy Again works
              orderItemId: item.id, // Keep the original order item ID if needed
              name: item.product_name,
              image:
                item.product_images?.[0] ||
                "https://placehold.co/100?text=Product",
              price: item.price,
              quantity: item.quantity,
              seller: item.seller_name || "Seller",
              sellerId: item.seller_id,
              selectedVariant: item.selected_variant,
              rating: 5, // Default for type compatibility
              category: "General", // Default for type compatibility
            })),
            shippingAddress: {
              fullName:
                sa?.fullName ||
                `${sa?.first_name || ""} ${sa?.last_name || ""}`.trim() ||
                order.buyer_name,
              street: sa?.street || "",
              city: sa?.city || "",
              province: sa?.province || "",
              postalCode: sa?.postalCode || sa?.zip_code || "",
              phone: sa?.phone || order.buyer_phone || "",
            },
            paymentMethod: {
              type: pm?.type || "cod",
              details: pm?.details ? JSON.stringify(pm.details) : "",
            },
            storeName: (order as any).seller?.store_name || "Unknown Store",
            sellerId: (order as any).seller?.id || order.seller_id,
          };
        });

        useCartStore.setState({ orders: mappedOrders as any });
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [profile?.id, newOrderId]); // Refetch if new order comes in

  // Auto-hide success banner after 8 seconds
  useEffect(() => {
    if (showSuccessBanner) {
      const timer = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessBanner]);

  // Check if order was created recently (within last 2 minutes)
  const isNewOrder = (order: any) => {
    const orderTime = getTimestamp(order.createdAt);
    return Date.now() - orderTime < 120000; // 2 minutes
  };

  const statusOptions = [
    { value: "all", label: "All Orders" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Processing" }, // DB might use 'processing' or 'confirmed'
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "returned", label: "Return/Refund" },
    { value: "cancelled", label: "Cancelled" },
    { value: "reviewed", label: "Reviewed" },
  ];

  /* 
     Helper: we need to handle mapping DB statuses (processing, ready_to_ship) to UI statuses (confirmed) 
     if the DB uses different strings. 
     Database.types.ts says: pending_payment, paid, processing, ready_to_ship, shipped...
     UI statuses seem to be: pending, confirmed, shipped, delivered, cancelled.
  */

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "confirmed":
        return <Package className="w-4 h-4 text-blue-500" />;
      case "shipped":
        return <Truck className="w-4 h-4 text-purple-500" />;
      case "delivered":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "returned":
        return <RotateCcw className="w-4 h-4 text-orange-500" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "reviewed":
        return <Star className="w-4 h-4 text-yellow-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-700 bg-yellow-100 border-yellow-200";
      case "confirmed":
        return "text-blue-700 bg-blue-100 border-blue-200";
      case "shipped":
        return "text-purple-700 bg-purple-100 border-purple-200";
      case "delivered":
        return "text-green-700 bg-green-100 border-green-200";
      case "returned":
        return "text-orange-700 bg-orange-100 border-orange-200";
      case "cancelled":
        return "text-red-700 bg-red-100 border-red-200";
      case "reviewed":
        return "text-yellow-700 bg-yellow-100 border-yellow-200";
      default:
        return "text-gray-700 bg-gray-100 border-gray-200";
    }
  };

  // Helper to convert createdAt to timestamp (handles both Date objects and strings)
  const getTimestamp = (date: Date | string): number => {
    if (date instanceof Date) {
      return date.getTime();
    }
    return new Date(date).getTime();
  };

  const filteredOrders = orders
    .filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some(
          (item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.seller.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)); // Sort newest first

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(dateObj);
  };

  const formatDateTime = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dateObj);
  };

  const selectedOrderData = selectedOrder
    ? orders.find((o) => o.id === selectedOrder)
    : null;

  // Always show orders page with sample orders - users should see this immediately

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Success notification for new order */}
        {newOrderId && showSuccessBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-xl p-4 flex items-start gap-3 shadow-lg"
          >
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-1">
                🎉 Order Placed Successfully!
              </h3>
              <p className="text-sm text-green-800">
                Your order <span className="font-semibold">#{newOrderId}</span>{" "}
                has been confirmed and is being processed. You can track your
                order status below.
              </p>
            </div>
            <button
              onClick={() => setShowSuccessBanner(false)}
              className="text-green-600 hover:text-green-800 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 -mt-2"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-[#ff6a00] transition-colors mb-4 group"
          >
            <div className="p-1.5">
              <ChevronLeft className="w-4 h-4 mt-4" />
            </div>
            <span className="font-medium text-sm mt-4">Back</span>
          </button>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 text-sm">Track and manage all your orders</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4"
        >
          {/* Status Navigation Container */}
          <div className="flex-1 relative min-w-0">
            <div className="overflow-x-auto scrollbar-hide pb-0.5">
              <div className="inline-flex items-center p-1 bg-gray-50/80 rounded-full border border-gray-100 shadow-sm min-w-full md:min-w-max">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-300",
                      statusFilter === option.value
                        ? "bg-white text-[#FF5722] shadow-md shadow-orange-500/10 ring-1 ring-orange-500/10"
                        : "text-gray-500 hover:text-[#FF5722] hover:bg-white/50",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full lg:w-64 xl:w-72 flex-shrink-0 self-center">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#FF5722] w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 border-2 border-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF6a00]/10 focus:border-[#FF6a00] bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all hover:border-[#FF5722]/30"
            />
          </div>
        </motion.div>

        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || statusFilter !== "all"
                ? "No orders found"
                : "No orders yet"}
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Your orders will appear here once you make a purchase."}
            </p>
            {(searchQuery || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="mt-4 px-4 py-2 bg-[#FF5722] text-white rounded-lg hover:bg-[#E64A19] transition-colors"
              >
                Clear Filters
              </button>
            )}
          </motion.div>
        ) : (
          /* Orders List */
          <div className="space-y-4">
            {filteredOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-lg transition-shadow"
              >
                {order.status === "reviewed" ? (
                  <div className="flex flex-col gap-2">
                    <div className="border-b border-gray-100 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 group/store cursor-pointer" onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/seller/${(order as any).sellerId}`);
                      }}>
                        <span className="font-bold text-gray-900 group-hover/store:text-[#FF5722]">{(order as any).storeName}</span>
                        <button className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1 hover:text-[#FF5722] transition-colors">
                          View Store <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(order.status)}`}
                        >
                          {getStatusIcon(order.status)}
                          <span className="capitalize">Reviewed</span>
                        </div>
                        <span className="hidden sm:inline text-xs text-gray-300">|</span>
                        <span className="text-sm text-gray-500 font-mono hidden sm:inline">{order.orderNumber || order.id}</span>
                      </div>
                    </div>
                    <div
                      className="space-y-0 cursor-pointer hover:bg-gray-50 rounded-lg -mx-2 px-2 py-1 transition-colors"
                      onClick={() =>
                        navigate(`/order/${encodeURIComponent(order.id)}`)
                      }
                    >
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 w-full border-b border-gray-50 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded-md shadow-sm border border-gray-100"
                            />
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                              <span className="text-sm font-medium text-gray-800 line-clamp-2">
                                {item.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                x{item.quantity}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900 whitespace-nowrap pl-2">
                            ₱{item.price.toLocaleString()}
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-end items-center pt-2 border-t border-gray-50">
                        <span className="text-sm text-gray-500 mr-2">Order Total:</span>
                        <span className="text-lg font-bold text-[#FF5722]">₱{order.total.toLocaleString()}</span>
                      </div>
                    </div>
                    {order.review && (
                      <div className="mt-2 pl-13 sm:pl-0">
                        <div className="flex items-center gap-3 mb-2">
                          {order.review.submittedAt && (
                            <span className="text-xs text-gray-500">
                              Submitted on{" "}
                              {new Date(
                                order.review.submittedAt,
                              ).toLocaleDateString()}
                            </span>
                          )}
                          <span className="text-sm font-medium text-gray-500 flex items-center gap-1 ml-2">
                            {order.review.rating}/5{" "}
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          </span>
                        </div>
                        <div className="flex justify-between items-start gap-4">
                          <p className="text-sm text-gray-700 italic leading-relaxed bg-gray-50/50 p-2.5 rounded-lg w-full">
                            "{order.review.comment}"
                          </p>
                          {order.review.images &&
                            order.review.images.length > 0 && (
                              <div className="flex gap-1 shrink-0">
                                {order.review.images.map((img, idx) => (
                                  <div
                                    key={idx}
                                    className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#FF6a00] transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewImage(img);
                                    }}
                                  >
                                    <img
                                      src={img}
                                      alt={`Review ${idx}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Compact Header */}
                    <div className="border-b border-gray-100 pb-2 mb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 group/store cursor-pointer" onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/seller/${(order as any).sellerId}`);
                      }}>
                        <span className="font-bold text-gray-900 group-hover/store:text-[#FF5722]">{(order as any).storeName}</span>
                        <button className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1 hover:text-[#FF5722] transition-colors">
                          View Store <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                        {isNewOrder(order) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500 text-white animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            NEW
                          </span>
                        )}
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(order.status)}`}
                        >
                          {getStatusIcon(order.status)}
                          <span className="capitalize">
                            {order.status === "pending"
                              ? "Pending Payment"
                              : order.status}
                          </span>
                        </div>
                        <span className="hidden sm:inline text-xs text-gray-300">|</span>
                        <span className="text-sm text-gray-500 font-mono hidden sm:inline">{order.orderNumber || order.id}</span>
                      </div>
                    </div>

                    <div
                      className="space-y-0 cursor-pointer hover:bg-gray-50 rounded-lg -mx-2 px-2 py-1 transition-colors"
                      onClick={() =>
                        navigate(`/order/${encodeURIComponent(order.id)}`)
                      }
                    >
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 w-full border-b border-gray-50 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded-md shadow-sm border border-gray-100"
                            />
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                              <span className="text-sm font-medium text-gray-800 line-clamp-2">
                                {item.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                x{item.quantity}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900 whitespace-nowrap pl-2">
                            ₱{item.price.toLocaleString()}
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-end items-center pt-2 border-t border-gray-50">
                        <span className="text-sm text-gray-500 mr-2">Order Total:</span>
                        <span className="text-lg font-bold text-[#FF5722]">₱{order.total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Order Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-gray-100/50">
                      <div>
                        {/* Return/Refund - Left side, lower prominence (Ghost button) */}
                        {isWithinReturnWindow(order) && order.status === "delivered" && (
                          <Button
                            onClick={() => {
                              setOrderToReturn(order);
                              setReturnModalOpen(true);
                            }}
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-red-700 hover:bg-red-50 text-xs font-normal px-2"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Return or Refund
                          </Button>
                        )}
                      </div>

                      <div className="flex gap-2 -mr-1 -mb-1 -mt-2">
                        {/* Pending Payment - Show Cancel and Track */}
                        {order.status === "pending" && !order.isPaid ? (
                          <>
                            <Button
                              onClick={() => {
                                setOrderToCancel(order);
                                setCancelModalOpen(true);
                              }}
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xs font-semibold"
                            >
                              Cancel Order
                            </Button>
                          </>
                        ) : order.status === "pending" ||
                          order.status === "confirmed" ||
                          order.status ===
                          "shipped" ? /* In Progress - Track Order */
                          null : order.status === "delivered" ? (
                            /* Delivered - See Details and Review */
                            <>
                              {/* Review Action - Secondary, right next to primary */}
                              {order.status === "delivered" && (
                                <Button
                                  onClick={() => {
                                    if (window.confirm("Writing a review will mark this order as completed and you may not be able to return/refund. Continue?")) {
                                      setOrderToReview(order);
                                      setReviewModalOpen(true);
                                    }
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="border-[#FF5722] text-[#FF5722] hover:bg-[#FF5722] hover:text-white hover:border-[#FF5722]"
                                >
                                  <Star className="w-4 h-4 mr-1" />
                                  Write Review
                                </Button>
                              )}

                                { /* Buy Again - Primary Action */ }
                                <Button
                                  onClick={() => {
                                    if (!order.items || order.items.length === 0) {
                                      toast({
                                        title: "Cannot buy again",
                                        description: "No items found in this order.",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    toast({
                                      title: "Redirecting to Checkout",
                                      description: "Preparing your items for repurchase...",
                                    });

                                    // Map order items to CartItem structure for direct checkout
                                    const buyAgainItems = (order.items as any[]).map(item => ({
                                      ...item,
                                      id: item.id, // Product ID
                                      selected: true,
                                      seller: {
                                        id: item.sellerId || "unknown",
                                        name: item.seller || "Verified Seller",
                                        avatar: "",
                                        rating: 5,
                                        isVerified: true,
                                      },
                                    }));

                                    // Set items in store before navigating
                                    const { setBuyAgainItems } = useBuyerStore.getState();
                                    setBuyAgainItems(buyAgainItems);

                                    // Navigate directly to checkout
                                    navigate("/checkout", { 
                                      state: { fromBuyAgain: true } 
                                    });
                                  }}
                                  size="sm"
                                  className="bg-[#FF5722] hover:bg-[#E64A19] text-white shadow-md shadow-orange-500/20"
                                >
                                  <ShoppingBag className="w-4 h-4 mr-1" />
                                  Buy Again
                                </Button>
                            </>
                          ) : order.status === "cancelled" ? (
                            /* Canceled - View Details */
                            <Button
                              onClick={() =>
                                navigate(`/order/${encodeURIComponent(order.id)}`)
                              }
                              variant="outline"
                              size="sm"
                              className="border-gray-300 text-gray-500 hover:bg-gray-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                          ) : order.status === "returned" ? (
                            /* Returned - View Return Details */
                            <Button
                              onClick={() => setViewReturnDetails(order)}
                              variant="outline"
                              size="sm"
                              className="border-[#FF5722] text-[#FF5722] hover:bg-orange-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                          ) : order.status === "reviewed" ? (
                            /* Reviewed - Show Details */
                            <div className="flex flex-col items-end gap-3 text-right w-full sm:w-auto mt-4 sm:mt-0">
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100 mb-1">
                                  <span className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mr-1">
                                    Your Rating
                                  </span>
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-4 h-4 ${star <= (order.review?.rating || 5) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                {order.review?.submittedAt && (
                                  <span className="text-xs text-gray-400">
                                    Submitted on{" "}
                                    {new Date(
                                      order.review.submittedAt,
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              {order.review?.comment && (
                                <p className="text-sm text-gray-700 italic bg-gray-50 p-3 rounded-lg border border-gray-100 text-left w-full sm:max-w-md">
                                  "{order.review.comment}"
                                </p>
                              )}

                              {order.review?.images &&
                                order.review.images.length > 0 && (
                                  <div className="flex gap-2 justify-end mt-1">
                                    {order.review.images.map((img, idx) => (
                                      <div
                                        key={idx}
                                        className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden"
                                      >
                                        <img
                                          src={img}
                                          alt={`Review ${idx}`}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Modal/Overlay */}
      {selectedOrderData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedOrder(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {selectedOrderData.orderNumber || selectedOrderData.id}
                </h2>
                <p className="text-gray-600">
                  {formatDateTime(selectedOrderData.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Status */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border mb-6 ${getStatusColor(selectedOrderData.status)}`}
            >
              {getStatusIcon(selectedOrderData.status)}
              <span className="capitalize">{selectedOrderData.status}</span>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Items Ordered
              </h3>
              <div className="space-y-4">
                {selectedOrderData.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">by {item.seller}</p>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ₱{(item.price * item.quantity).toLocaleString()}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-sm text-gray-600">
                          ₱{item.price.toLocaleString()} each
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Info */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Shipping Address
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-gray-900">
                  {selectedOrderData.shippingAddress.fullName}
                </p>
                <p className="text-gray-700">
                  {selectedOrderData.shippingAddress.street}
                </p>
                <p className="text-gray-700">
                  {selectedOrderData.shippingAddress.city},{" "}
                  {selectedOrderData.shippingAddress.province}{" "}
                  {selectedOrderData.shippingAddress.postalCode}
                </p>
                <p className="text-gray-700">
                  {selectedOrderData.shippingAddress.phone}
                </p>
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span className="text-[var(--brand-primary)]">
                  ₱{selectedOrderData.total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              {selectedOrderData.status === "pending" && (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Cancel Order
                </Button>
              )}
              {(selectedOrderData.status === "shipped" ||
                selectedOrderData.status === "delivered") && (
                  <Button
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white"
                    onClick={() => setTrackingOrder(selectedOrderData.id)}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Track Order
                  </Button>
                )}
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Tracking Modal */}
      {trackingOrder && (
        <TrackingModal
          order={orders.find((o) => o.id === trackingOrder)!}
          isOpen={!!trackingOrder}
          onClose={() => setTrackingOrder(null)}
        />
      )}

      <ReturnRefundModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        onSubmit={handleReturnSubmit}
        order={orderToReturn}
      />

      {/* Return Details Modal */}
      {viewReturnDetails && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setViewReturnDetails(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Return Request Details
                </h2>
                <p className="text-gray-600">
                  {viewReturnDetails.orderNumber || viewReturnDetails.id}
                </p>
              </div>
              <button
                onClick={() => setViewReturnDetails(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
                <div className="space-y-3">
                  {viewReturnDetails.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex gap-3 bg-gray-50 rounded-lg p-3"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity}
                        </p>
                        <p className="text-sm font-medium text-[#FF6a00]">
                          ₱{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return Request Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Return/Refund Information
                </h3>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                  {viewReturnDetails.returnRequest ? (
                    <>
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          Reason:
                        </span>
                        <p className="text-gray-900 capitalize">
                          {viewReturnDetails.returnRequest.reason.replace(
                            /_/g,
                            " ",
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          Solution:
                        </span>
                        <p className="text-gray-900 capitalize">
                          {viewReturnDetails.returnRequest.solution.replace(
                            /_/g,
                            " ",
                          )}
                        </p>
                      </div>
                      {viewReturnDetails.returnRequest.comments && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Comments:
                          </span>
                          <p className="text-gray-900">
                            {viewReturnDetails.returnRequest.comments}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          Status:
                        </span>
                        <p className="text-orange-600 font-medium">
                          Pending Review
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          Submitted:
                        </span>
                        <p className="text-gray-900">
                          {new Date(
                            viewReturnDetails.returnRequest.submittedAt,
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          Refund Amount:
                        </span>
                        <p className="text-[#FF6a00] font-bold text-lg">
                          ₱
                          {viewReturnDetails.returnRequest.refundAmount.toLocaleString()}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-600">
                      No return request data available
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {orderToReview && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          orderId={orderToReview.dbId} // Use actual UUID for DB operations
          displayOrderId={orderToReview.id} // Use order number for display
          sellerName={orderToReview.items[0]?.seller || "Bazaar Seller"}
          items={orderToReview.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            image: item.image,
          }))}
          // Note: In a real app we'd pass the actual seller ID from the order
          sellerId="seller-1"
        />
      )}

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {viewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setViewImage(null)}
          >
            <button
              onClick={() => setViewImage(null)}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={viewImage}
              alt="Review Image"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>


      {/* Order Cancel Modal */}
      <AnimatePresence>
        {cancelModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              setCancelModalOpen(false);
              setCancelReason("");
              setOtherReason("");
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel Order</h3>
              <p className="text-gray-600 text-sm mb-4">
                Please tell us why you want to cancel this order.
              </p>

              {/* Reason Selection */}
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {CANCEL_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      cancelReason === reason
                        ? "border-[#FF5722] bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={cancelReason === reason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="accent-[#FF5722]"
                    />
                    <span className="text-sm text-gray-700">{reason}</span>
                  </label>
                ))}
              </div>

              {/* Other Reason Input */}
              {cancelReason === "Other" && (
                <textarea
                  placeholder="Please specify your reason..."
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm mb-4 focus:ring-2 focus:ring-[#FF5722] focus:outline-none"
                  rows={2}
                />
              )}

              {/* Reassurance */}
              <p className="text-xs text-gray-500 mb-4">
                Don't worry, you have not been charged for this order. You can easily buy these items again later.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setCancelModalOpen(false);
                    setCancelReason("");
                    setOtherReason("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Keep Order
                </Button>
                <Button
                  onClick={handleCancelOrder}
                  disabled={!cancelReason || (cancelReason === "Other" && !otherReason.trim())}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                >
                  Cancel Order
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BazaarFooter />
    </div>
  );
}
