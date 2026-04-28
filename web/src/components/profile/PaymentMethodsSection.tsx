import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Trash2, Plus, ArrowLeft, CheckCircle2 } from 'lucide-react';
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'paymongo' | null>(null);

  const cardMethods = paymentMethods.filter((method) => method.type === 'card');

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
      className="space-y-6"
    >
      {!selectedPaymentMethod ? (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[var(--text-headline)]">Select Payment Method</h3>

          <button
            onClick={() => setSelectedPaymentMethod('paymongo')}
            className="w-full rounded-xl border border-amber-100 bg-white p-4 text-left transition-all hover:border-[var(--brand-primary)] hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                  <CreditCard className="h-5 w-5 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">PayMongo</p>
                  <p className="text-sm text-gray-500">Credit/Debit Cards - Visa, Mastercard</p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-[var(--brand-primary)]" />
            </div>
          </button>

          <div className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 opacity-70">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-500">GCash</p>
                  <p className="text-sm text-gray-400">Mobile wallet</p>
                </div>
              </div>
              <Badge className="bg-gray-200 text-gray-600 border-0">Coming Soon</Badge>
            </div>
          </div>

          <div className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 opacity-70">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-500">Installment Plans</p>
                  <p className="text-sm text-gray-400">Buy now, pay later</p>
                </div>
              </div>
              <Badge className="bg-gray-200 text-gray-600 border-0">Coming Soon</Badge>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedPaymentMethod(null)}
            className="w-fit px-0 text-[var(--brand-primary)] hover:bg-transparent"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {cardMethods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <CreditCard className="h-6 w-6 text-[var(--brand-primary)]" />
              </div>
              <p className="text-lg font-semibold text-gray-900">No Cards Saved</p>
              <p className="mt-1 text-sm text-gray-600">Add a PayMongo card for faster checkout next time.</p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 bg-[var(--brand-primary)] hover:bg-orange-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-700">Your Saved Cards</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cardMethods.map((method) => (
                  <Card
                    key={method.id}
                    className="relative overflow-hidden group border-2 border-gray-100 shadow-lg bg-white text-gray-900 min-h-[180px]"
                  >
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] transform translate-x-4 -translate-y-4">
                      <CreditCard className="w-32 h-32" />
                    </div>

                    <CardContent className="pt-6 px-6 pb-3 h-full flex flex-col justify-between relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold tracking-tight">{method.brand}</h3>
                        </div>
                        {method.isDefault && (
                          <Badge className="bg-orange-50 text-[#ff6a00] border-none text-[10px] font-bold">DEFAULT</Badge>
                        )}
                      </div>

                      <div className="space-y-4">
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
                          <span className="text-lg font-mono tracking-[0.2em]">{method.last4 || '----'}</span>
                        </div>

                        <div className="flex justify-between items-end mt-auto pt-4">
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Expires</p>
                            <p className="font-mono text-sm text-gray-700">{method.expiry || '--/--'}</p>
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

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl hover:border-[var(--brand-primary)] hover:bg-orange-50/50 transition-all duration-300 min-h-[180px] group"
                >
                  <div className="w-12 h-12 flex items-center justify-center mb-3 transition-colors">
                    <Plus className="w-6 h-6 text-gray-400 group-hover:text-[var(--brand-primary)] transition-colors" />
                  </div>
                  <span className="font-bold text-gray-600 group-hover:text-[var(--brand-primary)] uppercase text-xs tracking-widest transition-colors">Add Payment Method</span>
                  <p className="text-xs text-[var(--text-muted)] mt-1">PayMongo Cards</p>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <PaymentMethodModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddPaymentMethod={addPaymentMethod}
      />
    </motion.div>
  );
};