import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
  Receipt
} from 'lucide-react';
import { useCartStore, Order } from '../stores/cartStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { supabase } from '@/lib/supabase';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender: 'buyer' | 'seller' | 'system';
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);

<<<<<<< HEAD
  const order = orderId ? getOrderById(orderId) : null;
=======
  const [dbOrder, setDbOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
>>>>>>> b6eb31ecf9bad194af703fe42ca3eabbd29ff690
  const [chatMessage, setChatMessage] = useState('');

  // Initialize chat messages with lazy initialization
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const now = Date.now();
    return [
      {
        id: '1',
        sender: 'system',
        message: 'Order confirmed! Your seller will start preparing your items.',
        timestamp: new Date(now - 2 * 60 * 60 * 1000),
        read: true
      },
      {
        id: '2',
        sender: 'seller',
        message: 'Hello! Thank you for your order. We are preparing your items now.',
        timestamp: new Date(now - 1.5 * 60 * 60 * 1000),
        read: true
      },
      {
        id: '3',
        sender: 'buyer',
        message: 'Great! When can I expect the delivery?',
        timestamp: new Date(now - 1 * 60 * 60 * 1000),
        read: true
      },
      {
        id: '4',
        sender: 'seller',
        message: 'Your order will be shipped today and should arrive within 2-3 business days.',
        timestamp: new Date(now - 45 * 60 * 1000),
        read: true
      }
    ];
  });

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      setIsLoading(true);
      try {
        // Try fetching by ID first, then by order_number
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

        let query = supabase
          .from('orders')
          .select(`
            *,
            order_items (*)
          `);

        if (isUuid) {
          query = query.eq('id', orderId);
        } else {
          query = query.eq('order_number', orderId);
        }

        const { data: orderData, error } = await query.single();

        if (error) throw error;

        if (orderData) {
          const statusMap = {
            'pending_payment': 'pending',
            'paid': 'confirmed',
            'processing': 'confirmed',
            'shipped': 'shipped',
            'delivered': 'delivered',
            'cancelled': 'cancelled'
          };

          const mappedOrder: Order = {
            id: orderData.id,
            orderNumber: orderData.order_number,
            total: orderData.total_amount,
            status: (statusMap[orderData.status as keyof typeof statusMap] || 'pending') as Order['status'],
            isPaid: orderData.payment_status === 'paid',
            createdAt: new Date(orderData.created_at),
            date: new Date(orderData.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
            estimatedDelivery: new Date(orderData.estimated_delivery_date || Date.now() + 3 * 24 * 60 * 60 * 1000),
            items: (orderData.order_items || []).map((item: any) => ({
              id: item.id,
              name: item.product_name,
              price: item.price,
              quantity: item.quantity,
              image: item.product_images?.[0] || 'https://placehold.co/100?text=Product',
              seller: item.seller_name || 'Bazaar Merchant'
            })),
            shippingAddress: {
              fullName: (orderData.shipping_address as any)?.fullName || orderData.buyer_name,
              street: (orderData.shipping_address as any)?.street || '',
              city: (orderData.shipping_address as any)?.city || '',
              province: (orderData.shipping_address as any)?.province || '',
              postalCode: (orderData.shipping_address as any)?.postalCode || '',
              phone: (orderData.shipping_address as any)?.phone || orderData.buyer_phone || ''
            },
            paymentMethod: {
              type: (orderData.payment_method as any)?.type || 'cod',
              details: (orderData.payment_method as any)?.details || ''
            },
            trackingNumber: orderData.tracking_number || undefined
          };

          setDbOrder(mappedOrder);
        }
      } catch (err) {
        console.error("Error fetching order details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (!isLoading && !dbOrder) {
      navigate('/orders');
    }
  }, [dbOrder, navigate, isLoading]);

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium">Loading order details...</p>
      </div>
    </div>;
  }

  const order = dbOrder;

  if (!order) {
    return null;
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'confirmed':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-purple-500" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'shipped':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const statusTimeline = [
    { status: 'pending', label: 'Order Placed', completed: true, date: order.createdAt },
    { status: 'confirmed', label: 'Confirmed', completed: order.status !== 'pending', date: order.createdAt },
    { status: 'shipped', label: 'Shipped', completed: order.status === 'shipped' || order.status === 'delivered', date: order.status === 'shipped' || order.status === 'delivered' ? order.createdAt : null },
    { status: 'delivered', label: 'Delivered', completed: order.status === 'delivered', date: order.status === 'delivered' ? order.estimatedDelivery : null },
  ];

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'buyer',
      message: chatMessage,
      timestamp: new Date(),
      read: true
    };

    setChatMessages([...chatMessages, newMessage]);
    setChatMessage('');

    // Simulate seller response after 2 seconds
    setTimeout(() => {
      const sellerResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'seller',
        message: 'Thank you for your message. We will get back to you shortly!',
        timestamp: new Date(),
        read: false
      };
      setChatMessages(prev => [...prev, sellerResponse]);
    }, 2000);
  };

  const handleShareOrder = () => {
    if (navigator.share) {
      navigator.share({
        title: `Order #${order.orderNumber}`,
        text: `Check out my order from BazaarPH!`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Order link copied to clipboard!');
    }
  };

  const handleDownloadReceipt = () => {
    alert('Receipt download will be implemented with backend integration');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/orders')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Order #{order.orderNumber}
              </h1>
              <p className="text-gray-600 mt-1">{formatDate(order.createdAt)}</p>
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
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-2",
                          item.completed
                            ? "bg-green-500 border-green-500 text-white"
                            : "bg-gray-100 border-gray-300 text-gray-400"
                        )}>
                          {item.completed ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        {index < statusTimeline.length - 1 && (
                          <div className={cn(
                            "w-0.5 h-12 mt-2",
                            item.completed ? "bg-green-500" : "bg-gray-300"
                          )} />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <h4 className={cn(
                          "font-semibold",
                          item.completed ? "text-gray-900" : "text-gray-500"
                        )}>
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

                {order.status === 'shipped' && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900">Track Your Package</h4>
                        <p className="text-sm text-blue-800 mt-1">
                          Your order is on its way! Expected delivery: {formatDate(order.estimatedDelivery)}
                        </p>
                        <Button
                          onClick={() => navigate(`/delivery-tracking/${order.id}`)}
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
                    <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">Qty: {item.quantity}</p>
                        <p className="text-sm text-gray-600">₱{item.price.toLocaleString()} each</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ₱{(item.price * item.quantity).toLocaleString()}
                        </p>
                        {order.status === 'delivered' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/reviews?order=${order.id}`)}
                            className="mt-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                          >
                            <Star className="w-3 h-3 mr-1" />
                            Review
                          </Button>
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
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-orange-500" />
                  Chat with Seller
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Chat Messages */}
                <div className="mb-4 h-80 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender === 'buyer' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-4 py-2",
                          msg.sender === 'buyer'
                            ? 'bg-orange-500 text-white'
                            : msg.sender === 'seller'
                              ? 'bg-white border border-gray-200 text-gray-900'
                              : 'bg-blue-50 border border-blue-200 text-blue-900 text-sm'
                        )}
                      >
                        {msg.sender === 'seller' && (
                          <div className="flex items-center gap-2 mb-1">
                            <Store className="w-3 h-3" />
                            <span className="text-xs font-semibold">Seller</span>
                          </div>
                        )}
                        {msg.sender === 'system' && (
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-3 h-3" />
                            <span className="text-xs font-semibold">System</span>
                          </div>
                        )}
                        <p className="text-sm">{msg.message}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          msg.sender === 'buyer' ? 'text-orange-100' : 'text-gray-500'
                        )}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Send className="w-4 h-4" />
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
                  <span className="font-medium">₱{order.total.toLocaleString()}</span>
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
                      <p className="font-medium text-gray-900 capitalize">
                        {order.paymentMethod.type}
                      </p>
                      {order.paymentMethod.details && (
                        <p className="text-sm text-gray-600">{order.paymentMethod.details}</p>
                      )}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

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
                  {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
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
                <h4 className="font-semibold text-orange-900 mb-2">Need Help?</h4>
                <p className="text-sm text-orange-800 mb-3">
                  Have questions about your order? Our support team is here to help!
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

      <BazaarFooter />
    </div>
  );
}
