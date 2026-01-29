import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  FileCheck,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  BadgeCheck,
  RefreshCw,
  User,
  Store
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
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { sellerLinks } from '@/config/sellerLinks';

// Logo Components
const Logo = () => {
  return (
    <Link
      to="/seller"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <img 
        src="/Logo.png" 
        alt="BazaarPH Logo" 
        className="h-8 w-8 object-contain flex-shrink-0"
      />
      <span className="font-semibold text-gray-900 dark:text-white whitespace-pre">
        BazaarPH Seller
      </span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
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
};

const SellerProductStatus = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Calculate stats
  const pendingCount = sellerQAProducts.filter((p) => p.status === 'PENDING_DIGITAL_REVIEW').length;
  const waitingCount = sellerQAProducts.filter((p) => p.status === 'WAITING_FOR_SAMPLE').length;
  const reviewCount = sellerQAProducts.filter((p) => p.status === 'IN_QUALITY_REVIEW').length;
  const verifiedCount = sellerQAProducts.filter((p) => p.status === 'ACTIVE_VERIFIED').length;
  const revisionCount = sellerQAProducts.filter((p) => p.status === 'FOR_REVISION').length;
  const rejectedCount = sellerQAProducts.filter((p) => p.status === 'REJECTED').length;

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
  const allFilteredProducts = [...filteredQAProducts, ...filteredSellerProducts];

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
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {sidebarOpen ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {sellerLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <SidebarLink
              link={{
                label: seller?.name || "Seller",
                href: "/seller/profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {seller?.name?.charAt(0) || 'S'}
                    </span>
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 rounded-xl">
                <FileCheck className="w-6 h-6 text-[#FF5722]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Product QA Status</h1>
                <p className="text-sm text-gray-500">Track your product quality assurance status</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-8 py-8">

          {/* Stat-Filter Cards (Consolidated Navigation) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {/* Pending Review */}
            <Card 
              onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
              className={`cursor-pointer transition-all hover:shadow-md ${
                filterStatus === 'pending' 
                  ? 'border-[#FF5722] border-2 bg-orange-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className={`w-5 h-5 ${filterStatus === 'pending' ? 'text-[#FF5722]' : 'text-gray-400'}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-xs font-medium text-gray-600 mt-1">Pending Review</p>
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
                <p className="text-2xl font-bold text-gray-900">{waitingCount}</p>
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
                <p className="text-2xl font-bold text-gray-900">{reviewCount}</p>
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
                <p className="text-2xl font-bold text-gray-900">{revisionCount}</p>
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
                <p className="text-2xl font-bold text-gray-900">{verifiedCount}</p>
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
                <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
                <p className="text-xs font-medium text-gray-600 mt-1">Rejected</p>
              </div>
            </Card>
          </div>
          {/* Search Toolbar */}
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
                <>
                  {/* Show seller products first */}
                  {filteredSellerProducts.map((product) => (
                    <div key={`seller-${product.id}`} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-5">
                        {/* Product Image */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
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
                          <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{product.category}</Badge>
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {seller?.name || 'Your Shop'}
                            </span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex-shrink-0">
                          <p className="text-xl font-bold text-[#FF5722]">₱{product.price.toLocaleString()}</p>
                        </div>

                        {/* Status Badge */}
                        <div className="flex-shrink-0">
                          {product.approvalStatus === 'approved' ? (
                            <Badge className="bg-green-100 text-green-700 border-0">
                              <BadgeCheck className="w-3 h-3 mr-1" />
                              Approved
                            </Badge>
                          ) : product.approvalStatus === 'pending' ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              Pending
                            </Badge>
                          ) : product.approvalStatus === 'rejected' ? (
                            <Badge className="bg-red-100 text-red-700 border-0">
                              <XCircle className="w-3 h-3 mr-1" />
                              Rejected
                            </Badge>
                          ) : (
                            <Badge variant="outline">{product.approvalStatus || 'Unknown'}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Show QA products */}
                  {filteredQAProducts.map((product) => (
                    <div key={product.id}>
                      <div className="p-5 hover:bg-gray-50 transition-colors">
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
                              {product.logistics && (
                                <span className="text-xs text-gray-500">• {product.logistics}</span>
                              )}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="flex-shrink-0">
                            <p className="text-xl font-bold text-[#FF5722]">₱{product.price.toLocaleString()}</p>
                          </div>

                          {/* Status and Action */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {product.status === 'WAITING_FOR_SAMPLE' ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedProduct(product.id);
                                  setSubmitModalOpen(true);
                                }}
                                className="bg-[#FF5722] hover:bg-[#E64A19] text-white"
                              >
                                Submit Sample
                              </Button>
                            ) : product.status === 'PENDING_DIGITAL_REVIEW' ? (
                              <Badge variant="outline" className="text-orange-600 border-orange-300">
                                Pending Review
                              </Badge>
                            ) : product.status === 'IN_QUALITY_REVIEW' ? (
                              <Badge variant="outline" className="text-purple-600 border-purple-300">
                                In QA Review
                              </Badge>
                            ) : product.status === 'FOR_REVISION' ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                Needs Revision
                              </Badge>
                            ) : product.status === 'ACTIVE_VERIFIED' ? (
                              <Badge className="bg-green-100 text-green-700 border-0">
                                <BadgeCheck className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : product.status === 'REJECTED' ? (
                              <Badge className="bg-red-100 text-red-700 border-0">
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejected
                              </Badge>
                            ) : null}
                          </div>
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
              variant="outline"
              onClick={() => {
                setSubmitModalOpen(false);
                setLogisticsMethod('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitSample}
              disabled={!logisticsMethod}
              className="bg-orange-600 hover:bg-orange-700"
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
