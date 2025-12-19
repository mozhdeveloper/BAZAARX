import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
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
  Clock
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
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'active' | 'ended'>('all');

  // Mock flash sales data
  const [flashSales, setFlashSales] = useState<FlashSale[]>([
    {
      id: 'fs-1',
      name: 'Holiday Mega Sale',
      products: [
        {
          id: 'fsp-1',
          productId: 'prod-1',
          productName: 'Fresh Organic Tomatoes',
          seller: 'Maria\'s Fresh Produce',
          image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337',
          originalPrice: 120,
          flashPrice: 89,
          discount: 26,
          stock: 100,
          sold: 67
        },
        {
          id: 'fsp-2',
          productId: 'prod-2',
          productName: 'Handwoven Abaca Bag',
          seller: 'Traditional Crafts PH',
          image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7',
          originalPrice: 450,
          flashPrice: 299,
          discount: 34,
          stock: 50,
          sold: 34
        }
      ],
      startDate: new Date('2024-12-20T00:00:00'),
      endDate: new Date('2024-12-25T23:59:59'),
      status: 'scheduled',
      totalProducts: 2,
      totalRevenue: 0,
      createdBy: 'Admin'
    },
    {
      id: 'fs-2',
      name: 'Weekend Flash Deal',
      products: [
        {
          id: 'fsp-3',
          productId: 'prod-3',
          productName: 'Philippine Coffee Beans',
          seller: 'Mountain Brew Coffee',
          image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e',
          originalPrice: 350,
          flashPrice: 250,
          discount: 29,
          stock: 200,
          sold: 156
        }
      ],
      startDate: new Date('2024-03-15T00:00:00'),
      endDate: new Date('2024-03-17T23:59:59'),
      status: 'active',
      totalProducts: 1,
      totalRevenue: 39000,
      createdBy: 'Admin'
    },
    {
      id: 'fs-3',
      name: 'New Year Blowout',
      products: [],
      startDate: new Date('2024-01-01T00:00:00'),
      endDate: new Date('2024-01-05T23:59:59'),
      status: 'ended',
      totalProducts: 5,
      totalRevenue: 125000,
      createdBy: 'Admin'
    }
  ]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const filteredFlashSales = flashSales.filter(sale => {
    const matchesSearch = sale.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' ? true : sale.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleDeleteFlashSale = (saleId: string) => {
    if (confirm('Are you sure you want to delete this flash sale?')) {
      setFlashSales(prev => prev.filter(s => s.id !== saleId));
    }
  };

  const handleToggleStatus = (saleId: string) => {
    setFlashSales(prev => 
      prev.map(s => 
        s.id === saleId 
          ? { ...s, status: s.status === 'active' ? 'scheduled' : 'active' as any }
          : s
      )
    );
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
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Flash Sales Management</h1>
              <p className="text-gray-600">Create and manage time-limited promotional sales</p>
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
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Flash Sales</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                  </div>
                  <Zap className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Scheduled</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{stats.scheduled}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
                  </div>
                  <Play className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ended</p>
                    <p className="text-2xl font-bold text-gray-600 mt-1">{stats.ended}</p>
                  </div>
                  <Clock className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
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
                          <h4 className="font-semibold text-gray-900 mb-3">Featured Products</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sale.products.map((product) => (
                              <div key={product.id} className="flex gap-3 bg-gray-50 rounded-lg p-3">
                                <img 
                                  src={product.image} 
                                  alt={product.productName}
                                  className="w-16 h-16 rounded-lg object-cover"
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-sm">{product.productName}</p>
                                  <p className="text-xs text-gray-600">{product.seller}</p>
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
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input 
                      id="startDate" 
                      type="datetime-local"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input 
                      id="endDate" 
                      type="datetime-local"
                    />
                  </div>
                </div>

                <div>
                  <Label>Select Products</Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Choose products to include in this flash sale
                  </p>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Products
                  </Button>
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
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-[#FF6A00] hover:bg-[#E55D00]"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Create Flash Sale
                </Button>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
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
