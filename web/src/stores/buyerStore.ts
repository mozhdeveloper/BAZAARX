import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartService } from '@/services/cartService';
import { getCurrentUser, supabase } from '@/lib/supabase';
import { AddressService } from '@/services/addressService';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  images?: string[];
  timestamp: string;
  isRead: boolean;
}

// Registry Product Extension
export type RegistryPrivacy = 'public' | 'link' | 'private';

export interface RegistryDeliveryPreference {
  addressId?: string;
  showAddress: boolean;
  instructions?: string;
}

export interface RegistryProduct extends Product {
  requestedQty: number;
  receivedQty: number;
  note?: string;
  isMostWanted?: boolean;
  selectedVariant?: ProductVariant; // snapshot of the chosen variant
  delivery?: RegistryDeliveryPreference; // item-level override if ever needed
}

export interface RegistryItem {
  id: string;
  title: string;
  sharedDate: string;
  imageUrl: string;
  category?: string;
  products?: RegistryProduct[];
  privacy?: RegistryPrivacy;
  delivery?: RegistryDeliveryPreference;
}

const ensureRegistryProductDefaults = (product: Product | RegistryProduct): RegistryProduct => {
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

const ensureRegistryDefaults = (registry: RegistryItem): RegistryItem => {
  const privacy = registry.privacy ?? 'link';
  const delivery = registry.delivery ?? { showAddress: false };
  const products = (registry.products || []).map(ensureRegistryProductDefaults);
  return { ...registry, privacy, delivery, products };
};

export interface Conversation {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerImage?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
  isOnline: boolean;
}
export interface Seller {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  totalReviews: number;
  followers: number;
  isVerified: boolean;
  description: string;
  location: string;
  established: string;
  tierLevel?: string;
  products: Product[];
  badges: string[];
  responseTime: string;
  categories: string[];
}

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

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  stock: number;
  image: string;
  images: string[];
  seller: Seller;
  sellerId: string;
  rating: number;
  totalReviews: number;
  category: string;
  sold: number;
  isFreeShipping: boolean;
  location: string;
  description: string;
  specifications: Record<string, string>;
  variants: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  thumbnail_url?: string;
  size?: string;
  color?: string;
  option_1_value?: string;
  option_2_value?: string;
  attributes?: Record<string, string>; // optional snapshot of variant options (color/size)
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: ProductVariant;
  notes?: string;
  selected?: boolean;
  registryId?: string;
  createdAt?: string;
}

export interface GroupedCart {
  [sellerId: string]: {
    seller: Seller;
    items: CartItem[];
    subtotal: number;
    shippingFee: number;
    freeShippingEligible: boolean;
  };
}

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  type: 'percentage' | 'fixed' | 'shipping';
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  sellerId?: string; // null for platform vouchers
  validFrom: Date;
  validTo: Date;
  usageLimit: number;
  used: number;
  isActive: boolean;
}

export type VoucherValidationErrorCode =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'MIN_ORDER_NOT_MET'
  | 'SELLER_MISMATCH'
  | 'ALREADY_USED'
  | 'UNKNOWN';

export interface VoucherValidationResult {
  voucher: Voucher | null;
  errorCode: VoucherValidationErrorCode | null;
}

export interface Review {
  id: string;
  productId: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string;
  rating: number;
  comment: string;
  images: string[];
  helpful: number;
  reply?: {
    sellerId: string;
    sellerName: string;
    comment: string;
    date: Date;
  };
  date: Date;
  verified: boolean;
}

export interface Address {
  lastName: string;
  firstName: string;
  id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  region: string;
  postalCode: string;
  country?: string;
  isDefault: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  landmark?: string;
  deliveryInstructions?: string;
}

export interface BuyerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar: string;
  birthdate?: Date;
  gender?: 'male' | 'female' | 'other';
  preferences: {
    language: string;
    currency: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    privacy: {
      showProfile: boolean;
      showPurchases: boolean;
      showFollowing: boolean;
    };
    interestedCategories?: string[];
  };
  memberSince: Date;
  totalOrders: number;
  totalSpent: number;
  bazcoins: number;
  paymentMethods?: PaymentMethod[];
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet';
  brand: string; // Visa, MasterCard, GCash, Maya, etc.
  last4?: string; // For cards
  expiry?: string; // For cards
  accountNumber?: string; // For wallets (masked)
  isDefault: boolean;
}

interface BuyerStore {
  // Profile Management
  profile: BuyerProfile | null;
  setProfile: (profile: BuyerProfile) => void;
  updateProfile: (updates: Partial<BuyerProfile>) => void;
  logout: () => void;
  initializeCart: () => Promise<void>;

  notifications: any[];
  syncAddressesWithService: () => Promise<void>;

  // Address Book
  addresses: Address[];
  setAddresses: (addresses: Address[]) => void;
  addAddress: (address: Omit<Address, 'id' | 'fullName'> & { id?: string, fullName?: string }) => Promise<boolean>;
  updateAddress: (id: string, updates: Partial<Address>) => Promise<boolean>;
  deleteAddress: (id: string) => Promise<boolean>;
  setDefaultAddress: (id: string) => Promise<boolean>;


  // Following Shops
  followedShops: string[]; // seller IDs
  followShop: (sellerId: string) => Promise<void>;
  unfollowShop: (sellerId: string) => Promise<void>;
  isFollowing: (sellerId: string) => boolean;
  loadFollowedShops: () => Promise<void>;

