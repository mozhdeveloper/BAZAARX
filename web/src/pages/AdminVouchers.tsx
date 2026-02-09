import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth, useAdminVouchers } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Ticket,
  Percent,
  DollarSign,
  Truck,
  Calendar,
  Users,
  TrendingUp,
  Copy,
  Loader2
} from 'lucide-react';

const AdminVouchers: React.FC = () => {
  const [currentTime] = React.useState(() => Date.now());
  const { isAuthenticated } = useAdminAuth();
  const {
    vouchers,
    selectedVoucher,
    isLoading,
    loadVouchers,
    addVoucher,
    updateVoucher,
    deleteVoucher,
    toggleVoucherStatus,
    selectVoucher
  } = useAdminVouchers();

  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'fixed' | 'free_shipping'>('all');

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'free_shipping',
    value: 0,
    minPurchase: 0,
    maxDiscount: undefined as number | undefined,
    usageLimit: 1000,
    startDate: new Date(),
    endDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    applicableTo: 'all' as 'all' | 'category' | 'seller' | 'product',
    targetIds: [] as string[]
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadVouchers();
    }
  }, [isAuthenticated, loadVouchers]);

  useEffect(() => {
    if (selectedVoucher && showEditDialog) {
      setFormData({
        code: selectedVoucher.code,
        title: selectedVoucher.title,
        description: selectedVoucher.description,
        type: selectedVoucher.type,
        value: selectedVoucher.value,
        minPurchase: selectedVoucher.minPurchase,
        maxDiscount: selectedVoucher.maxDiscount,
        usageLimit: selectedVoucher.usageLimit,
        startDate: selectedVoucher.startDate,
        endDate: selectedVoucher.endDate,
        isActive: selectedVoucher.isActive,
        applicableTo: selectedVoucher.applicableTo,
        targetIds: selectedVoucher.targetIds || []
      });
    }
  }, [selectedVoucher, showEditDialog]);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const filteredVouchers = vouchers.filter(voucher => {
    const matchesSearch = voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voucher.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && voucher.isActive) ||
      (statusFilter === 'inactive' && !voucher.isActive);
    const matchesType = typeFilter === 'all' || voucher.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  const resetForm = () => {
    setFormData({
      code: '',
      title: '',
      description: '',
      type: 'percentage',
      value: 0,
      minPurchase: 0,
      maxDiscount: undefined,
      usageLimit: 1000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      applicableTo: 'all',
      targetIds: []
    });
  };

  const handleAddVoucher = async () => {
    try {
      await addVoucher(formData);
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error adding voucher:', error);
    }
  };

  const handleEditVoucher = async () => {
    if (!selectedVoucher) return;

    try {
      await updateVoucher(selectedVoucher.id, formData);
      setShowEditDialog(false);
      selectVoucher(null);
      resetForm();
    } catch (error) {
      console.error('Error updating voucher:', error);
    }
  };

  const handleDeleteVoucher = async () => {
    if (!selectedVoucher) return;

    try {
      await deleteVoucher(selectedVoucher.id);
      setShowDeleteDialog(false);
      selectVoucher(null);
    } catch (error) {
      console.error('Error deleting voucher:', error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleVoucherStatus(id);
    } catch (error) {
      console.error('Error toggling voucher status:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage': return <Percent className="w-4 h-4" />;
      case 'fixed': return <DollarSign className="w-4 h-4" />;
      case 'free_shipping': return <Truck className="w-4 h-4" />;
      default: return <Ticket className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      percentage: { label: 'Percentage', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      fixed: { label: 'Fixed Amount', className: 'bg-green-100 text-green-700 border-green-200' },
      free_shipping: { label: 'Free Shipping', className: 'bg-purple-100 text-purple-700 border-purple-200' }
    };
    const { label, className } = config[type] || { label: type, className: '' };
    return <Badge className={className}>{label}</Badge>;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatValue = (voucher: any) => {
    if (voucher.type === 'percentage') return `${voucher.value}% OFF`;
    if (voucher.type === 'fixed') return `₱${voucher.value} OFF`;
    return 'FREE SHIPPING';
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const activeVouchers = vouchers.filter(v => v.isActive).length;
  const totalUsage = vouchers.reduce((sum, v) => sum + v.usedCount, 0);
  const expiringSoon = vouchers.filter(v => {
    const daysLeft = Math.ceil((new Date(v.endDate).getTime() - currentTime) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 && daysLeft <= 7;
  }).length;

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Voucher Management</h1>
                <p className="text-gray-600 mt-1">Create and manage discount vouchers</p>
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setShowAddDialog(true);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Voucher
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Vouchers</p>
                        <p className="text-2xl font-bold text-gray-900">{vouchers.length}</p>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Ticket className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Active Vouchers</p>
                        <p className="text-2xl font-bold text-gray-900">{activeVouchers}</p>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Usage</p>
                        <p className="text-2xl font-bold text-gray-900">{totalUsage.toLocaleString()}</p>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Expiring Soon</p>
                        <p className="text-2xl font-bold text-gray-900">{expiringSoon}</p>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        placeholder="Search vouchers by code or title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as 'all' | 'percentage' | 'fixed' | 'free_shipping')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">All Types</option>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Vouchers Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            ) : filteredVouchers.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No vouchers found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first voucher to get started'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredVouchers.map((voucher, index) => {
                    const daysLeft = Math.ceil((new Date(voucher.endDate).getTime() - currentTime) / (1000 * 60 * 60 * 24));
                    const usagePercentage = (voucher.usedCount / voucher.usageLimit) * 100;

                    return (
                      <motion.div
                        key={voucher.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        layout
                      >
                        <Card className={`hover:shadow-lg transition-all duration-300 ${!voucher.isActive ? 'opacity-60' : ''}`}>
                          <CardContent className="p-6">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white">
                                  {getTypeIcon(voucher.type)}
                                </div>
                                <div>
                                  {getTypeBadge(voucher.type)}
                                </div>
                              </div>
                              <Switch
                                checked={voucher.isActive}
                                onCheckedChange={() => handleToggleStatus(voucher.id)}
                              />
                            </div>

                            {/* Code */}
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-xl font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">
                                  {voucher.code}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyCode(voucher.code)}
                                  className="p-1 h-8 w-8"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Title & Description */}
                            <h3 className="font-semibold text-gray-900 mb-1">{voucher.title}</h3>
                            <p className="text-sm text-gray-600 mb-4">{voucher.description}</p>

                            {/* Value */}
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                              <p className="text-2xl font-bold text-gray-900 text-center">
                                {formatValue(voucher)}
                              </p>
                              {voucher.minPurchase > 0 && (
                                <p className="text-xs text-gray-600 text-center mt-1">
                                  Min purchase: ₱{voucher.minPurchase}
                                </p>
                              )}
                              {voucher.maxDiscount && (
                                <p className="text-xs text-gray-600 text-center">
                                  Max discount: ₱{voucher.maxDiscount}
                                </p>
                              )}
                            </div>

                            {/* Usage Stats */}
                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Usage</span>
                                <span>{voucher.usedCount} / {voucher.usageLimit}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Validity */}
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-4">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(voucher.startDate).toLocaleDateString()}
                              </span>
                              <span>to</span>
                              <span>{new Date(voucher.endDate).toLocaleDateString()}</span>
                            </div>

                            {daysLeft > 0 && daysLeft <= 7 && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-4">
                                <p className="text-xs text-yellow-700 text-center">
                                  Expires in {daysLeft} day{daysLeft > 1 ? 's' : ''}
                                </p>
                              </div>
                            )}

                            {daysLeft <= 0 && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-4">
                                <p className="text-xs text-red-700 text-center font-medium">
                                  Expired
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  selectVoucher(voucher);
                                  setShowEditDialog(true);
                                }}
                                className="flex-1"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  selectVoucher(voucher);
                                  setShowDeleteDialog(true);
                                }}
                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Voucher Dialog */}
        <Dialog open={showAddDialog || showEditDialog} onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setShowEditDialog(false);
            selectVoucher(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {showAddDialog ? 'Create New Voucher' : 'Edit Voucher'}
              </DialogTitle>
              <DialogDescription>
                {showAddDialog
                  ? 'Fill in the details to create a new discount voucher'
                  : 'Update the voucher information'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Voucher Code*</Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g., WELCOME20"
                    className="uppercase"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type*</Label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="percentage">Percentage Discount</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Title*</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Welcome Discount"
                />
              </div>

              <div>
                <Label htmlFor="description">Description*</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the voucher benefits"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {formData.type !== 'free_shipping' && (
                  <div>
                    <Label htmlFor="value">
                      {formData.type === 'percentage' ? 'Discount (%)' : 'Amount (₱)'}*
                    </Label>
                    <Input
                      id="value"
                      name="value"
                      type="number"
                      value={formData.value}
                      onChange={handleInputChange}
                      min="0"
                      max={formData.type === 'percentage' ? '100' : undefined}
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="minPurchase">Min Purchase (₱)*</Label>
                  <Input
                    id="minPurchase"
                    name="minPurchase"
                    type="number"
                    value={formData.minPurchase}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                {formData.type === 'percentage' && (
                  <div>
                    <Label htmlFor="maxDiscount">Max Discount (₱)</Label>
                    <Input
                      id="maxDiscount"
                      name="maxDiscount"
                      type="number"
                      value={formData.maxDiscount || ''}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="Optional"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="usageLimit">Usage Limit*</Label>
                  <Input
                    id="usageLimit"
                    name="usageLimit"
                    type="number"
                    value={formData.usageLimit}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="applicableTo">Applicable To*</Label>
                  <select
                    id="applicableTo"
                    name="applicableTo"
                    value={formData.applicableTo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">All Products</option>
                    <option value="category">Specific Categories</option>
                    <option value="seller">Specific Sellers</option>
                    <option value="product">Specific Products</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date*</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate instanceof Date ? formData.startDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date*</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formData.endDate instanceof Date ? formData.endDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={handleSwitchChange}
                />
                <Label htmlFor="isActive">Activate voucher immediately</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setShowEditDialog(false);
                  selectVoucher(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={showAddDialog ? handleAddVoucher : handleEditVoucher}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!formData.code || !formData.title || !formData.description}
              >
                {showAddDialog ? 'Create Voucher' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Voucher?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedVoucher?.code}"? This action cannot be undone.
                Users who have already used this voucher will not be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowDeleteDialog(false);
                selectVoucher(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteVoucher}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminVouchers;
