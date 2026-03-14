import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import { discountService } from '../services/discountService';
import type { GlobalFlashSaleSlot, FlashSaleSubmission } from '../types/discount';
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
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface SlotWithSubmissions extends GlobalFlashSaleSlot {
  submissions: FlashSaleSubmission[];
}

const AdminFlashSales: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'active' | 'ended'>('all');

  // Flash sales loaded from DB
  const [slots, setSlots] = useState<SlotWithSubmissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [saleName, setSaleName] = useState('');
  const [saleDescription, setSaleDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minDiscount, setMinDiscount] = useState<number>(10);
  const [isCreating, setIsCreating] = useState(false);

  // Edit state
  const [editSlot, setEditSlot] = useState<SlotWithSubmissions | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editMinDiscount, setEditMinDiscount] = useState<number>(10);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Expanded slots
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());

  const toggleSlotExpansion = (slotId: string) => {
    setExpandedSlots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slotId)) newSet.delete(slotId);
      else newSet.add(slotId);
      return newSet;
    });
  };

  const loadSlots = async () => {
    setIsLoading(true);
    try {
      const dbSlots = await discountService.getGlobalFlashSaleSlots();
      const slotsData: SlotWithSubmissions[] = await Promise.all(
        dbSlots.map(async (slot) => {
          const submissions = await discountService.getFlashSaleSubmissions(slot.id);
          return { ...slot, submissions };
        })
      );
      setSlots(slotsData);
    } catch (err) {
      console.error('Failed to load flash sale slots:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  // Format datetimes for input fields
  const toLocal = (dStr: string) => {
    const d = new Date(dStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleCreateSlot = async () => {
    if (!saleName.trim()) { alert('Please enter a name'); return; }
    if (!startDate || !endDate) { alert('Please set both start and end dates'); return; }
    if (new Date(startDate) >= new Date(endDate)) { alert('End date must be after start date'); return; }

    setIsCreating(true);
    try {
      await discountService.createGlobalFlashSaleSlot({
        name: saleName,
        description: saleDescription,
        start_time: new Date(startDate).toISOString(),
        end_time: new Date(endDate).toISOString(),
        min_discount_percentage: minDiscount,
        status: 'upcoming'
      });
      setShowCreateModal(false);
      setSaleName('');
      setSaleDescription('');
      setStartDate('');
      setEndDate('');
      setMinDiscount(10);
      await loadSlots();
    } catch (err: any) {
      alert('Failed to create: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditSave = async () => {
    if (!editSlot) return;
    if (!editName.trim()) { alert('Please enter a name'); return; }
    if (!editStartDate || !editEndDate) { alert('Please set start and end dates'); return; }

    setIsSavingEdit(true);
    try {
      await discountService.updateGlobalFlashSaleSlot(editSlot.id, {
        name: editName,
        description: editDescription,
        start_time: new Date(editStartDate).toISOString(),
        end_time: new Date(editEndDate).toISOString(),
        min_discount_percentage: editMinDiscount
      });
      setEditSlot(null);
      await loadSlots();
    } catch (err: any) {
      alert('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (confirm('Are you sure you want to delete this event? This will also remove all submissions.')) {
      try {
        await discountService.deleteGlobalFlashSaleSlot(id);
        setSlots(prev => prev.filter(s => s.id !== id));
      } catch (err: any) {
        alert('Failed to delete: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const handleToggleStatus = async (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    const newStatus = slot.status === 'active' ? 'upcoming' : 'active';
    try {
      await discountService.updateGlobalFlashSaleSlot(slotId, { status: newStatus });
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: newStatus } : s));
    } catch (err: any) {
      alert('Failed to update status: ' + (err.message || 'Unknown error'));
    }
  };

  const handleReviewSubmission = async (slotId: string, subId: string, status: 'approved' | 'rejected') => {
    try {
      await discountService.updateSubmissionStatus(subId, status);
      setSlots(prev => prev.map(slot => {
        if (slot.id === slotId) {
          return {
            ...slot,
            submissions: slot.submissions.map(sub =>
              sub.id === subId ? { ...sub, status } : sub
            )
          };
        }
        return slot;
      }));
    } catch (err: any) {
      alert('Failed to update submission: ' + (err.message || 'Unknown error'));
    }
  };

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  const filteredSlots = slots.filter(slot => {
    const matchesSearch = slot.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' ? true : slot.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: slots.length,
    scheduled: slots.filter(s => s.status === 'upcoming').length,
    active: slots.filter(s => s.status === 'active').length,
    ended: slots.filter(s => s.status === 'ended').length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-700';
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
              <p className="text-[var(--text-muted)]">Manage global events and review seller submissions</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
              <Plus className="h-5 w-5 mr-2" />
              Create Event
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Events', value: stats.total, icon: Zap },
              { label: 'Upcoming', value: stats.scheduled, icon: Calendar },
              { label: 'Active', value: stats.active, icon: Play },
              { label: 'Ended', value: stats.ended, icon: Clock }
            ].map((stat, index) => (
              <Card key={index} className="border-none shadow-md hover:shadow-lg transition-all duration-300 rounded-xl bg-white overflow-hidden group relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-primary)]/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-[var(--brand-accent-light)] transition-colors"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex flex-col">
                    <div className="mb-4 text-gray-500 group-hover:text-[var(--brand-accent)] transition-all">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                      <p className="text-2xl font-black text-gray-900 tracking-tight transition-all group-hover:text-[var(--brand-accent)]">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters and Search Bar */}
          <div className="flex items-center justify-between gap-6 mb-4">
            <div className="bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm rounded-full p-0.5 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-0.5">
                {[
                  { id: 'all', label: 'All', count: stats.total },
                  { id: 'upcoming', label: 'Upcoming', count: stats.scheduled },
                  { id: 'active', label: 'Active', count: stats.active },
                  { id: 'ended', label: 'Ended', count: stats.ended },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id as any)}
                    className={`relative px-4 h-7 text-xs font-medium transition-all duration-300 rounded-full flex items-center gap-1.5 whitespace-nowrap z-10 ${filterStatus === tab.id
                      ? 'text-white'
                      : 'text-gray-500 hover:text-[var(--brand-primary)]'
                      }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] font-normal transition-colors ${filterStatus === tab.id ? 'text-white/80' : 'text-[var(--text-muted)]/60'}`}>
                      ({tab.count})
                    </span>
                    {filterStatus === tab.id && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-[var(--brand-primary)] rounded-full -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-[320px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--brand-primary)]" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 bg-white border-gray-200 rounded-xl shadow-sm focus:border-[var(--brand-primary)] focus:ring-0 placeholder:text-gray-400 text-sm"
              />
            </div>
          </div>

          {/* Slots List */}
          <div className="grid gap-6">
            {filteredSlots.map((slot) => {
              const approvedCount = slot.submissions.filter(s => s.status === 'approved').length;
              const pendingCount = slot.submissions.filter(s => s.status === 'pending').length;

              return (
                <Card key={slot.id} className="border-0 shadow-lg transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">{slot.name}</h3>
                              <Badge className={`${getStatusColor(slot.status)} pointer-events-none`}>{slot.status.toUpperCase()}</Badge>
                            </div>
                            <p className="text-sm text-gray-600">{slot.description}</p>
                            <div className="flex items-center justify-between flex-wrap gap-y-2 text-sm mt-3">
                              <div className="flex items-center gap-x-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-500">Pending:</span>
                                  <span className="font-semibold text-[var(--brand-primary)]">{pendingCount}</span>
                                </div>
                                <span className="text-gray-500 hidden md:inline">•</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-500">Approved:</span>
                                  <span className="font-semibold text-green-600">{approvedCount}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 font-medium text-[var(--text-muted)] ml-auto">
                                <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                                <span>
                                  {new Date(slot.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(slot.end_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Review Submissions Toggle */}
                        <div className="mt-4 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => toggleSlotExpansion(slot.id)}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-[var(--brand-primary)] transition-colors"
                          >
                            {expandedSlots.has(slot.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            Review Submissions ({slot.submissions.length})
                          </button>
                          <AnimatePresence>
                            {expandedSlots.has(slot.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mt-4"
                              >
                                {slot.submissions.length === 0 ? (
                                  <div className="text-sm text-gray-500 py-4 text-center bg-gray-50 rounded-lg">No submissions yet.</div>
                                ) : (
                                  <div className="grid gap-3">
                                    {slot.submissions.map(sub => {
                                      const isPending = sub.status === 'pending';
                                      const isApproved = sub.status === 'approved';
                                      const isRejected = sub.status === 'rejected';
                                      return (
                                        <div key={sub.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                          <img
                                            src={sub.product_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(sub.product_name || 'Product')}&background=f3f4f6`}
                                            alt=""
                                            className="w-12 h-12 rounded object-cover"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{sub.product_name}</p>
                                            <p className="text-xs text-gray-500">{sub.store_name}</p>
                                            <div className="flex items-center gap-2 mt-1 relative text-xs">
                                              <span className="text-gray-400 line-through">₱{sub.original_price}</span>
                                              <span className="font-bold text-red-600">₱{sub.submitted_price}</span>
                                              <span className="text-gray-500 ml-2">Stock: {sub.submitted_stock}</span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2">
                                            {isPending && (
                                              <>
                                                <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleReviewSubmission(slot.id, sub.id, 'approved')}>
                                                  <Check className="w-4 h-4 mr-1" /> Approve
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReviewSubmission(slot.id, sub.id, 'rejected')}>
                                                  <X className="w-4 h-4 mr-1" /> Reject
                                                </Button>
                                              </>
                                            )}
                                            {isApproved && <Badge className="bg-green-100 text-green-700 pointer-events-none">Approved</Badge>}
                                            {isRejected && <Badge className="bg-red-100 text-red-700 pointer-events-none">Rejected</Badge>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="flex items-start gap-1">
                        {slot.status !== 'ended' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-[var(--brand-primary)] hover:bg-base"
                              onClick={() => {
                                setEditSlot(slot);
                                setEditName(slot.name);
                                setEditDescription(slot.description || '');
                                setEditStartDate(toLocal(slot.start_time));
                                setEditEndDate(toLocal(slot.end_time));
                                setEditMinDiscount(slot.min_discount_percentage);
                              }}
                              title="Edit Event"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="h-8 w-8 text-gray-500 hover:text-red-700 hover:bg-base"
                              title="Delete Event"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {slot.status === 'upcoming' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(slot.id)}
                            className="rounded-lg border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-green-700 hover:border-green-700 flex items-center gap-2 h-8 px-4 ml-1"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span className="text-xs">Start Now</span>
                          </Button>
                        )}
                        {slot.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(slot.id)}
                            className="rounded-lg border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-red-700 hover:border-red-700 flex items-center gap-2 h-8 px-4 ml-1"
                          >
                            <Pause className="h-3.5 w-3.5" />
                            <span className="text-xs">Pause</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Create Flash Sale Event</h2>
              <div className="space-y-4">
                <div>
                  <Label>Event Name</Label>
                  <Input value={saleName} onChange={(e) => setSaleName(e.target.value)} placeholder="e.g. 11.11 Mega Sale" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={saleDescription} onChange={(e) => setSaleDescription(e.target.value)} placeholder="Optional details..." />
                </div>
                <div>
                  <Label>Min Discount Percentage (%)</Label>
                  <Input type="number" min="1" max="99" value={minDiscount} onChange={(e) => setMinDiscount(Number(e.target.value))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={() => setShowCreateModal(false)} variant="outline" className="text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-600">Cancel</Button>
                <Button onClick={handleCreateSlot} disabled={isCreating} className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)]">
                  {isCreating ? 'Creating...' : 'Create Event Container'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {editSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Edit Flash Sale Event</h2>
              <div className="space-y-4">
                <div>
                  <Label>Event Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                </div>
                <div>
                  <Label>Min Discount Percentage (%)</Label>
                  <Input type="number" min="1" max="99" value={editMinDiscount} onChange={(e) => setEditMinDiscount(Number(e.target.value))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="datetime-local" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="datetime-local" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={() => setEditSlot(null)} variant="outline" className="text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-600">Cancel</Button>
                <Button onClick={handleEditSave} disabled={isSavingEdit} className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)]">
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
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
