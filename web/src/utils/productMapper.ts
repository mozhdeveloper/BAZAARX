/**
 * Product Mapper Utility
 *
 * Maps Supabase DB rows (products, product_variants, product_images)
 * to the application TypeScript interfaces.
 *
 * Includes a legacy mapper that translates old color/size fields
 * to the new variantLabel1Value/variantLabel2Value naming.
 *
 * Also provides NormalizedProductDetail — the single typed shape
 * consumed by ProductDetailPage — and mappers from every source
 * (DB, sellerStore, buyerStore demo data).
 */

import type { SellerProduct } from "@/stores/sellerStore";
import type { ProductWithSeller, ProductImage } from "@/types/database.types";
import type {
    Product as BuyerProduct,
    Seller as BuyerSeller,
} from "@/stores/buyerStore";

// ─── Variant Shape ────────────────────────────────────────────────────────────

export interface AppVariant {
    id: string;
    name?: string;
    variantLabel1Value?: string;
    variantLabel2Value?: string;
    price: number;
    stock: number;
    image?: string;
    sku?: string;
}

// ─── Legacy Mappers ───────────────────────────────────────────────────────────

/**
 * Map a single legacy variant that uses `size`/`color` fields
 * to the new `variantLabel1Value`/`variantLabel2Value` naming.
 */
export const mapLegacyVariant = (v: any): AppVariant => ({
    id: v.id,
    name: v.variant_name || v.name,
    variantLabel1Value: v.size ?? undefined,
    variantLabel2Value: v.color ?? undefined,
    price: v.price || 0,
    stock: v.stock || 0,
    image: v.thumbnail_url || v.image,
    sku: v.sku,
});

/**
 * Map legacy product-level `colors`/`sizes` arrays
 * to `variantLabel1Values`/`variantLabel2Values`.
 */
export const mapLegacyProductAttributes = (
    p: any,
): {
    variantLabel1Values: string[];
    variantLabel2Values: string[];
} => {
    const variants: any[] = Array.isArray(p.variants) ? p.variants : [];
    return {
        variantLabel1Values: Array.from(
            new Set(
                variants
                    .map((v: any) => v.size)
                    .filter(
                        (s): s is string =>
                            typeof s === "string" && s.length > 0,
                    ),
            ),
        ),
        variantLabel2Values: Array.from(
            new Set(
                variants
                    .map((v: any) => v.color)
                    .filter(
                        (c): c is string =>
                            typeof c === "string" && c.length > 0,
                    ),
            ),
        ),
    };
};

// ─── DB Variant Mapper ────────────────────────────────────────────────────────

/**
 * Map a single DB variant row to AppVariant.
 *
 * Prefers `option_1_value`/`option_2_value` (new schema).
 * Falls back to `size`/`color` (legacy) via mapLegacyVariant.
 */
export const mapDbVariantToAppVariant = (v: any): AppVariant => {
    const hasOptionValues =
        v.option_1_value != null || v.option_2_value != null;

    if (hasOptionValues) {
        return {
            id: v.id,
            name: v.variant_name || v.name,
            variantLabel1Value: v.option_1_value ?? undefined,
            variantLabel2Value: v.option_2_value ?? undefined,
            price: v.price || 0,
            stock: v.stock || 0,
            image: v.thumbnail_url || v.image,
            sku: v.sku,
        };
    }

    // Fallback to legacy mapping
    return mapLegacyVariant(v);
};

// ─── Main Product Mapper ──────────────────────────────────────────────────────

/**
 * Map a database product row (with joined images, variants, category, seller)
 * to the application `SellerProduct` interface.
 *
 * Uses `option_1_value`/`option_2_value` for variant attributes when available,
 * falling back to legacy `size`/`color` via the legacy mapper.
 */