  // Enhanced Cart with Multi-seller grouping
  cartItems: CartItem[];
  groupedCart: GroupedCart;
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, variantId?: string) => void;
  updateItemVariant: (productId: string, oldVariantId: string | undefined, newVariant: ProductVariant, quantity?: number) => Promise<void>;
  updateCartNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  getTotalCartItems: () => number;
  groupCartBySeller: () => void;

  // Quick Order (Buy Now)
  quickOrder: CartItem | null;
  setQuickOrder: (product: Product, quantity?: number, variant?: ProductVariant, registryId?: string) => void;
  clearQuickOrder: () => void;
  getQuickOrderTotal: () => number;

  // Buy Again Items (temporary state for direct checkout)
  buyAgainItems: CartItem[] | null;
  setBuyAgainItems: (items: CartItem[]) => void;
  clearBuyAgainItems: () => void;

  // Voucher System
  availableVouchers: Voucher[];
  appliedVouchers: { [sellerId: string]: Voucher }; // Per seller vouchers
  platformVoucher: Voucher | null; // Platform-wide voucher
  validateVoucher: (code: string, sellerId?: string) => Promise<Voucher | null>;
  validateVoucherDetailed: (code: string, sellerId?: string) => Promise<VoucherValidationResult>;
  applyVoucher: (voucher: Voucher, sellerId?: string) => void;
  removeVoucher: (sellerId?: string) => void;
  calculateDiscount: (subtotal: number, voucher: Voucher) => number;

  // Cart Selection
  toggleItemSelection: (productId: string, variantId?: string) => void;
  toggleSellerSelection: (sellerId: string, selected: boolean) => void;
  selectAllItems: (selected: boolean) => void;
  selectItemsExclusively: (productId: string[]) => void;
  removeSelectedItems: () => void;
  getSelectedTotal: () => number;
  getSelectedCount: () => number;

  // Reviews & Ratings
  reviews: Review[];
  pendingReviews: string[]; // product IDs
  addReview: (review: Omit<Review, 'id' | 'date' | 'helpful'>) => void;
  myReviews: Review[];
  submitReview: (review: Omit<Review, 'id' | 'date' | 'helpful'>) => void;
  updateReview: (reviewId: string, updates: Partial<Review>) => void;
  markReviewHelpful: (reviewId: string) => void;
  getProductReviews: (productId: string) => Review[];
  getSellerReviews: (sellerId: string) => Review[];

  // Seller Storefront
  viewedSellers: Seller[];
  getSellerDetails: (sellerId: string) => Seller | null;
  getSellerProducts: (sellerId: string, category?: string) => Product[];
  addViewedSeller: (seller: Seller) => void;

  // Real-time
  subscribeToProfile: (userId: string) => void;
  unsubscribeFromProfile: () => void;

  // Messaging
  conversations: Conversation[];
  addConversation: (conversation: Conversation) => void;
  updateConversation: (convId: string, updates: Partial<Conversation>) => void;
  addChatMessage: (convId: string, message: Message) => void;
  deleteConversation: (convId: string) => void;
  addCard: (card: PaymentMethod) => void;
  deleteCard: (id: string) => void;
  setDefaultPaymentMethod: (id: string) => void;

  // Registry & Gifting
  registries: RegistryItem[];
  createRegistry: (registry: RegistryItem) => void;
  updateRegistryMeta: (registryId: string, updates: Partial<RegistryItem>) => void;
  addToRegistry: (registryId: string, product: Product) => void;
  updateRegistryItem: (registryId: string, productId: string, updates: Partial<RegistryProduct>) => void;
  removeRegistryItem: (registryId: string, productId: string) => void;
  deleteRegistry: (registryId: string) => void;

  initializeBuyerProfile: (userId: string, profileData: any) => Promise<BuyerProfile>;

}



let profileSubscription: any = null;

const mapDbItemToCartItem = (item: any): CartItem | null => {
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
    rating: dbProduct.rating || 0,
    totalReviews: dbProduct.review_count || 0,
    category: dbProduct.category || "",
    sold: dbProduct.sales_count || 0,
    isFreeShipping: dbProduct.is_free_shipping || false,
    location: sellerData?.business_address || "Metro Manila",
    description: dbProduct.description || "",
    specifications: dbProduct.specifications || {},
    variants: dbProduct.variants || [],
    quantity: item.quantity,
    selectedVariant,
    notes: item.notes,
    createdAt: item.created_at,
    selected: false // Default to unselected, selection to be managed by store actions or navigation state
  } as CartItem;
};

