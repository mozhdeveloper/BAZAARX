import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, 
  Heart, 
  Settings, 
  LogOut,
  Star,
  ChevronDown,
  ShoppingBag
} from 'lucide-react';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  // Check if we're on the search page
  const isSearchPage = location.pathname === '/search';

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex items-center gap-2">
              <img 
                src="/Logo.png" 
                alt="Bazaar Logo" 
                className="w-10 h-10 object-contain"
              />
              <span className="text-xl font-bold text-[var(--text-primary)]">Bazaar</span>
            </div>
          </div>

          {/* Search Bar - Hidden on search page */}
          {!isSearchPage && (
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search for products, stores, or categories..."
                  className="w-full pl-12 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const query = (e.target as HTMLInputElement).value;
                      navigate(`/search${query ? '?q=' + encodeURIComponent(query) : ''}`);
                    }
                  }}
                />
                <button 
                  onClick={(e) => {
                    const input = (e.currentTarget.previousElementSibling?.previousElementSibling as HTMLInputElement);
                    const query = input?.value || '';
                    navigate(`/search${query ? '?q=' + encodeURIComponent(query) : ''}`);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[var(--brand-primary)] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[var(--brand-primary-dark)] transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          )}

          {/* Right Navigation */}
          <div className="flex items-center gap-6">
            
            {/* Sell Button */}
            <button 
              onClick={() => navigate('/seller/auth')}
              className="btn-ghost text-sm hover:text-[var(--brand-primary)] transition-colors"
            >
              Sell on Bazaar
            </button>

            {/* Cart */}
            <button 
              onClick={() => navigate('/enhanced-cart')}
              className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors"
              title="Shopping Cart"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>

            {/* Orders */}
            <button 
              onClick={() => navigate('/orders')}
              className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors"
              title="My Orders"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                2
              </span>
            </button>

            {/* Profile */}
            <div className="relative" ref={profileMenuRef}>
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="w-8 h-8 bg-[var(--brand-primary)] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">J</span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-[var(--text-primary)]">John Doe</p>
                  <p className="text-xs text-[var(--text-secondary)]">Premium Member</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </div>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--brand-primary)] rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">J</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">John Doe</p>
                        <p className="text-xs text-gray-500">john@example.com</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2">
                    <button 
                      onClick={() => {
                        navigate('/profile');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <User className="h-4 w-4" />
                      My Profile
                    </button>
                    
                    <button 
                      onClick={() => {
                        navigate('/orders');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      My Orders
                    </button>
                    
                    <button 
                      onClick={() => {
                        navigate('/reviews');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Star className="h-4 w-4" />
                      My Reviews
                    </button>
                    
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                      <Heart className="h-4 w-4" />
                      Following
                    </button>
                    
                    <div className="border-t border-gray-100 my-2"></div>
                    
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                    
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;