export const mapDbProductToSellerProduct = (p: any): SellerProduct => {
    // Handle images from product_images relation
    const images = Array.isArray(p.images)
        ? p.images.map((img: any) =>
              typeof img === "string" ? img : img.image_url,
          )
        : [];

    // Handle variants
    const rawVariants: any[] = Array.isArray(p.variants) ? p.variants : [];
    const variants = rawVariants.map(mapDbVariantToAppVariant);

    // Extract unique attribute values from mapped variants
    const variantLabel1Values: string[] = Array.from(
        new Set(
            variants
                .map((v) => v.variantLabel1Value)
                .filter(
                    (s): s is string => typeof s === "string" && s.length > 0,
                ),
        ),
    );
    const variantLabel2Values: string[] = Array.from(
        new Set(
            variants
                .map((v) => v.variantLabel2Value)
                .filter(
                    (c): c is string => typeof c === "string" && c.length > 0,
                ),
        ),
    );

    const totalStock = rawVariants.reduce(
        (sum: number, v: any) => sum + (v.stock || 0),
        0,
    );

    // Get category name from relation
    const categoryName =
        typeof p.category === "string"
            ? p.category
            : p.category?.name || p.categories?.name || "";

    return {
        id: p.id,
        name: p.name || "",
        description: p.description || "",
        price: Number(p.price ?? 0),
        originalPrice: undefined,
        stock: totalStock || p.stock || 0,
        category: categoryName,
        images: images,
        variantLabel1Values: variantLabel1Values,
        variantLabel2Values: variantLabel2Values,
        isActive: !p.disabled_at,
        sellerId: p.seller_id || "",
        createdAt: p.created_at || "",
        updatedAt: p.updated_at || "",
        sales: p.sales || p.sold || p.sold_count || 0, // Preserve sold count from transformProduct
        rating: p.rating || 0,
        reviews: p.reviewCount || 0,
        approvalStatus:
            (p.approval_status as SellerProduct["approvalStatus"]) || "pending",
        rejectionReason: undefined,
        vendorSubmittedCategory: undefined,
        adminReclassifiedCategory: undefined,
        sellerName: p.sellerName || p.seller?.store_name,
        sellerRating: 0,
        sellerLocation: p.sellerLocation || p.seller?.business_profile?.city,
        variantLabel1: p.variant_label_1 || undefined,
        variantLabel2: p.variant_label_2 || undefined,
        variants: variants,
    };
};

// ═══════════════════════════════════════════════════════════════════════════════
// NormalizedProductDetail — single shape consumed by ProductDetailPage
// ═══════════════════════════════════════════════════════════════════════════════

/** A variant-label-2 option with its preview thumbnail. */
export interface Label2Option {
    name: string;
    value: string;
    image: string;
}

/**
 * The unified product shape that ProductDetailPage reads.
 * Every field the template touches is represented here so there are no
 * `(x as any)` casts or inline fallback chains in the page component.
 */
export interface NormalizedProductDetail {
    // Core
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    image: string;
    images: string[];
    category: string;

    // Metrics
    rating: number;
    reviewCount: number;
    sold: number;
    stock: number;

    // Seller references
    sellerId: string;
    seller: string; // seller display name
    sellerAvatar: string;
    sellerRating: number;
    location: string;
    isFreeShipping: boolean;
    isVerified: boolean;

    // Variant system
    variantLabel1?: string; // e.g. "Size"
    variantLabel2?: string; // e.g. "Color"
    label1Options: string[];
    label2Options: Label2Option[];
    variants: any[]; // raw DB / store variant rows

