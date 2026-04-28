/**
 * SellerBreakdownModal
 *
 * Portal-based modal that shows the full seller-grouped item breakdown
 * AND the per-seller shipping method pickers (moved here from the sidebar).
 *
 * Accessibility
 * ─────────────
 * • role="dialog" + aria-modal + aria-labelledby
 * • Focus trapped: Tab cycles within modal; Escape closes.
 * • Body scroll locked while open.
 * • Backdrop click closes the modal.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Store, Package } from "lucide-react";
import { discountService } from "@/services/discountService";
import { ShippingMethodPicker } from "@/components/ShippingMethodPicker";
import type { ActiveDiscount } from "@/types/discount";
import type { SellerShippingResult } from "@/types/shipping.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BreakdownItem {
  id: string;
  name: string;
  quantity: number;
  price?: number;
  originalPrice?: number;
  image?: string;
  images?: string[];
  sellerId?: string;
  seller?: any;
  selectedVariant?: any;
}

export interface SellerBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Items pre-grouped by seller_id */
  groupedItems: Record<string, BreakdownItem[]>;
  activeCampaignDiscounts: Record<string, ActiveDiscount>;
  getOriginalUnitPrice: (item: BreakdownItem) => number;
  getSellerDisplayName: (sellerId: string, items: BreakdownItem[]) => string;
  perStoreShippingFees: Record<string, number>;
  calculateSellerItemsOriginalPrice: (sellerId: string) => number;
  calculateSellerCampaignDiscount: (sellerId: string) => number;
  calculateSellerSubtotal: (sellerId: string) => number;
  // Shipping — now lives in the modal
  shippingResults: SellerShippingResult[];
  selectedMethods: Record<string, string>;
  onSelectMethod: (sellerId: string, method: string) => void;
  isCalculatingShipping: boolean;
  onRetryShipping: () => void;
}

// ─── Variant label helper ─────────────────────────────────────────────────────

