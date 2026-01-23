import React, { useState, useEffect, useRef } from "react";
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
  Headset,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { useBuyerStore } from "../stores/buyerStore";
import VisualSearchModal from "./VisualSearchModal";
import ProductRequestModal from "./ProductRequestModal";
import {
  trendingProducts,
  bestSellerProducts,
  newArrivals,
} from "../data/products";

interface HeaderProps {
  transparentOnTop?: boolean;
}

const Header: React.FC<HeaderProps> = ({ transparentOnTop = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout, getTotalCartItems, initializeCart, subscribeToProfile, unsubscribeFromProfile } = useBuyerStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showVisualSearchModal, setShowVisualSearchModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Check if we're on the search page
  const isSearchPage = location.pathname === "/search";

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
    ? `fixed top-0 w-full z-[100] transition-all duration-300 ${isScrolled ? "bg-white/80 backdrop-blur-md shadow-sm" : "bg-transparent"
    }`
    : "sticky top-0 z-[100] bg-gray-50";

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
              <span className="text-2xl font-bold text-[#ff6a00] tracking-tight hidden md:block">
                BazaarX
              </span>
            </div>
          </div>

          {!isSearchPage && (
            <div className={`hidden md:flex flex-1 items-center justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-2xl px-4 lg:px-8 transition-opacity duration-300 ${transparentOnTop && !isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <div className="relative w-full max-w-xl lg:max-w-full group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
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
                </div>
                <input
                  type="text"
                  placeholder="Search for products, brands, categories"
                  className="w-full pl-10 pr-12 py-2.5 bg-white border-2 border-transparent focus:border-[#ff6a00] rounded-full text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all text-sm shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const query = (e.target as HTMLInputElement).value;
                      navigate(
                        `/search${query ? "?q=" + encodeURIComponent(query) : ""
                        }`
                      );
                    }
                  }}
                />

                {/* Camera Button */}
                <button
                  onClick={() => setShowVisualSearchModal(true)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-[#ff6a00] transition-colors rounded-full hover:bg-gray-100"
                  title="Search by image"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Right Navigation */}
          <div className="flex items-center justify-end gap-2 sm:gap-4 lg:gap-6 text-gray-700 shrink-0">
            {!isSearchPage && (
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
              className="relative p-2 hover:text-[#ff6a00] hover:bg-gray-50 rounded-full transition-colors"
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
                  {getTotalCartItems() > 99 ? "99+" : getTotalCartItems()}
                </Badge>
              )}
            </button>

            {/* Orders */}
            <button
              onClick={() => navigate("/orders")}
              className="relative p-2 hover:text-[#ff6a00] hover:bg-gray-50 rounded-full transition-colors"
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

            {/* Notifications */}
            <NotificationsDropdown />

            {/* Customer Service */}
            <button
              onClick={() => navigate("/support")}
              className="relative p-2 hover:text-[#ff6a00] hover:bg-gray-50 rounded-full transition-colors"
              title="Customer Service"
            >
              <Headset className="h-6 w-6" />
            </button>

            {/* Profile */}
            <div className="relative" ref={profileMenuRef}>
              {profile ? (
                <>
                  <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                  >
                    <div className="hidden xl:block text-right">
                      <p className="text-sm font-medium text-gray-700 group-hover:text-[#ff6a00] transition-colors leading-none">
                        Hi, {profile.firstName}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-medium">
                        {profile.bazcoins} Bazcoins
                      </p>
                    </div>

                    <div className="relative">
                      <div className="w-9 h-9 bg-[#ff6a00] rounded-full flex items-center justify-center overflow-hidden shadow-sm hover:scale-105 transition-transform">
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
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden text-gray-800 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 bg-gray-50/50 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#ff6a00] rounded-full flex items-center justify-center overflow-hidden shadow-md text-white font-bold text-base">
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
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#ff6a00] rounded-lg transition-all"
                        >
                          <User className="h-3.5 w-3.5" />
                          My Profile
                        </button>

                        <button
                          onClick={() => {
                            navigate("/orders");
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#ff6a00] rounded-lg transition-all"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          My Orders
                        </button>

                        <button
                          onClick={() => {
                            navigate("/my-reviews");
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#ff6a00] rounded-lg transition-all"
                        >
                          <Star className="h-3.5 w-3.5" />
                          My Reviews
                        </button>

                        <button
                          onClick={() => {
                            navigate("/following");
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#ff6a00] rounded-lg transition-all"
                        >
                          <Heart className="h-3.5 w-3.5" />
                          Following
                        </button>

                        <div className="h-px bg-gray-100 my-1 mx-2"></div>

                        <button
                          onClick={() => {
                            navigate("/settings");
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-[#ff6a00] rounded-lg transition-all"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Settings
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
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[#ff6a00] transition-colors">
                    Sign In
                  </span>
                  <div className="w-9 h-9 bg-[#ff6a00] rounded-full flex items-center justify-center text-white shadow-sm hover:scale-105 transition-transform">
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
        products={[...trendingProducts, ...bestSellerProducts, ...newArrivals]}
        onRequestProduct={() => {
          setShowVisualSearchModal(false);
          setShowRequestModal(true);
        }}
      />

      <ProductRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
      />
    </header>
  );
};

export default Header;
