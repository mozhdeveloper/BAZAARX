import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigate } from "react-router-dom";
import { useAdminAuth, useAdminSellers } from "../stores/adminStore";
import AdminSidebar from "../components/AdminSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const { isAuthenticated } = useAdminAuth();
  const {
    sellers,
    pendingSellers,
    selectedSeller,
    isLoading,
    loadSellers,
    approveSeller,
    rejectSeller,
    suspendSeller,
    selectSeller,
  } = useAdminSellers();

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      loadSellers();
    }
  }, [isAuthenticated, loadSellers]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const getFilteredSellers = (status?: string) => {
    const sellersToFilter = status
      ? sellers.filter((seller) => seller.status === status)
      : sellers;
    return sellersToFilter.filter(
      (seller) =>
        seller.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  const approvedSellers = getFilteredSellers("approved");
  const rejectedSellers = getFilteredSellers("rejected");
  const suspendedSellers = getFilteredSellers("suspended");
  const filteredPendingSellers = getFilteredSellers("pending");

  const handleViewDetails = (seller: any) => {
    selectSeller(seller);
    setShowDetailsDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedSeller) return;
    await approveSeller(selectedSeller.id);
    setShowApproveDialog(false);
    selectSeller(null);
  };

  const handleReject = async () => {
    if (!selectedSeller || !rejectReason) return;
    await rejectSeller(selectedSeller.id, rejectReason);
    setShowRejectDialog(false);
    setRejectReason("");
    selectSeller(null);
  };

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
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const SellerCard = ({
    seller,
    showActions = false,
  }: {
    seller: any;
    showActions?: boolean;
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
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                {seller.logo ? (
                  <img
                    src={seller.logo}
                    alt={seller.businessName}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                ) : (
                  <Store className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-lg text-gray-900">
                  {seller.businessName}
                </h3>
                <p className="text-gray-600">{seller.ownerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(seller.status)}
              {getStatusBadge(seller.status)}
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

          <div className="flex gap-2">
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
        <div className="p-8">
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
                {pendingSellers.length} Pending Approvals
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
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending ({filteredPendingSellers.length})
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
                <AnimatePresence>
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
                <AnimatePresence>
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

            <TabsContent value="rejected">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence>
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
                <AnimatePresence>
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
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 mr-4">
                    {selectedSeller.logo ? (
                      <img
                        src={selectedSeller.logo}
                        alt={selectedSeller.businessName}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <Store className="w-8 h-8 text-white" />
                    )}
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

              {/* Status Information */}
              {(selectedSeller.status === "rejected" ||
                selectedSeller.status === "suspended") && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    {selectedSeller.status === "rejected"
                      ? "Rejection"
                      : "Suspension"}{" "}
                    Details
                  </h4>
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <p className="text-sm font-medium text-red-900 mb-1">
                      Reason:
                    </p>
                    <p className="text-sm text-red-800">
                      {selectedSeller.status === "rejected"
                        ? selectedSeller.rejectionReason
                        : selectedSeller.suspensionReason}
                    </p>
                    {selectedSeller.status === "rejected" &&
                      selectedSeller.rejectedAt && (
                        <p className="text-xs text-red-600 mt-2">
                          Rejected on{" "}
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
                  {selectedSeller.documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
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
                        <Badge
                          variant={doc.isVerified ? "default" : "secondary"}
                        >
                          {doc.isVerified ? "Verified" : "Pending"}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
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
              Please provide a reason for rejecting "
              {selectedSeller?.businessName}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter rejection reason..."
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
              disabled={!rejectReason.trim() || isLoading}
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
