import { Badge } from "@/components/ui/badge";
import { prefetchRoute } from "@/lib/prefetch";
import {
    Camera,
    ChevronDown,
    Gift,
    Headset,
    Lightbulb,
    LogOut,
    MessageCircle,
    Package,
    RotateCcw,
    Settings,
    User
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { chatService } from "../services/chatService";
import { discountService } from "../services/discountService";
import { useBuyerStore } from "../stores/buyerStore";
import { NotificationsDropdown } from "./NotificationsDropdown";
import ProductRequestModal from "./ProductRequestModal";
import SupportModal from "./SupportModal";
import VisualSearchModal from "./VisualSearchModal";

interface HeaderProps {
  transparentOnTop?: boolean;
  hideSearch?: boolean;
}

const Header: React.FC<HeaderProps> = ({ transparentOnTop = false, hideSearch = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout, getTotalCartItems, cartItems, campaignDiscountCache, updateCampaignDiscountCache, initializeCart, subscribeToProfile, unsubscribeFromProfile } = useBuyerStore();

  // Live discount map — merges the reactive Zustand cache with freshly fetched data.
  // campaignDiscountCache from Zustand IS reactive: any update from the cart page or
  // initializeCart is immediately visible here. We supplement it with a per-session
  // fetch so the header stays accurate even before the user visits the cart page.
  const [fetchedDiscounts, setFetchedDiscounts] = useState<Record<string, import('@/types/discount').ActiveDiscount>>({});

  // Derived: always includes the latest Zustand cache + any fresh header-fetch results
  const headerDiscountMap: Record<string, import('@/types/discount').ActiveDiscount> = { ...campaignDiscountCache, ...fetchedDiscounts };

  const cartProductIdsKey = cartItems.map(i => i.id).filter(Boolean).sort().join('|');

  useEffect(() => {
    let cancelled = false;
    const productIds = cartProductIdsKey ? cartProductIdsKey.split('|') : [];
    if (productIds.length === 0) return; // don't clear on initial empty-cart state
    discountService.getActiveDiscountsForProducts(productIds).then(discounts => {
      if (cancelled) return;
      setFetchedDiscounts(discounts);
      updateCampaignDiscountCache(discounts); // keep store cache in sync
    }).catch(() => { /* campaignDiscountCache already serves as fallback */ });
    return () => { cancelled = true; };
  }, [cartProductIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve effective (post-discount) unit price for a cart item
  const getDropdownPrice = (item: (typeof cartItems)[0]): number => {
    const basePrice = (item as any).selectedVariant?.price ?? item.price;
    const discount = headerDiscountMap[item.id] ?? null;
    const { discountedUnitPrice } = discountService.calculateLineDiscount(basePrice, 1, discount);
    return discountedUnitPrice;
  };
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const cartDropdownRef = useRef<HTMLDivElement>(null);
  const cartHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showVisualSearchModal, setShowVisualSearchModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    if (!profile?.id || location.pathname === '/messages') {
      setUnreadMessageCount(0);
      return;
    }
    let active = true;

    // Initial fetch
    const fetchCount = async () => {
      const count = await chatService.getUnreadCount(profile.id, 'buyer');
      if (active) {
        setUnreadMessageCount(count);
      }
    };
    fetchCount();

    // Real-time listener for new messages - reload count when messages arrive
    const unsub = chatService.subscribeToConversations(
      profile.id,
      'buyer',
      () => { void fetchCount(); } // Refresh count when activity detected
    );

    // Fallback polling every 5 seconds to ensure we catch all messages
    const interval = setInterval(() => { void fetchCount(); }, 5000);

    return () => {
      active = false;
      unsub();
      clearInterval(interval);
    };
  }, [profile?.id, location.pathname]);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Check if we're on the search page
  const isSearchPage = location.pathname === "/search";

  const handleSignOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Header sign-out failed:', error);
    } finally {
      logout();
      setShowProfileMenu(false);
      navigate('/login');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    if (transparentOnTop) {
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [transparentOnTop]);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const headerClasses = transparentOnTop
    ? `fixed top-0 w-full z-[100] transition-all duration-300 ${isScrolled ? "bg-[var(--bg-secondary)]/80 backdrop-blur-md shadow-sm" : "bg-transparent"
    }`
    : "sticky top-0 z-[100] bg-[var(--brand-wash)]";

  return (
    <header className={headerClasses}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer shrink-0 transition-transform duration-300 hover:scale-110 origin-left"
            onClick={() => navigate("/")}
          >
            <div className={`flex items-center gap-2 transition-all duration-300 ${transparentOnTop && !isScrolled ? "drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" : ""}`}>
              <img loading="eager"
                src="/BazaarX.png"
                alt="BazaarX Logo"
                className="h-12 w-auto object-contain"
              />
              <span
                className="font-['Tenor Sans'] text-2xl font-bold tracking-tight hidden md:block text-[var(--brand-primary)]">
                BazaarX
              </span>
            </div>
          </div>

          {!hideSearch && (
            <div className={`hidden md:flex flex-1 min-w-[200px] mx-auto items-center justify-center lg:max-w-2xl px-4 lg:px-8 transition-opacity duration-300 ${transparentOnTop && !isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <div className="relative w-full max-w-xl lg:max-w-full group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-[var(--brand-primary)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder={location.pathname === "/stores" ? "Search for stores..." : "Search for products, brands, categories"}
                  className="w-full pl-11 pr-12 py-3 bg-white border border-gray-100 rounded-full text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-0 focus:border-[var(--brand-primary)] transition-all text-sm shadow-md hover:shadow-lg"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const query = (e.target as HTMLInputElement).value;
                      if (location.pathname === "/stores") {
                        navigate(`/stores${query ? "?q=" + encodeURIComponent(query) : ""}`);
                      } else {
                        const url = `/products${query ? "?q=" + encodeURIComponent(query) : ""}`;
                        // Only replace history when the current page is already a search on /products
                        // (has ?q= param). If it's a category view (?categoryId=), push so back works.
                        const currentParams = new URLSearchParams(location.search);
                        const isAlreadySearching = location.pathname === "/products" && currentParams.has("q");
                        navigate(url, { replace: isAlreadySearching });
                      }
                    }
                  }}
                  defaultValue={new URLSearchParams(location.search).get("q") || ""}
                  key={location.search}
                />

                {location.pathname !== "/stores" && (
                  <button
                    onClick={() => setShowVisualSearchModal(true)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors rounded-full hover:bg-[var(--brand-wash)] p-1"
                    title="Search by image"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Right Navigation */}
          <div
            className="flex items-center justify-end text-[var(--text-primary)] shrink-0 gap-[var(--spacing-md)]">
            {!isSearchPage && !hideSearch && (
              <button
                onClick={() => navigate("/products")}
                className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            )}


            {/* Cart */}
            <div
              ref={cartDropdownRef}
              className="relative"
              onMouseEnter={() => {
                if (cartHideTimer.current) clearTimeout(cartHideTimer.current);
                prefetchRoute(() => import("../pages/EnhancedCartPage"));
                setShowCartDropdown(true);
              }}
              onMouseLeave={() => {
                cartHideTimer.current = setTimeout(() => setShowCartDropdown(false), 150);
              }}
            >
              <button
                onClick={() => { setShowCartDropdown(false); navigate("/enhanced-cart"); }}
                className={`relative p-2 rounded-full transition-all duration-300 ${location.pathname === "/enhanced-cart"
                  ? "text-[var(--brand-primary)] bg-[var(--brand-wash)] shadow-sm scale-110"
                  : "text-[var(--text-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-wash)]"
                  }`}
                title="Shopping Cart"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {profile && getTotalCartItems() > 0 && (
                  <Badge className="absolute top-0 right-0 min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-red-500 text-white border-none rounded-full text-xs">
                    {getTotalCartItems() > 9 ? "9+" : getTotalCartItems()}
                  </Badge>
                )}
              </button>

              {/* Cart Dropdown Preview */}
              {showCartDropdown && (
                <div
                  className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] overflow-hidden"
                  onMouseEnter={() => {
                    if (cartHideTimer.current) clearTimeout(cartHideTimer.current);
                  }}
                  onMouseLeave={() => {
                    cartHideTimer.current = setTimeout(() => setShowCartDropdown(false), 150);
                  }}
                >
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-bold text-sm text-[var(--text-headline)]">
                      My Cart
                      {getTotalCartItems() > 0 && (
                        <span className="ml-1.5 text-xs font-semibold text-white bg-red-500 rounded-full px-1.5 py-0.5">
                          {getTotalCartItems()}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => setShowCartDropdown(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <svg className="w-10 h-10 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-sm font-medium text-gray-500">Your cart is empty</p>
                      <button
                        onClick={() => { setShowCartDropdown(false); navigate("/shop"); }}
                        className="mt-3 text-xs font-bold text-[var(--brand-primary)] hover:underline"
                      >
                        Start shopping
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 scrollbar-hide">
                        {cartItems.slice(0, 5).map((item) => {
                          const img = item.image || (item as any).selectedVariant?.image || '';
                          const price = (item as any).selectedVariant?.price ?? item.price;
                          const effectivePrice = getDropdownPrice(item);
                          // Strikethrough: use campaign-discount base price, or seller's "compare-at" originalPrice
                          const strikethroughPrice: number | null = effectivePrice < price
                            ? price                                                      // campaign discount active
                            : ((item.originalPrice ?? 0) > price ? (item.originalPrice ?? null) : null); // seller "was" price
                          const variantLabel = (item as any).selectedVariant?.name ||
                            [(item as any).selectedVariant?.size, (item as any).selectedVariant?.color].filter(Boolean).join(' / ');
                          const discountPct = strikethroughPrice !== null
                            ? Math.round(((strikethroughPrice - effectivePrice) / strikethroughPrice) * 100)
                            : 0;
                          return (
                            <div
                              key={item.cartItemId || item.id}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => { setShowCartDropdown(false); navigate(`/product/${item.id}`); }}
                            >
                              {/* Thumbnail with discount badge overlay */}
                              <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                <img
                                  src={img || 'https://placehold.co/80x80?text=?'}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/80x80?text=?'; }}
                                />
                                {discountPct > 0 && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-[#DC2626] text-white text-[8px] font-black text-center leading-[13px] tracking-wide">
                                    -{discountPct}%
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-[var(--text-headline)] line-clamp-1">{item.name}</p>
                                {variantLabel && (
                                  <p className="text-[10px] text-gray-400">{variantLabel}</p>
                                )}
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-bold text-[var(--brand-primary)]">₱{effectivePrice.toLocaleString()}</span>
                                  {strikethroughPrice !== null && (
                                    <span className="text-[10px] text-gray-400 line-through">₱{strikethroughPrice.toLocaleString()}</span>
                                  )}
                                  <span className="text-[10px] text-gray-400">× {item.quantity}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {cartItems.length > 5 && (
                          <div className="px-4 py-2 text-center text-xs text-gray-400">
                            +{cartItems.length - 5} more item{cartItems.length - 5 !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-500">{getTotalCartItems()} item{getTotalCartItems() !== 1 ? 's' : ''}</span>
                          <span className="text-sm font-bold text-[var(--text-headline)]">
                            ₱{cartItems.reduce((sum, item) => sum + getDropdownPrice(item) * item.quantity, 0).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => { setShowCartDropdown(false); navigate("/enhanced-cart"); }}
                          className="w-full py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-sm font-bold transition-all active:scale-95"
                        >
                          Go to Cart
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Orders */}
            <button
              onClick={() => navigate("/orders")}
              className={`relative p-2 rounded-full transition-all duration-300 ${location.pathname === "/orders"
                ? "text-[var(--brand-primary)] bg-[var(--brand-wash)] shadow-sm scale-110"
                : "text-[var(--text-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-wash)]"
                }`}
              title="My Orders"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </button>

            {/* Registry */}
            <button
              onClick={() => navigate("/registry")}
              className={`relative p-2 rounded-full transition-all duration-300 ${location.pathname === "/registry"
                ? "text-[var(--brand-primary)] bg-[var(--brand-wash)] shadow-sm scale-110"
                : "text-[var(--text-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-wash)]"
                }`}
              title="Wishlist & Gifting"
            >
              <Gift className="h-6 w-6" />
            </button>

            {/* Messages */}
            <button
              onClick={() => navigate("/messages")}
              className={`relative p-2 rounded-full transition-all duration-300 ${location.pathname === "/messages"
                ? "text-[var(--brand-primary)] bg-[var(--brand-wash)] shadow-sm scale-110"
                : "text-[var(--text-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-wash)]"
                }`}
              title="Messages"
            >
              <MessageCircle className="h-6 w-6" />
              {unreadMessageCount > 0 && (
                <Badge className="absolute top-0 right-0 min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-red-500 text-white border-none rounded-full text-xs">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </Badge>
              )}
            </button>

            {/* Community Requests */}
            <button
              onClick={() => navigate("/requests")}
              className={`relative p-2 rounded-full transition-all duration-300 ${location.pathname.startsWith("/requests")
                ? "text-[var(--brand-primary)] bg-[var(--brand-wash)] shadow-sm scale-110"
                : "text-[var(--text-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-wash)]"
                }`}
              title="Community Requests"
            >
              <Lightbulb className="h-6 w-6" />
            </button>

            {/* Notifications */}
            <NotificationsDropdown />

            {/* Profile */}
            <div className="relative" ref={profileMenuRef}>
              {profile ? (
                <>
                  <div
                    className="flex items-center gap-1 cursor-pointer group"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                  >
                    <div className="relative">
                      <div className="w-9 h-9 bg-[var(--brand-primary)] rounded-full flex items-center justify-center overflow-hidden transition-transform border border-gray-300">
                        {profile.avatar ? (
                          <img loading="lazy" src={profile.avatar} alt={profile.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-sm font-bold">
                            {profile.firstName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-sm group-hover:scale-110 ">
                        <ChevronDown
                          className={`h-3 w-3 text-gray-500 transition-transform ${showProfileMenu ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                    <div className="hidden xl:block text-left">
                      <p className="text-sm font-bold text-[var(--text-headline)] group-hover:text-[var(--brand-primary)] transition-colors leading-none">
                        {profile.firstName}
                      </p>
                    </div>


                  </div>

                  {/* Profile Dropdown */}
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-[var(--brand-wash)] rounded-xl shadow-xl z-50 overflow-hidden text-[var(--text-primary)] animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 bg-[var(--brand-wash)]/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--brand-primary)] rounded-full flex items-center justify-center overflow-hidden shadow-md text-white font-bold text-base">
                            {profile.avatar ? (
                              <img loading="lazy" src={profile.avatar} alt={profile.firstName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{profile.firstName.charAt(0)}</span>
                            )}
                          </div>
                          <div className="hidden md:flex flex-col items-start">
                            <span className="text-sm font-medium text-gray-800 leading-none">
                              {profile.firstName} {profile.lastName}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="w-3 h-3 bg-[var(--brand-accent)] rounded-full flex items-center justify-center">
                                <span className="text-[8px] font-bold text-white">B</span>
                              </div>
                              <span className="text-xs text-[var(--text-muted)]">{profile.bazcoins} Bazcoins</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-1 space-y-0.5">
                        <button
                          onClick={() => {
                            navigate("/profile");
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-primary)] rounded-lg transition-all"
                        >
                          <User className="h-3.5 w-3.5" />
                          My Profile
                        </button>

                        <button
                          onClick={() => {
                            navigate("/returns");
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-primary)] rounded-lg transition-all"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          My Returns
                        </button>

                        <button
                          onClick={() => {
                            navigate("/my-requests");
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-primary)] rounded-lg transition-all"
                        >
                          <Package className="h-3.5 w-3.5" />
                          My Requests
                        </button>

                        <div className="h-px bg-gray-100 my-1 mx-2"></div>

                        <button
                          onClick={() => {
                            navigate("/settings");
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-primary)] rounded-lg transition-all"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Settings
                        </button>


                        <button
                          onClick={() => {
                            navigate('/buyer-support');
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-primary)] rounded-lg transition-all"
                        >
                          <Headset className="h-3.5 w-3.5" />
                          Help Center
                        </button>

                        <button
                          onClick={() => {
                            void handleSignOut();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-1 group"
                >
                  <span className="text-sm font-bold text-[var(--text-headline)] group-hover:text-[var(--brand-primary)] transition-colors">
                    Sign In
                  </span>
                  <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-[var(--brand-primary)] shadow-sm hover:scale-105 transition-transform border border-gray-200">
                    <User className="w-5 h-5" />
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Visual Search Modal */}
      <VisualSearchModal
        isOpen={showVisualSearchModal}
        onClose={() => setShowVisualSearchModal(false)}
        onRequestProduct={() => {
          setShowVisualSearchModal(false);
          setShowRequestModal(true);
        }}
      />

      <ProductRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
      />

      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />
    </header>
  );
};

export default Header;
