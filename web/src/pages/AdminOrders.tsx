import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ShoppingBag,
  Search,
  Filter,
  Download,
  Eye,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Ban,
  DollarSign,
  RotateCcw,
  Edit3,
  AlertTriangle
} from 'lucide-react';

const AdminOrders: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, shipped: 0, delivered: 0 });

  // Map DB status to simpler display status
  const mapStatus = (paymentStatus: string, shipmentStatus: string) => {
    if (shipmentStatus === 'delivered' || shipmentStatus === 'received') return 'delivered';
    if (shipmentStatus === 'shipped' || shipmentStatus === 'out_for_delivery') return 'shipped';
    if (shipmentStatus === 'returned') return 'cancelled';
    if (shipmentStatus === 'processing' || shipmentStatus === 'ready_to_ship') return 'confirmed';
    if (paymentStatus === 'refunded') return 'cancelled';
    return 'pending';
  };

  const loadOrders = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          buyer_id,
          payment_status,
          shipment_status,
          created_at,
          notes,
          address_id,
          profiles:buyer_id(first_name, last_name, email, phone),
          order_items(id, product_name, price, quantity, price_discount, product_id, products(seller_id, sellers(store_name))),
          shipping_addresses:address_id(city, province)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const mappedOrders = (data || []).map((o: any) => {
        const items = (o.order_items || []).map((item: any) => ({
          name: item.product_name || 'Product',
          quantity: item.quantity || 1,
          price: Number(item.price) || 0,
          discount: Number(item.price_discount) || 0,
        }));

        const subtotal = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
        const totalDiscount = items.reduce((sum: number, i: any) => sum + (i.discount * i.quantity), 0);
        const total = subtotal - totalDiscount;
        const status = mapStatus(o.payment_status, o.shipment_status);

        // Get seller name from first item
        const sellerName = o.order_items?.[0]?.products?.sellers?.store_name || 'Unknown';
        const buyerName = o.profiles ? `${o.profiles.first_name || ''} ${o.profiles.last_name || ''}`.trim() : 'Unknown';
        const address = o.shipping_addresses ? `${o.shipping_addresses.city || ''}, ${o.shipping_addresses.province || ''}` : 'N/A';

        return {
          id: o.id,
          orderNumber: o.order_number || o.id.substring(0, 8),
          buyer: {
            name: buyerName,
            email: o.profiles?.email || '',
            phone: o.profiles?.phone || '',
          },
          seller: { name: sellerName, email: '' },
          items,
          subtotal,
          shippingFee: 0,
          discount: totalDiscount,
          total,
          paymentMethod: 'COD',
          paymentStatus: o.payment_status || 'pending',
          shipmentStatus: o.shipment_status || 'waiting_for_seller',
          shippingAddress: address,
          trackingNumber: '',
          status,
          date: o.created_at,
          canCancel: status === 'pending' || status === 'confirmed',
          canRefund: o.payment_status === 'paid',
        };
      });

      setOrders(mappedOrders);
      setStats({
        total: mappedOrders.length,
        pending: mappedOrders.filter((o: any) => o.status === 'pending').length,
        shipped: mappedOrders.filter((o: any) => o.status === 'shipped').length,
        delivered: mappedOrders.filter((o: any) => o.status === 'delivered').length,
      });
    } catch (err) {
      console.error('Error loading admin orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Enhanced orders data with more details
  const sampleOrders = [
    {
      id: 'ORD-001',
      orderNumber: 'BZR-2024-001234',
      buyer: { name: 'Juan Dela Cruz', email: 'juan@email.com', phone: '+63 917 123 4567' },
      seller: { name: 'TechHub Manila', email: 'tech@hub.com' },
      items: [
        { name: 'Wireless Earbuds', quantity: 1, price: 1299 },
        { name: 'Phone Case', quantity: 1, price: 399 }
      ],
      subtotal: 1698,
      shippingFee: 150,
      discount: 0,
      total: 1848,
      paymentMethod: 'GCash',
      paymentStatus: 'paid',
      shippingAddress: 'Makati City, Metro Manila',
      trackingNumber: 'TRACK123456',
      status: 'shipped',
      date: '2024-12-10T10:30:00',
      canCancel: false,
      canRefund: true
    },
    {
      id: 'ORD-002',
      orderNumber: 'BZR-2024-001235',
      buyer: { name: 'Maria Santos', email: 'maria@email.com', phone: '+63 917 765 4321' },
      seller: { name: 'Fashion Central', email: 'fashion@central.com' },
      items: [
        { name: 'Summer Dress', quantity: 1, price: 2999 }
      ],
      subtotal: 2999,
      shippingFee: 200,
      discount: 300,
      total: 2899,
      paymentMethod: 'Credit Card',
      paymentStatus: 'paid',
      shippingAddress: 'Quezon City, Metro Manila',
      trackingNumber: 'TRACK789012',
      status: 'delivered',
      date: '2024-12-09T14:15:00',
      canCancel: false,
      canRefund: true
    },
    {
      id: 'ORD-003',
      orderNumber: 'BZR-2024-001236',
      buyer: { name: 'Pedro Garcia', email: 'pedro@email.com', phone: '+63 917 555 1234' },
      seller: { name: 'Home Essentials', email: 'home@essentials.com' },
      items: [
        { name: 'Coffee Maker', quantity: 1, price: 1299 },
        { name: 'Water Filter', quantity: 2, price: 599 }
      ],
      subtotal: 2497,
      shippingFee: 150,
      discount: 0,
      total: 2647,
      paymentMethod: 'COD',
      paymentStatus: 'pending',
      shippingAddress: 'Pasig City, Metro Manila',
      status: 'pending',
      date: '2024-12-12T09:20:00',
      canCancel: true,
      canRefund: false
    },
    {
      id: 'ORD-004',
      orderNumber: 'BZR-2024-001237',
      buyer: { name: 'Sofia Lim', email: 'sofia@email.com', phone: '+63 917 888 9999' },
      seller: { name: 'TechHub Manila', email: 'tech@hub.com' },
      items: [
        { name: 'Smart Watch', quantity: 1, price: 4999 }
      ],
      subtotal: 4999,
      shippingFee: 0,
      discount: 500,
      total: 4499,
      paymentMethod: 'PayMaya',
      paymentStatus: 'paid',
      shippingAddress: 'Taguig City, Metro Manila',
      trackingNumber: 'TRACK345678',
      status: 'confirmed',
      date: '2024-12-11T16:45:00',
      canCancel: true,
      canRefund: true
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pending', variant: 'secondary' },
      confirmed: { label: 'Confirmed', variant: 'default' },
      shipped: { label: 'Shipped', variant: 'outline' },
      delivered: { label: 'Delivered', variant: 'default' },
      cancelled: { label: 'Cancelled', variant: 'destructive' }
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Package className="w-5 h-5 text-orange-500" />;
      case 'shipped': return <Truck className="w-5 h-5 text-blue-500" />;
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <ShoppingBag className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !reason) return;
    try {
      if (isSupabaseConfigured()) {
        // Update shipment_status to returned (cancelled equivalent)
        const { error } = await supabase
          .from('orders')
          .update({ shipment_status: 'returned', notes: `Admin cancelled: ${reason}` })
          .eq('id', selectedOrder.id);
        if (error) throw error;

        // Log status change
        await supabase.from('order_status_history').insert({
          order_id: selectedOrder.id,
          status: 'cancelled',
          note: reason,
          changed_by_role: 'admin',
        });
      }
      await loadOrders();
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert('Failed to cancel order');
    }
    setShowCancelDialog(false);
    setReason('');
    setSelectedOrder(null);
  };

  const handleRefundOrder = async () => {
    if (!selectedOrder || refundAmount <= 0) return;
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('orders')
          .update({ payment_status: 'refunded' })
          .eq('id', selectedOrder.id);
        if (error) throw error;

        await supabase.from('order_status_history').insert({
          order_id: selectedOrder.id,
          status: 'refunded',
          note: `Refund ₱${refundAmount} — ${reason}`,
          changed_by_role: 'admin',
        });
      }
      await loadOrders();
    } catch (err) {
      console.error('Error refunding order:', err);
      alert('Failed to process refund');
    }
    setShowRefundDialog(false);
    setRefundAmount(0);
    setReason('');
    setSelectedOrder(null);
  };

  const handleChangeStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    // Map display status back to DB fields
    const statusMap: Record<string, { payment_status?: string; shipment_status?: string }> = {
      pending: { shipment_status: 'waiting_for_seller' },
      confirmed: { shipment_status: 'processing' },
      shipped: { shipment_status: 'shipped' },
      delivered: { shipment_status: 'delivered' },
      cancelled: { shipment_status: 'returned' },
    };
    const updates = statusMap[newStatus] || {};

    try {
      if (isSupabaseConfigured() && Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', selectedOrder.id);
        if (error) throw error;

        await supabase.from('order_status_history').insert({
          order_id: selectedOrder.id,
          status: newStatus,
          note: `Admin override to ${newStatus}`,
          changed_by_role: 'admin',
        });
      }
      await loadOrders();
    } catch (err) {
      console.error('Error changing order status:', err);
      alert('Failed to update order status');
    }
    setShowStatusDialog(false);
    setNewStatus('');
    setSelectedOrder(null);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
                <p className="text-gray-600 mt-1">Monitor and manage all platform orders</p>
              </div>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Orders
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Orders', value: isLoading ? '...' : stats.total.toLocaleString(), icon: ShoppingBag, color: 'blue' },
                { label: 'Pending', value: isLoading ? '...' : stats.pending.toLocaleString(), icon: Package, color: 'orange' },
                { label: 'Shipped', value: isLoading ? '...' : stats.shipped.toLocaleString(), icon: Truck, color: 'purple' },
                { label: 'Delivered', value: isLoading ? '...' : stats.delivered.toLocaleString(), icon: CheckCircle, color: 'green' }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                          <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search by order number or buyer..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    More Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Order Number</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Buyer</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Seller</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Items</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Total</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order, index) => (
                        <motion.tr
                          key={order.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(order.status)}
                              <span className="font-medium text-gray-900">{order.orderNumber}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-700">{order.buyer.name}</td>
                          <td className="py-4 px-4 text-gray-700">{order.seller.name}</td>
                          <td className="py-4 px-4 text-gray-700">{order.items.length}</td>
                          <td className="py-4 px-4 font-semibold text-gray-900">₱{order.total.toLocaleString()}</td>
                          <td className="py-4 px-4">{getStatusBadge(order.status)}</td>
                          <td className="py-4 px-4 text-gray-600">
                            {new Date(order.date).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(order)}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {order.canCancel && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowCancelDialog(true);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Order Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Complete order information and admin controls
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Order Number</Label>
                    <p className="mt-1 font-semibold">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <Label>Order Date</Label>
                    <p className="mt-1">{new Date(selectedOrder.date).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  <div>
                    <Label>Payment Status</Label>
                    <Badge className={selectedOrder.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                      {selectedOrder.paymentStatus}
                    </Badge>
                  </div>
                </div>

                {/* Buyer Info */}
                <div>
                  <h4 className="font-semibold mb-2">Buyer Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedOrder.buyer.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedOrder.buyer.email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedOrder.buyer.phone}</p>
                    <p><span className="font-medium">Shipping:</span> {selectedOrder.shippingAddress}</p>
                  </div>
                </div>

                {/* Seller Info */}
                <div>
                  <h4 className="font-semibold mb-2">Seller Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedOrder.seller.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedOrder.seller.email}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-semibold mb-2">Order Items</h4>
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">₱{item.price.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₱{selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Fee:</span>
                    <span>₱{selectedOrder.shippingFee.toLocaleString()}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-₱{selectedOrder.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>₱{selectedOrder.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment Info */}
                <div>
                  <h4 className="font-semibold mb-2">Payment Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p><span className="font-medium">Method:</span> {selectedOrder.paymentMethod}</p>
                    <p><span className="font-medium">Status:</span> {selectedOrder.paymentStatus}</p>
                    {selectedOrder.trackingNumber && (
                      <p><span className="font-medium">Tracking:</span> {selectedOrder.trackingNumber}</p>
                    )}
                  </div>
                </div>

                {/* Admin Override Controls */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-orange-900">
                    <AlertTriangle className="w-5 h-5" />
                    Admin Override Controls
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDetailsDialog(false);
                        setShowStatusDialog(true);
                      }}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Change Status
                    </Button>
                    {selectedOrder.canRefund && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRefundAmount(selectedOrder.total);
                          setShowDetailsDialog(false);
                          setShowRefundDialog(true);
                        }}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Process Refund
                      </Button>
                    )}
                    {selectedOrder.canCancel && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDetailsDialog(false);
                          setShowCancelDialog(true);
                        }}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Cancel Order
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Force Retry
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowDetailsDialog(false);
                setSelectedOrder(null);
              }}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Order Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel order {selectedOrder?.orderNumber}. Please provide a reason.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <Textarea
                placeholder="Reason for cancellation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowCancelDialog(false);
                setReason('');
                setSelectedOrder(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelOrder}
                disabled={!reason}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirm Cancellation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Refund Dialog */}
        <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Refund</DialogTitle>
              <DialogDescription>
                Issue a refund for order {selectedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Refund Amount</Label>
                <Input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  max={selectedOrder?.total}
                  className="mt-2"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Max: ₱{selectedOrder?.total.toLocaleString()}
                </p>
              </div>
              <div>
                <Label>Refund Reason</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for refund..."
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowRefundDialog(false);
                setRefundAmount(0);
                setReason('');
                setSelectedOrder(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleRefundOrder}
                disabled={refundAmount <= 0 || !reason}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Process Refund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Status Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Order Status</DialogTitle>
              <DialogDescription>
                Update the status for order {selectedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Current Status</Label>
                <div className="mt-2">
                  {selectedOrder && getStatusBadge(selectedOrder.status)}
                </div>
              </div>
              <div>
                <Label>New Status</Label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select new status...</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowStatusDialog(false);
                setNewStatus('');
                setSelectedOrder(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleChangeStatus}
                disabled={!newStatus}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminOrders;
