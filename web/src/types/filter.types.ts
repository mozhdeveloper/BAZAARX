export interface PriceRange {
  min: number | null;
  max: number | null;
}

export type RatingFilter = 5 | 4 | 3 | 2 | 1 | null;

export interface ProductFilters {
  categoryId: string | null;
  categoryPath: string[];
  priceRange: PriceRange;
  minRating: RatingFilter;
  shippedFrom: string | null;
  withVouchers: boolean;
  onSale: boolean;
  freeShipping: boolean;
  preferredSeller: boolean;
  officialStore: boolean;
  selectedBrands: string[];
  standardDelivery: boolean;
  sameDayDelivery: boolean;
  cashOnDelivery: boolean;
  pickupAvailable: boolean;
}

export type SortOption =
  | "relevance"
  | "price-low"
  | "price-high"
  | "rating-high"
  | "newest"
  | "best-selling";

export interface ActiveFilterChip {
  id: string;
  label: string;
  category: FilterCategory;
}

export type FilterCategory =
  | "category"
  | "price"
  | "rating"
  | "location"
  | "promo"
  | "brand"
  | "shipping";

export const DEFAULT_FILTERS: ProductFilters = {
  categoryId: null,
  categoryPath: [],
  priceRange: { min: null, max: null },
  minRating: null,
  shippedFrom: null,
  withVouchers: false,
  onSale: false,
  freeShipping: false,
  preferredSeller: false,
  officialStore: false,
  selectedBrands: [],
  standardDelivery: false,
  sameDayDelivery: false,
  cashOnDelivery: false,
  pickupAvailable: false,
};

export const PRICE_RANGES = [
  { label: "₱0–₱500", min: 0, max: 500 },
  { label: "₱500–₱1,000", min: 500, max: 1000 },
  { label: "₱1,000–₱5,000", min: 1000, max: 5000 },
  { label: "₱5,000+", min: 5000, max: null },
] as const;

export const RATING_OPTIONS: { label: string; value: RatingFilter; stars: number }[] = [
  { label: "5 Stars", value: 5, stars: 5 },
  { label: "4 Stars & up", value: 4, stars: 4 },
  { label: "3 Stars & up", value: 3, stars: 3 },
  { label: "2 Stars & up", value: 2, stars: 2 },
  { label: "1 Star & up", value: 1, stars: 1 },
];

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "rating-high", label: "Top Rated" },
  { value: "best-selling", label: "Best Selling" },
];
