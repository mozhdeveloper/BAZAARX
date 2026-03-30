/**
 * Buyer Store Helpers
 * Shared helper functions and utilities for the buyer store.
 */
import type { RegistryPrivacy, RegistryDeliveryPreference, RegistryProduct, RegistryItem, Product, ProductVariant, CartItem, Seller } from './buyerTypes';

export const ensureRegistryProductDefaults = (product: Product | RegistryProduct): RegistryProduct => {
  const incoming = product as RegistryProduct;
  return {
    ...(product as Product),
    requestedQty: incoming.requestedQty ?? 1,
    receivedQty: incoming.receivedQty ?? 0,
    note: incoming.note,
    isMostWanted: incoming.isMostWanted ?? false,
    selectedVariant: incoming.selectedVariant,
    delivery: incoming.delivery,
  };
};

export const ensureRegistryDefaults = (registry: RegistryItem): RegistryItem => {
  const privacy = registry.privacy ?? 'link';
  const delivery = registry.delivery ?? { showAddress: false };
  const products = (registry.products || []).map(ensureRegistryProductDefaults);
  return { ...registry, privacy, delivery, products };
};

// Returns true when id is a real Postgres UUID (not a local temp id like Date.now())
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isRealUUID = (id: string) => UUID_REGEX.test(id);

// Maps a DB registry row (with nested registry_items) to the frontend RegistryItem shape
export const mapDbToRegistryProduct = (item: any): RegistryProduct => {
  const snapshot = item.product_snapshot || {};
  return ensureRegistryProductDefaults({
    ...snapshot,
    // Use registry_items.id as the local product identifier so update/delete can target the DB row
    id: item.id,
    name: item.product_name || snapshot.name || '',
    price: snapshot.price || 0,
    requestedQty: item.requested_qty ?? item.quantity_desired ?? 1,
    receivedQty: item.received_qty ?? 0,
    note: item.notes ?? snapshot.note,
    isMostWanted: item.is_most_wanted ?? false,
    selectedVariant: item.selected_variant ?? snapshot.selectedVariant,
  });
};

