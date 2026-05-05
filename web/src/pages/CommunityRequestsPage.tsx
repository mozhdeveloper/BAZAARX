import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Package,
  Loader2,
  Plus,
  TrendingUp,
  FlaskConical,
  Flame,
  Search,
  ShieldCheck,
  Hammer,
  Eye,
  CheckCircle2,
  ShoppingBag,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { productRequestService, type ProductRequest } from '../services/productRequestService';
import { productService } from '../services/productService';
import ProductRequestModal from '../components/ProductRequestModal';

/* ── Status / tab config ──────────────────────────────────────────────── */

const STATUS_CONFIG: Record<string, { label: string; emoji: string; badgeBg: string }> = {
  pending:      { label: 'Gathering',  emoji: '📍', badgeBg: 'bg-amber-50 border-amber-200 text-amber-700' },
  in_progress:  { label: 'Sourcing',   emoji: '🔍', badgeBg: 'bg-blue-50 border-blue-200 text-blue-700' },
  approved:     { label: 'Verified',   emoji: '✅', badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  rejected:     { label: 'Rejected',   emoji: '❌', badgeBg: 'bg-red-50 border-red-200 text-red-700' },
};

const FILTER_TABS = [
  { key: null,           label: 'All',       emoji: '' },
  { key: 'pending',      label: 'Gathering', emoji: '📍' },
  { key: 'in_progress',  label: 'Sourcing',  emoji: '🔍' },
  { key: 'approved',     label: 'Verified',  emoji: '✅' },
] as const;

const TRENDING_SEARCHES = [
  'Durable phone accessories',
  'Ergonomic home office',
  'Travel gadgets',
  'Pet care automation',
  'Sustainable packaging',
  'Wireless charging',
];

type SearchResultItem =
  | { kind: 'product'; id: string; name: string; status: 'available' | 'sold' }
  | { kind: 'request'; id: string; name: string; status: string };

export default function CommunityRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Live search dropdown
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    setSearchLoading(true);
    setShowDropdown(true);
    try {
      const [products, reqAll] = await Promise.all([
        productService.searchProducts(q, 8),
        productRequestService.getAllRequests(),
      ]);
      const productItems: SearchResultItem[] = products.map((p) => ({
        kind: 'product',
        id: p.id,
        name: p.name || 'Unnamed product',
        status: (Number((p as any).stock) === 0 && Number((p as any).sold_count) > 0) ? 'sold' : 'available',
      }));
      const lower = q.toLowerCase();
      const reqItems: SearchResultItem[] = reqAll
        .filter((r) =>
          r.productName.toLowerCase().includes(lower) ||
          r.description.toLowerCase().includes(lower)
        )
        .slice(0, 5)
        .map((r) => ({ kind: 'request', id: r.id, name: r.productName, status: r.status }));
      setSearchResults([...productItems, ...reqItems]);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => runSearch(value), 300);
  };

  const handleResultClick = (item: SearchResultItem) => {
    setShowDropdown(false);
    setSearchQuery('');
    if (item.kind === 'product') {
      navigate(`/products/${item.id}`);
    } else {
      navigate(`/requests/${item.id}`);
    }
  };

  useEffect(() => {
    productRequestService.getAllRequests().then((data) => {
      setRequests(data.filter((r) => r.status !== 'rejected'));
      setLoading(false);
    });
  }, []);

  /* ── Derived data ─────────────────────────────── */

  const filtered = requests
    .filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        r.productName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
      const matchesStatus = !filterStatus || r.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => (b.votes + b.estimatedDemand) - (a.votes + a.estimatedDemand));

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, in_progress: 0, approved: 0 };
    requests.forEach((r) => {
      if (r.status in counts) counts[r.status]++;
    });
    return counts;
  }, [requests]);

  const totalCount = requests.length;
  const totalVotes = useMemo(() => requests.reduce((s, r) => s + r.votes, 0), [requests]);
  const totalPledges = useMemo(() => requests.reduce((s, r) => s + r.estimatedDemand, 0), [requests]);

  /* ── Render ─────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gray-50">
      <Header hideSearch />

      {/* ════════════════ AI-POWERED SEARCH HERO ════════════════ */}
      <section className="relative overflow-hidden bg-[#FFFBF5]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-100 opacity-40 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-orange-100 opacity-30 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 pt-14 pb-12 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full border border-[var(--brand-primary)]/30 text-xs font-semibold tracking-widest uppercase text-[var(--brand-primary)] bg-white/60 backdrop-blur mb-6">
            AI-Powered Search
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text-headline)] leading-[1.15] tracking-tight mb-5">
            What quality product<br />are you hunting for?
          </h2>
          <p className="max-w-xl mx-auto text-[var(--text-muted)] text-base md:text-lg mb-8 leading-relaxed">
            Search first. If it exists, join the crowd.
            If not—request it and we'll test it before you waste money on junk.
          </p>
          <div className="max-w-2xl mx-auto mb-6" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search products, brands, or past requests…"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
                className="w-full py-4 rounded-full border-2 border-gray-200 text-base focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 bg-white shadow-sm transition-all placeholder:text-gray-400"
                style={{ paddingLeft: '3rem', paddingRight: searchQuery ? '3rem' : '1.25rem' }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Live search dropdown */}
              {showDropdown && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[360px] overflow-y-auto">
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Searching…</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-8 text-center">
                      <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No matches found</p>
                      <button
                        onClick={() => { setShowDropdown(false); setShowRequestModal(true); }}
                        className="mt-3 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
                      >
                        + Request this product
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Products section */}
                      {searchResults.filter(r => r.kind === 'product').length > 0 && (
                        <div>
                          <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Available in BazaarX</p>
                          {searchResults.filter(r => r.kind === 'product').map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleResultClick(item)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--brand-wash)] transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="h-4 w-4 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                              </div>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">
                                {item.status === 'sold' ? 'Sold' : 'Available'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Requests section */}
                      {searchResults.filter(r => r.kind === 'request').length > 0 && (
                        <div className="border-t border-gray-100">
                          <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Community Requests</p>
                          {searchResults.filter(r => r.kind === 'request').map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleResultClick(item)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--brand-wash)] transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                              </div>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                                Requested
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="border-t border-gray-100 px-4 py-2.5">
                        <button
                          onClick={() => { setShowDropdown(false); setShowRequestModal(true); }}
                          className="text-xs font-semibold text-[var(--brand-primary)] hover:underline"
                        >
                          + Can't find it? Request this product
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mr-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Trending Searches
            </span>
            {TRENDING_SEARCHES.map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ THE TRUST DIFFERENCE ════════════════ */}
      <section className="bg-[var(--text-headline)] text-white py-14">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-3">The Trust Difference</p>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4 leading-tight">
            Every Product Tested. Every Claim Verified.
          </h2>
          <p className="max-w-xl mx-auto text-white/60 text-sm md:text-base mb-8 leading-relaxed">
            We don't just list products—we hunt them down, beat them up in our lab,
            and only the survivors make it to your screen.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: ShieldCheck, label: 'Spec Verification' },
              { icon: Hammer,      label: 'Durability Testing' },
              { icon: Eye,         label: 'Authenticity Checks' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/10">
                <Icon className="h-4 w-4 text-[var(--brand-primary)]" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ HOW WE OPERATE ════════════════ */}
      <section className="py-14 bg-white/50">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] text-center mb-3">How We Operate</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
            {[
              { step: '01', emoji: '🔍', title: 'You Request',       desc: "Can't find quality? Tell us what you need. If others want it too, we move." },
              { step: '02', emoji: '📦', title: 'We Source',          desc: "We hunt down suppliers, order samples, negotiate hard. You don't lift a finger." },
              { step: '03', emoji: '🔨', title: 'Lab Destroys It',   desc: 'Bend tests. Drop tests. Spec checks. If it breaks or lies, it doesn\'t make it.' },
              { step: '04', emoji: '✓',  title: 'You Buy Confident', desc: 'Only verified products go live. Quality + fair price + protection.' },
            ].map(({ step, emoji, title, desc }) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{emoji}</div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand-primary)] mb-1">{step}</p>
                <h3 className="text-sm font-extrabold text-[var(--text-headline)] mb-2">{title}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ PURPLE GRADIENT HEADER ════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #6B46C1 0%, #805AD5 30%, #667EEA 60%, #7C3AED 100%)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-10 pb-10">
          {/* Title row */}
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
              <FlaskConical className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Bazaarx Lab Pipeline
              </h1>
              <p className="text-white/70 text-sm mt-0.5">
                Transparent product development from community request to verified marketplace
              </p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Total Requests', value: totalCount,              emoji: '📊' },
              { label: 'Gathering',      value: statusCounts.pending,    emoji: '📍' },
              { label: 'In Sourcing',    value: statusCounts.in_progress, emoji: '🔍' },
              { label: 'Verified',       value: statusCounts.approved,    emoji: '✅' },
            ].map(({ label, value, emoji }) => (
              <div key={label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                <div className="text-2xl mb-3">{emoji}</div>
                <p className="text-4xl font-extrabold text-white">{value}</p>
                <p className="text-white/60 text-sm mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ FILTER TABS ════════════════ */}
      <section className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {FILTER_TABS.map(({ key, label, emoji }) => {
              const count = key ? statusCounts[key] ?? 0 : totalCount;
              const isActive = filterStatus === key;
              return (
                <button
                  key={label}
                  onClick={() => setFilterStatus(key)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg whitespace-nowrap transition-all',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {emoji && <span>{emoji}</span>}
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════ REQUEST CARDS ════════════════ */}
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="bg-white border-gray-100">
              <CardContent className="flex flex-col items-center py-20 gap-4">
                <Package className="h-12 w-12 text-gray-300" />
                <p className="text-gray-500 text-center">
                  {searchQuery ? 'No requests match your search.' : 'No community requests yet.'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowRequestModal(true)}
                  className="gap-2 rounded-full"
                >
                  <Plus className="h-4 w-4" /> Be the first to request a product
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {filtered.map((request, i) => {
                const cfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
                const heatScore = request.votes + request.estimatedDemand;
                const labProgress =
                  request.status === 'approved' ? 100 :
                  request.status === 'in_progress' ? 35 :
                  request.status === 'pending' ? 10 : 65;

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card
                      className="bg-white hover:shadow-lg transition-shadow border border-gray-100 cursor-pointer overflow-hidden"
                      onClick={() => navigate(`/requests/${request.id}`)}
                    >
                      <CardContent className="p-6">
                        <div className="flex gap-6">
                          {/* ── LEFT: Heat Score ── */}
                          <div className="hidden sm:flex flex-col items-center gap-1 shrink-0 w-20">
                            <Badge className={`${cfg.badgeBg} border rounded-full text-xs font-bold mb-2`}>
                              {cfg.emoji} {cfg.label}
                            </Badge>
                            <Flame className="h-5 w-5 text-[var(--brand-primary)]" />
                            <span className="text-2xl font-extrabold text-[var(--brand-primary)]">{heatScore}</span>
                            <span className="text-[10px] text-gray-400 font-medium">Heat Score</span>
                          </div>

                          {/* ── CENTER: Content ── */}
                          <div className="flex-1 min-w-0">
                            {/* Mobile status badge */}
                            <div className="sm:hidden mb-2">
                              <Badge className={`${cfg.badgeBg} border rounded-full text-xs font-bold`}>
                                {cfg.emoji} {cfg.label}
                              </Badge>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2">
                              {request.productName}
                            </h3>

                            {request.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
                                {request.description}
                              </p>
                            )}

                            {/* Stats row */}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-4">
                              <span className="flex items-center gap-1 font-medium">
                                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                                {request.votes} upvotes
                              </span>
                              <span className="flex items-center gap-1 font-medium">
                                <span className="text-sm">💰</span>
                                {request.estimatedDemand} pledges
                              </span>
                              <span className="flex items-center gap-1 font-medium">
                                <span className="text-sm">💵</span>
                                $25 pledge amount
                              </span>
                            </div>

                            {/* Lab Progress bar */}
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Lab Progress</span>
                              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${labProgress}%`,
                                    background: 'linear-gradient(90deg, #D97706, #E58C1A)',
                                  }}
                                />
                              </div>
                              <span className="text-xs font-bold text-[var(--brand-primary)] whitespace-nowrap">{labProgress}%</span>
                            </div>

                            {/* Latest update */}
                            <p className="text-xs text-gray-400 mt-2">
                              Latest: {request.status === 'approved'
                                ? 'All tests passed — verified and ready for marketplace.'
                                : request.status === 'in_progress'
                                ? 'Supplier samples being sourced and negotiated.'
                                : 'Gathering community interest and validating demand.'
                              }
                            </p>
                          </div>

                          {/* ── RIGHT: Meta ── */}
                          <div className="hidden md:flex flex-col items-end justify-between shrink-0 text-right gap-2">
                            <Badge variant="outline" className="text-xs font-normal rounded-full border-gray-300">
                              {request.category}
                            </Badge>
                            <div className="text-xs text-gray-400 space-y-0.5 mt-auto">
                              <p>Founded {new Date(request.requestDate).toISOString().slice(0, 10)}</p>
                              <p className="text-[var(--brand-primary)] font-semibold">by {request.requestedBy}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Request CTA */}
          <div className="mt-8 text-center">
            <Button
              onClick={() => setShowRequestModal(true)}
              className="gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-full px-8 py-3 text-base"
            >
              <Plus className="h-5 w-5" />
              Request a Product
            </Button>
          </div>
        </div>
      </section>

      {/* ════════════════ MARKETPLACE ACTIVITY BAR ════════════════ */}
      <section className="bg-white border-y border-gray-100 py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: totalVotes.toLocaleString(),          label: 'Community Votes' },
              { value: totalPledges.toLocaleString(),         label: 'Active Pledges' },
              { value: statusCounts.approved?.toString() ?? '0', label: 'Lab Verified Products' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl md:text-3xl font-extrabold text-[var(--text-headline)]">{value}</p>
                <p className="text-xs text-[var(--text-muted)] font-medium mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ BAZAARX PROMISE ════════════════ */}
      <section className="py-14 bg-gradient-to-br from-[var(--brand-wash)] to-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text-headline)] mb-4">
            The BazaarX Promise
          </h2>
          <p className="text-[var(--text-muted)] text-sm md:text-base mb-8 leading-relaxed">
            Every product tested. Every seller verified.<br />
            No counterfeits. No guesswork. Just quality you can trust at prices that make sense.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 max-w-md mx-auto text-left">
            {[
              'Pre-listing QA Testing',
              'Spec Verification',
              'Fast Dispute Resolution',
              'Authenticity Guarantee',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-100">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-sm font-medium text-[var(--text-headline)]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BazaarFooter />

      <ProductRequestModal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          productRequestService.getAllRequests().then((data) =>
            setRequests(data.filter((r) => r.status !== 'rejected'))
          );
        }}
      />
    </div>
  );
}
