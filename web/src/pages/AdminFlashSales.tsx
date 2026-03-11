import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
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
  Trash2,
  Clock,
  X,
  Check,
  ArrowLeft,
} from 'lucide-react';

interface GlobalSlot {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  min_discount_percentage: number;
  campaign_type: string;
  created_at: string;
}

interface Submission {
  id: string;
  slot_id: string;
  seller_id: string;
  product_id: string;
  submitted_price: number;
  submitted_stock: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  sellers: { store_name: string };
  products: { name: string; price: number; images: { image_url: string; is_primary: boolean }[] };
}

const AdminFlashSales: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [slots, setSlots] = useState<GlobalSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal State
  const [saleName, setSaleName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minDiscount, setMinDiscount] = useState(10);
  const [campaignType, setCampaignType] = useState('flash_sale');
  const [isCreating, setIsCreating] = useState(false);

  // Submissions View State
  const [selectedSlot, setSelectedSlot] = useState<GlobalSlot | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const loadSlots = async () => {
    setIsLoading(true);
    try {
      const data = await discountService.getAllGlobalFlashSaleSlots();
      setSlots(data || []);
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleCreateSlot = async () => {
    if (!saleName.trim()) { alert('Please enter a flash sale name'); return; }
    if (!startDate || !endDate) { alert('Please set start and end dates'); return; }

    setIsCreating(true);
    try {
      await discountService.createGlobalFlashSaleSlot({
        name: saleName,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        minDiscountPercentage: minDiscount,
        campaignType,
      });
      setShowCreateModal(false);
      setSaleName('');
      setStartDate('');
      setEndDate('');
      setMinDiscount(10);
      setCampaignType('flash_sale');
      await loadSlots();
      alert('Flash sale slot created successfully!');
    } catch (err: any) {
      alert('Failed to create flash sale slot: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (confirm('Are you sure you want to delete this event container? All seller submissions tied to this will also be deleted.')) {
      try {
        await discountService.deleteGlobalFlashSaleSlot(id);
        setSlots(prev => prev.filter(s => s.id !== id));
      } catch (err: any) {
        alert('Failed to delete: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const handleViewSubmissions = async (slot: GlobalSlot) => {
    setSelectedSlot(slot);
    setIsLoadingSubmissions(true);
    try {
      const data = await discountService.getFlashSaleSubmissionsBySlot(slot.id);
      setSubmissions(data || []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const handleUpdateSubmissionStatus = async (submissionId: string, status: 'approved' | 'rejected') => {
    try {
      await discountService.updateFlashSaleSubmissionStatus(submissionId, status);
      setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, status } : s));
    } catch (err: any) {
      alert('Failed to update submission: ' + (err.message || 'Unknown error'));
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const filteredSlots = slots.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.products?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = submissionFilter === 'all' ? true : s.status === submissionFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    if (status === 'active') return 'bg-green-100 text-green-700';
    if (status === 'scheduled') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getSlotStatus = (start: string, end: string) => {
    const now = new Date().getTime();
    const st = new Date(start).getTime();
    const en = new Date(end).getTime();
    if (now < st) return 'scheduled';
    if (now > en) return 'ended';
    return 'active';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                {selectedSlot && (
                  <Button variant="ghost" onClick={() => setSelectedSlot(null)} className="mr-2">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {selectedSlot ? `Submissions: ${selectedSlot.name}` : 'Flash Sales Management'}
                </h1>
              </div>
              <p className="text-gray-600">
                {selectedSlot 
                  ? 'Review and approve seller product submissions for this event'
                  : 'Create time-bounded event containers for sellers to join'}
              </p>
            </div>
            {!selectedSlot && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#FF6A00] hover:bg-[#E55D00]"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Event Slot
              </Button>
            )}
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={selectedSlot ? "Search submitted products..." : "Search event slots..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {selectedSlot && (
                  <div className="flex gap-2">
                    <Button
                      variant={submissionFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setSubmissionFilter('all')}
                      className={submissionFilter === 'all' ? 'bg-[#FF6A00] hover:bg-[#E55D00]' : ''}
                    >
                      All
                    </Button>
                    <Button
                      variant={submissionFilter === 'pending' ? 'default' : 'outline'}
                      onClick={() => setSubmissionFilter('pending')}
                      className={submissionFilter === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                    >
                      Pending
                    </Button>
                    <Button
                      variant={submissionFilter === 'approved' ? 'default' : 'outline'}
                      onClick={() => setSubmissionFilter('approved')}
                      className={submissionFilter === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      Approved
                    </Button>
                    <Button
                      variant={submissionFilter === 'rejected' ? 'default' : 'outline'}
                      onClick={() => setSubmissionFilter('rejected')}
                      className={submissionFilter === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      Rejected
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content: Either Slots List or Submissions List */}
          {!selectedSlot ? (
            <div className="grid gap-6">
              {isLoading ? (
                <p>Loading slots...</p>
              ) : filteredSlots.length === 0 ? (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No event slots found</p>
                    <Button onClick={() => setShowCreateModal(true)} className="mt-4 bg-[#FF6A00] hover:bg-[#E55D00]">
                      <Plus className="h-4 w-4 mr-2" /> Create Your First Slot
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredSlots.map(slot => {
                  const status = getSlotStatus(slot.start_date, slot.end_date);
                  return (
                    <Card key={slot.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-6 justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <Zap className="h-6 w-6 text-orange-500" />
                              <h3 className="text-xl font-semibold text-gray-900">{slot.name}</h3>
                              <Badge className={getStatusColor(status)}>{status.toUpperCase()}</Badge>
                              <Badge variant="outline" className="capitalize">{slot.campaign_type?.replace('_', ' ') || 'Flash Sale'}</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Start Date</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {new Date(slot.start_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">End Date</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {new Date(slot.end_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Min Discount</p>
                                <p className="text-sm font-medium text-orange-600">
                                  {slot.min_discount_percentage || 10}% OFF
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 md:w-48">
                            <Button onClick={() => handleViewSubmissions(slot)} className="w-full bg-[#FF6A00] hover:bg-[#E55D00]">
                              View Submissions
                            </Button>
                            <Button variant="outline" onClick={() => handleDeleteSlot(slot.id)} className="w-full text-red-600 border-red-200 hover:bg-red-50">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {isLoadingSubmissions ? (
                <p>Loading submissions...</p>
              ) : filteredSubmissions.length === 0 ? (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <p className="text-gray-600 text-lg">No submissions match the filter.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredSubmissions.map(sub => {
                  const image = sub.products?.images?.find((img) => img.is_primary)?.image_url || sub.products?.images?.[0]?.image_url || 'https://placehold.co/400x400?text=No+Image';
                  const discount = sub.products.price > 0 ? Math.round(((sub.products.price - sub.submitted_price) / sub.products.price) * 100) : 0;
                  
                  return (
                    <Card key={sub.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                          <img src={image} alt={sub.products.name} className="w-20 h-20 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0 w-full">
                            <h4 className="font-semibold text-gray-900 truncate">{sub.products.name}</h4>
                            <p className="text-sm text-gray-500">Seller: {sub.sellers?.store_name}</p>
                            <div className="flex gap-4 mt-2">
                              <div className="text-sm">
                                <span className="text-gray-400 line-through mr-2">₱{sub.products.price}</span>
                                <span className="font-bold text-red-600">₱{sub.submitted_price}</span>
                                <Badge variant="outline" className="ml-2 text-xs">-{discount}%</Badge>
                              </div>
                              <div className="text-sm text-gray-600">Stock: {sub.submitted_stock}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 sm:flex-col sm:w-32 justify-end">
                            {sub.status === 'pending' && (
                              <>
                                <Button size="sm" onClick={() => handleUpdateSubmissionStatus(sub.id, 'approved')} className="w-full bg-green-600 hover:bg-green-700">
                                  <Check className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button size="sm" onClick={() => handleUpdateSubmissionStatus(sub.id, 'rejected')} variant="outline" className="w-full text-red-600 border-red-200">
                                  <X className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {sub.status === 'approved' && (
                              <Badge className="bg-green-100 text-green-800 w-full justify-center">Approved</Badge>
                            )}
                            {sub.status === 'rejected' && (
                              <Badge className="bg-red-100 text-red-800 w-full justify-center">Rejected</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full"
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Event Slot</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="saleName">Event Name (e.g. 11.11 Mega Sale)</Label>
                  <Input
                    id="saleName"
                    placeholder="Enter event name"
                    value={saleName}
                    onChange={(e) => setSaleName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Time</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Time</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minDiscount">Min Discount (%)</Label>
                    <Input
                      id="minDiscount"
                      type="number"
                      min={1}
                      max={90}
                      placeholder="10"
                      value={minDiscount}
                      onChange={(e) => setMinDiscount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="campaignType">Campaign Type</Label>
                    <select
                      id="campaignType"
                      value={campaignType}
                      onChange={(e) => setCampaignType(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="flash_sale">Flash Sale</option>
                      <option value="clearance">Clearance</option>
                      <option value="seasonal">Seasonal</option>
                      <option value="mega_sale">Mega Sale</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleCreateSlot} disabled={isCreating} className="flex-1 bg-[#FF6A00] hover:bg-[#E55D00]">
                  <Zap className="h-4 w-4 mr-2" />
                  {isCreating ? 'Creating...' : 'Create Slot'}
                </Button>
                <Button onClick={() => setShowCreateModal(false)} variant="outline" disabled={isCreating}>
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
