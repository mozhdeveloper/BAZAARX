import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { productRequestService, ProductRequest } from '@/services/productRequestService';
import { CommentSection } from '@/components/requests/CommentSection';
import { SourcingAdminView } from '@/components/admin/SourcingAdminView';
import { useCommentStore } from '@/stores/commentStore';
import { supabase } from '@/lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  ThumbsUp,
  Eye,
  Users,
  FlaskConical,
  ShieldCheck,
  Package,
  DollarSign,
  BarChart3,
  Filter,
  Plus,
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  MoreVertical,
  MessageSquare,
  Activity,
  TrendingDown,
} from 'lucide-react';

type ProductRequestItem = ProductRequest;

type AdminTab = 'pipeline' | 'testing' | 'suppliers' | 'analytics';

/* ── Pipeline column config ──────────────────────────────────── */

const PIPELINE_COLUMNS = [
  { key: 'pending', label: 'Gathering\nInterest', borderColor: 'border-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50' },
  { key: 'in_progress', label: 'Sourcing', borderColor: 'border-amber-600', textColor: 'text-amber-800', bgColor: 'bg-amber-50/60' },
  { key: 'testing', label: 'Lab Testing', borderColor: 'border-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' },
  { key: 'approved', label: 'Verified', borderColor: 'border-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' },
  { key: 'live', label: 'Live', borderColor: 'border-gray-400', textColor: 'text-gray-600', bgColor: 'bg-gray-50' },
] as const;

/* ── Suppliers tab placeholder data (DB-backed feature TBD) ───────────
 * The suppliers directory is not yet backed by a real table.
 * Replaced previously hard-coded mock supplier records with an empty
 * source so the UI shows a proper empty state instead of fake data. */
type SupplierRow = { id: string; name: string; status: 'verified' | 'monitoring'; products: number; avgPrice: number; reliability: number };
const SUPPLIERS: SupplierRow[] = [];

