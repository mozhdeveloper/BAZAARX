import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartService } from '@/services/cartService';
import { getCurrentUser, supabase } from '@/lib/supabase';
import { productService } from '@/services/productService';
import { AddressService } from '@/services/addressService';
import type { ActiveDiscount } from '@/types/discount';

// Re-export all types and helpers from split files
export * from './buyer/buyerTypes';
export { deriveBuyerName, demoSellers } from './buyer/buyerHelpers';

import type {
  Message, RegistryPrivacy, RegistryDeliveryPreference, RegistryProduct, RegistryItem,
  Conversation, Seller, Product, ProductVariant, CartItem, GroupedCart,
  Voucher, VoucherValidationErrorCode, VoucherValidationResult, Review,
  Address, BuyerProfile, PaymentMethod,
} from './buyer/buyerTypes';
import {
  deriveBuyerName,
  ensureRegistryProductDefaults, ensureRegistryDefaults, UUID_REGEX, isRealUUID,
  mapDbToRegistryProduct, mapDbToRegistryItem, mapDbItemToCartItem,
} from './buyer/buyerHelpers';

// Helper functions imported from './buyer/buyerHelpers'

// Types imported from './buyer/buyerTypes'

// deriveBuyerName imported from './buyer/buyerHelpers'

// Product, ProductVariant, CartItem, GroupedCart, Voucher, VoucherValidationErrorCode,
// VoucherValidationResult, Review, Address, BuyerProfile, PaymentMethod
// — all imported from './buyer/buyerTypes'

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
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant, options?: { forceNewItem?: boolean }) => Promise<string | undefined>;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, variantId?: string) => void;
  updateItemVariant: (productId: string, oldVariantId: string | undefined, newVariant: ProductVariant, quantity?: number) => Promise<void>;
  updateCartNotes: (productId: string, notes: string) => void;
  
  clearCart: () => Promise<void>;
  isValidatingCheckout: boolean;
  checkoutErrors: Record<string, string>;
  validateCheckout: (selectedIds: string[]) => Promise<boolean>;
  
  getCartTotal: () => number;
  getCartItemCount: () => number;
  getTotalCartItems: () => number;
  groupCartBySeller: () => void;

  // Campaign Discount Cache — persists across navigations for instant display
  campaignDiscountCache: Record<string, ActiveDiscount>;
  updateCampaignDiscountCache: (updates: Record<string, ActiveDiscount>) => void;

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
  // Backend supported Reviews
  fetchMyReviews: () => Promise<Review[]>;
  updateMyReview: (reviewId: string, updates: Partial<Review> & Record<string, unknown>) => Promise<boolean>;
  deleteMyReview: (reviewId: string) => Promise<boolean>;

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
  loadRegistries: () => Promise<void>;
  loadPublicRegistry: (registryId: string) => Promise<RegistryItem | null>;
  createRegistry: (registry: RegistryItem) => Promise<void>;
  updateRegistryMeta: (registryId: string, updates: Partial<RegistryItem>) => Promise<void>;
  addToRegistry: (registryId: string, product: Product) => Promise<void>;
  updateRegistryItem: (registryId: string, productId: string, updates: Partial<RegistryProduct>) => Promise<void>;
  removeRegistryItem: (registryId: string, productId: string) => Promise<void>;
  deleteRegistry: (registryId: string) => Promise<void>;

  initializeBuyerProfile: (userId: string, profileData: any) => Promise<BuyerProfile>;

  // Checkout Context — prefetched seller metadata from Edge Function
  sellerMetadata: Record<string, any>;
  isLoadingCheckoutContext: boolean;
  loadCheckoutContext: (productIds: string[]) => Promise<void>;

}



let profileSubscription: any = null;
const db: any = supabase;

