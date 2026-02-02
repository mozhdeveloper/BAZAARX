import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Package, 
  CheckCircle, 
  Clock,
  FileCheck,
  BadgeCheck,
  XCircle,
  RefreshCw,
  User,
  Search,
} from 'lucide-react';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useProductQAStore } from '../stores/productQAStore';
import { useToast } from '../hooks/use-toast';

const AdminProductApprovals = () => {
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();
  const { 
    products, 
    approveForSampleSubmission, 
    passQualityCheck, 
    rejectProduct, 
    requestRevision, 
    resetToInitialState,
    loadProducts,
    isLoading
  } = useProductQAStore();
  const [open, setOpen] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [rejectingProductId, setRejectingProductId] = useState<string | null>(null);
  const [revisionProductId, setRevisionProductId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [selectedRejectTemplate, setSelectedRejectTemplate] = useState('');
  const [selectedRevisionTemplate, setSelectedRevisionTemplate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'digital' | 'waiting' | 'qa' | 'revision' | 'verified' | 'rejected'>('all');

  // Load all QA products on mount (admin sees all)
  useEffect(() => {
    loadProducts(); // No seller ID = load all
  }, [loadProducts]);

  // Predefined rejection/revision templates
  const rejectionTemplates = [
    'Wrong product name - Please use accurate naming',
    'Incorrect category - Product is in wrong category',
    'Incorrect pricing - Price does not match market standards',
    'Poor quality images - Please provide clear, high-resolution images',
    'Incomplete description - Missing key product details',
    'Brand/Copyright violation - Unauthorized use of brand name',
    'Prohibited item - Product not allowed on platform',
    'Misleading information - Product details are inaccurate',
  ];

  const revisionTemplates = [
    'Minor image quality improvement needed',
    'Please update product description with more details',
    'Category needs adjustment for better visibility',
    'Price seems high - please review market pricing',
    'Please add more product specifications',
    'Product name could be more descriptive',
  ];

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const digitalReviewProducts = products.filter((p) => p.status === 'PENDING_DIGITAL_REVIEW');
  const qaQueueProducts = products.filter((p) => p.status === 'IN_QUALITY_REVIEW');
  const revisionProducts = products.filter((p) => p.status === 'FOR_REVISION');
  const rejectedProducts = products.filter((p) => p.status === 'REJECTED');

  // Filter products based on search and status filter
  const getFilteredProducts = () => {
    let filtered = products;

    // Apply status filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'digital':
          filtered = filtered.filter(p => p.status === 'PENDING_DIGITAL_REVIEW');
          break;
        case 'waiting':
          filtered = filtered.filter(p => p.status === 'WAITING_FOR_SAMPLE');
          break;
        case 'qa':
          filtered = filtered.filter(p => p.status === 'IN_QUALITY_REVIEW');
          break;
        case 'revision':
          filtered = filtered.filter(p => p.status === 'FOR_REVISION');
          break;
        case 'verified':
          filtered = filtered.filter(p => p.status === 'ACTIVE_VERIFIED');
          break;
        case 'rejected':
          filtered = filtered.filter(p => p.status === 'REJECTED');
          break;
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vendor.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  const handleApproveDigital = async (productId: string) => {
    try {
      await approveForSampleSubmission(productId);
      const product = products.find((p) => p.id === productId);
      toast({
        title: 'Digital Approval Complete',
        description: `${product?.name} has been approved. Seller can now submit sample.`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error approving product:', error);
      toast({
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'Failed to approve product. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePassQA = async (productId: string) => {
    try {
      await passQualityCheck(productId);
      const product = products.find((p) => p.id === productId);
      toast({
        title: 'QA Passed',
        description: `${product?.name} has passed quality assurance and is now live!`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error passing QA:', error);
      toast({
        title: 'QA Failed',
        description: error instanceof Error ? error.message : 'Failed to pass QA. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!rejectingProductId || !rejectReason.trim()) return;

    try {
      const product = products.find((p) => p.id === rejectingProductId);
      const stage = product?.status === 'PENDING_DIGITAL_REVIEW' ? 'digital' : 'physical';
      
      await rejectProduct(rejectingProductId, rejectReason, stage);
      toast({
        title: 'Product Rejected',
        description: `${product?.name} has been rejected.`,
        variant: 'destructive',
      });
      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedRejectTemplate('');
      setRejectingProductId(null);
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast({
        title: 'Rejection Failed',
        description: error instanceof Error ? error.message : 'Failed to reject product. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRevision = async () => {
    if (!revisionProductId || !revisionReason.trim()) return;

    try {
      const product = products.find((p) => p.id === revisionProductId);
      const stage = product?.status === 'PENDING_DIGITAL_REVIEW' ? 'digital' : 'physical';
      
      await requestRevision(revisionProductId, revisionReason, stage);
      toast({
        title: 'Revision Requested',
        description: `${product?.name} has been sent back for revision.`,
      });
      setShowRevisionDialog(false);
      setRevisionReason('');
      setSelectedRevisionTemplate('');
      setRevisionProductId(null);
    } catch (error) {
      console.error('Error requesting revision:', error);
      toast({
        title: 'Revision Request Failed',
        description: error instanceof Error ? error.message : 'Failed to request revision. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />
      
      <div className="flex-1 overflow-auto">
        {/* Minimalist Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 rounded-xl">
                <ClipboardCheck className="w-6 h-6 text-[#FF5722]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Product Approvals</h1>
                <p className="text-sm text-gray-500">Quality assurance workflow</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Stat-Filter Cards (Consolidated Navigation) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {/* Digital Review */}
            <Card 
              onClick={() => setFilterStatus(filterStatus === 'digital' ? 'all' : 'digital')}
              className={`cursor-pointer transition-all hover:shadow-md ${
                filterStatus === 'digital' 
                  ? 'border-[#FF5722] border-2 bg-orange-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className={`w-5 h-5 ${filterStatus === 'digital' ? 'text-[#FF5722]' : 'text-gray-400'}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{digitalReviewProducts.length}</p>
                <p className="text-xs font-medium text-gray-600 mt-1">Digital Review</p>
              </div>
            </Card>

            {/* Awaiting Sample */}
            <Card 
              onClick={() => setFilterStatus(filterStatus === 'waiting' ? 'all' : 'waiting')}
              className={`cursor-pointer transition-all hover:shadow-md ${
                filterStatus === 'waiting' 
                  ? 'border-[#FF5722] border-2 bg-orange-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Package className={`w-5 h-5 ${filterStatus === 'waiting' ? 'text-[#FF5722]' : 'text-gray-400'}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {products.filter(p => p.status === 'WAITING_FOR_SAMPLE').length}
                </p>
                <p className="text-xs font-medium text-gray-600 mt-1">Awaiting Sample</p>
              </div>
            </Card>

            {/* QA Queue */}
            <Card 
              onClick={() => setFilterStatus(filterStatus === 'qa' ? 'all' : 'qa')}
              className={`cursor-pointer transition-all hover:shadow-md ${
                filterStatus === 'qa' 
                  ? 'border-[#FF5722] border-2 bg-orange-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <FileCheck className={`w-5 h-5 ${filterStatus === 'qa' ? 'text-[#FF5722]' : 'text-gray-400'}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{qaQueueProducts.length}</p>
                <p className="text-xs font-medium text-gray-600 mt-1">QA Queue</p>
              </div>
            </Card>

            {/* For Revision */}
            <Card 
              onClick={() => setFilterStatus(filterStatus === 'revision' ? 'all' : 'revision')}
              className={`cursor-pointer transition-all hover:shadow-md ${
                filterStatus === 'revision' 
                  ? 'border-[#FF5722] border-2 bg-orange-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <RefreshCw className={`w-5 h-5 ${filterStatus === 'revision' ? 'text-[#FF5722]' : 'text-gray-400'}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{revisionProducts.length}</p>
                <p className="text-xs font-medium text-gray-600 mt-1">For Revision</p>
              </div>
            </Card>

            {/* Verified */}
            <Card 
              onClick={() => setFilterStatus(filterStatus === 'verified' ? 'all' : 'verified')}
              className={`cursor-pointer transition-all hover:shadow-md ${
                filterStatus === 'verified' 
                  ? 'border-[#FF5722] border-2 bg-orange-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <BadgeCheck className={`w-5 h-5 ${filterStatus === 'verified' ? 'text-[#FF5722]' : 'text-gray-400'}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {products.filter(p => p.status === 'ACTIVE_VERIFIED').length}
                </p>
                <p className="text-xs font-medium text-gray-600 mt-1">Verified</p>
              </div>
            </Card>

            {/* Rejected */}
            <Card 
              onClick={() => setFilterStatus(filterStatus === 'rejected' ? 'all' : 'rejected')}
              className={`cursor-pointer transition-all hover:shadow-md ${
                filterStatus === 'rejected' 
                  ? 'border-[#FF5722] border-2 bg-orange-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className={`w-5 h-5 ${filterStatus === 'rejected' ? 'text-[#FF5722]' : 'text-gray-400'}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{rejectedProducts.length}</p>
                <p className="text-xs font-medium text-gray-600 mt-1">Rejected</p>
              </div>
            </Card>
          </div>

          {/* Search & Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetToInitialState();
                toast({
                  title: 'Reset Complete',
                  description: 'All products reset to initial state.',
                });
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Test Data
            </Button>
          </div>

          {/* Products List */}
          <Card>
            <div className="divide-y">
              {isLoading ? (
                <div className="py-16 text-center">
                  <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-spin" />
                  <p className="text-gray-500 font-medium">Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No products found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {filterStatus !== 'all' ? 'Click the filter again to show all products' : 'Try adjusting your search'}
                  </p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div key={product.id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-5">
                      {/* Product Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{product.category}</Badge>
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {product.vendor}
                          </span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex-shrink-0">
                        <p className="text-xl font-bold text-[#FF5722]">₱{product.price.toLocaleString()}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {product.status === 'PENDING_DIGITAL_REVIEW' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveDigital(product.id)}
                              className="bg-[#FF5722] hover:bg-[#E64A19] text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRevisionProductId(product.id);
                                setShowRevisionDialog(true);
                              }}
                            >
                              Revise
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRejectingProductId(product.id);
                                setShowRejectDialog(true);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {product.status === 'IN_QUALITY_REVIEW' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handlePassQA(product.id)}
                              className="bg-[#FF5722] hover:bg-[#E64A19] text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Pass QA
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRevisionProductId(product.id);
                                setShowRevisionDialog(true);
                              }}
                            >
                              Revise
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRejectingProductId(product.id);
                                setShowRejectDialog(true);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {product.status === 'WAITING_FOR_SAMPLE' && (
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            Awaiting Sample
                          </Badge>
                        )}
                        {product.status === 'FOR_REVISION' && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Needs Revision
                          </Badge>
                        )}
                        {product.status === 'ACTIVE_VERIFIED' && (
                          <Badge className="bg-green-100 text-green-700 border-0">
                            <BadgeCheck className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {product.status === 'REJECTED' && (
                          <Badge className="bg-red-100 text-red-700 border-0">
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Reject Product</DialogTitle>
            <DialogDescription className="text-gray-600">
              Please select a reason or provide custom feedback for rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Predefined Templates */}
            <div>
              <Label htmlFor="reject-template" className="text-sm font-medium text-gray-900 mb-2 block">
                Quick Select Reason
              </Label>
              <Select
                value={selectedRejectTemplate}
                onValueChange={(value) => {
                  setSelectedRejectTemplate(value);
                  if (value !== 'custom') {
                    setRejectReason(value);
                  } else {
                    setRejectReason('');
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {rejectionTemplates.map((template, idx) => (
                    <SelectItem key={idx} value={template}>
                      {template}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom reason...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Reason */}
            <div>
              <Label htmlFor="reject-reason" className="text-sm font-medium text-gray-900 mb-2 block">
                Rejection Reason {selectedRejectTemplate === 'custom' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="reject-reason"
                placeholder={selectedRejectTemplate !== 'custom' ? 'Reason auto-filled from template...' : 'Enter your custom rejection reason...'}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[120px] resize-none"
                disabled={selectedRejectTemplate !== '' && selectedRejectTemplate !== 'custom'}
              />
              <p className="text-xs text-gray-500 mt-1">
                {selectedRejectTemplate === 'custom' 
                  ? 'Provide detailed feedback to help the seller improve.' 
                  : 'Select "Custom reason..." to edit this field.'}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
                setSelectedRejectTemplate('');
                setRejectingProductId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
              disabled={!rejectReason.trim()}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Dialog */}
      <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Request Revision</DialogTitle>
            <DialogDescription className="text-gray-600">
              Select suggested improvements or provide custom feedback for the seller.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Predefined Templates */}
            <div>
              <Label htmlFor="revision-template" className="text-sm font-medium text-gray-900 mb-2 block">
                Quick Select Feedback
              </Label>
              <Select
                value={selectedRevisionTemplate}
                onValueChange={(value) => {
                  setSelectedRevisionTemplate(value);
                  if (value !== 'custom') {
                    setRevisionReason(value);
                  } else {
                    setRevisionReason('');
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select feedback..." />
                </SelectTrigger>
                <SelectContent>
                  {revisionTemplates.map((template, idx) => (
                    <SelectItem key={idx} value={template}>
                      {template}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom feedback...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Reason */}
            <div>
              <Label htmlFor="revision-reason" className="text-sm font-medium text-gray-900 mb-2 block">
                Revision Feedback {selectedRevisionTemplate === 'custom' && <span className="text-orange-500">*</span>}
              </Label>
              <Textarea
                id="revision-reason"
                placeholder={selectedRevisionTemplate !== 'custom' ? 'Feedback auto-filled from template...' : 'Enter your custom revision feedback...'}
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="min-h-[120px] resize-none"
                disabled={selectedRevisionTemplate !== '' && selectedRevisionTemplate !== 'custom'}
              />
              <p className="text-xs text-gray-500 mt-1">
                {selectedRevisionTemplate === 'custom'
                  ? 'Provide specific guidance on what needs improvement.'
                  : 'Select "Custom feedback..." to edit this field.'}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRevisionDialog(false);
                setRevisionReason('');
                setSelectedRevisionTemplate('');
                setRevisionProductId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevision}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              disabled={!revisionReason.trim()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Request Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProductApprovals;
