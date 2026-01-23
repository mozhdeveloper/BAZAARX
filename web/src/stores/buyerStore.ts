import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as cartService from '@/services/cartService';
import { getCurrentUser } from '@/lib/supabase';
import { ReactNode } from 'react';

// Enhanced interfaces for buyer features
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
  };
  memberSince: Date;
  totalOrders: number;
  totalSpent: number;
  bazcoins: number;
  savedCards?: SavedCard[];
}

export interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  expiry: string;
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
  addAddress: (address: Address) => void;
  updateAddress: (id: string, updates: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;


  // Following Shops
  followedShops: string[]; // seller IDs
  followShop: (sellerId: string) => void;
  unfollowShop: (sellerId: string) => void;
  isFollowing: (sellerId: string) => boolean;

  // Enhanced Cart with Multi-seller grouping
  cartItems: CartItem[];
  groupedCart: GroupedCart;
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateCartNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  getTotalCartItems: () => number;
  groupCartBySeller: () => void;

  // Quick Order (Buy Now)
  quickOrder: CartItem | null;
  setQuickOrder: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  clearQuickOrder: () => void;
  getQuickOrderTotal: () => number;

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
}

const mapDbItemToCartItem = (item: any): CartItem | null => {
  const dbProduct = item.product;
  if (!dbProduct) return null;

  const sellerData = dbProduct.seller;

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    price: dbProduct.price,
    originalPrice: dbProduct.original_price,
    image: dbProduct.primary_image || (dbProduct.images && dbProduct.images[0]) || "",
    images: dbProduct.images || [],
    seller: {
      id: dbProduct.seller_id,
      name: sellerData?.store_name || sellerData?.business_name || "Verified Seller",
      avatar: "",
      rating: sellerData?.rating || 0,
      totalReviews: 0,
      followers: 0,
      isVerified: sellerData?.is_verified ?? true,
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
    selectedVariant: item.selected_variant,
    notes: item.notes
  } as CartItem;
};

export const useBuyerStore = create<BuyerStore>()(persist(
  (set, get) => ({
    // Profile Management
    profile: null,

    setProfile: (profile) => {
      // Mock saved cards for demo
      if (!profile.savedCards) {
        profile.savedCards = [
          { id: 'card_web_1', last4: '1111', brand: 'Visa', expiry: '05/30' },
          { id: 'card_web_2', last4: '2222', brand: 'MasterCard', expiry: '09/25' },
        ];
      }
      set({ profile });
    },
    updateProfile: (updates) => set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null
    })),
    logout: () => set({ profile: null, cartItems: [], groupedCart: {}, appliedVouchers: {}, platformVoucher: null }),

    // Address Book
    addresses: [],

    setAddresses: (addresses) => set({ addresses }),

    addAddress: (address) => set((state) => ({
      addresses: [...state.addresses, address]
    })),

    updateAddress: (id, updatedAddress) => set((state) => ({
      addresses: state.addresses.map(addr =>
        addr.id === id ? { ...addr, ...updatedAddress } : addr
      )
    })),

    deleteAddress: (id) => set((state) => ({
      addresses: state.addresses.filter(addr => addr.id !== id)
    })),

    setDefaultAddress: (id) => set((state) => ({
      addresses: state.addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === id
      }))
    })),

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

    setQuickOrder: (product, quantity = 1, variant) => {
      set({
        quickOrder: {
          ...product,
          quantity,
          selectedVariant: variant
        }
      });
    },

    clearQuickOrder: () => set({ quickOrder: null }),

    getQuickOrderTotal: () => {
      const { quickOrder } = get();
      if (!quickOrder) return 0;
      return quickOrder.price * quickOrder.quantity;
    },

    addToCart: async (product, quantity = 1, variant) => {
      // Check if user is logged in
      const user = await getCurrentUser();

      if (user) {
        try {
          const cart = await cartService.getOrCreateCart(user.id);
          if (cart) {
            // Add to database - this already handles duplicates correctly
            await cartService.addToCart(
              cart.id,
              product.id,
              quantity,
              variant
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
          newCartItems = [...state.cartItems, {
            ...product,
            quantity,
            selectedVariant: variant,
            selected: true // Default to selected
          }];
        }

        return { cartItems: newCartItems };
      });
      get().groupCartBySeller();
    },

    removeFromCart: async (productId) => {
      const user = await getCurrentUser();
      if (user) {
        try {
          const cart = await cartService.getOrCreateCart(user.id);
          if (cart) {
            const items = await cartService.getCartItems(cart.id);
            const itemToDelete = items.find(i => i.product_id === productId);
            if (itemToDelete) {
              await cartService.removeFromCart(itemToDelete.id);

              // Refetch cart items from database to sync state
              const dbItems = await cartService.getCartItems(cart.id);
              const mappedItems: CartItem[] = dbItems.map(mapDbItemToCartItem).filter(Boolean) as CartItem[];

              set({ cartItems: mappedItems });
              get().groupCartBySeller();
              return;
            }
          }
        } catch (error) {
          console.error('Error removing from database cart:', error);
        }
      }

      // Fallback to local state
      set((state) => ({
        cartItems: state.cartItems.filter(item => item.id !== productId)
      }));
      get().groupCartBySeller();
    },

    updateCartQuantity: async (productId, quantity) => {
      if (quantity <= 0) {
        get().removeFromCart(productId);
        return;
      }

      const user = await getCurrentUser();
      if (user) {
        try {
          const cart = await cartService.getOrCreateCart(user.id);
          if (cart) {
            const items = await cartService.getCartItems(cart.id);
            const itemToUpdate = items.find(i => i.product_id === productId);
            if (itemToUpdate) {
              await cartService.updateCartItemQuantity(itemToUpdate.id, quantity);

              // Refetch cart items from database to sync state
              const dbItems = await cartService.getCartItems(cart.id);
              const mappedItems: CartItem[] = dbItems.map(mapDbItemToCartItem).filter(Boolean) as CartItem[];

              set({ cartItems: mappedItems });
              get().groupCartBySeller();
              return;
            }
          }
        } catch (error) {
          console.error('Error updating database cart quantity:', error);
        }
      }

      // Fallback to local state
      set((state) => ({
        cartItems: state.cartItems.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      }));
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
              const dbItem = dbItems.find(i => i.product_id === item.id && i.selected_variant?.id === item.selectedVariant?.id);
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
        const cart = await cartService.getOrCreateCart(user.id);
        if (cart) {
          const dbItems = await cartService.getCartItems(cart.id);

          // Map DB items to store items
          const mappedItems: CartItem[] = dbItems.map(mapDbItemToCartItem).filter(Boolean) as CartItem[];

          set({ cartItems: mappedItems });
          get().groupCartBySeller();
        }
      } catch (error) {
        console.error('Error initializing cart from DB:', error);
      }
    }
  }),
  {
    name: 'buyer-storage',
    partialize: (state) => ({
      profile: state.profile,
      addresses: state.addresses,
      followedShops: state.followedShops,
      cartItems: state.cartItems,
      reviews: state.reviews
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