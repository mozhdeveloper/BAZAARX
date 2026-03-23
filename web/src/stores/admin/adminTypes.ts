/**
 * Admin Store Types
 * Shared type definitions for all admin domain stores.
 */

export type SellerDocumentField =
  | 'business_permit_url'
  | 'valid_id_url'
  | 'proof_of_address_url'
  | 'dti_registration_url'
  | 'tax_id_url';

export interface PartialSellerRejectionInput {
  note?: string;
  items: {
    documentField: SellerDocumentField;
    reason?: string;
  }[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'qa_team';
  avatar?: string;
  lastLogin?: Date;
  permissions: AdminPermission[];
}

export interface AdminPermission {
  id: string;
  name: string;
  resource: 'users' | 'sellers' | 'categories' | 'products' | 'orders' | 'analytics';
  actions: ('read' | 'write' | 'delete' | 'approve')[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  icon: string;
  parentId?: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  productsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Seller {
  id: string;
  businessName: string;
  storeName: string;
  storeDescription: string;
  storeCategory: string[];
  businessType: 'sole_proprietor' | 'partnership' | 'corporation' | string;
  businessRegistrationNumber: string;
  taxIdNumber: string;
  description: string;
  logo?: string;
  ownerName: string;
  email: string;
  phone: string;
  businessAddress: string;
  city: string;
  province: string;
  postalCode: string;
  address: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'needs_resubmission' | 'blacklisted';
  documents: SellerDocument[];
  metrics: SellerMetrics;
  joinDate: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  suspendedAt?: Date;
  suspendedBy?: string;
  suspensionReason?: string;
  tierLevel?: 'standard' | 'premium_outlet';
  bypassesAssessment?: boolean;
  reapplicationAttempts?: number;
  cooldownCount?: number;
  tempBlacklistCount?: number;
  blacklistedAt?: Date;
  coolDownUntil?: Date;
  tempBlacklistUntil?: Date;
  isPermanentlyBlacklisted?: boolean;
}

export interface SellerDocument {
  id: string;
  field: SellerDocumentField;
  type: string;
  fileName: string;
  url: string;
  uploadDate: Date;
  isVerified: boolean;
  isRejected?: boolean;
  rejectionReason?: string;
  wasResubmitted?: boolean;
}

export interface SellerMetrics {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  rating: number;
  responseRate: number;
  fulfillmentRate: number;
}

export interface SellerRejectionRecord {
  id: string;
  seller_id: string;
  description: string | null;
  rejection_type: 'full' | 'partial';
  created_at: string;
  created_by: string | null;
  items?: {
    document_field: SellerDocumentField;
    reason: string | null;
    created_at: string | null;
  }[];
}

export const SELLER_DOCUMENT_CONFIG: {
  field: SellerDocumentField;
  type: string;
  fileName: string;
  label: string;
}[] = [
  { field: 'business_permit_url', type: 'business_permit', fileName: 'business-permit', label: 'Business Permit' },
  { field: 'valid_id_url', type: 'valid_id', fileName: 'valid-id', label: 'Valid ID' },
  { field: 'proof_of_address_url', type: 'proof_of_address', fileName: 'proof-of-address', label: 'Proof of Address' },
  { field: 'dti_registration_url', type: 'dti_registration', fileName: 'dti-registration', label: 'DTI/SEC Registration' },
  { field: 'tax_id_url', type: 'tax_id', fileName: 'tax-id', label: 'BIR Tax ID (TIN)' },
];

export const DOCUMENT_FIELD_LABELS: Record<SellerDocumentField, string> = {
  business_permit_url: 'Business Permit',
  valid_id_url: 'Valid ID',
  proof_of_address_url: 'Proof of Address',
  dti_registration_url: 'DTI/SEC Registration',
  tax_id_url: 'BIR Tax ID (TIN)',
};

export const toUiSellerStatus = (
  status: string | null | undefined,
  latestRejectionType?: 'full' | 'partial',
): Seller['status'] => {
  if (status === 'verified' || status === 'approved') return 'approved';
  if (status === 'blacklisted') return 'blacklisted';
  if (status === 'needs_resubmission') return 'needs_resubmission';
  if (status === 'rejected' && latestRejectionType === 'partial') return 'needs_resubmission';
  if (status === 'rejected') return 'rejected';
  if (status === 'suspended') return 'suspended';
  return 'pending';
};

export interface Buyer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: 'active' | 'suspended' | 'banned';
  addresses: BuyerAddress[];
  metrics: BuyerMetrics;
  joinDate: Date;
  lastActivity?: Date;
}

export interface BuyerAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  zipCode: string;
  isDefault: boolean;
}

export interface BuyerMetrics {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  cancelledOrders: number;
  returnedOrders: number;
  bazcoins: number;
}

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minPurchase: number;
  maxDiscount?: number;
  usageLimit: number;
  claimLimit?: number | null;
  usedCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  applicableTo: 'all' | 'category' | 'seller' | 'product';
  targetIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string;
  sellerId: string;
  sellerName: string;
  rating: number;
  title: string;
  content: string;
  images: string[];
  isVerifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderationNote?: string;
  helpfulCount: number;
  reportCount: number;
  createdAt: Date;
  moderatedAt?: Date;
  moderatedBy?: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  status: 'active' | 'inactive' | 'banned';
  rating: number;
  sales: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payout {
  id: string;
  referenceNumber: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  periodStart: Date;
  periodEnd: Date;
  payoutDate?: Date;
  bankName: string;
  accountNumber: string;
}
