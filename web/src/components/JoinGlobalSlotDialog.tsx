import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, Package, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useProductStore } from "@/stores/sellerStore";
import { discountService } from "@/services/discountService";
import { useToast } from "@/hooks/use-toast";
import type { GlobalFlashSaleSlot, FlashSaleSubmission } from "@/types/discount";

interface JoinGlobalSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: GlobalFlashSaleSlot | null;
  sellerId: string;
}

interface Selection {
  submittedPrice: number;
  submittedStock: number;
}

const statusIcon = (status: string) => {
  if (status === 'approved') return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
  if (status === 'rejected') return <XCircle className="h-3.5 w-3.5 text-red-500" />;
  return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
};

const statusColor = (status: string) => {
  if (status === 'approved') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'rejected') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-yellow-50 text-yellow-700 border-yellow-200';
};

export function JoinGlobalSlotDialog({
  open,
  onOpenChange,
  slot,
  sellerId,
}: JoinGlobalSlotDialogProps) {
  const { products, fetchProducts } = useProductStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [loading, setLoading] = useState(false);
  const [existingSubmissions, setExistingSubmissions] = useState<FlashSaleSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeTab, setActiveTab] = useState<'submit' | 'my-submissions'>('submit');

  useEffect(() => {
    if (open && sellerId) {
      fetchProducts({ sellerId, offset: 0, limit: 100 });
      setSelections({});
      setSearchQuery("");
      setActiveTab('submit');
    }
  }, [open, sellerId, fetchProducts]);

  // Load existing submissions for this slot+seller
  useEffect(() => {
    if (open && slot?.id && sellerId) {
      setLoadingSubmissions(true);
      discountService.getSellerSubmissionsForSlot(slot.id, sellerId)
        .then(data => setExistingSubmissions(data))
        .catch(err => console.error('Failed to load submissions:', err))
        .finally(() => setLoadingSubmissions(false));
    }
  }, [open, slot?.id, sellerId]);

  // Set of already-submitted product IDs
  const submittedProductIds = new Set(existingSubmissions.map(s => s.product_id));

  // Only show approved products not yet submitted
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isEligible = product.sellerId === sellerId && matchesSearch && product.isActive && product.approvalStatus === 'approved';
    const notYetSubmitted = !submittedProductIds.has(product.id);
    return isEligible && notYetSubmitted;
  });

  const handleToggle = (productId: string, price: number, stock: number) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = { submittedPrice: price, submittedStock: stock };
      }
      return next;
    });
  };

  const handleUpdate = (productId: string, field: 'submittedPrice' | 'submittedStock', value: number) => {
    setSelections((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value }
    }));
  };

  const handleSubmit = async () => {
    if (!slot) return;
    const selectedIds = Object.keys(selections);
    if (selectedIds.length === 0) {
      toast({ title: "No Products Selected", description: "Please select at least one product.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      for (const productId of selectedIds) {
        const sel = selections[productId];
        await discountService.createFlashSaleSubmission({
          slot_id: slot.id,
          seller_id: sellerId,
          product_id: productId,
          submitted_price: sel.submittedPrice,
          submitted_stock: sel.submittedStock,
        });
      }
      toast({ title: "Success", description: "Products submitted to the global flash sale!" });
      // Reload submissions & clear form
      setSelections({});
      const updated = await discountService.getSellerSubmissionsForSlot(slot.id, sellerId);
      setExistingSubmissions(updated);
      setActiveTab('my-submissions');
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit products.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = Object.keys(selections).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle>Join {slot?.name}</DialogTitle>
          <DialogDescription>
            Submit your approved products. Minimum discount required: {slot?.min_discount_percentage}% OFF.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('submit')}
            className={`flex-1 text-sm font-semibold py-1.5 rounded-lg transition-all ${activeTab === 'submit' ? 'bg-white shadow text-[var(--brand-primary)]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Submit Products
          </button>
          <button
            onClick={() => setActiveTab('my-submissions')}
            className={`flex-1 text-sm font-semibold py-1.5 rounded-lg transition-all ${activeTab === 'my-submissions' ? 'bg-white shadow text-[var(--brand-primary)]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            My Submissions {existingSubmissions.length > 0 && `(${existingSubmissions.length})`}
          </button>
        </div>

        {activeTab === 'submit' ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-2xl bg-white p-2">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <Package className="h-12 w-12 mb-2 text-gray-300" />
                  <p className="font-medium text-sm">
                    {submittedProductIds.size > 0 && products.filter(p => p.sellerId === sellerId && p.isActive && p.approvalStatus === 'approved').length === submittedProductIds.size
                      ? 'All your products are already submitted!'
                      : 'No eligible products found'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Only verified (approved) products can be submitted</p>
                </div>
              ) : (
                <div className="divide-y space-y-2">
                  {filteredProducts.map((p) => {
                    const isSelected = !!selections[p.id];
                    const maxPrice = p.price * (1 - (slot?.min_discount_percentage || 0) / 100);

                    return (
                      <div key={p.id} className="p-3 border rounded-lg bg-gray-50 flex flex-col gap-3">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggle(p.id, Math.floor(maxPrice), p.stock)}
                            className="mt-1"
                          />
                          <img src={p.images?.[0] || ""} alt="" className="w-12 h-12 object-cover rounded bg-gray-200" />
                          <div>
                            <p className="font-semibold text-sm truncate">{p.name}</p>
                            <p className="text-xs text-gray-500">Regular: ₱{p.price.toLocaleString()} | Stock: {p.stock}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="grid grid-cols-2 gap-4 mt-2 ml-8 bg-white p-3 rounded-md border">
                            <div>
                              <Label className="text-xs">Submitted Price (Max ₱{maxPrice.toFixed(0)})</Label>
                              <Input
                                type="number"
                                value={selections[p.id].submittedPrice}
                                max={maxPrice}
                                min={1}
                                onChange={(e) => handleUpdate(p.id, 'submittedPrice', Number(e.target.value))}
                                className="h-8 mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Dedicated Stock</Label>
                              <Input
                                type="number"
                                value={selections[p.id].submittedStock}
                                max={p.stock}
                                min={1}
                                onChange={(e) => handleUpdate(p.id, 'submittedStock', Number(e.target.value))}
                                className="h-8 mt-1"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={selectedCount === 0 || loading}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? "Submitting..." : `Submit ${selectedCount} Product${selectedCount !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* My Submissions Tab */
          <div className="flex-1 overflow-y-auto">
            {loadingSubmissions ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading submissions...</div>
            ) : existingSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <Package className="h-12 w-12 mb-2 text-gray-300" />
                <p className="text-sm font-medium">No submissions yet</p>
                <p className="text-xs text-gray-400 mt-1">Switch to "Submit Products" to join this event</p>
              </div>
            ) : (
              <div className="space-y-3 p-1">
                <p className="text-xs text-gray-500 font-medium px-1">{existingSubmissions.length} product{existingSubmissions.length !== 1 ? 's' : ''} submitted</p>
                {existingSubmissions.map((sub) => (
                  <div key={sub.id} className="bg-white border rounded-xl p-4 flex items-center gap-4">
                    {sub.product_image ? (
                      <img src={sub.product_image} alt="" className="w-14 h-14 rounded-lg object-cover bg-gray-100 shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{sub.product_name || 'Product'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>Sale price: <span className="font-bold text-[var(--brand-primary)]">₱{Number(sub.submitted_price).toLocaleString()}</span></span>
                        <span>•</span>
                        <span>Stock: {sub.submitted_stock}</span>
                      </div>
                    </div>
                    <Badge className={`text-xs font-semibold border flex items-center gap-1.5 px-2.5 py-1 ${statusColor(sub.status || 'pending')}`}>
                      {statusIcon(sub.status || 'pending')}
                      {(sub.status || 'pending').charAt(0).toUpperCase() + (sub.status || 'pending').slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={() => setActiveTab('submit')} className="bg-orange-600 hover:bg-orange-700 text-white">
                Submit More Products
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
