import { useState, useEffect } from 'react';
import {
  Package,
  XCircle,
  AlertCircle,
  Search,
  RefreshCw,
  User,
  Store,
  Camera,
  Truck,
  ArrowRight,
  Folder,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { handleImageError } from '@/utils/imageUtils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProductQAStore, type QAProduct } from '@/stores/productQAStore';
import { useAuthStore, useProductStore, type SellerProduct } from '@/stores/sellerStore';
import { useToast } from '@/hooks/use-toast';
import { SellerSidebar } from '@/components/seller/SellerSidebar';
import { cn } from "@/lib/utils";
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';

const SellerProductStatus = () => {
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [logisticsMethod, setLogisticsMethod] = useState<string>('');
  const [reviewStep, setReviewStep] = useState<'choose' | 'physical'>('choose');
  const [selectedProductStatus, setSelectedProductStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'waiting' | 'qa' | 'revision' | 'verified' | 'rejected'>('pending');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [courierService, setCourierService] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [selectedProductIdForShipment, setSelectedProductIdForShipment] = useState<string | null>(null);
  const [dropOffModalOpen, setDropOffModalOpen] = useState(false);
  const [selectedDropOffDate, setSelectedDropOffDate] = useState<Date | undefined>(undefined);
  const [selectedProductIdForDropOff, setSelectedProductIdForDropOff] = useState<string | null>(null);
  const [collapsedBatches, setCollapsedBatches] = useState<Set<string>>(new Set());

  const { products: qaProducts, submitSample, submitForDigitalReview, submitForPhysicalReview, loadProducts, isLoading } = useProductQAStore();
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
  const pendingCount = sellerQAProducts.filter(p => p.status === 'PENDING_ADMIN_REVIEW').length;
  const waitingCount = sellerQAProducts.filter(p => p.status === 'WAITING_FOR_SAMPLE' || p.status === 'PENDING_DIGITAL_REVIEW').length;
  const qaQueueCount = sellerQAProducts.filter(p => p.status === 'IN_QUALITY_REVIEW').length;
  const revisionCount = sellerQAProducts.filter(p => p.status === 'FOR_REVISION').length;
  const verifiedCount = sellerQAProducts.filter(p => p.status === 'ACTIVE_VERIFIED').length;
  const rejectedCount = sellerQAProducts.filter(p => p.status === 'REJECTED').length;

  // Calculate unique products for 'All' count
  const qaProductIdsForCount = new Set(sellerQAProducts.map(p => p.id));
  const nonQASellerProductsCount = activeSellerProducts.filter(p => !qaProductIdsForCount.has(p.id)).length;
  const allCount = sellerQAProducts.length + nonQASellerProductsCount;

  const statusOptions = [
    { value: 'pending', label: 'Pending', count: pendingCount },
    { value: 'waiting', label: 'Awaiting Sample', count: waitingCount },
    { value: 'qa', label: 'QA Queue', count: qaQueueCount },
    { value: 'revision', label: 'For Revision', count: revisionCount },
    { value: 'verified', label: 'Verified', count: verifiedCount },
    { value: 'rejected', label: 'Rejected', count: rejectedCount },
    { value: 'all', label: 'All Products', count: allCount },
  ];

  // Apply search and filter
  const getFilteredProducts = () => {
    let filteredQA = sellerQAProducts;
    let filteredSeller = activeSellerProducts;

    // Apply status filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'pending':
          filteredQA = filteredQA.filter(p => p.status === 'PENDING_ADMIN_REVIEW');
          filteredSeller = [];
          break;
        case 'waiting':
          filteredQA = filteredQA.filter(p => p.status === 'WAITING_FOR_SAMPLE' || p.status === 'PENDING_DIGITAL_REVIEW');
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

  interface GroupedProducts {
    groups: { [key: string]: QAProduct[] };
    individual: (QAProduct | SellerProduct)[];
  }

  const groupProductsByBatch = (products: (QAProduct | SellerProduct)[]): GroupedProducts => {
    const groups: { [key: string]: QAProduct[] } = {};
    const individual: (QAProduct | SellerProduct)[] = [];

    products.forEach(p => {
      // Products in QA may have a batchId
      const qaProduct = p as any as QAProduct;
      if (qaProduct.batchId) {
        if (!groups[qaProduct.batchId]) {
          groups[qaProduct.batchId] = [];
        }
        groups[qaProduct.batchId].push(qaProduct);
      } else {
        individual.push(p);
      }
    });

    return { groups, individual };
  };

  const { groups: batchGroups, individual: individualProducts } = groupProductsByBatch(allFilteredProducts);

  const toggleBatchCollapse = (batchId: string) => {
    const newCollapsed = new Set(collapsedBatches);
    if (newCollapsed.has(batchId)) {
      newCollapsed.delete(batchId);
    } else {
      newCollapsed.add(batchId);
    }
    setCollapsedBatches(newCollapsed);
  };

  const formatLogisticsInfo = (logisticsStr?: string | null) => {
    if (!logisticsStr) return null;
    try {
      const log = JSON.parse(logisticsStr);
      const method = log.METHOD || log.method || '';
      const courier = log.COURIER || log.courier || '';
      const trackingNumber = log.TRACKINGNUMBER || log.trackingNumber || '';

      if (method.toUpperCase() === 'ONSITE VISIT') {
        return `Onsite Drop-off • ${trackingNumber ? trackingNumber.replace(/SCHEDULED FOR /i, '') : ''}`;
      } else if (method.toUpperCase() === 'COURIER') {
        return `${courier} • ${trackingNumber || 'No Tracking'}`;
      }
      return method || logisticsStr;
    } catch {
      // Handle non-JSON or malformed strings gracefully
      const lowerStr = logisticsStr.toLowerCase();
      return lowerStr.includes('onsite') ? 'Onsite Drop-off' : 
             lowerStr.includes('courier') ? 'Courier Delivery' :
             logisticsStr;
    }
  };

  const renderProductRow = (product: any, idPrefix: string, hideCheckbox: boolean = false, hideActionButtons: boolean = false, hideLogistics: boolean = false) => {
    const isQA = idPrefix === 'qa';
    const isSubmittable = isQA 
      ? product.status === 'PENDING_DIGITAL_REVIEW'
      : (product.approvalStatus as string) === 'accepted' || (product.approvalStatus as string) === 'ACCEPTED';

    return (
      <div key={`${idPrefix}-${product.id}`} className={cn(
        "p-5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-center gap-4",
        selectedProducts.has(product.id) && "bg-orange-50/30"
      )}>
        {isSubmittable && !hideCheckbox && (
          <Checkbox 
            checked={selectedProducts.has(product.id)}
            onCheckedChange={() => toggleProductSelection(product.id)}
            className="border-orange-200 data-[state=checked]:bg-[var(--brand-primary)] data-[state=checked]:border-[var(--brand-primary)]"
          />
        )}
        <div className="flex-1 flex items-center gap-5">
          {/* Product Image */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
            {(isQA ? product.image : product.images[0]) ? (
              <img src={isQA ? product.image : product.images[0]} alt={product.name} className="w-full h-full object-cover" onError={handleImageError} />
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
              {isQA ? (
                <>
                  {product.status === 'PENDING_ADMIN_REVIEW' ? (
                    <Badge className="text-gray-600 bg-gray-100 hover:bg-gray-100 border-0 h-5 px-2 text-[10px] uppercase tracking-wide">
                      Pending Admin Review
                    </Badge>
                  ) : product.status === 'PENDING_DIGITAL_REVIEW' ? (
                    <Badge className="text-[#D97706] bg-amber-50 hover:bg-amber-50 border-0 h-5 px-2 text-[10px] uppercase tracking-wide">
                      In Digital Review
                    </Badge>
                  ) : product.status === 'IN_QUALITY_REVIEW' ? (
                    <Badge variant="outline" className="text-[#D97706] border-[#FDE68A] bg-amber-50 h-5 px-2 text-[10px] uppercase tracking-wide">
                      In QA Review
                    </Badge>
                  ) : product.status === 'FOR_REVISION' ? (
                    <Badge variant="outline" className="text-[#D97706] border-[#FDE68A] bg-amber-50 h-5 px-2 text-[10px] uppercase tracking-wide">
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
                    <Badge variant="outline" className="text-[#D97706] border-[#FDE68A] bg-amber-50 h-5 px-2 text-[10px] uppercase tracking-wide">
                      Awaiting Sample
                    </Badge>
                  ) : null}
                </>
              ) : (
                <>
                  {product.approvalStatus === 'approved' ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 h-5 px-2 text-[10px] uppercase tracking-wide">
                      Approved
                    </Badge>
                  ) : product.approvalStatus === 'pending' ? (
                    <Badge className="text-[#D97706] bg-amber-50 hover:bg-amber-50 border-0 h-5 px-2 text-[10px] uppercase tracking-wide">
                      Pending
                    </Badge>
                  ) : product.approvalStatus === 'rejected' ? (
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 h-5 px-2 text-[10px] uppercase tracking-wide">
                      Rejected
                    </Badge>
                  ) : (product.approvalStatus as string) === 'accepted' || (product.approvalStatus as string) === 'ACCEPTED' ? (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 h-5 px-2 text-[10px] uppercase tracking-wide">
                      Awaiting Sample
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="h-5 px-2 text-[10px] uppercase tracking-wide">{product.approvalStatus || 'Unknown'}</Badge>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] bg-gray-100 hover:bg-gray-100 text-gray-600 font-normal">{product.category}</Badge>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <User className="w-3 h-3" />
                {isQA ? product.vendor : (seller?.name || 'Your Shop')}
              </span>
              {isQA && product.logistics && !hideLogistics && (
                <span className="text-xs text-gray-400">• {formatLogisticsInfo(product.logistics)}</span>
              )}
            </div>
          </div>
          {/* Price */}
          <div className="flex-shrink-0">
            <p className="text-lg font-bold text-[var(--secondary-foreground)]">₱{product.price.toLocaleString()}</p>
          </div>
          
          {/* Action buttons */}
          {!hideActionButtons && isQA && product.status === 'WAITING_FOR_SAMPLE' && (
            <div className="flex-shrink-0 ml-4">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openSubmitModal(product.id, product.status, product.logistics);
                }}
                className="bg-[#D97706] hover:bg-[#B45309] text-white rounded-full px-4"
              >
                {product.logistics?.includes('Courier') 
                  ? 'Confirm Shipment' 
                  : product.logistics?.includes('Onsite')
                    ? 'Schedule Drop-off'
                    : 'Confirm Sample Sent'}
              </Button>
            </div>
          )}
          {!hideActionButtons && isQA && product.status === 'PENDING_DIGITAL_REVIEW' && (
            <div className="flex-shrink-0 ml-4">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openSubmitModal(product.id, product.status);
                }}
                className="bg-[#D97706] hover:bg-[#B45309] text-white rounded-full px-4 gap-1.5 shadow-sm shadow-amber-200"
              >
                Submit for QA
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          {!hideActionButtons && !isQA && isSubmittable && (
            <div className="flex-shrink-0 ml-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openSubmitModal(product.id, 'accepted');
                }}
                className="bg-[#D97706] hover:bg-[#B45309] text-white rounded-full px-4 gap-1.5 shadow-sm shadow-amber-200"
              >
                Submit for QA
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          
          {/* Scheduled Drop-off display for QA Queue */}
          {!hideLogistics && isQA && product.status === 'IN_QUALITY_REVIEW' && (
            <div className="flex-shrink-0 ml-4 flex flex-col items-end justify-center">
              {(() => {
                if (!product.logistics) return null;
                try {
                  const log = JSON.parse(product.logistics);
                  const method = log.METHOD || log.method || '';
                  if (method.toUpperCase() === 'ONSITE VISIT') {
                    const trackingNumber = log.TRACKINGNUMBER || log.trackingNumber || '';
                    const dateStr = trackingNumber.replace(/SCHEDULED FOR /i, '');
                    
                    // Check if date is in the past
                    let isPast = false;
                    if (dateStr) {
                      const scheduledDate = new Date(dateStr);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      isPast = !isNaN(scheduledDate.getTime()) && scheduledDate < today;
                    }

                    if (isPast) {
                      return (
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Missed Drop-off</span>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductIdForDropOff(product.id);
                              setDropOffModalOpen(true);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-full px-4 h-7 text-xs font-semibold shadow-sm"
                          >
                            Reschedule
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Scheduled Drop-off</span>
                        <Badge variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200 shadow-sm px-3 h-7">
                          {dateStr}
                        </Badge>
                      </>
                    );
                  }
                } catch {
                  const lowerStr = product.logistics.toLowerCase();
                  if (lowerStr.includes('onsite')) {
                    return (
                      <>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Scheduled Drop-off</span>
                        <Badge variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200 shadow-sm px-3 h-7">
                          Pending
                        </Badge>
                      </>
                    );
                  }
                }
                return null;
              })()}
            </div>
          )}
        </div>
        
        {/* Rejection reason */}
        {isQA && product.status === 'REJECTED' && product.rejectionReason && (
          <div className="px-5 pb-5 w-full">
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <span className="font-medium">Rejection Reason:</span> {product.rejectionReason}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    );
  };

  const openSubmitModal = (productId: string | string[], productStatus?: string, currentLogistics?: string | null) => {
    const idToSelect = Array.isArray(productId) ? productId.join(',') : productId;
    setSelectedProduct(idToSelect);
    setSelectedProductStatus(productStatus || '');
    
    // Normalize logistics string for comparison
    const normalizedLogistics = currentLogistics?.trim();
    
    // Direct modal trigger logic for WAITING_FOR_SAMPLE
    if (productStatus === 'WAITING_FOR_SAMPLE' && normalizedLogistics) {
      if (normalizedLogistics.includes('Courier')) {
        setSelectedProductIdForShipment(idToSelect);
        setShipmentModalOpen(true);
        return;
      }
      if (normalizedLogistics.includes('Onsite')) {
        setSelectedProductIdForDropOff(idToSelect);
        setDropOffModalOpen(true);
        return;
      }
    }

    setSubmitModalOpen(true);
    // For WAITING_FOR_SAMPLE, skip the choice step — seller already chose physical
    setReviewStep(productStatus === 'WAITING_FOR_SAMPLE' ? 'physical' : 'choose');
    setLogisticsMethod(normalizedLogistics || '');
  };

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = (productsToSelect: string[]) => {
    if (selectedProducts.size === productsToSelect.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(productsToSelect));
    }
  };

  const getSubmittableProducts = (products: any[]) => {
    return products.filter(p => {
      const status = (p as any).status || (p as any).approvalStatus;
      return status === 'accepted' || status === 'ACCEPTED' || status === 'PENDING_DIGITAL_REVIEW';
    });
  };

  const handleDigitalReview = async () => {
    if (!selectedProduct) return;
    const productIds = selectedProduct.split(',');
    try {
      if (productIds.length > 1) {
        await Promise.all(productIds.map(id => submitForDigitalReview(id)));
      } else {
        await submitForDigitalReview(selectedProduct);
      }
      toast({
        title: 'Digital Review Submitted',
        description: `${productIds.length > 1 ? productIds.length + ' products have' : 'Your product has'} been queued for digital QA review. Our team will review your photos and listing details.`,
        duration: 4000,
      });
      setSubmitModalOpen(false);
      setSelectedProduct(null);
      setReviewStep('choose');
      setSelectedProductStatus('');
      setSelectedProducts(new Set()); // Reset selection
    } catch (error) {
      console.error('Error submitting digital review:', error);
      toast({ title: 'Submission Failed', description: 'Failed to submit. Please try again.', variant: 'destructive' });
    }
  };

  const handleSubmitSample = async () => {
    if (!selectedProduct || !logisticsMethod) {
      toast({ title: 'Error', description: 'Please select a logistics method', variant: 'destructive' });
      return;
    }
    const productIds = selectedProduct.split(',');
    try {
      const batchId = productIds.length > 1 ? `BATCH-${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` : undefined;

      // 1. Move to WAITING_FOR_SAMPLE state if not already there
      if (selectedProductStatus === 'PENDING_DIGITAL_REVIEW' || selectedProductStatus === 'accepted' || selectedProductStatus === 'ACCEPTED' || !selectedProductStatus) {
        if (productIds.length > 1) {
          await Promise.all(productIds.map(id => submitForPhysicalReview(id, logisticsMethod, batchId)));
        } else {
          await submitForPhysicalReview(selectedProduct, logisticsMethod);
        }
      }

      // 2. Revert Automated Flow (Close modal, don't trigger next)
      // (The specialized modals will be triggered manually from the folder header button)

      // 3. Complete the basic submission (if already in WAITING_FOR_SAMPLE and no special modal needed)
      // Actually, since we want manual trigger, we just finish here if it was a transition.
      // If it WAS already in WAITING_FOR_SAMPLE, we might still want to trigger the basic submitSample
      if (selectedProductStatus !== 'PENDING_DIGITAL_REVIEW' && selectedProductStatus !== 'accepted' && selectedProductStatus !== 'ACCEPTED' && selectedProductStatus) {
        if (productIds.length > 1) {
          await Promise.all(productIds.map(id => submitSample(id, logisticsMethod, { courier: '', trackingNumber: '', batchId: batchId || '' })));
        } else {
          await submitSample(selectedProduct, logisticsMethod);
        }
      }
      
      toast({
        title: productIds.length > 1 ? 'Bulk Submission Successful' : 'Submission Successful',
        description: productIds.length > 1 
          ? `${productIds.length} products have been updated.`
          : 'Your product status has been updated.',
        duration: 4000,
      });

      setSubmitModalOpen(false);
      setSelectedProduct(null);
      setLogisticsMethod('');
      setReviewStep('choose');
      setSelectedProductStatus('');
      setSelectedProducts(new Set());
    } catch (error) {
      console.error('Error submitting sample:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Failed to submit. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmShipment = async () => {
    if (!selectedProductIdForShipment || !courierService || !trackingNumber) {
      toast({ title: 'Error', description: 'Please provide both courier and tracking number', variant: 'destructive' });
      return;
    }

    try {
      const productIds = selectedProductIdForShipment.split(',');
      const fullTracking = `${courierService}: ${trackingNumber}`;
      
      const batchId = productIds.length > 1 ? `BATCH-${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` : undefined;
      
      if (productIds.length > 1) {
        await Promise.all(productIds.map(id => 
          submitSample(id, 'Drop-off by Courier', {
            courier: courierService,
            trackingNumber: trackingNumber,
            batchId
          })
        ));
      } else {
        await submitSample(selectedProductIdForShipment, 'Drop-off by Courier', {
          courier: courierService,
          trackingNumber: trackingNumber
        });
      }

      toast({
        title: 'Shipment Confirmed',
        description: 'Tracking information has been saved and your product is now in QA review.',
        duration: 4000,
      });

      setShipmentModalOpen(false);
      setSelectedProductIdForShipment(null);
      setCourierService('');
      setTrackingNumber('');
      setSelectedProducts(new Set());
    } catch (error) {
      console.error('Error confirming shipment:', error);
      toast({
        title: 'Confirmation Failed',
        description: 'Failed to confirm shipment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleScheduleDropOff = async () => {
    if (!selectedProductIdForDropOff || !selectedDropOffDate) {
      toast({ title: 'Error', description: 'Please select a drop-off date', variant: 'destructive' });
      return;
    }

    try {
      const productIds = selectedProductIdForDropOff.split(',');
      const formattedDate = selectedDropOffDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const batchId = productIds.length > 1 ? `BATCH-${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` : undefined;
      
      if (productIds.length > 1) {
        await Promise.all(productIds.map(id => 
          submitSample(id, 'Onsite Visit', {
            courier: 'Onsite Drop-off',
            trackingNumber: `Scheduled for ${formattedDate}`,
            batchId
          })
        ));
      } else {
        await submitSample(selectedProductIdForDropOff, 'Onsite Visit', {
          courier: 'Onsite Drop-off',
          trackingNumber: `Scheduled for ${formattedDate}`
        });
      }

      toast({
        title: 'Drop-off Scheduled',
        description: `Your onsite visit is scheduled for ${formattedDate}.`,
        duration: 4000,
      });

      setDropOffModalOpen(false);
      setSelectedProductIdForDropOff(null);
      setSelectedDropOffDate(undefined);
      setSelectedProducts(new Set());
    } catch (error) {
      console.error('Error scheduling drop-off:', error);
      toast({
        title: 'Scheduling Failed',
        description: 'Failed to schedule drop-off. Please try again.',
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
                        onClick={() => setFilterStatus(option.value as typeof filterStatus)}
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
                    {/* Selection Header */}
                    {getSubmittableProducts(allFilteredProducts).length > 0 && (
                      <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            id="select-all" 
                            checked={selectedProducts.size === getSubmittableProducts(allFilteredProducts).length && getSubmittableProducts(allFilteredProducts).length > 0}
                            onCheckedChange={() => toggleSelectAll(getSubmittableProducts(allFilteredProducts).map(p => p.id))}
                            className="border-orange-200 data-[state=checked]:bg-[var(--brand-primary)] data-[state=checked]:border-[var(--brand-primary)]"
                          />
                          <Label htmlFor="select-all" className="text-xs font-bold text-gray-500 cursor-pointer uppercase tracking-wider">
                            Select All Submittable
                          </Label>
                        </div>
                        {selectedProducts.size > 0 && (
                          <div className="text-xs font-bold text-[var(--brand-primary)] animate-in fade-in slide-in-from-left-2">
                            {selectedProducts.size} {selectedProducts.size === 1 ? 'product' : 'products'} selected
                          </div>
                        )}
                      </div>
                    )}

                    {(() => {
                      const renderedBatches = new Set<string>();
                      const result: React.ReactNode[] = [];

                      // 1. Render Non-QA Products
                      nonQASellerProducts.forEach(product => {
                        result.push(renderProductRow(product, 'seller'));
                      });

                      // 2. Render QA Products (with batching)
                      filteredQAProducts.forEach((product, index) => {
                        if (product.batchId) {
                          if (renderedBatches.has(product.batchId)) return;
                          renderedBatches.add(product.batchId);
                          
                          const batchProducts = batchGroups[product.batchId] || [];
                          result.push(
                            <div key={`batch-${product.batchId}`} className="border-b border-gray-100 bg-gray-50/20 last:border-0 overflow-hidden">
                              {/* Batch Folder Header */}
                              <div 
                                className="px-5 py-4 bg-white border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-all group"
                                onClick={() => toggleBatchCollapse(product.batchId)}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors shadow-sm">
                                    <Folder className="w-5 h-5 text-[#D97706]" />
                                  </div>
                                  <div>
                                    <span className="text-sm font-bold text-gray-800 tracking-tight">Bulk Shipment Folder</span>
                                    <p className="text-[11px] text-gray-500 font-mono mt-0.5 opacity-70">{product.batchId}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="flex items-center gap-3">
                                    {batchProducts[0]?.status === 'WAITING_FOR_SAMPLE' && (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openSubmitModal(batchProducts.map(p => p.id), batchProducts[0].status, batchProducts[0].logistics);
                                        }}
                                        className="bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl px-4 h-8 text-xs font-bold shadow-sm"
                                      >
                                        {batchProducts[0].logistics?.includes('Courier') 
                                          ? 'Confirm Batch Shipment' 
                                          : batchProducts[0].logistics?.includes('Onsite')
                                            ? 'Schedule Batch Drop-off'
                                            : 'Confirm Samples Sent'}
                                      </Button>
                                    )}
                                    {batchProducts[0]?.status === 'PENDING_DIGITAL_REVIEW' && (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openSubmitModal(batchProducts.map(p => p.id), batchProducts[0].status);
                                        }}
                                        className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl px-4 h-8 text-xs font-bold shadow-sm gap-1"
                                      >
                                        Submit Batch for QA
                                        <ArrowRight className="w-3 h-3" />
                                      </Button>
                                    )}
                                      <Badge variant="outline" className="bg-amber-50/50 text-[#D97706] border-amber-100 font-bold h-7 px-4 rounded-xl">
                                      {batchProducts.length} Items
                                    </Badge>
                                    {batchProducts[0]?.logistics && (
                                      <div className="flex items-center">
                                        {(() => {
                                          try {
                                            const log = JSON.parse(batchProducts[0].logistics);
                                            const method = log.METHOD || log.method || '';
                                            if (method.toUpperCase() === 'ONSITE VISIT' && batchProducts[0].status === 'IN_QUALITY_REVIEW') {
                                              const trackingNumber = log.TRACKINGNUMBER || log.trackingNumber || '';
                                              const dateStr = trackingNumber.replace(/SCHEDULED FOR /i, '');
                                              
                                              // Check if date is in the past
                                              let isPast = false;
                                              if (dateStr) {
                                                const scheduledDate = new Date(dateStr);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                isPast = !isNaN(scheduledDate.getTime()) && scheduledDate < today;
                                              }

                                              if (isPast) {
                                                return (
                                                  <div className="flex items-center gap-3 mr-2">
                                                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 font-bold uppercase tracking-wider h-8">
                                                      Missed Drop-off
                                                    </Badge>
                                                    <Button
                                                      size="sm"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Get all IDs in this batch to pass to the modal
                                                        const batchIds = batchProducts.map(p => p.id).join(',');
                                                        setSelectedProductIdForDropOff(batchIds);
                                                        setDropOffModalOpen(true);
                                                      }}
                                                      className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 h-8 text-xs font-bold shadow-sm"
                                                    >
                                                      Reschedule Bulk Drop-off
                                                    </Button>
                                                  </div>
                                                );
                                              }

                                              return (
                                                <div className="flex flex-col items-end justify-center mr-2">
                                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Scheduled</span>
                                                  <Badge variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200 shadow-sm px-3 h-7">
                                                    {dateStr || 'Pending'}
                                                  </Badge>
                                                </div>
                                              );
                                            }
                                          } catch {
                                            const lowerStr = batchProducts[0].logistics.toLowerCase();
                                            if (lowerStr.includes('onsite') && batchProducts[0].status === 'IN_QUALITY_REVIEW') {
                                              return (
                                                <div className="flex flex-col items-end justify-center mr-2">
                                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Scheduled</span>
                                                  <Badge variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200 shadow-sm px-3 h-7">
                                                    Pending
                                                  </Badge>
                                                </div>
                                              );
                                            }
                                          }
                                          return (
                                            <div className="text-xs text-gray-500 font-medium bg-gray-100/50 px-3 py-1 rounded-lg tracking-wide text-[11px] border border-gray-200">
                                              {formatLogisticsInfo(batchProducts[0].logistics)}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                  {collapsedBatches.has(product.batchId) ? (
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                                  )}
                                </div>
                              </div>
                              
                              {/* Batch Items */}
                              {!collapsedBatches.has(product.batchId) && (
                                <div className="divide-y divide-gray-100/50 animate-in slide-in-from-top-2 duration-300">
                                  {batchProducts.map((bProduct, bIndex) => (
                                    <div key={`batch-item-${bProduct.id}-${bIndex}`} className="pl-6 bg-white/30">
                                      {renderProductRow(bProduct, 'qa', true, true, true)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          result.push(renderProductRow(product, 'qa'));
                        }
                      });

                      return result;
                    })()}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedProducts.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5">
            <div className="bg-white border border-orange-100 shadow-2xl rounded-2xl p-4 flex items-center gap-6 backdrop-blur-md">
              <div className="flex items-center gap-3 pr-6 border-r border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Package className="w-5 h-5 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 leading-none">{selectedProducts.size}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Selected</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedProducts(new Set())}
                  className="text-gray-500 hover:text-gray-700 font-bold text-xs"
                >
                  Deselect All
                </Button>
                <Button 
                  onClick={() => {
                    // Check if selection is mixed or uniform
                    const selectedProductData = Array.from(selectedProducts).map(id => 
                      allFilteredProducts.find(p => p.id === id)
                    ).filter(Boolean);
                    
                    const statuses = new Set(selectedProductData.map(p => (p as any).status || (p as any).approvalStatus));
                    const isAllWaiting = statuses.size === 1 && (statuses.has('WAITING_FOR_SAMPLE'));
                    
                    // If all are waiting for sample, skip to physical step
                    if (isAllWaiting) {
                      // Use the logistics of the first product if they are uniform
                      const logistics = (selectedProductData[0] as any).logistics;
                      openSubmitModal(Array.from(selectedProducts), 'WAITING_FOR_SAMPLE', logistics);
                    } else {
                      openSubmitModal(Array.from(selectedProducts), 'PENDING_DIGITAL_REVIEW');
                    }
                  }}
                  className="bg-gradient-to-r from-[#D97706] to-[#B45309] hover:shadow-lg hover:shadow-amber-500/30 text-white rounded-xl font-bold px-6 shadow-md transition-all active:scale-95"
                >
                  {Array.from(selectedProducts).every(id => {
                    const p = allFilteredProducts.find(p => p.id === id);
                    return (p as any)?.status === 'WAITING_FOR_SAMPLE';
                  }) ? 'Confirm Selections' : 'Submit for QA'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QA Submission Modal */}
      <Dialog open={submitModalOpen} onOpenChange={(open) => {
        setSubmitModalOpen(open);
        if (!open) { setReviewStep('choose'); setLogisticsMethod(''); setSelectedProductStatus(''); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewStep === 'choose' ? 'Submit for QA Review' : 'Physical Sample Submission'}
            </DialogTitle>
            <DialogDescription>
              {reviewStep === 'choose'
                ? `Submit ${selectedProduct?.includes(',') ? selectedProduct.split(',').length + ' products' : 'your product'} for quality review`
                : 'Select how you\'ll send your product sample to our facility'}
            </DialogDescription>
          </DialogHeader>

          {reviewStep === 'choose' ? (
            <div className="py-2 space-y-3">
              {/* Digital Review option */}
              <button
                disabled
                className="w-full flex items-start gap-4 p-4 border-2 border-gray-100 rounded-xl bg-gray-50/50 cursor-not-allowed opacity-80 text-left group relative overflow-hidden"
              >
                <div className="absolute top-2 right-2">
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-[9px] font-black uppercase tracking-tighter px-1.5 h-4">
                    Coming Soon
                  </Badge>
                </div>
                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-400">Digital Review (Suspended)</div>
                  <div className="text-sm text-gray-400 mt-0.5 italic">This feature is temporarily unavailable while we upgrade our verification protocols.</div>
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                      Offline Mode
                    </span>
                  </div>
                </div>
                <XCircle className="w-4 h-4 text-gray-300 self-center flex-shrink-0" />
              </button>

              {/* Physical Sample option */}
              <button
                onClick={() => setReviewStep('physical')}
                className="w-full flex items-start gap-4 p-4 border-2 border-amber-100 rounded-xl hover:border-[#D97706] hover:bg-amber-50/50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                  <Truck className="w-5 h-5 text-[#D97706]" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Physical Sample</div>
                  <div className="text-sm text-gray-500 mt-0.5">Send a physical product sample to our QA facility for hands-on inspection.</div>
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      <Package className="w-3 h-3" /> Shipping required · 3–5 business days
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 self-center flex-shrink-0 group-hover:text-[#D97706] transition-colors" />
              </button>
            </div>
          ) : (
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

              {logisticsMethod === 'Drop-off by Courier' && (
                <Alert className="bg-amber-50 border-amber-200">
                  <Package className="h-4 w-4 text-[#D97706]" />
                  <AlertDescription className="text-amber-800">
                    <div className="font-medium mb-1 text-amber-900">Send your product to:</div>
                    <div className="text-sm">
                      BazaarX QA Facility<br />
                      Unit 2B, Tech Hub Building<br />
                      1234 Innovation Drive, BGC, Taguig City<br />
                      Metro Manila, 1630
                    </div>
                  </AlertDescription>
                </Alert>
              )}

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
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                if (reviewStep === 'physical') {
                  setReviewStep('choose');
                  setLogisticsMethod('');
                } else {
                  setSubmitModalOpen(false);
                }
              }}
              className="rounded-xl hover:bg-gray-100 text-gray-600"
            >
              {reviewStep === 'physical' ? 'Back' : 'Cancel'}
            </Button>
            {reviewStep === 'physical' && (
              <Button
                onClick={handleSubmitSample}
                disabled={!logisticsMethod}
                className="bg-gradient-to-r from-[#D97706] to-[#B45309] hover:shadow-lg hover:shadow-amber-500/30 text-white rounded-xl transition-all"
              >
                Submit Sample
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Confirm Shipment Modal */}
      <Dialog open={shipmentModalOpen} onOpenChange={setShipmentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Confirm Shipment Details</DialogTitle>
            <DialogDescription>
              Provide tracking information for your shipped product sample
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courier-service" className="text-sm font-semibold text-gray-700">Courier Service</Label>
              <select
                id="courier-service"
                value={courierService}
                onChange={(e) => setCourierService(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Select courier service</option>
                <option value="Lalamove">Lalamove</option>
                <option value="Grab Express">Grab Express</option>
                <option value="J&T Express">J&T Express</option>
                <option value="NinjaVan">NinjaVan</option>
                <option value="Flash Express">Flash Express</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking-number" className="text-sm font-semibold text-gray-700">Tracking Number</Label>
              <input
                id="tracking-number"
                type="text"
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 placeholder:text-gray-300"
              />
            </div>

            <Alert className="bg-amber-50/50 border-amber-100 rounded-xl">
              <AlertCircle className="h-5 w-5 text-[#D97706]" />
              <div className="ml-2">
                <div className="text-sm font-bold text-amber-900">QA Facility Address</div>
                <div className="text-xs text-amber-700 mt-1">
                  BazaarX Quality Assurance Center<br />
                  123 Commerce Ave, Makati City, Metro Manila 1234
                </div>
              </div>
            </Alert>
          </div>

          <DialogFooter className="gap-3 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setShipmentModalOpen(false)}
              className="rounded-xl border-gray-200 text-gray-600 font-semibold px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmShipment}
              disabled={!courierService || !trackingNumber}
              className="bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl font-bold px-8 shadow-md transition-all active:scale-95 uppercase text-xs tracking-wider"
            >
              Confirm Shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Drop-off Modal */}
      <Dialog open={dropOffModalOpen} onOpenChange={setDropOffModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Select Drop-off Date</DialogTitle>
            <DialogDescription>
              Select a date for your onsite visit to our facility
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 flex flex-col items-center">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 w-full flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDropOffDate}
                onSelect={setSelectedDropOffDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>

            <Alert className="bg-amber-50/50 border-amber-100 rounded-xl mt-6 w-full">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-[#D97706]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-amber-900">QA Facility Address</div>
                  <div className="text-xs text-amber-700 mt-1">
                    BazaarX Quality Assurance Center<br />
                    123 Commerce Ave, Makati City, Metro Manila 1234<br />
                    <span className="font-semibold">Operating Hours:</span> Mon-Fri, 9:00 AM - 5:00 PM
                  </div>
                </div>
              </div>
            </Alert>
          </div>

          <DialogFooter className="gap-3 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setDropOffModalOpen(false)}
              className="rounded-xl border-gray-200 text-gray-600 font-semibold px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleDropOff}
              disabled={!selectedDropOffDate}
              className="bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl font-bold px-8 shadow-md transition-all active:scale-95 uppercase text-xs tracking-wider"
            >
              Confirm Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerProductStatus;