export const mapDbToRegistryItem = (row: any): RegistryItem => {
  console.log('[mapDbToRegistryItem] Raw DB row:', row);
  console.log('[mapDbToRegistryItem] row.privacy:', row.privacy);
  console.log('[mapDbToRegistryItem] row.delivery:', row.delivery);

  const result = ensureRegistryDefaults({
    id: row.id,
    title: row.title,
    sharedDate:
      row.shared_date ||
      new Date(row.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    imageUrl: row.image_url || '',
    category: row.category || row.event_type || '',
    privacy: (row.privacy as RegistryPrivacy) || 'link',
    delivery: row.delivery || { showAddress: false },
    products: (row.registry_items || []).map(mapDbToRegistryProduct),
  });

  console.log('[mapDbToRegistryItem] Mapped result:', result);
  return result;
};

type RawBuyerNameContext = {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  sellerOwnerName?: string | null;
};

export function deriveBuyerName(
  ctx: RawBuyerNameContext | null | undefined,
): {
  firstName: string;
  lastName: string;
  displayFullName: string;
} {
  if (!ctx) {
    return { firstName: "", lastName: "", displayFullName: "User" };
  }

  let firstName = (ctx.first_name ?? "").trim();
  let lastName = (ctx.last_name ?? "").trim();

  const full = (ctx.full_name ?? "").trim();

  if ((!firstName || !lastName) && full) {
    const parts = full.split(" ").filter(Boolean);
    if (!firstName && parts.length > 0) {
      firstName = parts[0];
    }
    if (!lastName && parts.length > 1) {
      lastName = parts.slice(1).join(" ");
    }
  }

  // Fallback to seller owner name (Seller → Buyer flow)
  const owner = (ctx.sellerOwnerName ?? "").trim();
  if ((!firstName || !lastName) && owner) {
    const parts = owner.split(" ").filter(Boolean);
    if (!firstName && parts.length > 0) {
      firstName = parts[0];
    }
    if (!lastName && parts.length > 1) {
      lastName = parts.slice(1).join(" ");
    }
  }

  // Fallback to email prefix for firstName
  if (!firstName) {
    const email = (ctx.email ?? "").trim();
    if (email && email.includes("@")) {
      firstName = email.split("@")[0];
    }
  }

  const displayFullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || "User";

  return { firstName, lastName, displayFullName };
}

export const mapDbItemToCartItem = (item: any): CartItem | null => {
  const dbProduct = item.product;
  if (!dbProduct) return null;

  const sellerData = dbProduct.seller;

  // Map the variant from DB (returned as "variant" from the join)
  const dbVariant = item.variant;
  const selectedVariant: ProductVariant | undefined = dbVariant ? {
    id: dbVariant.id,
    name: dbVariant.variant_name || dbVariant.name || [dbVariant.size, dbVariant.color].filter(Boolean).join(' / ') || 'Standard',
    price: dbVariant.price,
    stock: dbVariant.stock,
    image: dbVariant.thumbnail_url,
    // Additional fields for display
    size: dbVariant.size,
    color: dbVariant.color,
    sku: dbVariant.sku,
  } as ProductVariant : undefined;

  // Extract product image URL - images is an array of {image_url, is_primary, sort_order} objects
  const imagesArray = dbProduct.images || [];
  const primaryImage = imagesArray.find((img: any) => img.is_primary);
  const sortedImages = [...imagesArray].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
  const productImageUrl = primaryImage?.image_url || sortedImages[0]?.image_url || "";

  return {
    id: dbProduct.id,
    cartItemId: item.id,
    name: dbProduct.name,
    stock: dbProduct.stock || 0,
    price: selectedVariant?.price || dbProduct.price,
    originalPrice: dbProduct.original_price,
    image: selectedVariant?.image || productImageUrl,
    images: imagesArray.map((img: any) => img.image_url).filter(Boolean),
    seller: {
      id: dbProduct.seller_id,
      name: sellerData?.store_name || "Verified Seller",
      avatar: sellerData?.avatar_url || "",
      rating: sellerData?.rating || 0,
      totalReviews: 0,
      followers: 0,
      isVerified: sellerData?.approval_status === 'verified',
      description: "",
      location: sellerData?.business_address || "Metro Manila",
      established: "",
      products: [],
      badges: [],
      responseTime: "",
      categories: []
    },
    sellerId: dbProduct.seller_id,
    rating: dbProduct.average_rating || 0,
    totalReviews: dbProduct.review_count || 0,
    category: dbProduct.category_id || "",
    sold: dbProduct.sold_count || 0,
    isFreeShipping: dbProduct.is_free_shipping || false,
    location: sellerData?.business_address || "Metro Manila",
    description: dbProduct.description || "",
    specifications: dbProduct.specifications || {},
    variants: (dbProduct.variants || []).map((v: any) => ({
      id: v.id,
      name: v.variant_name || v.name || [v.size, v.color].filter(Boolean).join(' / ') || 'Standard',
      price: v.price,
      stock: v.stock,
      image: v.thumbnail_url,
      size: v.size,
      color: v.color,
    })),
    quantity: item.quantity,
    selectedVariant,
    notes: item.notes || "",
    selected: true,
    registryId: item.registry_id || undefined,
    createdAt: item.created_at || new Date().toISOString(),
  };
};

// Demo data — kept for legacy fallback usage
export const demoSellers: Seller[] = [
  {
    id: 'seller-001',
    name: 'TechHub Philippines',
    avatar: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop',
    rating: 4.8,
    totalReviews: 2540,
    followers: 15420,
    isVerified: true,
    description: 'Your trusted tech partner in the Philippines. We offer the latest gadgets, electronics, and tech accessories.',
    location: 'Makati, Metro Manila',
    established: '2018',
    badges: ['Top Seller', 'Fast Shipping', '24/7 Support'],
    responseTime: '< 1 hour',
    categories: ['Electronics', 'Gadgets', 'Computers', 'Mobile Accessories'],
    products: []
  },
  {
    id: 'seller-002',
    name: 'Fashion Forward',
    avatar: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=150&h=150&fit=crop',
    rating: 4.6,
    totalReviews: 1890,
    followers: 8750,
    isVerified: true,
    description: 'Trendy fashion for the modern Filipino. Discover the latest styles and timeless classics.',
    location: 'Quezon City, Metro Manila',
    established: '2020',
    badges: ['Trending Store', 'Quality Assured'],
    responseTime: '< 2 hours',
    categories: ['Fashion', 'Clothing', 'Shoes', 'Accessories'],
    products: []
  },
  {
    id: 'seller-003',
    name: 'Home & Living Co.',
    avatar: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=150&h=150&fit=crop',
    rating: 4.9,
    totalReviews: 3210,
    followers: 12300,
    isVerified: true,
    description: 'Transform your space with our curated selection of home decor, furniture, and living essentials.',
    location: 'Cebu City, Cebu',
    established: '2017',
    badges: ['Premium Store', 'Eco Friendly', 'Local Artisan'],
    responseTime: '< 30 minutes',
    categories: ['Home & Garden', 'Furniture', 'Decor', 'Kitchen'],
    products: []
  }
];
