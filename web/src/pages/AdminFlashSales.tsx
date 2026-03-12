import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import { useProductStore } from '../stores/sellerStore';
import { discountService } from '../services/discountService';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Zap,
  Calendar,
  Edit,
  Trash2,
  Play,
  Pause,
  Clock,
  X,
  Check,
} from 'lucide-react';

interface FlashSale {
  id: string;
  name: string;
  products: FlashSaleProduct[];
  startDate: Date;
  endDate: Date;
  status: 'scheduled' | 'active' | 'ended';
  totalProducts: number;
  totalRevenue: number;
  createdBy: string;
}

interface FlashSaleProduct {
  id: string;
  productId: string;
  productName: string;
  seller: string;
  image: string;
  originalPrice: number;
  flashPrice: number;
  discount: number;
  stock: number;
  sold: number;
}

const AdminFlashSales: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const { products: allStoreProducts, fetchProducts } = useProductStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'active' | 'ended'>('all');

  // Product Picker state
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    productId: string;
    productName: string;
    image: string;
    originalPrice: number;
    flashPrice: number;
  }>>([]);

  // Flash Sale form state
  const [saleName, setSaleName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit state
  const [editSale, setEditSale] = useState<FlashSale | null>(null);
  const [editName, setEditName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editProducts, setEditProducts] = useState<FlashSaleProduct[]>([]);
  const [editProductSearch, setEditProductSearch] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleCreateFlashSale = async () => {
    if (!saleName.trim()) { alert('Please enter a flash sale name'); return; }
    if (!startDate || !endDate) { alert('Please set start and end dates'); return; }
    if (selectedProducts.length === 0) { alert('Please add at least one product'); return; }

    setIsCreating(true);
    try {
      // 1. Create the platform-level campaign (no seller_id — covers products from any seller)
      const campaign = await discountService.createCampaign({
        name: saleName,
        campaignType: 'flash_sale',
        discountType: 'fixed_amount', // DB requires 'fixed_amount', not 'fixed'
        discountValue: 1,             // DB requires > 0; per-product overrides carry real prices
        startsAt: new Date(startDate),
        endsAt: new Date(endDate),
        badgeText: 'Flash Sale',
        badgeColor: '#FF0000',
        appliesTo: 'specific_products',
      });

      // 2. Add products with their flash prices
      const overrides = selectedProducts.map(p => ({
        productId: p.productId,
        discountType: 'fixed_amount' as string,
        discountValue: Math.max(1, p.originalPrice - p.flashPrice),
      }));

      await discountService.addProductsToCampaign(
        campaign.id,
        campaign.id, // no seller filter needed for platform campaigns
        selectedProducts.map(p => p.productId),
        overrides
      );

      setSelectedProducts([]);
      setShowCreateModal(false);
      setSaleName('');
      setStartDate('');
      setEndDate('');
      await loadFlashSales();
      alert('Flash sale created successfully!');
    } catch (err: any) {
      console.error('Failed to create flash sale:', err);
      alert('Failed to create flash sale: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditSave = async () => {
    if (!editSale) return;
    if (!editName.trim()) { alert('Please enter a name'); return; }
    if (!editStartDate || !editEndDate) { alert('Please set start and end dates'); return; }
    if (editProducts.length === 0) { alert('Please keep at least one product'); return; }
    setIsSavingEdit(true);
    try {
      // Update campaign metadata
      await discountService.updateCampaign(editSale.id, {
        name: editName,
        startsAt: new Date(editStartDate),
        endsAt: new Date(editEndDate),
      });

      // Replace all product discounts with new list
      const overrides = editProducts.map(p => ({
        productId: p.productId,
        discountType: 'fixed_amount' as string,
        discountValue: Math.max(1, p.originalPrice - p.flashPrice),
      }));
      await discountService.addProductsToCampaign(
        editSale.id,
        editSale.id, // sellerId not needed — addProductsToCampaign ignores it
        editProducts.map(p => p.productId),
        overrides,
      );

      // Update local state
      setFlashSales(prev => prev.map(s => s.id === editSale.id
        ? {
          ...s,
          name: editName,
          startDate: new Date(editStartDate),
          endDate: new Date(editEndDate),
          products: editProducts,
          totalProducts: editProducts.length,
          totalRevenue: editProducts.reduce((sum, p) => sum + p.flashPrice * p.sold, 0),
        }
        : s
      ));
      setEditSale(null);
      setEditProducts([]);
    } catch (err: any) {
      alert('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const updateEditFlashPrice = (productId: string, price: number) => {
    setEditProducts(prev => prev.map(p =>
      p.productId === productId
        ? { ...p, flashPrice: price, discount: p.originalPrice > 0 ? Math.round(((p.originalPrice - price) / p.originalPrice) * 100) : 0 }
        : p
    ));
  };

  const removeEditProduct = (productId: string) => {
    setEditProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const addEditProduct = (product: any) => {
    const alreadyIn = editProducts.some(p => p.productId === product.id);
    if (alreadyIn) return;
    const orig = product.price || 0;
    const flash = Math.round(orig * 0.8);
    setEditProducts(prev => [...prev, {
      id: '',
      productId: product.id,
      productName: product.name,
      seller: product.storeName || '',
      image: product.images?.[0] || product.image || '',
      originalPrice: orig,
      flashPrice: flash,
      discount: orig > 0 ? Math.round(((orig - flash) / orig) * 100) : 0,
      stock: 0,
      sold: 0,
    }]);
    setEditProductSearch('');
  };

  useEffect(() => {
    fetchProducts({});
  }, []);

  const availableProducts = useMemo(() => {
    const selectedIds = new Set(selectedProducts.map(p => p.productId));
    return (allStoreProducts || [])
      .filter(p => !selectedIds.has(p.id))
      .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
      .slice(0, 10);
  }, [allStoreProducts, productSearch, selectedProducts]);

  const editAvailableProducts = useMemo(() => {
    const inIds = new Set(editProducts.map(p => p.productId));
    return (allStoreProducts || [])
      .filter(p => !inIds.has(p.id))
      .filter(p => !editProductSearch || p.name.toLowerCase().includes(editProductSearch.toLowerCase()))
      .slice(0, 10);
  }, [allStoreProducts, editProductSearch, editProducts]);

  const addProduct = (product: any) => {
    setSelectedProducts(prev => [...prev, {
      productId: product.id,
      productName: product.name,
      image: product.images?.[0] || product.image || '',
      originalPrice: product.price || 0,
      flashPrice: Math.round((product.price || 0) * 0.8), // Default 20% off
    }]);
    setProductSearch('');
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const updateFlashPrice = (productId: string, price: number) => {
    setSelectedProducts(prev => prev.map(p =>
      p.productId === productId ? { ...p, flashPrice: price } : p
    ));
  };

  // Flash sales loaded from DB
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(true);

  // Load flash sales from database
  const loadFlashSales = async () => {
    setIsLoadingSales(true);
    try {
      const campaigns = await discountService.getAllFlashSales();

      // Load product details for each campaign
      const salesWithProducts: FlashSale[] = await Promise.all(
        campaigns.map(async (campaign) => {
          let products: FlashSaleProduct[] = [];
          try {
            const productDiscounts = await discountService.getProductsInCampaign(campaign.id);
            products = productDiscounts.map((pd) => ({
              id: pd.id,
              productId: pd.productId,
              productName: pd.productName || 'Unknown Product',
              seller: pd.productSellerName || '',
              image: pd.productImage || '',
              originalPrice: pd.productPrice || 0,
              flashPrice: pd.productPrice && pd.overrideDiscountValue
                ? pd.productPrice - pd.overrideDiscountValue
                : pd.productPrice || 0,
              discount: pd.productPrice && pd.overrideDiscountValue
                ? Math.round((pd.overrideDiscountValue / pd.productPrice) * 100)
                : 0,
              stock: pd.productStock || 0,
              sold: pd.soldCount || 0,
            }));
          } catch { /* ignore product load errors */ }

          // Determine status from campaign status
          let status: 'scheduled' | 'active' | 'ended' = 'scheduled';
          if (campaign.status === 'active') status = 'active';
          else if (campaign.status === 'ended' || campaign.status === 'cancelled') status = 'ended';
          else if (campaign.status === 'paused') status = 'scheduled';

          return {
            id: campaign.id,
            name: campaign.name,
            products,
            startDate: new Date(campaign.startsAt),
            endDate: new Date(campaign.endsAt),
            status,
            totalProducts: products.length,
            totalRevenue: products.reduce((sum, p) => sum + p.flashPrice * p.sold, 0),
            createdBy: 'Admin',
          };
        })
      );

      setFlashSales(salesWithProducts);
    } catch (err) {
      console.error('Failed to load flash sales:', err);
    } finally {
      setIsLoadingSales(false);
    }
  };

  useEffect(() => {
    loadFlashSales();
  }, []);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const filteredFlashSales = flashSales.filter(sale => {
    const matchesSearch = sale.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' ? true : sale.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleDeleteFlashSale = async (saleId: string) => {
    if (confirm('Are you sure you want to delete this flash sale?')) {
      try {
        await discountService.deleteCampaign(saleId);
        setFlashSales(prev => prev.filter(s => s.id !== saleId));
      } catch (err: any) {
        console.error('Failed to delete flash sale:', err);
        alert('Failed to delete: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const handleToggleStatus = async (saleId: string) => {
    const sale = flashSales.find(s => s.id === saleId);
    if (!sale) return;
    const shouldPause = sale.status === 'active';
    try {
      await discountService.toggleCampaignStatus(saleId, shouldPause);
      setFlashSales(prev =>
        prev.map(s =>
          s.id === saleId
            ? { ...s, status: (shouldPause ? 'scheduled' : 'active') as 'active' | 'scheduled' | 'ended' }
            : s
        )
      );
    } catch (err: any) {
      console.error('Failed to toggle flash sale status:', err);
      alert('Failed to update status: ' + (err.message || 'Unknown error'));
    }
  };

  const stats = {
    total: flashSales.length,
    scheduled: flashSales.filter(s => s.status === 'scheduled').length,
    active: flashSales.filter(s => s.status === 'active').length,
    ended: flashSales.filter(s => s.status === 'ended').length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'active': return 'bg-green-100 text-green-700';
      case 'ended': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">Flash Sales Management</h1>
              <p className="text-[var(--text-muted)]">Create and manage time-limited promotional sales</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#FF6A00] hover:bg-[#E55D00]"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Flash Sale
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Flash Sales', value: stats.total, icon: Zap },
              { label: 'Scheduled', value: stats.scheduled, icon: Calendar },
              { label: 'Active', value: stats.active, icon: Play },
              { label: 'Ended', value: stats.ended, icon: Clock }
            ].map((stat, index) => (
              <Card key={index} className="border-none shadow-md hover:shadow-[0_20px_40px_rgba(229,140,26,0.1)] transition-all duration-300 rounded-xl bg-white overflow-hidden group relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-[var(--brand-accent-light)] transition-colors"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex flex-col">
                    <div className="mb-4 text-gray-500 group-hover:text-[var(--brand-accent)] transition-all">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                      <div className="flex items-end gap-3 mt-1">
                        <p className="text-2xl font-black text-gray-900 tracking-tight transition-all group-hover:text-[var(--brand-accent)]">{stat.value}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search flash sales..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('all')}
                    className={filterStatus === 'all' ? 'bg-[#FF6A00] hover:bg-[#E55D00]' : ''}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterStatus === 'scheduled' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('scheduled')}
                    className={filterStatus === 'scheduled' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  >
                    Scheduled
                  </Button>
                  <Button
                    variant={filterStatus === 'active' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('active')}
                    className={filterStatus === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    Active
                  </Button>
                  <Button
                    variant={filterStatus === 'ended' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('ended')}
                    className={filterStatus === 'ended' ? 'bg-gray-600 hover:bg-gray-700' : ''}
                  >
                    Ended
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flash Sales List */}
          <div className="grid gap-6">
            {filteredFlashSales.map((sale) => (
              <Card key={sale.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Section - Sale Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Zap className="h-6 w-6 text-orange-500" />
                            <h3 className="text-xl font-semibold text-gray-900">{sale.name}</h3>
                            <Badge className={getStatusColor(sale.status)}>
                              {sale.status.toUpperCase()}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <p className="text-sm text-gray-600">Products</p>
                              <p className="text-lg font-semibold text-gray-900">{sale.totalProducts}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Revenue</p>
                              <p className="text-lg font-semibold text-green-600">
                                ₱{sale.totalRevenue.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Start Date</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(sale.startDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">End Date</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(sale.endDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Products in Flash Sale */}
                      {sale.products.length > 0 && (
                        <div className="mt-4 border-t pt-4">
                          <h4 className="font-semibold text-gray-900 mb-3">
                            Featured Products
                            <span className="ml-2 text-sm font-normal text-gray-500">({sale.products.length})</span>
                          </h4>

                          {sale.products.length <= 10 ? (
                            /* Image grid for ≤ 10 products */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {sale.products.map((product) => (
                                <div key={product.id} className="flex gap-3 bg-gray-50 rounded-lg p-3">
                                  <img
                                    src={product.image}
                                    alt={product.productName}
                                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                    onError={(e) => {
                                      const t = e.currentTarget;
                                      t.onerror = null;
                                      t.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.productName)}&size=64&background=f3f4f6&color=374151`;
                                    }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 text-sm truncate">{product.productName}</p>
                                    <p className="text-xs text-gray-600 truncate">{product.seller}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-gray-500 line-through">₱{product.originalPrice}</span>
                                      <span className="text-sm font-bold text-red-600">₱{product.flashPrice}</span>
                                      <Badge variant="outline" className="text-xs">-{product.discount}%</Badge>
                                    </div>
                                    {sale.status === 'active' && (
                                      <p className="text-xs text-gray-600 mt-1">
                                        Sold: {product.sold}/{product.stock}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* Compact list for > 10 products */
                            <div className="divide-y divide-gray-100 rounded-lg border overflow-hidden">
                              {sale.products.map((product) => (
                                <div key={product.id} className="flex items-center justify-between px-3 py-2 bg-white hover:bg-gray-50 text-sm">
                                  <span className="text-gray-900 font-medium truncate flex-1 mr-3">{product.productName}</span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-gray-400 line-through text-xs">₱{product.originalPrice}</span>
                                    <span className="font-bold text-red-600">₱{product.flashPrice}</span>
                                    <Badge variant="outline" className="text-xs">-{product.discount}%</Badge>
                                    {sale.status === 'active' && (
                                      <span className="text-xs text-gray-500">{product.sold}/{product.stock} sold</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Section - Actions */}
                    <div className="lg:w-48 flex flex-col gap-2">
                      {sale.status === 'scheduled' && (
                        <Button
                          onClick={() => handleToggleStatus(sale.id)}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Now
                        </Button>
                      )}
                      {sale.status === 'active' && (
                        <Button
                          onClick={() => handleToggleStatus(sale.id)}
                          variant="outline"
                          className="w-full"
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                      )}
                      {sale.status !== 'ended' && (
                        <>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setEditSale(sale);
                              setEditName(sale.name);
                              setEditProducts([...sale.products]);
                              setEditProductSearch('');
                              // Convert dates to datetime-local format
                              const toLocal = (d: Date) => {
                                const pad = (n: number) => String(n).padStart(2, '0');
                                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                              };
                              setEditStartDate(toLocal(new Date(sale.startDate)));
                              setEditEndDate(toLocal(new Date(sale.endDate)));
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDeleteFlashSale(sale.id)}
                            className="w-full text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </>
                      )}
                      {sale.status === 'ended' && (
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled
                        >
                          Sale Ended
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredFlashSales.length === 0 && (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No flash sales found</p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 bg-[#FF6A00] hover:bg-[#E55D00]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Flash Sale
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create Flash Sale Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Flash Sale</h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="saleName">Flash Sale Name</Label>
                  <Input
                    id="saleName"
                    placeholder="e.g., Weekend Mega Deal"
                    value={saleName}
                    onChange={(e) => setSaleName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Select Products</Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Search and add products to include in this flash sale
                  </p>

                  {/* Product Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products by name..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9"
                    />
                    {productSearch && availableProducts.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {availableProducts.map((p: any) => (
                          <button
                            key={p.id}
                            onClick={() => addProduct(p)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                          >
                            <img src={p.images?.[0] || p.image || ''} alt="" className="w-8 h-8 rounded object-cover bg-gray-100" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                              <p className="text-xs text-gray-500">₱{(p.price || 0).toLocaleString()}</p>
                            </div>
                            <Plus className="h-4 w-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Products with Flash Price */}
                  {selectedProducts.length > 0 && (
                    <div className="space-y-2 border border-gray-200 rounded-lg p-3">
                      <div className="grid grid-cols-[1fr,100px,100px,32px] gap-2 text-xs font-bold text-gray-500 px-1">
                        <span>Product</span>
                        <span>Original</span>
                        <span>Flash Price</span>
                        <span></span>
                      </div>
                      {selectedProducts.map((p) => {
                        const discount = p.originalPrice > 0 ? Math.round(((p.originalPrice - p.flashPrice) / p.originalPrice) * 100) : 0;
                        return (
                          <div key={p.productId} className="grid grid-cols-[1fr,100px,100px,32px] gap-2 items-center bg-gray-50 rounded-lg px-2 py-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={p.image} alt="" className="w-7 h-7 rounded object-cover bg-gray-200" />
                              <span className="text-sm font-medium text-gray-900 truncate">{p.productName}</span>
                            </div>
                            <span className="text-sm text-gray-500">₱{p.originalPrice.toLocaleString()}</span>
                            <div className="relative">
                              <Input
                                type="number"
                                value={p.flashPrice}
                                onChange={(e) => updateFlashPrice(p.productId, Number(e.target.value))}
                                className="h-8 text-sm font-bold text-[#FF6A00] pr-1"
                                min={1}
                                max={p.originalPrice}
                              />
                              {discount > 0 && (
                                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] px-1 py-0 border-0">
                                  -{discount}%
                                </Badge>
                              )}
                            </div>
                            <button onClick={() => removeProduct(p.productId)} className="text-gray-400 hover:text-red-500">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedProducts.length === 0 && !productSearch && (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                      <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Search and add products above</p>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Tips for Flash Sales:</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Set competitive discounts (20-50% off)</li>
                    <li>Choose high-demand products</li>
                    <li>Schedule during peak shopping hours</li>
                    <li>Limit quantities to create urgency</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleCreateFlashSale}
                  disabled={isCreating}
                  className="flex-1 bg-[#FF6A00] hover:bg-[#E55D00]"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isCreating ? 'Creating...' : 'Create Flash Sale'}
                </Button>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Flash Sale Modal */}
      {editSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Edit Flash Sale</h2>
                <button onClick={() => setEditSale(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <Label htmlFor="editName">Flash Sale Name</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editStart">Start Date</Label>
                    <Input
                      id="editStart"
                      type="datetime-local"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editEnd">End Date</Label>
                    <Input
                      id="editEnd"
                      type="datetime-local"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Per-item product editing */}
                <div>
                  <Label>Products &amp; Flash Prices</Label>
                  <p className="text-xs text-gray-500 mb-2">Adjust flash prices or remove/add products.</p>

                  {/* Add product search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search to add a product..."
                      value={editProductSearch}
                      onChange={(e) => setEditProductSearch(e.target.value)}
                      className="pl-9"
                    />
                    {editProductSearch && editAvailableProducts.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {editAvailableProducts.map((p: any) => (
                          <button
                            key={p.id}
                            onClick={() => addEditProduct(p)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                          >
                            <img src={p.images?.[0] || p.image || ''} alt="" className="w-8 h-8 rounded object-cover bg-gray-100" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                              <p className="text-xs text-gray-500">₱{(p.price || 0).toLocaleString()}</p>
                            </div>
                            <Plus className="h-4 w-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Product list with editable flash prices */}
                  {editProducts.length > 0 ? (
                    <div className="space-y-2 border border-gray-200 rounded-lg p-3">
                      <div className="grid grid-cols-[1fr,90px,110px,32px] gap-2 text-xs font-bold text-gray-500 px-1 mb-1">
                        <span>Product</span>
                        <span>Original</span>
                        <span>Flash Price</span>
                        <span></span>
                      </div>
                      {editProducts.map((p) => {
                        const disc = p.originalPrice > 0
                          ? Math.round(((p.originalPrice - p.flashPrice) / p.originalPrice) * 100)
                          : 0;
                        return (
                          <div key={p.productId} className="grid grid-cols-[1fr,90px,110px,32px] gap-2 items-center bg-gray-50 rounded-lg px-2 py-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={p.image}
                                alt=""
                                className="w-7 h-7 rounded object-cover bg-gray-200 flex-shrink-0"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.productName)}&size=28&background=f3f4f6&color=374151`; }}
                              />
                              <span className="text-sm font-medium text-gray-900 truncate">{p.productName}</span>
                            </div>
                            <span className="text-sm text-gray-500">₱{p.originalPrice.toLocaleString()}</span>
                            <div className="relative">
                              <Input
                                type="number"
                                value={p.flashPrice}
                                onChange={(e) => updateEditFlashPrice(p.productId, Number(e.target.value))}
                                className="h-8 text-sm font-bold text-[#FF6A00] pr-1"
                                min={1}
                                max={p.originalPrice}
                              />
                              {disc > 0 && (
                                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] px-1 py-0 border-0">
                                  -{disc}%
                                </Badge>
                              )}
                            </div>
                            <button
                              onClick={() => removeEditProduct(p.productId)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                      <p className="text-sm text-gray-500">No products — search above to add some.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleEditSave}
                  disabled={isSavingEdit}
                  className="flex-1 bg-[#FF6A00] hover:bg-[#E55D00]"
                >
                  {isSavingEdit ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => { setEditSale(null); setEditProducts([]); }}
                  variant="outline"
                  disabled={isSavingEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminFlashSales;