const AdminProductRequests: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePipelineStep, setActivePipelineStep] = useState<string>(PIPELINE_COLUMNS[0].key);
  const [selectedRequest, setSelectedRequest] = useState<ProductRequestItem | null>(null);
  const [detailTab, setDetailTab] = useState<'review' | 'contributions'>('review');
  const [adminNotes, setAdminNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<ProductRequestItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [supplierPage, setSupplierPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const { comments, fetchCommentsAdmin, upvoteComment } = useCommentStore();
  const sourcingComments = comments.filter((c) => c.isAdminOnly);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await productRequestService.getAllRequests();
        setRequests(data);
      } catch (error) {
        console.error('Failed to load product requests:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAdminUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      fetchCommentsAdmin(selectedRequest.id, adminUserId);
      setDetailTab('review');
    }
  }, [selectedRequest?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activePipelineStep]);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  /* ── Derived data ──────────────────────────────────────────── */

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    inProgress: requests.filter(r => r.status === 'in_progress').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }), [requests]);

  // Bucket requests into pipeline columns (testing & live are implied from approved / in_progress for now)
  const pipelineBuckets = useMemo(() => {
    const map: Record<string, ProductRequestItem[]> = {
      pending: [], in_progress: [], testing: [], approved: [], live: [],
    };
    requests.forEach((r) => {
      if (r.status === 'pending') map.pending.push(r);
      else if (r.status === 'in_progress') map.in_progress.push(r);
      else if (r.status === 'approved') map.approved.push(r);
      // rejected is excluded from the pipeline board
    });
    return map;
  }, [requests]);

  // Derive top failure reasons from rejected requests' adminNotes (real data)
  const failureReasons = useMemo(() => {
    const counts = new Map<string, number>();
    requests
      .filter(r => r.status === 'rejected' && r.adminNotes && r.adminNotes.trim().length > 0)
      .forEach(r => {
        const key = r.adminNotes!.trim().slice(0, 120);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    return Array.from(counts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [requests]);

  const handleUpdateStatus = async (requestId: string, newStatus: 'approved' | 'rejected' | 'in_progress', notes?: string) => {
    setUpdatingId(requestId);
    try {
      const notesToSave = notes !== undefined ? notes : adminNotes;
      await productRequestService.updateStatus(requestId, newStatus, notesToSave || undefined);
      setRequests(prev =>
        prev.map(r =>
          r.id === requestId ? { ...r, status: newStatus, adminNotes: notesToSave || r.adminNotes } : r
        )
      );
      const label = newStatus === 'in_progress' ? 'In Progress' : newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
      showToast(`Request marked as ${label}`);
    } catch (error) {
      console.error('Failed to update status:', error);
      showToast('Failed to update request status', 'error');
    } finally {
      setUpdatingId(null);
      setSelectedRequest(null);
      setAdminNotes('');
    }
  };

  /* ── Tab config ────────────────────────────────────────────── */

  const TABS: { key: AdminTab; label: string; icon: React.ElementType }[] = [
    { key: 'pipeline', label: 'Pipeline', icon: FlaskConical },
    { key: 'testing', label: 'Testing Queue', icon: ShieldCheck },
    { key: 'suppliers', label: 'Suppliers', icon: DollarSign },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 overflow-auto scrollbar-hide">
        {/* ═══════ MISSION CONTROL HEADER ═══════ */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">BazaarX Lab</h1>
              <p className="text-[var(--text-muted)]">Admin Mission Control</p>
            </div>
            <div className="flex gap-8">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Active Tests</p>
                <p className="text-3xl font-extrabold text-green-600">{stats.approved}</p>
              </div>
              <div className="border-l border-gray-200 pl-8 text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Pending Sourcing</p>
                <p className="text-3xl font-extrabold text-[var(--brand-primary)]">{stats.inProgress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ TAB BAR ═══════ */}
        <div className="sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-8">
            <div className="bg-white border-b border-gray-100 h-8 flex justify-center gap-10">
              {TABS.map(({ key, label }) => {
                const count = key === 'pipeline' ? requests.length :
                  key === 'testing' ? requests.filter(r => r.status === 'in_progress' || r.status === 'approved').length :
                    key === 'suppliers' ? SUPPLIERS.length : null;

                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`relative py-2 text-sm transition-all duration-300 flex items-center gap-1 ${activeTab === key
                      ? 'text-[var(--brand-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--brand-primary)]'
                      }`}
                  >
                    {label}
                    {count !== null && (
                      <span className={`text-[11px] ${activeTab === key ? 'text-[var(--brand-primary)]/70' : 'text-[var(--text-muted)]/60'}`}>
                        ({count})
                      </span>
                    )}
                    {activeTab === key && (
                      <motion.div
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-primary)]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════ TAB CONTENT ═══════ */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

          {/* ──────── PIPELINE TAB ──────── */}
          {activeTab === 'pipeline' && (
            <div className="grid grid-cols-4 gap-4 md:gap-8 items-start">
              {/* Left Column: Controls */}
              <div className="col-span-1 sticky top-14 space-y-4 md:space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-headline)]">Pipeline Progress</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-4">Select a stage to view requests</p>

                  <div>
                    {PIPELINE_COLUMNS.map((col) => {
                      const isActive = activePipelineStep === col.key;
                      const count = pipelineBuckets[col.key]?.length || 0;
                      return (
                        <button
                          key={col.key}
                          onClick={() => setActivePipelineStep(col.key)}
                          className={`w-full flex items-center justify-between py-2 transition-all duration-200 group ${isActive
                            ? 'text-[var(--brand-primary)] font-bold'
                            : 'text-[var(--text-muted)] hover:text-[var(--brand-primary)]'
                            }`}
                        >
                          <span className="text-sm text-left">
                            {col.label.replace('\n', ' ')}
                          </span>
                          <span className={`${isActive ? 'opacity-100' : 'opacity-40'} text-[11px]`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Cards */}
              <div className="col-span-3 min-h-[60vh]">
                {PIPELINE_COLUMNS.filter(col => col.key === activePipelineStep).map(({ key, label, borderColor, textColor, bgColor }) => {
                  const items = pipelineBuckets[key] ?? [];
                  return (
                    <div key={key} className="space-y-6">
                      {/* Stage Header */}
                      <div className={`rounded-xl ${bgColor} px-4 py-2 flex items-center justify-between shadow-md`}>
                        <div>
                          <span className={`text-md font-bold ${textColor}`}>
                            {label.replace('\n', ' ')}
                          </span>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">Showing {items.length} items</p>
                        </div>
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${borderColor} border ${textColor} bg-white shrink-0`}>
                          {items.length}
                        </span>
                      </div>

                      {/* Cards Grid */}
                      {items.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                          <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                          <p className="text-gray-500 font-medium">No requests in this stage</p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl shadow-md overflow-hidden divide-y divide-gray-100">
                          {items
                            .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                            .map((req) => (
                              <motion.div
                                key={req.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-5 hover:bg-gray-50/80 transition-all cursor-pointer group"
                                onClick={() => setSelectedRequest(req)}
                              >
                                <div className="flex items-center justify-between gap-6">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-4 mb-1">
                                      <h4 className="text-base font-bold text-[var(--text-headline)] group-hover:text-[var(--brand-primary)] transition-colors truncate">
                                        {req.productName}
                                      </h4>
                                      <div className="flex items-center gap-3 text-[var(--text-muted)] text-[11px] font-medium shrink-0">
                                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {req.votes + req.estimatedDemand}</span>
                                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {req.votes}</span>
                                        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {req.estimatedDemand}</span>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-500 line-clamp-1">
                                      {req.description}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    {key === 'in_progress' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-[10px] font-bold uppercase tracking-wider flex border-gray-200 hover:bg-gray-50 hover:text-[var(--text-headline)]"
                                        onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
                                      >
                                        Log Quote
                                      </Button>
                                    )}
                                    {key === 'testing' && (
                                      <Button
                                        size="sm"
                                        className="h-8 text-[10px] font-bold uppercase tracking-wider bg-orange-600 hover:bg-orange-700 text-white border-none"
                                        onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
                                      >
                                        Record Results
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 group-hover:text-[var(--brand-primary)] transition-colors hover:bg-transparent">
                                      <ChevronRight className="h-5 w-5" />
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}

                          {/* Pagination Footer */}
                          {items.length > 0 && (
                            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-white text-[var(--text-muted)] text-xs font-medium">
                              <div>
                                {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, items.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, items.length)} of {items.length}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                  disabled={currentPage === 1}
                                  className="p-1.5 hover:bg-gray-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(items.length / ITEMS_PER_PAGE), p + 1))}
                                  disabled={currentPage >= Math.ceil(items.length / ITEMS_PER_PAGE)}
                                  className="p-1.5 hover:bg-gray-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ──────── TESTING QUEUE TAB ──────── */}
          {activeTab === 'testing' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-extrabold text-[var(--text-headline)] tracking-tight">Active testing queue</h2>
                <div className="flex items-center gap-3">
                  <div className="relative group w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                    <input
                      type="text"
                      placeholder="Search tests…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-1.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] w-full shadow-sm transition-all h-9"
                    />
                  </div>
                  <Button variant="outline" className="gap-1.5 text-[var(--text-muted)] rounded-xl text-sm border-gray-200 hover:bg-gray-50 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] shadow-sm h-9">
                    <Filter className="h-4 w-4" /> Filter
                  </Button>
                </div>
              </div>

              {/* Testing cards — show approved requests as "in testing" */}
              {requests.filter(r => r.status === 'in_progress' || r.status === 'approved').length === 0 ? (
                <Card><CardContent className="py-16 text-center text-gray-400">No items in testing queue</CardContent></Card>
              ) : (
                <div className="space-y-5">
                  {requests
                    .filter(r => r.status === 'in_progress' || r.status === 'approved')
                    .filter(r => !searchQuery || r.productName.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((req) => (
                      <Card key={req.id} className="border-none shadow-none bg-white">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <h3 className="text-lg font-bold text-[var(--text-headline)]">{req.productName}</h3>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-amber-100 text-amber-700 border border-amber-300 rounded-full text-xs font-bold">
                                In testing
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 border-none shadow-xl">
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(req.id, 'approved')}
                                    disabled={updatingId === req.id}
                                    className="cursor-pointer focus:bg-gray-100 focus:text-[var(--text-headline)]"
                                  >
                                    <span>Mark as Verified</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(req.id, 'rejected')}
                                    disabled={updatingId === req.id}
                                    className="cursor-pointer focus:bg-gray-100 focus:text-[var(--text-headline)]"
                                  >
                                    <span>Fail Product</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="cursor-pointer focus:bg-gray-100 focus:text-[var(--text-headline)]">
                                    <span>Upload Test Video</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">{req.description}</p>

                          {/* Meta line */}
                          <div className="flex flex-wrap items-center gap-5 text-xs text-[var(--text-muted)] mb-4">
                            <span className="flex items-center gap-1">Samples Received: 3</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">Tests Completed: 2/5</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">Started: 2 days ago</span>
                          </div>

                          {/* Test progress cards */}
                          <div className="grid grid-cols-3 mb-5 divide-x divide-gray-200">
                            {[
                              { name: 'DURABILITY', result: 'Passed 500-bend test', done: true },
                              { name: 'SPEC CHECK', result: 'Matches claimed specs', done: true },
                              { name: 'HEAT TEST', result: 'In progress…', done: false },
                            ].map(({ name, result, done }, index) => (
                              <div key={name} className={`${index === 0 ? 'pr-6' : index === 2 ? 'pl-6' : 'px-6'}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] tracking-wider text-gray-600">{name}</span>
                                  {done ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-amber-500" />
                                  )}
                                </div>
                                <p className={`text-xs font-medium ${done ? 'text-green-700' : 'text-gray-500'}`}>{result}</p>
                              </div>
                            ))}
                          </div>

                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ──────── SUPPLIERS TAB ──────── */}
          {activeTab === 'suppliers' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-extrabold text-[var(--text-headline)] tracking-tight">Supplier directory</h2>
                <Button className="bg-[#1a1a1a] hover:bg-[#333] text-white gap-1.5 rounded-lg">
                  <Plus className="h-4 w-4" /> Add new supplier
                </Button>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden divide-y divide-gray-100">
                {SUPPLIERS.length === 0 && (
                  <div className="p-10 text-center">
                    <p className="text-sm text-gray-500 italic">Supplier directory is not yet populated. Add suppliers using the button above.</p>
                  </div>
                )}
                {SUPPLIERS
                  .slice((supplierPage - 1) * ITEMS_PER_PAGE, supplierPage * ITEMS_PER_PAGE)
                  .map((s) => (
                    <div key={s.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-[15px] font-bold text-[var(--text-headline)]">{s.name}</h3>
                            <Badge className={`rounded-full text-[9px] px-2 py-0 h-4 font-bold uppercase tracking-wider ${s.status === 'verified'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                              {s.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <p className="text-xs text-[var(--text-muted)]">Products sourced</p>
                              <p className="text-md font-extrabold text-[var(--text-headline)] mt-0.5">{s.products}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[var(--text-muted)]">Avg price</p>
                              <p className="text-md font-extrabold text-green-700 mt-0.5">${s.avgPrice}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[var(--text-muted)]">Reliability score</p>
                              <p className="text-md font-extrabold text-[var(--text-headline)] mt-0.5">{s.reliability}%</p>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1 shrink-0 self-center hover:bg-gray-50 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">
                          View details <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                {/* Pagination Footer */}
                {SUPPLIERS.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white text-[var(--text-muted)] text-xs font-medium">
                    <div>
                      {Math.min((supplierPage - 1) * ITEMS_PER_PAGE + 1, SUPPLIERS.length)}-{Math.min(supplierPage * ITEMS_PER_PAGE, SUPPLIERS.length)} of {SUPPLIERS.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSupplierPage(p => Math.max(1, p - 1))}
                        disabled={supplierPage === 1}
                        className="p-1.5 hover:bg-gray-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSupplierPage(p => Math.min(Math.ceil(SUPPLIERS.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={supplierPage >= Math.ceil(SUPPLIERS.length / ITEMS_PER_PAGE)}
                        className="p-1.5 hover:bg-gray-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────── ANALYTICS TAB ──────── */}
          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-2xl font-extrabold text-[var(--text-headline)] tracking-tight mb-6">Platform analytics</h2>

              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'Total Requests', value: stats.total.toString(), change: '+12%', positive: true },
                  { label: 'Pass Rate', value: '82%', change: '+5%', positive: true },
                  { label: 'Avg Test Time', value: '4.2d', change: '-8%', positive: false },
                  { label: 'Growth', value: '1.2k', change: '+23%', positive: true },
                ].map(({ label, value, change, positive }, index) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="border-none shadow-md hover:shadow-[0_20px_40px_rgba(229,140,26,0.1)] transition-all duration-300 rounded-xl bg-white overflow-hidden group relative">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[var(--brand-accent-light)]/50 to-[var(--brand-primary)]/10 rounded-full blur-xl -mr-6 -mt-6 group-hover:bg-[var(--brand-accent-light)] transition-colors"></div>
                      <CardContent className="p-5 relative z-10">
                        <div className="flex items-center justify-between h-full pt-1">
                          <p className="text-sm font-medium text-gray-400 tracking-wider">
                            {label}
                          </p>
                          <div className="flex items-end gap-3">
                            <p className="text-2xl font-black text-[var(--text-headline)] tracking-tight group-hover:text-[var(--brand-accent)] transition-colors">
                              {value}
                            </p>
                            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                              {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                              {change}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Failure reasons */}
              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <h3 className="text-lg font-extrabold text-[var(--text-headline)] mb-5 tracking-wide">Common failure reasons</h3>
                  {failureReasons.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No rejected requests yet — failure reasons will appear here once admins reject requests with notes.</p>
                  ) : (
                    <div className="space-y-3">
                      {failureReasons.map(({ reason, count }) => (
                        <div
                          key={reason}
                          className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50/50"
                        >
                          <span className="text-sm text-gray-700 font-medium">{reason}</span>
                          <Badge variant="outline" className="text-xs font-bold">{count} request{count === 1 ? '' : 's'}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ TOAST NOTIFICATION ═══════ */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.message}
        </div>
      )}

      {/* ═══════ REVIEW MODAL ═══════ */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 relative">
              <button
                onClick={() => { setSelectedRequest(null); setAdminNotes(''); }}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
              <h2 className="text-2xl font-extrabold text-[var(--text-headline)] mb-4">Review Product Request</h2>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-5">
                <button
                  onClick={() => setDetailTab('review')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${detailTab === 'review'
                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                    : 'border-transparent text-gray-400 hover:text-[var(--brand-primary)]'
                    }`}
                >
                  <Eye size={14} />
                  Request Details
                </button>
                <button
                  onClick={() => setDetailTab('contributions')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${detailTab === 'contributions'
                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                    : 'border-transparent text-gray-400 hover:text-[var(--brand-primary)]'
                    }`}
                >
                  <Users size={14} />
                  Contributions
                  {comments.length > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
                      {comments.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab: Review */}
              {detailTab === 'review' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-headline)]">{selectedRequest.productName}</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedRequest.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-[var(--text-headline)]">Category</p>
                      <p className="text-sm text-[var(--text-muted)] mt-1">{selectedRequest.category}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-[var(--text-headline)]">Votes</p>
                      <p className="text-sm text-[var(--text-muted)] mt-1">{selectedRequest.votes}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-[var(--text-headline)]">Est. Demand</p>
                      <p className="text-sm text-[var(--text-muted)] mt-1">{selectedRequest.estimatedDemand} units</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-[var(--text-headline)] mb-2">
                      Admin Notes
                    </label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this request..."
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Tab: Contributions */}
              {detailTab === 'contributions' && (
                <div className="space-y-4">
                  {sourcingComments.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">
                        🔒 Sourcing Tips ({sourcingComments.length})
                      </p>
                      <SourcingAdminView
                        comments={sourcingComments}
                        onLabUpvote={(id) => upvoteComment(id)}
                      />
                    </div>
                  )}
                  <CommentSection
                    requestId={selectedRequest.id}
                    viewerUserId={adminUserId}
                    isAdminViewer
                    showForm={false}
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 flex-wrap mt-6 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}
                  disabled={updatingId === selectedRequest.id}
                  className="flex-1 min-w-[100px] bg-green-700 hover:bg-green-800 text-white gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" /> Approve
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'in_progress')}
                  disabled={updatingId === selectedRequest.id}
                  className="flex-1 min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  <TrendingUp className="h-4 w-4" /> In Progress
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                  disabled={updatingId === selectedRequest.id}
                  className="flex-1 min-w-[100px] bg-red-600 hover:bg-red-700 text-white gap-1.5"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminProductRequests;
