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
  Star,
  Download,
  Share2,
  AlertCircle,
  Store,
  X,
} from "lucide-react";
import { useCartStore, Order } from "../stores/cartStore";
import { useBuyerStore } from "../stores/buyerStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
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
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const { profile } = useBuyerStore();

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

  // Load chat messages when seller and profile are ready
  useEffect(() => {
    const loadChat = async () => {
      if (!sellerId || !profile?.id) {
        setIsLoadingChat(false);
        return;
      }

      setIsLoadingChat(true);
      try {
        // Get or create conversation
        const conv = await chatService.getOrCreateConversation(profile.id, sellerId);

        if (conv) {
          setConversation(conv);

          // Load messages
          const messages = await chatService.getMessages(conv.id);

          // Convert to local format
          const formattedMessages: ChatMessage[] = messages.map((msg: Message) => ({
            id: msg.id,
            sender: msg.sender_type as 'buyer' | 'seller',
            message: msg.content,
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

          // Mark messages as read
          await chatService.markConversationAsRead(conv.id, 'buyer');
        }
      } catch (error) {
        console.error('Error loading chat:', error);
      } finally {
        setIsLoadingChat(false);
      }
    };

    loadChat();
  }, [sellerId, profile?.id]);

  // Subscribe to real-time chat updates
  useEffect(() => {
    if (!conversation?.id) return;

    const subscription = chatService.subscribeToConversation(
      conversation.id,
      (newMessage: Message) => {
        const formattedMessage: ChatMessage = {
          id: newMessage.id,
          sender: newMessage.sender_type as 'buyer' | 'seller',
          message: newMessage.content,
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
    if (chatContainerRef.current) {
      const isInitial = isFirstLoad.current && chatMessages.length > 0;

      if (isInitial) {
        // Instant scroll for first load
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        isFirstLoad.current = false;
      } else if (!isFirstLoad.current) {
        // Smooth scroll for subsequent messages
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      }
    }
  }, [chatMessages]);

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
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

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
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const statusTimeline = [
    {
      status: "pending",
      label: "Order Placed",
      completed: true,
      date: order.createdAt,
    },
    {
      status: "confirmed",
      label: "Confirmed",
      completed: order.status !== "pending",
      date: order.createdAt,
    },
    {
      status: "shipped",
      label: "Shipped",
      completed:
        order.status === "shipped" ||
        order.status === "delivered" ||
        order.status === "reviewed",
      date:
        order.status === "shipped" ||
          order.status === "delivered" ||
          order.status === "reviewed"
          ? order.createdAt
          : null,
    },
    {
      status: "delivered",
      label: "Delivered",
      completed: order.status === "delivered" || order.status === "reviewed",
      date:
        order.status === "delivered" || order.status === "reviewed"
          ? order.estimatedDelivery
          : null,
    },
  ];

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
  const taxAmount = order.pricing?.tax ?? 0;
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
        paymaya: 'PayMaya',
        card: 'Credit/Debit Card'
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
    doc.text(order.orderNumber || (dbOrder as any)?.order_number || 'N/A', 55, orderInfoY + 7);

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
    doc.setTextColor(order.isPaid ? 22 : 220, order.isPaid ? 163 : 38, order.isPaid ? 74 : 38);
    doc.text(order.isPaid ? 'PAID' : 'Pending Payment', 25, y + 22);

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
    doc.save(`BazaarX_Receipt_${order.orderNumber || (dbOrder as any)?.order_number || order.id}.pdf`);
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
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {order.orderNumber}
              </h1>
              <p className="text-gray-600 mt-1">
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
                      <span className="text-lg">Delivery Information</span>
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
                          <p className="text-xs text-[var(--text-muted)]">{order.shippingAddress.phone}</p>
                        </div>

                        {/* Full Address */}
                        <div>
                          <div className="flex items-start gap-2.5">
                            <div className="text-[var(--text-muted)] text-xs">
                              <p>{order.shippingAddress.street}</p>
                              <p>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {order.status === "shipped" && (
                      <div className="mt-8 p-5 bg-gradient-to-br from-blue-50 to-[var(--brand-wash)] rounded-2xl">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                            <Truck className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-blue-900 text-sm">
                              Package En Route
                            </h4>
                            <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
                              Estimated Arrival: <span className="font-bold text-blue-900">{formatDate(order.estimatedDelivery)}</span>
                            </p>
                            <Button
                              onClick={() =>
                                navigate(`/delivery-tracking/${order.orderNumber}`)
                              }
                              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white w-full rounded-xl shadow-md shadow-blue-200"
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
                        <div key={item.status} className="flex items-start gap-6 group">
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500",
                                item.completed
                                  ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-100 scale-100"
                                  : "bg-white border-gray-200 text-gray-300 scale-90",
                              )}
                            >
                              {item.completed ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </div>
                            {index < statusTimeline.length - 1 && (
                              <div
                                className={cn(
                                  "w-0.5 h-14 my-1 transition-colors duration-500",
                                  item.completed ? "bg-green-500" : "bg-gray-100",
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
                            {!item.completed && (
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
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    Chat with Seller
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">{storeName}</span>
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
                    chatMessages.map((msg) => (
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
                            "max-w-[70%] rounded-lg px-4 py-2",
                            msg.sender === "buyer"
                              ? "bg-[var(--brand-primary)] text-white"
                              : msg.sender === "seller"
                                ? "bg-white border border-gray-200 text-gray-900"
                                : "bg-blue-50 border border-blue-200 text-blue-900 text-sm",
                          )}
                        >
                          {msg.sender === "seller" && (
                            <div className="flex items-center gap-2 mb-1">
                              <Store className="w-3 h-3" />
                              <span className="text-xs font-semibold">
                                {storeName}
                              </span>
                            </div>
                          )}
                          {msg.sender === "system" && (
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle className="w-3 h-3" />
                              <span className="text-xs font-semibold">
                                System
                              </span>
                            </div>
                          )}
                          <p className="text-sm">{msg.message}</p>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              msg.sender === "buyer"
                                ? "text-white/70"
                                : "text-gray-500",
                            )}
                          >
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
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
                    className="flex-1 focus-visible:ring-1 focus-visible:ring-[var(--brand-primary)]"
                    disabled={!conversation || isSendingMessage}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || !conversation || isSendingMessage}
                    className="bg-[var(--brand-primary)] hover:opacity-90 text-white"
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
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 cursor-pointer hover:bg-gray-50/50 p-1.5 -m-1.5 rounded-xl transition-colors group/item"
                      onClick={() => navigate(`/product/${item.id}`)}
                    >
                      <div className="relative group flex-shrink-0">
                        <div className="w-16 h-16 overflow-hidden border border-gray-100 bg-gray-50">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 object-cover transition-transform group-hover/item:scale-110"
                          />
                        </div>
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-[var(--brand-accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10">
                          {item.quantity}
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
                            ₱{item.price.toLocaleString()}
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            ₱{(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>

                        {(order.status === "delivered" || order.status === "reviewed") && (
                          <div className="mt-2 text-right">
                            {!dbOrder?.is_reviewed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowReviewModal(true);
                                }}
                                className="text-[10px] font-bold text-[var(--brand-primary)] flex items-center gap-1 ml-auto hover:underline"
                              >
                                Rate & Review
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
                            order.paymentMethod.type === 'paymaya' ? 'PayMaya' :
                              order.paymentMethod.type === 'card' ? 'Credit/Debit Card' :
                                String(order.paymentMethod.type).toUpperCase()}
                      </p>
                    </div>
                  </div>
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
            onClose={() => setShowReviewModal(false)}
            onSubmitted={async () => {
              toast({
                title: "Review Submitted",
                description: "Thank you for your feedback!",
                duration: 5000,
              });

              // Refresh order data to show is_reviewed status
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
                  };
                  setDbOrder(refreshedOrder);
                }
              }
              setShowReviewModal(false);
            }}
            orderId={order.dbId || order.id}
            displayOrderId={order.orderNumber || order.id}
            sellerName={storeName}
            items={order.items.map((item: any) => ({
              id: item.id,
              name: item.name,
              image: item.image,
              variant: item.variant,
            }))}
            sellerId={sellerId || ""}
          />
        )
      }

      <BazaarFooter />
    </div >
  );
}