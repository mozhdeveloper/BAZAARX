import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { discountService } from '@/services/discountService';
import { useProductStore } from '@/stores/sellerStore';
import { Zap, Check, Clock, X, ShoppingBag, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PlatformFlashSalesTab({ sellerId }: { sellerId: string }) {
  const [slots, setSlots] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Join modal state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [submittedPrice, setSubmittedPrice] = useState(0);
  const [submittedStock, setSubmittedStock] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { products: allProducts, fetchProducts } = useProductStore();
  const { toast } = useToast();

  const loadData = async () => {
    if (!sellerId) return;
    setIsLoading(true);
    try {
      const [fetchedSlots, fetchedSubmissions] = await Promise.all([
        discountService.getActiveGlobalFlashSaleSlots(),
        discountService.getFlashSaleSubmissionsBySeller(sellerId)
      ]);
      setSlots(fetchedSlots || []);
      setSubmissions(fetchedSubmissions || []);
    } catch (err) {
      console.error('Failed to load platform sales data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchProducts({});
  }, [sellerId]);

  // Products already submitted by this seller for each slot
  const submittedProductIds = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (submissions || []).forEach((s: any) => {
      const set = map.get(s.slot_id) || new Set<string>();
      set.add(s.product_id);
      map.set(s.slot_id, set);
    });
    return map;
  }, [submissions]);

  const handleJoinClick = (slot: any, product: any) => {
    setSelectedSlot(slot);
    setSelectedProduct(product);
    const minPct = slot.min_discount_percentage || 10;
    const suggested = Math.round(product.price * (1 - minPct / 100));
    setSubmittedPrice(suggested);
    setSubmittedStock(Math.min(product.stock || 10, 50));
    setIsJoinModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedSlot || !selectedProduct) return;

    const minPct = selectedSlot.min_discount_percentage || 10;
    const maxPrice = Math.round(selectedProduct.price * (1 - minPct / 100));

    if (submittedPrice > maxPrice) {
      toast({
        title: "Price Too High",
        description: `Flash price must be at most ₱${maxPrice.toLocaleString()} (${minPct}% off minimum).`,
        variant: "destructive"
      });
      return;
    }

    if (submittedPrice <= 0) {
      toast({ title: "Invalid Price", description: "Price must be greater than 0.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await discountService.submitToFlashSale([{
        slotId: selectedSlot.id,
        sellerId,
        productId: selectedProduct.id,
        submittedPrice,
        submittedStock
      }]);

      toast({ title: "Submitted!", description: `${selectedProduct.name} submitted for admin review.` });
      setIsJoinModalOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Submission failed.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-orange-50 rounded-xl p-6 border border-orange-100 flex items-start gap-4">
        <Zap className="h-8 w-8 text-orange-500 flex-shrink-0 mt-1" />
        <div>
          <h2 className="text-xl font-bold text-orange-900">Platform Flash Sales</h2>
          <p className="text-orange-800 mt-1">
            Join official BazaarX flash sale events to boost your visibility. Submit your best products with competitive discounts for admin approval.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : slots.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center text-gray-500">
            No active platform flash sales at the moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {slots.map(slot => {
            const slotSubs = submissions.filter(s => s.slot_id === slot.id);
            const slotSubmittedIds = submittedProductIds.get(slot.id) || new Set<string>();
            const minPct = slot.min_discount_percentage || 10;

            return (
              <Card key={slot.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-r from-orange-500 to-orange-400 p-4 text-white">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        <h3 className="text-lg font-bold">{slot.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-white/20 text-white hover:bg-white/30 capitalize">
                          {slot.campaign_type?.replace('_', ' ') || 'Flash Sale'}
                        </Badge>
                        {slotSubs.length > 0 && (
                          <Badge className="bg-white text-orange-600 hover:bg-white">Joined</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-white/90">
                      <span><Clock className="inline h-3.5 w-3.5 mr-1" />{new Date(slot.start_date).toLocaleDateString()} – {new Date(slot.end_date).toLocaleDateString()}</span>
                      <span><Percent className="inline h-3.5 w-3.5 mr-1" />Min {minPct}% off</span>
                    </div>
                  </div>

                  {/* Your submissions for this slot */}
                  {slotSubs.length > 0 && (
                    <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                      <h4 className="text-sm font-semibold text-orange-900 mb-2">Your Submissions</h4>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {slotSubs.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between p-2 bg-white rounded-lg text-sm border">
                            <span className="font-medium truncate flex-1">{sub.products?.name}</span>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-gray-400 line-through text-xs">₱{sub.products?.price}</span>
                              <span className="font-bold text-red-500">₱{sub.submitted_price}</span>
                              <Badge variant="outline" className={
                                sub.status === 'approved' ? 'text-green-600 bg-green-50 border-green-200' :
                                sub.status === 'rejected' ? 'text-red-600 bg-red-50 border-red-200' :
                                'text-yellow-600 bg-yellow-50 border-yellow-200'
                              }>
                                {sub.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product List */}
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" /> Your Products
                    </h4>
                    {(!allProducts || allProducts.length === 0) ? (
                      <p className="text-gray-400 text-sm text-center py-6">No products found. Add products to your store first.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {allProducts.map(product => {
                          const alreadySubmitted = slotSubmittedIds.has(product.id);
                          const primaryImage = product.images?.[0] || 'https://placehold.co/40x40?text=N/A';
                          return (
                            <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <img src={primaryImage} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                                  <p className="text-xs text-gray-500">₱{product.price?.toLocaleString()} · {product.stock || 0} in stock</p>
                                </div>
                              </div>
                              {alreadySubmitted ? (
                                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 flex-shrink-0">
                                  <Check className="h-3 w-3 mr-1" /> Submitted
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleJoinClick(slot, product)}
                                  className="bg-[#FF6A00] hover:bg-[#E55D00] text-white flex-shrink-0"
                                >
                                  Join Event
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Submit Single Product Modal */}
      <Dialog open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Join {selectedSlot?.name}</DialogTitle>
            <DialogDescription>Set your flash sale price and stock for this product.</DialogDescription>
          </DialogHeader>

          {selectedProduct && selectedSlot && (
            <div className="space-y-5">
              {/* Product preview */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
                <img src={selectedProduct.images?.[0] || ''} className="w-12 h-12 rounded-lg object-cover" alt="" />
                <div>
                  <p className="font-semibold text-sm">{selectedProduct.name}</p>
                  <p className="text-xs text-gray-500">Original: ₱{selectedProduct.price?.toLocaleString()}</p>
                </div>
              </div>

              {/* Min discount notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <Percent className="inline h-4 w-4 mr-1" />
                Minimum discount for this event: <strong>{selectedSlot.min_discount_percentage || 10}%</strong>
                {' '}(max flash price: ₱{Math.round(selectedProduct.price * (1 - (selectedSlot.min_discount_percentage || 10) / 100)).toLocaleString()})
              </div>

              {/* Price + Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Flash Price (₱)</label>
                  <Input
                    type="number"
                    value={submittedPrice}
                    onChange={e => setSubmittedPrice(Number(e.target.value))}
                    max={selectedProduct.price}
                    min={1}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Stock to Allocate</label>
                  <Input
                    type="number"
                    value={submittedStock}
                    onChange={e => setSubmittedStock(Number(e.target.value))}
                    max={selectedProduct.stock || 999}
                    min={1}
                  />
                </div>
              </div>

              {/* Discount preview */}
              {selectedProduct.price > 0 && submittedPrice > 0 && (
                <div className="text-center p-3 bg-red-50 rounded-xl border border-red-100">
                  <span className="text-red-600 font-black text-xl">
                    {Math.round(((selectedProduct.price - submittedPrice) / selectedProduct.price) * 100)}% OFF
                  </span>
                  <span className="text-gray-500 text-sm ml-2">
                    (₱{(selectedProduct.price - submittedPrice).toLocaleString()} savings)
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsJoinModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-[#FF6A00] hover:bg-[#E55D00]">
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
