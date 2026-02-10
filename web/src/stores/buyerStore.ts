import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartService } from '@/services/cartService';
import { addressService } from '@/services/addressService';
import { paymentService } from '@/services/paymentService';
import { getCurrentUser, supabase } from '@/lib/supabase';
import { ReactNode } from 'react';

const buildAddressLine1 = (address: Address) => {
  const fullName = address.fullName?.trim();
  const phone = address.phone?.trim();
  const street = address.street?.trim();

  if (fullName && phone) {
    return `${fullName}, ${phone}, ${street}`;
  }

  if (fullName) {
    return `${fullName}, ${street}`;
  }

  if (phone) {
    return `${phone}, ${street}`;
  }

  return street || '';
};

export interface Message {
  id: string;
  senderId: string;
  text: string;
  images?: string[];
  timestamp: string;
  isRead: boolean;
}

// Registry Product Extension
export interface RegistryProduct extends Product {
  requestedQty: number;
  receivedQty: number;
  note?: string;
  isMostWanted?: boolean;
}

export interface RegistryItem {
  id: string;
  title: string;
  sharedDate: string;
  imageUrl: string;
  category?: string;
  products?: RegistryProduct[];
}

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
  products: Product[];
  badges: string[];
  responseTime: string;
  categories: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
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

  // Address Book
  addresses: Address[];
  setAddresses: (addresses: Address[]) => void;
  addAddress: (address: Address) => Promise<void>;
  updateAddress: (id: string, updates: Partial<Address>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;


  // Following Shops
  followedShops: string[]; // seller IDs
  followShop: (sellerId: string) => void;
  unfollowShop: (sellerId: string) => void;
  isFollowing: (sellerId: string) => boolean;

  // Enhanced Cart with Multi-seller grouping
  cartItems: CartItem[];
  groupedCart: GroupedCart;
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, variantId?: string) => void;
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
  applyVoucher: (voucher: Voucher, sellerId?: string) => void;
  removeVoucher: (sellerId?: string) => void;
  calculateDiscount: (subtotal: number, voucher: Voucher) => number;

  // Cart Selection
  toggleItemSelection: (productId: string, variantId?: string) => void;
  toggleSellerSelection: (sellerId: string, selected: boolean) => void;
  selectAllItems: (selected: boolean) => void;
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
  deleteRegistry: (registryId: string) => void;
  addToRegistry: (registryId: string, product: Product) => void;
  updateRegistryItem: (registryId: string, productId: string, updates: Partial<RegistryProduct>) => void;
  removeRegistryItem: (registryId: string, productId: string) => void;

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

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    price: selectedVariant?.price || dbProduct.price,
    originalPrice: dbProduct.original_price,
    image: selectedVariant?.image || dbProduct.primary_image || (dbProduct.images && dbProduct.images[0]) || "",
    images: dbProduct.images || [],
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
    selected: true // Default to selected so they appear in checkout
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

    // --- Update this inside useBuyerStore definition ---
    updateProfile: async (updates) => {
      const currentProfile = get().profile;
      if (!currentProfile) return;

      try {
        // Map local field names to DB column names for the buyers table
        const dbUpdates: Record<string, any> = {};
        if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;
        if (updates.bazcoins !== undefined) dbUpdates.bazcoins = updates.bazcoins;
        if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences;

        // Only update buyers table if there are relevant fields
        if (Object.keys(dbUpdates).length > 0) {
          dbUpdates.updated_at = new Date().toISOString();
          const { error } = await supabase
            .from('buyers')
            .update(dbUpdates)
            .eq('id', currentProfile.id);

          if (error) throw error;
        }

        // 2. Update local Zustand state only if DB update succeeds
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null
        }));
      } catch (err) {
        console.error("Failed to update profile in database:", err);
        // Optional: Add toast notification for error
      }
    },

    logout: () => set({ profile: null, cartItems: [], groupedCart: {}, appliedVouchers: {}, platformVoucher: null }),

    // Address Book
    addresses: [],

    setAddresses: (addresses) => set({ addresses }),

    addAddress: async (address) => {
      const state = get();
      const userId = state.profile?.id;

      if (!userId) {
        set({
          addresses: [...state.addresses, address]
        });
        return;
      }

      try {
        // Use service layer to create address
        const addressToInsert = {
          user_id: userId,
          label: address.label || 'Home',
          address_line_1: buildAddressLine1(address),
          address_line_2: '',
          barangay: address.barangay || '',
          city: address.city,
          province: address.province,
          region: address.region || 'Metro Manila',
          postal_code: address.postalCode,
          landmark: address.landmark || '',
          delivery_instructions: address.deliveryInstructions || '',
          is_default: address.isDefault || false,
        };

        const createdAddress = await addressService.createAddress(addressToInsert);
        
        // Update local state with the created address
        set({
          addresses: [...state.addresses, createdAddress]
        });
      } catch (err) {
        console.error('Error saving address to database:', err);
        // Fallback to local state if service fails
        set({
          addresses: [...state.addresses, address]
        });
      }
    },

    updateAddress: async (id, updatedAddress) => {
      const state = get();
      const userId = state.profile?.id;

      // If we are setting this address as default, unset others
      const isSettingDefault = updatedAddress.isDefault === true;

      // Update in database using service layer
      if (userId) {
        try {
          // Prepare update data
          const currentAddress = state.addresses.find(addr => addr.id === id);
          const mergedAddress = { ...currentAddress, ...updatedAddress };
          const addressUpdate: Partial<AddressInsert> = {};
          const shouldUpdateLine1 = Boolean(
            updatedAddress.street ||
            updatedAddress.firstName ||
            updatedAddress.lastName ||
            updatedAddress.phone ||
            updatedAddress.fullName
          );
          if (shouldUpdateLine1 && currentAddress) {
            addressUpdate.address_line_1 = buildAddressLine1(mergedAddress as Address);
          }
          if (updatedAddress.city) addressUpdate.city = updatedAddress.city;
          if (updatedAddress.province) addressUpdate.province = updatedAddress.province;
          if (updatedAddress.postalCode) addressUpdate.postal_code = updatedAddress.postalCode;
          if (updatedAddress.label) addressUpdate.label = updatedAddress.label;
          if (typeof updatedAddress.isDefault === 'boolean') addressUpdate.is_default = updatedAddress.isDefault;
          if (updatedAddress.barangay) addressUpdate.barangay = updatedAddress.barangay;
          if (updatedAddress.region) addressUpdate.region = updatedAddress.region;
          if (updatedAddress.landmark !== undefined) addressUpdate.landmark = updatedAddress.landmark;
          if (updatedAddress.deliveryInstructions !== undefined) {
            addressUpdate.delivery_instructions = updatedAddress.deliveryInstructions;
          }

          // Update the specific address
          await addressService.updateAddress(id, addressUpdate);

          // If setting as default, handle default logic separately
          if (isSettingDefault) {
            await addressService.setDefaultAddress(userId, id);
          }
        } catch (err) {
          console.error('Error updating address in database:', err);
        }
      }

      set({
        addresses: state.addresses.map(addr => {
          if (addr.id === id) {
            return { ...addr, ...updatedAddress };
          }
          if (isSettingDefault) {
            return { ...addr, isDefault: false };
          }
          return addr;
        })
      });
    },

    deleteAddress: async (id) => {
      const state = get();
      const userId = state.profile?.id;

      // Delete from database using service layer
      if (userId) {
        try {
          await addressService.deleteAddress(id);
        } catch (err) {
          console.error('Error deleting address from database:', err);
        }
      }

      set({
        addresses: state.addresses.filter(addr => addr.id !== id)
      });
    },

    setDefaultAddress: async (id) => {
      const state = get();
      const userId = state.profile?.id;

      // Update in database using service layer
      if (userId) {
        try {
          await addressService.setDefaultAddress(userId, id);
        } catch (err) {
          console.error('Error setting default address in database:', err);
        }
      }

      set({
        addresses: state.addresses.map(addr => ({
          ...addr,
          isDefault: addr.id === id
        }))
      });
    },

    addCard: async (card) => {
      const state = get();
      const userId = state.profile?.id;

      if (userId) {
        try {
          // Use service layer to add payment method
          await paymentService.addPaymentMethod(userId, card);
          
          // Sync payment methods from service
          await get().syncPaymentMethodsWithService();
        } catch (error) {
          console.error('Error adding payment method via service:', error);
          // Fallback to local state update
          set((currentState) => ({
            profile: currentState.profile ? {
              ...currentState.profile,
              paymentMethods: [...(currentState.profile.paymentMethods || []), card]
            } : null
          }));
        }
      } else {
        // If no user ID, update local state only
        set((currentState) => ({
          profile: currentState.profile ? {
            ...currentState.profile,
            paymentMethods: [...(currentState.profile.paymentMethods || []), card]
          } : null
        }));
      }
    },

    deleteCard: async (id) => {
      const state = get();
      const userId = state.profile?.id;

      if (userId) {
        try {
          // Use service layer to delete payment method
          await paymentService.deletePaymentMethod(userId, id);
          
          // Sync payment methods from service
          await get().syncPaymentMethodsWithService();
        } catch (error) {
          console.error('Error deleting payment method via service:', error);
          // Fallback to local state update
          set((currentState) => ({
            profile: currentState.profile ? {
              ...currentState.profile,
              paymentMethods: (currentState.profile.paymentMethods || []).filter(c => c.id !== id)
            } : null
          }));
        }
      } else {
        // If no user ID, update local state only
        set((currentState) => ({
          profile: currentState.profile ? {
            ...currentState.profile,
            paymentMethods: (currentState.profile.paymentMethods || []).filter(c => c.id !== id)
          } : null
        }));
      }
    },

    setDefaultPaymentMethod: async (id) => {
      const state = get();
      const userId = state.profile?.id;

      if (userId) {
        try {
          // Use service layer to set default payment method
          await paymentService.setDefaultPaymentMethod(userId, id);
          
          // Sync payment methods from service
          await get().syncPaymentMethodsWithService();
        } catch (error) {
          console.error('Error setting default payment method via service:', error);
          // Fallback to local state update
          set((currentState) => ({
            profile: currentState.profile ? {
              ...currentState.profile,
              paymentMethods: (currentState.profile.paymentMethods || []).map(m => ({
                ...m,
                isDefault: m.id === id
              }))
            } : null
          }));
        }
      } else {
        // If no user ID, update local state only
        set((currentState) => ({
          profile: currentState.profile ? {
            ...currentState.profile,
            paymentMethods: (currentState.profile.paymentMethods || []).map(m => ({
              ...m,
              isDefault: m.id === id
            }))
          } : null
        }));
      }
    },

    // Service Layer Integration Methods
    syncAddressesWithService: async () => {
      const state = get();
      const userId = state.profile?.id;
      if (!userId) return;

      try {
        // Fetch addresses from service layer
        const addressesFromService = await addressService.getUserAddresses(userId);
        
        // Update local store with service data
        set({ addresses: addressesFromService });
      } catch (error) {
        console.error('Error syncing addresses with service:', error);
      }
    },

    syncPaymentMethodsWithService: async () => {
      const state = get();
      const userId = state.profile?.id;
      const paymentMethods = state.profile?.paymentMethods || [];

      if (!userId) return;

      try {
        // Fetch payment methods from service layer
        const paymentMethodsFromService = await paymentService.getUserPaymentMethods(userId);
        
        // Update profile with service data
        set((currentState) => ({
          profile: currentState.profile ? {
            ...currentState.profile,
            paymentMethods: paymentMethodsFromService
          } : null
        }));
      } catch (error) {
        console.error('Error syncing payment methods with service:', error);
      }
    },

    // Following Shops
    followedShops: ['seller-001', 'seller-003'],

    followShop: (sellerId) => set((state) => ({
      followedShops: [...state.followedShops, sellerId]
    })),

    unfollowShop: (sellerId) => set((state) => ({
      followedShops: state.followedShops.filter(id => id !== sellerId)
    })),

    isFollowing: (sellerId) => get().followedShops.includes(sellerId),

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

            // Map DB items to store items
            const mappedItems: CartItem[] = dbItems.map(mapDbItemToCartItem).filter(Boolean) as CartItem[];

            set({ cartItems: mappedItems });
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
      // 1. Optimistic Update: Remove item immediately from local state
      const previousCartItems = get().cartItems; // Capture state for rollback
      set((state) => ({
        cartItems: state.cartItems.filter(item =>
          !(item.id === productId && item.selectedVariant?.id === variantId)
        )
      }));
      get().groupCartBySeller(); // Update UI groupings immediately

      // 2. Background DB Sync
      const user = await getCurrentUser();
      if (user) {
        try {
          const cart = await cartService.getOrCreateCart(user.id);
          if (cart) {
            const items = await cartService.getCartItems(cart.id);
            // Find specific variant item
            const itemToDelete = items.find(i =>
              i.product_id === productId &&
              (variantId ? i.variant_id === variantId : !i.variant_id)
            );

            if (itemToDelete) {
              await cartService.removeFromCart(itemToDelete.id);

              // Silent Refetch to ensure consistency (e.g., if multiple variants existed)
              const dbItems = await cartService.getCartItems(cart.id);
              const mappedItems: CartItem[] = dbItems.map(mapDbItemToCartItem).filter(Boolean) as CartItem[];

              // Update state with actual DB truth (prevents drift)
              set({ cartItems: mappedItems });
              get().groupCartBySeller();
            }
          }
        } catch (error) {
          console.error('Error removing from database cart:', error);
          // 3. Rollback on Error
          set({ cartItems: previousCartItems });
          get().groupCartBySeller();
          // Optional: You could trigger a toast here
        }
      }
    },

    updateCartQuantity: async (productId, quantity, variantId) => {
      if (quantity <= 0) {
        get().removeFromCart(productId, variantId);
        return;
      }

      // 1. Optimistic Update
      const previousCartItems = get().cartItems; // Capture state for rollback
      set((state) => ({
        cartItems: state.cartItems.map(item =>
          (item.id === productId && item.selectedVariant?.id === variantId)
            ? { ...item, quantity }
            : item
        )
      }));
      get().groupCartBySeller(); // Update UI immediately

      // 2. Background DB Sync
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
              await cartService.updateCartItemQuantity(itemToUpdate.id, quantity);

              // Silent Refetch
              const dbItems = await cartService.getCartItems(cart.id);
              const mappedItems: CartItem[] = dbItems.map(mapDbItemToCartItem).filter(Boolean) as CartItem[];

              set({ cartItems: mappedItems });
              get().groupCartBySeller();
            }
          }
        } catch (error) {
          console.error('Error updating database cart quantity:', error);
          // 3. Rollback on Error
          set({ cartItems: previousCartItems });
          get().groupCartBySeller();
        }
      }
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
    availableVouchers: [
      {
        id: 'voucher-1',
        code: 'WELCOME20',
        title: '20% Off Welcome Voucher',
        description: 'Get 20% off your first order',
        type: 'percentage',
        value: 20,
        minOrderValue: 500,
        maxDiscount: 200,
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2025-12-31'),
        usageLimit: 1000,
        used: 150,
        isActive: true
      },
      {
        id: 'voucher-2',
        code: 'FREESHIP',
        title: 'Free Shipping Voucher',
        description: 'Free shipping on orders over ₱800',
        type: 'shipping',
        value: 100,
        minOrderValue: 800,
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2025-12-31'),
        usageLimit: 500,
        used: 75,
        isActive: true
      }
    ],

    appliedVouchers: {},
    platformVoucher: null,

    validateVoucher: async (code, sellerId) => {
      const { availableVouchers, cartItems, groupedCart } = get();
      const voucher = availableVouchers.find(v =>
        v.code.toLowerCase() === code.toLowerCase() &&
        v.isActive &&
        new Date() >= v.validFrom &&
        new Date() <= v.validTo &&
        v.used < v.usageLimit &&
        (!v.sellerId || v.sellerId === sellerId)
      );

      if (!voucher) return null;

      // Check minimum order value
      const relevantTotal = sellerId
        ? groupedCart[sellerId]?.subtotal || 0
        : cartItems.reduce((total, item) => total + (item.selectedVariant?.price || item.price) * item.quantity, 0);

      if (relevantTotal < voucher.minOrderValue) return null;

      return voucher;
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

    removeSelectedItems: async () => {
      const user = await getCurrentUser();
      const selectedItems = get().cartItems.filter(item => item.selected);

      if (user) {
        try {
          const cart = await cartService.getOrCreateCart(user.id);
          if (cart) {
            const dbItems = await cartService.getCartItems(cart.id);
            // Match selected items with DB items to delete
            // Ideally we should have the DB ID in cartItems, leveraging product_id matching for now
            for (const item of selectedItems) {
              const dbItem = dbItems.find(i => i.product_id === item.id && i.variant?.id === item.selectedVariant?.id);
              if (dbItem) {
                await cartService.removeFromCart(dbItem.id);
              }
            }
          }
        } catch (error) {
          console.error('Error removing selected items from DB:', error);
        }
      }

      set((state) => ({
        cartItems: state.cartItems.filter(item => !item.selected)
      }));
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
              bazcoins: 0,
            }]);

          if (insertError) {
            console.error('Error creating buyer profile:', insertError);
            throw insertError;
          }
        }

        // Now fetch the complete profile data
        const { data: buyerData, error: buyerError } = await supabase
          .from('buyers')
          .select(`
            *,
            profile:profiles!id (
              id, email, first_name, last_name, phone, created_at
            )
          `)
          .eq('id', userId)
          .single();

        if (buyerError) {
          console.error('Error fetching buyer profile:', buyerError);
          throw buyerError;
        }

        const addressesFromService = await addressService.getUserAddresses(userId);

        // Extract profile info from the joined data
        const profileInfo = buyerData.profile;
        const buyerInfo = {
          ...buyerData,
          firstName: profileInfo.first_name || '',
          lastName: profileInfo.last_name || '',
          email: profileInfo.email,
          phone: profileInfo.phone || '',
          avatar: buyerData.avatar_url || '/placeholder-avatar.jpg',
          memberSince: new Date(profileInfo.created_at),
          totalSpent: buyerData.total_spent || 0,
          bazcoins: buyerData.bazcoins || 0,
          totalOrders: 0,
        };

        // Set the profile in the store
        set({ profile: buyerInfo as BuyerProfile });

        set({ addresses: addressesFromService });

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
        registries: [...state.registries, registry]
      }));
    },
    deleteRegistry: (registryId) => {
      set((state) => ({
        registries: state.registries.filter(r => r.id !== registryId)
      }));
    },
    addToRegistry: (registryId, product) => {
      set((state) => ({
        registries: state.registries.map(r =>
          r.id === registryId
            ? {
              ...r,
              products: [...(r.products || []), {
                ...product,
                requestedQty: 1,
                receivedQty: 0,
                isMostWanted: false
              }]
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
              products: (r.products || []).map(p =>
                p.id === productId ? { ...p, ...updates } : p
              )
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