// mapDbItemToCartItem imported from './buyer/buyerHelpers'

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

      // Buyer-owned fields live on buyers table (including avatar_url!)
      if (updates.avatar !== undefined) buyerUpdates.avatar_url = updates.avatar;
      if (updates.preferences !== undefined) buyerUpdates.preferences = updates.preferences;
      if (updates.bazcoins !== undefined) buyerUpdates.bazcoins = updates.bazcoins;

      try {
        // 1) Update profiles table when applicable
        if (Object.keys(profileUpdates).length > 0) {
          const { error } = await db
            .from('profiles')
            .update(profileUpdates)
            .eq('id', currentProfile.id);
          if (error) throw error;
        }

        // 2) Update buyers table for buyer-specific fields
        if (Object.keys(buyerUpdates).length > 0) {
          const { error } = await db
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

    logout: () => set({ profile: null, addresses: [], notifications: [], cartItems: [], groupedCart: {}, appliedVouchers: {}, platformVoucher: null, sellerMetadata: {}, isLoadingCheckoutContext: false }),

    // Checkout Context
    sellerMetadata: {},
    isLoadingCheckoutContext: false,
    loadCheckoutContext: async (productIds: string[]) => {
      // Skip if already loading or no product IDs supplied
      if (get().isLoadingCheckoutContext || productIds.length === 0) return;

      set({ isLoadingCheckoutContext: true });
      try {
        // Dynamically import to avoid circular dependency issues
        const { getCheckoutContext } = await import('@/services/checkoutService');

        // Single call to Edge Function — addresses + sellers fetched concurrently inside
        const ctx = await getCheckoutContext(productIds);

        // Merge addresses from Edge Function into existing address book
        if (ctx.addresses && ctx.addresses.length > 0) {
          const mapped = ctx.addresses.map((a: any) => ({
            id: a.id,
            label: a.label ?? '',
            firstName: a.first_name ?? '',
            lastName: a.last_name ?? '',
            fullName: `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim(),
            phone: a.phone_number ?? a.phone ?? '', // Added phone_number
            street: a.address_line_1 ?? a.street ?? '', // Added address_line_1
            barangay: a.barangay ?? '',
            city: a.city ?? '',
            province: a.province ?? '',
            region: a.region ?? '',
            postalCode: a.postal_code ?? '',
            isDefault: a.is_default ?? false,
            coordinates: a.coordinates ?? undefined,
          }));
          set({ addresses: mapped });
        }

        set({ sellerMetadata: ctx.sellers ?? {} });
      } catch (error: any) {
        console.error('[BuyerStore] loadCheckoutContext failed:', error);
        if (error?.message === 'AUTH_EXPIRED') {
          throw error;
        }
        // Non-fatal: checkout can still proceed without prefetched seller metadata
      } finally {
        set({ isLoadingCheckoutContext: false });
      }
    },

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
          await db
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

        const { data: newAddr, error } = await db
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
            first_name: address.firstName,
            last_name: address.lastName,
            phone_number: address.phone,
            landmark: address.landmark,
            delivery_instructions: address.deliveryInstructions,
            coordinates: address.coordinates,
            is_default: address.isDefault || false,
            address_type: 'residential'
          })
          .select()
          .single();

        if (error) throw error;
        if (!newAddr) throw new Error('Failed to create address');

        const finalAddress = {
          ...address,
          id: newAddr.id,
          fullName
        } as Address;

        // Only update UI if DB insert succeeds
        set({ addresses: [...state.addresses, { ...address, id: newAddr.id, fullName: `${address.firstName} ${address.lastName}` }] });
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
          await db
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
          first_name: updatedAddress.firstName,
          last_name: updatedAddress.lastName,
          phone_number: updatedAddress.phone,
          landmark: updatedAddress.landmark,
          delivery_instructions: updatedAddress.deliveryInstructions,
          coordinates: updatedAddress.coordinates,
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

        const { error } = await db
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
        const { error } = await db
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
        await db.from('shipping_addresses').update({ is_default: false }).eq('user_id', userId);
        const { error } = await db.from('shipping_addresses').update({ is_default: true }).eq('id', id).eq('user_id', userId);

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
          await db.from('store_followers').upsert(
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
          await db.from('store_followers')
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
          const { data } = await db.from('store_followers')
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

    // Campaign Discount Cache
    campaignDiscountCache: {},
    updateCampaignDiscountCache: (updates) => set((state) => ({
      campaignDiscountCache: { ...state.campaignDiscountCache, ...updates }
    })),

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

    addToCart: async (product, quantity = 1, variant, options) => {
      // Check if user is logged in
      const user = await getCurrentUser();

      if (user) {
        try {
          const cart = await cartService.getOrCreateCart(user.id);
          if (cart) {
            // Verify product exists in products table to avoid FK violations
            try {
              const prod = await productService.getProductById(product.id);
              if (!prod) {
                console.warn('[buyerStore] Product not found in products table, falling back to local cart:', product.id);
                throw new Error('Product not found');
              }
            } catch (err) {
              // If product not found or productService failed, skip DB insert and fall back to local state
              throw err;
            }

            // Add to database - pass variant ID, not the whole object
            const addedCartItem = await cartService.addToCart(
              cart.id,
              product.id,
              quantity,
              variant?.id,  // Pass variant ID, not the whole object
              undefined,
              undefined,
              !!options?.forceNewItem
            );

            // Refetch cart items from database to sync state
            const dbItems = await cartService.getCartItems(cart.id);

            // Capture current selection state to preserve it after DB sync
            const currentItems = get().cartItems;
            const selectionMap = new Map<string, boolean>();
            currentItems.forEach(item => {
              if (item.selected) {
                const key = item.cartItemId || `${item.id}-${item.selectedVariant?.id || 'none'}`;
                selectionMap.set(key, true);
              }
            });

            // Map DB items to store items
            const mappedItems: CartItem[] = dbItems.map(mapDbItemToCartItem).filter(Boolean) as CartItem[];

            // Restore selection state OR select if it's the item we just added
            const itemsWithSelection = mappedItems.map(item => {
              const key = item.cartItemId || `${item.id}-${item.selectedVariant?.id || 'none'}`;
              // Select if it was already selected OR if it's the newly added product/variant
              const isNewlyAdded = (addedCartItem as any)?.id
                ? item.cartItemId === (addedCartItem as any).id
                : (item.id === product.id && (!variant || item.selectedVariant?.id === variant.id));

              return {
                ...item,
                selected: selectionMap.has(key) || isNewlyAdded
              };
            });

            set({ cartItems: itemsWithSelection });
            get().groupCartBySeller();
            return (addedCartItem as any)?.id;
          }
        } catch (error) {
          console.error('Error adding to database cart:', error);
        }
      }

      // Fallback to local state if not logged in or database operation failed
      set((state) => {
        const existingItem = options?.forceNewItem ? null : state.cartItems.find(item =>
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
            cartItemId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            quantity,
            selectedVariant: variant,
            selected: true, // Default to selected
            createdAt: new Date().toISOString(),
          }, ...state.cartItems];
        }

        return { cartItems: newCartItems };
      });
      get().groupCartBySeller();
      return get().cartItems[0]?.cartItemId;
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
      const item = get().cartItems.find(i =>
        i.id === productId && i.selectedVariant?.id === variantId
      );

      if (!item) return;

      // If quantity is 0 or less, trigger removal
      if (quantity <= 0) {
        get().removeFromCart(productId, variantId);
        return;
      }

      const previousCartItems = get().cartItems;

      // Optimistic Update
      set((state) => ({
        cartItems: state.cartItems.map(i =>
          (i.id === productId && i.selectedVariant?.id === variantId)
            ? { ...i, quantity }
            : i
        )
      }));
      get().groupCartBySeller();

      // Background Sync
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
            }
          }
        } catch (error) {
          console.error('Error updating quantity in database:', error);
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

      // Optimistic local update so the UI reflects the merge immediately
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
          image: newVariant.image || (newVariant as any).thumbnail_url || currentItem.image
        };
      }

      set({ cartItems: nextCartItems });
      get().groupCartBySeller();

      // 3. Persist to DB. The previous implementation only re-read DB without writing,
      // which meant a refresh would re-show the un-merged cart.
      if (user && currentItem.cartItemId) {
        try {
          // updateCartItemVariant atomically handles the merge case in DB
          // (sums qty into the existing target row and deletes the old row).
          await cartService.updateCartItemVariant(currentItem.cartItemId, newVariant.id);

          // If the user also changed the quantity (not just merged), update the surviving row.
          if (quantity !== undefined && quantity !== currentItem.quantity) {
            const cart = await cartService.getCart(user.id);
            if (cart) {
              const items = await cartService.getCartItems(cart.id);
              const survivor = (items as any[]).find(it =>
                it.product_id === productId && it.variant_id === newVariant.id
              );
              if (survivor) {
                await cartService.updateCartItemQuantity(survivor.id, finalQuantity);
              }
            }
          }
        } catch (error) {
          console.error('Error syncing variant change to DB:', error);
        }
        // Always re-sync from DB truth so cartItemIds, merged quantities, etc. are accurate.
        await get().initializeCart();
      }
    },

    updateCartNotes: (productId, notes) => {
      set((state) => ({
        cartItems: state.cartItems.map(item =>
          item.id === productId ? { ...item, notes } : item
        )
      }));
    },

    isValidatingCheckout: false,
    checkoutErrors: {},
    validateCheckout: async (selectedIds) => {
      set({ isValidatingCheckout: true, checkoutErrors: {} });
      try {
        const result = await cartService.validateCheckoutItems(selectedIds);
        if (!result.isValid) set({ checkoutErrors: result.errors });
        return result.isValid;
      } catch (e: any) {
        set({ checkoutErrors: { 'global': 'Validation failed.' }});
        return false;
      } finally {
        set({ isValidatingCheckout: false });
      }
    },

    clearCart: async () => {
      const user = await getCurrentUser();
      if (user) {
        try {
          const cart = await cartService.getCart(user.id);
          if (cart) await cartService.clearCart(cart.id);
        } catch (e) {
          console.error('[buyerStore] Failed to clear DB cart', e);
        }
      }
      set({ cartItems: [], groupedCart: {}, appliedVouchers: {}, platformVoucher: null });
    },

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
          type: v.voucher_type as 'percentage' | 'fixed' | 'shipping',
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
          type: dbVoucher.voucher_type as 'percentage' | 'fixed' | 'shipping',
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
          selected: productIds.includes(item.cartItemId || item.id) || productIds.includes(item.id)
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

    // ==== Database-Backed Reviews ====
    fetchMyReviews: async () => {
      const { profile } = get();

      if (!profile) return [];

      const { data, error } = await db
        .from('reviews')
        .select(`
          id, rating, comment, buyer_id, product_id, created_at,
          product:products(
            id,
            name,
            product_images(
              image_url,
              is_primary,
              sort_order
            )
          ),
          review_images(
            image_url,
            sort_order
           )
        `)
        .eq('buyer_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.error('Error fetching my reviews:', error.message);
        return;
      }
      set({ myReviews: data || [] });
      return data || [];
    },

    updateMyReview: async (reviewId, updates) => {
      const { profile, myReviews } = get();
      if (!profile) return false;

      const { data, error } = await db
        .from('reviews')
        .update(updates)
        .eq('id', reviewId)
        .eq('buyer_id', profile.id)
        .select('*')
        .single();
      if (error) {
        console.error('Error updating my review:', error.message);
        return false;
      }
      const safeData = (data ?? {}) as Partial<Review>;
      set({
        myReviews:
          myReviews.map((review) => (review.id === reviewId ? { ...review, ...safeData } : review))
      });
      return true;
    },

    deleteMyReview: async (reviewId) => {
      const { profile } = get();
      if (!profile) return false;

      const { error } = await db
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('buyer_id', profile.id);
      if (error) {
        console.error('Error deleting my review:', error.message);
        return false;
      }
      set((state) => ({
        myReviews: state.myReviews.filter(review => review.id !== reviewId)
      }));
      return true;
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
        const { data: existingBuyer, error: fetchError } = await db
          .from('buyers')
          .select('id, avatar_url, bazcoins, preferences')
          .eq('id', userId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 is the error code for "Row not found"
          console.error('Error checking buyer profile:', fetchError);
        }

        if (!existingBuyer) {
          // Buyer record doesn't exist, create one
          const { error: insertError } = await db
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
        let buyerData: any = null;
        let profileInfo: any = null;

        const { data: buyerWithProfile, error: buyerJoinError } = await db
          .from('buyers')
          .select(`
            id, avatar_url, bazcoins, preferences,
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
            db
              .from('buyers')
              .select('id, avatar_url, bazcoins, preferences')
              .eq('id', userId)
              .single(),
            db
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
        const { data: shippingAddresses } = await db
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
            await db
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
          totalSpent: 0,
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

        // Load registries from backend now that profile is set
        try {
          const { data: regRows } = await db
            .from('registries')
            .select('*, registry_items(*)')
            .eq('buyer_id', userId)
            .order('created_at', { ascending: false });
          if (regRows) {
            set({ registries: regRows.map(mapDbToRegistryItem) });
          }
        } catch (regErr) {
          console.error('Failed to load registries on init:', regErr);
        }

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

    loadRegistries: async () => {
      const { profile } = get();
      if (!profile?.id) return;

      console.log('fetching registries')

      const { data: rows, error } = await db
        .from('registries')
        .select('*, registry_items(*)')
        .eq('buyer_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load registries:', error);
        return;
      }
      set({ registries: (rows || []).map(mapDbToRegistryItem) });

      console.log("mapped registries", (rows || []).map(mapDbToRegistryItem));
    },

    loadPublicRegistry: async (registryId) => {
      console.log('fetching public registry:', registryId);

      const { data: registry, error } = await db
        .from('registries')
        .select('*, registry_items(*)')
        .eq('id', registryId)
        .eq('privacy', 'link')
        .single();

      console.log('[loadPublicRegistry] Raw DB response:', registry);
      console.log('[loadPublicRegistry] registry_items:', registry?.registry_items);
      console.log('[loadPublicRegistry] Error:', error);

      if (error) {
        console.error('Failed to load public registry:', error);
        return null;
      }

      return mapDbToRegistryItem(registry);
    },

    createRegistry: async (registry) => {
      const { profile } = get();
      if (!profile?.id) {
        // Guest fallback – keep local only
        set((state) => ({ registries: [...state.registries, ensureRegistryDefaults(registry)] }));
        return;
      }

      const tempId = registry.id;

      console.log('[createRegistry] Input registry:', registry);
      console.log('[createRegistry] registry.privacy:', registry.privacy);
      console.log('[createRegistry] registry.delivery:', registry.delivery);
      console.log('[createRegistry] registry.delivery.showAddress:', registry.delivery?.showAddress);
      console.log('[createRegistry] registry.delivery.instructions:', registry.delivery?.instructions);
      console.log('[createRegistry] registry.delivery.addressId:', registry.delivery?.addressId);

      // Optimistic update
      set((state) => ({ registries: [...state.registries, ensureRegistryDefaults(registry)] }));

      // Build delivery object with only defined values, ensuring proper JSONB structure
      const deliveryPayload: Record<string, any> = {
        showAddress: registry.delivery?.showAddress ?? false,
      };

      // Only include addressId if it has a value
      if (registry.delivery?.addressId) {
        deliveryPayload.addressId = registry.delivery.addressId;
      }

      // Only include instructions if it has a value
      if (registry.delivery?.instructions && registry.delivery.instructions.trim()) {
        deliveryPayload.instructions = registry.delivery.instructions.trim();
      }

      console.log('[createRegistry] Cleaned delivery payload:', deliveryPayload);

      // Stringify delivery to ensure it's sent as proper JSONB
      const deliveryJsonString = JSON.stringify(deliveryPayload);
      const deliveryJson = JSON.parse(deliveryJsonString);

      const insertPayload: any = {
        buyer_id: profile.id,
        title: registry.title,
        event_type: registry.category || 'Gift',
        category: registry.category,
        image_url: registry.imageUrl,
        shared_date: registry.sharedDate,
        privacy: registry.privacy || 'link',
        delivery: deliveryJson,
      };

      console.log('[createRegistry] Final insert payload:', JSON.stringify(insertPayload, null, 2));
      console.log('[createRegistry] delivery type:', typeof deliveryJson, Array.isArray(deliveryJson));
      console.log('[createRegistry] delivery keys:', Object.keys(deliveryJson));

      // Insert and get the created record in one call
      const { data: insertedData, error: insertError } = await db
        .from('registries')
        .insert(insertPayload as any)
        .select('*, registry_items(*)')
        .single();

      if (insertError) {
        console.error('Failed to create registry (insert):', insertError);
        console.error('Error details:', JSON.stringify(insertError, null, 2));
        set((state) => ({ registries: state.registries.filter((r) => r.id !== tempId) }));
        return;
      }

      console.log('[createRegistry] Insert successful');
      console.log('[createRegistry] Inserted ID:', insertedData?.id);

      const data = insertedData;

      console.log('[createRegistry] DB response data:', data);
      console.log('[createRegistry] DB response data.privacy:', data.privacy);
      console.log('[createRegistry] DB response data.delivery:', data.delivery);
      console.log('[createRegistry] DB response data.delivery keys:', data.delivery ? Object.keys(data.delivery) : 'null');

      // Swap the optimistic (temp-id) entry with the real DB record
      set((state) => ({
        registries: state.registries.map((r) => (r.id === tempId ? mapDbToRegistryItem(data) : r)),
      }));
    },

    updateRegistryMeta: async (registryId, updates) => {
      // Optimistic
      set((state) => ({
        registries: state.registries.map((r) =>
          r.id === registryId ? ensureRegistryDefaults({ ...r, ...updates }) : r
        ),
      }));

      const dbUpdate: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdate.title = updates.title;
      if (updates.recipientName !== undefined) dbUpdate.recipient_name = updates.recipientName;
      if (updates.category !== undefined) { dbUpdate.category = updates.category; dbUpdate.event_type = updates.category; }
      if (updates.imageUrl !== undefined) dbUpdate.image_url = updates.imageUrl;
      if (updates.sharedDate !== undefined) dbUpdate.shared_date = updates.sharedDate;
      if (updates.privacy !== undefined) dbUpdate.privacy = updates.privacy;
      if (updates.delivery !== undefined) dbUpdate.delivery = updates.delivery;

      const { error } = await db
        .from('registries')
        .update(dbUpdate)
        .eq('id', registryId);

      if (error) console.error('Failed to update registry meta:', error);
    },

    addToRegistry: async (registryId, product) => {
      const productWithDefaults = ensureRegistryProductDefaults(product);
      const normalizedProductId = String(product.id);
      const targetRegistry = get().registries.find((r) => r.id === registryId);
      const alreadyExistsInRegistry = !!targetRegistry?.products?.some((p) => {
        const sourceId = (p as any).sourceProductId;
        return String(sourceId || p.id) === normalizedProductId;
      });

      if (alreadyExistsInRegistry) {
        return;
      }

      const tempId = `temp-${Date.now()}`;
      const tempProduct = {
        ...productWithDefaults,
        sourceProductId: normalizedProductId,
        id: tempId,
      };

      // Optimistic
      set((state) => ({
        registries: state.registries.map((r) =>
          r.id === registryId
            ? { ...r, products: [...(r.products || []), tempProduct] }
            : r
        ),
      }));

      const { data, error } = await db
        .from('registry_items')
        .insert({
          registry_id: registryId,
          product_id: isRealUUID(product.id) ? product.id : null,
          product_name: product.name,
          quantity_desired: productWithDefaults.requestedQty || 1,
          requested_qty: productWithDefaults.requestedQty || 1,
          received_qty: productWithDefaults.receivedQty || 0,
          is_most_wanted: productWithDefaults.isMostWanted || false,
          notes: productWithDefaults.note ?? null,
          selected_variant: productWithDefaults.selectedVariant ?? null,
          product_snapshot: product,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to add to registry:', error);
        // Rollback
        set((state) => ({
          registries: state.registries.map((r) =>
            r.id === registryId
              ? { ...r, products: (r.products || []).filter((p) => p.id !== tempId) }
              : r
          ),
        }));
        return;
      }

      // Replace temp entry with real DB record
      set((state) => ({
        registries: state.registries.map((r) =>
          r.id === registryId
            ? {
              ...r,
              products: (r.products || []).map((p) =>
                p.id === tempId ? mapDbToRegistryProduct(data) : p
              ),
            }
            : r
        ),
      }));
    },

    updateRegistryItem: async (registryId, productId, updates) => {
      // Optimistic – productId IS the registry_items.id (set during mapDbToRegistryProduct)
      set((state) => ({
        registries: state.registries.map((r) =>
          r.id === registryId
            ? {
              ...r,
              products: (r.products || []).map((p) =>
                p.id === productId
                  ? ensureRegistryProductDefaults({ ...p, ...updates })
                  : p
              ),
            }
            : r
        ),
      }));

      const dbUpdates: Record<string, any> = {};
      if (updates.requestedQty !== undefined) {
        dbUpdates.quantity_desired = updates.requestedQty;
        dbUpdates.requested_qty = updates.requestedQty;
      }
      if (updates.receivedQty !== undefined) dbUpdates.received_qty = updates.receivedQty;
      if (updates.note !== undefined) dbUpdates.notes = updates.note;
      if (updates.isMostWanted !== undefined) dbUpdates.is_most_wanted = updates.isMostWanted;
      if (updates.selectedVariant !== undefined) dbUpdates.selected_variant = updates.selectedVariant;

      const { error } = await db
        .from('registry_items')
        .update(dbUpdates)
        .eq('id', productId);

      if (error) console.error('Failed to update registry item:', error);
    },

    removeRegistryItem: async (registryId, productId) => {
      const registry = get().registries.find(r => r.id === registryId);
      const item = registry?.products?.find(p => p.id === productId);
      
      if (item && item.receivedQty > 0) {
        console.warn('[removeRegistryItem] Cannot remove item with gift activity');
        throw new Error('Cannot remove item with gift activity');
      }

      // Optimistic
      set((state) => ({
        registries: state.registries.map((r) =>
          r.id === registryId
            ? { ...r, products: (r.products || []).filter((p) => p.id !== productId) }
            : r
        ),
      }));

      const { error } = await db
        .from('registry_items')
        .delete()
        .eq('id', productId);

      if (error) console.error('Failed to remove registry item:', error);
    },

    deleteRegistry: async (registryId) => {
      // Optimistic
      set((state) => ({
        registries: state.registries.filter((r) => r.id !== registryId),
      }));

      const { error } = await db
        .from('registries')
        .delete()
        .eq('id', registryId);

      if (error) console.error('Failed to delete registry:', error);
    }
  }),
  {
    name: 'buyer-storage',
    partialize: (state) => ({
      profile: state.profile,
      addresses: state.addresses,
      followedShops: state.followedShops,
      // cartItems intentionally excluded — always sourced from DB via initializeCart
      reviews: state.reviews,
      conversations: state.conversations,
      campaignDiscountCache: state.campaignDiscountCache,
      // registries intentionally excluded – sourced from backend, not local storage
    })
  }
));

// demoSellers re-exported from './buyer/buyerHelpers' via line 11
