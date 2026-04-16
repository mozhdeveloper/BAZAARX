// Product filtering and sorting types

export interface PriceRange {
  min: number | null;
  max: number | null;
}

export type RatingFilter = 5 | 4 | 3 | 2 | 1 | null;

export interface ProductFilters {
  // Category
  categoryId: string | null;
  categoryPath: string[]; // Full path for display [Main Category, Subcategory]
  
  // Price
  priceRange: PriceRange;
  
  // Rating
  minRating: RatingFilter;
  
  // Location
  shippedFrom: string | null; // 'Philippines', 'Metro Manila', etc.
  
  // Shops & Promos
  withVouchers: boolean;
  onSale: boolean;
  freeShipping: boolean;
  preferredSeller: boolean;
  officialStore: boolean;
  
  // Brand
  selectedBrands: string[];
  
  // Shipping
  standardDelivery: boolean;
  sameDayDelivery: boolean;
  cashOnDelivery: boolean;
  pickupAvailable: boolean;
}

export type SortOption = 
  | 'relevance'
  | 'price-low'
  | 'price-high'
  | 'rating-high'
  | 'newest'
  | 'best-selling';

export interface ActiveFilterChip {
  id: string;
  label: string;
  category: FilterCategory;
  onRemove: () => void;
}

export type FilterCategory = 
  | 'category'
  | 'price'
  | 'rating'
  | 'location'
  | 'promo'
  | 'brand'
  | 'shipping';

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
  { label: '₱0–₱500', min: 0, max: 500 },
  { label: '₱500–₱1,000', min: 500, max: 1000 },
  { label: '₱1,000–₱5,000', min: 1000, max: 5000 },
  { label: '₱5,000+', min: 5000, max: null },
] as const;

export const RATING_OPTIONS: { label: string; value: RatingFilter }[] = [
  { label: ' ⭐⭐⭐⭐⭐ 5 stars', value: 5 },
  { label: '⭐⭐⭐⭐ 4 stars & up', value: 4 },
  { label: '⭐⭐⭐ 3 stars & up', value: 3 },
  { label: '⭐⭐ 2 stars & up', value: 2 },
  { label: '⭐ 1 star & up', value: 1 },
];
