import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Plus, Pencil, Trash2, RefreshCw, Send, Filter,
  ChevronRight, Sparkles, Eye,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AIContentGenerator } from './AIContentGenerator';
import { CRMTemplateModal } from './CRMTemplateModal';
import { buildCampaignEmailPreviewHtml } from './crmTemplateData';
import type { CampaignTemplate } from './crmTemplateData';
import type { MarketingCampaign, BuyerSegment } from '@/stores/admin/adminCRMStore';

const STATUS_CONFIG: Record<string, { color: string; dot: string }> = {
  draft:     { color: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  scheduled: { color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  sending:   { color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  sent:      { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  paused:    { color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  cancelled: { color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

const PIPELINE_STAGES = ['draft', 'scheduled', 'sending', 'sent'] as const;

interface CRMCampaignsProps {
  campaigns: MarketingCampaign[];
  segments: BuyerSegment[];
  loading: boolean;
  onRefresh: () => void;
  onCreate: (camp: Partial<MarketingCampaign>) => Promise<MarketingCampaign | null>;
  onUpdate: (id: string, updates: Partial<MarketingCampaign>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  adminId: string;
}

export function CRMCampaigns({
  campaigns, segments, loading, onRefresh, onCreate, onUpdate, onDelete,
  adminId,
}: CRMCampaignsProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingCampaign | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MarketingCampaign | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', campaign_type: 'email_blast' as string,
    subject: '', content: '', segment_id: '' as string,
  });

  const filtered = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openDialog = (camp?: MarketingCampaign) => {
    setEditing(camp || null);
    setForm({
      name: camp?.name || '', description: camp?.description || '',
      campaign_type: camp?.campaign_type || 'email_blast',
      subject: camp?.subject || '', content: camp?.content || '',
      segment_id: camp?.segment_id || '',
    });
    setShowAI(false);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (!adminId) { toast({ title: 'Not authenticated', description: 'Please log in as an admin first.', variant: 'destructive' }); return; }
    const payload: Partial<MarketingCampaign> = {
      name: form.name, description: form.description, campaign_type: form.campaign_type as MarketingCampaign['campaign_type'],
      subject: form.subject, content: form.content,
      segment_id: form.segment_id || null,
    };
    if (editing) {
      const ok = await onUpdate(editing.id, payload);
      if (!ok) { toast({ title: 'Failed to update campaign', description: 'Check console for details.', variant: 'destructive' }); return; }
      toast({ title: 'Campaign updated' });
    } else {
      const result = await onCreate({ ...payload, status: 'draft', created_by: adminId });
      if (!result) { toast({ title: 'Failed to create campaign', description: 'Check console for details.', variant: 'destructive' }); return; }
      toast({ title: 'Campaign created' });
    }
    setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await onDelete(deleteConfirm.id);
    toast({ title: `"${deleteConfirm.name}" deleted` });
    setDeleteConfirm(null);
  };

  // Pipeline view counts
  const pipelineCounts = PIPELINE_STAGES.map(s => ({ stage: s, count: campaigns.filter(c => c.status === s).length }));

  const handleApplyTemplate = (tpl: CampaignTemplate) => {
    setForm({
      name: tpl.name,
      description: tpl.description,
      campaign_type: tpl.campaign_type,
      subject: tpl.subject,
      content: tpl.content,
      segment_id: '',
    });
    setEditing(null);
    setShowAI(false);
    setDialogOpen(true);
    toast({ title: `Template "${tpl.name}" loaded`, description: 'Customize and save your campaign.' });
  };

  return (
    <div className="space-y-4">
      {/* Pipeline Status Bar */}
      <Card className="p-4 border-slate-200/80">
        <div className="flex items-center gap-2">
          {pipelineCounts.map((p, i) => {
            const cfg = STATUS_CONFIG[p.stage] || STATUS_CONFIG.draft;
            return (
              <div key={p.stage} className="flex items-center gap-2 flex-1">
                <div className={`flex-1 rounded-lg p-3 text-center ${cfg.color} border cursor-pointer hover:shadow-sm transition-shadow`} onClick={() => setStatusFilter(p.stage === statusFilter ? 'all' : p.stage)}>
                  <p className="text-lg font-bold">{p.count}</p>
                  <p className="text-[10px] uppercase tracking-wide font-medium capitalize">{p.stage}</p>
                </div>
                {i < pipelineCounts.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.keys(STATUS_CONFIG).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
            <Sparkles className="w-4 h-4 mr-1.5 text-amber-600" /> Templates
          </Button>
          <Button size="sm" onClick={() => openDialog()} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-amber-600" /></div>}

      {/* Empty */}
      {!loading && campaigns.length === 0 && (
        <Card className="py-20 text-center border-slate-200/80">
          <Megaphone className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-1">No campaigns yet</p>
          <p className="text-xs text-slate-400 mb-4">Create a campaign from scratch or start with a template.</p>
          <div className="flex justify-center gap-3">
            <Button size="sm" onClick={() => openDialog()} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> New Campaign
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowTemplates(true)}>
              <Sparkles className="w-4 h-4 mr-1.5" /> Browse Templates
            </Button>
          </div>
        </Card>
      )}

      {/* No results */}
      {!loading && filtered.length === 0 && campaigns.length > 0 && (
        <Card className="py-16 text-center border-slate-200/80">
          <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No campaigns match your filters.</p>
        </Card>
      )}

      {/* Campaign Cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map(camp => {
              const cfg = STATUS_CONFIG[camp.status] || STATUS_CONFIG.draft;
              const deliveryRate = camp.total_sent > 0 ? Math.round((camp.total_delivered / camp.total_sent) * 100) : 0;
              return (
                <motion.div key={camp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} layout>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow border-slate-200/80 group">
                    {/* Status strip */}
                    <div className={`h-1 ${cfg.dot}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-slate-900 truncate">{camp.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(camp.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] capitalize shrink-0 ml-2 ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5`} />{camp.status}
                        </Badge>
                      </div>

                      {camp.subject && <p className="text-xs text-slate-600 bg-slate-50 rounded-md px-2.5 py-1.5 mb-3 truncate">{camp.subject}</p>}

                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                        <Badge variant="secondary" className="text-[10px] capitalize">{camp.campaign_type.replace('_', ' ')}</Badge>
                        {camp.total_sent > 0 && (
                          <span className="flex items-center gap-1"><Send className="w-3 h-3" />{camp.total_sent} sent</span>
                        )}
                      </div>

                      {/* Mini metrics bar */}
                      {camp.total_sent > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-slate-500">Delivery: {deliveryRate}%</span>
                            <span className="text-slate-400">{camp.total_delivered}/{camp.total_sent}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${deliveryRate}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openDialog(camp)}>
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={() => setDeleteConfirm(camp)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`max-h-[85vh] overflow-y-auto ${showPreview ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}>
          <DialogHeader>
            <DialogTitle className="text-slate-900">{editing ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
            <DialogDescription>Set up an email or SMS marketing campaign.</DialogDescription>
          </DialogHeader>
          <div className={showPreview ? 'grid grid-cols-2 gap-4' : ''}>
            {/* Form Column */}
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-medium text-slate-700">Campaign Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Holiday Sale 2025" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-slate-700">Type</Label>
                  <Select value={form.campaign_type} onValueChange={(v) => setForm({ ...form, campaign_type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email_blast">Email Blast</SelectItem>
                      <SelectItem value="sms_blast">SMS Blast</SelectItem>
                      <SelectItem value="multi_channel">Multi-Channel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-700">Target Segment</Label>
                  <Select value={form.segment_id} onValueChange={(v) => setForm({ ...form, segment_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="All buyers" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Buyers</SelectItem>
                      {segments.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.buyer_count})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700">Subject Line</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Email subject..." className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700">Content / Body</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Compose your message..." rows={5} className="mt-1" />
              </div>

              {/* AI Generator Toggle */}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAI(!showAI)} className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> {showAI ? 'Hide AI Generator' : '✨ Generate with AI'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="text-xs">
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> {showPreview ? 'Hide Preview' : 'Preview Email'}
                </Button>
              </div>
              {showAI && (
                <AIContentGenerator
                  campaignName={form.name}
                  campaignType={form.campaign_type}
                  onApplySubject={(s) => setForm({ ...form, subject: s })}
                  onApplyContent={(c) => setForm({ ...form, content: c })}
                />
              )}

              <div>
                <Label className="text-xs font-medium text-slate-700">Internal Notes</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Internal notes..." className="mt-1" />
              </div>
            </div>

            {/* Email Preview Column */}
            {showPreview && (
              <div className="py-2">
                <Label className="text-xs font-medium text-slate-700 mb-2 block">Email Preview</Label>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <iframe
                    srcDoc={buildCampaignEmailPreviewHtml(form.subject, form.content, form.name)}
                    title="Email Preview"
                    className="w-full border-0"
                    style={{ height: '480px' }}
                    sandbox="allow-same-origin"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">Live preview — updates as you type.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-amber-600 hover:bg-amber-700 text-white">{editing ? 'Save Changes' : 'Create Campaign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Delete "{deleteConfirm?.name}"?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Modal */}
      <CRMTemplateModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        section="campaign"
        onApply={(tpl) => handleApplyTemplate(tpl as CampaignTemplate)}
      />
    </div>
  );
}
