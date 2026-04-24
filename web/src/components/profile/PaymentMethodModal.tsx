import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import type { PaymentMethod } from '@/stores/buyerStore';
import { getTestCardByNumber } from '@/constants/testCards';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => Promise<PaymentMethod | null> | PaymentMethod | null;
}

export const PaymentMethodModal = ({
  isOpen,
  onClose,
  onAddPaymentMethod
}: PaymentMethodModalProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card' as const,
    brand: 'Visa',
    number: '',
    expiry: '',
    cvv: '',
    name: '',
    isDefault: false
  });

  const resetForm = () => {
    setNewPaymentMethod({
      type: 'card',
      brand: 'Visa',
      number: '',
      expiry: '',
      cvv: '',
      name: '',
      isDefault: false
    });
    setError(null);
  };

  const formatCardNumber = (value: string) => value.replace(/\D/g, '').slice(0, 16);
  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };
  const formatCvv = (value: string) => value.replace(/\D/g, '').slice(0, 3);

  const isFormComplete =
    newPaymentMethod.number.length === 16 &&
    /^\d{2}\/\d{2}$/.test(newPaymentMethod.expiry) &&
    newPaymentMethod.cvv.length === 3 &&
    newPaymentMethod.name.trim().length > 0;

  const handleAddCard = async () => {
    const cardNumber = formatCardNumber(newPaymentMethod.number);
    const expiry = formatExpiry(newPaymentMethod.expiry);
    const cvv = formatCvv(newPaymentMethod.cvv);

    if (cardNumber.length !== 16) {
      setError('Card number must be 16 digits');
      return;
    }

    const testCard = getTestCardByNumber(cardNumber);
    if (!testCard) {
      setError('Card number does not match card type. Please use a valid PayMongo test card.');
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      setError('Expiry must be MM/YY format');
      return;
    }

    const [month, year] = expiry.split('/').map(Number);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;

    if (month < 1 || month > 12 || year < currentYear || (year === currentYear && month < currentMonth)) {
      setError('Card has expired');
      return;
    }

    if (cvv.length !== 3) {
      setError('CVV must be 3 digits');
      return;
    }

    if (!newPaymentMethod.name.trim()) {
      setError('Cardholder name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const cardData: Omit<PaymentMethod, 'id'> = {
        type: 'card',
        brand: testCard.brand,
        last4: cardNumber.slice(-4),
        expiry,
        isDefault: newPaymentMethod.isDefault
      };

      const added = await onAddPaymentMethod(cardData);
      if (added) {
        onClose();
        resetForm();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
        }
        onClose();
      }}
    >
      <DialogContent className="sm:max-w-[420px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[var(--text-headline)]">Add Payment Method</DialogTitle>
          <DialogDescription className="text-[var(--text-muted)]">Add a PayMongo card for faster checkout.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Card Number</Label>
              <div className="relative">
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={newPaymentMethod.number}
                  onChange={e => {
                    setNewPaymentMethod({ ...newPaymentMethod, number: formatCardNumber(e.target.value) });
                    setError(null);
                  }}
                  className="rounded-xl border-gray-100 bg-gray-50/50 pl-10 focus-visible:ring-0 focus-visible:border-[var(--brand-primary)] transition-all"
                />
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Expiry (MM/YY)</Label>
                <Input
                  placeholder="MM/YY"
                  value={newPaymentMethod.expiry}
                  onChange={e => {
                    setNewPaymentMethod({ ...newPaymentMethod, expiry: formatExpiry(e.target.value) });
                    setError(null);
                  }}
                  className="rounded-xl border-gray-100 bg-gray-50/50 focus-visible:ring-0 focus-visible:border-[var(--brand-primary)] transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">CVV</Label>
                <Input
                  type="password"
                  placeholder="***"
                  value={newPaymentMethod.cvv}
                  onChange={e => {
                    setNewPaymentMethod({ ...newPaymentMethod, cvv: formatCvv(e.target.value) });
                    setError(null);
                  }}
                  className="rounded-xl border-gray-100 bg-gray-50/50 focus-visible:ring-0 focus-visible:border-[var(--brand-primary)] transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Cardholder Name</Label>
              <Input
                placeholder="Full Name as shown on card"
                value={newPaymentMethod.name}
                onChange={e => {
                  setNewPaymentMethod({ ...newPaymentMethod, name: e.target.value });
                  setError(null);
                }}
                className="rounded-xl border-gray-100 bg-gray-50/50 focus-visible:ring-0 focus-visible:border-[var(--brand-primary)] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-[var(--text-headline)]">Set as default</Label>
              <p className="text-[10px] text-[var(--text-muted)]">Make this your primary payment method</p>
            </div>
            <Switch
              checked={newPaymentMethod.isDefault}
              onCheckedChange={(checked) => setNewPaymentMethod({ ...newPaymentMethod, isDefault: checked })}
              className="data-[state=checked]:bg-[var(--brand-primary)]"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-3">
          <Button variant="ghost" className="rounded-xl text-[var(--text-muted)] hover:bg-base hover:text-red-700" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-[var(--brand-accent)] hover:bg-[var(--brand-primary)] text-white shadow-lg shadow-amber-600/20 rounded-xl px-8 transition-all active:scale-95"
            onClick={handleAddCard}
            disabled={isSaving || !isFormComplete}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};