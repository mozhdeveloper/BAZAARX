import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { prefetchRoute } from "@/lib/prefetch";
import { supabase } from "@/lib/supabase";
import { discountService } from "@/services/discountService";
import type { ActiveDiscount } from "@/types/discount";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { useBuyerStore } from "../stores/buyerStore";
const VariantSelectionModal = lazy(() =>
    import("../components/ui/variant-selection-modal").then((m) => ({ default: m.VariantSelectionModal }))
);

export default function EnhancedCartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cartItems,
    groupedCart,
    updateCartQuantity,
    removeFromCart,
    validateVoucherDetailed,
    applyVoucher,
    getCartTotal,
    getCartItemCount,
    groupCartBySeller,
    followShop,
    unfollowShop,
    isFollowing,
    clearQuickOrder,
    toggleItemSelection,
    toggleSellerSelection,
    selectAllItems,
    selectItemsExclusively,
    getSelectedTotal,
    getSelectedCount,
    removeSelectedItems,
    updateItemVariant,
    campaignDiscountCache,
    updateCampaignDiscountCache,
  } = useBuyerStore();

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState("");
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  // Live stock fetched from product_variants table — keyed by variant ID or product ID
  const [liveVariantStock, setLiveVariantStock] = useState<Record<string, number>>({});

  const cartVariantIdsKey = useMemo(() =>
    cartItems.map(i => i.selectedVariant?.id).filter(Boolean).join('|'),
  [cartItems]);

  // Product IDs for items that have NO selected variant (stock = sum of all their variants)
  const cartNoVariantProductIdsKey = useMemo(() =>
    cartItems.filter(i => !i.selectedVariant?.id).map(i => i.id).filter(Boolean).join('|'),
  [cartItems]);

  useEffect(() => {
    const variantIds = cartVariantIdsKey ? cartVariantIdsKey.split('|') : [];
    if (variantIds.length === 0) return;
    let isMounted = true;
    supabase
      .from('product_variants')
      .select('id, stock')
      .in('id', variantIds)
      .then(({ data }) => {
        if (!isMounted || !data) return;
        const map: Record<string, number> = {};
        data.forEach((v: any) => { map[v.id] = v.stock ?? 0; });
        setLiveVariantStock(prev => ({ ...prev, ...map }));
      });
    return () => { isMounted = false; };
  }, [cartVariantIdsKey]);

  // For no-variant items, fetch all variants by product_id and sum their stock
  useEffect(() => {
    const productIds = cartNoVariantProductIdsKey ? cartNoVariantProductIdsKey.split('|') : [];
    if (productIds.length === 0) return;
    let isMounted = true;
    supabase
      .from('product_variants')
      .select('product_id, stock')
      .in('product_id', productIds)
      .then(({ data }) => {
        if (!isMounted || !data) return;
        const map: Record<string, number> = {};
        data.forEach((v: any) => {
          map[v.product_id] = (map[v.product_id] ?? 0) + (v.stock ?? 0);
        });
        setLiveVariantStock(prev => ({ ...prev, ...map }));
      });
    return () => { isMounted = false; };
  }, [cartNoVariantProductIdsKey]);

  // Resolve effective stock — always from live product_variants data
  const getItemStock = useCallback((item: any): number | null => {
    if (item.selectedVariant?.id) {
      // Variant item: look up by variant ID
      if (item.selectedVariant.id in liveVariantStock) return liveVariantStock[item.selectedVariant.id];
      return null; // live data not yet loaded — don't assume out of stock
    }
    // No-variant item: look up by product ID (summed from all variants)
    if (item.id in liveVariantStock) return liveVariantStock[item.id];
    return null; // live data not yet loaded
  }, [liveVariantStock]);

  const isItemOutOfStock = useCallback((item: any): boolean => {
    const s = getItemStock(item);
    return s !== null && s === 0;
  }, [getItemStock]);

  // Campaign discounts — seeded immediately from Zustand cache, updated in background
  const [activeCampaignDiscounts, setActiveCampaignDiscounts] = useState<Record<string, ActiveDiscount>>(
    () => campaignDiscountCache // instant — no loading flash
  );

  // Collect unique product IDs from cart
  const cartProductIdsKey = useMemo(() => {
    const ids = [...new Set(cartItems.map(item => item.id).filter(Boolean))];
    ids.sort();
    return ids.join("|");
  }, [cartItems]);

  // Background refresh — updates local state AND the persistent cache
  useEffect(() => {
    let isMounted = true;
    const loadDiscounts = async () => {
      const productIds = cartProductIdsKey ? cartProductIdsKey.split("|") : [];
      if (productIds.length === 0) return;
      try {
        const discounts = await discountService.getActiveDiscountsForProducts(productIds);
        if (isMounted) {
          setActiveCampaignDiscounts(prev => ({ ...prev, ...discounts }));
          updateCampaignDiscountCache(discounts); // persist for next visit
        }
      } catch {
        // keep whatever we already have from cache
      }
    };
    loadDiscounts();
    return () => { isMounted = false; };
  }, [cartProductIdsKey]);

  // Helper: get effective (discounted) unit price for a cart item
  const getEffectivePrice = (item: any): number => {
    const basePrice = item.selectedVariant?.price ?? item.price;
    const activeDiscount = activeCampaignDiscounts[item.id] ?? null;
    const { discountedUnitPrice } = discountService.calculateLineDiscount(basePrice, 1, activeDiscount);
    return discountedUnitPrice;
  };

  // Helper: get original unit price for a cart item (before campaign discount)
  const getOriginalPrice = (item: any): number => {
    return Number(item.selectedVariant?.originalPrice ?? item.selectedVariant?.price ?? item.originalPrice ?? item.price ?? 0);
  };

  // Edit Variant State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk'; id?: string; variantId?: string } | null>(null);
  const getImageSrc = (src?: string | null) =>
    src && src.trim().length > 0 ? src : undefined;


  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'bulk') {
      removeSelectedItems();
    } else if (deleteTarget.type === 'single' && deleteTarget.id) {
      removeFromCart(deleteTarget.id, deleteTarget.variantId);
    }
    setDeleteTarget(null);
  }, [deleteTarget, removeSelectedItems, removeFromCart]);

  // Clear quick order when user navigates to cart
  useEffect(() => {
    clearQuickOrder();
  }, []);

  useEffect(() => {
    groupCartBySeller();
  }, [cartItems]);

  // Track processed navigation to prevent re-selecting if user unselects
  const processedKeyRef = useRef<string | null>(null);

  // Handle auto-selection from navigation state (e.g. Buy Again)
  useEffect(() => {
    const state = location.state as { selectedItems?: string[] } | null;

    // Check if we have items selection request and cart has items
    if (state?.selectedItems && state.selectedItems.length > 0 && cartItems.length > 0) {
      // If we already processed this navigation key, don't force selection again
      if (processedKeyRef.current === location.key) {
        return;
      }

      // Check if all requested items are now present in the cart
      const allItemsPresent = state.selectedItems.every(id =>
        cartItems.some(item => item.cartItemId === id || item.id === id)
      );

      if (allItemsPresent) {
        // Select exclusively the requested items
        selectItemsExclusively(state.selectedItems);
        // Mark as processed so user can still manually toggle afterwards
        processedKeyRef.current = location.key;
      }
    }
  }, [location.state, cartItems, location.key, selectItemsExclusively]);

  const totalItems = getCartItemCount();
  const selectedCount = getSelectedCount();

  // Compute selected total using discounted prices
  const selectedTotal = useMemo(() => {
    return cartItems
      .filter(i => i.selected)
      .reduce((sum, item) => sum + getEffectivePrice(item) * item.quantity, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, activeCampaignDiscounts]);

  // Compute shipping total based only on selected items (accounting for discounts)
  const shippingTotal = useMemo(() => {
    return Object.values(groupedCart).reduce((sum, group) => {
      const selectedItems = group.items.filter(i => i.selected);
      if (selectedItems.length === 0) return sum;

      const subtotal = selectedItems.reduce((s, item) => s + getEffectivePrice(item) * item.quantity, 0);
      const hasFreeShipping = selectedItems.some(i => i.isFreeShipping);
      const isEligible = hasFreeShipping || subtotal >= 1000;

      return sum + (isEligible ? 0 : 100);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedCart, activeCampaignDiscounts]);

  const totalAmount = selectedTotal + shippingTotal; // Use selected total + shipping for display

  // Calculate "Select All" state — out-of-stock items excluded from selectable set
  const selectableItems = useMemo(() => cartItems.filter(i => !isItemOutOfStock(i)), [cartItems, isItemOutOfStock]);
  const allSelected = selectableItems.length > 0 && selectableItems.every(item => item.selected);
  const someSelected = selectableItems.some(item => item.selected) && !allSelected;
  const hasOutOfStockSelected = useMemo(() => cartItems.filter(i => i.selected).some(i => isItemOutOfStock(i)), [cartItems, isItemOutOfStock]);

  const handleApplyVoucher = useCallback(async (sellerId?: string) => {
    if (!voucherCode.trim()) {
      setVoucherError("Please enter a voucher code");
      return;
    }

    setIsApplyingVoucher(true);
    setVoucherError("");

    try {
      const { voucher, errorCode } = await validateVoucherDetailed(voucherCode, sellerId);

      if (voucher) {
        applyVoucher(voucher, sellerId);
        setVoucherCode("");
        setVoucherError("");
      } else {
        const errorMessages: Record<string, string> = {
          NOT_FOUND: "Voucher code not found.",
          INACTIVE: "This voucher is currently inactive.",
          NOT_STARTED: "This voucher is not active yet.",
          EXPIRED: "This voucher has expired.",
          MIN_ORDER_NOT_MET: "Minimum order amount not met.",
          SELLER_MISMATCH: "This voucher is only valid for specific seller items.",
          ALREADY_USED: "You have already used this voucher. It can only be used once per customer.",
        };
        setVoucherError(errorMessages[errorCode || ""] || "Invalid voucher code or minimum order not met");
      }
    } catch (error) {
      setVoucherError("Failed to validate voucher");
    } finally {
      setIsApplyingVoucher(false);
    }
  }, [voucherCode, validateVoucherDetailed, applyVoucher]);

  const handleEditOptions = useCallback((item: any) => {
    setEditingItem(item);
    setShowVariantModal(true);
  }, []);

  const handleUpdateVariant = useCallback((newVariant: any, newQuantity: number) => {
    if (editingItem) {
      updateItemVariant(editingItem.id, editingItem.selectedVariant?.id, newVariant, newQuantity);
    }
    setShowVariantModal(false);
    setEditingItem(null);
  }, [editingItem, updateItemVariant]);


  // Memoize sorted cart groups to avoid re-sort on every render
  const sortedCartGroups = useMemo(() =>
    Object.entries(groupedCart).sort(([, groupA], [, groupB]) => {
      const latestA = Math.max(...groupA.items.map(i => i.createdAt ? new Date(i.createdAt).getTime() : 0));
      const latestB = Math.max(...groupB.items.map(i => i.createdAt ? new Date(i.createdAt).getTime() : 0));
      return latestB - latestA;
    }),
  [groupedCart]);

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-[var(--brand-wash)]">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-64 h-64 mx-auto mb-8 relative">
              <img loading="lazy" 
                src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=400&fit=crop"
                alt="Empty cart"
                className="w-full h-full object-cover rounded-2xl"
              />
              <div className="absolute inset-0 bg-[var(--brand-primary)]/10 rounded-2xl" />
            </div>
            <h2 className="text-3xl font-bold text-[var(--text-headline)] mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Start shopping and discover amazing products from trusted sellers!
            </p>
            <Button
              onClick={() => navigate("/shop")}
              size="lg"
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white px-8 py-3 text-lg"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              Start Shopping
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-wash)]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/shop')}
              className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-4 group"
            >
              <ChevronLeft
                size={20}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              <span className="text-sm font-medium">Back to Shop</span>
            </button>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-1">
                Shopping Cart
              </h1>
            </div>
          </div>


        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-2">
          {/* Cart Items - Grouped by Seller */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sticky Select All Bar */}
            <div className="sticky top-4 z-10 bg-[var(--brand-wash)]/95 backdrop-blur-sm py-2 flex items-center justify-end gap-2 -mb-4">
              <Checkbox
                checked={allSelected || (someSelected ? "indeterminate" : false)}
                onCheckedChange={(checked) => {
                  selectableItems.forEach(item => {
                    if (item.selected !== (checked === true)) {
                      toggleItemSelection(item.id, item.selectedVariant?.id);
                    }
                  });
                }}
              />
              <span className="text-xs font-small text-[var(--text-muted)] mr-auto">Select All Items ({totalItems})</span>

              {selectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget({ type: 'bulk' })}
                  className="text-red-500 hover:text-red-700 hover:bg-base text-xs h-6 px-2"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete ({selectedCount})
                </Button>
              )}
            </div>

            <AnimatePresence>
              {sortedCartGroups
                .map(
                  ([sellerId, group], sellerIndex) => (
                    <motion.div
                      key={sellerId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: sellerIndex * 0.1 }}
                      className="bg-white rounded-xl p-3 sm:p-4 hover:shadow-lg transition-shadow shadow-sm"
                    >
                      {/* Seller Header */}
                      <div className="border-b border-[var(--brand-wash-gold)]/20 pb-2 mb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center justify-between gap-4 w-full">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={group.items.filter(i => !isItemOutOfStock(i)).length > 0 && group.items.filter(i => !isItemOutOfStock(i)).every(i => i.selected)}
                              onCheckedChange={(checked) => {
                                group.items.filter(i => !isItemOutOfStock(i)).forEach(i => {
                                  if (i.selected !== (checked === true)) toggleItemSelection(i.id, i.selectedVariant?.id);
                                });
                              }}
                            />
                            <div
                              className="flex items-center gap-2 cursor-pointer group/seller"
                              onClick={() => navigate(`/seller/${sellerId}`)}
                            >
                              {group.seller.avatar ? (
                                <img loading="lazy" 
                                  src={group.seller.avatar}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover group-hover/seller:opacity-80 transition-opacity"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[var(--brand-wash)] flex items-center justify-center group-hover/seller:opacity-80 transition-opacity">
                                  <Store className="w-4 h-4 text-[var(--brand-primary)]" />
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[var(--text-headline)] group-hover/seller:text-[var(--brand-primary)] transition-colors">
                                    {group.seller.name}
                                  </span>
                                  {group.seller.isVerified && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                                      Verified
                                    </Badge>
                                  )}
                                  <span className="text-[var(--text-muted)] group-hover/seller:text-[var(--brand-primary)] transition-colors">
                                    <ChevronRight className="h-4 w-4" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Product Items */}
                      <div className="space-y-0">
                        {group.items.map((item, itemIndex) => (
                          <motion.div
                            key={`${item.id}-${item.selectedVariant?.id || 'base'}-${itemIndex}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: sellerIndex * 0.1 + itemIndex * 0.05,
                            }}
                            className="flex items-center justify-between gap-3 w-full pb-4 pt-4 last:border-0 last:pb-0"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Checkbox
                                checked={item.selected || false}
                                disabled={isItemOutOfStock(item)}
                                onCheckedChange={() => !isItemOutOfStock(item) && toggleItemSelection(item.id, item.selectedVariant?.id)}
                              />

                              {/* Product Image */}
                              {item.image ? (
                                <img loading="lazy"
                                  src={item.image}
                                  alt=""
                                  className="w-16 h-16 object-cover rounded-md border border-[var(--brand-wash-gold)]/30 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                                  onClick={() => navigate(`/product/${item.id}`)}
                                />
                              ) : (
                                <div
                                  className="w-16 h-16 rounded-md border border-gray-100 bg-gray-50 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => navigate(`/product/${item.id}`)}
                                >
                                  <ShoppingBag className="w-6 h-6 text-[var(--text-muted)]" />
                                </div>
                              )}

                              {/* Product Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4
                                    className="font-medium text-[var(--text-headline)] text-sm truncate cursor-pointer hover:text-[var(--brand-primary)] transition-colors"
                                    onClick={() => navigate(`/product/${item.id}`)}
                                  >
                                    {item.name}
                                  </h4>
                                  {(() => {
                                    const stock = getItemStock(item);
                                    if (stock === null) return null;
                                    if (stock === 0) return (
                                      <Badge className="text-[10px] h-4 px-1.5 shrink-0 bg-red-100 text-red-600 border border-red-200 hover:bg-red-100">
                                        Out of Stock
                                      </Badge>
                                    );
                                    if (stock <= 5) return (
                                      <span className="text-[10px] text-orange-500 font-medium shrink-0">
                                        Only {stock} left
                                      </span>
                                    );
                                    return null;
                                  })()}
                                </div>
                                {item.variants &&
                                  item.variants.length > 0 &&
                                  item.variants.some(
                                    (v: any) =>
                                      v.option_1_value ||
                                      v.option_2_value ||
                                      v.size ||
                                      v.color ||
                                      v.variantLabel1Value ||
                                      v.variantLabel2Value
                                  ) && (
                                    <button
                                      onClick={() => handleEditOptions(item)}
                                      className="flex flex-wrap gap-1 mt-1 hover:opacity-80 transition-opacity group text-left"
                                      title="Click to change variety"
                                    >
                                      {item.selectedVariant ? (
                                      (() => {
                                        const variantMeta = item.selectedVariant as any;
                                        const labels: string[] = [];
                                        if (variantMeta?.size) labels.push(`Size: ${variantMeta.size}`);
                                        if (variantMeta?.color) labels.push(`Color: ${variantMeta.color}`);
                                        if (labels.length === 0 && variantMeta?.name) labels.push(variantMeta.name);

                                        return (
                                          <>
                                            {labels.map((label) => (
                                              <Badge
                                                key={label}
                                                variant="secondary"
                                                className="text-[10px] h-4 px-1.5 bg-[var(--brand-wash)] text-[var(--text-primary)] border border-[var(--brand-wash-gold)]/30 group-hover:border-[var(--brand-primary)] group-hover:text-[var(--brand-primary)] transition-colors pointer-events-none"
                                              >
                                                {label}
                                              </Badge>
                                            ))}
                                            <span className="text-[9px] text-[var(--brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity ml-1 font-medium bg-[var(--brand-wash)] px-1 rounded border border-[var(--brand-primary)]/20">Change</span>
                                          </>
                                        );
                                      })()
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-5 px-2 text-[var(--brand-primary)] border-[var(--brand-primary)]/30 bg-[var(--brand-wash)]"
                                      >
                                        Select Options
                                      </Badge>
                                    )}
                                  </button>
                                )}

                                {/* Quantity Controls */}
                                <div className="flex items-center gap-4 mt-2">
                                  {(() => {
                                    const effectivePrice = getEffectivePrice(item);
                                    const originalPrice = getOriginalPrice(item);
                                    const hasDiscount = effectivePrice < originalPrice;
                                    return (
                                      <>
                                        <span className={`text-sm font-bold ${hasDiscount ? 'text-[#DC2626]' : 'text-[var(--brand-primary)]'}`}>
                                          ₱{effectivePrice.toLocaleString()}
                                        </span>
                                        {hasDiscount && (
                                          <span className="text-xs text-gray-400 line-through">
                                            ₱{originalPrice.toLocaleString()}
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}

                                  <div className={`flex items-center gap-2 border rounded-md bg-white ${isItemOutOfStock(item) ? 'border-red-200' : 'border-gray-200'}`}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (item.quantity === 1) {
                                          setDeleteTarget({ type: 'single', id: item.id, variantId: item.selectedVariant?.id });
                                        } else {
                                          updateCartQuantity(item.id, item.quantity - 1, item.selectedVariant?.id);
                                        }
                                      }}
                                      disabled={isItemOutOfStock(item)}
                                      className="h-6 w-6 p-0 hover:bg-base hover:text-red-500"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>

                                    <span className="w-8 text-center font-medium text-xs">
                                      {item.quantity}
                                    </span>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        updateCartQuantity(item.id, item.quantity + 1, item.selectedVariant?.id)
                                      }
                                      className="h-6 w-6 p-0 hover:bg-base hover:text-green-500"
                                      disabled={isItemOutOfStock(item) || item.quantity >= (getItemStock(item) ?? item.selectedVariant?.stock ?? item.stock ?? 0)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <button
                                    onClick={() => setDeleteTarget({ type: 'single', id: item.id, variantId: item.selectedVariant?.id })}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Seller Total - only show if items are selected */}
                      {group.items.some(i => i.selected) && (
                        <div className="flex justify-end items-center pt-2 border-t border-gray-50 mt-2">
                          <span className="text-sm text-gray-500 mr-2">
                            Seller Total:
                          </span>
                          <span className="text-lg font-bold text-[var(--brand-primary)]">
                            ₱
                            {(() => {
                              const sellerSelectedSubtotal = group.items
                                .filter((i) => i.selected)
                                .reduce(
                                  (sum, item) =>
                                    sum + getEffectivePrice(item) * item.quantity,
                                  0
                                );
                              const hasFreeShipping = group.items
                                .filter((i) => i.selected)
                                .some((item) => item.isFreeShipping);
                              const subtotalThreshold = 1000;
                              const effectiveShipping =
                                hasFreeShipping ||
                                  sellerSelectedSubtotal >= subtotalThreshold
                                  ? 0
                                  : 100;
                              return (
                                sellerSelectedSubtotal + effectiveShipping
                              ).toLocaleString();
                            })()}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )
                )}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h3 className="text-xl font-semibold text-[var(--text-headline)] mb-6">
                Order Summary
              </h3>

              {/* Voucher Section */}
              <div className="mb-6">
                <div className="bg-[var(--brand-wash)] border border-[var(--brand-wash-gold)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-4 w-4 text-[var(--brand-primary)]" />
                    <span className="font-medium text-[var(--text-headline)]">
                      Apply Voucher
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter voucher code"
                      value={voucherCode}
                      onChange={(e) =>
                        setVoucherCode(e.target.value.toUpperCase())
                      }
                      className="flex-1"
                    />
                    <Button
                      onClick={() => handleApplyVoucher()}
                      disabled={isApplyingVoucher || !voucherCode.trim()}
                      className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                    >
                      Apply
                    </Button>
                  </div>
                  {voucherError && (
                    <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                      <AlertCircle className="h-4 w-4" />
                      {voucherError}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span>Selected ({selectedCount})</span>
                  <span>
                    ₱
                    {/* Only sum selected items subtotal with discounted prices */}
                    {cartItems
                      .filter(i => i.selected)
                      .reduce((sum, item) => sum + getEffectivePrice(item) * item.quantity, 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>
                    ₱{shippingTotal.toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-[var(--brand-primary)]">
                    ₱{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => navigate("/checkout")}
                onMouseEnter={() => prefetchRoute(() => import("./CheckoutPage"))}
                size="lg"
                disabled={selectedCount === 0 || hasOutOfStockSelected}
                className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white disabled:bg-[var(--text-muted)] disabled:cursor-not-allowed"
              >
                Proceed to Checkout ({selectedCount})
              </Button>
              {hasOutOfStockSelected && (
                <p className="text-xs text-red-500 text-center mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Remove out-of-stock items to proceed
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Variant Selection Modal */}
      {editingItem && (
        <Suspense fallback={null}>
          <VariantSelectionModal
            isOpen={showVariantModal}
            onClose={() => setShowVariantModal(false)}
            product={{
              id: editingItem.id,
              name: editingItem.name,
              price: editingItem.price,
              image: editingItem.image,
              variants: editingItem.variants || [],
              variantLabel1Values: editingItem.variantLabel1Values || [],
              variantLabel2Values: editingItem.variantLabel2Values || [],
            }}
            initialSelectedVariant={editingItem.selectedVariant}
            initialQuantity={editingItem.quantity}
            activeDiscount={activeCampaignDiscounts[editingItem.id]}
            buttonText="Confirm Changes"
            onConfirm={handleUpdateVariant}
          />
        </Suspense>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[425px] border-0">
          <DialogHeader>
            <DialogTitle>
              {deleteTarget?.type === 'bulk' ? 'Delete Selected Items?' : 'Remove Item?'}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'bulk'
                ? `Are you sure you want to remove ${selectedCount} items from your cart?`
                : "Are you sure you want to remove this item from your cart?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="hover:bg-gray-100 hover:text-gray-900 border-gray-200">Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
