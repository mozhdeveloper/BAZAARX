import React, { useState, useEffect } from 'react';
import { handleImageError } from '@/utils/imageUtils';
import { Navigate } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  FileCheck,
  BadgeCheck,
  XCircle,
  RefreshCw,
  Search,
  Eye,
  Calendar,
  Tag,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Shield,
  Store,
  X,
} from 'lucide-react';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import { qaTeamService, type QAAssessmentItem, type QADashboardStats } from '../services/qaTeamService';
import { useProductQAStore } from '../stores/productQAStore';

type QATab = 'all' | 'listings' | 'digital' | 'verified' | 'revision';

const QADashboard = () => {
  const { isAuthenticated, user } = useAdminAuth();
  const { toast } = useToast();
  const isQARole = user?.role === 'qa_team';

  const [assessments, setAssessments] = useState<QAAssessmentItem[]>([]);
  const [stats, setStats] = useState<QADashboardStats>({
    pendingAdminReview: 0,
    pendingDigitalReview: 0,
    verified: 0,
    forRevision: 0,
    rejected: 0,
    assignedToMe: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<QATab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<QAAssessmentItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Store for admin listing accept/reject
  const { acceptListing, rejectListing } = useProductQAStore();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allAssessments, dashStats] = await Promise.all([
        qaTeamService.getAssessments(),
        qaTeamService.getDashboardStats(),
      ]);
      setAssessments(allAssessments);
      setStats(dashStats);
    } catch (error) {
      console.error('Error loading QA data:', error);
      toast({ title: 'Error', description: 'Failed to load QA data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Must be above any early return so hook order is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, []);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Filter assessments by tab
  const getFilteredAssessments = () => {
    let filtered = assessments;

    // For QA team, we filter out items that haven't reached QA yet (pending admin review)
    // For Admins, we show everything
    let assessmentsForTab = isQARole
      ? assessments.filter(a => a.status !== 'pending_admin_review')
      : assessments;

    if (activeTab === 'all') {
      filtered = assessmentsForTab;
    } else if (activeTab === 'listings' && !isQARole) {
      filtered = assessments.filter(a => a.status === 'pending_admin_review');
    } else if (activeTab === 'digital') {
      filtered = assessmentsForTab.filter(a => a.status === 'pending_digital_review');
    } else if (activeTab === 'verified') {
      filtered = assessmentsForTab.filter(a => a.status === 'verified');
    } else if (activeTab === 'revision') {
      // items requiring revision or rejected
      filtered = assessmentsForTab.filter(a => ['rejected', 'for_revision'].includes(a.status));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.product?.name?.toLowerCase().includes(query) ||
        a.product?.seller?.store_name?.toLowerCase().includes(query) ||
        a.product_id.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  // ---- Actions ----
  const handleAcceptListing = async (assessment: QAAssessmentItem) => {
    try {
      await acceptListing(assessment.product_id);
      toast({ title: 'Listing Accepted', description: `${assessment.product?.name} sent to QA for review.` });
      await loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to accept listing', variant: 'destructive' });
    }
  };

  const handleRejectListing = async () => {
    if (!selectedProduct || !rejectionReason.trim()) return;
    try {
      await rejectListing(selectedProduct.product_id, rejectionReason);
      toast({ title: 'Listing Rejected', description: 'Seller has been notified.' });
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedProduct(null);
      await loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to reject listing', variant: 'destructive' });
    }
  };

  const handlePassDigitalReview = async (assessment: QAAssessmentItem) => {
    try {
      await qaTeamService.passDigitalReview(assessment.product_id, 'qa-user');
      toast({ title: 'Success', description: 'Product approved and verified! Now visible to buyers.' });
      await loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to approve product', variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!selectedProduct || !rejectionReason.trim()) return;
    // If on listings tab, use listing reject; otherwise QA reject
    if (activeTab === 'listings') {
      return handleRejectListing();
    }
    try {
      await qaTeamService.rejectProduct(selectedProduct.product_id, 'qa-user', rejectionReason, 'digital');
      toast({ title: 'Product Rejected', description: 'Seller has been notified.' });
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedProduct(null);
      await loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to reject product', variant: 'destructive' });
    }
  };

  const handleRequestRevision = async () => {
    if (!selectedProduct || !revisionReason.trim()) return;
    try {
      await qaTeamService.requestRevision(selectedProduct.product_id, 'qa-user', revisionReason, 'digital');
      toast({ title: 'Revision Requested', description: 'Seller has been notified.' });
      setShowRevisionModal(false);
      setRevisionReason('');
      setSelectedProduct(null);
      await loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to request revision', variant: 'destructive' });
    }
  };

  const filteredAssessments = getFilteredAssessments();

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: string; icon: any }> = {
      pending_admin_review: { label: 'Pending Listing', variant: 'bg-white/90 text-gray-800 border-gray-200', icon: Clock },
      pending_digital_review: { label: 'QA Review', variant: 'bg-blue-50/95 text-blue-800 border-blue-200', icon: FileCheck },
      verified: { label: 'Verified', variant: 'bg-green-50/95 text-green-800 border-green-200', icon: BadgeCheck },
      for_revision: { label: 'Revision', variant: 'bg-orange-50/95 text-orange-800 border-orange-200', icon: RefreshCw },
      rejected: { label: 'Rejected', variant: 'bg-red-50/95 text-red-800 border-red-200', icon: XCircle },
    };
    const info = map[status] || { label: status, variant: 'bg-white/90 text-gray-800 border-gray-200', icon: Clock };
    const Icon = info.icon as any;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm shadow-sm ${info.variant}`}>
        <Icon className="w-3.5 h-3.5" />
        {info.label}
      </span>
    );
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-200">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                QA & Product Approvals
              </h1>
              <p className="text-gray-500 mt-2">
                Review and ensure the quality of products before they go live.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-3">
              <Button onClick={loadData} disabled={isLoading} variant="outline" className="shadow-sm text-[var(--text-muted)] rounded-xl bg-base hover:bg-base hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)]">
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Modern SaaS Stat Cards */}
          <div className={`grid gap-4 grid-cols-1 md:grid-cols-5 mb-8`}>
            {[
              ...(!isQARole ? [{ label: 'Pending Listings', count: stats.pendingAdminReview, icon: Clock, color: 'text-gray-600 bg-gray-100/50' }] : []),
              { label: 'QA Review', count: stats.pendingDigitalReview, icon: FileCheck, color: 'text-blue-600 bg-blue-50' },
              { label: 'Verified', count: stats.verified, icon: BadgeCheck, color: 'text-green-600 bg-green-50' },
              { label: 'Revision required', count: stats.forRevision, icon: RefreshCw, color: 'text-orange-600 bg-orange-50' },
              { label: 'Rejected', count: stats.rejected, icon: XCircle, color: 'text-red-600 bg-red-50' },
            ].map((stat) => (
              <Card key={stat.label} className="border-none shadow-md hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300 rounded-xl bg-white overflow-hidden group relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[var(--brand-accent-light)]/30 to-[var(--brand-primary)]/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-[var(--brand-accent-light)] transition-colors"></div>
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-500 group-hover:text-[var(--brand-primary)] transition-colors leading-tight">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-black text-gray-900 tracking-tight transition-all group-hover:text-[var(--brand-primary)] shrink-0">
                      {stat.count}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Content Section & Tabs */}
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center mb-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as QATab)} className="w-full lg:w-auto">
              <TabsList className="bg-white/80 border border-gray-100 p-1 h-9 rounded-full shadow-sm">
                {[
                  { id: 'all', label: 'All Products', count: (isQARole ? assessments.filter(a => a.status !== 'pending_admin_review') : assessments).length },
                  ...(!isQARole ? [{ id: 'listings', label: 'Pending', count: stats.pendingAdminReview }] : []),
                  { id: 'digital', label: 'QA Queue', count: stats.pendingDigitalReview },
                  { id: 'verified', label: 'Verified', count: stats.verified },
                  { id: 'revision', label: 'Revision', count: stats.forRevision + stats.rejected },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white rounded-full px-3.5 text-xs transition-all duration-300 text-gray-500 hover:text-[var(--brand-primary)] data-[state=active]:shadow-md h-7"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Search */}
            <div className="relative w-full lg:w-[350px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <Input
                placeholder="Search products, sellers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-10 bg-white rounded-xl border-gray-200 focus:ring-0 focus:border-[var(--brand-accent)] placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-20 text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-primary" />
              <p className="font-medium text-gray-600">Loading QA queue...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredAssessments.length === 0 && (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-900 mb-1">No products found</p>
              <p className="text-gray-500 max-w-sm mx-auto">There are currently no products in this queue. You're all caught up!</p>
            </div>
          )}

          {/* Product Grid */}
          {!isLoading && filteredAssessments.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredAssessments.map((assessment) => {
                const product = assessment.product;
                const primaryImage = product?.images?.find((i: { is_primary: boolean; image_url: string }) => i.is_primary)?.image_url
                  || product?.images?.[0]?.image_url
                  || 'https://placehold.co/400x300?text=Product+Image';

                return (
                  <Card key={assessment.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300 border-gray-200/60 bg-white group relative">
                    {/* Image */}
                    <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img loading="lazy" 
                        src={primaryImage}
                        alt={product?.name || 'Product'}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={handleImageError}
                      />
                    </div>
                    {/* Status badge top-right */}
                    <div className="absolute top-3 right-3 z-10">
                      {getStatusBadge(assessment.status)}
                    </div>
                    {/* Info */}
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 line-clamp-1 mb-1 text-lg">{product?.name || 'Unknown Product'}</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl font-bold text-[var(--brand-primary)]">
                          ₱{product?.price?.toLocaleString() || '0'}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                          <Calendar className="w-3 h-3" />
                          {new Date(assessment.submitted_at || assessment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {product?.seller?.store_name && (
                        <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] mb-4">
                          <Store className="w-4 h-4 opacity-60" />
                          <span className="truncate">{product.seller.store_name}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-auto pt-2 space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-[var(--btn-border)] hover:border-gray-300 text-[var(--text-muted)] hover:text-gray-600 hover:bg-gray-50"
                          onClick={() => { setSelectedProduct(assessment); setShowDetailModal(true); setCurrentImageIndex(0); }}
                        >
                          <Eye className="w-4 h-4 mr-1.5" /> View Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Detail Modal */}
          <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
            <DialogContent className="max-h-[95vh] p-0 flex flex-col overflow-hidden border-none shadow-2xl sm:max-w-[700px]">
              {/* Sticky Header */}
              <div className="sticky top-0 z-40 px-6 py-4 bg-white/95 backdrop-blur-md flex items-start justify-between border-b border-gray-50">
                <div className="flex flex-col gap-1">
                  <DialogTitle className="text-xl text-[var(--text-headline)]">{selectedProduct?.product?.name || 'Product Details'}</DialogTitle>
                  <DialogDescription className="text-[var(--text-muted)]">Review product information, variants, and timeline history.</DialogDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-base flex-shrink-0" onClick={() => setShowDetailModal(false)}>
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-700" />
                </Button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto scrollbar-hide px-8">
                {selectedProduct && (
                  <div className="space-y-4 pt-4 pb-8">
                    {/* Image + Info side by side */}
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Image */}
                      <div className="w-full md:w-1/2 relative">
                        <div className="absolute top-4 left-4 z-20">{getStatusBadge(selectedProduct.status)}</div>
                        {selectedProduct.product?.images && (
                          <div className="relative rounded-2xl border border-gray-100 bg-gray-50/50 p-2 shadow-sm overflow-hidden">
                            <div className="h-64 sm:h-80 bg-white rounded-xl overflow-hidden flex items-center justify-center">
                              <img loading="lazy" 
                                src={selectedProduct.product.images[currentImageIndex]?.image_url || 'https://placehold.co/400'}
                                alt="Product"
                                className="h-full w-full object-contain"
                                onError={handleImageError}
                              />
                            </div>
                            {selectedProduct.product.images.length > 1 && (
                              <div className="flex justify-between items-center mt-3 px-2">
                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-[var(--btn-border)] text-[var(--text-muted)] hover:bg-base hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)] transition-all" onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))} disabled={currentImageIndex === 0}>
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm font-medium text-gray-500">{currentImageIndex + 1} / {selectedProduct.product.images.length}</span>
                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-[var(--btn-border)] text-[var(--text-muted)] hover:bg-base hover:text-[var(--brand-accent)] hover:border-[var(--brand-accent)] transition-all" onClick={() => setCurrentImageIndex(Math.min(selectedProduct.product!.images!.length - 1, currentImageIndex + 1))} disabled={currentImageIndex === selectedProduct.product.images.length - 1}>
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="w-full md:w-1/2 flex flex-col justify-center space-y-4 py-2">
                        {[
                          { label: 'Seller', value: selectedProduct.product?.seller?.store_name },
                          { label: 'Category', value: selectedProduct.product?.category?.name },
                          { label: 'Price', value: `₱${selectedProduct.product?.price?.toLocaleString()}`, isPrice: true }
                        ].map(item => (
                          <div key={item.label} className="space-y-0.5">
                            <Label className="text-[var(--text-headline)] font-bold text-lg">{item.label}</Label>
                            <p className={item.isPrice ? "text-2xl font-bold text-[var(--brand-primary)]" : "text-[var(--text-secondary)]"}>{item.value || 'N/A'}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <hr className="my-2 border-gray-100" />

                    {/* Description */}
                    {selectedProduct.product?.description && (
                      <div>
                        <Label className="text-lg font-semibold text-gray-900 mb-3 block">Description</Label>
                        <p className="text-sm text-gray-600 leading-relaxed">{selectedProduct.product.description}</p>
                      </div>
                    )}

                    {/* Variants */}
                    {selectedProduct.product?.variants && selectedProduct.product.variants.length > 0 && (
                      <>
                        <hr className="my-2 border-gray-100" />
                        <div>
                          <Label className="text-lg font-semibold text-gray-900 mb-3 block">Variants</Label>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {selectedProduct.product.variants.map((v: { id: string; variant_name: string; price: number; stock: number }) => (
                              <div key={v.id} className="flex flex-col text-sm bg-white border border-gray-100 shadow-sm rounded-lg p-3">
                                <span className="font-medium text-gray-900 mb-1">{v.variant_name}</span>
                                <span className="text-gray-500 flex justify-between">
                                  <span className="text-[var(--brand-primary)] font-medium">₱{v.price?.toLocaleString()}</span>
                                  <span>Stock: {v.stock}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <hr className="my-2 border-gray-100" />

                    {/* Timeline */}
                    <div>
                      <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
                        <div className="relative flex items-center justify-between md:flex-row-reverse group is-active mb-4">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-primary shadow shrink-0 md:order-1 text-white/0"></div>
                          <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-semibold text-sm text-gray-900">Submitted</div>
                              <div className="text-xs text-gray-500">{new Date(selectedProduct.submitted_at || selectedProduct.created_at).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="hidden md:block w-[calc(50%-1.5rem)] md:order-2">
                            <Label className="text-lg font-semibold text-gray-900 mb-0">Timeline</Label>
                          </div>
                        </div>

                        {selectedProduct.admin_accepted_at && (
                          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-white/0"></div>
                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-semibold text-sm text-gray-900">Admin Accepted</div>
                                <div className="text-xs text-gray-500">{new Date(selectedProduct.admin_accepted_at).toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedProduct.revision_requested_at && (
                          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-[var(--brand-primary)] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-white/0"></div>
                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-[var(--brand-primary)]">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-semibold text-sm text-gray-900">Revision Requested</div>
                                <div className="text-xs text-gray-500">{new Date(selectedProduct.revision_requested_at).toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedProduct.verified_at && (
                          <div className="relative flex items-center justify-between md:justify-normal md:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-green-500 shadow shrink-0 md:order-1 md:-translate-x-1/2 text-white/0"></div>
                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-semibold text-sm text-gray-900">QA Verified</div>
                                <div className="text-xs text-gray-500">{new Date(selectedProduct.verified_at).toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 z-30 px-6 py-4 bg-gray-50/95 backdrop-blur-md border-t border-gray-100 flex items-center justify-end gap-3 flex-wrap">
                {!isQARole && selectedProduct?.status === 'pending_digital_review' && (
                  <div className="mr-auto text-xs text-blue-500 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100 italic hidden sm:block">
                    Product is currently under QA review
                  </div>
                )}
                {selectedProduct?.status !== 'pending_admin_review' && selectedProduct?.status !== 'pending_digital_review' && (
                  <div className="mr-auto text-xs text-gray-400 hidden sm:block">
                    No actions available for this status
                  </div>
                )}

                {selectedProduct?.status === 'pending_admin_review' && (
                  <>
                    <Button
                      variant="outline"
                      className="text-[var(--text-muted)] border-[var(--btn-border)] hover:text-red-500 hover:border-red-500 hover:bg-base"
                      onClick={() => setShowRejectModal(true)}
                    >
                      Reject
                    </Button>
                    <Button
                      className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white"
                      onClick={() => {
                        handleAcceptListing(selectedProduct);
                        setShowDetailModal(false);
                      }}
                    >
                      Accept Product
                    </Button>
                  </>
                )}

                {selectedProduct?.status === 'pending_digital_review' && (
                  <>
                    {isQARole && (
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setShowRejectModal(true)}
                      >
                        <XCircle className="w-4 h-4 mr-1.5" /> Reject Product
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)]"
                      onClick={() => setShowRevisionModal(true)}
                    >
                      <RefreshCw className="w-4 h-4 mr-1.5" /> Revise
                    </Button>
                    {isQARole && (
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          handlePassDigitalReview(selectedProduct);
                          setShowDetailModal(false);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                      </Button>
                    )}
                  </>
                )}

              </div>
            </DialogContent>
          </Dialog>

          {/* Reject Modal */}
          <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
            <DialogContent className="sm:max-w-[500px] border-none shadow-2xl">
              <DialogHeader className="mb-2">
                <DialogTitle className="flex items-center gap-2 text-red-600 text-xl">
                  <XCircle className="w-6 h-6" />
                  Reject Product
                </DialogTitle>
                <DialogDescription className="text-[var(--text-muted)] mt-2">
                  Provide a reason for rejecting <span className="font-bold text-[var(--text-muted)]">"{selectedProduct?.product?.name}"</span>
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <Label className="text-gray-700 font-medium mb-2 block">Rejection Reason <span className="text-red-500">*</span></Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Describe why this product is being rejected... (This will be sent to the seller)"
                  className="mt-2 text-sm max-w-full focus-visible:ring-red-500 resize-none"
                  rows={5}
                />
              </div>
              <DialogFooter className="mt-4 gap-2 sm:gap-0">
                <Button variant="outline" className="text-[var(--text-muted)] border-[var(--btn-border)] hover:bg-base hover:text-gray-700 hover:border-gray-300" onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleReject}
                  disabled={!rejectionReason.trim()}
                >
                  Reject Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Revision Modal */}
          <Dialog open={showRevisionModal} onOpenChange={setShowRevisionModal}>
            <DialogContent className="sm:max-w-[500px] border-none shadow-2xl">
              <DialogHeader className="mb-2">
                <DialogTitle className="flex items-center gap-2 text-[var(--brand-primary)] text-xl">
                  <RefreshCw className="w-6 h-6" />
                  Request Revision
                </DialogTitle>
                <DialogDescription className="text-[var(--text-muted)] mt-2">
                  Tell the seller what needs to be revised for <span className="font-bold text-[var(--text-muted)]">"{selectedProduct?.product?.name}"</span>
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <Label className="text-gray-700 font-medium mb-2 block">Revision Notes <span className="text-red-500">*</span></Label>
                <Textarea
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="Describe what needs to be changed or improved... (e.g. clearer images, update description)"
                  className="mt-2 text-sm max-w-full focus-visible:ring-orange-500 resize-none"
                  rows={5}
                />
              </div>
              <DialogFooter className="mt-4 gap-2 sm:gap-0">
                <Button variant="outline" className="text-[var(--text-muted)] border-[var(--btn-border)] hover:bg-base hover:text-gray-700 hover:border-gray-300" onClick={() => { setShowRevisionModal(false); setRevisionReason(''); }}>
                  Cancel
                </Button>
                <Button
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white"
                  onClick={handleRequestRevision}
                  disabled={!revisionReason.trim()}
                >
                  Send Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main >
    </div >
  );
};

export default QADashboard;
