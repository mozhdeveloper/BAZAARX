import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, Truck, CheckCircle, XCircle, Eye, Search, Filter, Calendar, MapPin } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { Button } from '../components/ui/button';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import TrackingModal from '../components/TrackingModal';

export default function OrdersPage() {
  const navigate = useNavigate();
  const { orders } = useCartStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<string | null>(null);

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'confirmed':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-purple-500" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'confirmed':
        return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'shipped':
        return 'text-purple-700 bg-purple-100 border-purple-200';
      case 'delivered':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'cancelled':
        return 'text-red-700 bg-red-100 border-red-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.items.some(item => 
                           item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.seller.toLowerCase().includes(searchQuery.toLowerCase())
                         );
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const selectedOrderData = selectedOrder ? orders.find(o => o.id === selectedOrder) : null;

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-600 mb-6">When you place your first order, it will appear here.</p>
            <Button 
              onClick={() => navigate('/shop')}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white"
            >
              Start Shopping
            </Button>
          </motion.div>
        </div>
        
        <BazaarFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track and manage all your orders</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4"
        >
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search orders by ID or product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
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
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    {/* Order Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">
                          Order #{order.id.split('_')[1]}
                        </h3>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {order.items.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-8 h-8 object-cover rounded"
                          />
                          <span className="text-sm text-gray-700 truncate max-w-[120px]">
                            {item.name}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-xs text-gray-500">×{item.quantity}</span>
                          )}
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-600">
                            +{order.items.length - 3} more item{order.items.length > 4 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Order Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <span className="text-lg font-bold text-[var(--brand-primary)]">
                          ₱{order.total.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-600 ml-2">
                          ({order.items.length} item{order.items.length > 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setTrackingOrder(order.id)}
                          size="sm"
                          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white"
                        >
                          <MapPin className="w-4 h-4 mr-1" />
                          Track
                        </Button>
                        <Button
                          onClick={() => setSelectedOrder(order.id)}
                          variant="outline"
                          size="sm"
                          className="border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
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
                  Order #{selectedOrderData.id.split('_')[1]}
                </h2>
                <p className="text-gray-600">{formatDateTime(selectedOrderData.createdAt)}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Status */}
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border mb-6 ${getStatusColor(selectedOrderData.status)}`}>
              {getStatusIcon(selectedOrderData.status)}
              <span className="capitalize">{selectedOrderData.status}</span>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Items Ordered</h3>
              <div className="space-y-4">
                {selectedOrderData.items.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">by {item.seller}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
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
              <h3 className="font-semibold text-gray-900 mb-3">Shipping Address</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-gray-900">{selectedOrderData.shippingAddress.fullName}</p>
                <p className="text-gray-700">{selectedOrderData.shippingAddress.street}</p>
                <p className="text-gray-700">
                  {selectedOrderData.shippingAddress.city}, {selectedOrderData.shippingAddress.province} {selectedOrderData.shippingAddress.postalCode}
                </p>
                <p className="text-gray-700">{selectedOrderData.shippingAddress.phone}</p>
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
              {selectedOrderData.status === 'pending' && (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Cancel Order
                </Button>
              )}
              {(selectedOrderData.status === 'shipped' || selectedOrderData.status === 'delivered') && (
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
          order={orders.find(o => o.id === trackingOrder)!}
          isOpen={!!trackingOrder}
          onClose={() => setTrackingOrder(null)}
        />
      )}

      <BazaarFooter />
    </div>
  );
}