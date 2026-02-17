import { Heart } from 'lucide-react';

export function BazaarFooter() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src="/Logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <p className="text-gray-300 text-sm">
              Your premium marketplace for quality products from trusted sellers across the Philippines.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/shop" className="hover:text-[var(--brand-primary)] transition-colors">Shop</a></li>
              <li><a href="/categories" className="hover:text-[var(--brand-primary)] transition-colors">Categories</a></li>
              <li><a href="/sellers" className="hover:text-[var(--brand-primary)] transition-colors">Sellers</a></li>
              <li><a href="/deals" className="hover:text-[var(--brand-primary)] transition-colors">Deals</a></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h4 className="font-semibold">Customer Service</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/buyer-support" className="hover:text-[var(--brand-primary)] transition-colors">Help Center</a></li>
              <li><a href="/contact" className="hover:text-[var(--brand-primary)] transition-colors">Contact Us</a></li>
              <li><a href="/returns" className="hover:text-[var(--brand-primary)] transition-colors">Returns</a></li>
              <li><a href="/shipping" className="hover:text-[var(--brand-primary)] transition-colors">Shipping Info</a></li>
            </ul>
          </div>

          {/* About */}
          <div className="space-y-4">
            <h4 className="font-semibold">About Us</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/about" className="hover:text-[var(--brand-primary)] transition-colors">Our Story</a></li>
              <li><a href="/careers" className="hover:text-[var(--brand-primary)] transition-colors">Careers</a></li>
              <li><a href="/privacy" className="hover:text-[var(--brand-primary)] transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-[var(--brand-primary)] transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-300 flex items-center gap-1">
              Made with <Heart className="w-4 h-4 text-red-500" /> in the Philippines
            </p>
            <p className="text-sm text-gray-300 mt-4 md:mt-0">
              © 2024 Bazaar Marketplace. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}