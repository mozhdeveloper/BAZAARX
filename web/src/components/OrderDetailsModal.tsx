import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Package,
    X,
    Loader2,
    XCircle,
    Clock,
    Phone,
    Truck,
    CheckCircle,
    Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useOrderStore, SellerOrder } from "@/stores/sellerStore";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";

interface OrderDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SellerOrder | null;
}

export function OrderDetailsModal({
    isOpen,
    onClose,
    order,
}: OrderDetailsModalProps) {
    const {
        updateOrderStatus,
        markOrderAsShipped,
        markOrderAsDelivered,
    } = useOrderStore();

    const [trackingModal, setTrackingModal] = useState<{
        isOpen: boolean;
        orderId: string | null;
        trackingNumber: string;
        isLoading: boolean;
    }>({
        isOpen: false,
        orderId: null,
        trackingNumber: "",
        isLoading: false,
    });

    const [showStatusOverride, setShowStatusOverride] = useState(false);
    const [overrideStatus, setOverrideStatus] = useState<SellerOrder["status"]>("pending");
    const [isOverriding, setIsOverriding] = useState(false);

    if (!isOpen || !order) return null;

    const handleStatusUpdate = async (
        status: Extract<SellerOrder["status"], "confirmed" | "cancelled">,
    ) => {
        try {
            await updateOrderStatus(order.id, status);

            if (status === "confirmed") {
                import("@/stores/cartStore")
                    .then(({ useCartStore }) => {
                        const cartStore = useCartStore.getState();
                        cartStore.updateOrderStatus(order.id, "confirmed");
                        cartStore.addNotification(
                            order.id,
                            "seller_confirmed",
                            "Your order has been confirmed by the seller! Track your delivery now.",
                        );
                    })
                    .catch(console.error);
            }
        } catch (error) {
            console.error("Failed to update order status:", error);
            alert("Failed to update order status.");
        }
    };

    const handleMarkAsShipped = async () => {
        if (!trackingModal.trackingNumber.trim()) {
            alert("Please enter a tracking number");
            return;
        }

        setTrackingModal((prev) => ({ ...prev, isLoading: true }));

        try {
            await markOrderAsShipped(
                order.id,
                trackingModal.trackingNumber,
            );

            import("@/stores/cartStore")
                .then(({ useCartStore }) => {
                    const cartStore = useCartStore.getState();
                    cartStore.updateOrderStatus(order.id, "shipped");
                    cartStore.addNotification(
                        order.id,
                        "shipped",
                        `Your order is on the way! Tracking: ${trackingModal.trackingNumber}`,
                    );
                })
                .catch(console.error);

            setTrackingModal((prev) => ({
                ...prev,
                isOpen: false,
                trackingNumber: "",
            }));
        } catch (error) {
            console.error("Error marking order as shipped:", error);
            alert("An error occurred.");
        } finally {
            setTrackingModal((prev) => ({ ...prev, isLoading: false }));
        }
    };

    const handleMarkAsDelivered = async () => {
        if (!window.confirm("Mark this order as delivered?")) return;

        try {
            await markOrderAsDelivered(order.id);
        } catch (error) {
            console.error("Error marking delivered:", error);
            alert("Failed to mark as delivered.");
        }
    };

    const handleOverrideStatus = async () => {
        if (!window.confirm(`Force change order status to ${overrideStatus}?`)) return;
        
        setIsOverriding(true);
        try {
            await updateOrderStatus(order.id, overrideStatus);
            setShowStatusOverride(false);
            alert("Order status changed successfully!");
        } catch (error) {
            console.error("Failed to override status:", error);
            alert("Failed to change status.");
        } finally {
            setIsOverriding(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "delivered":
                return (
                    <div className="inline-flex items-center bg-green-50 text-green-700 gap-1 rounded-full px-3 py-1 text-xs font-medium border border-green-100">
                        <CheckCircle className="w-3" /> Delivered
                    </div>
                );
            case "shipped":
                return (
                    <div className="inline-flex items-center bg-blue-50 text-blue-700 gap-1 rounded-full px-3 py-1 text-xs font-medium border border-blue-100">
                        <Truck className="w-3" /> Shipped
                    </div>
                );
            case "cancelled":
                return (
                    <div className="inline-flex items-center bg-red-50 text-red-700 gap-1 rounded-full px-3 py-1 text-xs font-medium border border-red-100">
                        <XCircle className="w-3" /> Cancelled
                    </div>
                );
            case "confirmed":
                return (
                    <div className="inline-flex items-center bg-orange-50 text-orange-700 gap-1 rounded-full px-3 py-1 text-xs font-medium border border-orange-100">
                        <Package className="w-3" /> Confirmed
                    </div>
                );
            default:
                return (
                    <div className="inline-flex items-center bg-amber-50 text-amber-700 gap-1 rounded-full px-3 py-1 text-xs font-medium border border-amber-100">
                        <Clock className="w-3" /> Pending
                    </div>
                );
        }
    };

    const latestReview =
        order.reviews?.[0] ||
        (typeof order.rating === "number"
            ? {
                  id: `legacy-${order.id}`,
                  productId: null,
                  rating: order.rating,
                  comment: order.reviewComment || "",
                  images: Array.isArray(order.reviewImages)
                      ? order.reviewImages
                      : [],
                  submittedAt:
                      order.reviewDate ||
                      order.deliveredAt ||
                      order.orderDate,
              }
            : null);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    key="order-details-modal"
                    className="fixed inset-0 bg-black/30 flex items-center justify-center z-[200] p-4 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-[#fbfcff] rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 bg-white border-b border-gray-100 sticky top-0 z-10 flex items-start justify-between">
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                    Order #
                                    {order.orderNumber ||
                                        order.id.slice(0, 8).toUpperCase()}
                                </h2>
                                <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <div className="flex items-center gap-2">
                                        <OrderStatusBadge
                                            status={order.status}
                                            compact
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <span className="font-medium text-gray-400">
                                            Order date:
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            {new Date(
                                                order.orderDate,
                                            ).toLocaleDateString("en-US", {
                                                month: "long",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="rounded-full h-8 w-8 hover:bg-gray-100 -mr-2 -mt-2"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </Button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-4 bg-[#f9fafb] pb-24">
                            <Accordion
                                type="multiple"
                                defaultValue={[
                                    "summary",
                                    "customer",
                                    "delivery",
                                ]}
                                className="space-y-4"
                            >
                                {/* Order Summary */}
                                <AccordionItem
                                    value="summary"
                                    className="bg-white rounded-xl border border-gray-100 shadow-sm px-1 overflow-hidden"
                                >
                                    <AccordionTrigger className="px-4 hover:no-underline py-4">
                                        <span className="font-semibold text-gray-900 text-sm">
                                            Order Summary
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="space-y-6">
                                            {order.items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex gap-4"
                                                >
                                                    <div className="h-14 w-14 rounded-md bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={item.image}
                                                            alt={
                                                                item.productName
                                                            }
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        <h4 className="font-medium text-gray-900 text-sm truncate">
                                                            {item.productName}
                                                        </h4>
                                                        {(item.selectedVariantLabel2 ||
                                                            item.selectedVariantLabel1) && (
                                                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                                    {
                                                                        item.selectedVariantLabel1
                                                                    }{" "}
                                                                    {item.selectedVariantLabel2
                                                                        ? `• ${item.selectedVariantLabel2}`
                                                                        : ""}
                                                                </p>
                                                            )}
                                                    </div>
                                                    <div className="text-right flex flex-col justify-center">
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {item.quantity} item
                                                            {item.quantity > 1
                                                                ? "s"
                                                                : ""}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            ₱
                                                            {item.price.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="pt-4 border-t border-gray-100 space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">
                                                        Subtotal
                                                    </span>
                                                    <span className="font-medium text-gray-900">
                                                        ₱
                                                        {order.total.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">
                                                        Tax (0%)
                                                    </span>
                                                    <span className="font-medium text-gray-900">
                                                        ₱0.00
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-base pt-2 font-semibold border-t border-gray-50 mt-2">
                                                    <span className="text-gray-900">
                                                        Total amount
                                                    </span>
                                                    <span className="text-gray-900">
                                                        ₱
                                                        {order.total.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Customer */}
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                                    <span className="font-semibold text-gray-900 text-sm block mb-3">
                                        Customer
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {order.buyerName}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {order.shippingAddress?.city ||
                                                "Unknown Location"}
                                            ,{" "}
                                            {order.shippingAddress?.province ||
                                                "PH"}
                                        </p>
                                    </div>
                                </div>

                                {latestReview && (
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <span className="font-semibold text-gray-900 text-sm block">
                                                Buyer Review
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(
                                                    latestReview.submittedAt,
                                                ).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1 mb-3">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-4 h-4 ${
                                                        star <=
                                                        latestReview.rating
                                                            ? "fill-yellow-400 text-yellow-400"
                                                            : "text-gray-300"
                                                    }`}
                                                />
                                            ))}
                                            <span className="text-xs font-medium text-gray-600 ml-1">
                                                {latestReview.rating.toFixed(1)}
                                                /5
                                            </span>
                                        </div>

                                        {latestReview.comment ? (
                                            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                                "{latestReview.comment}"
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-500">
                                                Buyer left a rating without a
                                                comment.
                                            </p>
                                        )}

                                        {latestReview.images.length > 0 && (
                                            <div className="flex gap-2 mt-3">
                                                {latestReview.images.map(
                                                    (image, index) => (
                                                        <img
                                                            key={`${latestReview.id}-${index}`}
                                                            src={image}
                                                            alt={`Review ${index + 1}`}
                                                            className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Delivery Information */}
                                <AccordionItem
                                    value="delivery"
                                    className="bg-white rounded-xl border border-gray-100 shadow-sm px-1 overflow-hidden"
                                >
                                    <AccordionTrigger className="px-4 hover:no-underline py-4">
                                        <span className="font-semibold text-gray-900 text-sm">
                                            Delivery information
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 bg-white border border-gray-100 rounded-lg text-gray-500 mt-0.5 shadow-sm">
                                                    <Package className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="block text-sm font-semibold text-gray-900 mb-1">
                                                        Ship to
                                                    </span>
                                                    <span className="block text-sm text-gray-600 leading-relaxed">
                                                        {order.shippingAddress
                                                            ?.street ||
                                                            "No street provided"}
                                                        ,{" "}
                                                        {
                                                            order
                                                                .shippingAddress
                                                                ?.city
                                                        }{" "}
                                                        {
                                                            order
                                                                .shippingAddress
                                                                ?.postalCode
                                                        }
                                                        <br />
                                                        {
                                                            order
                                                                .shippingAddress
                                                                ?.province
                                                        }
                                                        , Philippines
                                                    </span>
                                                    {order.shippingAddress
                                                        ?.phone && (
                                                            <div className="flex items-center gap-1.5 mt-2">
                                                                <Phone className="w-3 h-3 text-gray-400" />
                                                                <span className="text-sm text-gray-600 font-medium">
                                                                    {
                                                                        order
                                                                            .shippingAddress
                                                                            .phone
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                </div>
                                            </div>

                                            {/* Shipment Status / Dynamic based on status */}
                                            <div className="pt-4 border-t border-gray-100">
                                                {order.status === "delivered" ? (
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-2 bg-green-50 border border-green-100 rounded-lg text-green-600 mt-0.5 shadow-sm">
                                                            <CheckCircle className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="block text-sm font-semibold text-green-700">
                                                                Delivered Successfully
                                                            </span>
                                                            <p className="text-sm text-green-600/80 leading-relaxed mt-0.5">
                                                                This order has been received by the customer.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : order.status === "shipped" ? (
                                                    <div className="space-y-4">
                                                        <div className="flex items-start gap-4">
                                                            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 mt-0.5 shadow-sm">
                                                                <Truck className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <span className="block text-sm font-semibold text-blue-700">
                                                                    In Transit
                                                                </span>
                                                                <p className="text-sm text-gray-600 leading-relaxed mt-0.5">
                                                                    The package is currently with the courier for delivery.
                                                                </p>
                                                                {order.trackingNumber && (
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className="text-sm text-gray-500">Tracking number:</span>
                                                                        <span className="text-sm font-semibold text-gray-900">{order.trackingNumber}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : order.status === "confirmed" ? (
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-2 bg-orange-50 border border-orange-100 rounded-lg text-orange-600 mt-0.5 shadow-sm">
                                                            <Package className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="block text-sm font-semibold text-orange-700">
                                                                Preparing for Shipment
                                                            </span>
                                                            <p className="text-sm text-gray-600 leading-relaxed mt-0.5">
                                                                Please pack the items and prepare the shipping label.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : order.status === "cancelled" ? (
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-red-600 mt-0.5 shadow-sm">
                                                            <XCircle className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="block text-sm font-semibold text-red-700">
                                                                Shipment Cancelled
                                                            </span>
                                                            <p className="text-sm text-red-600/80 leading-relaxed mt-0.5">
                                                                The order has been cancelled and will not be shipped.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg text-amber-600 mt-0.5 shadow-sm">
                                                            <Clock className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="block text-sm font-semibold text-amber-700">
                                                                Awaiting Confirmation
                                                            </span>
                                                            <p className="text-sm text-gray-600 leading-relaxed mt-0.5">
                                                                Please review and confirm the order to start processing.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>

                        {/* Sticky Action Buttons at Bottom */}
                        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 shadow-lg z-20">
                            {/* Status Override Section */}
                            {showStatusOverride ? (
                                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-yellow-900">⚠️ Force Status Change</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setShowStatusOverride(false)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            value={overrideStatus}
                                            onChange={(e) => setOverrideStatus(e.target.value as SellerOrder["status"])}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                        <Button
                                            size="sm"
                                            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                                            onClick={handleOverrideStatus}
                                            disabled={isOverriding}
                                        >
                                            {isOverriding ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                "Confirm Status Change"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full mb-4 text-yellow-700 hover:text-yellow-800 hover:bg-yellow-50 border-yellow-300"
                                    onClick={() => setShowStatusOverride(true)}
                                >
                                    Override Status (Force Change)
                                </Button>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3">
                                {order.status === "pending" && (
                                    <>
                                        <Button
                                            size="lg"
                                            className="bg-orange-500 hover:bg-orange-600 text-white flex-1 font-semibold shadow-md hover:shadow-lg transition-all"
                                            onClick={() =>
                                                void handleStatusUpdate(
                                                    "confirmed",
                                                )
                                            }
                                        >
                                            Confirm Order
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="ghost"
                                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium"
                                            onClick={() =>
                                                void handleStatusUpdate(
                                                    "cancelled",
                                                )
                                            }
                                        >
                                            Cancel Order
                                        </Button>
                                    </>
                                )}
                                {order.status === "confirmed" && (
                                    <>
                                        <Button
                                            size="lg"
                                            className="bg-orange-500 hover:bg-orange-600 text-white flex-1 font-semibold shadow-md hover:shadow-lg transition-all"
                                            onClick={() =>
                                                setTrackingModal((prev) => ({
                                                    ...prev,
                                                    isOpen: true,
                                                }))
                                            }
                                        >
                                            Ship Order
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="ghost"
                                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium"
                                            onClick={() =>
                                                void handleStatusUpdate(
                                                    "cancelled",
                                                )
                                            }
                                        >
                                            Cancel Order
                                        </Button>
                                    </>
                                )}
                                {order.status === "shipped" && (
                                    <Button
                                        size="lg"
                                        className="bg-green-600 hover:bg-green-700 text-white w-full font-semibold shadow-md hover:shadow-lg transition-all"
                                        onClick={handleMarkAsDelivered}
                                    >
                                        Mark as Delivered
                                    </Button>
                                )}
                                {(order.status === "delivered" ||
                                    order.status === "cancelled") && (
                                        <div className="w-full text-center text-sm text-gray-400 italic py-3 bg-gray-50 rounded-lg border border-gray-100">
                                            No further actions required.
                                        </div>
                                    )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Nested Tracking Modal */}
            {trackingModal.isOpen && (
                <div
                    key="tracking-modal"
                    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[250] p-4 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm"
                    >
                        <h3 className="font-bold text-gray-900 mb-4 text-lg">
                            Shipment Details
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Tracking Number
                                </label>
                                <Input
                                    value={trackingModal.trackingNumber}
                                    onChange={(e) =>
                                        setTrackingModal((prev) => ({
                                            ...prev,
                                            trackingNumber: e.target.value,
                                        }))
                                    }
                                    placeholder="Enter tracking ID"
                                    className="text-sm"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="flex-1"
                                    onClick={() =>
                                        setTrackingModal((prev) => ({
                                            ...prev,
                                            isOpen: false,
                                        }))
                                    }
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="lg"
                                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                                    onClick={handleMarkAsShipped}
                                    disabled={
                                        trackingModal.isLoading ||
                                        !trackingModal.trackingNumber
                                    }
                                >
                                    {trackingModal.isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        "Confirm"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
