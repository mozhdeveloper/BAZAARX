/**
 * Seller Store Types
 * Shared type definitions for all seller domain stores.
 */
import type { PaymentStatus, ShipmentStatus, VacationReason } from '@/types/database.types';

// Types
export interface Seller {
    id: string;

    // Personal Info
    name: string;
    ownerName: string;
    email: string;
    phone: string;

    // Business Info
    businessName: string;
    storeName: string;
    storeDescription: string;
    storeCategory: string[];
    businessType: string;
    businessRegistrationNumber: string;
    taxIdNumber: string;

    // Address
    businessAddress: string;
    city: string;
    province: string;
    postalCode: string;
    storeAddress: string; // Combined address

    // Banking
    bankName: string;
    accountName: string;
    accountNumber: string;

    // Document URLs
    businessPermitUrl?: string;
    validIdUrl?: string;
    proofOfAddressUrl?: string;
    dtiRegistrationUrl?: string;
    taxIdUrl?: string;

    // Status
    isVerified: boolean;
    approvalStatus:
    | "pending"
    | "approved"
    | "verified"
    | "rejected"
    | "needs_resubmission"
    | "blacklisted";
    rating: number;
    totalSales: number;
    joinDate: string;
    avatar?: string;
    banner?: string;

    // Vacation Mode
    isVacationMode?: boolean;
    vacationReason?: VacationReason | null;

    latestRejection?: {
        description?: string;
        items?: { documentField: string; reason?: string }[];
    } | null;
}

export interface SellerProduct {
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    stock: number;
    category: string;
    images: string[];
    variantLabel1Values?: string[];
    variantLabel2Values?: string[];
    isActive: boolean;
    sellerId: string;
    createdAt: string;
    updatedAt: string;
    sales: number;
    rating: number;
    reviews: number;
    approvalStatus?: "pending" | "approved" | "rejected" | "reclassified" | "draft";
    rejectionReason?: string;
    vendorSubmittedCategory?: string;
    adminReclassifiedCategory?: string;
    sellerName?: string;
    sellerRating?: number;
    sellerLocation?: string;
    variantLabel1?: string;
    variantLabel2?: string;
    variants?: {
        id: string;
        name?: string;
        variantLabel1Value?: string;
        variantLabel2Value?: string;
        price: number;
        stock: number;
        image?: string;
        sku?: string;
    }[];
    campaignDiscount?: {
        discountType: string;
        discountValue: number;
        maxDiscountAmount?: number;
    } | null;
    // Warranty fields
    hasWarranty?: boolean;
    warrantyType?: string;
    warrantyDurationMonths?: number;
    warrantyProviderName?: string;
    warrantyProviderContact?: string;
    warrantyProviderEmail?: string;
    warrantyTermsUrl?: string;
    warrantyPolicy?: string;
    isDraft?: boolean;
    isVacationMode?: boolean;
}

export interface SellerOrder {
    id: string;
    seller_id?: string; // UUID of the seller for database updates
    buyer_id?: string; // UUID of the buyer for notifications
    orderNumber?: string;
    buyerName: string;
    buyerEmail: string;
    buyerProfileImage?: string;
    items: {
        productId: string;
        productName: string;
        quantity: number;
        price: number;
        image: string;
        selectedVariantLabel1?: string;
        selectedVariantLabel2?: string;
    }[];
    total: number;
    status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned" | "reviewed";
    paymentStatus: "pending" | "paid" | "refunded";
    paymentMethod?: "cash" | "card" | "ewallet" | "bank_transfer" | "cod" | "online" | "gcash" | "maya" | "paymaya" | "grab_pay"; // Payment method used
    orderDate: string;
    shippingAddress: {
        fullName: string;
        street: string;
        city: string;
        province: string;
        postalCode: string;
        phone: string;
    };
    trackingNumber?: string;
    shipmentStatusRaw?: ShipmentStatus;
    paymentStatusRaw?: PaymentStatus;
    shippedAt?: string;
    deliveredAt?: string;
    rating?: number; // 1-5 stars from buyer after delivery
    reviewComment?: string;
    reviewImages?: string[];
    reviewDate?: string;
    reviews?: {
        id: string;
        productId: string | null;
        rating: number;
        comment: string;
        images: string[];
        submittedAt: string;
    }[];
    type?: "ONLINE" | "OFFLINE"; // POS-Lite: Track order source
    posNote?: string; // POS-Lite: Optional note for offline sales
    notes?: string; // Unified notes field
    is_registry_order?: boolean; // True when this is a registry gift order — address is privacy-protected
}

// Inventory Ledger - Immutable audit trail for all stock changes
export interface InventoryLedgerEntry {
    id: string;
    timestamp: string;
    productId: string;
    productName: string;
    changeType:
    | "DEDUCTION"
    | "ADDITION"
    | "ADJUSTMENT"
    | "RESERVATION"
    | "RELEASE";
    quantityBefore: number;
    quantityChange: number;
    quantityAfter: number;
    reason:
    | "ONLINE_SALE"
    | "OFFLINE_SALE"
    | "MANUAL_ADJUSTMENT"
    | "STOCK_REPLENISHMENT"
    | "ORDER_CANCELLATION"
    | "RESERVATION";
    referenceId: string; // Order ID or adjustment ID
    userId: string; // Seller ID or 'SYSTEM'
    notes?: string;
}

// Low Stock Alert
export interface LowStockAlert {
    id: string;
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
    timestamp: string;
    acknowledged: boolean;
}

export interface SellerStats {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    avgRating: number;
    monthlyRevenue: { month: string; revenue: number }[];
    topProducts: { name: string; sales: number; revenue: number }[];
    recentActivity: {
        id: string;
        type: "order" | "product" | "review";
        message: string;
        time: string;
    }[];
}
