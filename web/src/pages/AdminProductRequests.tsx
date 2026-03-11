import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { productRequestService, ProductRequest } from '@/services/productRequestService';
import { CommentSection } from '@/components/requests/CommentSection';
import { SourcingAdminView } from '@/components/admin/SourcingAdminView';
import { useCommentStore } from '@/stores/commentStore';
import { supabase } from '@/lib/supabase';
import {
  Search,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  ThumbsUp,
  Eye,
  Users,
  FlaskConical,
  ShieldCheck,
  Rocket,
  Package,
  DollarSign,
  BarChart3,
  Filter,
  Plus,
  ChevronRight,
  Upload,
  AlertTriangle,
} from 'lucide-react';

type ProductRequestItem = ProductRequest;

type AdminTab = 'pipeline' | 'testing' | 'suppliers' | 'analytics';

/* ── Pipeline column config ──────────────────────────────────── */

const PIPELINE_COLUMNS = [
  { key: 'pending',      label: 'GATHERING\nINTEREST', borderColor: 'border-amber-400',  textColor: 'text-amber-700',  bgColor: 'bg-amber-50' },
  { key: 'in_progress',  label: 'SOURCING',            borderColor: 'border-amber-600',  textColor: 'text-amber-800',  bgColor: 'bg-amber-50/60' },
  { key: 'testing',      label: 'LAB TESTING',         borderColor: 'border-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' },
  { key: 'approved',     label: 'VERIFIED',            borderColor: 'border-green-500',  textColor: 'text-green-700',  bgColor: 'bg-green-50' },
  { key: 'live',         label: 'LIVE',                borderColor: 'border-gray-400',   textColor: 'text-gray-600',   bgColor: 'bg-gray-50' },
] as const;

/* ── Mock data for tabs that have no DB tables yet ─────────── */

const MOCK_SUPPLIERS = [
  { id: '1', name: 'TechSource Global',           status: 'verified',   products: 12, avgPrice: 45,  reliability: 92 },
  { id: '2', name: 'QualityFirst Manufacturing',  status: 'verified',   products: 8,  avgPrice: 38,  reliability: 88 },
  { id: '3', name: 'BulkTech Supplies',           status: 'monitoring', products: 5,  avgPrice: 52,  reliability: 76 },
];

const MOCK_FAILURE_REASONS = [
  { reason: 'Spec mismatch (claimed vs actual)', count: 12 },
  { reason: 'Failed durability testing',         count: 8 },
  { reason: 'Quality control issues',            count: 6 },
  { reason: 'Authenticity concerns',             count: 4 },
  { reason: 'Safety non-compliance',             count: 3 },
];

