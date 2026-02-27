import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Search,
  Rocket,
  TrendingUp,
  Eye,
  MousePointerClick,
  ShoppingCart,
  Clock,
  Pause,
  Play,
  X,
  ChevronRight,
  Sparkles,
  BarChart3,
  Package,
  Star,
  Filter,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SellerWorkspaceLayout } from "@/components/seller/SellerWorkspaceLayout";
import { useAuthStore } from "@/stores/sellerStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  adBoostService,
  calculateBoostPrice,
  BOOST_TYPE_LABELS,
  BOOST_TYPE_DESCRIPTIONS,
  DURATION_OPTIONS,
  type BoostType,
  type BoostStatus,
  type AdBoostWithProduct,
  type BoostPriceEstimate,
} from "@/services/adBoostService";

// ─── Status Helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<BoostStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  ended: "Ended",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<BoostStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  ended: "bg-blue-100 text-blue-600",
  cancelled: "bg-red-100 text-red-600",
};

// ─── Boost Type Cards Config ─────────────────────────────────────────────────

const BOOST_TYPE_ICONS: Record<BoostType, React.ReactNode> = {
  featured: <Star className="h-6 w-6" />,
  search_priority: <TrendingUp className="h-6 w-6" />,
  homepage_banner: <Megaphone className="h-6 w-6" />,
  category_spotlight: <Sparkles className="h-6 w-6" />,
};

const BOOST_TYPE_GRADIENTS: Record<BoostType, string> = {
  featured: "from-orange-500 to-amber-500",
  search_priority: "from-blue-500 to-indigo-500",
  homepage_banner: "from-purple-500 to-pink-500",
  category_spotlight: "from-emerald-500 to-teal-500",
};

// ─── Countdown Timer ─────────────────────────────────────────────────────────

