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
  User,
  Building,
  RefreshCw,
} from "lucide-react";

const AdminSellers: React.FC = () => {
  const SHOW_BANKING_INFO = false;

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
    selectSeller,
    hasCompleteRequirements,
  } = useAdminSellers();

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPartialRejectDialog, setShowPartialRejectDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [partialRejectNote, setPartialRejectNote] = useState("");
  const [partialRejectionSelections, setPartialRejectionSelections] = useState<
    Record<string, { checked: boolean; reason: string }>
  >({});
  const [suspendReason, setSuspendReason] = useState("");

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
  const resubmissionSellers = useMemo(
    () => getFilteredSellers("needs_resubmission"),
    [getFilteredSellers],
  );
  const suspendedSellers = useMemo(
    () => getFilteredSellers("suspended"),
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
    await loadSellers();
  };

  const handleReject = async () => {
    if (!selectedSeller) return;
    await rejectSeller(selectedSeller.id, rejectReason.trim() || undefined);
    setShowRejectDialog(false);
    setRejectReason("");
    selectSeller(null);
    // Reload sellers to refresh the UI
    await loadSellers();
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
    await loadSellers();
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

  const handleSuspend = async () => {
    if (!selectedSeller || !suspendReason) return;
    await suspendSeller(selectedSeller.id, suspendReason);
    setShowSuspendDialog(false);
    setSuspendReason("");
    selectSeller(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            Rejected
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200">
            Suspended
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        );
      case "needs_resubmission":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            Needs Resubmission
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "suspended":
        return <Ban className="w-4 h-4 text-orange-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "needs_resubmission":
        return <AlertTriangle className="w-4 h-4 text-amber-700" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getResubmissionReviewBadge = (seller: Seller) => {
    const hasPendingResubmissionItems = seller.documents.some((doc) => doc.isRejected);

    if (hasPendingResubmissionItems) {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
          Waiting for Seller
        </Badge>
      );
    }

    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
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
        className={`${sizeClass} bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0`}
      >
        {canRenderImage ? (
          <img
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        layout
      >
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6">
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
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                {seller.email}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                {seller.phone}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                {seller.address}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                Joined {new Date(seller.joinDate).toLocaleDateString()}
              </div>
            </div>

            {seller.status === "approved" && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  Performance Metrics
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Products</p>
                    <p className="font-semibold text-gray-900">
                      {seller.metrics.totalProducts}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Orders</p>
                    <p className="font-semibold text-gray-900">
                      {seller.metrics.totalOrders}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Revenue</p>
                    <p className="font-semibold text-gray-900">
                      ₱{seller.metrics.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Rating</p>
                    <div className="flex items-center justify-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      <p className="font-semibold text-gray-900">
                        {seller.metrics.rating}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewDetails(seller)}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-1" />
                View Details
              </Button>

              {showActions && seller.status === "pending" && (
                <>
                  {hasCompleteRequirements(seller) ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        selectSeller(seller);
                        setShowApproveDialog(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled
                      className="bg-gray-300 cursor-not-allowed"
                      title="Seller has incomplete requirements"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Incomplete
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      selectSeller(seller);
                      initializePartialReject(seller);
                      setShowPartialRejectDialog(true);
                    }}
                    className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Partial Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      selectSeller(seller);
                      setShowRejectDialog(true);
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}

              {showActions && seller.status === "needs_resubmission" && (
                <>
                  {hasCompleteRequirements(seller) && !hasPendingResubmissionItems(seller) ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        selectSeller(seller);
                        setShowApproveDialog(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled
                      className="bg-gray-300 cursor-not-allowed"
                      title={
                        hasPendingResubmissionItems(seller)
                          ? "Seller still needs to resubmit flagged documents"
                          : "Seller has incomplete requirements"
                      }
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Waiting
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      selectSeller(seller);
                      initializePartialReject(seller);
                      setShowPartialRejectDialog(true);
                    }}
                    className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Partial Reject
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      selectSeller(seller);
                      setShowRejectDialog(true);
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}

              {showActions && seller.status === "approved" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    selectSeller(seller);
                    setShowSuspendDialog(true);
                  }}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  <Ban className="w-4 h-4 mr-1" />
                  Suspend
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ),
  );

  if (isLoading && sellers.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar open={open} setOpen={setOpen} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sellers...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Seller Management
              </h1>
              <p className="text-gray-600">
                Review and manage seller applications and accounts
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadSellers()}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                {pendingSellers.length + needsResubmissionCount} In Review
              </Badge>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search sellers by name, email, or business..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-5 lg:w-auto">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending ({filteredPendingSellers.length})
              </TabsTrigger>
              <TabsTrigger
                value="needs_resubmission"
                className="flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Resubmission ({resubmissionSellers.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Approved ({approvedSellers.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Rejected ({rejectedSellers.length})
              </TabsTrigger>
              <TabsTrigger
                value="suspended"
                className="flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Suspended ({suspendedSellers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No pending applications
                  </h3>
                  <p className="text-gray-600">
                    All seller applications have been reviewed.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No approved sellers
                  </h3>
                  <p className="text-gray-600">
                    No sellers have been approved yet.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="needs_resubmission">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No resubmissions pending
                  </h3>
                  <p className="text-gray-600">
                    Sellers needing document updates will appear here.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {rejectedSellers.map((seller) => (
                    <SellerCard key={seller.id} seller={seller} />
                  ))}
                </AnimatePresence>
              </div>
              {rejectedSellers.length === 0 && (
                <div className="text-center py-12">
                  <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No rejected sellers
                  </h3>
                  <p className="text-gray-600">
                    No seller applications have been rejected.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="suspended">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {suspendedSellers.map((seller) => (
                    <SellerCard key={seller.id} seller={seller} />
                  ))}
                </AnimatePresence>
              </div>
              {suspendedSellers.length === 0 && (
                <div className="text-center py-12">
                  <Ban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No suspended sellers
                  </h3>
                  <p className="text-gray-600">
                    No sellers are currently suspended.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Seller Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Seller Details</DialogTitle>
          </DialogHeader>

          {selectedSeller && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Header with Status */}
              <div className="flex items-start justify-between border-b pb-4">
                <div className="flex items-center">
                  <div className="mr-4">
                    <SellerAvatar
                      logo={selectedSeller.logo}
                      name={selectedSeller.businessName}
                      sizeClass="w-16 h-16"
                      iconClass="w-8 h-8 text-white"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl text-gray-900">
                      {selectedSeller.businessName}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {selectedSeller.storeName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(selectedSeller.status)}
                  <p className="text-xs text-gray-500 mt-1">
                    Joined{" "}
                    {new Date(selectedSeller.joinDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Owner Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-500" />
                  Owner Information
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Owner Name
                    </label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedSeller.ownerName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Email
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedSeller.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Phone Number
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedSeller.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Building className="w-5 h-5 text-orange-500" />
                  Business Information
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Business Type
                      </label>
                      <p className="text-sm text-gray-900 capitalize">
                        {selectedSeller.businessType.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Registration Number
                      </label>
                      <p className="text-sm font-mono text-gray-900">
                        {selectedSeller.businessRegistrationNumber}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Tax ID (TIN)
                      </label>
                      <p className="text-sm font-mono text-gray-900">
                        {selectedSeller.taxIdNumber}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Store Description
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedSeller.storeDescription}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Store Categories
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedSeller.storeCategory.map((category, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-orange-100 text-orange-700 border-orange-200"
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
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  Business Address
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Street Address
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedSeller.businessAddress}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      City
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedSeller.city}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Province
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedSeller.province}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Postal Code
                    </label>
                    <p className="text-sm font-mono text-gray-900">
                      {selectedSeller.postalCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Banking Information */}
              {SHOW_BANKING_INFO && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Banking Information
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Bank Name
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedSeller.bankName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Account Name
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedSeller.accountName}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Account Number
                    </label>
                    <p className="text-sm font-mono text-gray-900">
                      {selectedSeller.accountNumber}
                    </p>
                  </div>
                </div>
              </div>
              )}

              {/* Status Information */}
              {(selectedSeller.status === "rejected" ||
                selectedSeller.status === "needs_resubmission" ||
                selectedSeller.status === "suspended") && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      {selectedSeller.status === "rejected"
                        ? "Rejection"
                        : selectedSeller.status === "needs_resubmission"
                          ? "Resubmission"
                        : "Suspension"}{" "}
                      Details
                    </h4>
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <p className="text-sm font-medium text-red-900 mb-1">
                        Reason:
                      </p>
                      <p className="text-sm text-red-800">
                        {selectedSeller.status === "rejected" ||
                          selectedSeller.status === "needs_resubmission"
                          ? selectedSeller.rejectionReason
                          : selectedSeller.suspensionReason}
                      </p>
                      {(selectedSeller.status === "rejected" ||
                        selectedSeller.status === "needs_resubmission") &&
                        selectedSeller.rejectedAt && (
                          <p className="text-xs text-red-600 mt-2">
                            Reviewed on{" "}
                            {new Date(
                              selectedSeller.rejectedAt,
                            ).toLocaleDateString()}{" "}
                            by {selectedSeller.rejectedBy}
                          </p>
                        )}
                      {selectedSeller.status === "suspended" &&
                        selectedSeller.suspendedAt && (
                          <p className="text-xs text-red-600 mt-2">
                            Suspended on{" "}
                            {new Date(
                              selectedSeller.suspendedAt,
                            ).toLocaleDateString()}{" "}
                            by {selectedSeller.suspendedBy}
                          </p>
                        )}
                    </div>
                  </div>
                )}

              {/* Documents */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Submitted Documents
                </h4>
                <div className="space-y-2">
                  {selectedSeller.documents.map((doc) => (
                    <div key={doc.id} className="space-y-1">
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          doc.isRejected
                            ? "bg-red-50 border border-red-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {doc.fileName}
                            </p>
                            <p className="text-sm text-gray-600">
                              {doc.type.replace("_", " ").toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.isRejected ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                              Needs Update
                            </Badge>
                          ) : doc.wasResubmitted ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              Resubmitted
                            </Badge>
                          ) : (
                            <Badge
                              variant={doc.isVerified ? "default" : "secondary"}
                            >
                              {doc.isVerified ? "Verified" : "Pending"}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreviewDocument(doc.url)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDownloadDocument(
                                doc.url,
                                `${doc.fileName || doc.type}.pdf`,
                              )
                            }
                          >
                            <Download className="w-4 h-4" />
                          </Button>
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
                  <h4 className="font-medium text-gray-900 mb-3">
                    Performance Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600">
                            Total Products
                          </p>
                          <p className="text-2xl font-bold text-blue-900">
                            {selectedSeller.metrics.totalProducts}
                          </p>
                        </div>
                        <Package className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600">Total Orders</p>
                          <p className="text-2xl font-bold text-green-900">
                            {selectedSeller.metrics.totalOrders}
                          </p>
                        </div>
                        <ShoppingBag className="w-8 h-8 text-green-500" />
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-600">
                            Total Revenue
                          </p>
                          <p className="text-2xl font-bold text-purple-900">
                            ₱
                            {selectedSeller.metrics.totalRevenue.toLocaleString()}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-purple-500" />
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-yellow-600">Rating</p>
                          <p className="text-2xl font-bold text-yellow-900">
                            {selectedSeller.metrics.rating}/5
                          </p>
                        </div>
                        <Star className="w-8 h-8 text-yellow-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
            >
              Close
            </Button>
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
                  className="border rounded-lg p-4 bg-gray-50/70 space-y-3"
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
                      size="sm"
                      onClick={() => handlePreviewDocument(document.url)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
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
              className="bg-amber-600 hover:bg-amber-700 text-white"
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
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Seller</DialogTitle>
            <DialogDescription>
              Please provide a reason for suspending "
              {selectedSeller?.businessName}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter suspension reason..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuspendDialog(false);
                setSuspendReason("");
              }}
            >
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
                "Suspend Seller"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSellers;
