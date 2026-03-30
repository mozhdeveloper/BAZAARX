import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  Users,
  BarChart3,
  FileText,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Send,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Repeat,
  Sparkles,
} from 'lucide-react';
import { SellerWorkspaceLayout } from '@/components/seller/SellerWorkspaceLayout';
import { useAuthStore } from '@/stores/sellerStore';
import {
  useSellerMarketing,
  SELLER_CAMPAIGN_TEMPLATES,
  type SellerCampaign,
  type CampaignTemplate,
} from '@/stores/seller/sellerMarketingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE = 10;

type Tab = 'overview' | 'campaigns' | 'templates' | 'insights';

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700 border border-gray-200',
  scheduled: 'bg-blue-50 text-blue-700 border border-blue-200',
  sending:   'bg-amber-50 text-amber-700 border border-amber-200',
  sent:      'bg-green-50 text-green-700 border border-green-200',
  paused:    'bg-orange-50 text-orange-700 border border-orange-200',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
};

const CATEGORY_COLORS: Record<string, string> = {
  promotion: 'bg-orange-50 text-orange-700 border border-orange-200',
  engagement: 'bg-blue-50 text-blue-700 border border-blue-200',
  retention: 'bg-purple-50 text-purple-700 border border-purple-200',
  announcement: 'bg-green-50 text-green-700 border border-green-200',
};

