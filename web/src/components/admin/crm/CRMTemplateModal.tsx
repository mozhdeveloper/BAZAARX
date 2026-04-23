import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Check, Sparkles, ArrowLeft,
  Megaphone, Users, Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  type TemplateSection, type AnyTemplate, type CampaignTemplate,
  type SegmentTemplate, type AutomationTemplate,
  CAMPAIGN_TEMPLATES, SEGMENT_TEMPLATES, AUTOMATION_TEMPLATES,
  CATEGORY_STYLES, buildPreviewHtml,
} from './crmTemplateData';

const SECTION_META: Record<TemplateSection, { title: string; subtitle: string; icon: typeof Megaphone }> = {
  campaign: { title: 'Campaign Templates', subtitle: 'Pick a pre-built campaign to customize and send.', icon: Megaphone },
  segment: { title: 'Segment Templates', subtitle: 'Start with a proven audience segment definition.', icon: Users },
  automation: { title: 'Automation Templates', subtitle: 'Choose a workflow template to automate communications.', icon: Workflow },
};

// ─── Modal Component ─────────────────────────────────────────────────────────

interface CRMTemplateModalProps {
  open: boolean;
  onClose: () => void;
  section: TemplateSection;
  onApply: (template: AnyTemplate) => void;
}

export function CRMTemplateModal({ open, onClose, section, onApply }: CRMTemplateModalProps) {
  const [preview, setPreview] = useState<AnyTemplate | null>(null);
  const meta = SECTION_META[section];
  const SectionIcon = meta.icon;

  const templates: AnyTemplate[] =
    section === 'campaign' ? CAMPAIGN_TEMPLATES :
    section === 'segment' ? SEGMENT_TEMPLATES :
    AUTOMATION_TEMPLATES;

  const handleUse = (tpl: AnyTemplate) => {
    onApply(tpl);
    setPreview(null);
    onClose();
  };

  const handleClose = () => {
    setPreview(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-4xl max-h-[88vh] p-0 gap-0 overflow-hidden">
        {/* Accessible Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b bg-slate-50/80 space-y-0">
          <div className="flex items-center gap-3">
            {preview && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-1" onClick={() => setPreview(null)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="p-2 rounded-lg bg-amber-50">
              <SectionIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900">
                {preview ? preview.name : meta.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {preview ? 'Template preview' : meta.subtitle}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {preview && (
              <Button size="sm" onClick={() => handleUse(preview)} className="bg-amber-600 hover:bg-amber-700 text-white">
                <Check className="w-4 h-4 mr-1.5" /> Use This Template
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(88vh - 73px)' }}>
          <AnimatePresence mode="wait">
            {preview ? (
              /* ── Preview Pane ── */
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="p-6"
              >
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                  <iframe
                    srcDoc={buildPreviewHtml(preview, section)}
                    title="Template Preview"
                    className="w-full border-0"
                    style={{ height: '520px' }}
                    sandbox="allow-same-origin"
                  />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <Button variant="outline" size="sm" onClick={() => setPreview(null)}>
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Templates
                  </Button>
                  <Button size="sm" onClick={() => handleUse(preview)} className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Check className="w-4 h-4 mr-1.5" /> Use This Template
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* ── Template Grid ── */
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((tpl) => {
                    const catStyle = CATEGORY_STYLES[tpl.category] || 'bg-slate-50 text-slate-600 border-slate-200';
                    return (
                      <motion.div
                        key={tpl.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-md transition-all cursor-default"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-2xl">{tpl.icon}</span>
                          <Badge variant="outline" className={`text-[10px] capitalize ${catStyle}`}>
                            {tpl.category}
                          </Badge>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-1">{tpl.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4">{tpl.description}</p>

                        {/* Section-specific meta */}
                        {'subject' in tpl && (
                          <p className="text-[11px] text-slate-400 bg-slate-50 rounded-md px-2 py-1.5 truncate mb-3">
                            <span className="font-medium text-slate-500">Subject:</span> {(tpl as CampaignTemplate).subject}
                          </p>
                        )}
                        {'trigger_event' in tpl && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700">
                              {(tpl as AutomationTemplate).trigger_event.replace(/_/g, ' ')}
                            </Badge>
                            {(tpl as AutomationTemplate).channels.map(ch => (
                              <Badge key={ch} variant="secondary" className="text-[10px]">{ch}</Badge>
                            ))}
                          </div>
                        )}
                        {'filter_criteria' in tpl && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {Object.keys((tpl as SegmentTemplate).filter_criteria).slice(0, 3).map(k => (
                              <Badge key={k} variant="secondary" className="text-[10px]">{k.replace(/_/g, ' ')}</Badge>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setPreview(tpl)}>
                            <Eye className="w-3 h-3 mr-1" /> Preview
                          </Button>
                          <Button size="sm" className="flex-1 h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleUse(tpl)}>
                            <Sparkles className="w-3 h-3 mr-1" /> Use Template
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
