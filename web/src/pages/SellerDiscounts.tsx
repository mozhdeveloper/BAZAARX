import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Play,
  Pause,
  Clock,
  Package,
  TrendingUp,
  Calendar,
  Percent,
  LogOut,
  Zap,
  ShoppingBag,
  Eye,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SellerWorkspaceLayout } from "@/components/seller/SellerWorkspaceLayout";
import { useAuthStore } from "@/stores/sellerStore";
import { sellerLinks } from "@/config/sellerLinks";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { discountService } from "@/services/discountService";
import { AddProductsToCampaignDialog } from "@/components/AddProductsToCampaignDialog";
import type {
  DiscountCampaign,
  CampaignType,
  DiscountType,
  AppliesTo,
  ProductDiscount,
} from "@/types/discount";
import {
  campaignTypeLabels as typeLabels,
  campaignStatusLabels as statusLabels,
  campaignStatusColors as statusColors,
} from "@/types/discount";


// Countdown Timer Component
const CountdownTimer = ({ endDate }: { endDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Ended");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="flex items-center gap-1 text-sm text-[var(--brand-primary)] font-medium">
      <Clock className="h-4 w-4" />
      <span>{timeLeft}</span>
    </div>
  );
};

export default function SellerDiscounts() {
  const parseDateTimeLocal = (value: string): Date => {
    const [datePart, timePart] = value.split("T");
    if (!datePart || !timePart) return new Date(value);
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    return new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0);
  };

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<DiscountCampaign | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedCampaignForProducts, setSelectedCampaignForProducts] = useState<DiscountCampaign | null>(null);
  const [isViewProductsDialogOpen, setIsViewProductsDialogOpen] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState<DiscountCampaign | null>(null);
  const [campaignProducts, setCampaignProducts] = useState<Record<string, ProductDiscount[]>>({});

  const { seller, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    campaignType: "flash_sale" as CampaignType,
    discountType: "percentage" as DiscountType,
    discountValue: "",
    maxDiscountAmount: "",
    minPurchaseAmount: "",
    startsAt: "",
    endsAt: "",
    badgeText: "",
    badgeColor: "#FF6A00",
    claimLimit: "",
    perCustomerLimit: "1",
    appliesTo: "all_products" as AppliesTo,
  });

  // Fetch campaigns
  const fetchCampaigns = async () => {
    if (!seller?.id) return;

    try {
      setLoading(true);
      const data = await discountService.getCampaignsBySeller(seller.id);
      setCampaigns((data || []) as DiscountCampaign[]);

      // Fetch product counts for each campaign
      const productCounts: Record<string, ProductDiscount[]> = {};
      for (const campaign of (data || []) as DiscountCampaign[]) {
        if (campaign.appliesTo === "specific_products") {
          try {
            const products = await discountService.getProductsInCampaign(campaign.id);
            productCounts[campaign.id] = products;
          } catch (error) {
            console.error(`Failed to fetch products for campaign ${campaign.id}:`, error);
            productCounts[campaign.id] = [];
          }
        }
      }
      setCampaignProducts(productCounts);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      toast({
        title: "Error",
        description: "Failed to load campaigns.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seller?.id) {
      fetchCampaigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller?.id]);

  // Auto-open create dialog when redirected from SellerProducts with flash_product param
  useEffect(() => {
    const flashProductId = searchParams.get("flash_product");
    const flashProductName = searchParams.get("flash_product_name");
    const flashProductPrice = searchParams.get("flash_product_price");
    if (flashProductId && flashProductName) {
      setFormData((prev) => ({
        ...prev,
        name: `Flash Sale — ${flashProductName}`,
        campaignType: "flash_sale" as CampaignType,
        appliesTo: "specific_products" as AppliesTo,
        discountType: "percentage" as DiscountType,
      }));
      setIsCreateDialogOpen(true);
      // Clean up URL params
      setSearchParams({}, { replace: true });
      toast({
        title: "Flash Sale Setup",
        description: `Setting up flash sale for "${flashProductName}". Complete the form and add the product after saving.`,
      });
    }
  }, [searchParams, setSearchParams, toast]);

  const handleLogout = () => {
    logout();
    navigate("/seller/auth");
  };

  // Calculate stats
  const stats = {
    active: campaigns.filter((c) => c.status === "active").length,
    scheduled: campaigns.filter((c) => c.status === "scheduled").length,
    totalUsage: campaigns.reduce((sum, c) => sum + c.usageCount, 0),
    avgDiscount: campaigns.length > 0
      ? Math.round(
        campaigns.reduce((sum, c) => sum + c.discountValue, 0) / campaigns.length
      )
      : 0,
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || campaign.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Create campaign
  const handleCreateCampaign = async () => {
    if (!seller?.id) return;

    try {
      await discountService.createCampaign({
        sellerId: seller.id,
        name: formData.name,
        description: formData.description,
        campaignType: formData.campaignType,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        maxDiscountAmount: formData.maxDiscountAmount
          ? parseFloat(formData.maxDiscountAmount)
          : undefined,
        minPurchaseAmount: formData.minPurchaseAmount
          ? parseFloat(formData.minPurchaseAmount)
          : 0,
        startsAt: parseDateTimeLocal(formData.startsAt),
        endsAt: parseDateTimeLocal(formData.endsAt),
        badgeText: formData.badgeText,
        badgeColor: formData.badgeColor,
        claimLimit: formData.claimLimit
          ? parseInt(formData.claimLimit)
          : undefined,
        perCustomerLimit: parseInt(formData.perCustomerLimit),
        appliesTo: formData.appliesTo,
      });

      toast({
        title: "Campaign Created",
        description: "Your discount campaign has been created successfully.",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast({
        title: "Error",
        description: "Failed to create campaign.",
        variant: "destructive",
      });
    }
  };

  // Update campaign
  const handleUpdateCampaign = async () => {
    if (!editingCampaign) return;

    try {
      await discountService.updateCampaign(editingCampaign.id, {
        name: formData.name,
        description: formData.description,
        campaignType: formData.campaignType,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        maxDiscountAmount: formData.maxDiscountAmount
          ? parseFloat(formData.maxDiscountAmount)
          : undefined,
        minPurchaseAmount: formData.minPurchaseAmount
          ? parseFloat(formData.minPurchaseAmount)
          : 0,
        startsAt: parseDateTimeLocal(formData.startsAt),
        endsAt: parseDateTimeLocal(formData.endsAt),
        badgeText: formData.badgeText,
        badgeColor: formData.badgeColor,
        claimLimit: formData.claimLimit
          ? parseInt(formData.claimLimit)
          : undefined,
        perCustomerLimit: parseInt(formData.perCustomerLimit),
        appliesTo: formData.appliesTo,
      });

      toast({
        title: "Campaign Updated",
        description: "Your discount campaign has been updated successfully.",
      });

      setIsEditDialogOpen(false);
      setEditingCampaign(null);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error("Failed to update campaign:", error);
      toast({
        title: "Error",
        description: "Failed to update campaign.",
        variant: "destructive",
      });
    }
  };

  // Delete campaign
  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      await discountService.deleteCampaign(id);
      toast({
        title: "Campaign Deleted",
        description: "Campaign has been removed successfully.",
      });
      fetchCampaigns();
    } catch (error) {
      console.error("Failed to delete campaign:", error);
      toast({
        title: "Error",
        description: "Failed to delete campaign.",
        variant: "destructive",
      });
    }
  };

  // Toggle pause/resume
  const handleTogglePause = async (id: string, currentStatus: string) => {

    try {
      const isPaused = currentStatus === "paused";
      const shouldPause = !isPaused; // If currently active, we want to pause (true). If paused, we want to resume (false).

      const result = await discountService.toggleCampaignStatus(id, shouldPause);
      console.log('🎯 Result from service:', result);
      console.log('🎯 New status from result:', result.status);

      toast({
        title: isPaused ? "Campaign Resumed" : "Campaign Paused",
        description: `Campaign has been ${isPaused ? "resumed" : "paused"}.`,
      });

      console.log('🔄 About to refresh campaigns...');
      await fetchCampaigns();
      console.log('✅ Campaigns refreshed');
      console.log('📊 Current campaigns state:', campaigns.map(c => ({ id: c.id, name: c.name, status: c.status })));
    } catch (error) {
      console.error("❌ Failed to toggle campaign:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update campaign status.",
        variant: "destructive",
      });
    }
  };

  // Deactivate campaign (set status to cancelled)
  const handleDeactivateCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this campaign?")) return;

    try {
      await discountService.deactivateCampaign(id);
      toast({
        title: "Campaign Deactivated",
        description: "Campaign has been deactivated successfully.",
      });
      fetchCampaigns();
    } catch (error) {
      console.error("Failed to deactivate campaign:", error);
      toast({
        title: "Error",
        description: "Failed to deactivate campaign.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (campaign: DiscountCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      campaignType: campaign.campaignType,
      discountType: campaign.discountType,
      discountValue: campaign.discountValue.toString(),
      maxDiscountAmount: campaign.maxDiscountAmount?.toString() || "",
      minPurchaseAmount: campaign.minPurchaseAmount?.toString() || "",
      startsAt: formatDateTimeLocal(campaign.startsAt),
      endsAt: formatDateTimeLocal(campaign.endsAt),
      badgeText: campaign.badgeText || "",
      badgeColor: campaign.badgeColor || "#FF6A00",
      claimLimit: campaign.claimLimit?.toString() || "",
      perCustomerLimit: campaign.perCustomerLimit.toString(),
      appliesTo: campaign.appliesTo,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      campaignType: "flash_sale",
      discountType: "percentage",
      discountValue: "",
      maxDiscountAmount: "",
      minPurchaseAmount: "",
      startsAt: "",
      endsAt: "",
      badgeText: "",
      badgeColor: "#FF6A00",
      claimLimit: "",
      perCustomerLimit: "1",
      appliesTo: "all_products",
    });
  };

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.discountValue !== "" &&
    formData.startsAt !== "" &&
    formData.endsAt !== "" &&
    !isNaN(parseFloat(formData.discountValue)) &&
    parseDateTimeLocal(formData.startsAt).getTime() < parseDateTimeLocal(formData.endsAt).getTime();

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
                    Discount Campaigns
                  </h1>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Create and manage your discount campaigns
                  </p>
                </div>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  size="lg"
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Campaign
                </Button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors"></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="text-[var(--secondary-foreground)] group-hover:text-[var(--brand-primary)] transition-all">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[var(--text-muted)] text-sm relative z-10">Active Campaigns</h3>
                    <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all relative z-10">{stats.active}</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors"></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="text-[var(--secondary-foreground)] group-hover:text-[var(--brand-primary)] transition-all">
                      <Calendar className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[var(--text-muted)] text-sm relative z-10">Scheduled</h3>
                    <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all relative z-10">{stats.scheduled}</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors"></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="text-[var(--secondary-foreground)] group-hover:text-[var(--brand-primary)] transition-all">
                      <Package className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[var(--text-muted)] text-sm relative z-10">Total Usage</h3>
                    <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all relative z-10">{stats.totalUsage}</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors"></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="text-[var(--secondary-foreground)] group-hover:text-[var(--brand-primary)] transition-all">
                      <Percent className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[var(--text-muted)] text-sm relative z-10">Avg Discount</h3>
                    <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all relative z-10">{stats.avgDiscount}%</p>
                  </div>
                </motion.div>
              </div>

              {/* Filters */}
              <div className="mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors h-4 w-4" />
                    <Input
                      placeholder="Search campaigns by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 bg-white border border-[var(--brand-accent-light)]/50 focus:border-[var(--brand-primary)] rounded-xl shadow-none focus-visible:ring-0 focus:ring-0 transition-all"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-56 h-10 rounded-xl border border-[var(--brand-accent-light)]/50 bg-white shadow-none focus-visible:ring-0 focus:ring-0 transition-all text-sm">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[var(--brand-accent-light)] shadow-xl bg-white">
                      <SelectItem value="all">All Campaigns</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Campaigns List */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-0 shadow-sm">
                  <div className="w-12 h-12 border-0 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin mb-4" />
                  <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Loading campaigns...</p>
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-0 shadow-sm">
                  <div className="w-20 h-20 bg-[var(--brand-wash)] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Package className="h-10 w-10 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-black text-[var(--text-headline)] mb-2">No campaigns found</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-8 max-w-xs mx-auto">Start creating discount campaigns to attract more buyers to your products.</p>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    variant="outline"
                    className="rounded-xl border-gray-200 font-bold hover:bg-gray-50 transition-all px-8 h-12"
                  >
                    Create your first campaign
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl shadow-md border border-gray-100/50 overflow-hidden">
                  {filteredCampaigns.map((campaign, idx) => (
                    <div
                      key={campaign.id}
                      className={cn(
                        "p-6 hover:bg-gray-50/50 transition-all group",
                        idx !== filteredCampaigns.length - 1 && "border-b border-[var(--btn-border)]"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-black text-[var(--text-headline)] font-heading">
                              {campaign.name}
                            </h3>
                            <div className="flex items-center gap-1.5">
                              <Badge className={cn("rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight", statusColors[campaign.status])}>
                                {statusLabels[campaign.status]}
                              </Badge>
                              <Badge variant="outline" className="rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight border-0 text-gray-500 bg-gray-50">
                                {typeLabels[campaign.campaignType]}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {campaign.startsAt.toLocaleDateString()} -{" "}
                              {campaign.endsAt.toLocaleDateString()}
                            </span>
                          </div>

                          {campaign.description && (
                            <p className="text-sm text-gray-600 mb-3">
                              {campaign.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Percent className="h-4 w-4" />
                              <span>
                                {campaign.discountValue}
                                {campaign.discountType === "percentage" ? "%" : "₱"} OFF
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              <span>{campaign.usageCount} used</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ShoppingBag className="h-4 w-4" />
                              <span>
                                {campaign.appliesTo === "all_products"
                                  ? "All Products"
                                  : campaign.appliesTo === "specific_products"
                                    ? `${campaignProducts[campaign.id]?.length || 0} Products`
                                    : "Specific Scope"}
                              </span>
                            </div>
                            {campaign.status === "active" && (
                              <CountdownTimer endDate={campaign.endsAt} />
                            )}
                          </div>

                          {campaign.badgeText && (
                            <div className="mt-3">
                              <span
                                className="inline-block px-3 py-1 text-xs font-bold text-white rounded"
                                style={{ backgroundColor: campaign.badgeColor }}
                              >
                                {campaign.badgeText}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {campaign.appliesTo === "specific_products" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setViewingCampaign(campaign);
                                  setIsViewProductsDialogOpen(true);
                                }}
                                className="text-xs h-9 rounded-xl border-[var(--btn-border)] hover:bg-[var(--brand-primary)] hover:text-white"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Products ({campaignProducts[campaign.id]?.length || 0})
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCampaignForProducts(campaign);
                                  setIsProductDialogOpen(true);
                                }}
                                className="text-xs h-9 rounded-xl border-[var(--btn-border)] hover:bg-[var(--brand-primary)] hover:text-white"
                              >
                                Add Products
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-base text-gray-400 hover:text-gray-600"
                            onClick={() => openEditDialog(campaign)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {campaign.status !== "ended" &&
                            campaign.status !== "cancelled" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl hover:bg-base text-gray-400 hover:text-gray-600"
                                onClick={() =>
                                  handleTogglePause(campaign.id, campaign.status)
                                }
                              >
                                {campaign.status === "paused" ? (
                                  <Play className="h-4 w-4" />
                                ) : (
                                  <Pause className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          {campaign.status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl hover:bg-base text-gray-400 hover:text-red-600"
                              onClick={() => handleDeactivateCampaign(campaign.id)}
                              title="Deactivate campaign"
                            >
                              <XCircle className="h-4 w-4 text-gray-400 hover:text-red-600 transition-colors" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-base text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteCampaign(campaign.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Create Campaign Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle>Create Discount Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new discount campaign for your products
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Weekend Flash Sale"
                    className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of the campaign"
                    className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="campaignType">Campaign Type *</Label>
                    <Select
                      value={formData.campaignType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, campaignType: value as CampaignType })
                      }
                    >
                      <SelectTrigger id="campaignType" className="focus:ring-0 focus-visible:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent portal={false} className="z-[100] max-h-60">
                        {Object.entries(typeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="discountType">Discount Type *</Label>
                    <Select
                      value={formData.discountType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, discountType: value as DiscountType })
                      }
                    >
                      <SelectTrigger id="discountType" className="focus:ring-0 focus-visible:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent portal={false} className="z-[100] max-h-60">
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discountValue">
                      Discount Value * ({formData.discountType === "percentage" ? "%" : "₱"})
                    </Label>
                    <Input
                      id="discountValue"
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) =>
                        setFormData({ ...formData, discountValue: e.target.value })
                      }
                      placeholder={formData.discountType === "percentage" ? "30" : "100"}
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxDiscountAmount">Max Discount (₱)</Label>
                    <Input
                      id="maxDiscountAmount"
                      type="number"
                      value={formData.maxDiscountAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, maxDiscountAmount: e.target.value })
                      }
                      placeholder="Optional"
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startsAt">Starts At *</Label>
                    <Input
                      id="startsAt"
                      type="datetime-local"
                      value={formData.startsAt}
                      onChange={(e) =>
                        setFormData({ ...formData, startsAt: e.target.value })
                      }
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="endsAt">Ends At *</Label>
                    <Input
                      id="endsAt"
                      type="datetime-local"
                      value={formData.endsAt}
                      onChange={(e) =>
                        setFormData({ ...formData, endsAt: e.target.value })
                      }
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="badgeText">Badge Text</Label>
                    <Input
                      id="badgeText"
                      value={formData.badgeText}
                      onChange={(e) =>
                        setFormData({ ...formData, badgeText: e.target.value })
                      }
                      placeholder="FLASH SALE 30% OFF"
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="badgeColor">Badge Color</Label>
                    <Input
                      id="badgeColor"
                      type="color"
                      value={formData.badgeColor}
                      onChange={(e) =>
                        setFormData({ ...formData, badgeColor: e.target.value })
                      }
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all h-10 p-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="perCustomerLimit">Per Customer Limit *</Label>
                    <Input
                      id="perCustomerLimit"
                      type="number"
                      value={formData.perCustomerLimit}
                      onChange={(e) =>
                        setFormData({ ...formData, perCustomerLimit: e.target.value })
                      }
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="claimLimit">Claim Limit</Label>
                    <Input
                      id="claimLimit"
                      type="number"
                      value={formData.claimLimit}
                      onChange={(e) =>
                        setFormData({ ...formData, claimLimit: e.target.value })
                      }
                      placeholder="Optional"
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="appliesTo">Apply Discount To *</Label>
                  <Select
                    value={formData.appliesTo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, appliesTo: value as AppliesTo })
                    }
                  >
                    <SelectTrigger id="appliesTo" className="focus:ring-0 focus-visible:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent portal={false} className="z-[100] max-h-60">
                      <SelectItem value="all_products">All Products</SelectItem>
                      <SelectItem value="specific_products">Specific Products</SelectItem>
                      <SelectItem value="specific_categories" disabled>
                        Specific Categories (Unavailable)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.appliesTo === "specific_products" && (
                    <p className="text-xs text-gray-500 mt-1">
                      You can select products after creating the campaign
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="rounded-xl border-gray-100 font-bold hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCampaign}
                  className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Campaign Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-none shadow-2xl scrollbar-hide">
              <DialogHeader>
                <DialogTitle>Edit Campaign</DialogTitle>
                <DialogDescription>
                  Update your discount campaign details
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Campaign Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-campaignType">Campaign Type *</Label>
                    <Select
                      value={formData.campaignType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, campaignType: value as CampaignType })
                      }
                    >
                      <SelectTrigger id="edit-campaignType" className="focus:ring-0 focus-visible:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent portal={false} className="z-[100] max-h-60">
                        {Object.entries(typeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-discountType">Discount Type *</Label>
                    <Select
                      value={formData.discountType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, discountType: value as DiscountType })
                      }
                    >
                      <SelectTrigger id="edit-discountType" className="focus:ring-0 focus-visible:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent portal={false} className="z-[100] max-h-60">
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-discountValue">
                      Discount Value * ({formData.discountType === "percentage" ? "%" : "₱"})
                    </Label>
                    <Input
                      id="edit-discountValue"
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) =>
                        setFormData({ ...formData, discountValue: e.target.value })
                      }
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-maxDiscountAmount">Max Discount (₱)</Label>
                    <Input
                      id="edit-maxDiscountAmount"
                      type="number"
                      value={formData.maxDiscountAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, maxDiscountAmount: e.target.value })
                      }
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-startsAt">Starts At *</Label>
                    <Input
                      id="edit-startsAt"
                      type="datetime-local"
                      value={formData.startsAt}
                      onChange={(e) =>
                        setFormData({ ...formData, startsAt: e.target.value })
                      }
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-endsAt">Ends At *</Label>
                    <Input
                      id="edit-endsAt"
                      type="datetime-local"
                      value={formData.endsAt}
                      onChange={(e) =>
                        setFormData({ ...formData, endsAt: e.target.value })
                      }
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-badgeText">Badge Text</Label>
                    <Input
                      id="edit-badgeText"
                      value={formData.badgeText}
                      onChange={(e) =>
                        setFormData({ ...formData, badgeText: e.target.value })
                      }
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-badgeColor">Badge Color</Label>
                    <Input
                      id="edit-badgeColor"
                      type="color"
                      value={formData.badgeColor}
                      onChange={(e) =>
                        setFormData({ ...formData, badgeColor: e.target.value })
                      }
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all h-10 p-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-perCustomerLimit">Per Customer Limit *</Label>
                    <Input
                      id="edit-perCustomerLimit"
                      type="number"
                      value={formData.perCustomerLimit}
                      onChange={(e) =>
                        setFormData({ ...formData, perCustomerLimit: e.target.value })
                      }
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-claimLimit">Claim Limit</Label>
                    <Input
                      id="edit-claimLimit"
                      type="number"
                      value={formData.claimLimit}
                      onChange={(e) =>
                        setFormData({ ...formData, claimLimit: e.target.value })
                      }
                      className="focus-visible:ring-0 focus:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-appliesTo">Apply Discount To *</Label>
                  <Select
                    value={formData.appliesTo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, appliesTo: value as AppliesTo })
                    }
                  >
                    <SelectTrigger id="edit-appliesTo" className="focus:ring-0 focus-visible:ring-0 border-gray-200 focus:border-[var(--brand-primary)] transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent portal={false} className="z-[100] max-h-60">
                      <SelectItem value="all_products">All Products</SelectItem>
                      <SelectItem value="specific_products">Specific Products</SelectItem>
                      <SelectItem value="specific_categories" disabled>
                        Specific Categories (Unavailable)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.appliesTo === "specific_products" && (
                    <p className="text-xs text-gray-500 mt-1">
                      You can select products after saving
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingCampaign(null);
                    resetForm();
                  }}
                  className="rounded-xl border-gray-100 font-bold hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateCampaign}
                  className="bg-[var(--brand-primary)] text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Products to Campaign Dialog */}
          <AddProductsToCampaignDialog
            open={isProductDialogOpen}
            onOpenChange={setIsProductDialogOpen}
            campaign={selectedCampaignForProducts}
            sellerId={seller?.id || ""}
            onProductsAdded={() => {
              toast({
                title: "Products Added",
                description: "Products have been added to the campaign successfully.",
              });
              fetchCampaigns();
            }}
          />

          {/* View Products Dialog */}
          <Dialog open={isViewProductsDialogOpen} onOpenChange={setIsViewProductsDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col bg-white border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle>Campaign Products</DialogTitle>
                <DialogDescription>
                  {viewingCampaign?.name && `Products in "${viewingCampaign.name}"`}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto">
                {campaignProducts[viewingCampaign?.id || ""]?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)]">
                    <Package className="h-12 w-12 mb-2" />
                    <p>No products in this campaign yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {campaignProducts[viewingCampaign?.id || ""]?.map((productDiscount) => (
                      <div key={productDiscount.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start gap-4">
                          {/* Product Image */}
                          <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                            {productDiscount.productImage ? (
                              <img
                                src={productDiscount.productImage}
                                alt={productDiscount.productName || "Product"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {productDiscount.productName || "Unknown Product"}
                            </h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-gray-600">
                                ₱{productDiscount.productPrice?.toLocaleString() || "0"}
                              </span>
                              {productDiscount.discountedStock && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  {productDiscount.discountedStock} units at discount
                                </span>
                              )}
                              {productDiscount.soldCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  {productDiscount.soldCount} sold
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              try {
                                await discountService.removeProductFromCampaign(
                                  productDiscount.id
                                );
                                toast({
                                  title: "Product Removed",
                                  description: "Product has been removed from the campaign.",
                                });
                                fetchCampaigns();
                              } catch (err) {
                                console.error('Failed to remove product:', err);
                                toast({
                                  title: "Error",
                                  description: "Failed to remove product.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="hover:bg-transparent active:scale-95"
                          >
                            <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700 transition-colors" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsViewProductsDialogOpen(false)}
                  className="bg-base hover:bg-gray-100 text-[var(--text-headline)] hover:text-[var(--text-headline)] font-bold rounded-xl active:scale-95 transition-all"

                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsViewProductsDialogOpen(false);
                    setSelectedCampaignForProducts(viewingCampaign);
                    setIsProductDialogOpen(true);
                  }}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                  Add products
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SellerWorkspaceLayout>
  );
}
