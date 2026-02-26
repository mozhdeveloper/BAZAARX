import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Zap, Timer, CheckCircle2, Store, ArrowLeft, ChevronLeft } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { productService } from '../services/productService';
import { discountService } from '../services/discountService';
import { Product } from '../types';

export default function FlashSalesPage() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Timer state
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        if (products.length === 0) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const endTimes = products
                .map(p => new Date(p.campaignEndsAt).getTime())
                .filter(t => t > now)
                .sort((a, b) => a - b);

            if (endTimes.length === 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            const diff = endTimes[0] - now;
            setTimeLeft({
                hours: Math.floor(diff / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000)
            });
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [products]);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const data = await discountService.getFlashSaleProducts();
                setProducts(data || []);
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
                            className="flex items-center gap-2 text-gray-500 hover:text-[var(--brand-primary)] transition-colors bg-transparent px-0 font-medium text-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8 bg-[var(--brand-wash)] rounded-3xl p-10 md:p-14 border border-gray-100 shadow-golden relative overflow-hidden text-center md:text-left">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                            <Zap className="w-80 h-80 text-[var(--brand-primary)]" />
                        </div>

                        <div className="relative z-10 flex-1">
                            <div className="inline-flex items-center gap-2 text-[var(--brand-primary)] font-bold text-xs uppercase tracking-widest mb-6">
                                <Zap className="w-3.5 h-3.5 fill-[var(--brand-primary)]" />
                                Limited Time Offers
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-[#1A1A1A] tracking-tight leading-tight mb-4">
                                Daily <span className="text-[var(--brand-primary)]">Flash Sales</span>
                            </h1>
                            <p className="text-gray-500 text-lg max-w-xl font-medium leading-relaxed">
                                Exclusive deals created directly by our top sellers. Hurry, these offers disappear when the timer runs out!
                            </p>
                        </div>

                        <div className="relative z-10">
                            <p className="text-xs font-bold text-[var(--price-flash)] mb-4 uppercase tracking-[0.2em] text-center md:text-left">Ends in</p>
                            <div className="flex items-center gap-3">
                                <div className="bg-white px-6 py-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center min-w-[90px]">
                                    <span className="text-4xl font-black text-[var(--price-flash)] font-mono tracking-tighter leading-none">{pad(timeLeft.hours)}</span>
                                    <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Hrs</span>
                                </div>
                                <span className="text-2xl font-black text-[var(--price-flash)] mb-7 opacity-30">:</span>
                                <div className="bg-white px-6 py-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center min-w-[90px]">
                                    <span className="text-4xl font-black text-[var(--price-flash)] font-mono tracking-tighter leading-none">{pad(timeLeft.minutes)}</span>
                                    <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Mins</span>
                                </div>
                                <span className="text-2xl font-black text-[var(--price-flash)] mb-7 opacity-30">:</span>
                                <div className="bg-white px-6 py-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center min-w-[90px]">
                                    <span className="text-4xl font-black text-[var(--price-flash)] font-mono tracking-tighter leading-none">{pad(timeLeft.seconds)}</span>
                                    <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Secs</span>
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