export default function SellerMarketing() {
  const { seller } = useAuthStore();
  const {
    campaigns, campaignsLoading, fetchCampaigns, createCampaign, updateCampaign, deleteCampaign,
    templates, templatesLoading, fetchTemplates,
    insights, insightsLoading, fetchInsights,
  } = useSellerMarketing();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [page, setPage] = useState(1);

  // Dialogs
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<SellerCampaign | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CampaignTemplate | null>(null);

  // Form state
  const [campForm, setCampForm] = useState({
    name: '', description: '', campaign_type: 'email_blast' as string,
    subject: '', content: '',
  });

  useEffect(() => {
    if (seller?.id) {
      fetchCampaigns(seller.id);
      fetchInsights(seller.id);
      fetchTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller?.id]);

  // ── Helpers ──────────────────────────────────────────────────────────
  const paginate = <T,>(items: T[]) => {
    const total = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
    const sliced = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    return { items: sliced, total, count: items.length };
  };

  // ── Campaign CRUD ────────────────────────────────────────────────────
  const openCampaignDialog = (camp?: SellerCampaign) => {
    setEditingCampaign(camp || null);
    setCampForm({
      name: camp?.name || '', description: camp?.description || '',
      campaign_type: camp?.campaign_type || 'email_blast',
      subject: camp?.subject || '', content: camp?.content || '',
    });
    setCampaignDialogOpen(true);
  };

  const applyTemplate = (tpl: CampaignTemplate) => {
    const storeName = seller?.storeName || seller?.businessName || 'My Store';
    setCampForm({
      name: tpl.name,
      description: tpl.description,
      campaign_type: tpl.campaign_type,
      subject: tpl.subject.replace(/\{\{store_name\}\}/g, storeName),
      content: tpl.content.replace(/\{\{store_name\}\}/g, storeName),
    });
    setEditingCampaign(null);
    setCampaignDialogOpen(true);
    toast({ title: `Template "${tpl.name}" loaded`, description: 'Customize the content and send!' });
  };

  const saveCampaign = async () => {
    if (!seller?.id) return;
    if (!campForm.name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (editingCampaign) {
      await updateCampaign(editingCampaign.id, seller.id, campForm as Partial<SellerCampaign>);
      toast({ title: 'Campaign updated' });
    } else {
      await createCampaign(seller.id, { ...campForm, status: 'draft' } as Partial<SellerCampaign>);
      toast({ title: 'Campaign created as draft' });
    }
    setCampaignDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !seller?.id) return;
    await deleteCampaign(deleteConfirm.id, seller.id);
    toast({ title: `${deleteConfirm.name} deleted` });
    setDeleteConfirm(null);
  };

  const campData = paginate(campaigns);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'campaigns', label: 'Campaigns', icon: <Megaphone className="w-4 h-4" /> },
    { key: 'templates', label: 'Templates', icon: <FileText className="w-4 h-4" /> },
    { key: 'insights', label: 'Customer Insights', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <SellerWorkspaceLayout>
      <div className="flex-1 overflow-auto">
        {/* ── Page Header ── */}
        <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] px-6 sm:px-8 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Megaphone className="w-6 h-6" />
                Marketing
              </h1>
              <p className="text-amber-100 text-sm mt-0.5">
                Create campaigns, use templates, and understand your customers.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-bold text-white">{campaigns.length}</p>
                <p className="text-amber-100 text-xs">Campaigns</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-bold text-white">{insights.totalCustomers}</p>
                <p className="text-amber-100 text-xs">Customers</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <p className="text-xl font-bold text-white">{campaigns.filter(c => c.status === 'sent').length}</p>
                <p className="text-amber-100 text-xs">Sent</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-6">

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit shadow-sm overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
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

          {/* ========================= OVERVIEW ========================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Customers" value={insights.totalCustomers} icon={<Users className="w-5 h-5" />} loading={insightsLoading} />
                <StatCard label="Repeat Customers" value={insights.repeatCustomers} icon={<Repeat className="w-5 h-5" />} loading={insightsLoading} />
                <StatCard label="Campaigns Created" value={campaigns.length} icon={<Megaphone className="w-5 h-5" />} loading={campaignsLoading} />
                <StatCard label="Emails Sent" value={campaigns.reduce((acc, c) => acc + c.total_sent, 0)} icon={<Send className="w-5 h-5" />} loading={campaignsLoading} />
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--text-headline)] mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => openCampaignDialog()}
                    className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[var(--brand-primary)] hover:bg-[var(--brand-accent-light)] transition-all text-left"
                  >
                    <div className="bg-[var(--brand-accent-light)] p-2 rounded-lg">
                      <Plus className="w-5 h-5 text-[var(--brand-primary)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-headline)]">New Campaign</p>
                      <p className="text-xs text-[var(--text-muted)]">Create from scratch</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[var(--brand-primary)] hover:bg-[var(--brand-accent-light)] transition-all text-left"
                  >
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-headline)]">Use a Template</p>
                      <p className="text-xs text-[var(--text-muted)]">Start with a pre-made design</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('insights')}
                    className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[var(--brand-primary)] hover:bg-[var(--brand-accent-light)] transition-all text-left"
                  >
                    <div className="bg-green-50 p-2 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-headline)]">View Insights</p>
                      <p className="text-xs text-[var(--text-muted)]">Understand your customers</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Campaigns */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[var(--text-headline)]">Recent Campaigns</h3>
                  {campaigns.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('campaigns')} className="text-[var(--brand-primary)]">
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
                {campaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 mb-3">No campaigns yet. Start by creating one!</p>
                    <Button size="sm" onClick={() => openCampaignDialog()} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white">
                      <Plus className="w-4 h-4 mr-2" /> Create Campaign
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-headline)] truncate">{c.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{new Date(c.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[c.status] || ''}`}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================= CAMPAIGNS ========================= */}
          {activeTab === 'campaigns' && (
            <Section
              title="My Campaigns"
              count={campaigns.length}
              loading={campaignsLoading}
              onRefresh={() => seller?.id && fetchCampaigns(seller.id)}
              onCreate={() => openCampaignDialog()}
              createLabel="New Campaign"
            >
              <div className="overflow-x-auto">
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
                            <Button size="sm" variant="outline" onClick={() => setActiveTab('templates')}>
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
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ id: c.id, name: c.name })}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={campData.total} count={campData.count} onPage={setPage} />
            </Section>
          )}

          {/* ========================= TEMPLATES ========================= */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              {/* Pre-made Campaign Templates */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-[var(--text-headline)]">Campaign Templates</h2>
                    <span className="text-xs bg-[var(--brand-accent-light)] text-[var(--text-accent)] border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      {SELLER_CAMPAIGN_TEMPLATES.length}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] hidden sm:block">Click "Use Template" to create a campaign from any template</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SELLER_CAMPAIGN_TEMPLATES.map((tpl) => (
                      <motion.div
                        key={tpl.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-gray-200 rounded-xl p-5 hover:border-[var(--brand-primary)] hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{tpl.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-semibold text-[var(--text-headline)]">{tpl.name}</h3>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[tpl.category] || ''}`}>
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
                    ))}
                  </div>
                </div>
              </div>

              {/* Database Email Templates */}
              {templates.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <h2 className="text-base font-semibold text-[var(--text-headline)]">Saved Email Templates</h2>
                  </div>
                  <div className="p-6">
                    {templatesLoading ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {templates.map((t) => (
                          <div key={t.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
                              <h4 className="text-sm font-medium text-[var(--text-headline)]">{t.name}</h4>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mb-1">{t.subject}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${
                              t.category === 'marketing' ? 'bg-purple-50 text-purple-700' :
                              t.category === 'transactional' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {t.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================= CUSTOMER INSIGHTS ========================= */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total Customers" value={insights.totalCustomers} icon={<Users className="w-5 h-5" />} loading={insightsLoading} />
                <StatCard label="Repeat Customers" value={insights.repeatCustomers} icon={<Repeat className="w-5 h-5" />} loading={insightsLoading} />
                <StatCard label="Avg Order Value" value={`₱${insights.avgOrderValue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} loading={insightsLoading} />
                <StatCard label="Total Revenue" value={`₱${insights.totalRevenue.toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} loading={insightsLoading} />
                <StatCard label="Orders (30d)" value={insights.recentOrders} icon={<ShoppingCart className="w-5 h-5" />} loading={insightsLoading} />
              </div>

              {/* Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-[var(--text-headline)] mb-4">Customer Retention</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-secondary)]">Repeat Purchase Rate</span>
                        <span className="font-medium text-[var(--text-headline)]">
                          {insights.totalCustomers > 0 ? Math.round((insights.repeatCustomers / insights.totalCustomers) * 100) : 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--brand-primary)] rounded-full transition-all"
                          style={{ width: `${insights.totalCustomers > 0 ? Math.round((insights.repeatCustomers / insights.totalCustomers) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-[var(--brand-primary)]">{insights.totalCustomers - insights.repeatCustomers}</p>
                          <p className="text-xs text-[var(--text-muted)]">One-time Buyers</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">{insights.repeatCustomers}</p>
                          <p className="text-xs text-[var(--text-muted)]">Repeat Buyers</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-[var(--text-headline)] mb-4">Campaign Performance</h3>
                  {campaigns.filter(c => c.total_sent > 0).length === 0 ? (
                    <div className="text-center py-6">
                      <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No campaign data yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Send your first campaign to see delivery performance here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campaigns.filter(c => c.total_sent > 0).slice(0, 5).map((c) => {
                        const rate = c.total_sent > 0 ? Math.round((c.total_delivered / c.total_sent) * 100) : 0;
                        return (
                          <div key={c.id}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[var(--text-secondary)] truncate max-w-[200px]">{c.name}</span>
                              <span className="font-medium text-[var(--text-headline)]">{rate}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${rate}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-[var(--text-headline)] mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Suggested Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {insights.repeatCustomers > 0 && (
                    <SuggestionCard
                      icon="⭐"
                      title="Reward Loyal Customers"
                      description={`You have ${insights.repeatCustomers} repeat buyers. Send them a loyalty reward!`}
                      action="Use Loyalty Template"
                      onClick={() => applyTemplate(SELLER_CAMPAIGN_TEMPLATES.find(t => t.id === 'loyalty-reward')!)}
                    />
                  )}
                  {insights.totalCustomers > insights.repeatCustomers && (
                    <SuggestionCard
                      icon="👋"
                      title="Win Back One-Time Buyers"
                      description={`${insights.totalCustomers - insights.repeatCustomers} customers haven't returned. Re-engage them!`}
                      action="Use Win-Back Template"
                      onClick={() => applyTemplate(SELLER_CAMPAIGN_TEMPLATES.find(t => t.id === 'win-back')!)}
                    />
                  )}
                  {campaigns.length === 0 && (
                    <SuggestionCard
                      icon="🚀"
                      title="Send Your First Campaign"
                      description="Start with a template to make it easy."
                      action="Browse Templates"
                      onClick={() => setActiveTab('templates')}
                    />
                  )}
                  {insights.recentOrders > 0 && (
                    <SuggestionCard
                      icon="📝"
                      title="Ask for Reviews"
                      description={`${insights.recentOrders} recent orders — ask those buyers for reviews!`}
                      action="Use Review Template"
                      onClick={() => applyTemplate(SELLER_CAMPAIGN_TEMPLATES.find(t => t.id === 'review-request')!)}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================= DIALOGS ========================= */}

      {/* Campaign Dialog */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
            <DialogDescription>Set up a marketing campaign for your store customers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Campaign Name</Label>
              <Input value={campForm.name} onChange={(e) => setCampForm({ ...campForm, name: e.target.value })} placeholder="e.g., Weekend Flash Sale" />
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
              <Textarea value={campForm.content} onChange={(e) => setCampForm({ ...campForm, content: e.target.value })} placeholder="Compose your message..." rows={8} />
            </div>
            <div>
              <Label>Description (internal notes)</Label>
              <Input value={campForm.description} onChange={(e) => setCampForm({ ...campForm, description: e.target.value })} placeholder="Internal notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCampaign} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white">
              {editingCampaign ? 'Save Changes' : 'Create Campaign'}
            </Button>
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
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[previewTemplate?.category || ''] || ''}`}>
                {previewTemplate?.category}
              </span>
              <span className="text-xs text-[var(--text-muted)]">Email Blast</span>
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
    </SellerWorkspaceLayout>
  );
}

// ── Reusable Sub-Components ──────────────────────────────────────────────

function StatCard({ label, value, icon, loading }: {
  label: string; value: string | number; icon: React.ReactNode; loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-[var(--brand-accent-light)] p-2 rounded-lg text-[var(--brand-primary)]">
          {icon}
        </div>
        <div>
          {loading ? (
            <div className="h-6 w-12 bg-gray-100 animate-pulse rounded" />
          ) : (
            <p className="text-xl font-bold text-[var(--text-headline)]">{value}</p>
          )}
          <p className="text-xs text-[var(--text-muted)]">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ icon, title, description, action, onClick }: {
  icon: string; title: string; description: string; action: string; onClick: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-[var(--brand-primary)] transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <h4 className="text-sm font-medium text-[var(--text-headline)] mb-1">{title}</h4>
          <p className="text-xs text-[var(--text-muted)] mb-2">{description}</p>
          <Button size="sm" variant="outline" onClick={onClick} className="text-xs h-7">
            {action}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
