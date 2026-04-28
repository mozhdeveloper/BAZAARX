/**
 * Seller Store Helpers
 * Shared helper functions, constants, and mappers used across seller stores.
 */
import { getSafeImageUrl } from '@/utils/imageUtils';
import type { Seller, SellerProduct, SellerOrder } from './sellerTypes';

// Optional fallback seller ID for Supabase inserts (set VITE_SUPABASE_SELLER_ID in .env for testing)
export const fallbackSellerId = (
    import.meta as { env?: { VITE_SUPABASE_SELLER_ID?: string } }
).env?.VITE_SUPABASE_SELLER_ID;

/**
 * Map database seller to Seller interface
 * Note: Actual schema has seller data split across:
 * - sellers: id, store_name, store_description, avatar_url, owner_name, approval_status
 * - seller_business_profiles: business_type, city, province, postal_code, business_address
 * - seller_payout_accounts: bank_name, account_name, account_number
 */
export const mapDbSellerToSeller = (s: any): Seller => {
    const bp = s.business_profile || s.seller_business_profiles || {};
    const pa = s.payout_account || s.seller_payout_accounts || {};
    const profile = s.profile || {};
    const profileFullName = [profile.first_name, profile.last_name]
        .filter((part: string | null | undefined) => Boolean(part?.trim()))
        .join(" ")
        .trim();
    const resolvedOwnerName = profileFullName || s.owner_name || s.store_name || "Seller";
    const normalizedApprovalStatus =
        (s.approval_status as Seller["approvalStatus"]) || "pending";
    const isApprovedStatus =
        normalizedApprovalStatus === "verified" ||
        normalizedApprovalStatus === "approved";

    return {
        id: s.id,
        name: resolvedOwnerName,
        ownerName: resolvedOwnerName,
        email: profile.email || "",
        phone: s.store_contact_number || "",
        businessName: s.business_name === "My Store" ? "" : (s.business_name || ""),
        storeName: s.store_name === "My Store" ? "" : (s.store_name || ""),
        storeDescription: s.store_description || "",
        storeCategory: [],
        businessType: bp.business_type || "",
        businessRegistrationNumber: bp.business_registration_number || "",
        taxIdNumber: bp.tax_id_number || "",
        businessAddress: bp.business_address || "",
        city: bp.city || "",
        province: bp.province || "",
        postalCode: bp.postal_code || "",
        storeAddress: bp.business_address || "",
        bankName: pa.bank_name || "",
        accountName: pa.account_name || "",
        accountNumber: pa.account_number || "",
        isVerified: Boolean(s.is_verified) || isApprovedStatus,
        approvalStatus: normalizedApprovalStatus,
        rating: 0, // Computed from reviews
        totalSales: 0, // Computed from orders
        joinDate:
            s.verified_at ||
            s.created_at ||
            new Date().toISOString().split("T")[0],
        avatar: getSafeImageUrl(s.avatar_url),
        banner: s.store_banner_url || undefined,
        // Vacation mode
        isVacationMode: s.is_vacation_mode === true,
        vacationReason: s.vacation_reason || null,
    };
};

/**
 * Build product insert for database
 * Note: Products table structure:
 * - Required: name, price, category_id
 * - Optional: description, brand, sku, specifications, weight, etc.
 * - Images and variants go to separate tables
 */
export const buildProductInsert = (
    product: Omit<
        SellerProduct,
        "id" | "createdAt" | "updatedAt" | "sales" | "rating" | "reviews"
    > & {
        hasWarranty?: boolean;
        warrantyType?: string;
        warrantyDurationMonths?: number;
        warrantyProviderName?: string | null;
        warrantyProviderContact?: string | null;
        warrantyProviderEmail?: string | null;
        warrantyTermsUrl?: string | null;
        warrantyPolicy?: string | null;
    },
    sellerId: string,
    categoryId: string,
): any => {
    const baseData: any = {
        name: product.name,
        description: product.description,
        price: product.price,
        category_id: categoryId,
        brand: null,
        sku: null,
        seller_id: sellerId,
        approval_status: product.isDraft ? "draft" : "pending",
        low_stock_threshold: 10,
        specifications: {},
        variant_label_1: product.variantLabel1 || null,
        variant_label_2: product.variantLabel2 || null,
        weight: null,
        dimensions: null,
        is_free_shipping: false,
    };

    // Only include warranty fields if warranty is explicitly enabled
    // This allows the frontend to work even if the database migration hasn't been applied yet
    if (product.hasWarranty === true) {
        baseData.has_warranty = true;
        if (product.warrantyType) {
            baseData.warranty_type = product.warrantyType;
        }
        if (product.warrantyDurationMonths) {
            baseData.warranty_duration_months = product.warrantyDurationMonths;
        }
        if (product.warrantyProviderName) {
            baseData.warranty_provider_name = product.warrantyProviderName;
        }
        if (product.warrantyProviderContact) {
            baseData.warranty_provider_contact = product.warrantyProviderContact;
        }
        if (product.warrantyProviderEmail) {
            baseData.warranty_provider_email = product.warrantyProviderEmail;
        }
        if (product.warrantyTermsUrl) {
            baseData.warranty_terms_url = product.warrantyTermsUrl;
        }
        if (product.warrantyPolicy) {
            baseData.warranty_policy = product.warrantyPolicy;
        }
    }

    return baseData;
};

/**
 * Map seller product updates to database updates
 * Note: Many fields (images, variants) go to separate tables
 */
export const mapSellerUpdatesToDb = (updates: Partial<SellerProduct>): any => {
    const dbUpdates: any = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined)
        dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.isActive !== undefined)
        dbUpdates.disabled_at = updates.isActive
            ? null
            : new Date().toISOString();
    if (updates.approvalStatus !== undefined)
        dbUpdates.approval_status = updates.approvalStatus;
    if (updates.variantLabel1 !== undefined)
        dbUpdates.variant_label_1 = updates.variantLabel1;
    if (updates.variantLabel2 !== undefined)
        dbUpdates.variant_label_2 = updates.variantLabel2;

    return dbUpdates;
};

// Validation helpers for database readiness
export const validateOrder = (order: Omit<SellerOrder, "id">): boolean => {
    if (!order.buyerName?.trim()) return false;
    if (!order.buyerEmail?.trim() || !order.buyerEmail.includes("@"))
        return false;
    if (!order.items || order.items.length === 0) return false;
    if (!order.shippingAddress || !order.shippingAddress.fullName) return false;
    if (order.total <= 0) return false;
    return true;
};

export const sanitizeOrder = (
    order: Omit<SellerOrder, "id">,
): Omit<SellerOrder, "id"> => {
    return {
        ...order,
        buyerName: order.buyerName.trim(),
        buyerEmail: order.buyerEmail.trim().toLowerCase(),
        items: order.items.map((item) => ({
            ...item,
            productName: item.productName.trim(),
            quantity: Math.max(1, Math.floor(item.quantity)),
            price: Math.max(0, item.price),
        })),
        total: Math.max(0, order.total),
        orderDate: order.orderDate || new Date().toISOString(),
    };
};

// Dummy data removed for database parity
export const dummyOrders: SellerOrder[] = [];
