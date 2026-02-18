import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  XCircle,
  AlertCircle,
  Search,
  BadgeCheck,
  RefreshCw,
  User,
  Store,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProductQAStore } from '@/stores/productQAStore';
import { useAuthStore, useProductStore } from '@/stores/sellerStore';
import { useToast } from '@/hooks/use-toast';
import { SellerSidebar } from '@/components/seller/SellerSidebar';
import { cn } from "@/lib/utils";

const SellerProductStatus = () => {
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [logisticsMethod, setLogisticsMethod] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'waiting' | 'qa' | 'revision' | 'verified' | 'rejected'>('all');

  const { products: qaProducts, submitSample, loadProducts, isLoading } = useProductQAStore();
  const { toast } = useToast();
  const { seller } = useAuthStore();
  const { products: sellerProducts } = useProductStore();

  // Load QA products for this seller on mount
  useEffect(() => {
    if (seller?.id) {
      loadProducts(seller.id);
    }
  }, [seller?.id, loadProducts]);

  // Filter QA products for this seller using seller ID
  const sellerQAProducts = qaProducts.filter(
    (p) => p.sellerId === seller?.id
  );

  // Get all seller products (including those not in QA yet)
  const activeSellerProducts = sellerProducts.filter((p) => p.isActive);

  // Calculate counts
  const pendingCount = sellerQAProducts.filter(p => p.status === 'PENDING_DIGITAL_REVIEW').length;
  const waitingCount = sellerQAProducts.filter(p => p.status === 'WAITING_FOR_SAMPLE').length;
  const qaQueueCount = sellerQAProducts.filter(p => p.status === 'IN_QUALITY_REVIEW').length;
  const revisionCount = sellerQAProducts.filter(p => p.status === 'FOR_REVISION').length;
  const verifiedCount = sellerQAProducts.filter(p => p.status === 'ACTIVE_VERIFIED').length;
  const rejectedCount = sellerQAProducts.filter(p => p.status === 'REJECTED').length;

  // Calculate unique products for 'All' count
  const qaProductIdsForCount = new Set(sellerQAProducts.map(p => p.id));
  const nonQASellerProductsCount = activeSellerProducts.filter(p => !qaProductIdsForCount.has(p.id)).length;
  const allCount = sellerQAProducts.length + nonQASellerProductsCount;

  const statusOptions = [
    { value: 'all', label: 'All Products', count: allCount },
    { value: 'pending', label: 'Pending', count: pendingCount },
    { value: 'waiting', label: 'Awaiting Sample', count: waitingCount },
    { value: 'qa', label: 'QA Queue', count: qaQueueCount },
    { value: 'revision', label: 'For Revision', count: revisionCount },
    { value: 'verified', label: 'Verified', count: verifiedCount },
    { value: 'rejected', label: 'Rejected', count: rejectedCount },
  ];

  // Apply search and filter
  const getFilteredProducts = () => {
    let filteredQA = sellerQAProducts;
    let filteredSeller = activeSellerProducts;

    // Apply status filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'pending':
          filteredQA = filteredQA.filter(p => p.status === 'PENDING_DIGITAL_REVIEW');
          filteredSeller = [];
          break;
        case 'waiting':
          filteredQA = filteredQA.filter(p => p.status === 'WAITING_FOR_SAMPLE');
          filteredSeller = [];
          break;
        case 'qa':
          filteredQA = filteredQA.filter(p => p.status === 'IN_QUALITY_REVIEW');
          filteredSeller = [];
          break;
        case 'revision':
          filteredQA = filteredQA.filter(p => p.status === 'FOR_REVISION');
          filteredSeller = [];
          break;
        case 'verified':
          filteredQA = filteredQA.filter(p => p.status === 'ACTIVE_VERIFIED');
          filteredSeller = [];
          break;
        case 'rejected':
          filteredQA = filteredQA.filter(p => p.status === 'REJECTED');
          filteredSeller = [];
          break;
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filteredQA = filteredQA.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      filteredSeller = filteredSeller.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return { filteredQA, filteredSeller };
  };

  const { filteredQA: filteredQAProducts, filteredSeller: filteredSellerProducts } = getFilteredProducts();

  // Get product IDs that are already in QA system to avoid duplicates
  const qaProductIds = new Set(qaProducts.map(p => p.id));

  // Only include seller products that are NOT in the QA system yet
  const nonQASellerProducts = filteredSellerProducts.filter(p => !qaProductIds.has(p.id));

  const allFilteredProducts = [...filteredQAProducts, ...nonQASellerProducts];

  const handleSubmitSample = () => {
    if (!selectedProduct || !logisticsMethod) {
      toast({
        title: 'Error',
        description: 'Please select a logistics method',
        variant: 'destructive',
      });
      return;
    }

    try {
      submitSample(selectedProduct, logisticsMethod);
      toast({
        title: 'Sample Submitted Successfully',
        description: 'Your product sample has been submitted for physical QA review.',
        duration: 3000,
      });
      setSubmitModalOpen(false);
      setSelectedProduct(null);
      setLogisticsMethod('');
    } catch (error) {
      console.error('Error submitting sample:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Failed to submit sample. Please try again.',
        variant: 'destructive',
      });
    }
  };



  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
      <SellerSidebar />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
        </div>

        <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto relative z-10 scrollbar-hide">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight">Product QA Status</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">Track your product quality assurance status</p>
              </div>
            </div>



            {/* Filter Navigation and Search */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-8">
              {/* Status Navigation Container */}
              <div className="flex-1 relative min-w-0">
                <div className="overflow-x-auto scrollbar-hide pb-0.5">
                  <div className="inline-flex items-center p-1 bg-white rounded-full border border-orange-100/50 shadow-sm min-w-full md:min-w-max">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilterStatus(option.value as any)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-300",
                          filterStatus === option.value
                            ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                            : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50",
                        )}
                      >
                        {option.label}
                        <span className={cn(
                          "ml-1 text-[11px] font-medium",
                          filterStatus === option.value
                            ? "text-white/90"
                            : "text-gray-400 group-hover:text-[var(--brand-primary)]"
                        )}>
                          ({option.count})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative w-full lg:w-80 flex-shrink-0">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-orange-200 bg-white rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all shadow-sm"
                />
              </div>
            </div>
            {/* Products List */}
            <Card className="shadow-lg rounded-xl bg-white overflow-hidden border-0">
              <div>
                {isLoading ? (
                  <div className="py-16 text-center">
                    <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-spin" />
                    <p className="text-gray-500 font-medium">Loading products...</p>
                  </div>
                ) : allFilteredProducts.length === 0 ? (
                  <div className="py-16 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No products found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {filterStatus !== 'all' ? 'Click the filter again to show all products' : 'Try adjusting your search'}
                    </p>
                  </div>
                ) : (
                  <>
                    {filteredSellerProducts.map((product) => (
                      <div key={`seller-${product.id}`} className="p-5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-5">
                          {/* Product Image */}
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                            {product.images[0] ? (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-[var(--secondary-foreground)] truncate">{product.name}</h3>
                              {product.approvalStatus === 'approved' ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 h-5 px-2 text-[10px] uppercase tracking-wide">
                                  Approved
                                </Badge>
                              ) : product.approvalStatus === 'pending' ? (
                                <Badge className="text-orange-600 bg-orange-50 hover:bg-orange-50 border-0 h-5 px-2 text-[10px] uppercase tracking-wide">
                                  Pending
                                </Badge>
                              ) : product.approvalStatus === 'rejected' ? (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 h-5 px-2 text-[10px] uppercase tracking-wide">
                                  Rejected
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="h-5 px-2 text-[10px] uppercase tracking-wide">{product.approvalStatus || 'Unknown'}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] bg-gray-100 hover:bg-gray-100 text-gray-600 font-normal">{product.category}</Badge>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {seller?.name || 'Your Shop'}
                              </span>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="flex-shrink-0">
                            <p className="text-lg font-bold text-[var(--secondary-foreground)]">₱{product.price.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Show QA products */}
                    {filteredQAProducts.map((product) => (
                      <div key={product.id}>
                        <div className="p-5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-5">
                            {/* Product Image */}
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
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
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-[var(--secondary-foreground)] truncate">{product.name}</h3>
                                {product.status === 'PENDING_DIGITAL_REVIEW' ? (
                                  <Badge className="text-orange-600 bg-orange-50 hover:bg-orange-50 border-0 h-5 px-2 text-[10px] uppercase tracking-wide">
                                    Pending Review
                                  </Badge>
                                ) : product.status === 'IN_QUALITY_REVIEW' ? (
                                  <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 h-5 px-2 text-[10px] uppercase tracking-wide">
                                    In QA Review
                                  </Badge>
                                ) : product.status === 'FOR_REVISION' ? (
                                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 h-5 px-2 text-[10px] uppercase tracking-wide">
                                    Needs Revision
                                  </Badge>
                                ) : product.status === 'ACTIVE_VERIFIED' ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 h-5 px-2 text-[10px] uppercase tracking-wide">
                                    Verified
                                  </Badge>
                                ) : product.status === 'REJECTED' ? (
                                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 h-5 px-2 text-[10px] uppercase tracking-wide">
                                    Rejected
                                  </Badge>
                                ) : product.status === 'WAITING_FOR_SAMPLE' ? (
                                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 h-5 px-2 text-[10px] uppercase tracking-wide">
                                    Awaiting Sample
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] bg-gray-100 hover:bg-gray-100 text-gray-600 font-normal">{product.category}</Badge>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {product.vendor}
                                </span>
                                {product.logistics && (
                                  <span className="text-xs text-gray-400">• {product.logistics}</span>
                                )}
                              </div>
                            </div>

                            {/* Price */}
                            <div className="flex-shrink-0">
                              <p className="text-lg font-bold text-[var(--secondary-foreground)]">₱{product.price.toLocaleString()}</p>
                            </div>

                            {/* Action (Only for waiting sample) */}
                            {product.status === 'WAITING_FOR_SAMPLE' && (
                              <div className="flex-shrink-0 ml-4">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProduct(product.id);
                                    setSubmitModalOpen(true);
                                  }}
                                  className="bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-full px-4"
                                >
                                  Submit Sample
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Show rejection reason if product is rejected */}
                        {product.status === 'REJECTED' && product.rejectionReason && (
                          <div className="px-5 pb-5">
                            <Alert className="border-red-200 bg-red-50">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">
                                <span className="font-medium">Rejection Reason:</span> {product.rejectionReason}
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Sample Submission Modal */}
      <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Product Sample</DialogTitle>
            <DialogDescription>
              Choose how you'll send your product sample for quality verification
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <Label className="mb-3 block">Logistics Method</Label>
            <RadioGroup value={logisticsMethod} onValueChange={setLogisticsMethod}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="Drop-off by Courier" id="courier" />
                <Label htmlFor="courier" className="cursor-pointer flex-1">
                  <div className="font-medium">Drop-off by Courier</div>
                  <div className="text-sm text-gray-500">
                    Send product sample via courier service to our QA facility
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-orange-50 cursor-pointer relative group">
                <RadioGroupItem value="Onsite Visit" id="onsite" />
                <Label htmlFor="onsite" className="cursor-pointer flex-1">
                  <div className="font-medium">Onsite Visit</div>
                  <div className="text-sm text-gray-500">
                    Visit our QA facility in person to submit your product sample
                  </div>
                </Label>
                {/* Hover alert for extra fee */}
                <div className="absolute -top-20 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <Alert className="bg-orange-50 border-orange-200">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 text-sm">
                      Onsite visits require an additional processing fee of ₱200
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </RadioGroup>

            {/* Show courier address when courier is selected */}
            {logisticsMethod === 'Drop-off by Courier' && (
              <Alert className="bg-blue-50 border-blue-200">
                <Package className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="font-medium mb-1">Send your product to:</div>
                  <div className="text-sm">
                    BazaarX QA Facility<br />
                    Unit 2B, Tech Hub Building<br />
                    1234 Innovation Drive, BGC, Taguig City<br />
                    Metro Manila, 1630
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Show onsite address when onsite is selected */}
            {logisticsMethod === 'Onsite Visit' && (
              <Alert className="bg-orange-50 border-orange-200">
                <Store className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="font-medium mb-1">Visit us at:</div>
                  <div className="text-sm">
                    BazaarX QA Facility<br />
                    Unit 2B, Tech Hub Building<br />
                    1234 Innovation Drive, BGC, Taguig City<br />
                    <span className="font-medium">Operating Hours:</span> Mon-Fri, 9AM-5PM<br />
                    <span className="font-medium text-orange-900">Processing Fee: ₱200</span>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setSubmitModalOpen(false);
                setLogisticsMethod('');
              }}
              className="rounded-xl hover:bg-gray-100 text-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitSample}
              disabled={!logisticsMethod}
              className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:shadow-lg hover:shadow-orange-500/30 text-white rounded-xl transition-all"
            >
              Submit Sample
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};




export default SellerProductStatus;
