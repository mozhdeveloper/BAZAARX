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
import { Loader2, CreditCard, Smartphone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod } from '@/stores/buyerStore';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPaymentMethod: (method: PaymentMethod) => void;
}

export const PaymentMethodModal = ({
  isOpen,
  onClose,
  onAddPaymentMethod
}: PaymentMethodModalProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card' as 'card' | 'wallet',
    brand: 'Visa',
    number: '',
    expiry: '',
    cvv: '',
    name: '',
    accountNumber: '',
    isDefault: false
  });

  const handleAddCard = async () => {
    setIsSaving(true);

    try {
      const isCard = newPaymentMethod.type === 'card';
      const cardData = {
        id: `${newPaymentMethod.type}_${Date.now()}`,
        type: newPaymentMethod.type,
        brand: newPaymentMethod.brand,
        last4: isCard ? newPaymentMethod.number.replace(/\s/g, '').slice(-4) : undefined,
        expiry: isCard ? newPaymentMethod.expiry : undefined,
        accountNumber: !isCard ? `09*******${newPaymentMethod.accountNumber.slice(-2)}` : undefined,
        isDefault: newPaymentMethod.isDefault
      };

      onAddPaymentMethod(cardData);

      toast({
        title: isCard ? "Card Added" : "Wallet Linked",
        description: `Your ${newPaymentMethod.brand} has been saved successfully.`,
      });
      onClose();
      setNewPaymentMethod({ 
        type: 'card', 
        brand: 'Visa', 
        number: '', 
        expiry: '', 
        cvv: '', 
        name: '', 
        accountNumber: '', 
        isDefault: false 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Payment Method</DialogTitle>
          <DialogDescription>Choose your preferred payment type.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Type Selector */}
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setNewPaymentMethod({ ...newPaymentMethod, type: 'card', brand: 'Visa' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
                newPaymentMethod.type === 'card' 
                  ? 'bg-white text-[#ff6a00] shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Card
            </button>
            <button
              onClick={() => setNewPaymentMethod({ ...newPaymentMethod, type: 'wallet', brand: 'GCash' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
                newPaymentMethod.type === 'wallet' 
                  ? 'bg-white text-[#ff6a00] shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Digital Wallet
            </button>
          </div>

          {newPaymentMethod.type === 'card' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Card Brand</Label>
                <Select 
                  value={newPaymentMethod.brand} 
                  onValueChange={(val) => setNewPaymentMethod({ ...newPaymentMethod, brand: val })}
                >
                  <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50">
                    <SelectValue placeholder="Select Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Visa">Visa</SelectItem>
                    <SelectItem value="MasterCard">MasterCard</SelectItem>
                    <SelectItem value="American Express">American Express</SelectItem>
                    <SelectItem value="JCB">JCB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Card Number</Label>
                <div className="relative">
                  <Input
                    placeholder="0000 0000 0000 0000"
                    value={newPaymentMethod.number}
                    onChange={e => setNewPaymentMethod({ ...newPaymentMethod, number: e.target.value })}
                    className="rounded-xl border-gray-100 bg-gray-50/50 pl-10"
                  />
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Expiry (MM/YY)</Label>
                  <Input
                    placeholder="MM/YY"
                    value={newPaymentMethod.expiry}
                    onChange={e => setNewPaymentMethod({ ...newPaymentMethod, expiry: e.target.value })}
                    className="rounded-xl border-gray-100 bg-gray-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">CVV</Label>
                  <Input
                    type="password"
                    placeholder="***"
                    value={newPaymentMethod.cvv}
                    onChange={e => setNewPaymentMethod({ ...newPaymentMethod, cvv: e.target.value })}
                    className="rounded-xl border-gray-100 bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Cardholder Name</Label>
                <Input
                  placeholder="Full Name as shown on card"
                  value={newPaymentMethod.name}
                  onChange={e => setNewPaymentMethod({ ...newPaymentMethod, name: e.target.value })}
                  className="rounded-xl border-gray-100 bg-gray-50/50"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Wallet Provider</Label>
                <Select 
                  value={newPaymentMethod.brand} 
                  onValueChange={(val) => setNewPaymentMethod({ ...newPaymentMethod, brand: val })}
                >
                  <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50">
                    <SelectValue placeholder="Select Wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GCash">GCash</SelectItem>
                    <SelectItem value="Maya">Maya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Mobile Number</Label>
                <div className="relative">
                  <Input
                    placeholder="09XX XXX XXXX"
                    value={newPaymentMethod.accountNumber}
                    onChange={e => setNewPaymentMethod({ ...newPaymentMethod, accountNumber: e.target.value })}
                    className="rounded-xl border-gray-100 bg-gray-50/50 pl-10"
                  />
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <p className="text-[10px] text-gray-400 italic">
                  Enter the registered number for your {newPaymentMethod.brand} account.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-gray-700">Set as default</Label>
              <p className="text-[10px] text-gray-500">Make this your primary payment method</p>
            </div>
            <Switch
              checked={newPaymentMethod.isDefault}
              onCheckedChange={(checked) => setNewPaymentMethod({ ...newPaymentMethod, isDefault: checked })}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-3">
          <Button variant="ghost" className="rounded-xl" onClick={onClose}>Cancel</Button>
          <Button 
            className="bg-[#ff6a00] hover:bg-[#e65e00] rounded-xl px-8" 
            onClick={handleAddCard} 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {newPaymentMethod.type === 'card' ? 'Save Card' : 'Link Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};