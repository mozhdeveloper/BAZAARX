import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
    MessageCircle,
    Pencil,
    Check,
    Camera,
    Gift,
    ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useOrderStore, useAuthStore, useProductStore, SellerOrder } from "@/stores/sellerStore";
import { useChatStore } from "@/stores/chatStore";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { orderMutationService } from "@/services/orders/orderMutationService";
import { orderReadService } from "@/services/orders/orderReadService";
import { DeliveryService } from "@/services/deliveryService";
import { chatService } from "@/services/chatService";
import { useOrderPrivacy } from "@/hooks/useOrderPrivacy";

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

    const { products } = useProductStore();

    // ── Privacy resolution (Seller view) ─────────────────────────────────────
    const privacy = useOrderPrivacy({
        shippingAddress: order?.shippingAddress,
        recipientName: order?.buyerName,
        isRegistryOrder: order?.is_registry_order,
        viewerRole: "seller",
    });

    const [trackingModal, setTrackingModal] = useState<{
        isOpen: boolean;
        orderId: string | null;
        isLoading: boolean;
        generatedTracking: string | null;
    }>({
        isOpen: false,
        orderId: null,
        isLoading: false,
        generatedTracking: null,
    });

    const [showStatusOverride, setShowStatusOverride] = useState(false);
    const [overrideStatus, setOverrideStatus] = useState<SellerOrder["status"]>("pending");
    const [isOverriding, setIsOverriding] = useState(false);

    // --- NEW MODAL STATES ---
    const [alertModal, setAlertModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        isError: false,
    });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => void;
    }>({
        isOpen: false,
        title: "",
        message: "",
        action: () => { },
    });
    // ------------------------

    // POS customer editing state
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);
    const [posCustomerName, setPosCustomerName] = useState("");
    const [posCustomerEmail, setPosCustomerEmail] = useState("");
    const [posNotes, setPosNotes] = useState("");
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [isSavingPOS, setIsSavingPOS] = useState(false);

    // Receipt photo state
    const [receiptPhotos, setReceiptPhotos] = useState<string[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

    // Sync POS fields whenever the order changes (e.g. modal reopened with a different order)
    useEffect(() => {
        if (order) {
            setPosCustomerName(order.buyerName || "");
            setPosCustomerEmail(order.buyerEmail || "");
            setPosNotes(order.notes || order.posNote || "");
            setIsEditingCustomer(false);
            setIsEditingNotes(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.id]);

    // Load receipt photos when order is received/reviewed
    useEffect(() => {
        if (!order?.id) return;
        const s = order.status;
        if (s !== "delivered" && s !== "reviewed") {
            // also check shipmentStatusRaw for "received"
            if (order.shipmentStatusRaw !== "received") {
                setReceiptPhotos([]);
                return;
            }
        }
        orderReadService.getReceiptPhotos(order.id).then(setReceiptPhotos).catch(console.error);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.id, order?.status]);

    if (!isOpen || !order) return null;

    const isPOS = order.type === "OFFLINE";

    /** Send a system chat message for order status changes (fire-and-forget). */
    const sendOrderChatUpdate = async (
        eventType: 'placed' | 'confirmed' | 'shipped' | 'delivered',
        content: string,
    ) => {
        try {
            const sellerId = order.seller_id || useAuthStore.getState().seller?.id;
            const buyerId = order.buyer_id;
            if (!sellerId || !buyerId) return;

            const conv = await chatService.getOrCreateConversation(buyerId, sellerId);
            if (!conv) return;

            await chatService.triggerOrderSystemMessage(order.id, conv.id, eventType, content);
        } catch (e) {
            console.error('[OrderDetailsModal] Failed to send chat update:', e);
        }
    };

    const handleSavePOSCustomer = async () => {
        if (!posCustomerName.trim()) return;
        setIsSavingPOS(true);
        try {
            await orderMutationService.updatePOSOrderCustomer({
                orderId: order.id,
                buyerName: posCustomerName.trim(),
                buyerEmail: posCustomerEmail.trim() || undefined,
            });
            setIsEditingCustomer(false);
            setAlertModal({ isOpen: true, title: "Saved", message: "Customer details updated.", isError: false });
        } catch {
            setAlertModal({ isOpen: true, title: "Error", message: "Failed to save customer details.", isError: true });
        } finally {
            setIsSavingPOS(false);
        }
    };

    const handleSavePOSNotes = async () => {
        setIsSavingPOS(true);
        try {
            await orderMutationService.updatePOSOrderCustomer({
                orderId: order.id,
                notes: posNotes,
            });
            setIsEditingNotes(false);
            setAlertModal({ isOpen: true, title: "Saved", message: "Delivery notes updated.", isError: false });
        } catch {
            setAlertModal({ isOpen: true, title: "Error", message: "Failed to save delivery notes.", isError: true });
        } finally {
            setIsSavingPOS(false);
        }
    };

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
            setAlertModal({ isOpen: true, title: "Error", message: "Failed to update order status.", isError: true });
        }
    };

    const handleMarkAsShipped = async () => {
        setTrackingModal((prev) => ({ ...prev, isLoading: true }));

        try {
            const deliveryService = DeliveryService.getInstance();
            const seller = useAuthStore.getState().seller;

            // Build pickup address from seller profile
            const pickup = {
                name: seller?.storeName || seller?.ownerName || 'Seller',
                phone: seller?.phone || '09000000000',
                addressLine1: seller?.businessAddress || 'Store Address',
                city: seller?.city || 'Manila',
                province: seller?.province || 'Metro Manila',
                postalCode: seller?.postalCode || '1000',
            };

            // Build delivery address from order shipping address
            const delivery = {
                name: order.shippingAddress?.fullName || order.buyerName || 'Buyer',
                phone: order.shippingAddress?.phone || '09000000000',
                addressLine1: order.shippingAddress?.street || 'Delivery Address',
                city: order.shippingAddress?.city || 'Manila',
                province: order.shippingAddress?.province || 'Metro Manila',
                postalCode: order.shippingAddress?.postalCode || '1000',
            };

            // Build package details from order items
            const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const itemNames = order.items.map(i => i.productName).join(', ');

            const result = await deliveryService.bookDelivery({
                orderId: order.id,
                sellerId: order.seller_id || seller?.id || '',
                buyerId: order.buyer_id || '',
                courierCode: 'jnt',
                serviceType: 'standard',
                pickup,
                delivery,
                packageDetails: {
                    weight: Math.max(0.5, totalItems * 0.5),
                    description: itemNames.slice(0, 200),
                    itemCount: totalItems,
                },
                declaredValue: order.total,
            });

            const trackingNumber = result.trackingNumber;

            await markOrderAsShipped(order.id, trackingNumber);

            // Send automated chat message
            sendOrderChatUpdate('shipped', `Your order has been shipped! Tracking Number: ${trackingNumber}`);

            import("@/stores/cartStore")
                .then(({ useCartStore }) => {
                    const cartStore = useCartStore.getState();
                    cartStore.updateOrderStatus(order.id, "shipped");
                    cartStore.addNotification(
                        order.id,
                        "shipped",
                        `Your order is on the way! Tracking: ${trackingNumber}`,
                    );
                })
                .catch(console.error);

            setTrackingModal((prev) => ({
                ...prev,
                isOpen: false,
                generatedTracking: null,
            }));

            setAlertModal({
                isOpen: true,
                title: "Shipped!",
                message: `Order shipped successfully.\nTracking Number: ${trackingNumber}\nCourier: J&T Express (${deliveryService.isSandbox ? 'Sandbox' : 'Live'})`,
                isError: false,
            });
        } catch (error) {
            console.error("Error booking delivery:", error);
            setAlertModal({ isOpen: true, title: "Error", message: `Failed to book delivery: ${error instanceof Error ? error.message : 'Unknown error'}`, isError: true });
            setTrackingModal((prev) => ({ ...prev, isOpen: false }));
        } finally {
            setTrackingModal((prev) => ({ ...prev, isLoading: false }));
        }
    };

    const handleMarkAsDelivered = () => {
        setConfirmModal({
            isOpen: true,
            title: "Confirm Delivered",
            message: "Are you sure you want to mark this order as delivered? Payout will be processed.",
            action: async () => {
                try {
                    await markOrderAsDelivered(order.id);
                    setAlertModal({ isOpen: true, title: "Success", message: "Order marked as delivered successfully!", isError: false });
                } catch (error) {
                    console.error("Error marking delivered:", error);
                    setAlertModal({ isOpen: true, title: "Error", message: "Failed to mark as delivered.", isError: true });
                }
            }
        });
    };

    const handleOverrideStatus = () => {
        setConfirmModal({
            isOpen: true,
            title: "Force Status Change",
            message: `Are you sure you want to force change the order status to ${overrideStatus}?`,
            action: async () => {
                setIsOverriding(true);
                try {
                    await updateOrderStatus(order.id, overrideStatus);
                    setShowStatusOverride(false);
                    setAlertModal({ isOpen: true, title: "Success", message: "Order status changed successfully!", isError: false });
                } catch (error) {
                    console.error("Failed to override status:", error);
                    setAlertModal({ isOpen: true, title: "Error", message: "Failed to change status.", isError: true });
                } finally {
                    setIsOverriding(false);
                }
            }
        });
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
                    <div className="inline-flex items-center bg-[var(--brand-wash)] text-[var(--brand-primary)] gap-1 rounded-full px-3 py-1 text-xs font-medium border border-[var(--brand-primary)]/20">
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

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div
                    key="order-details-modal"
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4"
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
                                            {order.items.map((item, idx) => {
                                                // 🕵️‍♂️ RECOVERY LOGIC: Find the base product in the store
                                                const baseProduct = products.find(p => p.id === item.productId);

                                                // Detect if the name is just a variant name or "Default"
                                                const isVariantNameUsed = item.productName === "Default" ||
                                                    item.productName === item.selectedVariantLabel1 ||
                                                    item.productName === item.selectedVariantLabel2;

                                                const displayName = (isVariantNameUsed && baseProduct)
                                                    ? baseProduct.name
                                                    : item.productName;

                                                return (
                                                    <div key={idx} className="flex gap-4">
                                                        <div className="h-14 w-14 rounded-md bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                                                            <img loading="lazy" src={item.image} alt={displayName} className="h-full w-full object-cover" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                            {/* Display recovered base name */}
                                                            <h4 className="font-bold text-gray-900 text-sm truncate">{displayName}</h4>

                                                            {/* Display variants underneath if they exist */}
                                                            {(item.selectedVariantLabel2 || item.selectedVariantLabel1) && (
                                                                <p className="text-[11px] font-semibold text-[var(--brand-primary)] mt-0.5 truncate uppercase tracking-tight">
                                                                    {[item.selectedVariantLabel1, item.selectedVariantLabel2]
                                                                        .filter(val => val && val !== "Default")
                                                                        .join(" • ")}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right flex flex-col justify-center">
                                                            <p className="text-sm font-medium text-gray-900">{item.quantity} item{item.quantity > 1 ? "s" : ""}</p>
                                                            <p className="text-sm text-gray-500">₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            <div className="pt-4 border-t border-gray-100 space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">
                                                        {order.type === 'OFFLINE' ? 'VATable Sales' : 'Subtotal'}
                                                    </span>
                                                    <span className="font-medium text-gray-900">
                                                        ₱{order.type === 'OFFLINE'
                                                            ? (order.total / 1.12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                            : order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                        }
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">
                                                        {order.type === 'OFFLINE' ? 'VAT (12%)' : 'Tax (0%)'}
                                                    </span>
                                                    <span className="font-medium text-gray-900">
                                                        ₱{order.type === 'OFFLINE'
                                                            ? (order.total - order.total / 1.12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                            : '0.00'
                                                        }
                                                    </span>
                                                </div>
                                                {/* Payment Method */}
                                                {order.paymentMethod && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">Payment Method</span>
                                                        <span className="font-medium text-gray-900">
                                                            {order.paymentMethod === 'cash' && 'Cash'}
                                                            {order.paymentMethod === 'card' && 'PayMongo'}
                                                            {order.paymentMethod === 'ewallet' && 'E-Wallet'}
                                                            {order.paymentMethod === 'bank_transfer' && 'Bank Transfer'}
                                                            {order.paymentMethod === 'cod' && 'Cash on Delivery'}
                                                            {order.paymentMethod === 'online' && 'Online Payment'}
                                                            {order.paymentMethod === 'gcash' && 'GCash'}
                                                            {order.paymentMethod === 'maya' && 'Maya'}
                                                            {order.paymentMethod === 'grab_pay' && 'GrabPay'}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-base pt-2 font-semibold border-t border-gray-50 mt-2">
                                                    <span className="text-gray-900">
                                                        Total amount
                                                    </span>
                                                    <span className="text-gray-900">
                                                        ₱{order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Customer / Recipient */}
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {privacy.isRegistryOrder && (
                                                <Gift className="w-4 h-4 text-pink-500" />
                                            )}
                                            <span className="font-semibold text-gray-900 text-sm">
                                                {privacy.isRegistryOrder ? "Gift Recipient" : "Customer"}
                                            </span>
                                            {privacy.isRegistryOrder && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-100">
                                                    Wishlist Gift
                                                </span>
                                            )}
                                        </div>
                                        {isPOS && !isEditingCustomer && (
                                            <button
                                                onClick={() => setIsEditingCustomer(true)}
                                                className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium"
                                            >
                                                <Pencil className="w-3 h-3" />
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    {isPOS && isEditingCustomer ? (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">Customer Name <span className="text-red-400">*</span></label>
                                                <Input
                                                    value={posCustomerName}
                                                    onChange={(e) => setPosCustomerName(e.target.value)}
                                                    placeholder="e.g. Juan Dela Cruz"
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">Email (optional)</label>
                                                <Input
                                                    value={posCustomerEmail}
                                                    onChange={(e) => setPosCustomerEmail(e.target.value)}
                                                    placeholder="customer@email.com"
                                                    className="h-8 text-sm"
                                                    type="email"
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <Button
                                                    size="sm"
                                                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs"
                                                    onClick={() => void handleSavePOSCustomer()}
                                                    disabled={isSavingPOS || !posCustomerName.trim()}
                                                >
                                                    {isSavingPOS ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Save</>}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-1 h-8 text-xs"
                                                    onClick={() => {
                                                        setIsEditingCustomer(false);
                                                        setPosCustomerName(order.buyerName || "");
                                                        setPosCustomerEmail(order.buyerEmail || "");
                                                    }}
                                                    disabled={isSavingPOS}
                                                >
                                                    Discard
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {posCustomerName || privacy.recipientName || "Walk-in Customer"}
                                            </p>
                                            {(posCustomerEmail || order.buyerEmail) && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {posCustomerEmail || order.buyerEmail}
                                                </p>
                                            )}
                                            {!isPOS && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {privacy.city || "Unknown Location"},{" "}
                                                    {privacy.province || "PH"}
                                                </p>
                                            )}
                                            {isPOS && (
                                                <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-medium">
                                                    POS / Walk-in
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {!isPOS && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-3 w-full text-[#FF6A00] border-[#FF6A00]/20 hover:bg-[#FF6A00]/5"
                                            onClick={() => {
                                                const currentSellerId = useAuthStore.getState().seller?.id || '';
                                                useChatStore.getState().openChat({
                                                    sellerId: currentSellerId,
                                                    sellerName: useAuthStore.getState().seller?.storeName || 'My Store',
                                                    sellerAvatar: '',
                                                    buyerId: order.buyer_id || '',
                                                    buyerName: order.buyerName || 'Buyer',
                                                    orderId: order.id,
                                                    productName: `Order #${order.id?.slice(0, 8).toUpperCase()}`,
                                                    productImage: order.items?.[0]?.image || '',
                                                });
                                                useChatStore.getState().setMiniMode(false);
                                            }}
                                        >
                                            <MessageCircle className="h-4 w-4 mr-2" />
                                            Chat with Buyer
                                        </Button>
                                    )}
                                </div>

                                {/* POS Delivery Notes */}
                                {isPOS && (
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-semibold text-gray-900 text-sm">Delivery / Notes</span>
                                            {!isEditingNotes && (
                                                <button
                                                    onClick={() => setIsEditingNotes(true)}
                                                    className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                        {isEditingNotes ? (
                                            <div className="space-y-2">
                                                <textarea
                                                    value={posNotes}
                                                    onChange={(e) => setPosNotes(e.target.value)}
                                                    placeholder="Delivery address or additional notes..."
                                                    rows={3}
                                                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs"
                                                        onClick={() => void handleSavePOSNotes()}
                                                        disabled={isSavingPOS}
                                                    >
                                                        {isSavingPOS ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Save</>}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="flex-1 h-8 text-xs"
                                                        onClick={() => {
                                                            setIsEditingNotes(false);
                                                            setPosNotes(order.notes || order.posNote || "");
                                                        }}
                                                        disabled={isSavingPOS}
                                                    >
                                                        Discard
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                {posNotes || <span className="text-gray-400 italic">No notes added</span>}
                                            </p>
                                        )}
                                    </div>
                                )}

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
                                                    className={`w-4 h-4 ${star <=
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
                                                        <img loading="lazy" 
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

                                {/* Receipt / Delivery Proof Photos */}
                                {receiptPhotos.length > 0 && (
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Camera className="w-4 h-4 text-green-600" />
                                            <span className="font-semibold text-gray-900 text-sm">
                                                Delivery Proof Photos
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {receiptPhotos.map((url, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setSelectedPhoto(url)}
                                                    className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-orange-400 transition-colors"
                                                >
                                                    <img loading="lazy" 
                                                        src={url}
                                                        alt={`Receipt ${idx + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </button>
                                            ))}
                                        </div>
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
                                                    {privacy.isRegistryOrder && (
                                                        <div className="flex items-center gap-1.5 mb-2 p-2 bg-pink-50 border border-pink-100 rounded-lg">
                                                            <ShieldCheck className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                                                            <span className="text-[11px] text-pink-700 font-medium leading-snug">
                                                                Wishlist Gift — delivering to recipient. Phone masked for privacy.
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="block text-sm text-gray-600 leading-relaxed">
                                                        {privacy.street || "No street provided"},{" "}
                                                        {privacy.city}{" "}
                                                        {privacy.postalCode}
                                                        <br />
                                                        {privacy.province}, Philippines
                                                    </span>
                                                    {privacy.maskedPhone && privacy.maskedPhone !== "—" && (
                                                        <div className="flex items-center gap-1.5 mt-2">
                                                            <Phone className="w-3 h-3 text-gray-400" />
                                                            <span className="text-sm text-gray-600 font-medium">
                                                                {privacy.maskedPhone}
                                                            </span>
                                                            {privacy.showPhoneAlert && (
                                                                <span className="ml-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-100 font-semibold">
                                                                    <ShieldCheck className="w-2.5 h-2.5" />
                                                                    Masked
                                                                </span>
                                                            )}
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
                                                        <div className="p-2 bg-[var(--brand-wash)] border border-[var(--brand-primary)]/20 rounded-lg text-[var(--brand-primary)] mt-0.5 shadow-sm">
                                                            <Package className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="block text-sm font-semibold text-[var(--brand-primary)]">
                                                                Preparing for Shipment
                                                            </span>
                                                            <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-0.5">
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
                                            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white flex-1 font-semibold shadow-md hover:shadow-lg transition-all"
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
                                            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white flex-1 font-semibold shadow-md hover:shadow-lg transition-all"
                                            onClick={() =>
                                                setTrackingModal((prev) => ({
                                                    ...prev,
                                                    isOpen: true,
                                                }))
                                            }
                                        >
                                            Ship
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

            {/* Nested Ship Confirmation Modal */}
            {trackingModal.isOpen && (
                <div
                    key="tracking-modal"
                    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm"
                    >
                        <h3 className="font-bold text-gray-900 mb-2 text-lg">
                            Ship Order
                        </h3>
                        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                            A tracking number will be automatically generated via <span className="font-semibold">J&T Express</span>.
                            {DeliveryService.getInstance().isSandbox && (
                                <span className="block mt-1 text-xs text-amber-600 font-medium">(Sandbox mode — fake tracking number will be generated)</span>
                            )}
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1">Ship to</div>
                            <div className="text-sm font-medium text-gray-900">{privacy.recipientName || order.buyerName}</div>
                            <div className="text-xs text-gray-600 mt-0.5">
                                {privacy.city}, {privacy.province}
                            </div>
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
                                disabled={trackingModal.isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="lg"
                                className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-semibold"
                                onClick={handleMarkAsShipped}
                                disabled={trackingModal.isLoading}
                            >
                                {trackingModal.isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    "Confirm & Ship"
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* --- NEW: Universal Alert Modal --- */}
            <Dialog key="alert-modal" open={alertModal.isOpen} onOpenChange={(isOpen) => setAlertModal(prev => ({ ...prev, isOpen }))}>
                <DialogContent className="sm:max-w-[400px] z-[1100]">
                    <DialogHeader>
                        <DialogTitle className={alertModal.isError ? "text-red-600" : "text-green-600"}>
                            {alertModal.title}
                        </DialogTitle>
                        <DialogDescription className="text-gray-700 mt-2 font-medium">
                            {alertModal.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}>
                            OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- NEW: Universal Confirm Modal --- */}
            <Dialog key="confirm-modal" open={confirmModal.isOpen} onOpenChange={(isOpen) => setConfirmModal(prev => ({ ...prev, isOpen }))}>
                <DialogContent className="sm:max-w-[425px] z-[1100]">
                    <DialogHeader>
                        <DialogTitle>{confirmModal.title}</DialogTitle>
                        <DialogDescription className="text-gray-700 mt-2 font-medium">
                            {confirmModal.message}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                            Cancel
                        </Button>
                        <Button
                            variant={confirmModal.title.includes("Force") ? "destructive" : "default"}
                            className={!confirmModal.title.includes("Force") ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white" : ""}
                            onClick={() => {
                                confirmModal.action();
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            }}
                        >
                            Confirm Action
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Photo lightbox */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img loading="lazy" 
                        src={selectedPhoto}
                        alt="Receipt photo"
                        className="max-w-full max-h-[90vh] rounded-lg object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}
