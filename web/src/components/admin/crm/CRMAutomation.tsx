import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Workflow, Plus, Pencil, Trash2, RefreshCw,
  Zap, Clock, Mail, MessageSquare, Bell, ArrowRight, Power, Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { AutomationWorkflow } from '@/stores/admin/adminCRMStore';
import { CRMTemplateModal } from './CRMTemplateModal';
import type { AutomationTemplate } from './crmTemplateData';

const TRIGGER_LABELS: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  order_placed:    { label: 'Order Placed', icon: Zap, color: 'text-amber-600 bg-amber-50' },
  order_confirmed: { label: 'Order Confirmed', icon: Zap, color: 'text-blue-600 bg-blue-50' },
  order_shipped:   { label: 'Order Shipped', icon: Zap, color: 'text-indigo-600 bg-indigo-50' },
  order_delivered:  { label: 'Order Delivered', icon: Zap, color: 'text-emerald-600 bg-emerald-50' },
  order_cancelled: { label: 'Order Cancelled', icon: Zap, color: 'text-red-600 bg-red-50' },
  payment_received: { label: 'Payment Received', icon: Zap, color: 'text-green-600 bg-green-50' },
  refund_processed: { label: 'Refund Processed', icon: Zap, color: 'text-orange-600 bg-orange-50' },
  welcome:         { label: 'Welcome (Sign Up)', icon: Zap, color: 'text-purple-600 bg-purple-50' },
};

const CHANNEL_ICONS: Record<string, { icon: typeof Mail; label: string }> = {
  email: { icon: Mail, label: 'Email' },
  sms:   { icon: MessageSquare, label: 'SMS' },
  push:  { icon: Bell, label: 'Push' },
};

const TRIGGER_EVENTS = Object.keys(TRIGGER_LABELS);

