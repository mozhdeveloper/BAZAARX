import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, Truck, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useCartStore } from '../stores/cartStore';

export function OrderNotificationModal() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead } = useCartStore();
  const [showModal, setShowModal] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<typeof notifications[0] | null>(null);

  // Check for unread notifications
  useEffect(() => {
    const unreadNotifs = notifications.filter(n => !n.read);
    
    // Show modal for seller confirmed notifications
    const confirmedNotif = unreadNotifs.find(n => n.type === 'seller_confirmed');
    if (confirmedNotif && !showModal) {
      setCurrentNotification(confirmedNotif);
      setShowModal(true);
    }
  }, [notifications, showModal]);

  const handleViewDelivery = () => {
    if (currentNotification) {
      markNotificationRead(currentNotification.id);
      setShowModal(false);
      navigate(`/delivery-tracking/${currentNotification.orderId}`);
    }
  };

  const handleDismiss = () => {
    if (currentNotification) {
      markNotificationRead(currentNotification.id);
    }
    setShowModal(false);
    setCurrentNotification(null);
  };

  const getIcon = () => {
    if (!currentNotification) return null;
    
    switch (currentNotification.type) {
      case 'seller_confirmed':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'shipped':
        return <Truck className="w-16 h-16 text-blue-500" />;
      case 'delivered':
        return <Package className="w-16 h-16 text-orange-500" />;
      default:
        return <CheckCircle className="w-16 h-16 text-green-500" />;
    }
  };

  if (!currentNotification) return null;

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader>
          <DialogTitle className="sr-only">Order Update</DialogTitle>
        </DialogHeader>

        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-6 py-6"
          >
            {/* Animated Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              {getIcon()}
            </motion.div>

            {/* Message */}
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">
                {currentNotification.type === 'seller_confirmed' && '🎉 Order Confirmed!'}
                {currentNotification.type === 'shipped' && '📦 Order Shipped!'}
                {currentNotification.type === 'delivered' && '✨ Order Delivered!'}
              </h3>
              <p className="text-gray-600 max-w-sm">
                {currentNotification.message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="flex-1"
              >
                Later
              </Button>
              <Button
                onClick={handleViewDelivery}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Truck className="w-4 h-4 mr-2" />
                View Delivery
              </Button>
            </div>

            {/* Order ID */}
            <p className="text-xs text-gray-500">
              Order #{currentNotification.orderId}
            </p>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
