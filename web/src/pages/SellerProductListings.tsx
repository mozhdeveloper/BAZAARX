import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/sellerStore';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  DollarSign,
} from 'lucide-react';

interface ProductListing {
  id: string;
  sku: string;
  name: string;
  image: string;
  price: number;
  stock: number;
  vendorSubmittedCategory: string;
  adminReclassifiedCategory?: string;
  finalCategory: string;
  vendorExpectedFee: number;
  actualFee: number;
  status: 'approved' | 'pending' | 'reclassified' | 'rejected';
  rejectionReason?: string;
  submittedDate: string;
}

// Mock Data - The 3 Scenarios
const mockProducts: ProductListing[] = [
  {
    id: 'P001',
    sku: 'SKU-TSHIRT-001',
    name: 'Cotton T-Shirt',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop',
    price: 499,
    stock: 120,
    vendorSubmittedCategory: 'Fashion',
    finalCategory: 'Fashion',
    vendorExpectedFee: 8,
    actualFee: 8,
    status: 'approved',
    submittedDate: '2024-12-20',
  },
  {
    id: 'P002',
    sku: 'SKU-SERUM-002',
    name: 'Vitamin C Serum',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=100&h=100&fit=crop',
    price: 899,
    stock: 50,
    vendorSubmittedCategory: 'Accessories', // Vendor tried to cheat
    adminReclassifiedCategory: 'Beauty', // Admin caught it
    finalCategory: 'Beauty',
    vendorExpectedFee: 6, // What vendor hoped to pay
    actualFee: 12, // What they actually have to pay
    status: 'reclassified',
    submittedDate: '2024-12-21',
  },
  {
    id: 'P003',
    sku: 'SKU-WATCH-003',
    name: 'Fake Rolex',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop',
    price: 2999,
    stock: 0,
    vendorSubmittedCategory: 'Accessories',
    finalCategory: 'Accessories',
    vendorExpectedFee: 6,
    actualFee: 6,
    status: 'rejected',
    rejectionReason: 'Prohibited Item / Counterfeit',
    submittedDate: '2024-12-22',
  },
  // Additional products for variety
  {
    id: 'P004',
    sku: 'SKU-HEADPHONES-004',
    name: 'Wireless Earbuds Pro',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&h=100&fit=crop',
    price: 1499,
    stock: 75,
    vendorSubmittedCategory: 'Electronics',
    finalCategory: 'Electronics',
    vendorExpectedFee: 10,
    actualFee: 10,
    status: 'approved',
    submittedDate: '2024-12-19',
  },
  {
    id: 'P005',
    sku: 'SKU-PENDING-005',
    name: 'Leather Wallet',
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=100&h=100&fit=crop',
    price: 799,
    stock: 30,
    vendorSubmittedCategory: 'Accessories',
    finalCategory: 'Accessories',
    vendorExpectedFee: 6,
    actualFee: 6,
    status: 'pending',
    submittedDate: '2024-12-23',
  },
];

// Logo components defined outside of render


