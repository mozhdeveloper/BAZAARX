import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from 'jspdf';
import {
  ChevronLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  CreditCard,
  MessageCircle,
  Send,
  Download,
  Share2,
  RotateCcw,
  X,
  Camera,
} from "lucide-react";
import { ConfirmReceivedModal } from "../components/ConfirmReceivedModal";
import { Order } from "../stores/cartStore";
import { useBuyerStore } from "../stores/buyerStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { orderReadService } from "../services/orders/orderReadService";
import { orderMutationService } from "../services/orders/orderMutationService";
import { chatService, Message, Conversation } from "../services/chatService";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { cn } from "@/lib/utils";
import { ReviewModal } from "../components/ReviewModal";
import { useToast } from "../hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { ORDER_STATUS_MESSAGES } from "../services/orderNotificationService";

interface ChatMessage {
  id: string;
  sender: "buyer" | "seller" | "system";
  message: string;
  timestamp: Date;
  read: boolean;
}

// Extended order interface with DB fields
interface DbOrderData {
  buyer_id?: string;
  is_reviewed?: boolean;
  shipping_cost?: number;
  cancellationReason?: string;
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const { profile, addToCart } = useBuyerStore();

  const [isLoading, setIsLoading] = useState(true);
  const [dbOrder, setDbOrder] = useState<(Order & DbOrderData) | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Seller/Store info
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("Seller");

  // Chat state
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(true);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Cancel order state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Receipt photos state
  const [receiptPhotos, setReceiptPhotos] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Confirm received state
  const [confirmReceivedModalOpen, setConfirmReceivedModalOpen] = useState(false);

  const CANCEL_REASONS = [
    "Changed my mind",
    "Found a better price elsewhere",
    "Ordered by mistake",
    "Delivery time too long",
    "Want to change shipping address",
    "Want to modify order items",
    "Other"
  ];

  // Load order + seller info through shared read service.
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      setIsLoading(true);
      try {
        const detail = await orderReadService.getOrderDetail({
          orderIdOrNumber: orderId,
          buyerId: profile?.id,
        });

        if (!detail) {
          console.error("Order not found or access denied");
          navigate("/orders");
          return;
        }

        setSellerId(detail.sellerId);
        setStoreName(detail.storeName || "Seller");

        const extendedOrder: Order & DbOrderData = {
          ...(detail.order as unknown as Order),
          buyer_id: detail.buyer_id,
          is_reviewed: detail.is_reviewed || false,
          shipping_cost: detail.shipping_cost || 0,
          cancellationReason: detail.order.cancellationReason,
        };

        setDbOrder(extendedOrder);
      } catch (err) {
        console.error("Error fetching order details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchOrder();
  }, [orderId, profile?.id, navigate]);

  // Load receipt details when order is received/reviewed
  useEffect(() => {
    if (!dbOrder?.id) return;
    const s = (dbOrder as any).status ?? (dbOrder as any).shipmentStatus;
    if (s !== "received" && s !== "reviewed") return;

    orderReadService.getReceivedDetails(dbOrder.id)
      .then(details => {
        if (!details) return;
        setReceiptPhotos(details.photos);
        // Only update if receivedAt is not already set to avoid loops
        if (!dbOrder.receivedAt) {
          setDbOrder(prev => prev ? { ...prev, receivedAt: details.receivedAt } : null);
        }
      })
      .catch(console.error);
  }, [dbOrder?.id]);