export const useBuyerStore = create<BuyerStore>()(persist(
  (set, get) => ({
    // Profile Management
    profile: null,

    setProfile: (profile) => {
      // Removed: Mock payment methods - COD is the default payment method
      // Users can add their own payment methods if needed
      set({ profile });
    },
    
    notifications: [],
    syncAddressesWithService: async () => {
      const { profile } = get();
      if (!profile?.id) return;

      try {
        const addressService = AddressService.getInstance();
        const remoteAddresses = await addressService.getUserAddresses(profile.id);
        
        set({ addresses: remoteAddresses });
      } catch (error) {
        console.error('Failed to sync addresses:', error);
        throw error;
      }
    },

    // --- Update this inside useBuyerStore definition ---
    updateProfile: async (updates) => {
      const currentProfile = get().profile;
      if (!currentProfile) return;

      // Map UI fields to the correct DB columns (profiles vs buyers)
      const profileUpdates: Record<string, unknown> = {};
      const buyerUpdates: Record<string, unknown> = {};

      if (updates.firstName !== undefined) profileUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) profileUpdates.last_name = updates.lastName;
      if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
      if (updates.avatar !== undefined) profileUpdates.avatar_url = updates.avatar;

      // Buyer-owned fields live on buyers table
      if (updates.preferences !== undefined) buyerUpdates.preferences = updates.preferences;
      if (updates.bazcoins !== undefined) buyerUpdates.bazcoins = updates.bazcoins;

      try {
        // 1) Update profiles table when applicable
        if (Object.keys(profileUpdates).length > 0) {
          const { error } = await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', currentProfile.id);
          if (error) throw error;
        }

        // 2) Update buyers table for buyer-specific fields
        if (Object.keys(buyerUpdates).length > 0) {
          const { error } = await supabase
            .from('buyers')
            .update(buyerUpdates)
            .eq('id', currentProfile.id);
          if (error) throw error;
        }

        // 3) Update local Zustand state only after remote writes succeed
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null
        }));
      } catch (err) {
        console.error("Failed to update profile in database:", err);
        // Optional: Add toast notification for error
      }
    },

    logout: () => set({ profile: null, addresses: [], notifications: [], cartItems: [], groupedCart: {}, appliedVouchers: {}, platformVoucher: null }),

    // Address Book
    addresses: [],

    setAddresses: (addresses) => set({ addresses }),

    addAddress: async (address) => {
      const state = get();
      const userId = state.profile?.id;
      if (!userId) return false;

      const updatedAddresses = address.isDefault
        ? state.addresses.map(addr => ({ ...addr, isDefault: false }))
        : state.addresses;

      try {
        if (address.isDefault) {
          await supabase
            .from('shipping_addresses')
            .update({ is_default: false })
            .eq('user_id', userId);
        }

        const fullName = `${address.firstName} ${address.lastName}`.trim();

        // Safely store off-schema data like Name & Phone in delivery_instructions as JSON
        const meta = {
          firstName: address.firstName,
          lastName: address.lastName,
          phone: address.phone,
          instructions: address.deliveryInstructions || ""
        };

        const { data: newAddr, error } = await supabase
          .from('shipping_addresses')
          .insert({
            user_id: userId,
            label: address.label || fullName || 'Home',
            address_line_1: address.street || '',
            address_line_2: '',
            barangay: address.barangay || '',
            city: address.city,
            province: address.province,
            region: address.region || 'Metro Manila',
            postal_code: address.postalCode,
            landmark: address.landmark || '',
            delivery_instructions: JSON.stringify(meta),
            is_default: address.isDefault || false,
            address_type: 'residential'
          })
          .select()
          .single();

        if (error) throw error;

        const finalAddress = {
          ...address,
          id: newAddr.id,
          fullName
        } as Address;

        // Only update UI if DB insert succeeds
        set({ addresses: [...updatedAddresses, finalAddress] });
        return true;
      } catch (err) {
        console.error('Error saving address:', err);
        return false;
      }
    },

    updateAddress: async (id, updatedAddress) => {
      const state = get();
      const userId = state.profile?.id;
      if (!userId) return false;

      const isSettingDefault = updatedAddress.isDefault === true;

      try {
        if (isSettingDefault) {
          await supabase
            .from('shipping_addresses')
            .update({ is_default: false })
            .eq('user_id', userId);
        }

        const existing = state.addresses.find(a => a.id === id);
        const meta = {
          firstName: updatedAddress.firstName ?? existing?.firstName ?? "",
          lastName: updatedAddress.lastName ?? existing?.lastName ?? "",
          phone: updatedAddress.phone ?? existing?.phone ?? "",
          instructions: updatedAddress.deliveryInstructions ?? existing?.deliveryInstructions ?? ""
        };

        const dbUpdate: Record<string, any> = {
          delivery_instructions: JSON.stringify(meta)
        };

        if (updatedAddress.street !== undefined) dbUpdate.address_line_1 = updatedAddress.street;
        if (updatedAddress.city !== undefined) dbUpdate.city = updatedAddress.city;
        if (updatedAddress.province !== undefined) dbUpdate.province = updatedAddress.province;
        if (updatedAddress.postalCode !== undefined) dbUpdate.postal_code = updatedAddress.postalCode;
        if (updatedAddress.label !== undefined || updatedAddress.firstName || updatedAddress.lastName) {
          dbUpdate.label = updatedAddress.label || `${meta.firstName} ${meta.lastName}`.trim();
        }
        if (updatedAddress.isDefault !== undefined) dbUpdate.is_default = updatedAddress.isDefault;
        if (updatedAddress.barangay !== undefined) dbUpdate.barangay = updatedAddress.barangay;
        if (updatedAddress.region !== undefined) dbUpdate.region = updatedAddress.region;

        const { error } = await supabase
          .from('shipping_addresses')
          .update(dbUpdate)
          .eq('id', id)
          .eq('user_id', userId); // Security check

        if (error) throw error;

        set({
          addresses: state.addresses.map(addr => {
            if (addr.id === id) {
              return { ...addr, ...updatedAddress, fullName: `${meta.firstName} ${meta.lastName}`.trim() };
            }
            if (isSettingDefault) {
              return { ...addr, isDefault: false };
            }
            return addr;
          })
        });
        return true;
      } catch (err) {
        console.error('Error updating address:', err);
        return false;
      }
    },

    deleteAddress: async (id) => {
      const state = get();
      const userId = state.profile?.id;
      if (!userId) return false;

      try {
        const { error } = await supabase
          .from('shipping_addresses')
          .delete()
          .eq('id', id)
          .eq('user_id', userId); // Ensure users only delete their own addresses

        if (error) throw error;

        set({ addresses: state.addresses.filter(addr => addr.id !== id) });
        return true;
      } catch (err) {
        console.error('Error deleting address:', err);
        return false;
      }
    },

    setDefaultAddress: async (id) => {
      const state = get();
      const userId = state.profile?.id;
      if (!userId) return false;

      try {
        await supabase.from('shipping_addresses').update({ is_default: false }).eq('user_id', userId);
        const { error } = await supabase.from('shipping_addresses').update({ is_default: true }).eq('id', id).eq('user_id', userId);

        if (error) throw error;

        set({
          addresses: state.addresses.map(addr => ({ ...addr, isDefault: addr.id === id }))
        });
        return true;
      } catch (err) {
        console.error('Error setting default address:', err);
        return false;
      }
    },

    addCard: (card) => set((state) => ({
      profile: state.profile ? {
        ...state.profile,
        paymentMethods: [...(state.profile.paymentMethods || []), card]
      } : null
    })),

    deleteCard: (id) => set((state) => ({
      profile: state.profile ? {
        ...state.profile,
        paymentMethods: (state.profile.paymentMethods || []).filter(c => c.id !== id)
      } : null
    })),

    setDefaultPaymentMethod: (id) => set((state) => ({
      profile: state.profile ? {
        ...state.profile,
        paymentMethods: (state.profile.paymentMethods || []).map(m => ({
          ...m,
          isDefault: m.id === id
        }))
      } : null
    })),

    // Following Shops
    followedShops: [],

    followShop: async (sellerId) => {
      // Optimistic local update
      set((state) => ({
        followedShops: state.followedShops.includes(sellerId)
          ? state.followedShops
          : [...state.followedShops, sellerId]
      }));
      // Persist to Supabase
      try {
        const user = await getCurrentUser();
        if (user?.id) {
          await supabase.from('store_followers').upsert(
            { buyer_id: user.id, seller_id: sellerId },
            { onConflict: 'buyer_id,seller_id' }
          );
        }
      } catch (err) {
        console.error('Follow shop failed:', err);
        // Rollback on error
        set((state) => ({
          followedShops: state.followedShops.filter(id => id !== sellerId)
        }));
      }
    },

    unfollowShop: async (sellerId) => {
      // Optimistic local update
      set((state) => ({
        followedShops: state.followedShops.filter(id => id !== sellerId)
      }));
      // Persist to Supabase
      try {
        const user = await getCurrentUser();
        if (user?.id) {
          await supabase.from('store_followers')
            .delete()
            .eq('buyer_id', user.id)
            .eq('seller_id', sellerId);
        }
      } catch (err) {
        console.error('Unfollow shop failed:', err);
        // Rollback on error
        set((state) => ({
          followedShops: [...state.followedShops, sellerId]
        }));
      }
    },

    isFollowing: (sellerId) => get().followedShops.includes(sellerId),

    loadFollowedShops: async () => {
      try {
        const user = await getCurrentUser();
        if (user?.id) {
          const { data } = await supabase.from('store_followers')
            .select('seller_id')
            .eq('buyer_id', user.id);
          if (data) {
            set({ followedShops: data.map(row => row.seller_id) });
          }
        }
      } catch (err) {
        console.error('Load followed shops failed:', err);
      }
    },

    // Enhanced Cart
    cartItems: [],
    groupedCart: {},

    // Quick Order (Buy Now)
    quickOrder: null,

    setQuickOrder: (product, quantity = 1, variant, registryId) => {
      set({
        quickOrder: {
          ...product,
          quantity,
          selectedVariant: variant,
          registryId
        }
      });
    },

    clearQuickOrder: () => set({ quickOrder: null }),

    getQuickOrderTotal: () => {
      const { quickOrder } = get();
      if (!quickOrder) return 0;
      return quickOrder.price * quickOrder.quantity;
    },

    buyAgainItems: null,
    setBuyAgainItems: (items) => set({ buyAgainItems: items }),
    clearBuyAgainItems: () => set({ buyAgainItems: null }),

    addToCart: async (product, quantity = 1, variant) => {
      // Check if user is logged in
      const user = await getCurrentUser();

      if (user) {
        try {
          const cart = await cartService.getOrCreateCart(user.id);
          if (cart) {
            // Add to database - pass variant ID, not the whole object
            await cartService.addToCart(
              cart.id,
              product.id,
              quantity,
              variant?.id  // Pass variant ID, not the whole object
            );

            // Refetch cart items from database to sync state
            const dbItems = await cartService.getCartItems(cart.id);

            // Capture current selection state to preserve it after DB sync
            const currentItems = get().cartItems;
            const selectionMap = new Map<string, boolean>();
            currentItems.forEach(item => {
              if (item.selected) {
                const key = `${item.id}-${item.selectedVariant?.id || 'none'}`;
                selectionMap.set(key, true);
              }
            });

            // Map DB items to store items
            const mappedItems: CartItem[] = dbItems.map(mapDbItemToCartItem).filter(Boolean) as CartItem[];

            // Restore selection state OR select if it's the item we just added
            const itemsWithSelection = mappedItems.map(item => {
              const key = `${item.id}-${item.selectedVariant?.id || 'none'}`;
              // Select if it was already selected OR if it's the newly added product/variant
              const isNewlyAdded = item.id === product.id &&
                (!variant || item.selectedVariant?.id === variant.id);

              return {
                ...item,
                selected: selectionMap.has(key) || isNewlyAdded
              };
            });

            set({ cartItems: itemsWithSelection });
            get().groupCartBySeller();
            return;
          }
        } catch (error) {
          console.error('Error adding to database cart:', error);
        }
      }

      // Fallback to local state if not logged in or database operation failed
      set((state) => {
        const existingItem = state.cartItems.find(item =>
          item.id === product.id &&
          item.selectedVariant?.id === variant?.id
        );

        let newCartItems;
        if (existingItem) {
          newCartItems = state.cartItems.map(item =>
            item.id === product.id && item.selectedVariant?.id === variant?.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          newCartItems = [{
            ...product,
            quantity,
            selectedVariant: variant,
            selected: true, // Default to selected
            createdAt: new Date().toISOString(),
          }, ...state.cartItems];
        }

        return { cartItems: newCartItems };
      });
      get().groupCartBySeller();
    },

    removeFromCart: async (productId, variantId) => {
      const previousCartItems = get().cartItems;

      // Optimistic Update
      set((state) => ({
        cartItems: state.cartItems.filter(item =>
          !(item.id === productId && item.selectedVariant?.id === variantId)
        )
      }));
      get().groupCartBySeller();

      const user = await getCurrentUser();
      if (user) {
        try {
          const cart = await cartService.getOrCreateCart(user.id);
          if (cart) {
            const items = await cartService.getCartItems(cart.id);
            const itemToDelete = items.find(i =>
              i.product_id === productId &&
              (variantId ? i.variant_id === variantId : !i.variant_id)
            );

            if (itemToDelete) {
              await cartService.removeFromCart(itemToDelete.id);
              // Removed the full refetch here to prevent overwriting rapid subsequent clicks
            }
          }
        } catch (error) {
          console.error('Error removing from database:', error);
          set({ cartItems: previousCartItems }); // Rollback only on failure
          get().groupCartBySeller();
        }
      }
    },

    updateCartQuantity: async (productId, quantity, variantId) => {
      // Find the specific item to check its current stock levels
      const item = get().cartItems.find(i =>
        i.id === productId && i.selectedVariant?.id === variantId
      );

      if (!item) return;

      // 1. Enforce Stock Limit: Determine the max allowed based on available stock
      // Checks variant-specific stock first, then falls back to base product stock
      const maxStock = item.selectedVariant?.stock ?? item.stock ?? 0;
      const sanitizedQuantity = Math.min(Math.max(0, quantity), maxStock);

      // 2. If quantity is set to 0, trigger removal
      if (sanitizedQuantity <= 0) {
        get().removeFromCart(productId, variantId);
        return;
      }

      const previousCartItems = get().cartItems;

      // 3. Optimistic Update: Update UI immediately using the sanitized quantity
      set((state) => ({
        cartItems: state.cartItems.map(i =>
          (i.id === productId && i.selectedVariant?.id === variantId)
            ? { ...i, quantity: sanitizedQuantity }
            : i
        )
      }));
      get().groupCartBySeller();

      // 4. Background Sync: Update the database without refetching the whole list
      const user = await getCurrentUser();
      if (user) {
        try {
          const cart = await cartService.getOrCreateCart(user.id);
          if (cart) {
            const items = await cartService.getCartItems(cart.id);
            const itemToUpdate = items.find(i =>
              i.product_id === productId &&
              (variantId ? i.variant_id === variantId : !i.variant_id)
            );

            if (itemToUpdate) {
              await cartService.updateCartItemQuantity(itemToUpdate.id, sanitizedQuantity);
              // Note: Full silent refetch is intentionally omitted here to prevent 
              // race conditions/state jumping during rapid user clicks.
            }
          }
        } catch (error) {
          console.error('Error updating quantity in database:', error);
          // Rollback local state on sync failure
          set({ cartItems: previousCartItems });
          get().groupCartBySeller();
        }
      }
    },

    updateItemVariant: async (productId, oldVariantId, newVariant, quantity) => {
      const user = await getCurrentUser();
      const cartItems = get().cartItems;

      // 1. Find the current item being edited
      const oldItemIndex = cartItems.findIndex(item =>
        item.id === productId && item.selectedVariant?.id === oldVariantId
      );
      if (oldItemIndex === -1) return;

      const currentItem = cartItems[oldItemIndex];
      const finalQuantity = quantity !== undefined ? quantity : currentItem.quantity;

      // 2. Check if the "New" variant already exists elsewhere in the cart
      const existingNewVariantIndex = cartItems.findIndex(item =>
        item.id === productId && item.selectedVariant?.id === newVariant.id && item.selectedVariant?.id !== oldVariantId
      );

      let nextCartItems = [...cartItems];

      if (existingNewVariantIndex !== -1) {
        // MERGE: Update the existing one and remove the old one
        const targetItem = nextCartItems[existingNewVariantIndex];
        nextCartItems[existingNewVariantIndex] = {
          ...targetItem,
          quantity: targetItem.quantity + finalQuantity
        };
        nextCartItems.splice(oldItemIndex, 1);
      } else {
        // UPDATE: Just change the variant on the current item
        nextCartItems[oldItemIndex] = {
          ...currentItem,
          selectedVariant: newVariant,
          price: newVariant.price,
          quantity: finalQuantity,
          image: newVariant.image || newVariant.thumbnail_url || currentItem.image
        };
      }

      // 3. Sync with DB (Handle deletion/update logic)
      if (user) {
        try {
          const cart = await cartService.getOrCreateCart(user.id);
          if (cart) {
            // If merging, you would delete the old record and update the quantity of the new one
            // If simply updating, call the existing update service
            await get().initializeCart(); // Simplest way to re-sync complex merges from DB truth
          }
        } catch (error) {
          console.error('Error syncing variant merge:', error);
        }
      }

      set({ cartItems: nextCartItems });
      get().groupCartBySeller();
    },

    updateCartNotes: (productId, notes) => {
      set((state) => ({
        cartItems: state.cartItems.map(item =>
          item.id === productId ? { ...item, notes } : item
        )
      }));
    },

    clearCart: () => set({ cartItems: [], groupedCart: {}, appliedVouchers: {}, platformVoucher: null }),

    getCartTotal: () => {
      const { groupedCart, appliedVouchers, platformVoucher } = get();
      let total = 0;

      Object.entries(groupedCart).forEach(([sellerId, group]) => {
        let groupTotal = group.subtotal + group.shippingFee;

        // Apply seller voucher
        const sellerVoucher = appliedVouchers[sellerId];
        if (sellerVoucher) {
          groupTotal -= get().calculateDiscount(group.subtotal, sellerVoucher);
        }

        total += groupTotal;
      });

      // Apply platform voucher
      if (platformVoucher) {
        total -= get().calculateDiscount(total, platformVoucher);
      }

      return Math.max(0, total);
    },

    getCartItemCount: () => {
      return get().cartItems.reduce((total, item) => total + item.quantity, 0);
    },

    getTotalCartItems: () => {
      return get().cartItems.reduce((total, item) => total + item.quantity, 0);
    },

    groupCartBySeller: () => {
      const { cartItems } = get();
      const grouped: GroupedCart = {};

      cartItems.forEach(item => {
        const sellerId = item.sellerId;
        if (!grouped[sellerId]) {
          grouped[sellerId] = {
            seller: item.seller,
            items: [],
            subtotal: 0,
            shippingFee: 0,
            freeShippingEligible: false
          };
        }

        grouped[sellerId].items.push(item);
        grouped[sellerId].subtotal += (item.selectedVariant?.price || item.price) * item.quantity;
      });

      // Calculate shipping fees and free shipping eligibility
      Object.entries(grouped).forEach(([, group]) => {
        const hasFreeShipping = group.items.some(item => item.isFreeShipping);
        const subtotalThreshold = 1000; // ₱1000 for free shipping

        if (hasFreeShipping || group.subtotal >= subtotalThreshold) {
          group.shippingFee = 0;
          group.freeShippingEligible = true;
        } else {
          group.shippingFee = 100; // Standard shipping fee
          group.freeShippingEligible = false;
        }
      });

      set({ groupedCart: grouped });
    },

    // Voucher System
    availableVouchers: [],

    appliedVouchers: {},
    platformVoucher: null,

    loadVouchers: async () => {
      try {
        const { voucherService } = await import('../services/voucherService');
        const dbVouchers = await voucherService.getAllVouchers();

        // Map database vouchers to buyer store format
        const mappedVouchers = dbVouchers.map(v => ({
          id: v.id,
          code: v.code,
          title: v.title,
          description: v.description || '',
          type: v.voucher_type,
          value: v.value,
          minOrderValue: v.min_order_value,
          maxDiscount: v.max_discount || undefined,
          validFrom: new Date(v.claimable_from),
          validTo: new Date(v.claimable_until),
          usageLimit: v.usage_limit || 0,
          used: 0, // TODO: Track actual usage from buyer_vouchers
          isActive: v.is_active,
          sellerId: v.seller_id || undefined
        }));

        set({ availableVouchers: mappedVouchers });
      } catch (error) {
        console.error('Error loading vouchers:', error);
        set({ availableVouchers: [] });
      }
    },

    validateVoucher: async (code, sellerId) => {
      const result = await get().validateVoucherDetailed(code, sellerId);
      return result.voucher;
    },

    validateVoucherDetailed: async (code, sellerId) => {
      try {
        const { voucherService } = await import('../services/voucherService');
        const { cartItems, profile } = get();

        // Calculate order total based on SELECTED items only
        const relevantTotal = sellerId
          ? cartItems
            .filter(item => item.sellerId === sellerId && item.selected)
            .reduce((total, item) => total + (item.selectedVariant?.price || item.price) * item.quantity, 0)
          : cartItems
            .filter(item => item.selected)
            .reduce((total, item) => total + (item.selectedVariant?.price || item.price) * item.quantity, 0);

        // Pass buyerId for per-customer limit check (claim_limit)
        const buyerId = profile?.id ?? null;

        // Validate voucher against database (with reason codes)
        const validation = await voucherService.validateVoucherDetailed(code, relevantTotal, buyerId);
        const dbVoucher = validation.voucher;
        if (!dbVoucher) {
          return {
            voucher: null,
            errorCode: validation.errorCode as VoucherValidationErrorCode
          };
        }

        // Check seller restriction
        if (dbVoucher.seller_id && dbVoucher.seller_id !== sellerId) {
          return {
            voucher: null,
            errorCode: 'SELLER_MISMATCH'
          };
        }

        // Map to buyer store format
        const mappedVoucher: Voucher = {
          id: dbVoucher.id,
          code: dbVoucher.code,
          title: dbVoucher.title,
          description: dbVoucher.description || '',
          type: dbVoucher.voucher_type,
          value: dbVoucher.value,
          minOrderValue: dbVoucher.min_order_value,
          maxDiscount: dbVoucher.max_discount || undefined,
          validFrom: new Date(dbVoucher.claimable_from),
          validTo: new Date(dbVoucher.claimable_until),
          usageLimit: dbVoucher.usage_limit || 0,
          used: 0,
          isActive: dbVoucher.is_active,
          sellerId: dbVoucher.seller_id || undefined
        };

        return {
          voucher: mappedVoucher,
          errorCode: null
        };
      } catch (error) {
        console.error('Error validating voucher:', error);
        return {
          voucher: null,
          errorCode: 'UNKNOWN'
        };
      }
    },

    applyVoucher: (voucher, sellerId) => {
      if (sellerId) {
        set((state) => ({
          appliedVouchers: {
            ...state.appliedVouchers,
            [sellerId]: voucher
          }
        }));
      } else {
        set({ platformVoucher: voucher });
      }
    },

    removeVoucher: (sellerId) => {
      if (sellerId) {
        set((state) => {
          const newVouchers = { ...state.appliedVouchers };
          delete newVouchers[sellerId];
          return { appliedVouchers: newVouchers };
        });
      } else {
        set({ platformVoucher: null });
      }
    },

    calculateDiscount: (subtotal, voucher) => {
      switch (voucher.type) {
        case 'percentage': {
          const percentageDiscount = subtotal * (voucher.value / 100);
          return voucher.maxDiscount ? Math.min(percentageDiscount, voucher.maxDiscount) : percentageDiscount;
        }
        case 'fixed':
          return Math.min(voucher.value, subtotal);
        case 'shipping':
          return voucher.value;
        default:
          return 0;
      }
    },

    // Cart Selection Actions
    toggleItemSelection: (productId, variantId) => {
      set((state) => ({
        cartItems: state.cartItems.map(item =>
          item.id === productId && item.selectedVariant?.id === variantId
            ? { ...item, selected: !item.selected }
            : item
        )
      }));
      get().groupCartBySeller();
    },

    toggleSellerSelection: (sellerId, selected) => {
      set((state) => ({
        cartItems: state.cartItems.map(item =>
          item.sellerId === sellerId
            ? { ...item, selected }
            : item
        )
      }));
      get().groupCartBySeller();
    },

    selectAllItems: (selected) => {
      set((state) => ({
        cartItems: state.cartItems.map(item => ({ ...item, selected }))
      }));
      get().groupCartBySeller();
    },

    selectItemsExclusively: (productIds) => {
      set((state) => ({
        cartItems: state.cartItems.map(item => ({
          ...item,
          selected: productIds.includes(item.id)
        }))
      }));
      get().groupCartBySeller();
    },

    removeSelectedItems: async () => {
      const user = await getCurrentUser();
      const cartItems = get().cartItems;
      const selectedItems = cartItems.filter(item => item.selected);

      if (selectedItems.length === 0) return;

      if (user) {
        try {
          const cart = await cartService.getOrCreateCart(user.id);
          if (cart) {
            const dbItems = await cartService.getCartItems(cart.id);
            // Collect all DB IDs for matching selected items
            const idsToDelete = selectedItems
              .map(item => {
                const dbItem = dbItems.find(i =>
                  i.product_id === item.id &&
                  (item.selectedVariant ? (i as any).variant_id === item.selectedVariant.id : !(i as any).variant_id)
                );
                return dbItem?.id;
              })
              .filter(Boolean) as string[];

            if (idsToDelete.length > 0) {
              await cartService.removeItemsFromCart(idsToDelete);
            }
          }
        } catch (error) {
          console.error('Error removing selected items from DB:', error);
        }
      }

      // Update local state
      set({ cartItems: cartItems.filter(item => !item.selected) });
      get().groupCartBySeller();
    },

    getSelectedTotal: () => {
      const { groupedCart, appliedVouchers, platformVoucher } = get();
      let total = 0;

      Object.entries(groupedCart).forEach(([sellerId, group]) => {
        // Calculate subtotal for SELECTED items in this group
        const selectedSubtotal = group.items
          .filter(item => item.selected)
          .reduce((sum, item) => sum + (item.selectedVariant?.price || item.price) * item.quantity, 0);

        if (selectedSubtotal === 0) return;

        let groupTotal = selectedSubtotal;

        // Only add shipping if there are selected items
        // Assuming shipping fee logic might need adjustment if partial items selected -> simplest is keep shipping if ANY item in group selected
        const hasSelectedItems = group.items.some(item => item.selected);
        if (hasSelectedItems) {
          groupTotal += group.shippingFee;
        }

        // Apply seller voucher
        const sellerVoucher = appliedVouchers[sellerId];
        if (sellerVoucher) {
          groupTotal -= get().calculateDiscount(selectedSubtotal, sellerVoucher);
        }

        total += groupTotal;
      });

      // Apply platform voucher
      if (platformVoucher) {
        total -= get().calculateDiscount(total, platformVoucher);
      }

      return Math.max(0, total);
    },

    getSelectedCount: () => {
      return get().cartItems.filter(item => item.selected).reduce((total, item) => total + item.quantity, 0);
    },

    // Reviews & Ratings
    reviews: [],
    pendingReviews: [],
    myReviews: [],

    addReview: (review) => {
      const newReview: Review = {
        ...review,
        id: `review-${Date.now()}`,
        date: new Date(),
        helpful: 0
      };

      set((state) => ({
        reviews: [...state.reviews, newReview],
        myReviews: [...state.myReviews, newReview],
        pendingReviews: state.pendingReviews.filter(id => id !== review.productId)
      }));
    },

    submitReview: (review) => {
      const newReview: Review = {
        ...review,
        id: `review-${Date.now()}`,
        date: new Date(),
        helpful: 0
      };

      set((state) => ({
        reviews: [...state.reviews, newReview],
        myReviews: [...state.myReviews, newReview],
        pendingReviews: state.pendingReviews.filter(id => id !== review.productId)
      }));
    },

    updateReview: (reviewId, updates) => {
      set((state) => ({
        reviews: state.reviews.map(review =>
          review.id === reviewId ? { ...review, ...updates } : review
        )
      }));
    },

    markReviewHelpful: (reviewId) => {
      set((state) => ({
        reviews: state.reviews.map(review =>
          review.id === reviewId ? { ...review, helpful: review.helpful + 1 } : review
        )
      }));
    },

    getProductReviews: (productId) => {
      return get().reviews.filter(review => review.productId === productId)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    },

    getSellerReviews: (sellerId) => {
      return get().reviews.filter(review => review.sellerId === sellerId)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    },

    // Seller Storefront
    viewedSellers: [],

    getSellerDetails: (sellerId) => {
      const { viewedSellers } = get();
      return viewedSellers.find(seller => seller.id === sellerId) || null;
    },

    getSellerProducts: (sellerId, category) => {
      const seller = get().getSellerDetails(sellerId);
      if (!seller) return [];

      return category
        ? seller.products.filter(product => product.category === category)
        : seller.products;
    },

    addViewedSeller: (seller) => {
      set((state) => {
        const exists = state.viewedSellers.some(s => s.id === seller.id);
        if (exists) return state;

        return {
          viewedSellers: [...state.viewedSellers, seller]
        };
      });
    },

    initializeCart: async () => {
      const user = await getCurrentUser();
      if (!user) return;

      try {
        const cart = await cartService.getCart(user.id);
        if (cart) {
          // Capture current selection state to preserve it after DB sync
          const currentItems = get().cartItems;
          const selectionMap = new Map<string, boolean>();

          currentItems.forEach(item => {
            const key = `${item.id}-${item.selectedVariant?.id || 'none'}`;
            if (item.selected) {
              selectionMap.set(key, true);
            }
          });

          const dbItems = await cartService.getCartItems(cart.id);

          // Map DB items to store items
          const mappedItems: CartItem[] = dbItems.map(mapDbItemToCartItem).filter(Boolean) as CartItem[];

          // Restore selection state
          const itemsWithSelection = mappedItems.map(item => {
            const key = `${item.id}-${item.selectedVariant?.id || 'none'}`;
            if (selectionMap.has(key)) {
              return { ...item, selected: true };
            }
            return item;
          });

          set({ cartItems: itemsWithSelection });
          get().groupCartBySeller();
        }
      } catch (error) {
        console.error('Error initializing cart from DB:', error);
      }
    },

    // Initialize buyer profile ensuring the buyer record exists in the database
    initializeBuyerProfile: async (userId: string, profileData: any) => {
      try {
        // First, check if buyer record exists
        const { data: existingBuyer, error: fetchError } = await supabase
          .from('buyers')
          .select('*')
          .eq('id', userId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 is the error code for "Row not found"
          console.error('Error checking buyer profile:', fetchError);
        }

        if (!existingBuyer) {
          // Buyer record doesn't exist, create one
          const { error: insertError } = await supabase
            .from('buyers')
            .insert([{
              id: userId,
              shipping_addresses: [],
              payment_methods: [],
              preferences: {
                language: 'en',
                currency: 'PHP',
                notifications: {
                  email: true,
                  sms: false,
                  push: true,
                },
                privacy: {
                  showProfile: true,
                  showPurchases: false,
                  showFollowing: true,
                },
              },
              followed_shops: [],
              total_spent: 0,
              bazcoins: 0,
            }]);

          if (insertError) {
            console.error('Error creating buyer profile:', insertError);
            throw insertError;
          }
        }

        // Now fetch the complete profile data
        let buyerData: any = null;
        let profileInfo: any = null;

        const { data: buyerWithProfile, error: buyerJoinError } = await supabase
          .from('buyers')
          .select(`
            *,
            profile:profiles!id (
              id, email, first_name, last_name, phone, created_at
            )
          `)
          .eq('id', userId)
          .single();

        if (!buyerJoinError && buyerWithProfile) {
          buyerData = buyerWithProfile;
          profileInfo = buyerWithProfile.profile;
        } else {
          console.warn('Buyer/profile join failed, falling back to separate queries:', buyerJoinError);

          const [{ data: buyerOnly, error: buyerOnlyError }, { data: profileOnly, error: profileOnlyError }] = await Promise.all([
            supabase
              .from('buyers')
              .select('*')
              .eq('id', userId)
              .single(),
            supabase
              .from('profiles')
              .select('id, email, first_name, last_name, phone, created_at')
              .eq('id', userId)
              .maybeSingle(),
          ]);

          if (buyerOnlyError) {
            console.error('Error fetching buyer profile:', buyerOnlyError);
            throw buyerOnlyError;
          }

          if (profileOnlyError && profileOnlyError.code !== 'PGRST116') {
            console.error('Error fetching linked profile:', profileOnlyError);
          }

          buyerData = buyerOnly;
          profileInfo = profileOnly || null;
        }

        // Fetch shipping addresses from the separate table
        const { data: shippingAddresses } = await supabase
          .from('shipping_addresses')
          .select('*')
          .eq('user_id', userId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        // Extract profile info from joined/fallback data and derive display name
        const { firstName, lastName, displayFullName } = deriveBuyerName({
          first_name: profileInfo?.first_name,
          last_name: profileInfo?.last_name,
          // Some legacy paths may still have full_name in metadata; keep as optional
          full_name: (profileInfo as any)?.full_name,
          email: profileInfo?.email || (profileData?.email ?? null),
          sellerOwnerName: profileData?.sellerOwnerName ?? null,
        });

        // Optional: backfill missing first/last name into profiles when we have a good guess
        try {
          const shouldBackfill =
            profileInfo &&
            !profileInfo.first_name &&
            !profileInfo.last_name &&
            (firstName || lastName);

          if (shouldBackfill) {
            await supabase
              .from('profiles')
              .update({
                first_name: firstName || null,
                last_name: lastName || null,
              })
              .eq('id', userId);
          }
        } catch (backfillError) {
          console.warn('Non-fatal: failed to backfill profile first/last name', backfillError);
        }

        const buyerInfo = {
          ...buyerData,
          firstName,
          lastName,
          email: profileInfo?.email || '',
          phone: profileInfo?.phone || '',
          avatar: buyerData.avatar_url || '/placeholder-avatar.jpg',
          memberSince: profileInfo?.created_at ? new Date(profileInfo.created_at) : new Date(),
          totalSpent: buyerData.total_spent || 0,
          bazcoins: buyerData.bazcoins || 0,
          totalOrders: 0,
        };

        // Set the profile in the store
        set({ profile: buyerInfo as BuyerProfile });

        // Initialize addresses from the shipping_addresses table (map to expected format)
        // Note: address_line_1 may contain "Name, Phone, Street" format
        const mappedAddresses = (shippingAddresses || []).map((addr: any) => {
          let meta: any = {};
          try {
            // Check if delivery_instructions contains our saved JSON payload
            if (addr.delivery_instructions && addr.delivery_instructions.startsWith('{')) {
              meta = JSON.parse(addr.delivery_instructions);
            }
          } catch (e) {
            console.error("Failed to parse address meta", e);
          }

          // Backwards compatibility for old comma-separated addresses
          let fallbackName = '';
          let fallbackPhone = '';
          let street = addr.address_line_1 || '';

          if (!meta.firstName && street.includes(',')) {
            const parts = street.split(', ');
            if (parts.length >= 3) {
              const possiblePhone = parts[1];
              if (/^\d{10,11}$/.test(possiblePhone?.replace(/\D/g, ''))) {
                fallbackName = parts[0];
                fallbackPhone = possiblePhone;
                street = parts.slice(2).join(', ');
              }
            }
          }

          const parsedFirstName = meta.firstName || fallbackName.split(' ')[0] || '';
          const parsedLastName = meta.lastName || fallbackName.split(' ').slice(1).join(' ') || '';

          return {
            id: addr.id,
            fullName: `${parsedFirstName} ${parsedLastName}`.trim() || addr.label,
            firstName: parsedFirstName,
            lastName: parsedLastName,
            street: street + (addr.address_line_2 ? ', ' + addr.address_line_2 : ''),
            city: addr.city,
            province: addr.province,
            postalCode: addr.postal_code,
            phone: meta.phone || fallbackPhone,
            isDefault: addr.is_default,
            label: addr.label,
            barangay: addr.barangay,
            region: addr.region,
            landmark: addr.landmark,
            deliveryInstructions: meta.instructions || (addr.delivery_instructions?.startsWith('{') ? '' : addr.delivery_instructions)
          };
        });

        set({ addresses: mappedAddresses });

        return buyerInfo;
      } catch (error) {
        console.error('Error initializing buyer profile:', error);
        throw error;
      }
    },

    subscribeToProfile: (userId) => {
      if (profileSubscription) return; // Already subscribed

      profileSubscription = supabase
        .channel(`public:buyers:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'buyers',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            const newProfile = payload.new as Partial<BuyerProfile>;
            set((state) => ({
              profile: state.profile ? { ...state.profile, ...newProfile } : null
            }));
          }
        )
        .subscribe();
    },

    unsubscribeFromProfile: () => {
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
        profileSubscription = null;
      }
    },

    // Messaging Implementation
    conversations: [],
    addConversation: (conversation) => {
      set((state) => ({
        conversations: [conversation, ...state.conversations.filter(c => c.sellerId !== conversation.sellerId)]
      }));
    },
    updateConversation: (convId, updates) => {
      set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === convId ? { ...c, ...updates } : c
        )
      }));
    },
    addChatMessage: (convId, message) => {
      set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === convId
            ? {
              ...c,
              messages: [...c.messages, message],
              lastMessage: message.senderId === 'buyer'
                ? (message.text ? `You: ${message.text}` : `You sent ${message.images && message.images.length > 1 ? `${message.images.length} images` : 'an image'}`)
                : (message.text || (message.images && message.images.length > 0 ? `Sent ${message.images.length > 1 ? `${message.images.length} images` : 'an image'}` : '')),
              lastMessageTime: message.timestamp,
              unreadCount: message.senderId !== 'buyer' ? c.unreadCount + 1 : c.unreadCount
            }
            : c
        )
      }));
    },
    deleteConversation: (convId) => {
      set((state) => {
        const conversation = state.conversations.find(c => c.id === convId);
        if (!conversation) return state;

        return {
          conversations: state.conversations.filter(c => c.id !== convId),
          viewedSellers: state.viewedSellers.filter(s => s.id !== conversation.sellerId)
        };
      });
    },

    // Registry & Gifting
    registries: [],
    createRegistry: (registry) => {
      set((state) => ({
        registries: [...state.registries.map(ensureRegistryDefaults), ensureRegistryDefaults(registry)]
      }));
    },
    updateRegistryMeta: (registryId, updates) => {
      set((state) => ({
        registries: state.registries.map((r) =>
          r.id === registryId ? ensureRegistryDefaults({ ...r, ...updates }) : r
        )
      }));
    },
    addToRegistry: (registryId, product) => {
      const productWithDefaults = ensureRegistryProductDefaults(product);
      set((state) => ({
        registries: state.registries.map(r =>
          r.id === registryId
            ? {
              ...r,
              products: [...(r.products || []).map(ensureRegistryProductDefaults), productWithDefaults]
            }
            : r
        )
      }));
    },
    updateRegistryItem: (registryId, productId, updates) => {
      set((state) => ({
        registries: state.registries.map(r =>
          r.id === registryId
            ? {
              ...r,
              products: (r.products || []).map(p => {
                const updated = p.id === productId ? { ...p, ...updates } : p;
                return ensureRegistryProductDefaults(updated);
              })
            }
            : r
        )
      }));
    },
    removeRegistryItem: (registryId, productId) => {
      set((state) => ({
        registries: state.registries.map(r =>
          r.id === registryId
            ? {
              ...r,
              products: (r.products || []).filter(p => p.id !== productId)
            }
            : r
        )
      }));
    },
    deleteRegistry: (registryId) => {
      set((state) => ({
        registries: state.registries.filter(r => r.id !== registryId)
      }));
    }
  }),
  {
    name: 'buyer-storage',
    partialize: (state) => ({
      profile: state.profile,
      addresses: state.addresses,
      followedShops: state.followedShops,
      cartItems: state.cartItems,
      reviews: state.reviews,
      conversations: state.conversations,
      registries: state.registries
      // We do NOT persist buyAgainItems or quickOrder to keep them transient
    })
  }
));

// Demo data
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
