import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from 'jspdf';
import {
  ChevronLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  CreditCard,
  MessageCircle,
  Send,
  Star,
  Download,
  Share2,
  AlertCircle,
  Store,
  Receipt,
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
import { supabase } from "@/lib/supabase";
import { orderService } from "../services/orderService";
import { chatService, Message, Conversation } from "../services/chatService";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { cn } from "@/lib/utils";

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
  const chatEndRef = useRef<HTMLDivElement>(null);
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
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Load order and seller info
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      setIsLoading(true);
      try {
        // Try fetching by ID first, then by order_number
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            orderId,
          );

        let query = supabase.from("orders").select(`
            *,
            order_items (*),
            seller:sellers!orders_seller_id_fkey(id, store_name)
          `);

        if (isUuid) {
          query = query.eq("id", orderId);
        } else {
          query = query.eq("order_number", orderId);
        }

        const { data: orderData, error } = await query.single();

        if (error) throw error;

        if (orderData) {
          // Extract seller info
          const sellerInfo = (orderData as any).seller;
          if (sellerInfo) {
            setSellerId(sellerInfo.id);
            setStoreName(sellerInfo.store_name || "Seller");
          } else if (orderData.seller_id) {
            setSellerId(orderData.seller_id);
            // Fetch store name separately
            const { data: sellerData } = await supabase
              .from('sellers')
              .select('store_name')
              .eq('id', orderData.seller_id)
              .single();
            if (sellerData) {
              setStoreName(sellerData.store_name || "Seller");
            }
          }

          const statusMap = {
            pending_payment: "pending",
            paid: "confirmed",
            processing: "confirmed",
            shipped: "shipped",
            delivered: "delivered",
            cancelled: "cancelled",
          };

          const mappedOrder: Order = {
            id: orderData.id,
            orderNumber: orderData.order_number,
            total: orderData.total_amount,
            status: (statusMap[orderData.status as keyof typeof statusMap] ||
              "pending") as Order["status"],
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
            items: (orderData.order_items || []).map((item: any) => ({
              id: item.id,
              name: item.product_name,
              price: item.price,
              quantity: item.quantity,
              image:
                item.product_images?.[0] ||
                "https://placehold.co/100?text=Product",
              seller: item.seller_name || "Bazaar Merchant",
              variant: item.selected_variant ? {
                id: (item.selected_variant as any)?.id,
                name: (item.selected_variant as any)?.name,
                size: (item.selected_variant as any)?.size,
                color: (item.selected_variant as any)?.color,
                sku: (item.selected_variant as any)?.sku,
              } : undefined,
            })),
            shippingAddress: {
              fullName:
                (orderData.shipping_address as any)?.fullName ||
                orderData.buyer_name,
              street: (orderData.shipping_address as any)?.street || "",
              city: (orderData.shipping_address as any)?.city || "",
              province: (orderData.shipping_address as any)?.province || "",
              postalCode: (orderData.shipping_address as any)?.postalCode || "",
              phone:
                (orderData.shipping_address as any)?.phone ||
                orderData.buyer_phone ||
                "",
            },
            paymentMethod: {
              type: typeof orderData.payment_method === 'string' 
                ? orderData.payment_method 
                : (orderData.payment_method as any)?.type || "cod",
              details: undefined, // No extra details needed
            },
            trackingNumber: orderData.tracking_number || undefined,
          } as Order;

          // Add DB-specific fields
          const extendedOrder: Order & DbOrderData = {
            ...mappedOrder,
            buyer_id: orderData.buyer_id,
            is_reviewed: orderData.is_reviewed || false,
            shipping_cost: orderData.shipping_cost || 0,
          };

          setDbOrder(extendedOrder);
        }
      } catch (err) {
        console.error("Error fetching order details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

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
          // Avoid duplicates
          if (prev.some(m => m.id === newMessage.id)) return prev;
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
    // Auto scroll to bottom when new messages arrive
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      completed: order.status === "shipped" || order.status === "delivered",
      date:
        order.status === "shipped" || order.status === "delivered"
          ? order.createdAt
          : null,
    },
    {
      status: "delivered",
      label: "Delivered",
      completed: order.status === "delivered",
      date: order.status === "delivered" ? order.estimatedDelivery : null,
    },
  ];

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
        // Replace temp message with real one
        setChatMessages(prev => 
          prev.map(m => m.id === tempId ? {
            id: sentMessage.id,
            sender: 'buyer',
            message: sentMessage.content,
            timestamp: new Date(sentMessage.created_at),
            read: true,
          } : m)
        );
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

    // Calculate totals from items
    const calculatedSubtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = Number(dbOrder?.shipping_cost) || 0;
    const calculatedTotal = Number(order.total) || calculatedSubtotal + shippingCost;

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

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      alert("Please select a rating");
      return;
    }
    if (!reviewComment.trim()) {
      alert("Please write a review comment");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const success = await orderService.submitOrderReview(
        order.id,
        dbOrder?.buyer_id || "",
        reviewRating,
        reviewComment,
        [],
      );

      if (success) {
        alert("✅ Review submitted successfully! Thank you for your feedback.");
        setShowReviewModal(false);
        setReviewRating(0);
        setReviewComment("");

        // Refresh order data to show is_reviewed status
        if (orderId) {
          const isUuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              orderId,
            );
          const { data } = await supabase
            .from("orders")
            .select(
              `
              *,
              order_items (
                *,
                product:products (
                  id,
                  name,
                  image_url
                )
              )
            `,
            )
            .eq(isUuid ? "id" : "order_number", orderId)
            .single();

          if (data) {
            setDbOrder(data);
          }
        }
      } else {
        alert("Failed to submit review. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-[#ff6a00] transition-colors mb-4 group"
          >
            <div className="p-1.5">
              <ChevronLeft className="w-4 h-4 mt-3" />
            </div>
            <span className="font-medium text-sm mt-3">Back to Orders</span>
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
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadReceipt}
                className="flex items-center gap-2"
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-orange-500" />
                  Order Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statusTimeline.map((item, index) => (
                    <div key={item.status} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2",
                            item.completed
                              ? "bg-green-500 border-green-500 text-white"
                              : "bg-gray-100 border-gray-300 text-gray-400",
                          )}
                        >
                          {item.completed ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        {index < statusTimeline.length - 1 && (
                          <div
                            className={cn(
                              "w-0.5 h-12 mt-2",
                              item.completed ? "bg-green-500" : "bg-gray-300",
                            )}
                          />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <h4
                          className={cn(
                            "font-semibold",
                            item.completed ? "text-gray-900" : "text-gray-500",
                          )}
                        >
                          {item.label}
                        </h4>
                        {item.date && (
                          <p className="text-sm text-gray-600 mt-1">
                            {formatDate(item.date)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {order.status === "shipped" && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900">
                          Track Your Package
                        </h4>
                        <p className="text-sm text-blue-800 mt-1">
                          Your order is on its way! Expected delivery:{" "}
                          {formatDate(order.estimatedDelivery)}
                        </p>
                        <Button
                          onClick={() =>
                            navigate(`/delivery-tracking/${order.id}`)
                          }
                          className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                          size="sm"
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Track Delivery
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-500" />
                  Items ({order.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {item.name}
                        </h4>
                        {item.variant && (item.variant.size || item.variant.color) && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {item.variant.size && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                Size: {item.variant.size}
                              </span>
                            )}
                            {item.variant.color && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                Color: {item.variant.color}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-gray-600 mt-1">
                          Qty: {item.quantity}
                        </p>
                        <p className="text-sm text-gray-600">
                          ₱{item.price.toLocaleString()} each
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ₱{(item.price * item.quantity).toLocaleString()}
                        </p>
                        {order.status === "delivered" &&
                          !dbOrder?.is_reviewed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowReviewModal(true)}
                              className="mt-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                            >
                              <Star className="w-3 h-3 mr-1" />
                              Review
                            </Button>
                          )}
                        {order.status === "delivered" &&
                          dbOrder?.is_reviewed && (
                            <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>Reviewed</span>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order-based Chat */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-orange-500" />
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
                <div className="mb-4 h-80 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg">
                  {isLoadingChat ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
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
                            ? "bg-orange-500 text-white"
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
                              ? "text-orange-100"
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
                    className="flex-1"
                    disabled={!conversation || isSendingMessage}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || !conversation || isSendingMessage}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-orange-500" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    ₱{order.total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-lg text-orange-600">
                      ₱{order.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
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

            {/* Tracking Number */}
            {order.trackingNumber && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <Truck className="w-5 h-5 text-green-600" />
                    Tracking Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Tracking Number
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white border border-green-200 rounded px-3 py-2 text-sm font-mono text-green-900">
                        {order.trackingNumber}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-200 text-green-700 hover:bg-green-100"
                        onClick={() => {
                          navigator.clipboard.writeText(order.trackingNumber!);
                          alert("Tracking number copied to clipboard!");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  {order.status === "shipped" && (
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Your package is on the way!
                    </p>
                  )}
                  {order.status === "delivered" && (
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Package delivered successfully!
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium text-gray-900">
                  {order.shippingAddress.fullName}
                </p>
                <p className="text-sm text-gray-700">
                  {order.shippingAddress.street}
                </p>
                <p className="text-sm text-gray-700">
                  {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
                  {order.shippingAddress.postalCode}
                </p>
                {order.shippingAddress.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 pt-2">
                    <Phone className="w-4 h-4" />
                    {order.shippingAddress.phone}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Need Help */}
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-orange-900 mb-2">
                  Need Help?
                </h4>
                <p className="text-sm text-orange-800 mb-3">
                  Have questions about your order? Our support team is here to
                  help!
                </p>
                <Button
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Write a Review
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Rating Stars */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "w-8 h-8",
                          star <= reviewRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this product..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1"
                  disabled={isSubmittingReview}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BazaarFooter />
    </div>
  );
}
