import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {
  DiscountCampaign,
  CampaignType,
  DiscountType,
  AppliesTo,
} from "@/types/discount";
import {
  campaignTypeLabels as typeLabels,
  campaignStatusLabels as statusLabels,
  campaignStatusColors as statusColors,
} from "@/types/discount";

const Logo = () => (
  <Link
    to="/seller"
    className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
  >
    <img
      src="/Logo.png"
      alt="BazaarPH Logo"
      className="h-8 w-8 object-contain flex-shrink-0"
    />
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="font-semibold text-gray-900 whitespace-pre"
    >
      BazaarPH Seller
    </motion.span>
  </Link>
);

const LogoIcon = () => (
  <Link
    to="/seller"
    className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
  >
    <img
      src="/Logo.png"
      alt="BazaarPH Logo"
      className="h-8 w-8 object-contain flex-shrink-0"
    />
  </Link>
);

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
    <div className="flex items-center gap-1 text-sm text-orange-600 font-medium">
      <Clock className="h-4 w-4" />
      <span>{timeLeft}</span>
    </div>
  );
};

export default function SellerDiscounts() {
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<DiscountCampaign | null>(null);

  const { seller, logout } = useAuthStore();
  const navigate = useNavigate();
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
    totalUsageLimit: "",
    perCustomerLimit: "1",
    appliesTo: "all_products" as AppliesTo,
  });

  // Fetch campaigns
  const fetchCampaigns = async () => {
    if (!seller?.id) return;

    try {
      setLoading(true);
      const data = await discountService.getCampaignsBySeller(seller.id);
      setCampaigns(data || []);
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
        startsAt: new Date(formData.startsAt),
        endsAt: new Date(formData.endsAt),
        badgeText: formData.badgeText,
        badgeColor: formData.badgeColor,
        totalUsageLimit: formData.totalUsageLimit
          ? parseInt(formData.totalUsageLimit)
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
        startsAt: new Date(formData.startsAt),
        endsAt: new Date(formData.endsAt),
        badgeText: formData.badgeText,
        badgeColor: formData.badgeColor,
        totalUsageLimit: formData.totalUsageLimit
          ? parseInt(formData.totalUsageLimit)
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
  const handleTogglePause = async (id: string, isPaused: boolean) => {
    try {
      await discountService.toggleCampaignStatus(id, !isPaused);
      toast({
        title: isPaused ? "Campaign Resumed" : "Campaign Paused",
        description: `Campaign has been ${isPaused ? "resumed" : "paused"}.`,
      });
      fetchCampaigns();
    } catch (error) {
      console.error("Failed to toggle campaign:", error);
      toast({
        title: "Error",
        description: "Failed to update campaign status.",
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
      startsAt: campaign.startsAt.toISOString().slice(0, 16),
      endsAt: campaign.endsAt.toISOString().slice(0, 16),
      badgeText: campaign.badgeText || "",
      badgeColor: campaign.badgeColor || "#FF6A00",
      totalUsageLimit: campaign.totalUsageLimit?.toString() || "",
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
      totalUsageLimit: "",
      perCustomerLimit: "1",
      appliesTo: "all_products",
    });
  };

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row bg-gray-50 w-full flex-1 mx-auto border border-neutral-200 overflow-hidden",
        "h-screen"
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {sellerLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: seller?.name || "Seller",
                href: "#",
                icon: (
                  <img
                    src={seller?.avatar || "https://avatar.vercel.sh/seller"}
                    className="h-7 w-7 flex-shrink-0 rounded-full"
                    alt="Avatar"
                  />
                ),
              }}
            />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-neutral-700 hover:bg-gray-100 rounded-md"
            >
              <LogOut className="h-4 w-4" />
              {open && <span>Logout</span>}
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="h-8 w-8 text-orange-600" />
                Discount Campaigns
              </h1>
              <p className="text-gray-600 mt-1">
                Create and manage your discount campaigns
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Campaign
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Campaigns</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Usage</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalUsage}</p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Discount</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.avgDiscount}%</p>
                </div>
                <Percent className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campaigns List */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading campaigns...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No campaigns found</p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="mt-4"
                variant="outline"
              >
                Create your first campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {campaign.name}
                        </h3>
                        <Badge className={statusColors[campaign.status]}>
                          {statusLabels[campaign.status]}
                        </Badge>
                        <Badge variant="outline">
                          {typeLabels[campaign.campaignType]}
                        </Badge>
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
                          <Calendar className="h-4 w-4" />
                          <span>
                            {campaign.startsAt.toLocaleDateString()} -{" "}
                            {campaign.endsAt.toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          <span>{campaign.usageCount} used</span>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(campaign)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {campaign.status !== "ended" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleTogglePause(
                              campaign.id,
                              campaign.status === "paused"
                            )
                          }
                        >
                          {campaign.status === "paused" ? (
                            <Play className="h-4 w-4" />
                          ) : (
                            <Pause className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCampaign(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                />
              </div>

              <div>
                <Label htmlFor="totalUsageLimit">Total Usage Limit</Label>
                <Input
                  id="totalUsageLimit"
                  type="number"
                  value={formData.totalUsageLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, totalUsageLimit: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCampaign}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                />
              </div>

              <div>
                <Label htmlFor="edit-totalUsageLimit">Total Usage Limit</Label>
                <Input
                  id="edit-totalUsageLimit"
                  type="number"
                  value={formData.totalUsageLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, totalUsageLimit: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingCampaign(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateCampaign}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
