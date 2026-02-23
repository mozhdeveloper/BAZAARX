import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Zap, Timer, CheckCircle2, Store, ArrowLeft } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { productService } from '../services/productService';
import { Product } from '../types';

export default function FlashSalesPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 12, seconds: 56 });

  useEffect(() => {
    // Shared countdown
    const timer = setInterval(() => {
        setTimeLeft(prev => {
            let { hours, minutes, seconds } = prev;
            seconds--;
            if (seconds < 0) { seconds = 59; minutes--; }
            if (minutes < 0) { minutes = 59; hours--; }
            if (hours < 0) return { hours: 0, minutes: 0, seconds: 0 };
            return { hours, minutes, seconds };
        });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await productService.getProducts({ isActive: true, approvalStatus: 'approved' });
        // Simulate real flash sale data from backend
        const validProducts = (data || []).map((row: any) => {
            const images = row.images?.map((img: any) => typeof img === 'string' ? img : img.image_url) || [];
            const primaryImage = images[0] || row.primary_image || '';

            return {
                id: row.id,
                name: row.name,
                price: row.price,
                originalPrice: row.original_price,
                image: primaryImage,
                images: images,
                seller: row.seller?.store_name || 'Generic Store',
                sellerId: row.seller_id || row.seller?.id,
                sellerVerified: !!row.seller?.verified_at,
                category: row.category?.name || 'General',
                sold: row.sold || 0,
                stock: row.stock || 10
            } as any;
        });
        setProducts(validProducts);
      } catch (e) {
        console.error('Failed to load flash deals', e);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');



  return (
    <div className="min-h-screen flex flex-col bg-[var(--brand-wash)]">
      <Header />
      
      <main className="flex-1 w-full relative z-10 pt-8 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="flex mb-4">
                <button 
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 text-gray-500 hover:text-orange-600 transition-colors bg-transparent px-0 font-medium text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-[32px] p-8 md:p-12 border border-orange-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Zap className="w-64 h-64 text-orange-600" />
                </div>
                
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 font-bold text-sm mb-6 border border-orange-200">
                      <Zap className="w-4 h-4 fill-orange-700" />
                      Limited Time Offers
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                        Daily <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Flash Sales</span>
                    </h1>
                    <p className="mt-4 text-gray-600 text-lg max-w-xl font-medium">
                        Exclusive deals created directly by our top sellers. Hurry, these offers disappear when the timer runs out!
                    </p>
                </div>
                
                <div className="relative z-10">
                    <p className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider text-center md:text-left">Ends in</p>
                    <div className="flex items-center gap-3">
                        <div className="bg-white px-5 py-4 rounded-2xl shadow-sm border border-orange-100 flex flex-col items-center min-w-[80px]">
                            <span className="text-3xl font-black text-orange-600 font-mono tracking-tighter">{pad(timeLeft.hours)}</span>
                            <span className="text-xs font-bold text-gray-400 mt-1 uppercase">hrs</span>
                        </div>
                        <span className="text-2xl font-black text-orange-300 mb-6">:</span>
                        <div className="bg-white px-5 py-4 rounded-2xl shadow-sm border border-orange-100 flex flex-col items-center min-w-[80px]">
                            <span className="text-3xl font-black text-orange-600 font-mono tracking-tighter">{pad(timeLeft.minutes)}</span>
                            <span className="text-xs font-bold text-gray-400 mt-1 uppercase">mins</span>
                        </div>
                        <span className="text-2xl font-black text-orange-300 mb-6">:</span>
                        <div className="bg-white px-5 py-4 rounded-2xl shadow-sm border border-orange-100 flex flex-col items-center min-w-[80px]">
                            <span className="text-3xl font-black text-orange-600 font-mono tracking-tighter">{pad(timeLeft.seconds)}</span>
                            <span className="text-xs font-bold text-gray-400 mt-1 uppercase">secs</span>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Loading flash deals...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Zap className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No active flash sales</h3>
                    <p className="text-gray-500 font-medium">Check back later for exciting deals from our sellers.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {products.map(product => (
                        <ProductCard 
                            key={product.id} 
                            product={product} 
                            isFlash={true}
                        />
                    ))}
                </div>
            )}
        </div>
      </main>
      <BazaarFooter />
    </div>
  );
}
