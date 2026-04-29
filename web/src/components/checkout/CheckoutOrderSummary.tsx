/**
 * CheckoutOrderSummary — Compact sidebar card
 *
 * Layout:
 * ┌──────────────────────────────────┐
 * │  Order Summary            [count]│  ← plain header row (no bottom border)
 * │  View Order Summary  →           │  ← plain text link, no box, no icons
 * │  seller name chips               │
 * │  ──────────────────────────────  │
 * │  Voucher input                   │
 * │  Bazcoins toggle                 │
 * ├──────────────────────────────────┤
 * │  Sticky footer (always visible)  │
 * │    Price breakdown               │
 * │    Bazcoins earn banner          │
 * │    Vacation seller warning       │
 * │    Place Order CTA               │
 * │    SSL note                      │
 * └──────────────────────────────────┘
 *
 * Shipping method pickers have been moved into SellerBreakdownModal.
 * The middle area no longer scrolls independently — the whole card is
 * compact enough to fit without a scrollbar.
 */

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Tag, X, Shield, Palmtree, ChevronRight, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SellerBreakdownModal } from "./SellerBreakdownModal";
import type { SellerShippingResult } from "@/types/shipping.types";
import type { ActiveDiscount } from "@/types/discount";
import type { Voucher } from "@/stores/buyerStore";

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface CheckoutOrderSummaryProps {
  groupedCheckoutItems: Record<string, CheckoutItem[]>;
  activeCampaignDiscounts: Record<string, ActiveDiscount>;
  getOriginalUnitPrice: (item: CheckoutItem) => number;
  getSellerDisplayName: (sellerId: string, items: CheckoutItem[]) => string;
  calculateSellerItemsOriginalPrice: (sellerId: string) => number;
  calculateSellerCampaignDiscount: (sellerId: string) => number;
  calculateSellerSubtotal: (sellerId: string) => number;
  shippingResults: SellerShippingResult[];
  selectedMethods: Record<string, string>;
  onSelectMethod: (sellerId: string, method: string) => void;
  isCalculatingShipping: boolean;
  perStoreShippingFees: Record<string, number>;
  onRetryShipping: () => void;
  voucherCode: string;
  setVoucherCode: (v: string) => void;
  appliedVoucher: Voucher | null;
  onApplyVoucher: () => void;
  onRemoveVoucher: () => void;
  useBazcoins: boolean;
  setUseBazcoins: (v: boolean) => void;
  availableBazcoins: number;
  maxRedeemableBazcoins: number;
  bazcoinDiscount: number;
  earnedBazcoins: number;
  originalSubtotal: number;
  campaignDiscountTotal: number;
  shippingFee: number;
  discount: number;
  tax: number;
  finalTotal: number;
  grandTotalSavings: number;
  hasVacationSeller: boolean;
  vacationSellers: string[];
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
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const sellerEntries = useMemo(
    () => Object.entries(groupedCheckoutItems),
    [groupedCheckoutItems]
  );
  const totalItems = useMemo(
    () => Object.values(groupedCheckoutItems).flat().length,
    [groupedCheckoutItems]
  );
  const isEmpty = sellerEntries.length === 0;

  return (
    <>
      {/* ── Seller Breakdown Modal (portal) ─────────────────────────────── */}
      <SellerBreakdownModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        groupedItems={groupedCheckoutItems}
        activeCampaignDiscounts={activeCampaignDiscounts}
        getOriginalUnitPrice={getOriginalUnitPrice}
        getSellerDisplayName={getSellerDisplayName}
        perStoreShippingFees={perStoreShippingFees}
        calculateSellerItemsOriginalPrice={calculateSellerItemsOriginalPrice}
        calculateSellerCampaignDiscount={calculateSellerCampaignDiscount}
        calculateSellerSubtotal={calculateSellerSubtotal}
        shippingResults={shippingResults}
        selectedMethods={selectedMethods}
        onSelectMethod={onSelectMethod}
        isCalculatingShipping={isCalculatingShipping}
        onRetryShipping={onRetryShipping}
      />

      {/* ── Sidebar card ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="min-w-0"
      >
        <div className="bg-white shadow-md rounded-xl sticky top-24 flex flex-col overflow-hidden">

          {/* ── Top section ───────────────────────────────────────────────── */}
          <div className="px-6 pt-6 pb-4 space-y-3">

            {/* Entire header row is the modal trigger */}
            {isEmpty ? (
              <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
            ) : (
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isSummaryOpen}
                onClick={() => setIsSummaryOpen(true)}
                className="flex justify-between items-center w-full hover:text-orange-600 transition-colors group focus:outline-none"
              >
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                  View Order Summary
                </h3>
                <span className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-orange-600 transition-colors">
                  {totalItems} item{totalItems !== 1 ? "s" : ""}
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            )}


          </div>

          {/* ── Divider ────────────────────────────────────────────────────── */}
          <div className="border-t border-gray-100 mx-6" />

          {/* ── Controls (Voucher + Bazcoins) — no independent scroll ──────── */}
          <div className="px-6 py-4 space-y-5">

            {isEmpty && (
              <p className="text-sm text-gray-400 text-center py-4">
                No items in your order.
              </p>
            )}

            {/* ── Voucher ────────────────────────────────────────────────── */}
            <div>
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
                    aria-label="Remove voucher"
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

            {/* ── Bazcoins ───────────────────────────────────────────────── */}
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
                    <p className="text-sm font-medium text-gray-900">
                      -₱{maxRedeemableBazcoins}
                    </p>
                    <p className="text-xs text-gray-500">
                      {useBazcoins ? "Applied" : "Available"}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={useBazcoins ? "Remove Bazcoins" : "Apply Bazcoins"}
                    aria-pressed={useBazcoins}
                    onClick={() => setUseBazcoins(!useBazcoins)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
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

          {/* ── Sticky Footer — price breakdown + CTA ───────────────────── */}
          <div className="border-t border-gray-100 bg-white px-6 pt-4 pb-6 space-y-3">

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-700 font-medium">
                  ₱{originalSubtotal.toLocaleString()}
                </span>
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
                <span className="text-gray-700 font-medium">
                  ₱{tax.toLocaleString()}
                </span>
              </div>

              <hr className="border-gray-200" />

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

            {/* Bazcoins earn banner */}
            <div className="bg-[var(--brand-wash)] border border-[var(--brand-accent)] rounded-lg p-3 flex items-start gap-3">
              <div className="bg-[var(--brand-accent)] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">B</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--brand-primary)]">
                  Earn {earnedBazcoins} Bazcoins
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Receive coins upon successful delivery
                </p>
              </div>
            </div>

            {/* Vacation seller warning */}
            {hasVacationSeller && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                <Palmtree className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-700">
                    Some sellers are currently unavailable
                  </p>
                  <p className="text-xs text-orange-600">
                    The following seller(s) are on vacation:{" "}
                    <span className="font-semibold">
                      {vacationSellers.join(", ")}
                    </span>
                    . Please remove their items from your cart to proceed.
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
                <span className="flex items-center justify-center gap-2">
                  Place Order
                </span>
              )}
            </Button>

            {/* SSL note */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Secure checkout with 256-bit SSL encryption</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default CheckoutOrderSummary;
