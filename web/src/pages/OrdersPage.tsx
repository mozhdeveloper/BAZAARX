import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  MapPin,
  Star,
  ChevronLeft,
  RotateCcw,
  X,
  Store,
  ChevronRight,
  PackageCheck,
  User,
  Camera,
  ImagePlus,
} from "lucide-react";
import type { BuyerOrderSnapshot } from "../types/orders";
import { useCartStore } from "../stores/cartStore";
import { Button } from "../components/ui/button";
import { useBuyerStore, CartItem } from "../stores/buyerStore";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import TrackingModal from "../components/TrackingModal";
import { ConfirmReceivedModal } from "../components/ConfirmReceivedModal";
import ReturnRefundModal from "../components/ReturnRefundModal";
import { ReviewModal } from "../components/ReviewModal";
import { cn } from "../lib/utils";
import { useToast } from "../hooks/use-toast";
import { orderReadService } from "../services/orders/orderReadService";
import { orderMutationService } from "../services/orders/orderMutationService";
import { returnService } from "../services/returnService";
import { OrderStatusBadge } from "../components/orders/OrderStatusBadge";
import {
  BuyerReturnSubmissionPayload,
  isBuyerOrderWithinReturnWindow,
  mergeBuyerOrdersWithReturnRequests,
  validateBuyerReturnSubmissionPayload,
} from "../utils/orders/returns";