function buildVariantLabel(variant: any): string | null {
  if (!variant) return null;
  const parts: string[] = [];
  const vName = (variant.variant_name || variant.name || "").trim();
  const vSize = (variant.size || variant.option_1_value || "").trim();
  const vColor = (variant.color || variant.option_2_value || "").trim();

  if (vName) parts.push(vName);
  if (vSize && !vName.toLowerCase().includes(vSize.toLowerCase()))
    parts.push(`Size: ${vSize}`);
  if (
    vColor &&
    !vName.toLowerCase().includes(vColor.toLowerCase()) &&
    vColor.toLowerCase() !== "default"
  )
    parts.push(`Color: ${vColor}`);

  if (parts.length === 0) {
    if (variant.sku) parts.push(`SKU: ${variant.sku}`);
    else if (variant.id) parts.push(`#${variant.id.slice(0, 8)}`);
  }
  return parts.length > 0 ? parts.join(" / ") : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SellerBreakdownModal({
  isOpen,
  onClose,
  groupedItems,
  activeCampaignDiscounts,
  getOriginalUnitPrice,
  getSellerDisplayName,
  perStoreShippingFees,
  calculateSellerItemsOriginalPrice,
  calculateSellerCampaignDiscount,
  calculateSellerSubtotal,
  shippingResults,
  selectedMethods,
  onSelectMethod,
  isCalculatingShipping,
  onRetryShipping,
}: SellerBreakdownModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ── Lock body scroll ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => closeButtonRef.current?.focus(), 50);
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // ── Keyboard: Escape + Tab trap ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const sellerEntries = Object.entries(groupedItems);
  const totalItems = Object.values(groupedItems).flat().length;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ─────────────────────────────────────────────────── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[199] bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* ── Modal Panel ──────────────────────────────────────────────── */}
          <motion.div
            key="modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-breakdown-title"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] pointer-events-auto overflow-hidden">

              {/* ── Modal Header ───────────────────────────────────────── */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div>
                  <h2
                    id="seller-breakdown-title"
                    className="text-base font-bold text-gray-900"
                  >
                    Order Summary
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {sellerEntries.length} seller
                    {sellerEntries.length !== 1 ? "s" : ""} · {totalItems} item
                    {totalItems !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="Close order summary"
                  onClick={onClose}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Scrollable Content ─────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {sellerEntries.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No items in your order.</p>
                  </div>
                ) : (
                  sellerEntries.map(([sellerId, items], sellerIdx) => {
                    const sellerShipping = perStoreShippingFees[sellerId] ?? 0;
                    const sellerOriginal = calculateSellerItemsOriginalPrice(sellerId);
                    const sellerDiscount = calculateSellerCampaignDiscount(sellerId);
                    const sellerSubtotal = calculateSellerSubtotal(sellerId);
                    const shippingResult = shippingResults.find(
                      (r) => r.sellerId === sellerId
                    );

                    return (
                      <div
                        key={sellerId}
                        className="border border-gray-100 rounded-xl overflow-hidden"
                      >
                        {/* Seller Header */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-orange-50/60 border-b border-gray-100">
                          <div className="w-7 h-7 rounded-full bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                            <Store className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {getSellerDisplayName(sellerId, items)}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {items.length} item{items.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          {sellerEntries.length > 1 && (
                            <span className="ml-auto text-[10px] font-bold text-[var(--brand-primary)] bg-orange-100 rounded-full px-2 py-0.5 flex-shrink-0">
                              Seller {sellerIdx + 1}/{sellerEntries.length}
                            </span>
                          )}
                        </div>

                        {/* Items */}
                        <div className="divide-y divide-gray-50">
                          {items.map((item, idx) => {
                            const variant = item.selectedVariant as any;
                            const originalUnitPrice = getOriginalUnitPrice(item);
                            const activeDiscount = activeCampaignDiscounts[item.id] || null;
                            const { discountedUnitPrice } =
                              discountService.calculateLineDiscount(
                                originalUnitPrice,
                                item.quantity,
                                activeDiscount
                              );
                            const lineTotal = discountedUnitPrice * item.quantity;
                            const variantLabel = buildVariantLabel(variant);
                            const imgSrc =
                              variant?.thumbnail_url ||
                              item.image ||
                              item.images?.[0];

                            return (
                              <div
                                key={`${item.id}-${variant?.id || "base"}-${idx}`}
                                className="flex items-start gap-3 px-4 py-3"
                              >
                                {/* Thumbnail */}
                                <div className="w-12 h-12 rounded-lg border border-gray-100 bg-gray-50 overflow-hidden flex-shrink-0">
                                  {imgSrc ? (
                                    <img
                                      loading="lazy"
                                      src={imgSrc}
                                      alt={item.name}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package className="w-5 h-5 text-gray-300" />
                                    </div>
                                  )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                                    {item.name}
                                  </p>
                                  {variantLabel && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {variantLabel}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {originalUnitPrice > discountedUnitPrice && (
                                      <span className="text-xs text-gray-400 line-through">
                                        ₱{originalUnitPrice.toLocaleString()}
                                      </span>
                                    )}
                                    <span className="text-xs font-semibold text-[var(--brand-primary)]">
                                      ₱{discountedUnitPrice.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      × {item.quantity}
                                    </span>
                                  </div>
                                </div>

                                {/* Line total */}
                                <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                                  ₱{lineTotal.toLocaleString()}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* ── Shipping Method Picker (moved from sidebar) ─── */}
                        {shippingResult && (
                          <div className="px-4 pt-3 pb-3 border-t border-gray-100 bg-gray-50/50">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Shipping Method
                            </p>
                            <ShippingMethodPicker
                              methods={shippingResult.methods}
                              selectedMethod={selectedMethods[sellerId]}
                              onSelectMethod={(method) =>
                                onSelectMethod(sellerId, method)
                              }
                              isLoading={isCalculatingShipping}
                              error={shippingResult.error}
                              warning={shippingResult.warning}
                              onRetry={onRetryShipping}
                            />
                          </div>
                        )}

                        {/* Per-Seller Subtotal Footer */}
                        <div className="px-4 py-3 bg-orange-50/40 border-t border-gray-100 space-y-1.5">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Products</span>
                            <span className="font-medium text-gray-700">
                              ₱{sellerOriginal.toLocaleString()}
                            </span>
                          </div>

                          {sellerDiscount > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Campaign Discount</span>
                              <span className="font-medium text-[var(--brand-primary)]">
                                −₱{sellerDiscount.toLocaleString()}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Shipping</span>
                            <span className="font-medium text-gray-700">
                              {sellerShipping === 0
                                ? "Free"
                                : `+₱${sellerShipping.toLocaleString()}`}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-orange-200">
                            <span className="text-gray-700">Seller Total</span>
                            <span className="text-[var(--brand-primary)]">
                              ₱{(sellerSubtotal + sellerShipping).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ── Modal Footer ─────────────────────────────────────────── */}
              <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors duration-150"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default SellerBreakdownModal;