interface CRMAutomationProps {
  workflows: AutomationWorkflow[];
  loading: boolean;
  onRefresh: () => void;
  onCreate: (wf: Partial<AutomationWorkflow>) => Promise<AutomationWorkflow | null>;
  onUpdate: (id: string, updates: Partial<AutomationWorkflow>) => Promise<boolean>;
  onToggle: (id: string, enabled: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  adminId: string;
}

export function CRMAutomation({ workflows, loading, onRefresh, onCreate, onUpdate, onToggle, onDelete, adminId }: CRMAutomationProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationWorkflow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AutomationWorkflow | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', trigger_event: 'order_placed',
    channels: ['email'] as string[], delay_minutes: 0,
  });

  const openDialog = (wf?: AutomationWorkflow) => {
    setEditing(wf || null);
    setForm({
      name: wf?.name || '', description: wf?.description || '',
      trigger_event: wf?.trigger_event || 'order_placed',
      channels: wf?.channels || ['email'],
      delay_minutes: wf?.delay_minutes || 0,
    });
    setDialogOpen(true);
  };

  const handleApplyTemplate = (tpl: AutomationTemplate) => {
    setEditing(null);
    setForm({
      name: tpl.name,
      description: tpl.description,
      trigger_event: tpl.trigger_event,
      channels: [...tpl.channels],
      delay_minutes: tpl.delay_minutes,
    });
    setDialogOpen(true);
    toast({ title: `Template "${tpl.name}" applied`, description: 'Customize the workflow details before saving.' });
  };

  const [showTemplates, setShowTemplates] = useState(false);

  const save = async () => {
    if (!form.name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (!adminId) { toast({ title: 'Not authenticated', description: 'Please log in as an admin first.', variant: 'destructive' }); return; }
    if (editing) {
      const ok = await onUpdate(editing.id, form as Partial<AutomationWorkflow>);
      if (!ok) { toast({ title: 'Failed to update workflow', description: 'Check console for details.', variant: 'destructive' }); return; }
      toast({ title: 'Workflow updated' });
    } else {
      const result = await onCreate({ ...form, is_enabled: false, created_by: adminId } as Partial<AutomationWorkflow>);
      if (!result) { toast({ title: 'Failed to create workflow', description: 'Check console for details.', variant: 'destructive' }); return; }
      toast({ title: 'Workflow created' });
    }
    setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await onDelete(deleteConfirm.id);
    toast({ title: `"${deleteConfirm.name}" deleted` });
    setDeleteConfirm(null);
  };

  const enabledCount = workflows.filter(w => w.is_enabled).length;

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <Card className="p-4 border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-50"><Power className="w-4 h-4 text-emerald-600" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{enabledCount} Active</p>
              <p className="text-[10px] text-slate-500">of {workflows.length} workflows</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
            <Sparkles className="w-4 h-4 mr-1.5" /> Templates
          </Button>
          <Button size="sm" onClick={() => openDialog()} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> New Workflow
          </Button>
        </div>
      </Card>

      {/* Loading */}
      {loading && <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-amber-600" /></div>}

      {/* Empty */}
      {!loading && workflows.length === 0 && (
        <Card className="py-20 text-center border-slate-200/80">
          <Workflow className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-1">No automation workflows yet</p>
          <p className="text-xs text-slate-400 mb-4">Create workflows to automate notifications triggered by customer events.</p>
          <Button size="sm" onClick={() => openDialog()} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Create Your First Workflow
          </Button>
        </Card>
      )}

      {/* Workflow Cards - Visual Flow Layout */}
      {!loading && workflows.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {workflows.map(wf => {
              const trigger = TRIGGER_LABELS[wf.trigger_event] || TRIGGER_LABELS.order_placed;
              const TriggerIcon = trigger.icon;
              return (
                <motion.div key={wf.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} layout>
                  <Card className={`overflow-hidden border-slate-200/80 hover:shadow-md transition-all ${wf.is_enabled ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-slate-300'}`}>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${trigger.color}`}>
                            <TriggerIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">{wf.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{wf.description || 'No description'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={wf.is_enabled} onCheckedChange={(val) => onToggle(wf.id, val)} />
                          <Badge variant="secondary" className={`text-[10px] ${wf.is_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {wf.is_enabled ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>

                      {/* Visual Flow */}
                      <div className="flex items-center gap-2 mb-4 px-2 py-3 bg-slate-50 rounded-xl overflow-x-auto">
                        {/* Trigger */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className={`p-1 rounded ${trigger.color}`}><Zap className="w-3 h-3" /></div>
                          <span className="text-xs font-medium text-slate-700">{trigger.label}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />

                        {/* Delay */}
                        {wf.delay_minutes > 0 && (
                          <>
                            <div className="flex items-center gap-1.5 shrink-0 bg-white px-2 py-1 rounded-md border border-slate-200">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-slate-600">
                                {wf.delay_minutes >= 60 ? `${Math.floor(wf.delay_minutes / 60)}h ${wf.delay_minutes % 60}m` : `${wf.delay_minutes}m`}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                          </>
                        )}

                        {/* Channels */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {wf.channels.map(ch => {
                            const chInfo = CHANNEL_ICONS[ch] || CHANNEL_ICONS.email;
                            const ChIcon = chInfo.icon;
                            return (
                              <div key={ch} className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-200">
                                <ChIcon className="w-3 h-3 text-amber-600" />
                                <span className="text-xs text-slate-600">{chInfo.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">Created {new Date(wf.created_at).toLocaleDateString()}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openDialog(wf)}>
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={() => setDeleteConfirm(wf)}>
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                        </div>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{editing ? 'Edit Workflow' : 'Create Automation'}</DialogTitle>
            <DialogDescription>Automate notifications triggered by customer events.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium text-slate-700">Workflow Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Post-Purchase Follow-Up" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">Trigger Event</Label>
              <Select value={form.trigger_event} onValueChange={(v) => setForm({ ...form, trigger_event: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map(e => (
                    <SelectItem key={e} value={e}>{TRIGGER_LABELS[e]?.label || e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">Channels</Label>
              <div className="flex gap-3 mt-2">
                {Object.entries(CHANNEL_ICONS).map(([ch, info]) => {
                  const ChIcon = info.icon;
                  const selected = form.channels.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        channels: selected ? form.channels.filter(c => c !== ch) : [...form.channels, ch],
                      })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                        selected ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <ChIcon className="w-4 h-4" />
                      {info.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">Delay (minutes)</Label>
              <Input type="number" min="0" value={form.delay_minutes} onChange={(e) => setForm({ ...form, delay_minutes: parseInt(e.target.value) || 0 })} className="mt-1" />
              <p className="text-[10px] text-slate-400 mt-0.5">0 = send immediately after trigger</p>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the workflow..." rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-amber-600 hover:bg-amber-700 text-white">{editing ? 'Save Changes' : 'Create Workflow'}</Button>
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
            <Button variant="destructive" onClick={confirmDelete}>Delete Workflow</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CRMTemplateModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        section="automation"
        onApply={(tpl) => handleApplyTemplate(tpl as AutomationTemplate)}
      />
    </div>
  );
}