const CountdownTimer = ({ endDate }: { endDate: string }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Ended"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [endDate]);
  return (
    <div className="flex items-center gap-1 text-sm text-[var(--brand-primary)] font-medium">
      <Clock className="h-4 w-4" />
      <span>{timeLeft}</span>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SellerBoostProduct() {
  const { seller } = useAuthStore();
  const { toast } = useToast();

  // State
  const [boosts, setBoosts] = useState<AdBoostWithProduct[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedBoostType, setSelectedBoostType] = useState<BoostType>("featured");
  const [selectedDuration, setSelectedDuration] = useState(7);
  const [dailyBudget, setDailyBudget] = useState(0);
  const [productSearch, setProductSearch] = useState("");

  // Computed
  const priceEstimate = useMemo(
    () => calculateBoostPrice(selectedBoostType, selectedDuration, dailyBudget),
    [selectedBoostType, selectedDuration, dailyBudget],
  );

  const stats = useMemo(() => {
    const active = boosts.filter((b) => b.status === "active").length;
    const totalImpressions = boosts.reduce((s, b) => s + (b.impressions || 0), 0);
    const totalClicks = boosts.reduce((s, b) => s + (b.clicks || 0), 0);
    const totalOrders = boosts.reduce((s, b) => s + (b.orders_generated || 0), 0);
    return { active, totalImpressions, totalClicks, totalOrders };
  }, [boosts]);

  const filteredBoosts = useMemo(() => {
    let result = [...boosts];
    if (filterStatus !== "all") {
      result = result.filter((b) => b.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b) =>
        b.product?.name?.toLowerCase().includes(q) ||
        BOOST_TYPE_LABELS[b.boost_type]?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [boosts, filterStatus, searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name?.toLowerCase().includes(q));
  }, [products, productSearch]);

  // Fetch data
  const fetchData = async () => {
    if (!seller?.id) return;
    setLoading(true);
    try {
      const [boostData, productsData] = await Promise.all([
        adBoostService.getSellerBoosts(seller.id),
        adBoostService.getBoostableProducts(seller.id),
      ]);
      setBoosts(boostData);
      setProducts(productsData);
    } catch (err) {
      console.error("Failed to load boost data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seller?.id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller?.id]);

  // Actions
  const handleCreateBoost = async () => {
    if (!seller?.id || !selectedProduct) return;
    setCreating(true);
    try {
      const result = await adBoostService.createBoost({
        productId: selectedProduct.id,
        sellerId: seller.id,
        boostType: selectedBoostType,
        durationDays: selectedDuration,
        dailyBudget,
      });
      if (result) {
        toast({ title: "Boost Activated!", description: `${selectedProduct.name} is now being boosted.` });
        setIsCreateOpen(false);
        resetForm();
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to create boost.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handlePauseBoost = async (boostId: string) => {
    if (!seller?.id) return;
    const ok = await adBoostService.pauseBoost(boostId, seller.id);
    if (ok) {
      toast({ title: "Boost Paused" });
      fetchData();
    }
  };

  const handleResumeBoost = async (boostId: string) => {
    if (!seller?.id) return;
    const ok = await adBoostService.resumeBoost(boostId, seller.id);
    if (ok) {
      toast({ title: "Boost Resumed" });
      fetchData();
    }
  };

  const handleCancelBoost = async (boostId: string) => {
    if (!seller?.id) return;
    const ok = await adBoostService.cancelBoost(boostId, seller.id);
    if (ok) {
      toast({ title: "Boost Cancelled" });
      fetchData();
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setSelectedBoostType("featured");
    setSelectedDuration(7);
    setDailyBudget(0);
    setProductSearch("");
  };

  // ─── Product Image Helper ───────────────────────────────────────────────────

  const getProductImage = (product: any) => {
    if (!product?.images?.length) return null;
    const primary = product.images.find((img: any) => img.is_primary);
    return primary?.image_url || product.images[0]?.image_url || null;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SellerWorkspaceLayout>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Decor */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto relative z-10 scrollbar-hide">
          <div className="w-full max-w-7xl mx-auto">
            <div className="p-4">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight flex items-center gap-3">
                    Boost Products
                  </h1>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Advertise your products to reach more buyers — Shopee & Lazada style
                  </p>
                </div>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  size="lg"
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                  <Rocket className="h-5 w-5 mr-2" />
                  Create Boost
                </Button>
              </div>

              {/* FREE Beta Banner */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 text-white flex items-center gap-3 shadow-md"
              >
                <div className="bg-white/20 rounded-full p-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">🎉 FREE Beta Period!</h3>
                  <p className="text-xs opacity-90">
                    All boosts are currently <strong>FREE</strong>. Prices shown are simulated — you won't be charged during beta.
                  </p>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-xs font-bold">
                  ₱0.00
                </Badge>
              </motion.div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {([
                  { label: "Active Boosts", value: stats.active, icon: <Rocket className="h-6 w-6" />, delay: 0 },
                  { label: "Total Impressions", value: stats.totalImpressions.toLocaleString(), icon: <Eye className="h-6 w-6" />, delay: 0.1 },
                  { label: "Total Clicks", value: stats.totalClicks.toLocaleString(), icon: <MousePointerClick className="h-6 w-6" />, delay: 0.2 },
                  { label: "Orders Generated", value: stats.totalOrders.toLocaleString(), icon: <ShoppingCart className="h-6 w-6" />, delay: 0.3 },
                ] as const).map((stat) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: stat.delay }}
                    className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors" />
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="text-[var(--secondary-foreground)] group-hover:text-[var(--brand-primary)] transition-all">
                        {stat.icon}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[var(--text-muted)] text-sm relative z-10">{stat.label}</h3>
                      <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all relative z-10">
                        {stat.value}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search boosts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {["all", "active", "paused", "ended", "cancelled"].map((s) => (
                    <Button
                      key={s}
                      variant={filterStatus === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus(s)}
                      className={cn(
                        filterStatus === s &&
                          "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-accent)]",
                      )}
                    >
                      {s === "all" ? "All" : STATUS_LABELS[s as BoostStatus]}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Boost List */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--brand-primary)]" />
                </div>
              ) : filteredBoosts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-xl p-12 text-center shadow-md"
                >
                  <Megaphone className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-[var(--text-headline)] mb-2">
                    {filterStatus === "all" ? "No boosts yet" : `No ${filterStatus} boosts`}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] mb-6">
                    Boost your products to increase visibility and sales
                  </p>
                  <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white"
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Create Your First Boost
                  </Button>
                </motion.div>
              ) : (
                <div className="grid gap-4">
                  <AnimatePresence>
                    {filteredBoosts.map((boost, index) => {
                      const img = getProductImage(boost.product);
                      const ctr =
                        boost.impressions > 0
                          ? ((boost.clicks / boost.impressions) * 100).toFixed(1)
                          : "0.0";
                      return (
                        <motion.div
                          key={boost.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row">
                            {/* Product Image */}
                            <div className="sm:w-28 sm:h-28 h-40 bg-gray-100 flex-shrink-0 overflow-hidden">
                              {img ? (
                                <img
                                  src={img}
                                  alt={boost.product?.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <Package className="h-8 w-8" />
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 p-4">
                              <div className="flex items-start justify-between flex-wrap gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-[var(--text-headline)] truncate">
                                    {boost.product?.name || "Unknown Product"}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <Badge
                                      className={cn(
                                        "text-xs",
                                        STATUS_COLORS[boost.status],
                                      )}
                                    >
                                      {STATUS_LABELS[boost.status]}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {BOOST_TYPE_LABELS[boost.boost_type]}
                                    </Badge>
                                    <span className="text-xs text-[var(--text-muted)]">
                                      {boost.duration_days} days
                                    </span>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  {boost.status === "active" && (
                                    <>
                                      <CountdownTimer endDate={boost.ends_at} />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handlePauseBoost(boost.id)}
                                        className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                                      >
                                        <Pause className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  {boost.status === "paused" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleResumeBoost(boost.id)}
                                      className="text-green-600 border-green-300 hover:bg-green-50"
                                    >
                                      <Play className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {(boost.status === "active" || boost.status === "paused") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCancelBoost(boost.id)}
                                      className="text-red-600 border-red-300 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Performance Metrics */}
                              <div className="flex items-center gap-6 mt-3 text-sm">
                                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>{(boost.impressions || 0).toLocaleString()} views</span>
                                </div>
                                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                                  <MousePointerClick className="h-3.5 w-3.5" />
                                  <span>{(boost.clicks || 0).toLocaleString()} clicks</span>
                                </div>
                                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                  <span>{(boost.orders_generated || 0).toLocaleString()} orders</span>
                                </div>
                                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                                  <BarChart3 className="h-3.5 w-3.5" />
                                  <span>{ctr}% CTR</span>
                                </div>
                              </div>

                              {/* Cost Display */}
                              <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                                <span>
                                  Cost: <span className="line-through">₱{(boost.cost_per_day * boost.duration_days).toFixed(2)}</span>
                                </span>
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  FREE (Beta)
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Create Boost Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Rocket className="h-5 w-5 text-[var(--brand-primary)]" />
              Create Product Boost
            </DialogTitle>
            <DialogDescription>
              Choose a product, boost type, and duration to start advertising
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step 1: Select Product */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="bg-[var(--brand-primary)] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                Select Product
              </Label>

              {selectedProduct ? (
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  {getProductImage(selectedProduct) ? (
                    <img
                      src={getProductImage(selectedProduct)}
                      alt={selectedProduct.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{selectedProduct.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      ₱{selectedProduct.price?.toFixed(2)} · {selectedProduct.category?.name || "Uncategorized"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedProduct(null)}
                    className="text-gray-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search your products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-sm text-[var(--text-muted)]">
                        No products found. Add products to your store first.
                      </div>
                    ) : (
                      filteredProducts.map((product) => {
                        const isApproved = product.approval_status === 'approved';
                        return (
                        <button
                          key={product.id}
                          onClick={() => isApproved && setSelectedProduct(product)}
                          disabled={!isApproved}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 transition-colors text-left",
                            isApproved
                              ? "hover:bg-orange-50 cursor-pointer"
                              : "opacity-50 cursor-not-allowed bg-gray-50"
                          )}
                        >
                          {getProductImage(product) ? (
                            <img
                              src={getProductImage(product)}
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                              <Package className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">
                              ₱{product.price?.toFixed(2)}
                              {!isApproved && (
                                <span className="ml-2 text-amber-600 font-medium">
                                  ({product.approval_status === 'pending' ? 'Pending Approval' : product.approval_status === 'rejected' ? 'Rejected' : product.approval_status})
                                </span>
                              )}
                            </p>
                          </div>
                          {isApproved ? (
                            <ChevronRight className="h-4 w-4 text-gray-300" />
                          ) : (
                            <span className="text-[10px] text-amber-500 font-medium whitespace-nowrap">Not Approved</span>
                          )}
                        </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Select Boost Type */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="bg-[var(--brand-primary)] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                Boost Type
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(BOOST_TYPE_LABELS) as BoostType[]).map((type) => {
                  const estimate = calculateBoostPrice(type, selectedDuration, dailyBudget);
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedBoostType(type)}
                      className={cn(
                        "relative rounded-xl p-4 border-2 text-left transition-all",
                        selectedBoostType === type
                          ? "border-[var(--brand-primary)] bg-orange-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300",
                      )}
                    >
                      {selectedBoostType === type && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--brand-primary)] rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br mb-2",
                        BOOST_TYPE_GRADIENTS[type],
                      )}>
                        {BOOST_TYPE_ICONS[type]}
                      </div>
                      <h4 className="font-bold text-sm">{BOOST_TYPE_LABELS[type]}</h4>
                      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                        {BOOST_TYPE_DESCRIPTIONS[type]}
                      </p>
                      <div className="mt-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-[var(--text-muted)] line-through">
                            ₱{estimate.costPerDay.toFixed(2)}/day
                          </span>
                          <Badge className="bg-green-100 text-green-700 text-[10px]">FREE</Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400">
                          <span>~{estimate.estimatedImpressions.toLocaleString()} views</span>
                          <span>·</span>
                          <span>~{estimate.estimatedClicks} clicks</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Duration */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="bg-[var(--brand-primary)] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                Duration
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    onClick={() => setSelectedDuration(opt.days)}
                    className={cn(
                      "rounded-xl p-3 border-2 text-center transition-all",
                      selectedDuration === opt.days
                        ? "border-[var(--brand-primary)] bg-orange-50"
                        : "border-gray-200 hover:border-gray-300",
                    )}
                  >
                    <p className="font-bold text-lg">{opt.days}</p>
                    <p className="text-xs text-[var(--text-muted)]">days</p>
                    {opt.discount > 0 && (
                      <Badge className="mt-1 bg-red-100 text-red-600 text-[10px]">
                        -{opt.discount}%
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gray-50 rounded-xl p-4 border space-y-3">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[var(--brand-primary)]" />
                Pricing Breakdown
              </h4>

              {/* Dynamic Pricing Factors */}
              <div className="bg-white rounded-lg border border-gray-100 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span>Base Rate ({BOOST_TYPE_LABELS[selectedBoostType]})</span>
                  <span className="font-mono font-medium text-gray-700">₱{priceEstimate.baseRate.toFixed(2)}/day</span>
                </div>
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span title="Based on active users ÷ products in category">
                    Category Demand
                    <span className="ml-1 text-[10px] text-gray-400">(users/products)</span>
                  </span>
                  <span className={`font-mono font-medium ${priceEstimate.categoryDemandMultiplier > 1.2 ? 'text-red-500' : priceEstimate.categoryDemandMultiplier < 0.9 ? 'text-green-600' : 'text-gray-700'}`}>
                    ×{priceEstimate.categoryDemandMultiplier.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span title="Based on active boosts competing for the same slot type">
                    Competition Factor
                    <span className="ml-1 text-[10px] text-gray-400">(slot occupancy)</span>
                  </span>
                  <span className={`font-mono font-medium ${priceEstimate.competitionFactor > 1.3 ? 'text-red-500' : 'text-gray-700'}`}>
                    ×{priceEstimate.competitionFactor.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span title="Day-of-week, payday period, holiday season">
                    Seasonal Index
                    <span className="ml-1 text-[10px] text-gray-400">(day/payday/holiday)</span>
                  </span>
                  <span className={`font-mono font-medium ${priceEstimate.seasonalIndex > 1.2 ? 'text-amber-600' : 'text-gray-700'}`}>
                    ×{priceEstimate.seasonalIndex.toFixed(2)}
                  </span>
                </div>
                {priceEstimate.discountPercent > 0 && (
                  <div className="flex items-center justify-between text-green-600">
                    <span>Duration Discount ({selectedDuration} days)</span>
                    <span className="font-mono font-medium">-{priceEstimate.discountPercent}%</span>
                  </div>
                )}
                <div className="border-t border-dashed pt-1.5 flex items-center justify-between font-semibold text-sm text-gray-800">
                  <span>Effective Rate</span>
                  <span className="font-mono line-through text-gray-400">₱{priceEstimate.costPerDay.toFixed(2)}/day</span>
                </div>
              </div>

              {/* Performance Estimates */}
              <div className="bg-blue-50/60 rounded-lg border border-blue-100 p-3 space-y-1.5 text-xs">
                <p className="font-semibold text-blue-800 text-[11px] uppercase tracking-wider mb-1">Est. Performance</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="text-blue-500 text-[10px]">Impressions</span>
                    <span className="font-bold text-blue-800">{priceEstimate.estimatedImpressions.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-blue-500 text-[10px]">Est. Clicks</span>
                    <span className="font-bold text-blue-800">{priceEstimate.estimatedClicks.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-blue-500 text-[10px]">CPM</span>
                    <span className="font-bold text-blue-800">₱{priceEstimate.estimatedCPM.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-blue-500 text-[10px]">CPC</span>
                    <span className="font-bold text-blue-800">₱{priceEstimate.estimatedCPC.toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t border-blue-200 pt-1.5 flex items-center justify-between">
                  <span className="text-blue-600 font-medium text-[11px]">Est. ROAS</span>
                  <span className="font-black text-blue-800 text-sm">{priceEstimate.estimatedROAS}×</span>
                </div>
              </div>

              {/* Total */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Duration</span>
                  <span className="font-medium">{selectedDuration} days</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="font-bold">Total</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg line-through text-gray-400">₱{priceEstimate.totalCost.toFixed(2)}</span>
                    <span className="text-2xl font-black text-green-600">₱0.00</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg p-2">
                <Sparkles className="h-4 w-4" />
                <span>Free during beta — no charges will be applied</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBoost}
              disabled={!selectedProduct || creating}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white"
            >
              {creating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2" />
              ) : (
                <Rocket className="h-4 w-4 mr-2" />
              )}
              {creating ? "Activating..." : "Activate Boost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerWorkspaceLayout>
  );
}
