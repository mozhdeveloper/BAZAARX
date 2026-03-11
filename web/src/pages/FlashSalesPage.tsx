import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CampaignCountdown } from '../components/shop/CampaignCountdown';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Zap, ChevronLeft } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { discountService } from '../services/discountService';


const GroupTimer = ({ endsAt }: { endsAt: string }) => {
    const [timeLeft, setTimeLeft] = useState({ h: '00', m: '00', s: '00' });

    useEffect(() => {
        const tick = () => {
            const diff = new Date(endsAt).getTime() - Date.now();
            if (diff <= 0) return setTimeLeft({ h: '00', m: '00', s: '00' });
            setTimeLeft({
                h: String(Math.floor(diff / 3600000)).padStart(2, '0'),
                m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
                s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')
            });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [endsAt]);

    return (
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Ends In</span>
            <div className="flex items-center gap-1 font-mono font-bold text-[var(--price-flash)] text-lg">
                <span>{timeLeft.h}</span><span className="opacity-30">:</span>
                <span>{timeLeft.m}</span><span className="opacity-30">:</span>
                <span>{timeLeft.s}</span>
            </div>
        </div>
    );
};

export default function FlashSalesPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const campaignFilter = searchParams.get('campaign');

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        discountService.getFlashSaleProducts().then(data => {
            setProducts(data || []);
            setLoading(false);
        }).catch(console.error);
    }, []);

    // Efficiently group by campaign ID, not badge name
    const groups = useMemo(() => {
        // Filter by campaign if query param exists
        const filteredProducts = campaignFilter
            ? products.filter(p => p.campaignId === campaignFilter || p.campaignName === campaignFilter)
            : products;

        const seen = new Set();
        const unique = filteredProducts.filter(p => seen.has(p.id) ? false : seen.add(p.id));

        const map = unique.reduce((acc, p) => {
            const id = p.campaignId || 'default';
            if (!acc[id]) {
                acc[id] = {
                    id,
                    campaignName: p.campaignName || "Flash Sale",
                    color: p.campaignBadgeColor || "var(--brand-primary)",
                    endsAt: p.campaignEndsAt,
                    products: []
                };
            }
            acc[id].products.push(p);
            return acc;
        }, {} as any);

        return Object.values(map).sort((a: any, b: any) =>
            new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
        );
    }, [products, campaignFilter]);

    const earliestEnd = groups.length > 0 ? (groups[0] as any).endsAt : null;

    return (
        <div className="min-h-screen flex flex-col bg-[var(--brand-wash)]">
            <Header />
            <main className="flex-1 w-full relative z-10 pt-8 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex mb-4">
                        <button onClick={() => navigate('/shop')} className="flex items-center gap-2 text-gray-500 hover:text-[var(--brand-primary)] bg-transparent px-0 font-medium text-sm">
                            <ChevronLeft className="w-4 h-4" /> Back to Shop
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8 bg-[var(--brand-wash)] rounded-3xl p-10 md:p-14 border border-gray-100 shadow-golden relative overflow-hidden text-center md:text-left">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                            <Zap className="w-80 h-80 text-[var(--brand-primary)]" />
                        </div>
                        <div className="relative z-10 flex-1">
                            <div className="inline-flex items-center gap-2 text-[var(--brand-primary)] font-bold text-xs uppercase tracking-widest mb-6">
                                <Zap className="w-3.5 h-3.5 fill-[var(--brand-primary)]" /> Limited Time Offers
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-[#1A1A1A] tracking-tight leading-tight mb-4">
                                Daily <span className="text-[var(--brand-primary)]">Flash Sales</span>
                            </h1>
                            <p className="text-gray-500 text-lg max-w-xl font-medium leading-relaxed">
                                Exclusive platform-wide deals with massive discounts. Hurry, these offers disappear when the timer runs out!
                            </p>
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-[var(--price-flash)] mb-4 uppercase tracking-[0.2em] text-center md:text-left">Ends in</p>
                            {/* Hero Timer Component */}
                            {earliestEnd && <CampaignCountdown endsAt={earliestEnd} variant="large" />}
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Loading flash deals...</p>
                        </div>
                    ) : (
                        <div className="space-y-16">
                            {groups.map((group: any) => (
                                <div key={group.id} className="group-section">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: group.color }} />
                                            <div>
                                                <h2 className="text-2xl font-black uppercase tracking-tight leading-none" style={{ color: group.color }}>
                                                    {group.campaignName}
                                                </h2>
                                            </div>
                                        </div>
                                        {/* Individual Group Timer Component */}
                                        {group.endsAt && <CampaignCountdown endsAt={group.endsAt} variant="default" />}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                                        {group.products.map((p: any) => <ProductCard key={p.id} product={p} isFlash={true} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <BazaarFooter />
        </div>
    );
}