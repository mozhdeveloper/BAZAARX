import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Clock } from 'lucide-react';
import { Order } from '../stores/cartStore';
import { orderReadService } from '../services/orders/orderReadService';
import type { OrderTrackingSnapshot } from '../types/orders';
import type { ShipmentStatus } from '../types/database.types';
import { TrackingSteps } from './orders/TrackingSteps';
import { ShippingAddressCard } from './orders/ShippingAddressCard';

interface TrackingModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

const mapLegacyStatusToShipmentStatus = (
  status: Order['status'],
): ShipmentStatus => {
  if (status === 'delivered' || status === 'reviewed') return 'delivered';
  if (status === 'shipped') return 'shipped';
  if (status === 'confirmed') return 'processing';
  if (status === 'returned' || status === 'cancelled') return 'returned';
  return 'waiting_for_seller';
};

export default function TrackingModal({ order, isOpen, onClose }: TrackingModalProps) {
  const [trackingSnapshot, setTrackingSnapshot] = useState<OrderTrackingSnapshot | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;

    const fetchTrackingSnapshot = async () => {
      if (!order.dbId) {
        setTrackingSnapshot(null);
        return;
      }

      setIsLoadingSnapshot(true);
      try {
        const snapshot =
          (await orderReadService.getOrderTracking({ orderIdOrNumber: order.dbId })) ||
          (await orderReadService.getOrderTracking({ orderIdOrNumber: order.id }));

        if (!isCancelled) {
          setTrackingSnapshot(snapshot);
        }
      } catch (error) {
        console.error('Failed to load tracking snapshot:', error);
        if (!isCancelled) {
          setTrackingSnapshot(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSnapshot(false);
        }
      }
    };

    void fetchTrackingSnapshot();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, order.dbId, order.id]);

  if (!isOpen) return null;

  const shipmentStatus = trackingSnapshot?.shipment_status || order.shipmentStatus || mapLegacyStatusToShipmentStatus(order.status);
  const trackingNumber = trackingSnapshot?.tracking_number || order.trackingNumber || null;
  const shippedAt = trackingSnapshot?.shipped_at
    ? new Date(trackingSnapshot.shipped_at)
    : order.shippedAt;
  const deliveredAt = trackingSnapshot?.delivered_at
    ? new Date(trackingSnapshot.delivered_at)
    : order.deliveredAt || (order.status === 'delivered' ? order.estimatedDelivery : undefined);
  const createdAt = trackingSnapshot?.created_at
    ? new Date(trackingSnapshot.created_at)
    : order.createdAt;

  const snapshotAddress = trackingSnapshot?.address;
  const snapshotRecipient = trackingSnapshot?.recipient;
  const recipientName = `${snapshotRecipient?.first_name || ''} ${snapshotRecipient?.last_name || ''}`.trim();
  const normalizedAddress = {
    fullName: recipientName || order.shippingAddress?.fullName || 'Customer',
    street: snapshotAddress?.address_line_1 || order.shippingAddress?.street || 'Address unavailable',
    city: snapshotAddress?.city || order.shippingAddress?.city || 'N/A',
    province: snapshotAddress?.province || order.shippingAddress?.province || 'N/A',
    postalCode: snapshotAddress?.postal_code || order.shippingAddress?.postalCode || '',
    phone: snapshotRecipient?.phone || order.shippingAddress?.phone || '',
  };

  const formatDate = (date?: Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const displayDeliveryDate = deliveredAt || order.estimatedDelivery || createdAt;
  const deliveryLabel =
    shipmentStatus === 'delivered' || shipmentStatus === 'received'
      ? 'Delivered'
      : shipmentStatus === 'returned' || shipmentStatus === 'failed_to_deliver'
        ? 'Latest Update'
        : 'Estimated Delivery';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-50 p-4"
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
                Order #{order.orderNumber || trackingSnapshot?.order_number || order.id} • {formatDate(createdAt)}
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
          {isLoadingSnapshot && (
            <p className="text-xs text-gray-500 mb-4">Refreshing live tracking details...</p>
          )}
          <TrackingSteps
            shipmentStatus={shipmentStatus}
            createdAt={createdAt}
            shippedAt={shippedAt}
            deliveredAt={deliveredAt}
            trackingNumber={trackingNumber}
          />

          {/* Delivery Info */}
          <ShippingAddressCard address={normalizedAddress} className="mt-8" />

          {/* Estimated Delivery */}
          <div className="mt-4 p-4 bg-orange-50 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-900">
                {deliveryLabel}
              </span>
            </div>
            <div className="text-sm text-orange-800">
              {formatDate(displayDeliveryDate)}
              {trackingNumber && shipmentStatus !== 'delivered' && shipmentStatus !== 'received' && (
                <span className="text-orange-600"> • Tracking {trackingNumber}</span>
              )}
              {!trackingNumber && shipmentStatus !== 'delivered' && shipmentStatus !== 'received' && (
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