const SellerProductListings = () => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { seller, logout } = useAuthStore();
  const navigate = useNavigate();



  // Filter products based on active tab
  const filteredProducts = mockProducts.filter((product) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return product.status === 'approved';
    if (activeTab === 'pending') return product.status === 'pending';
    if (activeTab === 'attention')
      return product.status === 'reclassified' || product.status === 'rejected';
    return true;
  });

  // Status Badge Component
  const StatusBadge = ({ status }: { status: ProductListing['status'] }) => {
    const variants = {
      approved: {
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 hover:bg-green-100',
        icon: <CheckCircle className="w-3 h-3 mr-1" />,
        text: 'Approved'
      },
      pending: {
        variant: 'outline' as const,
        className: 'border-yellow-500 text-yellow-700',
        icon: <AlertTriangle className="w-3 h-3 mr-1" />,
        text: 'Pending Review'
      },
      reclassified: {
        variant: 'default' as const,
        className: 'bg-orange-100 text-[#FF5722] hover:bg-orange-100',
        icon: <AlertTriangle className="w-3 h-3 mr-1" />,
        text: 'Category Adjusted'
      },
      rejected: {
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 hover:bg-red-100',
        icon: <XCircle className="w-3 h-3 mr-1" />,
        text: 'Rejected'
      },
    };

    const config = variants[status];

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      <SellerSidebar />

      <div className="p-2 md:p-8 bg-gray-50 flex-1 w-full h-full overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Status</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track your product submissions and approval status
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-[#FF5722] data-[state=active]:text-white"
              >
                All
                <Badge variant="secondary" className="ml-2 bg-gray-100">
                  {mockProducts.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="data-[state=active]:bg-[#FF5722] data-[state=active]:text-white"
              >
                Active
                <Badge variant="secondary" className="ml-2 bg-gray-100">
                  {mockProducts.filter(p => p.status === 'approved').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="data-[state=active]:bg-[#FF5722] data-[state=active]:text-white"
              >
                Pending Review
                <Badge variant="secondary" className="ml-2 bg-gray-100">
                  {mockProducts.filter(p => p.status === 'pending').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="attention"
                className="data-[state=active]:bg-[#FF5722] data-[state=active]:text-white"
              >
                Needs Attention
                <Badge variant="secondary" className="ml-2 bg-gray-100">
                  {mockProducts.filter(p => p.status === 'reclassified' || p.status === 'rejected').length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 border-b border-gray-200">
                        <TableHead className="font-semibold text-gray-700">Product Details</TableHead>
                        <TableHead className="font-semibold text-gray-700">Price & Stock</TableHead>
                        <TableHead className="font-semibold text-gray-700">Category & Fee</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                            No products found in this category
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product) => (
                          <TableRow
                            key={product.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            {/* Product Details */}
                            <TableCell className="py-4">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                                />
                                <div>
                                  <p className="font-semibold text-gray-900">{product.name}</p>
                                  <p className="text-sm text-gray-500">{product.sku}</p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Price & Stock */}
                            <TableCell>
                              <div>
                                <p className="font-semibold text-gray-900">₱{product.price.toLocaleString()}</p>
                                <p className="text-sm text-gray-500">{product.stock} units</p>
                              </div>
                            </TableCell>

                            {/* Category & Fee - The Truth Column */}
                            <TableCell>
                              <div className="space-y-1">
                                {/* Category Display */}
                                {product.adminReclassifiedCategory ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-400 line-through">
                                      {product.vendorSubmittedCategory}
                                    </span>
                                    <span className="text-sm font-bold text-[#FF5722]">
                                      {product.finalCategory}
                                    </span>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <AlertTriangle className="w-4 h-4 text-[#FF5722]" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">Category reclassified by admin</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-700 font-medium">
                                    {product.finalCategory}
                                  </p>
                                )}

                                {/* Fee Display */}
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3 text-gray-400" />
                                  {product.actualFee > product.vendorExpectedFee ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <span className="text-sm font-bold text-[#FF5722]">
                                            {product.actualFee}% fee
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">
                                            Fee adjusted from {product.vendorExpectedFee}% to {product.actualFee}%
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <span className="text-sm text-gray-600">
                                      {product.actualFee}% fee
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={product.status} />
                                {product.status === 'rejected' && product.rejectionReason && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="text-xs font-semibold">Reason:</p>
                                        <p className="text-xs">{product.rejectionReason}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="cursor-pointer">
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Fee Breakdown
                                  </DropdownMenuItem>
                                  {product.status !== 'rejected' && (
                                    <DropdownMenuItem className="cursor-pointer">
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className="cursor-pointer text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              {activeTab === 'attention' && filteredProducts.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProducts.some(p => p.status === 'reclassified') && (
                    <Card className="border-orange-200 bg-orange-50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-[#FF5722] mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">Category Adjustments</h3>
                            <p className="text-sm text-gray-600">
                              Some products were reclassified to the correct category.
                              The platform fee has been adjusted accordingly.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {filteredProducts.some(p => p.status === 'rejected') && (
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">Rejected Items</h3>
                            <p className="text-sm text-gray-600">
                              These products violated our policies. Please review the rejection reasons
                              and contact support if you have questions.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default SellerProductListings;
