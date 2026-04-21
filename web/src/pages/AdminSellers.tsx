import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigate } from "react-router-dom";
import {
  useAdminAuth,
  useAdminSellers,
  Seller,
  type SellerDocumentField,
} from "../stores/adminStore";
import AdminSidebar from "../components/AdminSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Store,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  TrendingUp,
  Package,
  ShoppingBag,
  FileText,
  Download,
  UserCheck,
  Ban,
  Loader2,
  ChevronRight,
  Building,
  RefreshCw,
  MoreVertical,
} from "lucide-react";

const SuspendDialog = React.memo(({
  open,
  onOpenChange,
  sellerName,
  suspendSeller,
  sellerId,
  onSuccess,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerName?: string;
  suspendSeller: (id: string, reason: string) => Promise<void>;
  sellerId?: string;
  onSuccess: () => void;
  isLoading: boolean;
}) => {
  const [suspendReason, setSuspendReason] = useState("");

  const handleSuspend = async () => {
    if (!sellerId || !suspendReason.trim()) return;
    await suspendSeller(sellerId, suspendReason);
    setSuspendReason("");
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend Seller</DialogTitle>
          <DialogDescription>
            Please provide a reason for suspending "{sellerName}".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Enter suspension reason..."
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            onOpenChange(false);
            setSuspendReason('');
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleSuspend}
            disabled={!suspendReason.trim() || isLoading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Suspending...
              </>
            ) : (
              'Suspend Seller'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

SuspendDialog.displayName = 'SuspendDialog';

const AdminSellers: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const {
    sellers,
    pendingSellers,
    selectedSeller,
    isLoading,
    loadSellers,
    approveSeller,
    rejectSeller,
    partiallyRejectSeller,
    suspendSeller,
    blacklistSeller,
    reinstateSeller,
    selectSeller,
    hasCompleteRequirements,
    updateSellerTier,
  } = useAdminSellers();

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPartialRejectDialog, setShowPartialRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [partialRejectNote, setPartialRejectNote] = useState("");
  const [partialRejectionSelections, setPartialRejectionSelections] = useState<
    Record<string, { checked: boolean; reason: string }>
  >({});
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadSellers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const getFilteredSellers = useCallback(
    (status?: string) => {
      const sellersToFilter = status
        ? sellers.filter((seller) => seller.status === status)
        : sellers;
      return sellersToFilter.filter(
        (seller) =>
          seller.businessName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          seller.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          seller.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    },
    [sellers, searchTerm],
  );

  const approvedSellers = useMemo(
    () => getFilteredSellers("approved"),
    [getFilteredSellers],
  );
  const rejectedSellers = useMemo(
    () => getFilteredSellers("rejected"),
    [getFilteredSellers],
  );
  const blacklistedSellers = useMemo(
    () => getFilteredSellers("blacklisted"),
    [getFilteredSellers],
  );
  const suspendedSellers = useMemo(
    () => getFilteredSellers("suspended"),
    [getFilteredSellers],
  );
  const resubmissionSellers = useMemo(
    () => getFilteredSellers("needs_resubmission"),
    [getFilteredSellers],
  );
  const filteredPendingSellers = useMemo(
    () => getFilteredSellers("pending"),
    [getFilteredSellers],
  );
  const needsResubmissionCount = useMemo(
    () => sellers.filter((seller) => seller.status === "needs_resubmission").length,
    [sellers],
  );

  const selectedPartialRejections = useMemo(
    () =>
      Object.entries(partialRejectionSelections)
        .filter(([, value]) => value.checked)
        .map(([field, value]) => ({
          documentField: field,
          reason: value.reason.trim() || undefined,
        })),
    [partialRejectionSelections],
  );

  const handleViewDetails = useCallback(
    (seller: Seller) => {
      selectSeller(seller);
      setShowDetailsDialog(true);
    },
    [selectSeller],
  );

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleApprove = async () => {
    if (!selectedSeller) return;
    await approveSeller(selectedSeller.id);
    setShowApproveDialog(false);
    selectSeller(null);
  };

  const handleReject = async () => {
    if (!selectedSeller) return;
    await rejectSeller(selectedSeller.id, rejectReason.trim() || undefined);
    setShowRejectDialog(false);
    setRejectReason("");
    selectSeller(null);
  };

  const initializePartialReject = useCallback((seller: Seller) => {
    const initialSelections = seller.documents.reduce(
      (acc, document) => {
        acc[document.field] = {
          checked: false,
          reason: "",
        };
        return acc;
      },
      {} as Record<string, { checked: boolean; reason: string }>,
    );

    setPartialRejectionSelections(initialSelections);
    setPartialRejectNote("");
  }, []);

  const handlePartialReject = async () => {
    if (!selectedSeller || selectedPartialRejections.length === 0) return;

    if (
      selectedSeller.status === "needs_resubmission" &&
      selectedPartialRejections.length === 1
    ) {
      const proceed = window.confirm(
        "This seller is already in resubmission. If multiple documents are incorrect, select all of them in a single partial rejection so the seller cannot resubmit after updating only one. Proceed with only 1 document selected?"
      );
      if (!proceed) return;
    }

    await partiallyRejectSeller(selectedSeller.id, {
      note: partialRejectNote.trim() || undefined,
      items: selectedPartialRejections.map((item) => ({
        documentField: item.documentField as SellerDocumentField,
        reason: item.reason,
      })),
    });

    setShowPartialRejectDialog(false);
    setPartialRejectNote("");
    setPartialRejectionSelections({});
    selectSeller(null);
  };

  const updatePartialSelection = useCallback(
    (field: string, checked: boolean) => {
      setPartialRejectionSelections((prev) => ({
        ...prev,
        [field]: {
          checked,
          reason: checked ? prev[field]?.reason || "" : "",
        },
      }));
    },
    [],
  );

  const updatePartialReason = useCallback((field: string, reason: string) => {
    setPartialRejectionSelections((prev) => ({
      ...prev,
      [field]: {
        checked: prev[field]?.checked || false,
        reason,
      },
    }));
  }, []);

  const handlePreviewDocument = useCallback((url: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleDownloadDocument = useCallback((url: string, fileName: string) => {
    if (!url) return;

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleSuspendSuccess = () => {
    setShowSuspendDialog(false);
    selectSeller(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 pointer-events-none">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 pointer-events-none">
            Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 pointer-events-none">
            Pending
          </Badge>
        );
      case "needs_resubmission":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 pointer-events-none">
            Needs Resubmission
          </Badge>
        );
      case "blacklisted":
        return (
          <Badge className="bg-red-200 text-red-900 border-red-300 font-bold pointer-events-none">
            Blacklisted
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="bg-[var(--brand-accent-light)] text-[var(--brand-primary)] border-[var(--brand-primary)]/20 shadow-none pointer-events-none">
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="pointer-events-none">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return;
      case "rejected":
        return;
      case "blacklisted":
        return;
      case "suspended":
        return;
      case "pending":
        return;
      case "needs_resubmission":
        return;
      default:
        return;
    }
  };

  const getTierBadge = (tierLevel?: 'standard' | 'premium_outlet') => {
    if (tierLevel === 'premium_outlet') {
      return (
        <Badge className="bg-purple-100 text-purple-700 border-purple-200 pointer-events-none">
          Premium Outlet
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-gray-200 text-gray-500 pointer-events-none">
        Standard
      </Badge>
    );
  };

  const getRestrictionBadge = (seller: Seller) => {
    const now = new Date();
    const isPermanentlyBlacklisted =
      Boolean(seller.isPermanentlyBlacklisted) || Boolean(seller.blacklistedAt);

    if (isPermanentlyBlacklisted) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 text-xs pointer-events-none">
          Permanently Blacklisted
        </Badge>
      );
    }

    if (seller.tempBlacklistUntil && seller.tempBlacklistUntil > now) {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200 text-xs pointer-events-none">
          Temp Blacklisted ({seller.tempBlacklistCount || 0}/3)
        </Badge>
      );
    }

    if (seller.coolDownUntil && seller.coolDownUntil > now) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs pointer-events-none">
          Cooling Down ({seller.cooldownCount || 0}/3)
        </Badge>
      );
    }



    if (seller.reapplicationAttempts && seller.reapplicationAttempts > 0) {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs pointer-events-none">
          Attempts: {seller.reapplicationAttempts}/3
        </Badge>
      );
    }

    return null;
  };

  const handleTogglePremiumOutlet = async (sellerId: string, isPremium: boolean) => {
    try {
      await updateSellerTier(sellerId, isPremium ? 'premium_outlet' : 'standard');
    } catch (error) {
      console.error('Error toggling premium outlet:', error);
    }
  };

  const getResubmissionReviewBadge = (seller: Seller) => {
    const hasPendingResubmissionItems = seller.documents.some((doc) => doc.isRejected);

    if (hasPendingResubmissionItems) {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 pointer-events-none">
          Waiting for Seller
        </Badge>
      );
    }

    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 pointer-events-none">
        Ready for Review
      </Badge>
    );
  };

  const hasPendingResubmissionItems = (seller: Seller) =>
    seller.documents.some((doc) => doc.isRejected);

  const SellerAvatar = ({
    logo,
    name,
    sizeClass,
    iconClass,
  }: {
    logo?: string;
    name: string;
    sizeClass: string;
    iconClass: string;
  }) => {
    const [hasImageError, setHasImageError] = useState(false);
    const canRenderImage = Boolean(logo) && !hasImageError;

    return (
      <div
        className={`${sizeClass} bg-[var(--brand-primary)] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}
      >
        {canRenderImage ? (
          <img loading="lazy" 
            src={logo}
            alt={name}
            className={`${sizeClass} rounded-xl object-cover`}
            onError={() => setHasImageError(true)}
          />
        ) : (
          <Store className={iconClass} />
        )}
      </div>
    );
  };

  const SellerCard = React.memo(
    ({
      seller,
      showActions = false,
      showResubmissionState = false,
    }: {
      seller: Seller;
      showActions?: boolean;
      showResubmissionState?: boolean;
    }) => (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        layout
        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <SellerAvatar
                logo={seller.logo}
                name={seller.businessName}
                sizeClass="w-12 h-12"
                iconClass="w-6 h-6 text-white"
              />
              <div className="ml-4">
                <h3 className="font-semibold text-lg text-gray-900">
                  {seller.businessName}
                </h3>
                <p className="text-gray-600">{seller.ownerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showResubmissionState && seller.status === "needs_resubmission" ? (
                getResubmissionReviewBadge(seller)
              ) : (
                <>
                  {getStatusIcon(seller.status)}
                  {getStatusBadge(seller.status)}
                </>
              )}
              {getRestrictionBadge(seller)}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:gap-x-16 gap-y-2 mb-3">
            <div className="space-y-2 min-w-[240px]">
              <div className="flex items-center text-sm text-gray-500">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                <span className="truncate">{seller.email}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                {seller.phone}
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                <span className="line-clamp-1">{seller.address}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  Joined {new Date(seller.joinDate).toLocaleDateString()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(seller)}
                  className="h-8 px-3 rounded-lg text-xs border-gray-200 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:bg-transparent transition-all"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  View Details
                </Button>
              </div>
            </div>
          </div>

          {seller.status === "approved" && (
            <div className="bg-white border-t border-gray-200 overflow-hidden grid grid-cols-4 pt-2 mb-2">
              <div className="flex items-center justify-center py-1.5">
                <span className="text-sm text-gray-500">Products:</span>
                <span className="ml-2 font-bold text-gray-900">{seller.metrics.totalProducts}</span>
              </div>
              <div className="flex items-center justify-center py-1.5">
                <span className="text-sm text-gray-500">Orders:</span>
                <span className="ml-2 font-bold text-gray-900">{seller.metrics.totalOrders}</span>
              </div>
              <div className="flex items-center justify-center py-1.5">
                <span className="text-sm text-gray-500">Revenue:</span>
                <span className="ml-2 font-bold text-gray-900">₱{seller.metrics.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-center py-1.5">
                <span className="text-sm text-gray-500">Rating:</span>
                <div className="flex items-center ml-2 gap-1.5">
                  <span className="font-bold text-gray-900">{seller.metrics.rating}</span>
                </div>
              </div>
            </div>
          )}

          {seller.status === "approved" && (
            <div className="bg-purple-50 rounded-lg p-4 border-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-3 mb-0.5">
                    <span className="text-sm font-semibold text-purple-900">
                      Premium Outlet Status
                    </span>
                  </div>
                  <span className="text-xs text-purple-700 block">
                    Enabling this skips standard product assessment
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {getTierBadge(seller.tierLevel)}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={seller.tierLevel === 'premium_outlet'}
                    onChange={(e) => handleTogglePremiumOutlet(seller.id, e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    ),
  );

  if (isLoading && sellers.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar open={open} setOpen={setOpen} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Loading sellers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <AdminSidebar open={open} setOpen={setOpen} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">
                Seller Management
              </h1>
              <p className="text-[var(--text-muted)]">
                Review and manage seller applications and accounts
              </p>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="flex items-center justify-between gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm rounded-full p-0.5 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-0.5">
                {[
                  { id: 'pending', label: 'Pending', count: filteredPendingSellers.length },
                  { id: 'needs_resubmission', label: 'Resubmission', count: resubmissionSellers.length },
                  { id: 'approved', label: 'Approved', count: approvedSellers.length },
                  { id: 'rejected', label: 'Rejected', count: rejectedSellers.length },
                  { id: 'blacklisted', label: 'Blacklisted', count: blacklistedSellers.length },
                  { id: 'suspended', label: 'Suspended', count: suspendedSellers.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-4 h-7 text-xs font-medium transition-all duration-300 rounded-full flex items-center gap-1.5 whitespace-nowrap z-10 ${activeTab === tab.id
                      ? 'text-white'
                      : 'text-gray-500 hover:text-[var(--brand-primary)]'
                      }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] font-normal transition-colors ${activeTab === tab.id ? 'text-white/80' : 'text-[var(--text-muted)]/60'}`}>
                      ({tab.count})
                    </span>
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-[var(--brand-primary)] rounded-full -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-[320px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--brand-primary)]" />
              <Input
                placeholder="Search sellers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 bg-white border-gray-200 rounded-xl shadow-sm focus:border-[var(--brand-primary)] focus:ring-0 placeholder:text-gray-400 text-sm"
              />
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >

            <TabsContent value="pending">
              <Card className="border-none shadow-md rounded-xl overflow-hidden">
                <div className="bg-white">
                  <AnimatePresence mode="popLayout">
                    {filteredPendingSellers.map((seller) => (
                      <SellerCard
                        key={seller.id}
                        seller={seller}
                        showActions={true}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                {filteredPendingSellers.length === 0 && (
                  <div className="text-center py-16 bg-white">
                    <Clock className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No pending applications
                    </h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-sm">
                      All seller applications have been reviewed. New applications will appear here.
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="approved">
              <Card className="border-none shadow-md rounded-xl overflow-hidden">
                <div className="bg-white">
                  <AnimatePresence mode="popLayout">
                    {approvedSellers.map((seller) => (
                      <SellerCard
                        key={seller.id}
                        seller={seller}
                        showActions={true}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                {approvedSellers.length === 0 && (
                  <div className="text-center py-16 bg-white">
                    <CheckCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No approved sellers
                    </h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-sm">
                      No sellers have been approved yet. Approved sellers will be listed here.
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="needs_resubmission">
              <Card className="border-none shadow-md rounded-xl overflow-hidden">
                <div className="bg-white">
                  <AnimatePresence mode="popLayout">
                    {resubmissionSellers.map((seller) => (
                      <SellerCard
                        key={seller.id}
                        seller={seller}
                        showActions={true}
                        showResubmissionState={true}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                {resubmissionSellers.length === 0 && (
                  <div className="text-center py-16 bg-white">
                    <AlertTriangle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No resubmissions pending
                    </h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-sm">
                      Sellers needing document updates will appear here after a partial rejection.
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="rejected">
              <Card className="border-none shadow-md rounded-xl overflow-hidden">
                <div className="bg-white">
                  <AnimatePresence mode="popLayout">
                    {rejectedSellers.map((seller) => (
                      <SellerCard key={seller.id} seller={seller} />
                    ))}
                  </AnimatePresence>
                </div>
                {rejectedSellers.length === 0 && (
                  <div className="text-center py-16 bg-white">
                    <XCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No rejected sellers
                    </h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-sm">
                      History of rejected applications will be shown here.
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="blacklisted">
              <Card className="border-none shadow-md rounded-xl overflow-hidden">
                <div className="bg-white">
                  <AnimatePresence mode="popLayout">
                    {blacklistedSellers.map((seller) => (
                      <SellerCard key={seller.id} seller={seller} />
                    ))}
                  </AnimatePresence>
                </div>
                {blacklistedSellers.length === 0 && (
                  <div className="text-center py-16 bg-white">
                    <Ban className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No blacklisted sellers
                    </h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-sm">
                      Permanently banned sellers will be listed here.
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="suspended">
              <Card className="border-none shadow-md rounded-xl overflow-hidden">
                <div className="bg-white">
                  <AnimatePresence mode="popLayout">
                    {suspendedSellers.map((seller) => (
                      <SellerCard key={seller.id} seller={seller} />
                    ))}
                  </AnimatePresence>
                </div>
                {suspendedSellers.length === 0 && (
                  <div className="text-center py-16 bg-white">
                    <Ban className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No suspended sellers
                    </h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-sm">
                      Accounts under temporary suspension will be shown here.
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Seller Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg">Seller Details</DialogTitle>
          </DialogHeader>

          {selectedSeller && (
            <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {/* Header with Status */}
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center">
                  <div className="mr-4">
                    <SellerAvatar
                      logo={selectedSeller.logo}
                      name={selectedSeller.businessName}
                      sizeClass="w-12 h-12"
                      iconClass="w-6 h-6 text-white"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 leading-tight">
                      {selectedSeller.businessName}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Joined {new Date(selectedSeller.joinDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(selectedSeller.status)}
                </div>
              </div>

              {/* Owner Information */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                  Owner Information
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg">
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">
                      Owner Name
                    </label>
                    <p className="text-xs font-medium text-gray-900">
                      {selectedSeller.ownerName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">
                      Email
                    </label>
                    <p className="text-xs text-gray-900">
                      {selectedSeller.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">
                      Phone Number
                    </label>
                    <p className="text-xs text-gray-900">
                      {selectedSeller.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                  Business Information
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">
                        Business Type
                      </label>
                      <p className="text-xs text-gray-900 capitalize">
                        {selectedSeller.businessType.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">
                        Registration Number
                      </label>
                      <p className="text-xs font-mono text-gray-900">
                        {selectedSeller.businessRegistrationNumber}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">
                        Tax ID (TIN)
                      </label>
                      <p className="text-sm font-mono text-gray-900">
                        {selectedSeller.taxIdNumber}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">
                      Store Description
                    </label>
                    <p className="text-xs text-gray-900 leading-relaxed">
                      {selectedSeller.storeDescription || "No description provided."}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">
                      Store Categories
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedSeller.storeCategory.map((category, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-[var(--brand-accent-light)] text-[var(--brand-primary)] border-[var(--brand-primary)]/20 shadow-none hover:bg-[var(--brand-accent-light)]"
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                  Business Address
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-0.5">
                      Street Address
                    </label>
                    <p className="text-xs text-gray-900">
                      {selectedSeller.businessAddress}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">
                      City
                    </label>
                    <p className="text-xs text-gray-900">
                      {selectedSeller.city}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">
                      Province
                    </label>
                    <p className="text-xs text-gray-900">
                      {selectedSeller.province}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">
                      Postal Code
                    </label>
                    <p className="text-xs font-mono text-gray-900">
                      {selectedSeller.postalCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Banking Information */}
              {(selectedSeller.bankName || selectedSeller.accountName || selectedSeller.accountNumber) && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                    Banking Information
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-lg grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">
                        Bank Name
                      </label>
                      <p className="text-xs text-gray-900">
                        {selectedSeller.bankName}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">
                        Account Name
                      </label>
                      <p className="text-xs text-gray-900">
                        {selectedSeller.accountName}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-0.5">
                        Account Number
                      </label>
                      <p className="text-xs font-mono text-gray-900">
                        {selectedSeller.accountNumber}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Information */}
              {(selectedSeller.status === "rejected" ||
                selectedSeller.status === "needs_resubmission") && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      {selectedSeller.status === "rejected"
                        ? "Rejection"
                        : "Resubmission"}{" "}
                      Details
                    </h4>
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <p className="text-sm font-medium text-red-900 mb-1">
                        Reason:
                      </p>
                      <p className="text-sm text-red-800">
                        {selectedSeller.rejectionReason}
                      </p>
                      {selectedSeller.rejectedAt && (
                        <p className="text-xs text-red-600 mt-2">
                          Reviewed on{" "}
                          {new Date(
                            selectedSeller.rejectedAt,
                          ).toLocaleDateString()}{" "}
                          by {selectedSeller.rejectedBy}
                        </p>
                      )}
                    </div>
                  </div>
                )}

              {/* Suspended Status Information */}
              {selectedSeller.status === "suspended" && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Suspension Details
                  </h4>
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                    <p className="text-sm font-medium text-orange-900 mb-1">
                      Reason:
                    </p>
                    <p className="text-sm text-orange-800">
                      {selectedSeller.suspensionReason || selectedSeller.rejectionReason}
                    </p>
                    {selectedSeller.suspendedAt && (
                      <p className="text-xs text-orange-600 mt-2">
                        Suspended on{" "}
                        {new Date(selectedSeller.suspendedAt).toLocaleDateString()}
                        {selectedSeller.suspendedBy && ` by ${selectedSeller.suspendedBy}`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                  Submitted Documents
                </h4>
                <div className="space-y-1.5">
                  {selectedSeller.documents.map((doc) => (
                    <div key={doc.id} className="space-y-1">
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg ${doc.isRejected
                          ? "bg-red-50 border border-red-200"
                          : "bg-gray-50"
                          }`}
                      >
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-xs font-medium text-gray-900">
                              {doc.fileName}
                            </p>
                            <p className="text-xs text-gray-600">
                              {doc.type.replace("_", " ").toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.isRejected ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200 pointer-events-none">
                              Needs Update
                            </Badge>
                          ) : doc.wasResubmitted ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 pointer-events-none">
                              Resubmitted
                            </Badge>
                          ) : doc.isVerified ? (
                            <Badge className="bg-green-50 text-green-700 border-green-200 rounded-full hover:bg-green-50 pointer-events-none">
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 rounded-full hover:bg-amber-50 pointer-events-none">
                              Pending
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-base"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32 border-none shadow-lg">
                              <DropdownMenuItem
                                onClick={() => handlePreviewDocument(doc.url)}
                                className="cursor-pointer focus:bg-gray-100 focus:text-gray-900"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                <span>View</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDownloadDocument(
                                    doc.url,
                                    `${doc.fileName || doc.type}.pdf`,
                                  )
                                }
                                className="cursor-pointer focus:bg-gray-100 focus:text-gray-900"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                <span>Download</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {doc.rejectionReason && (
                        <p className="text-xs text-red-700 mt-2">
                          {doc.rejectionReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Metrics (for approved sellers) */}
              {selectedSeller.status === "approved" && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                    Performance Metrics
                  </h4>
                  <div className="border-0 bg-gray-50 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-50">
                        <tr className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-2.5 px-3 text-gray-700">Total Products</td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                            {selectedSeller.metrics.totalProducts}
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-2.5 px-3 text-gray-700">Total Orders</td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                            {selectedSeller.metrics.totalOrders}
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-2.5 px-3 text-gray-700">Total Revenue</td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                            ₱{selectedSeller.metrics.totalRevenue.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-2.5 px-3 text-gray-700">Rating</td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                            {selectedSeller.metrics.rating}/5
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-row items-center justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50/50">
            {selectedSeller && (
              <div className="flex items-center justify-end gap-2 w-full">
                {(selectedSeller.status === "pending" || selectedSeller.status === "needs_resubmission") && (
                  <>
                    {hasCompleteRequirements(selectedSeller).isValid && !hasPendingResubmissionItems(selectedSeller) ? (
                      <Button
                        onClick={() => setShowApproveDialog(true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Approve Seller
                      </Button>
                    ) : (
                      <>
                        <Button
                          disabled
                          className="bg-gray-100 text-gray-500 border-gray-200 flex-1 cursor-not-allowed"
                        >
                          {(() => {
                            const reqs = hasCompleteRequirements(selectedSeller);
                            if (hasPendingResubmissionItems(selectedSeller)) return "Waiting for Resubmission";
                            if (!reqs.hasBusinessAddress) return "Missing Address";
                            if (reqs.missingDocs.length > 0) return "Incomplete Docs";
                            return "Review Required";
                          })()}
                        </Button>
                        {!hasCompleteRequirements(selectedSeller).isValid && !hasPendingResubmissionItems(selectedSeller) && (
                          <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                            <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider mb-1">Missing Requirements:</p>
                            <ul className="space-y-1">
                              {!hasCompleteRequirements(selectedSeller).hasBusinessAddress && (
                                <li className="text-xs text-amber-700 flex items-center gap-1.5">
                                  <div className="w-1 h-1 rounded-full bg-amber-400" />
                                  Business Address
                                </li>
                              )}
                              {hasCompleteRequirements(selectedSeller).missingDocs.map(doc => (
                                <li key={doc} className="text-xs text-amber-700 flex items-center gap-1.5">
                                  <div className="w-1 h-1 rounded-full bg-amber-400" />
                                  {doc.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => {
                        initializePartialReject(selectedSeller);
                        setShowPartialRejectDialog(true);
                      }}
                      className="text-gray-500 border-gray-200 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Partial Reject
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setShowRejectDialog(true)}
                      className="text-gray-500 border-gray-200 hover:text-red-600 hover:border-red-600 hover:bg-base ml-auto transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reject
                    </Button>
                  </>
                )}

                {selectedSeller.status === "approved" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const reason = window.prompt('Reason for blacklisting this seller (this is permanent):');
                        if (!reason || !reason.trim()) return;
                        await blacklistSeller(selectedSeller.id, reason.trim());
                        setShowDetailsDialog(false);
                        selectSeller(null);
                      }}
                      className="text-gray-500 border-gray-200 hover:text-red-700 hover:border-red-700 hover:bg-red-50 transition-all"
                    >
                      Blacklist
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowSuspendDialog(true)}
                      className="ml-auto text-gray-500 border-gray-200 hover:text-orange-600 hover:border-orange-600 hover:bg-orange-50 transition-all"
                    >
                      Suspend Account
                    </Button>
                  </>
                )}

                {selectedSeller.status === "suspended" && (
                  <Button
                    onClick={async () => {
                      if (!window.confirm('Reinstate this seller? They will regain full access to selling.')) return;
                      await reinstateSeller(selectedSeller.id);
                      setShowDetailsDialog(false);
                      selectSeller(null);
                    }}
                    className="ml-auto bg-green-600 hover:bg-green-700 text-white"
                  >
                    Reinstate Seller
                  </Button>
                )}

                {selectedSeller.status === "blacklisted" && (
                  <Button
                    onClick={async () => {
                      if (!window.confirm('Remove this seller from the blacklist? They will be reinstated as approved.')) return;
                      await reinstateSeller(selectedSeller.id);
                      setShowDetailsDialog(false);
                      selectSeller(null);
                    }}
                    className="ml-auto bg-green-600 hover:bg-green-700 text-white"
                  >
                    Remove from Blacklist
                  </Button>
                )}

                {selectedSeller.status === "rejected" && (
                  <Button
                    onClick={async () => {
                      if (!window.confirm('Reinstate this rejected seller as approved? They will regain full selling access.')) return;
                      await reinstateSeller(selectedSeller.id);
                      setShowDetailsDialog(false);
                      selectSeller(null);
                    }}
                    variant="outline"
                    className="ml-auto text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    Reinstate as Approved
                  </Button>
                )}

              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Seller Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Seller Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve "{selectedSeller?.businessName}"?
              This will give them full access to sell on the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve Seller"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Seller Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Seller Application</DialogTitle>
            <DialogDescription>
              Add an optional reason for rejecting "{selectedSeller?.businessName}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              rows={4}
              placeholder="Optional: add a note to help the seller understand what to fix"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-200 text-gray-500 hover:text-gray-600 hover:bg-gray-50"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Application"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partial Reject Seller Dialog */}
      <Dialog
        open={showPartialRejectDialog}
        onOpenChange={(openValue) => {
          setShowPartialRejectDialog(openValue);
          if (!openValue) {
            setPartialRejectionSelections({});
            setPartialRejectNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Partially Reject Documents</DialogTitle>
            <DialogDescription>
              Select specific documents from "{selectedSeller?.businessName}" that need correction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {selectedSeller?.documents.map((document) => {
              const selection = partialRejectionSelections[document.field] || {
                checked: false,
                reason: "",
              };

              return (
                <div
                  key={document.id}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selection.checked}
                      onCheckedChange={(checked) =>
                        updatePartialSelection(document.field, checked === true)
                      }
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{document.fileName}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        {document.type.replace("_", " ")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="group font-normal hover:bg-gray-50 text-gray-600 hover:text-gray-700 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      size="sm"
                      onClick={() => handlePreviewDocument(document.url)}
                    >
                      Preview <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>

                  {selection.checked && (
                    <Textarea
                      rows={3}
                      placeholder="Optional: specify what's wrong with this file"
                      value={selection.reason}
                      onChange={(event) =>
                        updatePartialReason(document.field, event.target.value)
                      }
                    />
                  )}
                </div>
              );
            })}

            {selectedSeller?.documents.length === 0 && (
              <p className="text-sm text-gray-600">No documents found for this seller.</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">Optional overall note</p>
            <Textarea
              rows={3}
              placeholder="Add context that applies to all selected documents"
              value={partialRejectNote}
              onChange={(event) => setPartialRejectNote(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="hover:bg-gray-50 text-gray-600 hover:text-gray-700 border-gray-200"
              onClick={() => {
                setShowPartialRejectDialog(false);
                setPartialRejectionSelections({});
                setPartialRejectNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePartialReject}
              disabled={selectedPartialRejections.length === 0 || isLoading}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                `Partial Reject (${selectedPartialRejections.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Seller Dialog */}
      <SuspendDialog
        open={showSuspendDialog}
        onOpenChange={setShowSuspendDialog}
        sellerName={selectedSeller?.storeName}
        suspendSeller={suspendSeller}
        sellerId={selectedSeller?.id}
        onSuccess={handleSuspendSuccess}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminSellers;