export default function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, updateOrderStatus, updateOrderWithReturnRequest, hydrateBuyerOrders } =
    useCartStore();
  const { profile, initializeCart, addToCart } = useBuyerStore();

  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");

  const statusFilter = searchParams.get("status") || "pending";
  const setStatusFilter = (status: string) => {
    setSearchParams(
      prev => {
        prev.set("status", status);
        return prev;
      },
      { replace: true } // Replace history entry so tab switches don't pollute back navigation
    );
  };
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<string | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [orderToReturn, setOrderToReturn] = useState<any>(null);
  const [viewReturnDetails, setViewReturnDetails] = useState<any>(null);
  const [reviewWarningModalOpen, setReviewWarningModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [orderToReview, setOrderToReview] = useState<any>(null);
  const [viewingOrderIndex, setViewingOrderIndex] = useState<number | null>(null);
  const [viewingImageIndex, setViewingImageIndex] = useState<number>(0);
  const [viewingReviewData, setViewingReviewData] = useState<any>(null); // For return request evidence or other single image views

  // Cancel order state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  // Confirm received state
  const [confirmReceivedModalOpen, setConfirmReceivedModalOpen] = useState(false);
  const [orderToConfirmReceived, setOrderToConfirmReceived] = useState<any>(null);

  const CANCEL_REASONS = [
    "Changed my mind",
    "Found a better price elsewhere",
    "Ordered by mistake",
    "Delivery time too long",
    "Want to change shipping address",
    "Want to modify order items",
    "Other"
  ];

  const isWithinReturnWindow = (order: {
    shipmentStatus?: string | null;
    deliveryDate?: Date;
    deliveredAt?: Date;
    createdAt: Date;
  }): boolean => {
    return isBuyerOrderWithinReturnWindow(order as any);
  };

  const handleReturnSubmit = useCallback(async (data: BuyerReturnSubmissionPayload) => {
    const validationError = validateBuyerReturnSubmissionPayload(data);
    if (validationError) {
      toast({
        title: "Return Request Failed",
        description: validationError,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    try {
      // Upload evidence files if any
      let evidenceUrls: string[] = [];
      if (data.files && data.files.length > 0 && data.orderDbId) {
        evidenceUrls = await returnService.uploadEvidence(data.orderDbId, data.files);
      }

      await returnService.submitReturnRequest({
        orderDbId: data.orderDbId,
        reason: (data.reason || 'other') as any,
        returnType: (data.solution || 'return_refund') as any,
        description: data.comments || '',
        refundAmount: data.refundAmount,
        evidenceUrls,
      });

      // Also update local Zustand state so UI reflects immediately
      updateOrderWithReturnRequest(data.localOrderId, {
        reason: data.reason,
        solution: data.solution,
        comments: data.comments,
        files: data.files,
        refundAmount: data.refundAmount,
        submittedAt: new Date(),
        status: 'pending',
      });

      setReturnModalOpen(false);
      setOrderToReturn(null);
      setStatusFilter("returned");

      toast({
        title: "Return Request Submitted",
        description:
          "We have received your return request and will process it shortly.",
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: "Return Request Failed",
        description: error.message || "Failed to submit return request. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [updateOrderWithReturnRequest, toast]);

  const loadBuyerOrders = useCallback(async () => {
    if (!profile?.id) return;

    setIsLoading(true);
    try {
      const [buyerOrders, buyerReturnRequests] = await Promise.all([
        orderReadService.getBuyerOrders({
          buyerId: profile.id,
        }),
        returnService.getReturnRequestsByBuyer(profile.id),
      ]);

      const mergedOrders = mergeBuyerOrdersWithReturnRequests(
        buyerOrders as BuyerOrderSnapshot[],
        buyerReturnRequests,
      );

      hydrateBuyerOrders(mergedOrders as any);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [hydrateBuyerOrders, profile?.id]);

  const handleCancelOrder = useCallback(async () => {
    if (!orderToCancel?.dbId || !cancelReason) return;

    const reason = cancelReason === "Other" ? otherReason : cancelReason;

    // ── Optimistic update: immediately reflect cancellation in the UI ──────
    updateOrderStatus(orderToCancel.id, "cancelled");
    setStatusFilter("cancelled");
    setCancelModalOpen(false);
    setOrderToCancel(null);
    setCancelReason("");
    setOtherReason("");

    try {
      const success = await orderMutationService.cancelOrder({
        orderId: orderToCancel.dbId,
        reason,
        cancelledBy: profile?.id,
        changedByRole: profile?.id ? "buyer" : null,
      });
      if (!success) {
        throw new Error("Failed to cancel order");
      }

      toast({
        title: "Order Cancelled",
        duration: 1000,
      });

      // Sync with server state to get accurate cancelledAt timestamp etc.
      await loadBuyerOrders();
    } catch (e) {
      console.error("Error canceling order:", e);
      // Roll back the optimistic update by re-fetching
      await loadBuyerOrders();
      toast({
        title: "Error",
        description: "Failed to cancel order. Please try again.",
        variant: "destructive",
      });
    }
  }, [orderToCancel, cancelReason, otherReason, profile?.id, loadBuyerOrders, updateOrderStatus, toast]);

  const onConfirmReceivedSuccess = useCallback(() => {
    // Update local state to reflect the change
    if (orderToConfirmReceived) {
      const updatedOrders = orders.map((order) => {
        if (order.id === orderToConfirmReceived.id) {
          return {
            ...order,
            status: "received" as const,
            shipmentStatus: "received",
          };
        }
        return order;
      });
      hydrateBuyerOrders(updatedOrders as any);
      void loadBuyerOrders();
    }
  }, [orderToConfirmReceived, orders, hydrateBuyerOrders, loadBuyerOrders]);

  // Show success message for newly created orders
  const newOrderId = (
    location.state as { newOrderId?: string; fromCheckout?: boolean } | null
  )?.newOrderId;
  const fromCheckout = (location.state as { fromCheckout?: boolean } | null)
    ?.fromCheckout;
  const [showSuccessBanner, setShowSuccessBanner] = useState(!!fromCheckout);

  // Fetch orders from shared service mapper
  useEffect(() => {
    void loadBuyerOrders();
  }, [loadBuyerOrders, newOrderId]); // Refetch if new order comes in

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

  // Auto-open return details if query params exist (from notifications)
  useEffect(() => {
    const viewOrderId = searchParams.get("viewOrder");
    const isViewReturn = searchParams.get("viewReturn") === "true";

    if (viewOrderId && isViewReturn && orders.length > 0) {
      const order = orders.find(o => o.dbId === viewOrderId || o.id === viewOrderId);
      if (order && order.returnRequest) {
        setViewReturnDetails(order);
        setStatusFilter("returned");

        // Clear params to avoid re-opening on manual tab switch
        setSearchParams(prev => {
          prev.delete("viewOrder");
          prev.delete("viewReturn");
          return prev;
        }, { replace: true });
      }
    }
  }, [searchParams, orders, setStatusFilter]);

  const statusOptions = [
    { value: "all", label: "All Orders" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Processing" }, // DB might use 'processing' or 'confirmed'
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "received", label: "Received" },
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

  // Helper to convert createdAt to timestamp (handles both Date objects and strings)
  const getTimestamp = (date: Date | string): number => {
    if (date instanceof Date) {
      return date.getTime();
    }
    return new Date(date).getTime();
  };

  const getOrderItemKey = (orderId: string, item: any, index: number): string => {
    const itemId = item.orderItemId || item.id || "item";
    const variantId = item.variant?.id || "no-variant";
    return `${orderId}-${itemId}-${variantId}-${index}`;
  };

  const filteredOrders = useMemo(() => {
    const filtered = orders.filter((order) => {
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
    });

    // If viewing reviewed tab, sort by review.submittedAt desc
    if (statusFilter === "reviewed") {
      return filtered.sort((a, b) => {
        const aTime = a.review?.submittedAt ? new Date(a.review.submittedAt).getTime() : getTimestamp(a.createdAt);
        const bTime = b.review?.submittedAt ? new Date(b.review.submittedAt).getTime() : getTimestamp(b.createdAt);
        return bTime - aTime;
      });
    }
    // If viewing cancelled tab, sort by cancelledAt desc (fallback to createdAt)
    if (statusFilter === "cancelled") {
      return filtered.sort((a, b) => {
        const aTime = a.cancelledAt ? getTimestamp(a.cancelledAt) : getTimestamp(a.createdAt);
        const bTime = b.cancelledAt ? getTimestamp(b.cancelledAt) : getTimestamp(b.createdAt);
        if (aTime !== bTime) return bTime - aTime;
        return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
      });
    }

    // If viewing returned tab, sort by returnRequest.submittedAt desc
    if (statusFilter === "returned") {
      return filtered.sort((a, b) => {
        const aTime = a.returnRequest?.submittedAt ? getTimestamp(a.returnRequest.submittedAt) : getTimestamp(a.createdAt);
        const bTime = b.returnRequest?.submittedAt ? getTimestamp(b.returnRequest.submittedAt) : getTimestamp(b.createdAt);
        if (aTime !== bTime) return bTime - aTime;
        return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
      });
    }
    // Otherwise, sort by createdAt desc
    return filtered.sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
  }, [orders, searchQuery, statusFilter]);

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

  return (
    <div className="min-h-screen bg-[var(--brand-wash)]">
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
          className="mb-4"
        >
          <button
            onClick={() => navigate('/shop')}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-4 group"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            <span className="text-sm font-medium">Back to Shop</span>
          </button>
          <h1 className="text-xl lg:text-3xl font-bold text-gray-900">My Orders</h1>
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
              <div className="inline-flex items-center p-1 bg-white rounded-full border border-gray-100 shadow-sm min-w-full md:min-w-max">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-300",
                      statusFilter === option.value
                        ? "bg-[var(--brand-primary)] text-white shadow-md ring-1 ring-[var(--brand-primary)]"
                        : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-white/50",
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
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[var(--brand-primary)] w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 border border-gray-100 rounded-full focus:outline-none focus:ring-0 focus:border-[var(--brand-primary)] bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all"
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
                className="mt-4 px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg hover:bg-[var(--brand-primary-dark)] transition-colors"
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
                className="bg-white shadow-sm rounded-xl p-3 sm:p-4 hover:shadow-lg transition-shadow"
              >
                {order.status === "reviewed" ? (
                  <div className="flex flex-col gap-2">
                    <div className="border-b border-gray-100 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 group/store cursor-pointer" onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/seller/${(order as any).sellerId}`);
                      }}>
                        <span className="font-bold text-gray-900 group-hover/store:text-[var(--brand-accent)] transition-colors">{(order as any).storeName}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover/store:text-[var(--brand-accent)] transition-colors" />
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                        <OrderStatusBadge status={order.returnRequest?.status || order.status} compact />
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
                      {order.items.map((item, itemIndex) => (
                        <div
                          key={getOrderItemKey(order.id, item, itemIndex)}
                          className="flex items-center justify-between gap-3 w-full border-b border-gray-50 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded-md shadow-sm border border-gray-100"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-800 line-clamp-1">
                                {item.name}
                              </span>
                              {(item as any).variantDisplay && (
                                <span className="text-xs text-[var(--text-muted)]">
                                  {(item as any).variantDisplay}
                                </span>
                              )}
                              <span className="text-xs text-[var(--text-muted)]">
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
                        <span className="text-lg font-bold text-[var(--price-standard)]">₱{order.total.toLocaleString()}</span>
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
                                    className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:ring-2 hover:ring-[var(--brand-accent)] transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingOrderIndex(index);
                                      setViewingImageIndex(idx);
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
                        {(order.review as any).sellerReply && (
                          <div className="mt-2 flex items-start gap-2 border-l-2 border-[var(--brand-primary)] pl-3">
                            <div>
                              <p className="text-xs font-semibold text-[var(--brand-primary)] mb-0.5">Seller's Reply</p>
                              <p className="text-sm text-gray-600 italic">{(order.review as any).sellerReply.message}</p>
                            </div>
                          </div>
                        )}
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
                        <span className="font-bold text-gray-900 group-hover/store:text-[var(--brand-primary)] transition-colors">{(order as any).storeName}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover/store:text-[var(--brand-primary)] transition-colors" />
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                        {isNewOrder(order) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500 text-white animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            NEW
                          </span>
                        )}
                        {(order as any).order_type === 'OFFLINE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                            <Store className="w-3 h-3" />
                            In-Store
                          </span>
                        )}
                        <OrderStatusBadge status={order.returnRequest?.status || order.status} compact />
                        <span className="hidden sm:inline text-xs text-gray-300">|</span>
                        <span className="text-sm text-gray-500 font-mono hidden sm:inline">{order.orderNumber || order.id}</span>
                      </div>
                    </div>
                    {/* Status timestamp */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 -mt-1 mb-1">
                      <Clock className="w-3 h-3 shrink-0 text-gray-300" />
                      <span>
                        {order.status === "returned" && order.returnRequest && (
                          `Requested ${formatDateTime(order.returnRequest.submittedAt)}`
                        )}
                        {order.status === "cancelled" && (order.cancelledAt
                          ? `Cancelled ${formatDateTime(order.cancelledAt)}`
                          : `Placed ${formatDateTime(order.createdAt)}`)}
                        {order.status === "pending" && `Placed ${formatDateTime(order.createdAt)}`}
                        {order.status === "confirmed" && (order.confirmedAt
                          ? `Confirmed ${formatDateTime(order.confirmedAt)}`
                          : `Placed ${formatDateTime(order.createdAt)}`)}
                        {order.status === "shipped" && (order.shippedAt
                          ? `Shipped ${formatDateTime(order.shippedAt)}`
                          : `Placed ${formatDateTime(order.createdAt)}`)}
                        {order.status === "delivered" && (order.deliveredAt
                          ? `Delivered ${formatDateTime(order.deliveredAt)}`
                          : order.shippedAt ? `Shipped ${formatDateTime(order.shippedAt)}` : `Placed ${formatDateTime(order.createdAt)}`)}
                        {order.status === "received" && (order.updatedAt
                          ? `Received ${formatDateTime(order.updatedAt)}`
                          : order.deliveredAt ? `Delivered ${formatDateTime(order.deliveredAt)}` : `Placed ${formatDateTime(order.createdAt)}`)}
                        {order.status === "returned" && `Placed ${formatDateTime(order.createdAt)}`}
                        {order.status === "cancelled" && (order.cancelledAt
                          ? `Cancelled ${formatDateTime(order.cancelledAt)}`
                          : `Placed ${formatDateTime(order.createdAt)}`)}
                      </span>
                    </div>
                    <div
                      className="space-y-0 cursor-pointer hover:bg-gray-50 rounded-lg -mx-2 px-2 py-1 transition-colors"
                      onClick={() =>
                        order.status === "returned"
                          ? setViewReturnDetails(order)
                          : navigate(`/order/${encodeURIComponent(order.id)}`)
                      }
                    >
                      {order.items.map((item, itemIndex) => {
                        const itemReview = (order as any).reviews?.find((r: any) => r.productId === ((item as any).productId || item.id)) ||
                          (!(order as any).reviews?.some((r: any) => r.productId) ? order.review : null);

                        return (
                          <div
                            key={getOrderItemKey(order.id, item, itemIndex)}
                            className="flex flex-col w-full border-b border-gray-50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0"
                          >
                            <div className="flex items-center justify-between gap-3 w-full">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-12 h-12 object-cover rounded-md shadow-sm border border-gray-100"
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-gray-800 line-clamp-1">
                                    {item.name}
                                  </span>
                                  {(item as any).variantDisplay && (
                                    <span className="text-xs text-[var(--text-muted)]">
                                      {(item as any).variantDisplay}
                                    </span>
                                  )}
                                  <span className="text-xs text-[var(--text-muted)]">
                                    x{item.quantity}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-gray-900 whitespace-nowrap pl-2">
                                ₱{item.price.toLocaleString()}
                              </div>
                            </div>


                          </div>
                        )
                      })}
                      <div className="flex justify-end items-center pt-2 border-t border-gray-50">
                        <span className="text-sm text-gray-500 mr-2">Order Total:</span>
                        <span className="text-lg font-bold text-[var(--price-standard)]">₱{order.total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Order Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-gray-100/50">
                      <div>
                        {/* Return/Refund - only for Delivered orders within the 7-day return window (PH standard: buyer must confirm receipt first) */}
                        {order.status === "received" && isWithinReturnWindow(order) && !(order as any).returnRequest && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/order/${encodeURIComponent(order.id)}/return`);
                            }}
                            size="sm"
                            variant="outline"
                            className="border-[var(--brand-accent)] text-[var(--brand-accent)] hover:text-[var(--brand-accent)] hover:bg-[var(--brand-wash)] hover:border-[var(--brand-accent)] text-xs font-medium px-3"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Return / Refund
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
                              className="border-red-600 text-red-600 hover:bg-red-50 hover:text-red-600"
                            >
                              Cancel Order
                            </Button>
                          </>
                        ) : order.status === "pending" ? (
                          /* Pending paid - View Details */
                          <Button
                            onClick={() => navigate(`/order/${encodeURIComponent(order.id)}`)}
                            variant="outline"
                            size="sm"
                            className="border-gray-200 text-gray-500 hover:text-gray-600 hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        ) : order.status === "confirmed" ? (
                          /* Processing - View Details */
                          <Button
                            onClick={() => navigate(`/order/${encodeURIComponent(order.id)}`)}
                            variant="outline"
                            size="sm"
                            className="border-gray-200 text-gray-500 hover:text-gray-600 hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        ) : order.status === "shipped" ? (
                          /* Shipped - Track Package */
                          <Button
                            onClick={() => setTrackingOrder(order.id)}
                            variant="outline"
                            size="sm"
                            className="border-gray-200 text-gray-500 hover:text-gray-600 hover:bg-gray-100"
                          >
                            Track Package <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        ) : order.status === "delivered" ? (
                          /* Delivered - Confirm Received only */
                          <>
                            {order.status === "delivered" && (
                              <Button
                                onClick={() => {
                                  setOrderToConfirmReceived(order);
                                  setConfirmReceivedModalOpen(true);
                                }}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Confirm Received
                              </Button>
                            )}
                          </>
                        ) : order.status === "received" ? (
                          /* Received/Reviewed - Write Review and Buy Again */
                          <>
                            {/* Write Review */}
                            {order.status === "received" && order.items.some((item) => {
                              const itemReview = (order as any).reviews?.find((r: any) => r.productId === ((item as any).productId || item.id)) ||
                                (!(order as any).reviews?.some((r: any) => r.productId) ? order.review : null);
                              return !itemReview;
                            }) && (
                                <Button
                                  onClick={() => {
                                    setOrderToReview(order);
                                    setReviewWarningModalOpen(true);
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="border-[var(--brand-accent)] text-[var(--brand-accent)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]"
                                >
                                  Write Review
                                </Button>
                              )}

                            {/* Buy Again - add items to cart and go to cart for editing before checkout */}
                            <Button
                              onClick={async () => {
                                if (!order.items || order.items.length === 0) {
                                  toast({
                                    title: "Cannot buy again",
                                    description: "No items found in this order.",
                                    variant: "destructive"
                                  });
                                  return;
                                }

                                const addedIds: string[] = [];
                                await Promise.all(order.items.map(async (item: any) => {
                                  const productObj = {
                                    id: item.productId || item.id,
                                    name: item.name,
                                    price: item.price,
                                    originalPrice: item.originalPrice,
                                    image: item.image,
                                  } as any;

                                  const variantObj = item.selectedVariant || item.variant;
                                  try {
                                    const addedCartItemId = await addToCart(productObj, item.quantity || 1, variantObj, { forceNewItem: true });
                                    addedIds.push(addedCartItemId || productObj.id);
                                  } catch (e) {
                                    console.error('Buy Again addToCart failed:', e);
                                  }
                                }));

                                navigate('/enhanced-cart', { state: { selectedItems: addedIds } });
                              }}
                              size="sm"
                              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white"
                            >
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
                            className="border-gray-200 text-gray-500 hover:text-gray-600 hover:bg-gray-100"
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
                            className="border-gray-200 text-gray-500 hover:text-gray-600 hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
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
            className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
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
            <OrderStatusBadge
              status={selectedOrderData.returnRequest?.status || selectedOrderData.status}
              className="mb-6"
            />

            {/* Items */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Items Ordered
              </h3>
              <div className="space-y-4">
                {selectedOrderData.items.map((item, itemIndex) => (
                  <div key={getOrderItemKey(selectedOrderData.id, item, itemIndex)} className="flex gap-4">
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[150]"
          onClick={() => setViewReturnDetails(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
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
                  {viewReturnDetails.items.map((item: any, itemIndex: number) => (
                    <div
                      key={getOrderItemKey(viewReturnDetails.id, item, itemIndex)}
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
                          Return Type:
                        </span>
                        <p className="text-gray-900 capitalize">
                          {viewReturnDetails.returnRequest.type?.replace(/_/g, " ") || "Refund Only"}
                        </p>
                      </div>
                      {viewReturnDetails.returnRequest.resolutionPath && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Resolution Path:
                          </span>
                          <p className="text-gray-900 capitalize">
                            {viewReturnDetails.returnRequest.resolutionPath.replace(/_/g, " ")}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          Status:
                        </span>
                        <p className={`font-medium ${['approved', 'refunded'].includes(viewReturnDetails.returnRequest.status)
                          ? 'text-green-600'
                          : viewReturnDetails.returnRequest.status === 'rejected'
                            ? 'text-red-600'
                            : viewReturnDetails.returnRequest.status === 'escalated'
                              ? 'text-purple-600'
                              : 'text-orange-600'
                          }`}>
                          {(() => {
                            const s = viewReturnDetails.returnRequest.status;
                            if (s === 'approved') return 'Approved';
                            if (s === 'refunded') return 'Refunded';
                            if (s === 'rejected') return 'Rejected';
                            if (s === 'pending') return 'Pending';
                            if (s === 'seller_review') return 'Under Seller Review';
                            if (s === 'counter_offered') return 'Counter Offer Received';
                            if (s === 'escalated') return 'Escalated to Admin';
                            if (s === 'return_in_transit') return 'Return in Transit';
                            if (s === 'return_received') return 'Return Received';
                            return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          })()}
                        </p>
                      </div>
                      {viewReturnDetails.returnRequest.status === 'seller_review' && viewReturnDetails.returnRequest.sellerDeadline && (
                        <div className="bg-blue-50 border border-blue-100 p-2 rounded">
                          <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">
                            Seller Deadline
                          </span>
                          <p className="text-sm text-blue-800 font-semibold">
                            {new Date(viewReturnDetails.returnRequest.sellerDeadline).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {viewReturnDetails.returnRequest.status === 'rejected' && viewReturnDetails.returnRequest.rejectedReason && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Seller Response:
                          </span>
                          <p className="text-red-600 italic bg-red-50 border border-red-100 p-2 rounded mt-1">
                            "{viewReturnDetails.returnRequest.rejectedReason}"
                          </p>
                        </div>
                      )}
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
                        <p className="text-[var(--brand-accent)] font-bold text-lg">
                          ₱
                          {viewReturnDetails.returnRequest.refundAmount.toLocaleString()}
                        </p>
                      </div>
                      {viewReturnDetails.returnRequest.description && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Description
                          </span>
                          <p className="text-gray-900 bg-gray-50 p-3 rounded-lg mt-1 italic">
                            "{viewReturnDetails.returnRequest.description}"
                          </p>
                        </div>
                      )}
                      {viewReturnDetails.returnRequest.evidenceUrls && viewReturnDetails.returnRequest.evidenceUrls.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Evidence Photos
                          </span>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {viewReturnDetails.returnRequest.evidenceUrls.map((url: string, idx: number) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Evidence ${idx + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:ring-2 hover:ring-[var(--brand-accent)] transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Special handling for return details - for now just open single image since it's not in the main list
                                  setViewingOrderIndex(-1); // Use -1 to indicate it's not from the main filteredOrders list
                                  setViewingImageIndex(0);
                                  setViewingReviewData({
                                    image: url,
                                    comment: viewReturnDetails.returnRequest.reason,
                                    rating: 0,
                                    date: new Date(viewReturnDetails.returnRequest.createdAt).toLocaleDateString(),
                                    items: viewReturnDetails.items
                                  });
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {viewReturnDetails.returnRequest.sellerNote && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Seller Note
                          </span>
                          <p className="text-amber-800 italic bg-amber-50 border border-amber-200 p-3 rounded-lg mt-1">
                            "{viewReturnDetails.returnRequest.sellerNote}"
                          </p>
                        </div>
                      )}
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

      <AnimatePresence>
        {reviewWarningModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setReviewWarningModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-[var(--brand-primary)]" fill="currentColor" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Write a Review</h3>
                <p className="text-gray-600 mb-6 text-sm">
                  Writing a review will mark this order as completed and you may not be able to return/refund. Continue?
                </p>
                <div className="flex gap-3 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setReviewWarningModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white"
                    onClick={() => {
                      setReviewWarningModalOpen(false);
                      setReviewModalOpen(true);
                    }}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {orderToReview && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setOrderToReview(null);
          }}
          onSubmitted={() => {
            void loadBuyerOrders();

            toast({
              title: "Review Submitted",
              description: "Thank you for your feedback!",
              duration: 5000,
            });
          }}
          orderId={orderToReview.dbId} // Use actual UUID for DB operations
          displayOrderId={orderToReview.id} // Use order number for display
          sellerName={orderToReview.items[0]?.seller || "Bazaar Seller"}
          items={orderToReview.items.filter((item: any) => {
            const itemReview = (orderToReview as any).reviews?.find((r: any) => r.productId === ((item as any).productId || item.id)) ||
              (!(orderToReview as any).reviews?.some((r: any) => r.productId) ? orderToReview.review : null);
            return !itemReview;
          }).map((item: any) => ({
            id: item.id,
            name: item.name,
            image: item.image,
            variant: item.variant,
          }))}
          sellerId={orderToReview.sellerId || orderToReview.items[0]?.sellerId}
        />
      )}

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {(viewingOrderIndex !== null || viewingReviewData) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/70 p-4 lg:p-10"
            onClick={() => {
              setViewingOrderIndex(null);
              setViewingReviewData(null);
            }}
          >
            {/* Review Navigation - Outside Modal (Only for main orders list) */}
            {viewingOrderIndex !== null && viewingOrderIndex >= 0 && (
              <div className="absolute inset-0 flex items-center justify-between px-4 lg:px-10 pointer-events-none">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    let prev = viewingOrderIndex - 1;
                    while (prev >= 0 && (!filteredOrders[prev].review?.images || filteredOrders[prev].review.images.length === 0)) prev--;
                    if (prev >= 0) {
                      setViewingOrderIndex(prev);
                      setViewingImageIndex(0);
                    }
                  }}
                  disabled={!filteredOrders.slice(0, viewingOrderIndex).some(o => o.review?.images && o.review.images.length > 0)}
                  className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all pointer-events-auto disabled:opacity-0"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    let next = viewingOrderIndex + 1;
                    while (next < filteredOrders.length && (!filteredOrders[next].review?.images || filteredOrders[next].review.images.length === 0)) next++;
                    if (next < filteredOrders.length) {
                      setViewingOrderIndex(next);
                      setViewingImageIndex(0);
                    }
                  }}
                  disabled={!filteredOrders.slice(viewingOrderIndex + 1).some(o => o.review?.images && o.review.images.length > 0)}
                  className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all pointer-events-auto disabled:opacity-0"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setViewingOrderIndex(null);
                setViewingReviewData(null);
              }}
              className="absolute top-4 right-4 lg:top-8 lg:right-8 p-3 text-white/70 hover:text-white z-20"
            >
              <X className="w-4 h-4 lg:w-6 lg:h-6" />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row w-full max-w-6xl max-h-[90vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left: Image Container */}
              <div className="flex-[1.5] bg-gray-900 relative min-h-[400px] lg:min-h-0 overflow-hidden group">
                <img
                  src={viewingOrderIndex !== null && viewingOrderIndex >= 0
                    ? filteredOrders[viewingOrderIndex].review.images[viewingImageIndex]
                    : viewingReviewData?.image}
                  alt="Review Full Size"
                  className="w-full h-full object-contain"
                />

                {/* Internal Image Navigation */}
                {viewingOrderIndex !== null && viewingOrderIndex >= 0 && filteredOrders[viewingOrderIndex].review.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingImageIndex(prev => (prev > 0 ? prev - 1 : filteredOrders[viewingOrderIndex!].review.images.length - 1));
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingImageIndex(prev => (prev < filteredOrders[viewingOrderIndex!].review.images.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-xs rounded-full">
                      {viewingImageIndex + 1} / {filteredOrders[viewingOrderIndex].review.images.length}
                    </div>
                  </>
                )}

                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
              </div>

              {/* Right: Review Details */}
              <div className="w-full lg:w-[400px] bg-white flex flex-col p-6 lg:p-8 overflow-y-auto">
                {/* User Info */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xl text-gray-500 overflow-hidden ring-2 ring-gray-50 shrink-0">
                    {profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={`${profile.firstName} ${profile.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 text-md truncate">
                      {profile?.firstName} {profile?.lastName}
                    </h4>
                    <p className="text-xs text-gray-400">
                      {viewingOrderIndex !== null && viewingOrderIndex >= 0
                        ? (filteredOrders[viewingOrderIndex].review?.submittedAt ? new Date(filteredOrders[viewingOrderIndex].review.submittedAt).toLocaleDateString() : "")
                        : viewingReviewData?.date}
                    </p>
                  </div>
                </div>

                {/* Rating & Variants */}
                <div className="space-y-2 mb-6">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < (viewingOrderIndex !== null && viewingOrderIndex >= 0
                            ? (filteredOrders[viewingOrderIndex].review?.rating || 0)
                            : (viewingReviewData?.rating || 0))
                            ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]"
                            : "fill-gray-100 text-gray-400",
                        )}
                      />
                    ))}
                  </div>

                  <div className="space-y-1">
                    <div className="space-y-1">
                      {(viewingOrderIndex !== null && viewingOrderIndex >= 0 ? filteredOrders[viewingOrderIndex].items : viewingReviewData?.items)?.map((item: any, i: number) => (
                        <div key={i} className="flex flex-col">
                          <span className="text-xs text-gray-700">{item.name}</span>
                          {item.variantDisplay && (
                            <span className="text-xs text-gray-600 italic">{item.variantDisplay}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comment */}
                <div className="flex-1">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {(viewingOrderIndex !== null && viewingOrderIndex >= 0
                      ? filteredOrders[viewingOrderIndex].review?.comment
                      : viewingReviewData?.comment) || "No written feedback."}
                  </p>
                </div>

                {/* Footer Message */}
                <div className="mt-8 pt-6 border-t border-gray-100 italic text-[10px] text-gray-400 text-center">
                  Your feedback helps other shoppers make better decisions.
                </div>
              </div>
            </motion.div>
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
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4"
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
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Premium Header */}
              <div className="px-6 pt-6 pb-1">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Cancel Order</h3>
                <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-3 flex gap-3 items-start -mb-4">
                  <p className="text-[var(--brand-primary)] text-xs leading-relaxed">
                    Please select a reason. Take note that this will cancel all items in the order and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4">

                {/* Reason Selection */}
                <div className="space-y-1 mb-4">
                  {CANCEL_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border border-transparent",
                        cancelReason === reason
                          ? "bg-[var(--brand-wash)]"
                          : "bg-base"
                      )}
                    >
                      <div className="relative flex items-center justify-center">
                        <input
                          type="radio"
                          name="cancelReason"
                          value={reason}
                          checked={cancelReason === reason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="sr-only"
                        />
                        <div className={cn(
                          "w-4 h-4 rounded-full border transition-all flex items-center justify-center",
                          cancelReason === reason
                            ? "border-[var(--brand-primary)]"
                            : "border-gray-300"
                        )}>
                          {cancelReason === reason && (
                            <div className="w-2 h-2 rounded-full bg-[var(--brand-primary)]" />
                          )}
                        </div>
                      </div>
                      <span className={cn(
                        "text-sm font-medium transition-colors",
                        cancelReason === reason ? "text-[var(--brand-primary)]" : "text-gray-600"
                      )}>{reason}</span>
                    </label>
                  ))}
                </div>

                {/* Other Reason Input */}
                {cancelReason === "Other" && (
                  <textarea
                    placeholder="Please specify your reason..."
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    className="w-full p-2.5 border-2 border-gray-100 rounded-xl text-sm mb-3 focus:border focus:border-[var(--brand-primary)] focus:ring-0 focus:outline-none transition-all"
                    rows={2}
                  />
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setCancelModalOpen(false);
                      setCancelReason("");
                      setOtherReason("");
                    }}
                    variant="outline"
                    className="flex-1 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-600 rounded-lg h-11"
                  >
                    Keep Order
                  </Button>
                  <Button
                    onClick={handleCancelOrder}
                    disabled={!cancelReason || (cancelReason === "Other" && !otherReason.trim())}
                    className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white disabled:opacity-50 h-11 rounded-lg font-bold"
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Received Modal */}
      {orderToConfirmReceived && profile?.id && (
        <ConfirmReceivedModal
          isOpen={confirmReceivedModalOpen}
          onClose={() => {
            setConfirmReceivedModalOpen(false);
            setOrderToConfirmReceived(null);
          }}
          order={orderToConfirmReceived}
          buyerId={profile.id}
          onSuccess={onConfirmReceivedSuccess}
        />
      )}

      <BazaarFooter />
    </div >
  );
}