    // Extras
    features: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLACEHOLDER_IMG = "https://placehold.co/400?text=Product";

/** Extract a flat string[] of image URLs from DB ProductImage[] or plain string[]. */
const extractImages = (raw: any[] | undefined): string[] => {
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return raw
        .map((img: any) => (typeof img === "string" ? img : img?.image_url))
        .filter(Boolean) as string[];
};

/**
 * Build Label2Option[] from raw variant rows.
 * Groups by the label-2 field (color / option_2_value) and grabs the first
 * thumbnail for each unique value.
 */
const buildLabel2Options = (
    variants: any[],
    fallbackImage: string,
): Label2Option[] => {
    const seen = new Map<string, Label2Option>();
    for (const v of variants) {
        const label2 =
            v.option_2_value ?? v.color ?? v.variantLabel2Value ?? "";
        if (!label2) continue;
        if (seen.has(label2)) continue;
        seen.set(label2, {
            name: label2,
            value: label2,
            image: v.thumbnail_url || v.image || fallbackImage,
        });
    }
    return Array.from(seen.values());
};

/** Extract unique label-1 values (size / option_1_value) from variants. */
const buildLabel1Options = (variants: any[]): string[] => {
    const set = new Set<string>();
    for (const v of variants) {
        const val = v.option_1_value ?? v.size ?? v.variantLabel1Value ?? "";
        if (val) set.add(val);
    }
    return Array.from(set);
};

/** Sensible features fallback. */
const DEFAULT_FEATURES = [
    "Free Shipping",
    "Verified Product",
    "Quality Guaranteed",
    "Share",
];

// ─── mapDbProductToNormalized ─────────────────────────────────────────────────

/**
 * Map the result of `productService.getProductById()` (a ProductWithSeller)
 * into a NormalizedProductDetail.
 */
export const mapDbProductToNormalized = (
    p: ProductWithSeller,
): NormalizedProductDetail => {
    const rawVariants: any[] = Array.isArray(p.variants) ? p.variants : [];
    const images = extractImages(p.images);
    const primaryImage =
        (p.images as ProductImage[] | undefined)?.find((i) => i.is_primary)
            ?.image_url ||
        images[0] ||
        PLACEHOLDER_IMG;

    const totalStock = rawVariants.reduce((sum, v) => sum + (v.stock || 0), 0);

    // Rating / review count may already be computed by transformProduct
    const rating = (p as any).rating ?? 0;
    const reviewCount = (p as any).reviewCount ?? 0;

    const label2Options = buildLabel2Options(rawVariants, primaryImage);
    const label1Options = buildLabel1Options(rawVariants);

    return {
        id: p.id,
        name: p.name,
        description: p.description || "",
        price: Number(p.price ?? 0),
        originalPrice: p.original_price ?? undefined,
        image: primaryImage,
        images: images.length > 0 ? images : [primaryImage],
        category:
            (typeof p.category === "object"
                ? p.category?.name
                : (p.category as unknown as string)) || "",

        rating,
        reviewCount,
        sold: (p as any).sales_count ?? 0,
        stock: totalStock || (p as any).stock || 0,

        sellerId: p.seller_id || "",
        seller:
            p.seller?.store_name || (p as any).sellerName || "Official Store",
        sellerAvatar:
            p.seller?.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${p.seller?.store_name || "Store"}`,
        sellerRating: 0,
        location:
            (p.seller?.business_profile as any)?.city ||
            (p as any).sellerLocation ||
            "Metro Manila",
        isFreeShipping: p.is_free_shipping ?? true,
        isVerified: true,

        variantLabel1: p.variant_label_1 || undefined,
        variantLabel2: p.variant_label_2 || undefined,
        label1Options,
        label2Options,
        variants: rawVariants,

        features: DEFAULT_FEATURES,
    };
};

// ─── mapDbProductToNormalizedLegacy ───────────────────────────────────────────

/**
 * Legacy version of mapDbProductToNormalized.
 *
 * If the product does not have `variant_label_1` / `variant_label_2` set,
 * it inspects the variant rows for legacy `size` / `color` fields and
 * auto-assigns the labels "Size" / "Color" so the UI still renders
 * variant selectors.  Use this from pages that may still receive
 * old-schema data (e.g. ProductDetailPage during migration).
 */
export const mapDbProductToNormalizedLegacy = (
    p: ProductWithSeller,
): NormalizedProductDetail => {
    const base = mapDbProductToNormalized(p);

    // If labels are already set, nothing to do
    if (base.variantLabel1 && base.variantLabel2) return base;

    const rawVariants: any[] = Array.isArray(p.variants) ? p.variants : [];

    // Detect legacy size / color presence in variant rows
    const hasSizeField = rawVariants.some(
        (v) => typeof v.size === "string" && v.size.length > 0,
    );
    const hasColorField = rawVariants.some(
        (v) => typeof v.color === "string" && v.color.length > 0,
    );

    return {
        ...base,
        variantLabel1:
            base.variantLabel1 || (hasSizeField ? "Size" : base.variantLabel1),
        variantLabel2:
            base.variantLabel2 ||
            (hasColorField ? "Color" : base.variantLabel2),
    };
};

// ─── mapSellerProductToNormalized ─────────────────────────────────────────────

/**
 * Map a SellerProduct (from useProductStore) to NormalizedProductDetail.
 */
export const mapSellerProductToNormalized = (
    p: SellerProduct,
): NormalizedProductDetail => {
    const rawVariants: any[] = Array.isArray(p.variants) ? p.variants : [];
    const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    const primaryImage = images[0] || PLACEHOLDER_IMG;

    const label2Options = buildLabel2Options(rawVariants, primaryImage);
    const label1Options =
        p.variantLabel1Values && p.variantLabel1Values.length > 0
            ? p.variantLabel1Values
            : buildLabel1Options(rawVariants);

    // If variantLabel2Values exist but label2Options are empty (no variants),
    // build them from the product-level arrays.
    const finalLabel2Options =
        label2Options.length > 0
            ? label2Options
            : (p.variantLabel2Values || []).map((name) => ({
                  name,
                  value: name,
                  image: primaryImage,
              }));

    return {
        id: p.id,
        name: p.name,
        description: p.description || "",
        price: p.price,
        originalPrice: p.originalPrice,
        image: primaryImage,
        images: images.length > 0 ? images : [primaryImage],
        category: p.category || "",

        rating: p.rating || 0,
        reviewCount: p.reviews || 0,
        sold: p.sales || 0,
        stock: p.stock || 0,

        sellerId: p.sellerId || "",
        seller: p.sellerName || "Official Store",
        sellerAvatar: `https://api.dicebear.com/7.x/initials/svg?seed=${p.sellerName || "Store"}`,
        sellerRating: p.sellerRating || 0,
        location: p.sellerLocation || "Metro Manila",
        isFreeShipping: true,
        isVerified: true,

        variantLabel1: p.variantLabel1,
        variantLabel2: p.variantLabel2,
        label1Options,
        label2Options: finalLabel2Options,
        variants: rawVariants,

        features: DEFAULT_FEATURES,
    };
};

// ─── mapBuyerProductToNormalized ──────────────────────────────────────────────

/**
 * Map a BuyerProduct (from demo data / buyerStore) to NormalizedProductDetail.
 */
export const mapBuyerProductToNormalized = (
    p: BuyerProduct,
): NormalizedProductDetail => {
    const images = Array.isArray(p.images)
        ? p.images.filter(Boolean)
        : p.image
          ? [p.image]
          : [];
    const primaryImage = images[0] || PLACEHOLDER_IMG;

    const rawVariants = Array.isArray(p.variants) ? p.variants : [];

    return {
        id: p.id,
        name: p.name,
        description: p.description || "",
        price: p.price,
        originalPrice: p.originalPrice,
        image: primaryImage,
        images: images.length > 0 ? images : [primaryImage],
        category: p.category || "",

        rating: p.rating || 0,
        reviewCount: p.totalReviews || 0,
        sold: p.sold || 0,
        stock: rawVariants.reduce((s, v) => s + (v.stock || 0), 0) || 100,

        sellerId: p.sellerId || p.seller?.id || "",
        seller: p.seller?.name || "Official Store",
        sellerAvatar:
            p.seller?.avatar ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${p.seller?.name || "Store"}`,
        sellerRating: p.seller?.rating || 0,
        location: p.location || p.seller?.location || "Metro Manila",
        isFreeShipping: p.isFreeShipping ?? true,
        isVerified: p.seller?.isVerified ?? true,

        variantLabel1: undefined,
        variantLabel2: undefined,
        label1Options: [],
        label2Options: [],
        variants: rawVariants,

        features: DEFAULT_FEATURES,
    };
};

// ─── mapNormalizedToBuyerProduct ──────────────────────────────────────────────

/**
 * Map a NormalizedProductDetail back to BuyerProduct format.
 * Used for operations that require the BuyerProduct interface (e.g., addToRegistry).
 */
export const mapNormalizedToBuyerProduct = (
    product: NormalizedProductDetail,
    seller: BuyerSeller,
): BuyerProduct => {
    return {
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        images: product.images,
        seller: seller,
        sellerId: product.sellerId,
        rating: product.rating,
        totalReviews: product.reviewCount,
        category: product.category,
        sold: product.sold,
        isFreeShipping: product.isFreeShipping,
        location: product.location,
        description: product.description,
        specifications: {},
        variants: product.variants || [],
    };
};

// ─── buildCurrentSeller ───────────────────────────────────────────────────────

/**
 * Construct a BuyerSeller object from normalized product data.
 * Used by ProductDetailPage for the seller card / chat integration.
 * If the sellerId matches a known demo seller, that is returned instead.
 */
export const buildCurrentSeller = (
    product: NormalizedProductDetail,
    demoSellers: BuyerSeller[],
): BuyerSeller => {
    const demo = demoSellers.find((s) => s.id === product.sellerId);
    if (demo) return demo;

    return {
        id: product.sellerId,
        name: product.seller,
        avatar: product.sellerAvatar,
        rating: product.sellerRating || 5.0,
        totalReviews: product.reviewCount,
        followers: 0,
        isVerified: product.isVerified,
        description: "Verified Seller on BazaarX",
        location: product.location,
        established: "2024",
        products: [],
        badges: ["Verified"],
        responseTime: "Within 24 hours",
        categories: [product.category || "General"],
    };
};
