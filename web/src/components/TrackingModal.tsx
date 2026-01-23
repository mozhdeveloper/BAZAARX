import { motion } from 'framer-motion';
import { X, Package, Truck, MapPin, Clock, CheckCircle } from 'lucide-react';
import { Order } from '../stores/cartStore';

interface TrackingModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export default function TrackingModal({ order, isOpen, onClose }: TrackingModalProps) {
  if (!isOpen) return null;

  const getTrackingSteps = (status: string) => {
    const steps = [
      {
        id: 'confirmed',
        title: 'Order Confirmed',
        description: 'Your order has been confirmed and is being prepared',
        icon: CheckCircle,
        completed: true,
        time: order.createdAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'processing',
        title: 'Order Processing',
        description: 'Your items are being prepared for shipment',
        icon: Package,
        completed: ['confirmed', 'shipped', 'delivered'].includes(status),
        time: status === 'confirmed' || ['shipped', 'delivered'].includes(status)
          ? new Date(order.createdAt.getTime() + 2 * 60 * 1000).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
          : null
      },
      {
        id: 'shipped',
        title: 'Order Shipped',
        description: `Package is on its way (Tracking: ${order.trackingNumber})`,
        icon: Truck,
        completed: ['delivered'].includes(status),
        current: status === 'shipped',
        time: status === 'shipped' || status === 'delivered'
          ? new Date(order.createdAt.getTime() + 62 * 60 * 1000).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
          : null
      },
      {
        id: 'delivered',
        title: 'Package Delivered',
        description: 'Your order has been successfully delivered',
        icon: CheckCircle,
        completed: status === 'delivered',
        time: status === 'delivered'
          ? order.estimatedDelivery.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
          : null
      },
    ];

    return steps;
  };

  const trackingSteps = getTrackingSteps(order.status);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Track Your Order</h2>
              <p className="text-sm text-gray-500 mt-1">
                Order #{order.orderNumber} • {formatDate(order.createdAt)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tracking Steps */}
        <div className="p-6">
          <div className="space-y-4">
            {trackingSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = step.completed;
              const isCurrent = step.current;

              return (
                <div key={step.id} className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${isCompleted
                    ? 'bg-green-100 border-green-200 text-green-600'
                    : isCurrent
                      ? 'bg-blue-100 border-blue-200 text-blue-600 animate-pulse'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                    }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-medium ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                          {step.title}
                        </h3>
                        <p className={`text-sm mt-1 ${isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                          {step.description}
                        </p>
                      </div>
                      {step.time && (
                        <span className={`text-xs ${isCompleted || isCurrent ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                          {step.time}
                        </span>
                      )}
                    </div>

                    {/* Progress Line */}
                    {index < trackingSteps.length - 1 && (
                      <div className={`w-0.5 h-6 ml-5 mt-2 ${isCompleted ? 'bg-green-200' : 'bg-gray-200'
                        }`} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delivery Info */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <MapPin className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Delivery Address</span>
            </div>
            <div className="text-sm text-gray-600 leading-relaxed">
              <div className="font-medium">{order.shippingAddress.fullName}</div>
              <div>{order.shippingAddress.street}</div>
              <div>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}</div>
              <div>{order.shippingAddress.phone}</div>
            </div>
          </div>

          {/* Estimated Delivery */}
          <div className="mt-4 p-4 bg-orange-50 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-900">
                {order.status === 'delivered' ? 'Delivered' : 'Estimated Delivery'}
              </span>
            </div>
            <div className="text-sm text-orange-800">
              {formatDate(order.estimatedDelivery)}
              {order.status !== 'delivered' && (
                <span className="text-orange-600"> • Usually arrives by 6:00 PM</span>
              )}
            </div>
          </div>

          {/* Contact Support */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 mb-2">Need help with your order?</p>
            <button className="text-sm text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] font-medium">
              Contact Customer Support
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}