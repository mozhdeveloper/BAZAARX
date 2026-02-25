import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productImage: string;
  cartItemCount: number;
}

export function CartModal({ isOpen, onClose, productName, productImage, cartItemCount }: CartModalProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Auto-close after 3 seconds using useEffect
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onCloseRef.current();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white/70 backdrop-blur-md shadow-xl rounded-2xl p-6 w-full max-w-sm flex flex-col items-center text-center space-y-4"
          >
            {/* Text Content */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 leading-tight">Item added to your cart!</h3>
            </div>

            {/* Product Mini Preview */}
            <div className="flex items-center gap-3 w-full bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-sm border border-gray-100 shrink-0">
                <img
                  src={productImage}
                  alt={productName}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 truncate">{productName}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
