import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Smartphone, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod } from '@/stores/buyerStore';
import { usePaymentMethodManager } from '@/hooks/profile/usePaymentMethodManager';
import { PaymentMethodModal } from './PaymentMethodModal';

interface PaymentMethodsSectionProps {
  userId: string;
}

export const PaymentMethodsSection = ({
  userId
}: PaymentMethodsSectionProps) => {
  const { paymentMethods, addPaymentMethod, deletePaymentMethod, setDefaultPaymentMethod } = usePaymentMethodManager(userId);
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDeleteCard = async (id: string) => {
    if (!confirm("Are you sure you want to remove this payment method?")) return;
    
    const result = await deletePaymentMethod(id);
    if (result) {
      toast({
        title: "Card Removed",
        description: "The payment method has been deleted.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete payment method. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {paymentMethods.map((method) => (
        <Card
          key={method.id}
          className="relative overflow-hidden group border-2 border-gray-100 shadow-lg bg-white text-gray-900 min-h-[180px]"
        >
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] transform translate-x-4 -translate-y-4">
            {method.type === 'card' ? <CreditCard className="w-32 h-32" /> : <Smartphone className="w-32 h-32" />}
          </div>

          <CardContent className="pt-6 px-6 pb-3 h-full flex flex-col justify-between relative z-10">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight">{method.brand}</h3>
                {method.type === 'wallet' && <p className="text-xs text-gray-500 font-medium">Digital Wallet</p>}
              </div>
              {method.isDefault && (
                <Badge className="bg-orange-50 text-[#ff6a00] border-none text-[10px] font-bold">DEFAULT</Badge>
              )}
            </div>

            <div className="space-y-4">
              {method.type === 'card' ? (
                <div className="flex items-center gap-4 text-gray-600">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-200" />)}
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-200" />)}
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-200" />)}
                  </div>
                  <span className="text-lg font-mono tracking-[0.2em]">{method.last4}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-lg font-mono tracking-wider text-gray-700">{method.accountNumber}</span>
                </div>
              )}

              <div className="flex justify-between items-end mt-auto pt-4">
                <div className="space-y-0.5">
                  {method.type === 'card' && (
                    <>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Expires</p>
                      <p className="font-mono text-sm text-gray-700">{method.expiry}</p>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {!method.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultPaymentMethod(method.id)}
                      className="text-gray-400 hover:text-[#ff6a00] p-0 transition-colors text-[10px] font-bold uppercase tracking-wider h-auto bg-transparent hover:bg-transparent"
                    >
                      Set as default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCard(method.id)}
                    className="text-gray-400 hover:text-red-500 p-0 transition-colors w-auto h-auto bg-transparent hover:bg-transparent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add New Card Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl hover:border-[#ff6a00] hover:bg-orange-50/50 transition-all duration-300 min-h-[180px] group"
      >
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-[#ff6a00] transition-colors">
          <Plus className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
        </div>
        <span className="font-bold text-gray-600 group-hover:text-[#ff6a00] transition-colors">Add New Payment Method</span>
        <p className="text-xs text-gray-400 mt-1">Visa, Mastercard, etc.</p>
      </button>

      <PaymentMethodModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddPaymentMethod={addPaymentMethod}
      />
    </motion.div>
  );
};