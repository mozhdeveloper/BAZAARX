import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  User,
  Heart,
  Settings,
  LogOut,
  Star,
  ChevronDown,
  ShoppingBag,
  Camera,
  MessageCircle,
  Headset,
  Package,
  Lightbulb,
  RotateCcw,
  Clock,
  MapPin,
  Store,
  ArrowRight,
  Search as SearchIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { chatService } from "../services/chatService";
import { SellerService } from "../services/sellerService";
import { useBuyerStore } from "../stores/buyerStore";
import VisualSearchModal from "./VisualSearchModal";
import ProductRequestModal from "./ProductRequestModal";
import SupportModal from "./SupportModal";
import {
  trendingProducts,
  bestSellerProducts,
  newArrivals,
} from "../data/products";
import { prefetchRoute } from "@/lib/prefetch";

interface HeaderProps {
  transparentOnTop?: boolean;
  hideSearch?: boolean;
}

const Header: React.FC<HeaderProps> = ({ transparentOnTop = false, hideSearch = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout, getTotalCartItems, initializeCart, subscribeToProfile, unsubscribeFromProfile } = useBuyerStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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

  const [localSearchQuery, setLocalSearchQuery] = useState(new URLSearchParams(location.search).get("q") || "");
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if we're on the search page
  const isSearchPage = location.pathname === "/search";

  useEffect(() => {
    setLocalSearchQuery(new URLSearchParams(location.search).get("q") || "");
  }, [location.search]);

  // Handle outside click for search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter products and stores based on input
  const [searchSuggestions, setSearchSuggestions] = useState<{ products: any[], stores: any[] }>({ products: [], stores: [] });

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!localSearchQuery.trim()) {
        setSearchSuggestions({ products: [], stores: [] });
        return;
      }
      
      const query = localSearchQuery.toLowerCase();
      
      // Filter products from local data
      const allProducts = [...trendingProducts, ...bestSellerProducts, ...newArrivals];
      const filteredProducts = allProducts.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.category?.toLowerCase().includes(query)
      ).slice(0, 5);

      // Fetch real stores from Supabase
      let filteredStores: any[] = [];
      try {
        const sellerServiceInstance = SellerService.getInstance();
        const realStores = await sellerServiceInstance.getPublicStores({ 
          searchQuery: query,
          limit: 3,
          includeUnverified: true
        });
        
        filteredStores = realStores.map(s => ({
          id: s.id,
          name: s.store_name || 'Verified Seller',
          location: s.business_profile?.city || 'Philippines',
          verified: s.approval_status === 'verified',
          avatar: s.avatar_url // Added avatar field
        }));
      } catch (error) {
        console.error("Error fetching store suggestions:", error);
        // Fallback to minimal mock if service fails
        filteredStores = [
          { id: '1', name: 'BazaarX Official', location: 'Metro Manila', verified: true },
        ].filter(s => s.name.toLowerCase().includes(query));
      }

      setSearchSuggestions({ products: filteredProducts, stores: filteredStores });
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [localSearchQuery]);

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
              <img
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
            <div 
              ref={dropdownRef}
              className={`hidden md:flex flex-1 min-w-[200px] mx-auto items-center justify-center lg:max-w-2xl px-4 lg:px-8 transition-opacity duration-300 relative ${transparentOnTop && !isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
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
                  className="w-full pl-11 pr-12 py-3 bg-white border border-gray-100 rounded-full text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all text-sm shadow-md hover:shadow-lg"
                  value={localSearchQuery}
                  onFocus={() => setIsFocused(true)}
                  onChange={(e) => {
                    const query = e.target.value;
                    setLocalSearchQuery(query);
                    if (location.pathname === "/search") {
                      navigate(`/search?q=${encodeURIComponent(query)}`, { replace: true });
                    } else if (location.pathname === "/stores") {
                      navigate(`/stores?q=${encodeURIComponent(query)}`, { replace: true });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setIsFocused(false);
                      if (location.pathname !== "/search" && location.pathname !== "/stores") {
                        navigate(
                          `/search${localSearchQuery ? "?q=" + encodeURIComponent(localSearchQuery) : ""}`
                        );
                      }
                    }
                  }}
                />

                {/* REAL-TIME SEARCH DROPDOWN */}
                {isFocused && localSearchQuery.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[200]">
                    {/* Stores Suggestions */}
                    {searchSuggestions.stores.length > 0 && (
                      <div className="p-4 border-b border-gray-50">
                        <div className="flex items-center gap-2 mb-3 text-[var(--text-muted)]">
                          <Store size={14} />
                          <span className="text-xs font-bold uppercase tracking-wider">Stores</span>
                        </div>
                        <div className="space-y-2">
                          {searchSuggestions.stores.map(store => (
                            <button
                              key={store.id}
                              onClick={() => {
                                setIsFocused(false);
                                navigate(`/seller/${store.id}`);
                              }}
                              className="w-full flex items-center justify-between p-2 hover:bg-[var(--brand-wash)] rounded-xl transition-colors group text-left"
                            >
                              <div className="flex items-center gap-3">
                                {store.avatar ? (
                                  <img 
                                    src={store.avatar} 
                                    alt={store.name} 
                                    className="w-8 h-8 rounded-full object-cover border border-gray-100" 
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[var(--brand-primary)] font-bold">
                                    {store.name.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-bold text-[var(--text-headline)] flex items-center gap-1">
                                    {store.name}
                                    {store.verified && (
                                      <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.25.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                    <MapPin size={10} />
                                    {store.location}
                                  </div>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--brand-primary)] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Product Suggestions */}
                    <div className="p-4 bg-gray-50/50">
                      <div className="flex items-center gap-2 mb-3 text-[var(--text-muted)]">
                        <ShoppingBag size={14} />
                        <span className="text-xs font-bold uppercase tracking-wider">Products</span>
                      </div>
                      <div className="space-y-1">
                        {searchSuggestions.products.length > 0 ? (
                          searchSuggestions.products.map(product => (
                            <button
                              key={product.id}
                              onClick={() => {
                                setIsFocused(false);
                                navigate(`/product/${product.id}`);
                              }}
                              className="w-full flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-all group text-left shadow-sm border border-transparent hover:border-gray-100"
                            >
                              <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                              <div className="flex-1">
                                <div className="text-sm font-bold text-[var(--text-headline)] line-clamp-1 group-hover:text-[var(--brand-primary)]">
                                  {product.name}
                                </div>
                                <div className="text-xs font-bold text-[var(--brand-primary)]">
                                  ₱{product.price.toLocaleString()}
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="text-center py-6">
                            <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                              <SearchIcon className="w-5 h-5 text-gray-300" />
                            </div>
                            <div className="text-sm font-bold text-[var(--text-headline)]">Looking for "{localSearchQuery}"?</div>
                            <div className="text-xs text-[var(--text-muted)]">Search products & stores</div>
                          </div>
                        )}
                        {searchSuggestions.products.length > 0 && (
                          <button
                            onClick={() => {
                              setIsFocused(false);
                              navigate(`/search?q=${encodeURIComponent(localSearchQuery)}`);
                            }}
                            className="w-full mt-3 py-2 text-xs font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-wash)] rounded-lg transition-colors border border-dashed border-[var(--brand-primary)] flex items-center justify-center gap-2"
                          >
                            View all results <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
                onClick={() => navigate("/search")}
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
            <button
              onClick={() => navigate("/enhanced-cart")}
              onMouseEnter={() => prefetchRoute(() => import("../pages/EnhancedCartPage"))}
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
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                  >
                    <div className="hidden xl:block text-right">
                      <p className="text-sm font-bold text-[var(--text-headline)] group-hover:text-[var(--brand-primary)] transition-colors leading-none">
                        Hi, {profile.firstName}
                      </p>
                      <p className="text-[10px] text-[var(--text-accent)] mt-1 uppercase tracking-wider">
                        {profile.bazcoins} Bazcoins
                      </p>
                    </div>

                    <div className="relative">
                      <div className="w-9 h-9 bg-[var(--brand-primary)] rounded-full flex items-center justify-center overflow-hidden shadow-sm hover:scale-105 transition-transform border border-white/50">
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-sm font-bold">
                            {profile.firstName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-sm">
                        <ChevronDown
                          className={`h-3 w-3 text-gray-500 transition-transform ${showProfileMenu ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profile Dropdown */}
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-secondary)] rounded-xl shadow-xl z-50 overflow-hidden text-[var(--text-primary)] animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 bg-[var(--brand-wash)]/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--brand-primary)] rounded-full flex items-center justify-center overflow-hidden shadow-md text-white font-bold text-base">
                            {profile.avatar ? (
                              <img src={profile.avatar} alt={profile.firstName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{profile.firstName.charAt(0)}</span>
                            )}
                          </div>
                          <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-sm font-medium text-gray-700 leading-none">
                              {profile.firstName} {profile.lastName}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                                <span className="text-[8px] font-bold text-white">B</span>
                              </div>
                              <span className="text-xs text-gray-500">{profile.bazcoins} Bazcoins</span>
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
                            navigate("/profile?tab=following");
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-primary)] rounded-lg transition-all"
                        >
                          <Heart className="h-3.5 w-3.5" />
                          Following
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
                            logout();
                            setShowProfileMenu(false);
                            navigate('/login');
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
                  className="flex items-center gap-3 group"
                >
                  <span className="text-sm font-bold text-[var(--text-headline)] group-hover:text-[var(--brand-primary)] transition-colors">
                    Sign In
                  </span>
                  <div className="w-9 h-9 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white shadow-sm hover:scale-105 transition-transform border border-white/50">
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