  // Load chat messages when seller and profile are ready
  useEffect(() => {
    const loadChat = async () => {
      if (!sellerId || !profile?.id || !dbOrder?.id) {
        setIsLoadingChat(false);
        return;
      }

      setIsLoadingChat(true);
      try {
        // Use the actual order UUID (dbOrder.id), NOT the URL param (order number)
        const conv = await chatService.getOrCreateConversationLite(profile.id, sellerId, dbOrder.id);

        if (conv) {
          // Only need conv.id for messages + subscriptions; cast minimal object
          setConversation({
            id: conv.id,
            buyer_id: profile.id,
            order_id: dbOrder.id || null,
            seller_id: sellerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Conversation);

          // Load messages
          const messages = await chatService.getMessages(conv.id);

          // Convert to local format
          const formattedMessages: ChatMessage[] = messages.map((msg: Message) => ({
            id: msg.id,
            sender: (msg.message_type === 'system' || !msg.sender_type) ? 'system' : msg.sender_type as 'buyer' | 'seller',
            message: msg.message_content || msg.content,
            timestamp: new Date(msg.created_at),
            read: msg.is_read,
          }));

          // Add system message at the start if this is a new order
          if (formattedMessages.length === 0) {
            formattedMessages.unshift({
              id: 'system-order-confirmed',
              sender: 'system',
              message: 'Order confirmed! Your seller will start preparing your items.',
              timestamp: new Date(),
              read: true,
            });
          }

          setChatMessages(formattedMessages);

          // Mark messages as read — fire and forget, don't block rendering
          chatService.markConversationAsRead(conv.id, 'buyer').catch(() => { });
        }
      } catch (error) {
        console.error('Error loading chat:', error);
      } finally {
        setIsLoadingChat(false);
      }
    };

    loadChat();
  }, [sellerId, profile?.id, dbOrder?.id]);

  // Subscribe to real-time chat updates
  useEffect(() => {
    if (!conversation?.id) return;

    const subscription = chatService.subscribeToConversation(
      conversation.id,
      (newMessage: Message) => {
        const formattedMessage: ChatMessage = {
          id: newMessage.id,
          sender: (newMessage.message_type === 'system' || !newMessage.sender_type) ? 'system' : newMessage.sender_type as 'buyer' | 'seller',
          message: newMessage.message_content || newMessage.content,
          timestamp: new Date(newMessage.created_at),
          read: newMessage.is_read,
        };

        setChatMessages(prev => {
          // Avoid duplicates by final ID
          if (prev.some(m => m.id === newMessage.id)) return prev;

          // If this is a buyer message, check if we have a matching optimistic message
          if (newMessage.sender_type === 'buyer') {
            const optimisticIndex = prev.findIndex(m =>
              m.id.toString().startsWith('temp-') &&
              m.message === newMessage.content
            );

            if (optimisticIndex !== -1) {
              const newMessages = [...prev];
              newMessages[optimisticIndex] = formattedMessage;
              return newMessages;
            }
          }

          return [...prev, formattedMessage];
        });

        // Mark as read if from seller
        if (newMessage.sender_type === 'seller') {
          chatService.markConversationAsRead(conversation.id, 'buyer');
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [conversation?.id]);

  useEffect(() => {
    if (!isLoading && !dbOrder) {
      navigate("/orders");
    }
  }, [dbOrder, navigate, isLoading]);

  useEffect(() => {
    if (!chatContainerRef.current) return;

    const scrollBottom = (behavior: ScrollBehavior = "auto") => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior
        });
      }
    };

    if (isFirstLoad.current && chatMessages.length > 0 && !isLoadingChat) {
      // Small delay on first load to ensure DOM is fully ready
      const timer = setTimeout(() => {
        scrollBottom("auto");
        isFirstLoad.current = false;
      }, 100);
      return () => clearTimeout(timer);
    } else if (!isFirstLoad.current) {
      // Smooth scroll for new messages
      scrollBottom("smooth");
    }
  }, [chatMessages, isLoadingChat]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  const order = dbOrder;

  if (!order) {
    return null;
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "confirmed":
        return <Package className="w-5 h-5 text-blue-500" />;
      case "shipped":
        return <Truck className="w-5 h-5 text-purple-500" />;
      case "delivered":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "received":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "returned":
        return <RotateCcw className="w-5 h-5 text-amber-500" />;
      case "cancelled":
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "confirmed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "shipped":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "delivered":
        return "bg-green-50 text-green-700 border-green-200";
      case "received":
        return "bg-green-50 text-green-700 border-green-200";
      case "returned":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const isReturned = order.status === "returned";
  const isCancelled = order.status === "cancelled";
  const isDeliveredOrBeyond = order.status === "delivered" || order.status === "received" || order.status === "reviewed" || isReturned;
  const isShippedOrBeyond = order.status === "shipped" || isDeliveredOrBeyond;

  const statusTimeline = [
    {
      status: "pending",
      label: "Order Placed",
      completed: true,
      date: order.createdAt,
    },
    {
      status: "confirmed",
      label: "Order Confirmed",
      completed:
        isShippedOrBeyond ||
        order.status === "confirmed" ||
        // Only mark confirmed as completed if order was actually confirmed BEFORE cancellation
        // For auto-cancelled orders (never confirmed), do not mark confirmed as done
        (!isCancelled && !!order.confirmedAt),
      date: order.confirmedAt || null,
    },
    {
      status: "shipped",
      label: "Shipped",
      completed: isShippedOrBeyond && !isCancelled,
      date: isShippedOrBeyond ? (order.shippedAt || null) : null,
    },
    {
      status: "delivered",
      label: "Delivered",
      completed: isDeliveredOrBeyond && !isCancelled,
      date: isDeliveredOrBeyond ? (order.deliveredAt || null) : null,
    },
    ...(order.status === "received" || order.status === "reviewed"
      ? [
        {
          status: "received",
          label: "Received",
          completed: true,
          date: order.receivedAt || order.updatedAt || null,
        },
      ]
      : []),
    ...(isReturned
      ? [
        {
          status: "returned",
          label: "Return/Refund Requested",
          completed: true,
          date: order.returnRequest?.submittedAt || null,
        },
      ]
      : []),
    ...(isCancelled
      ? [
        {
          status: "cancelled",
          label: "Order Cancelled",
          completed: true,
          date: order.cancelledAt || null,
        },
      ]
      : []),
  ];

  const showCancellationReason = isCancelled && order.cancellationReason;

  const subtotalAmount =
    order.pricing?.subtotal ??
    order.items.reduce((sum, item) => {
      const baseUnitPrice = Number(item.originalPrice ?? item.price);
      return sum + (baseUnitPrice * item.quantity);
    }, 0);
  const campaignDiscountAmount =
    order.pricing?.campaignDiscount ??
    order.items.reduce((sum, item) => {
      const baseUnitPrice = Number(item.originalPrice ?? item.price);
      const effectiveUnitPrice = Number(item.price || 0);
      return sum + Math.max(0, baseUnitPrice - effectiveUnitPrice) * item.quantity;
    }, 0);
  const voucherDiscountAmount = order.pricing?.voucherDiscount ?? 0;
  const taxAmount = Math.round(subtotalAmount * 0.12);
  const bazcoinDiscountAmount = order.pricing?.bazcoinDiscount ?? 0;
  const shippingAmount = order.pricing?.shipping ?? Number(dbOrder?.shipping_cost || 0);
  const totalAmount =
    order.pricing?.total ??
    Math.max(0, subtotalAmount + taxAmount + shippingAmount - campaignDiscountAmount - voucherDiscountAmount - bazcoinDiscountAmount);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !conversation || !profile?.id || isSendingMessage) return;

    const messageContent = chatMessage.trim();
    setChatMessage("");
    setIsSendingMessage(true);

    // Optimistically add the message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      sender: "buyer",
      message: messageContent,
      timestamp: new Date(),
      read: true,
    };
    setChatMessages(prev => [...prev, optimisticMessage]);

    try {
      // Send to database
      const sentMessage = await chatService.sendMessage(
        conversation.id,
        profile.id,
        'buyer',
        messageContent
      );

      if (sentMessage) {
        const serverMessage: ChatMessage = {
          id: sentMessage.id,
          sender: 'buyer',
          message: sentMessage.content,
          timestamp: new Date(sentMessage.created_at),
          read: true,
        };

        setChatMessages(prev => {
          // If subscription already added this message (with final ID)
          if (prev.some(m => m.id === sentMessage.id)) {
            // Just remove the temp message
            return prev.filter(m => m.id !== tempId);
          }
          // Otherwise replace temp with real message
          return prev.map(m => m.id === tempId ? serverMessage : m);
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setChatMessages(prev => prev.filter(m => m.id !== tempId));
      setChatMessage(messageContent); // Restore the message
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleShareOrder = () => {
    if (navigator.share) {
      navigator.share({
        title: order.orderNumber,
        text: `Check out my order from BazaarPH!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Order link copied to clipboard!");
    }
  };

  const handleDownloadReceipt = () => {
    if (!order || !dbOrder) return;

    // Format date in Philippine format
    const formatDatePH = (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    // Format currency in Philippine Peso (using PHP prefix for PDF compatibility)
    const formatPHP = (amount: number) => {
      const num = Number(amount) || 0;
      return 'PHP ' + num.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // Get payment method label
    const getPaymentLabel = (type: string) => {
      const labels: Record<string, string> = {
        cod: 'Cash on Delivery (COD)',
        gcash: 'GCash',
        maya: 'Maya',
        paymaya: 'Maya',
        card: 'Credit/Debit Card',
        grab_pay: 'GrabPay',
      };
      return labels[type] || type.toUpperCase();
    };

    // Calculate totals from normalized order pricing
    const calculatedSubtotal = subtotalAmount;
    const campaignDiscount = campaignDiscountAmount;
    const voucherDiscount = voucherDiscountAmount;
    const tax = taxAmount;
    const bazcoinDiscount = bazcoinDiscountAmount;
    const shippingCost = shippingAmount;
    const calculatedTotal = totalAmount;

    // Create PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    // Colors
    const primaryColor: [number, number, number] = [234, 88, 12]; // Orange
    const darkGray: [number, number, number] = [55, 65, 81];
    const lightGray: [number, number, number] = [156, 163, 175];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const black: [number, number, number] = [0, 0, 0];

    // Helper function to center text
    const centerText = (text: string, yPos: number, fontSize: number = 12) => {
      doc.setFontSize(fontSize);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, yPos);
    };

    // Helper function for right-aligned text
    const rightText = (text: string, yPos: number, rightMargin: number = 20) => {
      const textWidth = doc.getTextWidth(text);
      doc.text(text, pageWidth - rightMargin - textWidth, yPos);
    };

    // Helper function for horizontal line
    const drawLine = (yPos: number, color: [number, number, number] = [220, 220, 220]) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, pageWidth - 20, yPos);
    };

    // ========== HEADER WITH ORANGE ACCENT ==========
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 8, 'F');

    y = 25;

    // Company Logo/Name
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    centerText('BazaarX', y);
    y += 8;

    doc.setTextColor(...lightGray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    centerText('Your Trusted Online Marketplace', y);
    y += 5;
    centerText('Philippines', y);
    y += 12;

    // Receipt Title
    doc.setFillColor(249, 250, 251);
    doc.rect(20, y - 5, pageWidth - 40, 14, 'F');
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    centerText('OFFICIAL RECEIPT', y + 4);
    y += 18;

    // ========== ORDER INFO BOX ==========
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, y, pageWidth - 40, 28, 3, 3, 'S');

    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const orderInfoY = y + 8;
    doc.text('Receipt No:', 25, orderInfoY);
    doc.setFont('helvetica', 'bold');
    doc.text(order.id.substring(0, 12), 55, orderInfoY);

    doc.setFont('helvetica', 'normal');
    doc.text('Order No:', 25, orderInfoY + 7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(order.orderNumber || (dbOrder as { order_number?: string })?.order_number || 'N/A', 55, orderInfoY + 7);

    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'normal');
    doc.text('Date:', 25, orderInfoY + 14);
    doc.text(formatDatePH(order.date), 55, orderInfoY + 14);

    y += 35;

    // ========== SOLD TO / SOLD BY SECTION ==========
    const boxWidth = (pageWidth - 50) / 2;

    // Sold To Box
    doc.setFillColor(249, 250, 251);
    doc.rect(20, y, boxWidth, 42, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SOLD TO', 25, y + 8);

    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(order.shippingAddress.fullName, 25, y + 16);
    doc.text(order.shippingAddress.street, 25, y + 22);
    doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.province}`, 25, y + 28);
    doc.text(order.shippingAddress.postalCode, 25, y + 34);
    doc.text(order.shippingAddress.phone, 25, y + 40);

    // Sold By Box
    doc.setFillColor(254, 243, 237);
    doc.rect(25 + boxWidth, y, boxWidth, 42, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SOLD BY', 30 + boxWidth, y + 8);

    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(storeName, 30 + boxWidth, y + 16);
    doc.text('BazaarX Verified Seller', 30 + boxWidth, y + 24);

    y += 50;

    // ========== ORDER ITEMS TABLE ==========
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ORDER DETAILS', 20, y);
    y += 8;

    // Table Header
    doc.setFillColor(...primaryColor);
    doc.rect(20, y - 4, pageWidth - 40, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM DESCRIPTION', 25, y + 2);
    doc.text('QTY', 120, y + 2);
    doc.text('PRICE', 140, y + 2);
    doc.text('AMOUNT', 170, y + 2);
    y += 10;

    // Table Items
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'normal');
    order.items.forEach((item, index) => {
      // Calculate row height based on whether there's variant info
      const hasVariant = item.variant && (item.variant.size || item.variant.color);
      const rowHeight = hasVariant ? 16 : 10;

      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(20, y - 4, pageWidth - 40, rowHeight, 'F');
      }

      // Item name
      const itemName = item.name.length > 35 ? item.name.substring(0, 32) + '...' : item.name;
      doc.setFont('helvetica', 'normal');
      doc.text(itemName, 25, y + 2);

      // Variant info (size, color) on second line
      if (hasVariant) {
        doc.setFontSize(7);
        doc.setTextColor(...lightGray);
        const variantParts: string[] = [];
        if (item.variant?.size) variantParts.push(`Size: ${item.variant.size}`);
        if (item.variant?.color) variantParts.push(`Color: ${item.variant.color}`);
        doc.text(variantParts.join(' | '), 25, y + 8);
        doc.setFontSize(9);
        doc.setTextColor(...darkGray);
      }

      doc.text(item.quantity.toString(), 125, y + 2);
      doc.text(formatPHP(item.price), 140, y + 2);
      doc.text(formatPHP(item.quantity * item.price), 170, y + 2);
      y += rowHeight;
    });

    y += 5;
    drawLine(y);
    y += 10;

    // ========== TOTALS SECTION ==========
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);

    doc.text('Subtotal:', 130, y);
    rightText(formatPHP(calculatedSubtotal), y);
    y += 7;

    if (campaignDiscount > 0) {
      doc.text('Campaign Discount:', 130, y);
      rightText(`- ${formatPHP(campaignDiscount)}`, y);
      y += 7;
    }

    if (voucherDiscount > 0) {
      doc.text('Voucher Discount:', 130, y);
      rightText(`- ${formatPHP(voucherDiscount)}`, y);
      y += 7;
    }

    if (bazcoinDiscount > 0) {
      doc.text('BazCoins Applied:', 130, y);
      rightText(`- ${formatPHP(bazcoinDiscount)}`, y);
      y += 7;
    }

    if (tax > 0) {
      doc.text('Tax (12% VAT):', 130, y);
      rightText(formatPHP(tax), y);
      y += 7;
    }

    doc.text('Shipping:', 130, y);
    rightText(shippingCost === 0 ? 'FREE' : formatPHP(shippingCost), y);
    y += 10;

    // Total with background
    doc.setFillColor(...primaryColor);
    doc.rect(120, y - 5, pageWidth - 140, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL:', 125, y + 3);
    const totalText = formatPHP(calculatedTotal);
    const totalWidth = doc.getTextWidth(totalText);
    doc.text(totalText, pageWidth - 25 - totalWidth, y + 3);
    y += 18;

    // ========== PAYMENT & STATUS ==========
    doc.setTextColor(...darkGray);
    doc.setFontSize(10);

    // Payment Box
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(20, y, (pageWidth - 50) / 2, 25, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT METHOD', 25, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(getPaymentLabel(order.paymentMethod.type), 25, y + 16);

    // Status Box
    const statusX = 25 + (pageWidth - 50) / 2;
    doc.setTextColor(...darkGray);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(statusX, y, (pageWidth - 50) / 2, 25, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ORDER STATUS', statusX + 5, y + 8);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(order.status.toUpperCase().replace('_', ' '), statusX + 5, y + 18);

    y += 32;

    // Tracking Number if exists
    if (order.trackingNumber) {
      doc.setTextColor(...darkGray);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Tracking Number: ' + order.trackingNumber, 20, y);
      y += 10;
    }

    // ========== FOOTER ==========
    y = pageHeight - 35;
    drawLine(y, primaryColor);
    y += 8;

    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    centerText('Thank you for shopping with BazaarX!', y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    centerText('This document serves as your official receipt.', y);
    y += 5;
    doc.setTextColor(...lightGray);
    centerText('For concerns, contact: support@bazaarx.ph | www.bazaarx.ph', y);

    // Bottom accent bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');

    // Save PDF
    doc.save(`BazaarX_Receipt_${order.orderNumber || (dbOrder as { order_number?: string })?.order_number || order.id}.pdf`);
  };



  return (
    <div className="min-h-screen bg-[var(--brand-wash)]">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-4 group"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            <span className="text-sm font-medium">Go Back</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-3xl font-bold text-gray-900">
                {order.orderNumber}
              </h1>
              <p className="text-gray-500 text-sm">
                {formatDate(order.createdAt)}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareOrder}
                className="flex items-center gap-2 hover:bg-[var(--brand-primary)] hover:text-white hover:border-[var(--brand-primary)] transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadReceipt}
                className="flex items-center gap-2 hover:bg-[var(--brand-primary)] hover:text-white hover:border-[var(--brand-primary)] transition-colors"
              >
                <Download className="w-4 h-4" />
                Receipt
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                  {/* Left Column: Delivery Information */}
                  <div className="lg:pr-10 pb-8 lg:pb-0">
                    <div className="flex items-center gap-3 text-gray-900 font-bold mb-6">
                      <span>Delivery Information</span>
                    </div>

                    <div className="bg-[var(--brand-wash)]/30">
                      <div className="space-y-4">
                        {/* Name */}
                        <div>
                          <p className="font-medium text-gray-700 text-sm">
                            {order.shippingAddress.fullName}
                          </p>
                        </div>

                        {/* Contact/Phone Number */}
                        <div className="flex items-center gap-2.5 text-gray-600">
                          <p className="text-xs text-gray-700">{order.shippingAddress.phone}</p>
                        </div>

                        {/* Full Address */}
                        <div>
                          <div className="flex items-start gap-2.5">
                            <div className="text-gray-700 text-xs">
                              <p>{order.shippingAddress.street}</p>
                              <p>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {order.status === "shipped" && (
                      <div className="mt-8 py-4 px-6 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-700 text-sm">
                              Package En Route
                            </h4>
                            <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                              Estimated Arrival: <span className="font-bold text-gray-700">{formatDate(order.estimatedDelivery)}</span>
                            </p>
                            <Button
                              onClick={() =>
                                navigate(`/delivery-tracking/${order.orderNumber}`)
                              }
                              className="mt-4 bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white w-full rounded-lg"
                              size="sm"
                            >
                              Track in Real-time
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Order Status Timeline */}
                  <div className="lg:col-span-2 lg:pl-10 space-y-2 mt-8 lg:mt-0">
                    <div className="relative pt-4">
                      {statusTimeline.map((item, index) => (
                        <div key={item.status} className="flex items-stretch gap-6 group">
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500",
                                item.status === "cancelled" && item.completed
                                  ? "bg-red-500 border-red-500 text-white scale-100"
                                  : item.status === "returned" && item.completed
                                    ? "bg-amber-500 border-amber-500 text-white scale-100"
                                    : item.completed
                                      ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white scale-100"
                                      : "bg-white border-gray-200 text-gray-300 scale-90",
                              )}
                            >
                              {item.status === "cancelled" && item.completed ? (
                                <X className="w-3.5 h-3.5" />
                              ) : item.status === "returned" && item.completed ? (
                                <RotateCcw className="w-3.5 h-3.5" />
                              ) : item.completed ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </div>
                            {index < statusTimeline.length - 1 && (
                              <div
                                className={cn(
                                  "w-0.5 flex-1 my-1 transition-colors duration-500",
                                  item.completed && statusTimeline[index + 1]?.status === "cancelled"
                                    ? "bg-red-400"
                                    : item.completed && statusTimeline[index + 1]?.status === "returned"
                                      ? "bg-amber-400"
                                      : item.completed ? "bg-[var(--brand-primary)]" : "bg-gray-100",
                                )}
                              />
                            )}
                          </div>
                          <div className="flex-1 pb-10">
                            <h4
                              className={cn(
                                "font-bold text-base transition-colors duration-300",
                                item.completed ? "text-gray-900" : "text-gray-400 font-medium",
                              )}
                            >
                              {item.label}
                            </h4>
                            {item.completed && item.date && (
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                {formatDate(item.date)}
                              </p>
                            )}
                            {item.status === 'cancelled' && showCancellationReason && (
                              <p className="text-xs text-red-600 mt-1 font-medium">
                                {order.cancellationReason}
                              </p>
                            )}
                            {item.status === 'shipped' && order.trackingNumber && (
                              <div className="mt-2 flex items-center gap-2 text-[10px] sm:text-xs">
                                <span className="font-mono font-semibold text-[var(--text-muted)]">Tracking Number:</span>
                                <span className="font-mono font-semibold text-[var(--text-muted)]">{order.trackingNumber}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(order.trackingNumber!);
                                    toast({
                                      title: "Copied",
                                      description: "Tracking number copied to clipboard",
                                    });
                                  }}
                                  className="text-xs text-[var(--brand-primary)] hover:underline ml-1"
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                            {item.status === 'received' && item.completed && receiptPhotos.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPhoto(receiptPhotos[0]);
                                }}
                                className="mt-2 text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1"
                              >
                                <Camera className="w-3 h-3" />
                                View proof of received order
                              </button>
                            )}
                            {!item.completed && !isCancelled && (
                              <p className="text-xs text-gray-300 mt-1">Pending update...</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order-based Chat */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between -mb-4">
                  <div className="flex items-center gap-2">
                    Chat with Seller
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-muted)]">{storeName}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Chat Messages */}
                <div ref={chatContainerRef} className="mb-4 h-80 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg scrollbar-hide">
                  {isLoadingChat ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)] mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Loading messages...</p>
                      </div>
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No messages yet</p>
                        <p className="text-xs text-gray-400">Start a conversation with {storeName}</p>
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      // Dynamically identify if a message is an automated status update
                      const isAutomated = msg.sender === "system" || (msg.sender === "seller" && (
                        Object.values(ORDER_STATUS_MESSAGES).some(m =>
                          (m.sellerMessage && msg.message.startsWith(m.sellerMessage)) ||
                          (m.systemMessage && msg.message.startsWith(m.systemMessage))
                        ) ||
                        msg.message.includes("📦 Tracking Number:") ||
                        msg.message.includes("📋 System:")
                      ));

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            msg.sender === "buyer"
                              ? "justify-end"
                              : "justify-start",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg px-4 py-2 transition-all duration-300",
                              msg.sender === "buyer"
                                ? "bg-[var(--brand-primary)] text-white"
                                : isAutomated
                                  ? "bg-white border border-gray-100 text-[var(--brand-accent)]"
                                  : msg.sender === "seller"
                                    ? "bg-white border border-gray-100 text-gray-900"
                                    : "bg-white border border-gray-100 text-[var(--brand-primary-dark)] text-sm",
                            )}
                          >
                            <p className="text-sm">{msg.message}</p>
                            <p
                              className={cn(
                                "text-xs mt-1",
                                msg.sender === "buyer"
                                  ? "text-white/70"
                                  : isAutomated
                                    ? "text-[var(--text-muted)]"
                                    : "text-[var(--text-muted)]",
                              )}
                            >
                              {formatTime(msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !isSendingMessage && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 bg-white focus:ring-0 focus:border-[var(--brand-primary)]"
                    disabled={!conversation || isSendingMessage}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || !conversation || isSendingMessage}
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white"
                  >
                    {isSendingMessage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Details */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items List */}
                <div className="space-y-3 mb-6">
                  {order.items.map((item) => {
                    const itemReview = (order as any).reviews?.find((r: any) => r.productId === ((item as any).productId || item.id)) ||
                      (!(order as any).reviews?.some((r: any) => r.productId) ? order.review : null);

                    return (
                      <div key={item.id} className="flex flex-col mb-4 last:mb-0">
                        <div
                          className="flex items-start gap-3 cursor-pointer hover:bg-gray-50/50 p-1.5 -m-1.5 rounded-xl transition-colors group/item"
                          onClick={() => navigate(`/product/${item.id}`)}
                        >
                          <div className="relative group flex-shrink-0">
                            <div className="w-16 h-16 overflow-hidden border border-gray-100 bg-gray-50">
                              <img loading="lazy"
                                src={item.image}
                                alt={item.name}
                                className="w-16 h-16 object-cover transition-transform group-hover/item:scale-110"
                              />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 py-0.5">
                            <h4 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover/item:text-[var(--brand-primary)] transition-colors">
                              {item.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                              {item.variant?.size && (
                                <span className="text-xs text-[var(--text-muted)]">
                                  {item.variant.size}
                                </span>
                              )}
                              {item.variant?.size && item.variant?.color && (
                                <span className="text-[10px] text-gray-300">|</span>
                              )}
                              {item.variant?.color && (
                                <span className="text-xs text-[var(--text-muted)]">
                                  {item.variant.color}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-[var(--text-muted)]">
                                ₱{item.price.toLocaleString()} <span className="ml-1">x{item.quantity}</span>
                              </p>
                              <p className="text-sm font-bold text-gray-900">
                                ₱{(item.price * item.quantity).toLocaleString()}
                              </p>
                            </div>

                            {(order.status === "delivered" || order.status === "received" || order.status === "reviewed") && !itemReview && (
                              <div className="mt-1 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowReviewModal(true);
                                  }}
                                  className="text-xs font-medium text-[var(--brand-primary)] hover:underline"
                                >
                                  Rate & Review
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>



                <div className="pt-4 border-t border-dashed border-[var(--btn-border)] space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      {"\u20B1"}{subtotalAmount.toLocaleString()}
                    </span>
                  </div>
                  {campaignDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Campaign Discount</span>
                      <span className="font-medium text-green-600">
                        -{"\u20B1"}{campaignDiscountAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {voucherDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Voucher Discount</span>
                      <span className="font-medium text-green-600">
                        -{"\u20B1"}{voucherDiscountAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {bazcoinDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">BazCoins Applied</span>
                      <span className="font-medium text-green-600">
                        -{"\u20B1"}{bazcoinDiscountAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax (12% VAT)</span>
                      <span className="font-medium">{"\u20B1"}{taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    {shippingAmount === 0 ? (
                      <span className="font-medium text-green-600">Free</span>
                    ) : (
                      <span className="font-medium">{"\u20B1"}{shippingAmount.toLocaleString()}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Order Total</span>
                      <span className="font-bold text-lg text-[var(--brand-accent)]">
                        {"\u20B1"}{totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="pt-3 mt-4 border-t border-dashed border-[var(--btn-border)]">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[var(--brand-accent)]" />
                      <span className="text-sm font-semibold text-gray-900">Payment</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-sm text-[var(--text-muted)]">
                        {order.paymentMethod.type === 'cod' ? 'Cash on Delivery (COD)' :
                          order.paymentMethod.type === 'gcash' ? 'GCash' :
                            order.paymentMethod.type === 'maya' ? 'Maya' :
                              order.paymentMethod.type === 'paymaya' ? 'Maya' :
                                order.paymentMethod.type === 'card' ? 'PayMongo' :
                                  order.paymentMethod.type === 'grab_pay' ? 'GrabPay' :
                                    String(order.paymentMethod.type).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* COD Payment Instruction Section */}
                  {order.paymentMethod.type === 'cod' && order.status !== 'delivered' && (() => {
                    const estimatedDelivery = order.estimatedDelivery;
                    const formattedDeadline = estimatedDelivery
                      ? new Date(estimatedDelivery).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
                      : null;
                    
                    return (
                      <div className="mt-4 pt-4 border-t border-dashed border-[var(--btn-border)]">
                        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg gap-3 flex flex-col">
                          <h4 className="font-bold text-orange-900 text-sm">💳 Payment on Delivery</h4>
                          <p className="text-sm text-orange-800">
                            You'll pay the full amount to the delivery driver when they arrive. Please have the exact amount ready.
                          </p>
                          {formattedDeadline && (
                            <p className="text-sm font-semibold text-orange-900">
                              Estimated Payment Due: {formattedDeadline}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Action Buttons */}
                  {order.status === 'received' ? (() => {
                    // Return/Refund is only available within 7 days of delivery
                    const deliveryDate = order.deliveredAt || order.receivedAt || order.updatedAt;
                    const isWithin7DaysOfDelivery = deliveryDate
                      ? (Date.now() - new Date(deliveryDate).getTime()) < 7 * 24 * 60 * 60 * 1000
                      : false;

                    const buyAgainHandler = async () => {
                      if (!order.items || order.items.length === 0) return;
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
                    };

                    if (isWithin7DaysOfDelivery) {
                      // Within 7 days: Buy Again on top, Write Review + Return/Refund side by side below
                      return (
                        <div className="flex flex-col gap-2 pt-4 mt-2">
                          <Button
                            onClick={buyAgainHandler}
                            className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white"
                          >
                            Buy Again
                          </Button>
                          <div className="flex flex-row gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setShowReviewModal(true)}
                              className="flex-1 border-[var(--brand-accent)] text-[var(--brand-accent)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-accent)] px-2"
                            >
                              Write Review
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/order/${encodeURIComponent(orderId!)}/return`)}
                              className="flex-1 bg-[#FFFBEB] border-[#F59E0B] text-[#B45309] hover:text-[var(--brand-accent)] hover:bg-[var(--brand-wash)] hover:border-[var(--brand-accent)] text-sm font-medium px-2"
                            >
                              <RotateCcw className="w-4 h-4 mr-1.5" />
                              Return / Refund
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    // Past 7 days: Write Review (left) + Buy Again (right), side by side
                    return (
                      <div className="flex flex-row gap-2 pt-4 mt-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowReviewModal(true)}
                          className="flex-1 border-[var(--brand-accent)] text-[var(--brand-accent)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-accent)]"
                        >
                          Write Review
                        </Button>
                        <Button
                          onClick={buyAgainHandler}
                          className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white"
                        >
                          Buy Again
                        </Button>
                      </div>
                    );
                  })() : (
                    <div className="flex flex-row gap-2 pt-4 mt-2">
                      {/* Confirm Received  */}
                      {order.status === 'delivered' && (
                        <Button
                          onClick={() => setConfirmReceivedModalOpen(true)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          Confirm Received
                        </Button>
                      )}

                      {/* Buy Again - shown for delivered/reviewed orders */}
                      {(order.status === 'delivered' || order.status === 'reviewed') && (
                        <Button
                          onClick={async () => {
                            if (!order.items || order.items.length === 0) return;

                            // Add each item to cart (preserving variant where possible)
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

                            // Navigate to enhanced cart so user can adjust variants/sizes/colors
                            navigate('/enhanced-cart', { state: { selectedItems: addedIds } });
                          }}
                          className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white"
                        >
                          Buy Again
                        </Button>
                      )}

                      {/* Cancel Order - shown for pending unpaid orders */}
                      {order.status === 'pending' && !order.isPaid && (
                        <Button
                          variant="outline"
                          onClick={() => setCancelModalOpen(true)}
                          className="flex-1 border-red-600 text-red-600 hover:bg-red-50 hover:text-red-600"
                        >
                          Cancel Order
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Review Modal */}
      {
        showReviewModal && order && (
          <ReviewModal
            isOpen={showReviewModal}
            onClose={async () => {
              setShowReviewModal(false);
              // Refresh order data in background to show new individual reviews under items
              if (orderId) {
                const detail = await orderReadService.getOrderDetail({
                  orderIdOrNumber: orderId,
                  buyerId: profile?.id,
                });

                if (detail) {
                  const refreshedOrder: Order & DbOrderData = {
                    ...(detail.order as unknown as Order),
                    buyer_id: detail.buyer_id,
                    is_reviewed: detail.is_reviewed || false,
                    shipping_cost: detail.shipping_cost || 0,
                    cancellationReason: detail.order.cancellationReason,
                  };
                  setDbOrder(refreshedOrder);
                }
              }
            }}
            onSubmitted={() => {
              toast({
                title: "Review Submitted",
                description: "Thank you for your feedback!",
                duration: 5000,
              });
            }}
            orderId={order.dbId || order.id}
            displayOrderId={order.orderNumber || order.id}
            sellerName={storeName}
            items={order.items.filter((item: any) => {
              const itemReview = (order as any).reviews?.find((r: any) => r.productId === ((item as any).productId || item.id)) ||
                (!(order as any).reviews?.some((r: any) => r.productId) ? (order as any).review : null);
              return !itemReview;
            }).map((item: any) => ({
              id: item.productId || item.id,
              name: item.name,
              image: item.image,
              variant: item.variant,
            }))}
            sellerId={sellerId || ""}
          />
        )
      }

      {/* Cancel Order Modal */}
      <AnimatePresence>
        {cancelModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4"
            onClick={() => { setCancelModalOpen(false); setCancelReason(""); setOtherReason(""); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-1">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Cancel Order</h3>
                <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-3 flex gap-3 items-start -mb-4">
                  <p className="text-[var(--brand-primary)] text-xs leading-relaxed">
                    Please select a reason. This will cancel all items in the order and cannot be undone.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-1 mb-4">
                  {CANCEL_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border border-transparent",
                        cancelReason === reason ? "bg-[var(--brand-wash)]" : "bg-base"
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
                          cancelReason === reason ? "border-[var(--brand-primary)]" : "border-gray-300"
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
                {cancelReason === "Other" && (
                  <textarea
                    placeholder="Please specify your reason..."
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    className="w-full p-2.5 border-2 border-gray-100 rounded-xl text-sm mb-3 focus:border focus:border-[var(--brand-primary)] focus:ring-0 focus:outline-none transition-all"
                    rows={2}
                  />
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={() => { setCancelModalOpen(false); setCancelReason(""); setOtherReason(""); }}
                    variant="outline"
                    className="flex-1 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-600 rounded-xl h-11"
                  >
                    Keep Order
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!order.dbId || !cancelReason) return;
                      const reason = cancelReason === "Other" ? otherReason : cancelReason;
                      setIsCancelling(true);
                      try {
                        const success = await orderMutationService.cancelOrder({
                          orderId: order.dbId,
                          reason,
                          cancelledBy: profile?.id,
                          changedByRole: profile?.id ? "buyer" : null,
                        });
                        if (!success) throw new Error("Failed to cancel order");
                        toast({ title: "Order Cancelled", description: "Your order has been cancelled successfully.", duration: 3000 });
                        // Refresh the page data
                        if (orderId) {
                          const detail = await orderReadService.getOrderDetail({ orderIdOrNumber: orderId, buyerId: profile?.id });
                          if (detail) {
                            const refreshedOrder: Order & DbOrderData = {
                              ...(detail.order as unknown as Order),
                              buyer_id: detail.buyer_id,
                              is_reviewed: detail.is_reviewed || false,
                              shipping_cost: detail.shipping_cost || 0,
                              cancellationReason: detail.order.cancellationReason,
                            };
                            setDbOrder(refreshedOrder);
                          }
                        }
                      } catch (e) {
                        console.error("Error canceling order:", e);
                        toast({ title: "Error", description: "Failed to cancel order. Please try again.", variant: "destructive" });
                      } finally {
                        setIsCancelling(false);
                        setCancelModalOpen(false);
                        setCancelReason("");
                        setOtherReason("");
                      }
                    }}
                    disabled={!cancelReason || (cancelReason === "Other" && !otherReason.trim()) || isCancelling}
                    className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white disabled:opacity-50 h-11 rounded-xl font-bold"
                  >
                    {isCancelling ? "Cancelling..." : "Confirm"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Received Modal */}
      {dbOrder && profile?.id && (
        <ConfirmReceivedModal
          isOpen={confirmReceivedModalOpen}
          onClose={() => setConfirmReceivedModalOpen(false)}
          order={{
            dbId: dbOrder.dbId || dbOrder.id,
            id: dbOrder.id,
            orderNumber: dbOrder.orderNumber
          }}
          buyerId={profile.id}
          onSuccess={() => window.location.reload()}
        />
      )}

      {/* Photo lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-8 right-8 text-white/80 p-2 hover:text-white transition-colors"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img loading="lazy"
            src={selectedPhoto}
            alt="Receipt photo"
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <BazaarFooter />
    </div>
  );
}
