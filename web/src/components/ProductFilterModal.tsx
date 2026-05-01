import type { FilterCategory, ProductFilters } from "@/types/filter.types";
import { DEFAULT_FILTERS, PRICE_RANGES, RATING_OPTIONS } from "@/types/filter.types";
import { Check, ChevronRight, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

interface CategoryOption {
  id: string;
  name: string;
  path: string[];
}

interface ProductFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: ProductFilters) => void;
  initialFilters: ProductFilters;
  availableCategories?: CategoryOption[];
  /** Hide specific promo options by key (e.g. ['onSale'] to hide "On Sale" toggle) */
  hidePromoOptions?: string[];
}

export default function ProductFilterModal({
  isOpen,
  onClose,
  onApply,
  initialFilters,
  availableCategories = [],
  hidePromoOptions = [],
}: ProductFilterModalProps) {
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [openGroup, setOpenGroup] = useState<FilterCategory | null>(null);
  const [tempMinPrice, setTempMinPrice] = useState("");
  const [tempMaxPrice, setTempMaxPrice] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFilters(initialFilters);
      setTempMinPrice(initialFilters.priceRange.min?.toString() || "");
      setTempMaxPrice(initialFilters.priceRange.max?.toString() || "");
      setOpenGroup(null);
    }
  }, [isOpen, initialFilters]);

  if (!isOpen) return null;

  const update = (key: keyof ProductFilters, value: unknown) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const getActiveCount = () => {
    let c = 0;
    if (filters.categoryId) c++;
    if (filters.priceRange.min !== null || filters.priceRange.max !== null) c++;
    if (filters.minRating !== null) c++;
    if (filters.shippedFrom) c++;
    if (filters.withVouchers || filters.onSale || filters.freeShipping || filters.preferredSeller || filters.officialStore) c++;
    if (filters.selectedBrands.length > 0) c++;
    if (filters.standardDelivery || filters.sameDayDelivery || filters.cashOnDelivery || filters.pickupAvailable) c++;
    return c;
  };

  const isGroupActive = (cat: FilterCategory): boolean => {
    switch (cat) {
      case "category": return !!filters.categoryId;
      case "price": return filters.priceRange.min !== null || filters.priceRange.max !== null;
      case "rating": return filters.minRating !== null;
      case "location": return !!filters.shippedFrom;
      case "promo": return filters.withVouchers || filters.onSale || filters.freeShipping || filters.preferredSeller || filters.officialStore;
      case "brand": return filters.selectedBrands.length > 0;
      case "shipping": return filters.standardDelivery || filters.sameDayDelivery || filters.cashOnDelivery || filters.pickupAvailable;
      default: return false;
    }
  };

  const clearGroup = (cat: FilterCategory) => {
    switch (cat) {
      case "category": update("categoryId", null); update("categoryPath", []); break;
      case "price": setTempMinPrice(""); setTempMaxPrice(""); update("priceRange", { min: null, max: null }); break;
      case "rating": update("minRating", null); break;
      case "location": update("shippedFrom", null); break;
      case "promo": update("withVouchers", false); update("onSale", false); update("freeShipping", false); update("preferredSeller", false); update("officialStore", false); break;
      case "brand": update("selectedBrands", []); break;
      case "shipping": update("standardDelivery", false); update("sameDayDelivery", false); update("cashOnDelivery", false); update("pickupAvailable", false); break;
    }
  };

  const handleApply = () => {
    const min = tempMinPrice ? parseFloat(tempMinPrice) : null;
    const max = tempMaxPrice ? parseFloat(tempMaxPrice) : null;
    if (min !== null && max !== null && min > max) return;
    onApply({ ...filters, priceRange: { min, max } });
    onClose();
  };

  const handleReset = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setTempMinPrice("");
    setTempMaxPrice("");
  };

  const GroupHeader = ({ title, category }: { title: string; category: FilterCategory }) => {
    const active = isGroupActive(category);
    const isOpen = openGroup === category;
    return (
      <button
        onClick={() => setOpenGroup(isOpen ? null : category)}
        className={`w-full flex items-center justify-between py-4 border-b border-gray-100 transition-colors ${active ? "bg-[var(--brand-primary)]/5 rounded-lg px-3 -mx-3 border-[var(--brand-primary)]/10" : ""}`}
      >
        <div className="flex items-center gap-2">
          {active && <div className="w-2 h-2 rounded-full bg-[var(--brand-primary)]" />}
          <span className={`text-sm font-semibold ${active ? "text-[var(--brand-primary)]" : "text-gray-800"}`}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {active && (
            <span
              onClick={(e) => { e.stopPropagation(); clearGroup(category); }}
              className="text-xs text-[var(--brand-primary)] font-semibold bg-[var(--brand-primary)]/10 px-2.5 py-1 rounded-full cursor-pointer hover:bg-[var(--brand-primary)]/20"
            >
              Clear
            </span>
          )}
          <ChevronRight className={`w-4 h-4 transition-transform ${active ? "text-[var(--brand-primary)]" : "text-gray-400"} ${isOpen ? "rotate-90" : ""}`} />
        </div>
      </button>
    );
  };

  const CheckboxRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} className="w-full flex items-center justify-between py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
      <span>{label}</span>
      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${checked ? "bg-[var(--brand-primary)] border-[var(--brand-primary)]" : "border-gray-300"}`}>
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
    </button>
  );

  const RadioRow = ({ label, selected, onSelect, children }: { label: string; selected: boolean; onSelect: () => void; children?: React.ReactNode }) => (
    <button onClick={onSelect} className={`w-full flex items-center justify-between py-3 text-sm rounded-lg px-2 -mx-2 transition-colors ${selected ? "bg-gray-50 text-[var(--brand-primary)] font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
      <div className="flex items-center gap-2">{children}<span>{label}</span></div>
      {selected && <Check className="w-4 h-4 text-[var(--brand-primary)]" />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ isolation: "isolate" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden" style={{ maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ flexShrink: 0 }} className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto" }} className="overscroll-contain px-5 py-3">
          {/* Category */}
          <GroupHeader title="Category" category="category" />
          {openGroup === "category" && (
            <div className="py-3 border-b border-gray-100">
              {availableCategories.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No categories available</p>
              ) : (
                availableCategories.map((cat) => (
                  <RadioRow key={cat.id} label={cat.path.join(" > ")} selected={filters.categoryId === cat.id} onSelect={() => { update("categoryId", cat.id); update("categoryPath", cat.path); }} />
                ))
              )}
            </div>
          )}

          {/* Price */}
          <GroupHeader title="Price Range" category="price" />
          {openGroup === "price" && (
            <div className="py-3 border-b border-gray-100 space-y-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Min</label>
                  <input type="number" placeholder="₱0" value={tempMinPrice} onChange={(e) => setTempMinPrice(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--brand-primary)]" />
                </div>
                <span className="text-gray-400 pb-2">–</span>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Max</label>
                  <input type="number" placeholder="₱99,999+" value={tempMaxPrice} onChange={(e) => setTempMaxPrice(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--brand-primary)]" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Quick Select</p>
                <div className="flex flex-wrap gap-2">
                  {PRICE_RANGES.map((r) => (
                    <button key={r.label} onClick={() => { setTempMinPrice(r.min?.toString() || ""); setTempMaxPrice(r.max?.toString() || ""); }} className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${tempMinPrice === (r.min?.toString() || "") && tempMaxPrice === (r.max?.toString() || "") ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white" : "border-gray-200 text-gray-700 hover:border-gray-300"}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rating */}
          <GroupHeader title="Ratings" category="rating" />
          {openGroup === "rating" && (
            <div className="py-3 border-b border-gray-100">
              {RATING_OPTIONS.map((opt) => (
                <RadioRow key={opt.value} label={opt.label} selected={filters.minRating === opt.value} onSelect={() => update("minRating", opt.value)}>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < opt.stars ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} />
                    ))}
                  </div>
                </RadioRow>
              ))}
            </div>
          )}

          {/* Shipped From */}
          <GroupHeader title="Shipped From" category="location" />
          {openGroup === "location" && (
            <div className="py-3 border-b border-gray-100">
              {[{ id: "philippines", label: "Philippines" }, { id: "metro_manila", label: "Metro Manila" }].map((opt) => (
                <RadioRow key={opt.id} label={opt.label} selected={filters.shippedFrom === opt.id} onSelect={() => update("shippedFrom", filters.shippedFrom === opt.id ? null : opt.id)} />
              ))}
            </div>
          )}

          {/* Shops & Promos */}
          <GroupHeader title="Shops & Promos" category="promo" />
          {openGroup === "promo" && (
            <div className="py-3 border-b border-gray-100">
              {!hidePromoOptions.includes("onSale") && <CheckboxRow label="On Sale" checked={filters.onSale} onChange={() => update("onSale", !filters.onSale)} />}
              <CheckboxRow label="Free Shipping" checked={filters.freeShipping} onChange={() => update("freeShipping", !filters.freeShipping)} />
              <CheckboxRow label="With Vouchers" checked={filters.withVouchers} onChange={() => update("withVouchers", !filters.withVouchers)} />
              <CheckboxRow label="Preferred Seller" checked={filters.preferredSeller} onChange={() => update("preferredSeller", !filters.preferredSeller)} />
              <CheckboxRow label="Official Store" checked={filters.officialStore} onChange={() => update("officialStore", !filters.officialStore)} />
            </div>
          )}

          {/* Shipping */}
          <GroupHeader title="Shipping Option" category="shipping" />
          {openGroup === "shipping" && (
            <div className="py-3 border-b border-gray-100">
              <CheckboxRow label="Standard Delivery" checked={filters.standardDelivery} onChange={() => update("standardDelivery", !filters.standardDelivery)} />
              <CheckboxRow label="Same Day Delivery" checked={filters.sameDayDelivery} onChange={() => update("sameDayDelivery", !filters.sameDayDelivery)} />
              <CheckboxRow label="Cash on Delivery (COD)" checked={filters.cashOnDelivery} onChange={() => update("cashOnDelivery", !filters.cashOnDelivery)} />
              <CheckboxRow label="Pickup Available" checked={filters.pickupAvailable} onChange={() => update("pickupAvailable", !filters.pickupAvailable)} />
            </div>
          )}

          <div className="h-6" />
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0 }} className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <Button variant="outline" onClick={handleReset} className="flex-1 h-11 rounded-xl font-semibold">Reset</Button>
          <Button onClick={handleApply} className="flex-1 h-11 rounded-xl font-semibold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white">
            Apply{getActiveCount() > 0 ? ` (${getActiveCount()})` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
