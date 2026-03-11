import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth, useAdminProducts, AdminProduct } from '../stores/adminStore';
import { useProductQAStore } from '../stores/productQAStore';
import AdminSidebar from '../components/AdminSidebar';
import {
  Search,
  Filter,
  CheckCircle,
  Eye,
  Ban,
  Edit,
  BadgeCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

const AdminProducts: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const { toast } = useToast();
  const { products, isLoading, loadProducts, deactivateProduct, activateProduct } = useAdminProducts();
  const { products: qaProducts } = useProductQAStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'banned'>('all');
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    price: 0,
    stock: 0,
    description: '',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Get verified products from QA store
  const verifiedQAProducts = useMemo(
    () => qaProducts.filter(p => p.status === 'ACTIVE_VERIFIED'),
    [qaProducts]
  );

  // Combine verified QA products with regular admin products
  const combinedProducts: AdminProduct[] = useMemo(() => [
    ...products,
    ...verifiedQAProducts.map(qp => ({
      id: qp.id,
      name: qp.name,
      description: qp.category,
      price: qp.price,
      stock: 0,
      category: qp.category,
      images: [qp.image],
      sellerId: qp.vendor,
      sellerName: qp.vendor,
      status: 'active' as const,
      rating: 0,
      sales: 0,
      createdAt: new Date(qp.verifiedAt || qp.submittedAt || new Date()),
      updatedAt: new Date(qp.verifiedAt || qp.submittedAt || new Date()),
    }))
  ], [products, verifiedQAProducts]);

  const filteredProducts = useMemo(() => {
    return combinedProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sellerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [combinedProducts, searchTerm, statusFilter]);

  // Pagination derived values
  const totalProducts = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginationStart = totalProducts === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const paginationEnd = Math.min(safeCurrentPage * ITEMS_PER_PAGE, totalProducts);
  const paginatedProducts = useMemo(() => filteredProducts.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE,
  ), [filteredProducts, safeCurrentPage]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Scroll to top of table when page changes
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleEditClick = (product: AdminProduct) => {
    setSelectedProduct(product);
    setEditFormData({
      name: product.name,
      price: product.price,
      stock: product.stock,
      description: product.description,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (selectedProduct) {
      // Update logic would go here
      toast({
        title: 'Product Updated',
        description: `${editFormData.name} has been successfully updated.`,
      });
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  const handleDeactivateClick = (product: AdminProduct) => {
    setSelectedProduct(product);
    setDeactivateReason('');
    setIsDeactivateDialogOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (selectedProduct && deactivateReason) {
      await deactivateProduct(selectedProduct.id, deactivateReason);
      setIsDeactivateDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  const handleActivateClick = async (product: AdminProduct) => {
    await activateProduct(product.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'banned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">Products Management</h1>
              <p className="text-[var(--text-muted)]">Monitor and manage product listings across the platform (includes {verifiedQAProducts.length} verified products)</p>
            </div>
          </div>

          {/* Filters + Table wrapper — scroll target for pagination */}
          <div ref={tableContainerRef} className="scroll-mt-4">

            {/* Filters */}
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-center">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <Input
                  placeholder="Search products or sellers..."
                  className="h-9 pl-10 bg-white rounded-xl border-gray-200 focus:ring-0 focus:border-[var(--brand-accent)] placeholder:text-gray-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Filter className="text-gray-400 w-4 h-4" />
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="h-9 w-full sm:w-[140px] bg-white rounded-xl border-gray-200 focus:ring-0 text-gray-600">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="border-none shadow-xl">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-sm font-medium text-[var(--text-secondary)]">Product</th>
                      <th className="px-6 py-3 text-sm font-medium text-[var(--text-secondary)]">Seller</th>
                      <th className="px-6 py-3 text-sm font-medium text-[var(--text-secondary)]">Price</th>
                      <th className="px-6 py-3 text-sm font-medium text-[var(--text-secondary)]">Status</th>
                      <th className="px-6 py-3 text-sm font-medium text-[var(--text-secondary)]">Stats</th>
                      <th className="px-6 py-3 text-sm font-medium text-[var(--text-secondary)] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          Loading products...
                        </td>
                      </tr>
                    ) : totalProducts === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-muted)]">
                          No products found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedProducts.map((product) => (
                        <motion.tr
                          key={product.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                              />
                              <div>
                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                  {product.name}
                                  {verifiedQAProducts.some(qp => qp.id === product.id) && (
                                    <span title="Verified Product">
                                      <BadgeCheck className="w-4 h-4 text-green-600" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">{product.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{product.sellerName}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">₱{product.price.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">Stock: {product.stock}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs text-gray-500">
                              <div>Sales: {product.sales}</div>
                              <div>Rating: {product.rating} ⭐</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditClick(product)}
                                className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                                title="Edit Product"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              {product.status === 'banned' ? (
                                <button
                                  onClick={() => handleActivateClick(product)}
                                  className="p-1 text-green-600 hover:text-green-700 transition-colors"
                                  title="Reactivate Product"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDeactivateClick(product)}
                                  className="p-1 text-red-600 hover:text-red-700 transition-colors"
                                  title="Deactivate Product"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                <span className="text-sm text-gray-500 font-medium">
                  {totalProducts === 0
                    ? "0 products"
                    : `${paginationStart}–${paginationEnd} of ${totalProducts}`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-orange-50 hover:text-[var(--brand-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-orange-100"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage >= totalPages}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-orange-50 hover:text-[var(--brand-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-orange-100"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>{/* end scroll wrapper */}
      </div>

      {/* Deactivate Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent className="border-none">
          <DialogHeader>
            <DialogTitle>Deactivate Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate "{selectedProduct?.name}"? This will hide the product from the marketplace.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="reason" className="mb-2 block">Reason for Deactivation</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Violation of terms, Counterfeit item, etc."
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
              className="w-full"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeactivateDialogOpen(false)}
              className="bg-white border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-600"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeactivate}
              disabled={!deactivateReason}
            >
              Deactivate Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-none scrollbar-hide [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the details for "{selectedProduct?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="edit-name" className="mb-2 block">Product Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-price" className="mb-2 block">Price (₱)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editFormData.price}
                  onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <Label htmlFor="edit-stock" className="mb-2 block">Stock</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={editFormData.stock}
                  onChange={(e) => setEditFormData({ ...editFormData, stock: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description" className="mb-2 block">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="w-full"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="bg-white border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
