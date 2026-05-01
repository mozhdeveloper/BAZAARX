import { ArrowDownUp, ChevronLeft, Search, SlidersHorizontal, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import ProductFilterModal from '../components/ProductFilterModal';
import { CampaignCountdown } from '../components/shop/CampaignCountdown';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { discountService } from '../services/discountService';
import type { ProductFilters, SortOption } from '../types/filter.types';
import { DEFAULT_FILTERS, SORT_OPTIONS } from '../types/filter.types';

const SORT_LABELS: Record<SortOption, string> = {
    relevance: 'Relevance',
    'price-low': 'Price: Low to High',
    'price-high': 'Price: High to Low',
    'rating-high': 'Top Rated',
    newest: 'Newest',
    'best-selling': 'Best Selling',
};

export default function FlashSalesPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const campaignFilter = searchParams.get('campaign');

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Search, sort, filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('relevance');
    const [filters, setFilters] = useState<ProductFilters>({ ...DEFAULT_FILTERS });
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);

    useEffect(() => {
        discountService.getGlobalFlashSaleProducts().then(data => {
            // Deduplicate + filter out-of-stock
            const seen = new Set<string>();
            const inStock = (data || []).filter((p: any) => {
                if (seen.has(p.id)) return false;
                seen.add(p.id);
                const variants = p.variants || [];
                if (variants.length > 0) {
                    const totalVariantStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
                    return totalVariantStock > 0;
                }
                return (p.stock || 0) > 0;
            });
            setProducts(inStock);
            setLoading(false);
        }).catch(console.error);
    }, []);

    // Extract unique categories for the filter modal
    const availableCategories = useMemo(() => {
        const catMap = new Map<string, string>();
        products.forEach((p: any) => {
            const catName = p.category || '';
            if (catName && !catMap.has(catName)) {
                catMap.set(catName, catName);
            }
        });
        return Array.from(catMap.keys()).map((name) => ({
            id: name,
            name,
            path: [name],
        }));
    }, [products]);

    // Filtered + sorted products (mirrors mobile logic exactly)
    const filteredProducts = useMemo(() => {
        // Start with campaign filter from URL if present
        let result = campaignFilter
            ? products.filter(p => p.campaignId === campaignFilter || p.campaignName === campaignFilter)
            : [...products];

        // Search filter
        const query = searchQuery.trim().toLowerCase();
        if (query) {
            result = result.filter(p => {
                const name = (p.name || '').toLowerCase();
                const category = (p.category || '').toLowerCase();
                const seller = (p.seller || '').toLowerCase();
                return name.includes(query) || category.includes(query) || seller.includes(query);
            });
        }

        // Category filter
        if (filters.categoryId) {
            result = result.filter(p => {
                const cat = (p.category || '').toLowerCase();
                return cat === filters.categoryId!.toLowerCase();
            });
        }

        // Price range filter
        const min = filters.priceRange.min ?? 0;
        const max = filters.priceRange.max ?? Infinity;
        result = result.filter(p => {
            const price = Number(p.price) || 0;
            return price >= min && price <= max;
        });

        // Rating filter
        if (filters.minRating) {
            result = result.filter(p => (p.rating ?? 0) >= filters.minRating!);
        }

        // Free shipping filter
        if (filters.freeShipping) {
            result = result.filter(p => !!p.isFreeShipping || !!p.is_free_shipping);
        }

        // Sort
        switch (sortOption) {
            case 'price-low':
                result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
                break;
            case 'price-high':
                result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
                break;
            case 'rating-high':
                result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
                break;
            case 'newest':
                result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                break;
            case 'best-selling':
                result.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
                break;
            case 'relevance':
            default:
                // Biggest discount first — good default for flash sales
                result.sort((a, b) => {
                    const discA = a.originalPrice > 0 ? (a.originalPrice - Number(a.price)) / a.originalPrice : 0;
                    const discB = b.originalPrice > 0 ? (b.originalPrice - Number(b.price)) / b.originalPrice : 0;
                    return discB - discA;
                });
                break;
        }

        return result;
    }, [products, campaignFilter, searchQuery, sortOption, filters]);

    // Group filtered products by campaign for grouped display
    const filteredGroups = useMemo(() => {
        const map = filteredProducts.reduce((acc: any, p: any) => {
            const id = p.campaignId || 'default';
            if (!acc[id]) {
                acc[id] = {
                    id,
                    campaignName: p.campaignName || 'Flash Sale',
                    color: p.campaignBadgeColor || 'var(--brand-primary)',
                    seller: p.seller,
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
    }, [filteredProducts]);

    // Active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.categoryId) count++;
        if (filters.priceRange.min !== null || filters.priceRange.max !== null) count++;
        if (filters.minRating !== null) count++;
        if (filters.freeShipping) count++;
        if (filters.withVouchers) count++;
        return count;
    }, [filters]);

    const hasActiveFilters = sortOption !== 'relevance' || activeFilterCount > 0;
    const isSearchingOrFiltering = !!searchQuery.trim() || hasActiveFilters;

    const earliestEnd = filteredGroups.length > 0 ? (filteredGroups[0] as any).endsAt : null;

    const handleFilterApply = useCallback((newFilters: ProductFilters) => {
        setFilters(newFilters);
    }, []);

    const handleClearAll = useCallback(() => {
        setSearchQuery('');
        setSortOption('relevance');
        setFilters({ ...DEFAULT_FILTERS });
    }, []);

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

                    {/* Hero — hidden when searching/filtering so results appear right away */}
                    {!isSearchingOrFiltering && (
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
                                    Exclusive deals created directly by our top sellers. Hurry, these offers disappear when the timer runs out!
                                </p>
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs font-bold text-[var(--price-flash)] mb-4 uppercase tracking-[0.2em] text-center md:text-left">Ends in</p>
                                {earliestEnd && <CampaignCountdown endsAt={earliestEnd} variant="large" />}
                            </div>
                        </div>
                    )}

                    {/* Search + Sort + Filter Toolbar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
                        {/* Search bar */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search flash sale deals..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-colors"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded-full transition-colors"
                                    aria-label="Clear search"
                                >
                                    <X className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Deal count */}
                            <span className="text-sm text-gray-500 font-medium whitespace-nowrap mr-1">
                                {loading ? 'Loading...' : `${filteredProducts.length} deal${filteredProducts.length !== 1 ? 's' : ''}`}
                            </span>

                            {/* Sort dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                                        sortOption !== 'relevance'
                                            ? 'bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/30 text-[var(--brand-primary)]'
                                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <ArrowDownUp className="w-4 h-4" />
                                    <span className="hidden sm:inline">{SORT_LABELS[sortOption]}</span>
                                    <span className="sm:hidden">Sort</span>
                                </button>
                                {showSortDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                                        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-[200px]">
                                            {SORT_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => { setSortOption(opt.value); setShowSortDropdown(false); }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                                        sortOption === opt.value
                                                            ? 'bg-[var(--brand-primary)]/5 text-[var(--brand-primary)] font-semibold'
                                                            : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Filter button */}
                            <button
                                onClick={() => setShowFilterModal(true)}
                                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                                    activeFilterCount > 0
                                        ? 'bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/30 text-[var(--brand-primary)]'
                                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                <span className="hidden sm:inline">Filters</span>
                                {activeFilterCount > 0 && (
                                    <span className="ml-1 bg-[var(--brand-primary)] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Active filter/sort chips */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-2 mb-6">
                            {sortOption !== 'relevance' && (
                                <button
                                    onClick={() => setSortOption('relevance')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-full text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                                >
                                    Sorted: {SORT_LABELS[sortOption]}
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            {filters.categoryId && (
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, categoryId: null, categoryPath: [] }))}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-300 rounded-full text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                                >
                                    {filters.categoryId}
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            {(filters.priceRange.min !== null || filters.priceRange.max !== null) && (
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, priceRange: { min: null, max: null } }))}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                >
                                    ₱{(filters.priceRange.min ?? 0).toLocaleString()} – ₱{filters.priceRange.max !== null ? filters.priceRange.max.toLocaleString() : '∞'}
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            {filters.minRating !== null && (
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, minRating: null }))}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-300 rounded-full text-xs font-semibold text-yellow-700 hover:bg-yellow-100 transition-colors"
                                >
                                    {filters.minRating}★ &amp; up
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            {filters.freeShipping && (
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, freeShipping: false }))}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-300 rounded-full text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                                >
                                    Free Shipping
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            <button
                                onClick={handleClearAll}
                                className="text-xs font-medium text-gray-500 underline hover:text-gray-700 transition-colors ml-1"
                            >
                                Clear all
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Loading flash deals...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <Zap className="w-12 h-12 text-gray-300" />
                            <p className="text-gray-500 font-medium text-center">
                                {products.length === 0
                                    ? 'No flash sale products at the moment'
                                    : 'No deals match your filters'}
                            </p>
                            {isSearchingOrFiltering && (
                                <button
                                    onClick={handleClearAll}
                                    className="px-6 py-2.5 bg-[var(--brand-primary)] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
                                >
                                    Clear All Filters
                                </button>
                            )}
                        </div>
                    ) : isSearchingOrFiltering ? (
                        /* Flat grid when searching/filtering — no group headers */
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {filteredProducts.map((p: any) => (
                                <ProductCard key={p.id} product={p} isFlash={true} />
                            ))}
                        </div>
                    ) : (
                        /* Grouped layout when browsing */
                        <div className="space-y-16">
                            {filteredGroups.map((group: any) => (
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

            {/* Filter Modal */}
            <ProductFilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                onApply={handleFilterApply}
                initialFilters={filters}
                availableCategories={availableCategories}
                hidePromoOptions={['onSale']}
            />

            <BazaarFooter />
        </div>
    );
}
