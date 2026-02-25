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

interface AddProductsToCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: DiscountCampaign | null;
  sellerId: string;
  onProductsAdded?: () => void;
}

interface ProductSelection {
  productId: string;
  selected: boolean;
  discountedStock?: number;
}

export function AddProductsToCampaignDialog({
  open,
  onOpenChange,
  campaign,
  sellerId,
  onProductsAdded,
}: AddProductsToCampaignDialogProps) {
  const { products, fetchProducts } = useProductStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selections, setSelections] = useState<
    Record<string, ProductSelection>
  >({});
  const [existingProducts, setExistingProducts] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);

  // Load seller's products
  useEffect(() => {
    if (open && sellerId) {
      fetchProducts({ sellerId });
    }
  }, [open, sellerId, fetchProducts]);

  // Load products already in campaign
  useEffect(() => {
    const loadExistingProducts = async () => {
      if (!campaign?.id) return;

      try {
        const campaignProducts = await discountService.getProductsInCampaign(
          campaign.id,
        );
        const productIds = new Set(campaignProducts.map((p) => p.productId));
        setExistingProducts(productIds);
      } catch (error) {
        console.error("Failed to load campaign products:", error);
      }
    };

    if (open) {
      loadExistingProducts();
    }
  }, [campaign?.id, open]);

  // Filter products by search and seller
  const filteredProducts = products.filter((product) => {
    const matchesSeller = product.sellerId === sellerId;
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const isActive = product.isActive;
    return matchesSeller && matchesSearch && isActive;
  });

  const handleToggleProduct = (productId: string) => {
    setSelections((prev) => ({
      ...prev,
      [productId]: {
        productId,
        selected: !prev[productId]?.selected,
        discountedStock: prev[productId]?.discountedStock,
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
        discountedStock: stock > 0 ? stock : undefined,
      },
    }));
  };

  const handleAddProducts = async () => {
    if (!campaign?.id) return;

    const selectedProducts = Object.values(selections).filter(
      (s) => s.selected,
    );

    if (selectedProducts.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to add",
        variant: "destructive",
      });
      return;
    }

    // Filter out products already in campaign
    const newProducts = selectedProducts.filter(
      (s) => !existingProducts.has(s.productId),
    );

    if (newProducts.length === 0) {
      toast({
        title: "Products Already Added",
        description: "All selected products are already in this campaign",
        variant: "destructive",
      });
      return;
    }

    if (newProducts.length < selectedProducts.length) {
      const skipped = selectedProducts.length - newProducts.length;
      toast({
        title: "Notice",
        description: `${skipped} product(s) already in campaign will be skipped`,
      });
    }

    setLoading(true);
    try {
      const productIds = newProducts.map((s) => s.productId);
      const overrides = newProducts
        .filter((s) => s.discountedStock)
        .map((s) => ({
          productId: s.productId,
          discountedStock: s.discountedStock!,
        }));

      await discountService.addProductsToCampaign(
        campaign.id,
        sellerId,
        productIds,
        overrides.length > 0 ? overrides : undefined,
      );

      toast({
        title: "Products Added",
        description: `${newProducts.length} product(s) added to campaign successfully!`,
      });

      // Reset and close
      setSelections({});
      setSearchQuery("");
      onOpenChange(false);

      if (onProductsAdded) {
        onProductsAdded();
      }
    } catch (error) {
      console.error("Failed to add products:", error);

      // Check if it's a duplicate key error
      const isDuplicateError =
        error instanceof Error &&
        (error.message.includes("duplicate key") ||
          error.message.includes("23505"));

      toast({
        title: "Error",
        description: isDuplicateError
          ? "One or more products are already in this campaign"
          : error instanceof Error
            ? error.message
            : "Failed to add products to campaign",
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Products to Campaign</DialogTitle>
          <DialogDescription>
            {campaign?.name && `Select products to add to "${campaign.name}"`}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Campaign Info */}
        {campaign && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Campaign: {campaign.name}
                </p>
                <p className="text-sm text-gray-600">
                  Discount:{" "}
                  {campaign.discountType === "percentage"
                    ? `${campaign.discountValue}%`
                    : `₱${campaign.discountValue}`}
                </p>
              </div>
              {selectedCount > 0 && (
                <Badge className="bg-orange-500">
                  {selectedCount} selected
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Products List */}
        <div className="flex-1 overflow-y-auto border rounded-lg">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Package className="h-12 w-12 mb-2" />
              <p>No products found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredProducts.map((product) => {
                const isInCampaign = existingProducts.has(product.id);
                const isSelected = selections[product.id]?.selected || false;
                const stockLimit = selections[product.id]?.discountedStock;
                const productImage = product.images?.[0];

                return (
                  <div
                    key={product.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      isInCampaign ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <div className="flex items-center pt-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            handleToggleProduct(product.id)
                          }
                          disabled={isInCampaign}
                        />
                      </div>

                      {/* Product Image */}
                      <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        {productImage ? (
                          <img
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

                      {/* Product Info */}
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
                          {isInCampaign && (
                            <Badge className="bg-green-100 text-green-700">
                              <Check className="h-3 w-3 mr-1" />
                              Added
                            </Badge>
                          )}
                        </div>

                        {/* Stock Limit Input (only if selected) */}
                        {isSelected && !isInCampaign && (
                          <div className="mt-3 flex items-center gap-2">
                            <Label
                              htmlFor={`stock-${product.id}`}
                              className="text-xs text-gray-600 whitespace-nowrap"
                            >
                              Stock Limit (optional):
                            </Label>
                            <Input
                              id={`stock-${product.id}`}
                              type="number"
                              min="0"
                              max={product.stock}
                              placeholder={`Max: ${product.stock}`}
                              value={stockLimit || ""}
                              onChange={(e) =>
                                handleSetStock(
                                  product.id,
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-32 h-8 text-sm"
                            />
                            <span className="text-xs text-gray-500">
                              units at discount
                            </span>
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddProducts}
            disabled={selectedCount === 0 || loading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {loading
              ? "Adding..."
              : `Add ${selectedCount} Product${selectedCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
