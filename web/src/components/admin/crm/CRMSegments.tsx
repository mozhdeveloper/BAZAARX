import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Pencil, Trash2, RefreshCw, Filter, LayoutGrid, List, UserCheck, Clock, ShoppingBag, Star, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { BuyerSegment } from '@/stores/admin/adminCRMStore';
import { CRMTemplateModal } from './CRMTemplateModal';
import type { SegmentTemplate } from './crmTemplateData';

const PRESET_SEGMENTS = [
  { name: 'High-Value Buyers', description: 'Buyers with total spending > ₱10,000', icon: Star, color: 'text-amber-600 bg-amber-50' },
  { name: 'New Buyers (7 days)', description: 'Buyers who signed up in the last 7 days', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
  { name: 'Inactive 30 Days', description: 'Buyers with no orders in 30+ days', icon: Clock, color: 'text-red-600 bg-red-50' },
  { name: 'Repeat Buyers', description: 'Buyers with 2+ completed orders', icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
];

interface CRMSegmentsProps {
  segments: BuyerSegment[];
  loading: boolean;
  onRefresh: () => void;
  onCreate: (seg: Partial<BuyerSegment>) => Promise<BuyerSegment | null>;
  onUpdate: (id: string, updates: Partial<BuyerSegment>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  adminId: string;
}

export function CRMSegments({ segments, loading, onRefresh, onCreate, onUpdate, onDelete, adminId }: CRMSegmentsProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BuyerSegment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BuyerSegment | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [showTemplates, setShowTemplates] = useState(false);

  const filtered = segments.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const openDialog = (seg?: BuyerSegment) => {
    setEditing(seg || null);
    setForm({ name: seg?.name || '', description: seg?.description || '' });
    setDialogOpen(true);
  };

  const handleApplyTemplate = (tpl: SegmentTemplate) => {
    setEditing(null);
    setForm({ name: tpl.name, description: tpl.description });
    setDialogOpen(true);
    toast({ title: `Template "${tpl.name}" applied`, description: 'Customize the segment details before saving.' });
  };

  const applyPreset = (preset: typeof PRESET_SEGMENTS[0]) => {
    setEditing(null);
    setForm({ name: preset.name, description: preset.description });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (!adminId) { toast({ title: 'Not authenticated', description: 'Please log in as an admin first.', variant: 'destructive' }); return; }
    if (editing) {
      const ok = await onUpdate(editing.id, { name: form.name, description: form.description });
      if (!ok) { toast({ title: 'Failed to update segment', description: 'Check console for details.', variant: 'destructive' }); return; }
      toast({ title: 'Segment updated' });
    } else {
      const result = await onCreate({ name: form.name, description: form.description, filter_criteria: {}, buyer_count: 0, is_dynamic: true, created_by: adminId });
      if (!result) { toast({ title: 'Failed to create segment', description: 'Check console for details.', variant: 'destructive' }); return; }
      toast({ title: 'Segment created' });
    }
    setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await onDelete(deleteConfirm.id);
    toast({ title: `"${deleteConfirm.name}" deleted` });
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search segments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 ${viewMode === 'grid' ? 'bg-slate-100' : 'hover:bg-slate-50'}`}><LayoutGrid className="w-4 h-4 text-slate-500" /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 ${viewMode === 'list' ? 'bg-slate-100' : 'hover:bg-slate-50'}`}><List className="w-4 h-4 text-slate-500" /></button>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
            <Sparkles className="w-4 h-4 mr-1.5" /> Templates
          </Button>
          <Button size="sm" onClick={() => openDialog()} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> New Segment
          </Button>
        </div>
      </div>

      {/* Quick Presets */}
      {segments.length === 0 && (
        <Card className="p-5 border-dashed border-2 border-slate-200 bg-slate-50/50">
          <p className="text-sm font-medium text-slate-700 mb-3">Quick Start — Popular Segments</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESET_SEGMENTS.map(preset => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all text-left"
              >
                <div className={`p-1.5 rounded-md ${preset.color}`}><preset.icon className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{preset.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{preset.description}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-amber-600" /></div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && segments.length > 0 && (
        <Card className="py-16 text-center border-slate-200/80">
          <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No segments match your search.</p>
        </Card>
      )}

      {!loading && segments.length === 0 && (
        <Card className="py-20 text-center border-slate-200/80">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-1">No buyer segments yet</p>
          <p className="text-xs text-slate-400 mb-4">Create segments to target specific buyer groups for your campaigns.</p>
          <Button size="sm" onClick={() => openDialog()} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Create Your First Segment
          </Button>
        </Card>
      )}

      {/* Grid View */}
      {!loading && viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map(seg => (
              <motion.div key={seg.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} layout>
                <Card className="p-5 hover:shadow-md transition-shadow border-slate-200/80 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-amber-50">
                      <Users className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDialog(seg)}><Pencil className="w-3.5 h-3.5 text-slate-500" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteConfirm(seg)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">{seg.name}</h3>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{seg.description || 'No description'}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">{seg.buyer_count} buyers</Badge>
                      <Badge variant="secondary" className={`text-[10px] ${seg.is_dynamic ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {seg.is_dynamic ? 'Dynamic' : 'Static'}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(seg.created_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && filtered.length > 0 && (
        <Card className="overflow-hidden border-slate-200/80">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Buyers</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(seg => (
                <motion.tr key={seg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{seg.name}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 max-w-xs truncate">{seg.description || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-center">
                    <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">{seg.buyer_count}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <Badge variant="secondary" className={`text-[10px] ${seg.is_dynamic ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {seg.is_dynamic ? 'Dynamic' : 'Static'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDialog(seg)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(seg)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{editing ? 'Edit Segment' : 'Create Segment'}</DialogTitle>
            <DialogDescription>Define a buyer segment for targeted campaigns.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium text-slate-700">Segment Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., High-Value Buyers" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what defines this segment..." rows={3} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-amber-600 hover:bg-amber-700 text-white">{editing ? 'Save Changes' : 'Create Segment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Delete "{deleteConfirm?.name}"?</DialogTitle>
            <DialogDescription>This action cannot be undone. The segment and its associations will be permanently removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete Segment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CRMTemplateModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        section="segment"
        onApply={(tpl) => handleApplyTemplate(tpl as SegmentTemplate)}
      />
    </div>
  );
}