const AdminProductRequests: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ProductRequestItem | null>(null);
  const [detailTab, setDetailTab] = useState<'review' | 'contributions'>('review');
  const [adminNotes, setAdminNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<ProductRequestItem[]>([]);

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
      if (r.status === 'pending')      map.pending.push(r);
      else if (r.status === 'in_progress') map.in_progress.push(r);
      else if (r.status === 'approved')    map.approved.push(r);
      // rejected is excluded from the pipeline board
    });
    return map;
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
    { key: 'pipeline',  label: 'PIPELINE',       icon: FlaskConical },
    { key: 'testing',   label: 'TESTING QUEUE',  icon: ShieldCheck },
    { key: 'suppliers', label: 'SUPPLIERS',       icon: DollarSign },
    { key: 'analytics', label: 'ANALYTICS',       icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 overflow-auto">
        {/* ═══════ MISSION CONTROL BANNER ═══════ */}
        <div className="bg-[#1a1a1a] text-white px-8 py-8 border-b-4 border-[var(--brand-primary)]">
          <div className="max-w-7xl mx-auto flex items-end justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">BAZAARX LAB</h1>
              <p className="text-white/50 text-sm mt-1">Admin Mission Control</p>
            </div>
            <div className="flex gap-8">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/50">Active Tests</p>
                <p className="text-3xl font-extrabold text-green-400">{stats.approved}</p>
              </div>
              <div className="border-l border-white/20 pl-8 text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/50">Pending Sourcing</p>
                <p className="text-3xl font-extrabold text-[var(--brand-primary)]">{stats.inProgress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ TAB BAR ═══════ */}
        <div className="bg-white border-b border-gray-200 px-8 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto flex gap-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════ TAB CONTENT ═══════ */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

          {/* ──────── PIPELINE TAB ──────── */}
          {activeTab === 'pipeline' && (
            <div>
              {/* Kanban board */}
              <div className="grid grid-cols-5 gap-4 min-h-[60vh]">
                {PIPELINE_COLUMNS.map(({ key, label, borderColor, textColor, bgColor }) => {
                  const items = pipelineBuckets[key] ?? [];
                  return (
                    <div key={key} className="flex flex-col">
                      {/* Column header */}
                      <div className={`rounded-xl border-2 ${borderColor} ${bgColor} px-4 py-3 mb-4 flex items-center justify-between`}>
                        <span className={`text-xs font-extrabold uppercase tracking-wider whitespace-pre-line leading-tight ${textColor}`}>
                          {label}
                        </span>
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${borderColor} border ${textColor} bg-white`}>
                          {items.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <div className="space-y-3 flex-1">
                        {items.map((req) => (
                          <motion.div
                            key={req.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedRequest(req)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-sm font-bold text-[var(--text-headline)] line-clamp-2 leading-tight">
                                {req.productName.length > 20 ? req.productName.slice(0, 20) + '…' : req.productName}
                              </h4>
                              <span className="flex items-center gap-0.5 text-xs font-bold text-[var(--brand-primary)] shrink-0 whitespace-nowrap">
                                <ThumbsUp className="h-3 w-3" />
                                {req.votes + req.estimatedDemand}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-500">
                              <span>{req.votes} votes</span>
                              <span>•</span>
                              <span>{req.estimatedDemand} pledges</span>
                            </div>
                            {/* Contextual action */}
                            {key === 'in_progress' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-3 w-full text-xs h-7 border-gray-300"
                                onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
                              >
                                Log Supplier Quote
                              </Button>
                            )}
                            {key === 'testing' && (
                              <Button
                                size="sm"
                                className="mt-3 w-full text-xs h-7 bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
                              >
                                Record Test Results
                              </Button>
                            )}
                            {key === 'approved' && (
                              <Button
                                size="sm"
                                className="mt-3 w-full text-xs h-7 bg-green-700 hover:bg-green-800 text-white"
                                onClick={(e) => { e.stopPropagation(); }}
                              >
                                Push to Live
                              </Button>
                            )}
                          </motion.div>
                        ))}
                      </div>
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
                <h2 className="text-2xl font-extrabold text-[var(--text-headline)] tracking-tight">ACTIVE TESTING QUEUE</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tests…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 w-60"
                    />
                  </div>
                  <Button variant="outline" className="gap-1.5 text-sm">
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
                    <Card key={req.id} className="border-2 border-[var(--brand-primary)]/20 hover:border-[var(--brand-primary)]/40 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h3 className="text-lg font-bold text-[var(--text-headline)]">{req.productName}</h3>
                          <Badge className="bg-amber-100 text-amber-700 border border-amber-300 rounded-full text-xs font-bold">
                            IN TESTING
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{req.description}</p>

                        {/* Meta line */}
                        <div className="flex flex-wrap items-center gap-5 text-xs text-gray-500 mb-4">
                          <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5 text-amber-600" /> Samples Received: 3</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><FlaskConical className="h-3.5 w-3.5 text-blue-600" /> Tests Completed: 2/5</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-gray-400" /> Started: 2 days ago</span>
                        </div>

                        {/* Test progress cards */}
                        <div className="grid grid-cols-3 gap-3 mb-5">
                          {[
                            { name: 'DURABILITY',  result: 'Passed 500-bend test', done: true },
                            { name: 'SPEC CHECK',  result: 'Matches claimed specs', done: true },
                            { name: 'HEAT TEST',   result: 'In progress…',         done: false },
                          ].map(({ name, result, done }) => (
                            <div key={name} className="rounded-xl border border-gray-200 p-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-700">{name}</span>
                                {done ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-500" />
                                )}
                              </div>
                              <p className={`text-xs ${done ? 'text-green-700' : 'text-gray-500'}`}>{result}</p>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                          <Button
                            className="bg-green-700 hover:bg-green-800 text-white gap-1.5"
                            onClick={() => handleUpdateStatus(req.id, 'approved')}
                            disabled={updatingId === req.id}
                          >
                            <CheckCircle className="h-4 w-4" /> Mark as Verified
                          </Button>
                          <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 gap-1.5"
                            onClick={() => handleUpdateStatus(req.id, 'rejected')}
                            disabled={updatingId === req.id}
                          >
                            <XCircle className="h-4 w-4" /> Fail Product
                          </Button>
                          <Button variant="outline" className="gap-1.5">
                            <Upload className="h-4 w-4" /> Upload Test Video
                          </Button>
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
                <h2 className="text-2xl font-extrabold text-[var(--text-headline)] tracking-tight">SUPPLIER DIRECTORY</h2>
                <Button className="bg-[#1a1a1a] hover:bg-[#333] text-white gap-1.5 rounded-lg">
                  <Plus className="h-4 w-4" /> ADD NEW SUPPLIER
                </Button>
              </div>

              <div className="space-y-4">
                {MOCK_SUPPLIERS.map((s) => (
                  <Card key={s.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-lg font-bold text-[var(--text-headline)]">{s.name}</h3>
                            <Badge className={`rounded-full text-xs font-bold uppercase ${
                              s.status === 'verified'
                                ? 'bg-green-50 text-green-700 border border-green-300'
                                : 'bg-amber-50 text-amber-700 border border-amber-300'
                            }`}>
                              {s.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-8">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand-primary)]">Products Sourced</p>
                              <p className="text-2xl font-extrabold text-[var(--text-headline)] mt-1">{s.products}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand-primary)]">Avg Price</p>
                              <p className="text-2xl font-extrabold text-green-700 mt-1">${s.avgPrice}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand-primary)]">Reliability Score</p>
                              <p className="text-2xl font-extrabold text-[var(--text-headline)] mt-1">{s.reliability}%</p>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" className="flex items-center gap-1 text-sm shrink-0 self-center">
                          VIEW DETAILS <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ──────── ANALYTICS TAB ──────── */}
          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-2xl font-extrabold text-[var(--text-headline)] tracking-tight mb-6">PLATFORM ANALYTICS</h2>

              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'TOTAL REQUESTS',   value: stats.total.toString(), change: '+12%', positive: true },
                  { label: 'PASS RATE',         value: '82%',                 change: '+5%',  positive: true },
                  { label: 'AVG TEST TIME',     value: '4.2d',                change: '-8%',  positive: false },
                  { label: 'COMMUNITY GROWTH',  value: '1.2k',               change: '+23%', positive: true },
                ].map(({ label, value, change, positive }) => (
                  <Card key={label} className="border border-gray-200">
                    <CardContent className="p-5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">{label}</p>
                      <div className="flex items-end gap-3">
                        <span className="text-3xl font-extrabold text-[var(--text-headline)]">{value}</span>
                        <span className={`text-sm font-bold ${positive ? 'text-green-600' : 'text-red-500'}`}>{change}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Failure reasons */}
              <Card className="border-2 border-red-200">
                <CardContent className="p-6">
                  <h3 className="text-lg font-extrabold text-[var(--text-headline)] mb-5 uppercase tracking-wide">Common Failure Reasons</h3>
                  <div className="space-y-3">
                    {MOCK_FAILURE_REASONS.map(({ reason, count }) => (
                      <div
                        key={reason}
                        className="flex items-center justify-between py-3 px-4 rounded-lg border border-gray-100 bg-gray-50/50"
                      >
                        <span className="text-sm text-gray-700 font-medium">{reason}</span>
                        <Badge variant="outline" className="text-xs font-bold">{count} products</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ TOAST NOTIFICATION ═══════ */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.message}
        </div>
      )}

      {/* ═══════ REVIEW MODAL ═══════ */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-2xl font-extrabold text-[var(--text-headline)] mb-4">Review Product Request</h2>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-5">
                <button
                  onClick={() => setDetailTab('review')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    detailTab === 'review'
                      ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Eye size={14} />
                  Request Details
                </button>
                <button
                  onClick={() => setDetailTab('contributions')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    detailTab === 'contributions'
                      ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
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
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Category</p>
                      <p className="text-sm font-bold text-[var(--text-headline)] mt-1">{selectedRequest.category}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Votes</p>
                      <p className="text-sm font-bold text-[var(--text-headline)] mt-1">{selectedRequest.votes}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Est. Demand</p>
                      <p className="text-sm font-bold text-[var(--text-headline)] mt-1">{selectedRequest.estimatedDemand} units</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
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
                <Button
                  onClick={() => { setSelectedRequest(null); setAdminNotes(''); }}
                  variant="outline"
                  disabled={updatingId === selectedRequest.id}
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

export default AdminProductRequests;
