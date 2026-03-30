import { useState, useEffect } from "react";
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
import { Search, Package, Check } from "lucide-react";
import { useProductStore } from "@/stores/sellerStore";
import { discountService } from "@/services/discountService";
import { useToast } from "@/hooks/use-toast";
import type { DiscountCampaign } from "@/types/discount";

interface JoinSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: DiscountCampaign | null;
  sellerId: string;
  onJoined?: () => void;
}

interface ProductSelection {
  productId: string;
  selected: boolean;
  discountedPrice?: number;
  committedStock?: number;
}

export function JoinSlotDialog({
  open,
  onOpenChange,
  slot,
  sellerId,
  onJoined,
}: JoinSlotDialogProps) {
  const { products, fetchProducts } = useProductStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selections, setSelections] = useState<
    Record<string, ProductSelection>
  >({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && sellerId) {
      fetchProducts({ sellerId });
    }
  }, [open, sellerId, fetchProducts]);

  useEffect(() => {
    if (open) {
      setSelections({});
    }
  }, [slot?.id, open]);

  // Only show verified (approved) products for flash sale submission
  const filteredProducts = products.filter((product) => {
    const matchesSeller = product.sellerId === sellerId;
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const isActive = product.isActive;
    const isApproved = product.approvalStatus === 'approved';
    return matchesSeller && matchesSearch && isActive && isApproved;
  });

  const handleToggleProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelections((prev) => ({
      ...prev,
      [productId]: {
        productId,
        selected: !prev[productId]?.selected,
        discountedPrice: prev[productId]?.discountedPrice,
        committedStock: prev[productId]?.committedStock ?? product?.stock ?? 0,
      },
    }));
  };

  const handleSetPrice = (productId: string, price: number) => {
    setSelections((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        productId,
        selected: prev[productId]?.selected || false,
        discountedPrice: price > 0 ? price : undefined,
      },
    }));
  };

  const handleSetStock = (productId: string, stock: number) => {
    setSelections((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        productId,
        selected: prev[productId]?.selected || false,
        committedStock: stock >= 0 ? stock : 0,
      },
    }));
  };

  const handleJoinSlot = async () => {
    if (!slot?.id) return;

    const selectedProducts = Object.values(selections).filter(
      (s) => s.selected,
    );

    if (selectedProducts.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to join the slot",
        variant: "destructive",
      });
      return;
    }

    const submissions = selectedProducts.map((s) => ({
      productId: s.productId,
      submittedPrice: s.discountedPrice!,
      stock: s.committedStock || 0,
    }));

    setLoading(true);
    try {
      await discountService.joinFlashSaleSlot(slot.id, sellerId, submissions);

      toast({
        title: "Successfully Joined Slot",
        description: `You have submitted ${submissions.length} products to the flash sale.`,
      });

      setSelections({});
      setSearchQuery("");
      onOpenChange(false);

      if (onJoined) {
        onJoined();
      }
    } catch (error) {
      console.error("Failed to join slot:", error);
      toast({
        title: "Error",
        description: "Failed to join the flash sale slot.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = Object.values(selections).filter(
    (s) => s.selected,
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white border-none shadow-2xl scrollbar-hide">
        <DialogHeader>
          <DialogTitle>Join Flash Sale Slot</DialogTitle>
          <DialogDescription>
            {slot?.name && `Select products to submit to "${slot.name}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-white border border-[var(--brand-primary)]/70 focus:border-[var(--brand-primary)] rounded-xl shadow-none focus-visible:ring-0 focus:ring-0 transition-all font-medium"
          />
        </div>

        {slot && (
          <div className="bg-[var(--brand-accent-light)]/30 border border-[var(--brand-accent-light)]/50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-[var(--text-headline)]">
                  Slot: {slot.name}
                </p>
                <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider mt-0.5">
                  Minimum Discount: {slot.discountValue}%
                </p>
              </div>
              {selectedCount > 0 && (
                <Badge className="bg-[var(--brand-primary)] text-white font-bold rounded-lg border-0 px-3 py-1">
                  {selectedCount} Selected
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto border border-gray-100 rounded-2xl bg-white scrollbar-hide">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Package className="h-12 w-12 mb-2" />
              <p>No products found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredProducts.map((product) => {
                const isSelected = selections[product.id]?.selected || false;
                const discountedPrice = selections[product.id]?.discountedPrice;
                const productImage = product.images?.[0];
                const minPrice = product.price * (1 - (slot?.discountValue || 0) / 100);

                return (
                  <div
                    key={product.id}
                    className={`p-4 hover:bg-gray-50 transition-colors`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex items-center pt-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            handleToggleProduct(product.id)
                          }
                        />
                      </div>

                      <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        {productImage ? (
                          <img loading="lazy" 
                            src={productImage}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-gray-900 truncate">
                              {product.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              ₱{product.price.toLocaleString()} • Stock:{" "}
                              {product.stock}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-3 flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor={`price-${product.id}`}
                                className="text-xs text-gray-600 whitespace-nowrap"
                              >
                                Price (₱):
                              </Label>
                              <Input
                                id={`price-${product.id}`}
                                type="number"
                                min="0"
                                max={product.price}
                                placeholder={`Min: ${minPrice.toFixed(2)}`}
                                value={selections[product.id]?.discountedPrice || ""}
                                onChange={(e) =>
                                  handleSetPrice(
                                    product.id,
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-28 h-9 text-sm focus:ring-0 focus-visible:ring-0 border-gray-200 focus:border-[var(--brand-primary)] rounded-lg transition-all"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor={`stock-${product.id}`}
                                className="text-xs text-gray-600 whitespace-nowrap"
                              >
                                Commit Stock:
                              </Label>
                              <Input
                                id={`stock-${product.id}`}
                                type="number"
                                min="1"
                                max={product.stock}
                                value={selections[product.id]?.committedStock || ""}
                                onChange={(e) =>
                                  handleSetStock(
                                    product.id,
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-24 h-9 text-sm focus:ring-0 focus-visible:ring-0 border-gray-200 focus:border-[var(--brand-primary)] rounded-lg transition-all"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelections({});
              setSearchQuery("");
              onOpenChange(false);
            }}
            disabled={loading}
            className="rounded-xl border-[var(--btn-border)] font-bold hover:bg-gray-100 hover:text-[var(--text-headline)] active:scale-95 transition-all h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoinSlot}
            disabled={selectedCount === 0 || loading}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all px-8 h-11"
          >
            {loading
              ? "Submitting..."
              : `Submit ${selectedCount} Product${selectedCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
