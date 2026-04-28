/**
 * CheckoutOrderSummary
 *
 * A self-contained sidebar card that displays the grouped order items,
 * per-seller shipping pickers, voucher/Bazcoins controls, and the
 * price-breakdown + "Place Order" CTA.
 *
 * Layout contract
 * ────────────────
 * ┌─────────────────────────────────┐
 * │  Header  (flex-shrink-0)        │
 * ├─────────────────────────────────┤
 * │  Scrollable items area          │  ← overflow-y-auto, max-h-[400px]
 * │    Seller groups                │
 * │    Voucher input                │
 * │    Bazcoins toggle              │
 * ├─────────────────────────────────┤
 * │  Sticky footer                  │  ← flex-shrink-0, always visible
 * │    Price breakdown              │
 * │    Bazcoins earn banner         │
 * │    Vacation seller warning      │
 * │    Place Order button           │
 * │    SSL note                     │
 * └─────────────────────────────────┘
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Tag,
  X,
  Store,
  Shield,
  Palmtree,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShippingMethodPicker } from "@/components/ShippingMethodPicker";
import { discountService } from "@/services/discountService";
import type { SellerShippingResult } from "@/types/shipping.types";
import type { ActiveDiscount } from "@/types/discount";
import type { Voucher } from "@/stores/buyerStore";

// ─── Cart-item shape (minimal surface needed by this component) ──────────────
interface CheckoutItem {
  id: string;
  name: string;
  quantity: number;
  price?: number;
  originalPrice?: number;
  image?: string;
  images?: string[];
  sellerId?: string;
  seller?: any;
  isFreeShipping?: boolean;
  selectedVariant?: any;
  registryId?: string;
  notes?: string | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface CheckoutOrderSummaryProps {
  // Item data
  groupedCheckoutItems: Record<string, CheckoutItem[]>;
  activeCampaignDiscounts: Record<string, ActiveDiscount>;
  getOriginalUnitPrice: (item: CheckoutItem) => number;
  getSellerDisplayName: (sellerId: string, items: CheckoutItem[]) => string;

  // Per-seller subtotal helpers
  calculateSellerItemsOriginalPrice: (sellerId: string) => number;
  calculateSellerCampaignDiscount: (sellerId: string) => number;
  calculateSellerSubtotal: (sellerId: string) => number;

  // Shipping
  shippingResults: SellerShippingResult[];
  selectedMethods: Record<string, string>;
  onSelectMethod: (sellerId: string, method: string) => void;
  isCalculatingShipping: boolean;
  perStoreShippingFees: Record<string, number>;
  onRetryShipping: () => void;

  // Voucher
  voucherCode: string;
  setVoucherCode: (v: string) => void;
  appliedVoucher: Voucher | null;
  onApplyVoucher: () => void;
  onRemoveVoucher: () => void;

  // Bazcoins
  useBazcoins: boolean;
  setUseBazcoins: (v: boolean) => void;
  availableBazcoins: number;
  maxRedeemableBazcoins: number;
  bazcoinDiscount: number;
  earnedBazcoins: number;

  // Totals
  originalSubtotal: number;
  campaignDiscountTotal: number;
  shippingFee: number;
  discount: number;
  tax: number;
  finalTotal: number;
  grandTotalSavings: number;

  // Vacation sellers
  hasVacationSeller: boolean;
  vacationSellers: string[];

  // CTA
  isLoading: boolean;
  selectedAddress: any | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const CheckoutOrderSummary: React.FC<CheckoutOrderSummaryProps> = ({
  groupedCheckoutItems,
  activeCampaignDiscounts,
  getOriginalUnitPrice,
  getSellerDisplayName,
  calculateSellerItemsOriginalPrice,
  calculateSellerCampaignDiscount,
  calculateSellerSubtotal,
  shippingResults,
  selectedMethods,
  onSelectMethod,
  isCalculatingShipping,
  perStoreShippingFees,
  onRetryShipping,
  voucherCode,
  setVoucherCode,
  appliedVoucher,
  onApplyVoucher,
  onRemoveVoucher,
  useBazcoins,
  setUseBazcoins,
  availableBazcoins,
  maxRedeemableBazcoins,
  bazcoinDiscount,
  earnedBazcoins,
  originalSubtotal,
  campaignDiscountTotal,
  shippingFee,
  discount,
  tax,
  finalTotal,
  grandTotalSavings,
  hasVacationSeller,
  vacationSellers,
  isLoading,
  selectedAddress,
}) => {
  const isEmpty = Object.keys(groupedCheckoutItems).length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-w-0"
    >
      {/*
       * Outer card: sticky + full height flex column so the footer is always
       * anchored to the bottom regardless of how tall the items area grows.
       */}
      <div className="bg-white shadow-md rounded-xl sticky top-24 flex flex-col max-h-[calc(100vh-7rem)] overflow-hidden">

        {/* ── Card Header (always visible) ──────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
          {!isEmpty && (
            <p className="text-xs text-gray-400 mt-0.5">
              {Object.values(groupedCheckoutItems).flat().length} item
              {Object.values(groupedCheckoutItems).flat().length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* ── Scrollable Middle Area ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto checkout-summary-scroll px-6 py-4 space-y-6">

          {/* Empty state */}
          {isEmpty && (
            <div className="py-8 text-center text-gray-400 text-sm">
              No items in your order.
            </div>
          )}

          {/* BX-09-001 — Seller-grouped items with per-seller shipping */}
          {!isEmpty && (
            <div className="space-y-4">
              {Object.entries(groupedCheckoutItems).map(([sellerId, items]) => {
                const result = shippingResults.find((r) => r.sellerId === sellerId);
                const selectedMethod = selectedMethods[sellerId];

                return (
                  <div key={sellerId} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    {/* Seller Header */}
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                      <Store className="w-4 h-4 text-[var(--brand-primary)]" />
                      <h4 className="text-sm font-semibold text-gray-900">
                        {getSellerDisplayName(sellerId, items)}
                      </h4>
                    </div>

                    {/* Seller Items — inner scroll if list is very long */}
                    <div className="space-y-2 max-h-[240px] overflow-y-auto checkout-items-scroll pr-1">
                      {items.map((item, idx) => {
                        const variant = item.selectedVariant as any;
                        const originalUnitPrice = getOriginalUnitPrice(item);
                        const activeDiscount = activeCampaignDiscounts[item.id] || null;
                        const calculation = discountService.calculateLineDiscount(
                          originalUnitPrice,
                          item.quantity,
                          activeDiscount
                        );
                        const discountedUnitPrice = calculation.discountedUnitPrice;

                        // Build variant display
                        const variantParts: string[] = [];
                        if (variant) {
                          const vName = (variant.variant_name || variant.name || "").trim();
                          const vSize = (variant.size || variant.option_1_value || "").trim();
                          const vColor = (variant.color || variant.option_2_value || "").trim();

                          if (vName) variantParts.push(vName);
                          if (vSize && !vName.toLowerCase().includes(vSize.toLowerCase()))
                            variantParts.push(`Size: ${vSize}`);
                          if (
                            vColor &&
                            !vName.toLowerCase().includes(vColor.toLowerCase()) &&
                            vColor.toLowerCase() !== "default"
                          )
                            variantParts.push(`Color: ${vColor}`);
                          if (variantParts.length === 0) {
                            if (variant.sku) variantParts.push(`SKU: ${variant.sku}`);
                            else if (variant.id) variantParts.push(`#${variant.id.slice(0, 8)}`);
                          }
                        }
                        const variantInfo = variantParts.length > 0 ? variantParts.join(" / ") : null;

                        return (
                          <div
                            key={`${item.id}-${variant?.id || "no-variant"}-${idx}`}
                            className="flex items-start gap-2 text-xs"
                          >
                            <div className="w-10 h-10 rounded border border-gray-100 bg-white overflow-hidden flex-shrink-0">
                              <img
                                loading="lazy"
                                src={
                                  variant?.thumbnail_url ||
                                  item.image ||
                                  (item.images && item.images[0])
                                }
                                alt={item.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 font-medium line-clamp-1 text-xs">
                                {item.name}
                              </p>
                              {variantInfo && (
                                <p className="text-gray-500 text-xs mb-0.5">{variantInfo}</p>
                              )}
                              <div className="flex items-center gap-1">
                                {originalUnitPrice > discountedUnitPrice && (
                                  <span className="text-gray-400 line-through text-xs">
                                    ₱{originalUnitPrice.toLocaleString()}
                                  </span>
                                )}
                                <p className="text-[var(--brand-primary)] font-bold text-xs">
                                  ₱{discountedUnitPrice.toLocaleString()}
                                </p>
                                <span className="text-gray-400 text-xs">×{item.quantity}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Shipping Method Picker */}
                    {result && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <ShippingMethodPicker
                          methods={result.methods}
                          selectedMethod={selectedMethod}
                          onSelectMethod={(method) => onSelectMethod(sellerId, method)}
                          isLoading={isCalculatingShipping}
                          error={result.error}
                          warning={result.warning}
                          onRetry={onRetryShipping}
                        />
                      </div>
                    )}

                    {/* Per-seller subtotal breakdown */}
                    <div className="mt-3 pt-3 border-t border-gray-100 bg-orange-50/30 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Products:</span>
                        <span className="font-medium text-gray-900">
                          ₱{calculateSellerItemsOriginalPrice(sellerId).toLocaleString()}
                        </span>
                      </div>

                      {calculateSellerCampaignDiscount(sellerId) > 0 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">Campaign Discount:</span>
                          <span className="font-medium text-[var(--brand-primary)]">
                            -₱{calculateSellerCampaignDiscount(sellerId).toLocaleString()}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="font-medium text-gray-900">
                          {(perStoreShippingFees[sellerId] || 0) === 0
                            ? "Free"
                            : `+₱${(perStoreShippingFees[sellerId] || 0).toLocaleString()}`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-semibold border-t border-orange-200 pt-2">
                        <span className="text-gray-700">Seller Total:</span>
                        <span className="text-[var(--brand-primary)]">
                          ₱{(
                            calculateSellerSubtotal(sellerId) +
                            (perStoreShippingFees[sellerId] || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Voucher Code ─────────────────────────────────────────────── */}
          <div className="pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-[var(--brand-primary)]" />
              <h4 className="text-sm font-semibold text-gray-900">Have a Voucher?</h4>
            </div>

            {appliedVoucher ? (
              <div className="flex items-center justify-between bg-orange-50 border-2 border-[var(--brand-primary)] rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[var(--brand-primary)]" />
                  <div>
                    <p className="text-sm font-bold text-[var(--brand-primary)]">
                      {appliedVoucher.code}
                    </p>
                    <p className="text-xs text-gray-600">{appliedVoucher.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onRemoveVoucher}
                  className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Enter voucher code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={onApplyVoucher}
                    disabled={!voucherCode.trim()}
                    className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg hover:bg-[var(--brand-accent)] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                  Try: WELCOME10, SAVE50, FREESHIP
                </p>
              </>
            )}
          </div>

          {/* ── Bazcoins Redemption ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between bg-amber-50/60 border border-amber-100 rounded-xl p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--brand-accent)] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">B</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Bazcoins</p>
                <p className="text-xs text-gray-500">Balance: {availableBazcoins}</p>
              </div>
            </div>
            {availableBazcoins > 0 ? (
              <div className="flex items-center gap-2">
                <div className="text-right mr-1">
                  <p className="text-sm font-medium text-gray-900">-₱{maxRedeemableBazcoins}</p>
                  <p className="text-xs text-gray-500">{useBazcoins ? "Applied" : "Available"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseBazcoins(!useBazcoins)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    useBazcoins ? "bg-[var(--brand-primary)]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`${
                      useBazcoins ? "translate-x-6" : "translate-x-1"
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </button>
              </div>
            ) : (
              <span className="text-sm text-gray-400">No coins available</span>
            )}
          </motion.div>
        </div>

        {/* ── Sticky Footer — always pinned to bottom of card ───────────── */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-white px-6 pt-4 pb-6 space-y-3">
          {/* Price Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-700 font-medium">₱{originalSubtotal.toLocaleString()}</span>
            </div>

            {campaignDiscountTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Campaign Discount</span>
                <span className="text-[var(--brand-primary)] font-medium">
                  -₱{campaignDiscountTotal.toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="text-gray-700 font-medium">
                {shippingFee === 0 ? (
                  <span className="text-green-600 font-semibold">Free</span>
                ) : (
                  `₱${shippingFee.toLocaleString()}`
                )}
              </span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Voucher Discount</span>
                <span className="text-[var(--brand-primary)] font-medium">
                  -₱{discount.toLocaleString()}
                </span>
              </div>
            )}

            {bazcoinDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Bazcoins Applied</span>
                <span className="text-[var(--brand-primary)] font-medium">
                  -₱{bazcoinDiscount.toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (12% VAT)</span>
              <span className="text-gray-700 font-medium">₱{tax.toLocaleString()}</span>
            </div>

            <hr className="border-gray-200" />

            {/* Grand Total */}
            <div className="flex justify-between font-bold text-gray-900">
              <span className="text-base">Total</span>
              <span className="text-[var(--brand-primary)] text-lg">
                ₱{finalTotal.toLocaleString()}
              </span>
            </div>

            {grandTotalSavings > 0 && (
              <div className="text-right">
                <p className="text-xs text-green-600 font-medium">
                  🎉 You saved ₱{grandTotalSavings.toLocaleString()}!
                </p>
              </div>
            )}
          </div>

          {/* Bazcoins Earn Banner */}
          <div className="bg-[var(--brand-wash)] border border-[var(--brand-accent)] rounded-lg p-3 flex items-start gap-3">
            <div className="bg-[var(--brand-accent)] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--brand-primary)]">
                Earn {earnedBazcoins} Bazcoins
              </p>
              <p className="text-xs text-[var(--text-muted)]">Receive coins upon successful delivery</p>
            </div>
          </div>

          {/* Vacation Seller Warning */}
          {hasVacationSeller && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
              <Palmtree className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-700">
                  Some sellers are currently unavailable
                </p>
                <p className="text-xs text-orange-600">
                  The following seller(s) are on vacation:{" "}
                  <span className="font-semibold">{vacationSellers.join(", ")}</span>. Please
                  remove their items from your cart to proceed.
                </p>
              </div>
            </div>
          )}

          {/* Place Order CTA */}
          <Button
            type="submit"
            disabled={isLoading || !selectedAddress || hasVacationSeller}
            className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-5 text-base rounded-xl transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing Payment...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">Place Order</span>
            )}
          </Button>

          {/* SSL Note */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Secure checkout with 256-bit SSL encryption</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CheckoutOrderSummary;
