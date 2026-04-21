import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Megaphone,
  Workflow,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Send,
  ChevronLeft,
  ChevronRight,
  FileText,
  Copy,
  Eye,
  Sparkles,
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { useAdminAuth } from '../stores/adminStore';
import {
  useAdminCRM,
  ADMIN_CAMPAIGN_TEMPLATES,
  type BuyerSegment,
  type MarketingCampaign,
  type AutomationWorkflow,
  type AdminCampaignTemplate,
} from '../stores/admin/adminCRMStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE = 10;

type Tab = 'segments' | 'campaigns' | 'templates' | 'automation' | 'analytics';

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700 border border-gray-200',
  scheduled: 'bg-blue-50 text-blue-700 border border-blue-200',
  sending:   'bg-amber-50 text-amber-700 border border-amber-200',
  sent:      'bg-green-50 text-green-700 border border-green-200',
  paused:    'bg-orange-50 text-orange-700 border border-orange-200',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
};

export default function AdminCRM() {
  const { isAuthenticated, admin } = useAdminAuth();
  const {
    segments, segmentsLoading, fetchSegments, createSegment, updateSegment, deleteSegment,
    campaigns, campaignsLoading, fetchCampaigns, createCampaign, updateCampaign, deleteCampaign,
    workflows, workflowsLoading, fetchWorkflows, createWorkflow, updateWorkflow, toggleWorkflow, deleteWorkflow,
    emailTemplates, emailTemplatesLoading, fetchEmailTemplates,
  } = useAdminCRM();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('segments');
  const [page, setPage] = useState(1);

  // Dialogs
  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<BuyerSegment | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<AutomationWorkflow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<AdminCampaignTemplate | null>(null);

  // Form states
  const [segForm, setSegForm] = useState({ name: '', description: '' });
  const [campForm, setCampForm] = useState({ name: '', description: '', campaign_type: 'email_blast' as string, subject: '', content: '' });
  const [wfForm, setWfForm] = useState({ name: '', description: '', trigger_event: 'order_placed', channels: ['email'] as string[], delay_minutes: 0 });

  useEffect(() => {
    fetchSegments();
    fetchCampaigns();
    fetchWorkflows();
    fetchEmailTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  // ── Helpers ──────────────────────────────────────────────────────────
  const paginate = <T,>(items: T[]) => {
    const filtered = items;
    const total = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const sliced = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    return { items: sliced, total, count: filtered.length };
  };

  const resetPage = () => { setPage(1); };

  // ── Segment CRUD ─────────────────────────────────────────────────────
  const openSegmentDialog = (seg?: BuyerSegment) => {
    setEditingSegment(seg || null);
    setSegForm({ name: seg?.name || '', description: seg?.description || '' });
    setSegmentDialogOpen(true);
  };

  const saveSegment = async () => {
    if (!segForm.name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (editingSegment) {
      await updateSegment(editingSegment.id, { name: segForm.name, description: segForm.description });
      toast({ title: 'Segment updated' });
    } else {
      await createSegment({ name: segForm.name, description: segForm.description, filter_criteria: {}, buyer_count: 0, is_dynamic: true, created_by: admin?.id || '' });
      toast({ title: 'Segment created' });
    }
    setSegmentDialogOpen(false);
  };

  // ── Campaign CRUD ────────────────────────────────────────────────────
  const openCampaignDialog = (camp?: MarketingCampaign) => {
    setEditingCampaign(camp || null);
    setCampForm({
      name: camp?.name || '', description: camp?.description || '',
      campaign_type: camp?.campaign_type || 'email_blast',
      subject: camp?.subject || '', content: camp?.content || '',
    });
    setCampaignDialogOpen(true);
  };

  const saveCampaign = async () => {
    if (!campForm.name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (editingCampaign) {
      await updateCampaign(editingCampaign.id, campForm as Partial<MarketingCampaign>);
      toast({ title: 'Campaign updated' });
    } else {
      await createCampaign({ ...campForm, status: 'draft', created_by: admin?.id || '' } as Partial<MarketingCampaign>);
      toast({ title: 'Campaign created' });
    }
    setCampaignDialogOpen(false);
  };

  // ── Workflow CRUD ────────────────────────────────────────────────────
  const openWorkflowDialog = (wf?: AutomationWorkflow) => {
    setEditingWorkflow(wf || null);
    setWfForm({
      name: wf?.name || '', description: wf?.description || '',
      trigger_event: wf?.trigger_event || 'order_placed',
      channels: wf?.channels || ['email'],
      delay_minutes: wf?.delay_minutes || 0,
    });
    setWorkflowDialogOpen(true);
  };

  const saveWorkflow = async () => {
    if (!wfForm.name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (editingWorkflow) {
      await updateWorkflow(editingWorkflow.id, wfForm as Partial<AutomationWorkflow>);
      toast({ title: 'Workflow updated' });
    } else {
      await createWorkflow({ ...wfForm, is_enabled: false, created_by: admin?.id || '' } as Partial<AutomationWorkflow>);
      toast({ title: 'Workflow created' });
    }
    setWorkflowDialogOpen(false);
  };

  // ── Use pre-made template ───────────────────────────────────────────
  const applyTemplate = (tpl: AdminCampaignTemplate) => {
    setEditingCampaign(null);
    setCampForm({
      name: tpl.name,
      description: tpl.description,
      campaign_type: tpl.campaign_type,
      subject: tpl.subject,
      content: tpl.content,
    });
    setCampaignDialogOpen(true);
    toast({ title: `Template "${tpl.name}" loaded`, description: 'Customize the content and save.' });
  };

  // ── Delete ──────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'segment') await deleteSegment(deleteConfirm.id);
    if (deleteConfirm.type === 'campaign') await deleteCampaign(deleteConfirm.id);
    if (deleteConfirm.type === 'workflow') await deleteWorkflow(deleteConfirm.id);
    toast({ title: `${deleteConfirm.name} deleted` });
    setDeleteConfirm(null);
  };

  // ── Tab Data ─────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'segments', label: 'Buyer Segments', icon: <Users className="w-4 h-4" /> },
    { key: 'campaigns', label: 'Campaigns', icon: <Megaphone className="w-4 h-4" /> },
    { key: 'templates', label: 'Templates', icon: <FileText className="w-4 h-4" /> },
    { key: 'automation', label: 'Automation', icon: <Workflow className="w-4 h-4" /> },
    { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const segData = paginate(segments);
  const campData = paginate(campaigns);
  const wfData = paginate(workflows);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* ── Page Header ── */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">CRM &amp; Marketing</h1>
              <p className="text-[var(--text-muted)]">Manage buyer segments, campaigns, and automation workflows.</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="border border-gray-200 bg-white rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-bold text-[var(--text-headline)]">{segments.length}</p>
                <p className="text-[var(--text-muted)] text-xs">Segments</p>
              </div>
              <div className="border border-gray-200 bg-white rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-bold text-[var(--text-headline)]">{campaigns.length}</p>
                <p className="text-[var(--text-muted)] text-xs">Campaigns</p>
              </div>
              <div className="border border-gray-200 bg-white rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-bold text-[var(--text-headline)]">{workflows.filter(w => w.is_enabled).length}</p>
                <p className="text-[var(--text-muted)] text-xs">Active Workflows</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); resetPage(); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--brand-accent-light)]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ========================= SEGMENTS ========================= */}
          {activeTab === 'segments' && (
            <Section
              title="Buyer Segments"
              count={segments.length}
              loading={segmentsLoading}
              onRefresh={fetchSegments}
              onCreate={() => openSegmentDialog()}
              createLabel="New Segment"
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Description</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Buyers</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {segData.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 mb-4">No buyer segments yet. Create segments to target specific buyer groups.</p>
                        <Button size="sm" onClick={() => openSegmentDialog()} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white">
                          <Plus className="w-4 h-4 mr-2" /> Create Segment
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    segData.items.map((seg) => (
                      <motion.tr key={seg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-[var(--text-headline)]">{seg.name}</td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)] max-w-xs truncate">{seg.description || '—'}</td>
                        <td className="px-6 py-4 text-sm text-center">{seg.buyer_count}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${seg.is_dynamic ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {seg.is_dynamic ? 'Dynamic' : 'Static'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openSegmentDialog(seg)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'segment', id: seg.id, name: seg.name })}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
              <Pagination page={page} total={segData.total} count={segData.count} onPage={setPage} />
            </Section>
          )}

          {/* ========================= CAMPAIGNS ========================= */}
          {activeTab === 'campaigns' && (
            <Section
              title="Marketing Campaigns"
              count={campaigns.length}
              loading={campaignsLoading}
              onRefresh={fetchCampaigns}
              onCreate={() => openCampaignDialog()}
              createLabel="New Campaign"
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Name</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Type</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Sent</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Delivered</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campData.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 mb-4">No campaigns yet. Create one from scratch or use a template!</p>
                        <div className="flex justify-center gap-3">
                          <Button size="sm" onClick={() => openCampaignDialog()} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white">
                            <Plus className="w-4 h-4 mr-2" /> New Campaign
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setActiveTab('templates'); resetPage(); }}>
                            <Sparkles className="w-4 h-4 mr-2" /> Browse Templates
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    campData.items.map((c) => (
                      <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-[var(--text-headline)]">{c.name}</td>
                        <td className="px-6 py-4 text-xs text-center capitalize">{c.campaign_type.replace('_', ' ')}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[c.status] || ''}`}>{c.status}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">{c.total_sent}</td>
                        <td className="px-6 py-4 text-sm text-center">{c.total_delivered}</td>
                        <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openCampaignDialog(c)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'campaign', id: c.id, name: c.name })}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
              <Pagination page={page} total={campData.total} count={campData.count} onPage={setPage} />
            </Section>
          )}

          {/* ========================= TEMPLATES ========================= */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              {/* Pre-made Admin Templates */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-[var(--text-headline)]">Platform Campaign Templates</h2>
                    <span className="text-xs bg-[var(--brand-accent-light)] text-[var(--text-accent)] border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      {ADMIN_CAMPAIGN_TEMPLATES.length}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] hidden sm:block">Use any template to quickly create a platform-wide campaign</p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ADMIN_CAMPAIGN_TEMPLATES.map((tpl) => {
                    const catColors: Record<string, string> = {
                      platform: 'bg-blue-50 text-blue-700 border border-blue-200',
                      seasonal: 'bg-orange-50 text-orange-700 border border-orange-200',
                      growth: 'bg-green-50 text-green-700 border border-green-200',
                      retention: 'bg-purple-50 text-purple-700 border border-purple-200',
                    };
                    return (
                      <motion.div
                        key={tpl.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-gray-200 rounded-xl p-5 hover:border-[var(--brand-primary)] hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{tpl.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-semibold text-[var(--text-headline)]">{tpl.name}</h3>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${catColors[tpl.category] || ''}`}>
                                {tpl.category}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mb-3">{tpl.description}</p>
                            <div className="bg-gray-50 rounded-lg p-2 mb-3">
                              <p className="text-[11px] text-[var(--text-muted)] font-medium">Subject Preview:</p>
                              <p className="text-xs text-[var(--text-headline)] truncate">{tpl.subject}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => applyTemplate(tpl)}
                                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs"
                              >
                                <Copy className="w-3 h-3 mr-1.5" /> Use Template
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPreviewTemplate(tpl)}
                                className="text-xs"
                              >
                                <Eye className="w-3 h-3 mr-1.5" /> Preview
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Saved Email Templates from DB */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-[var(--text-headline)]">Saved Email Templates</h2>
                    <span className="text-xs bg-[var(--brand-accent-light)] text-[var(--text-accent)] border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      {emailTemplates.length}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchEmailTemplates} disabled={emailTemplatesLoading}
                    className="border-gray-200 text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">
                    <RefreshCw className={`w-4 h-4 mr-2 ${emailTemplatesLoading ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
                <div className="p-6">
                  {emailTemplatesLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                    </div>
                  ) : emailTemplates.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No saved email templates in the database.</p>
                      <p className="text-xs text-gray-400 mt-1">Templates seeded in the migration will appear here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {emailTemplates.map((t) => (
                        <div key={t.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
                            <h4 className="text-sm font-medium text-[var(--text-headline)]">{t.name}</h4>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mb-2 truncate">{t.subject}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${
                              t.category === 'marketing' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              t.category === 'transactional' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {t.category}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              {t.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================= AUTOMATION ========================= */}
          {activeTab === 'automation' && (
            <Section
              title="Automation Workflows"
              count={workflows.length}
              loading={workflowsLoading}
              onRefresh={fetchWorkflows}
              onCreate={() => openWorkflowDialog()}
              createLabel="New Workflow"
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Trigger</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Channels</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Delay</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Enabled</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--text-headline)] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {wfData.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <Workflow className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 mb-4">No automation workflows yet. Create one to automate notifications.</p>
                        <Button size="sm" onClick={() => openWorkflowDialog()} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white">
                          <Plus className="w-4 h-4 mr-2" /> Create Workflow
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    wfData.items.map((wf) => (
                      <motion.tr key={wf.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-[var(--text-headline)]">{wf.name}</td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)] capitalize">{wf.trigger_event.replace(/_/g, ' ')}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {wf.channels.map((ch) => (
                              <span key={ch} className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{ch}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">{wf.delay_minutes > 0 ? `${wf.delay_minutes}m` : 'Instant'}</td>
                        <td className="px-6 py-4 text-center">
                          <Switch checked={wf.is_enabled} onCheckedChange={(val) => toggleWorkflow(wf.id, val)} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openWorkflowDialog(wf)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'workflow', id: wf.id, name: wf.name })}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
              <Pagination page={page} total={wfData.total} count={wfData.count} onPage={setPage} />
            </Section>
          )}

          {/* ========================= ANALYTICS ========================= */}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard label="Total Segments" value={segments.length} icon={<Users className="w-5 h-5" />} />
                <StatCard label="Active Campaigns" value={campaigns.filter((c) => c.status === 'sent' || c.status === 'sending').length} icon={<Megaphone className="w-5 h-5" />} />
                <StatCard label="Active Workflows" value={workflows.filter((w) => w.is_enabled).length} icon={<Workflow className="w-5 h-5" />} />
                <StatCard label="Emails Sent" value={campaigns.reduce((acc, c) => acc + c.total_sent, 0)} icon={<Send className="w-5 h-5" />} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-6">
                  <h3 className="text-sm font-semibold text-[var(--text-headline)] mb-4">Recent Campaigns</h3>
                  {campaigns.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm">{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[c.status] || ''}`}>{c.status}</span>
                    </div>
                  ))}
                  {campaigns.length === 0 && <p className="text-sm text-gray-400">No campaigns yet.</p>}
                </div>
                <div className="border rounded-lg p-6">
                  <h3 className="text-sm font-semibold text-[var(--text-headline)] mb-4">Delivery Performance</h3>
                  <div className="space-y-3">
                    {campaigns.filter((c) => c.total_sent > 0).slice(0, 5).map((c) => {
                      const rate = c.total_sent > 0 ? Math.round((c.total_delivered / c.total_sent) * 100) : 0;
                      return (
                        <div key={c.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>{c.name}</span>
                            <span className="text-[var(--text-muted)]">{rate}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--brand-primary)] rounded-full transition-all" style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {campaigns.filter((c) => c.total_sent > 0).length === 0 && <p className="text-sm text-gray-400">No delivery data yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================= DIALOGS ========================= */}

      {/* Segment Dialog */}
      <Dialog open={segmentDialogOpen} onOpenChange={setSegmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSegment ? 'Edit Segment' : 'Create Segment'}</DialogTitle>
            <DialogDescription>Define a buyer segment for targeted campaigns.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Segment Name</Label>
              <Input value={segForm.name} onChange={(e) => setSegForm({ ...segForm, name: e.target.value })} placeholder="e.g., High-Value Buyers" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={segForm.description} onChange={(e) => setSegForm({ ...segForm, description: e.target.value })} placeholder="Describe the segment criteria..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSegmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveSegment}>{editingSegment ? 'Save Changes' : 'Create Segment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
            <DialogDescription>Set up an email or SMS marketing campaign.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Campaign Name</Label>
              <Input value={campForm.name} onChange={(e) => setCampForm({ ...campForm, name: e.target.value })} placeholder="e.g., Holiday Sale 2025" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={campForm.campaign_type} onValueChange={(v) => setCampForm({ ...campForm, campaign_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_blast">Email Blast</SelectItem>
                  <SelectItem value="sms_blast">SMS Blast</SelectItem>
                  <SelectItem value="multi_channel">Multi-Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject Line</Label>
              <Input value={campForm.subject} onChange={(e) => setCampForm({ ...campForm, subject: e.target.value })} placeholder="Email subject..." />
            </div>
            <div>
              <Label>Content / Body</Label>
              <Textarea value={campForm.content} onChange={(e) => setCampForm({ ...campForm, content: e.target.value })} placeholder="Compose your message..." rows={5} />
            </div>
            <div>
              <Label>Description (internal)</Label>
              <Input value={campForm.description} onChange={(e) => setCampForm({ ...campForm, description: e.target.value })} placeholder="Internal notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCampaign}>{editingCampaign ? 'Save Changes' : 'Create Campaign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow Dialog */}
      <Dialog open={workflowDialogOpen} onOpenChange={setWorkflowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWorkflow ? 'Edit Workflow' : 'Create Automation'}</DialogTitle>
            <DialogDescription>Automate notifications triggered by events.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Workflow Name</Label>
              <Input value={wfForm.name} onChange={(e) => setWfForm({ ...wfForm, name: e.target.value })} placeholder="e.g., Post-Purchase Follow-Up" />
            </div>
            <div>
              <Label>Trigger Event</Label>
              <Select value={wfForm.trigger_event} onValueChange={(v) => setWfForm({ ...wfForm, trigger_event: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['order_placed', 'order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled', 'payment_received', 'refund_processed', 'welcome'].map((e) => (
                    <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Channels</Label>
              <div className="flex gap-4 mt-1">
                {['email', 'sms', 'push'].map((ch) => (
                  <label key={ch} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wfForm.channels.includes(ch)}
                      onChange={(e) => {
                        setWfForm({
                          ...wfForm,
                          channels: e.target.checked
                            ? [...wfForm.channels, ch]
                            : wfForm.channels.filter((c) => c !== ch),
                        });
                      }}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{ch}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Delay (minutes)</Label>
              <Input type="number" min="0" value={wfForm.delay_minutes} onChange={(e) => setWfForm({ ...wfForm, delay_minutes: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={wfForm.description} onChange={(e) => setWfForm({ ...wfForm, description: e.target.value })} placeholder="Describe the workflow..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkflowDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveWorkflow}>{editingWorkflow ? 'Save Changes' : 'Create Workflow'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteConfirm?.name}?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{previewTemplate?.icon}</span>
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>{previewTemplate?.description}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-xs font-medium text-[var(--text-muted)]">Subject</Label>
              <div className="bg-gray-50 rounded-lg p-3 mt-1">
                <p className="text-sm text-[var(--text-headline)]">{previewTemplate?.subject}</p>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-[var(--text-muted)]">Email Body</Label>
              <div className="bg-gray-50 rounded-lg p-4 mt-1 max-h-[40vh] overflow-y-auto">
                <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">{previewTemplate?.content}</pre>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
            <Button
              onClick={() => {
                if (previewTemplate) applyTemplate(previewTemplate);
                setPreviewTemplate(null);
              }}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white"
            >
              <Copy className="w-4 h-4 mr-2" /> Use This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Reusable Sub-Components ──────────────────────────────────────────────

function Section({ title, count, loading, onRefresh, onCreate, createLabel, children }: {
  title: string; count: number; loading: boolean; onRefresh: () => void;
  onCreate: () => void; createLabel: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-[var(--text-headline)]">{title}</h2>
          <span className="text-xs bg-[var(--brand-accent-light)] text-[var(--text-accent)] border border-amber-200 px-2 py-0.5 rounded-full font-medium">{count}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}
            className="border-gray-200 text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={onCreate}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white">
            <Plus className="w-4 h-4 mr-2" /> {createLabel}
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
        </div>
      ) : children}
    </div>
  );
}

function Pagination({ page, total, count, onPage }: { page: number; total: number; count: number; onPage: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t">
      <span className="text-sm text-[var(--text-muted)]">
        Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, count)} of {count}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={page >= total} onClick={() => onPage(page + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white hover:border-[var(--brand-primary)] transition-colors">
      <div className="flex items-center gap-2 text-[var(--brand-primary)] mb-2">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div>
      <p className="text-2xl font-bold text-[var(--text-headline)]">{value.toLocaleString()}</p>
    </div>
  );
}
