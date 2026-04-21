import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Copy, Eye, RefreshCw, Sparkles, Mail, Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ADMIN_CAMPAIGN_TEMPLATES,
  type AdminCampaignTemplate,
  type EmailTemplate,
} from '@/stores/admin/adminCRMStore';

const CATEGORY_STYLES: Record<string, string> = {
  platform:      'bg-blue-50 text-blue-700 border-blue-200',
  seasonal:      'bg-orange-50 text-orange-700 border-orange-200',
  growth:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  retention:     'bg-purple-50 text-purple-700 border-purple-200',
  transactional: 'bg-blue-50 text-blue-700 border-blue-200',
  marketing:     'bg-purple-50 text-purple-700 border-purple-200',
  system:        'bg-slate-100 text-slate-600 border-slate-200',
};

interface CRMTemplatesProps {
  emailTemplates: EmailTemplate[];
  emailTemplatesLoading: boolean;
  onRefreshTemplates: () => void;
  onApplyTemplate: (tpl: AdminCampaignTemplate) => void;
}

export function CRMTemplates({ emailTemplates, emailTemplatesLoading, onRefreshTemplates, onApplyTemplate }: CRMTemplatesProps) {
  const { toast } = useToast();
  const [previewPlatform, setPreviewPlatform] = useState<AdminCampaignTemplate | null>(null);
  const [previewSaved, setPreviewSaved] = useState<EmailTemplate | null>(null);

  return (
    <div className="space-y-6">
      {/* Platform Campaign Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Platform Campaign Templates
              <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700">{ADMIN_CAMPAIGN_TEMPLATES.length}</Badge>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Pre-built templates to quickly launch platform-wide campaigns</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ADMIN_CAMPAIGN_TEMPLATES.map((tpl, i) => (
            <motion.div key={tpl.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="overflow-hidden hover:shadow-md transition-all border-slate-200/80 hover:border-amber-300 group">
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{tpl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">{tpl.name}</h4>
                        <Badge variant="outline" className={`text-[10px] capitalize shrink-0 ${CATEGORY_STYLES[tpl.category] || ''}`}>{tpl.category}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{tpl.description}</p>

                      {/* Subject preview */}
                      <div className="bg-slate-50 rounded-lg px-3 py-2 mb-3">
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Subject</p>
                        <p className="text-xs text-slate-700 truncate">{tpl.subject}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => onApplyTemplate(tpl)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8">
                          <Copy className="w-3 h-3 mr-1.5" /> Use Template
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPreviewPlatform(tpl)} className="text-xs h-8">
                          <Eye className="w-3 h-3 mr-1.5" /> Preview
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Saved DB Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-600" />
              Saved Email Templates
              <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700">{emailTemplates.length}</Badge>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Templates stored in the database for transactional and marketing emails</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRefreshTemplates} disabled={emailTemplatesLoading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${emailTemplatesLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {emailTemplatesLoading && <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-amber-600" /></div>}

        {!emailTemplatesLoading && emailTemplates.length === 0 && (
          <Card className="py-16 text-center border-slate-200/80">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No saved email templates in the database.</p>
            <p className="text-xs text-slate-400 mt-1">Templates seeded in migrations will appear here.</p>
          </Card>
        )}

        {!emailTemplatesLoading && emailTemplates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {emailTemplates.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card
                  className="p-4 hover:shadow-md transition-all border-slate-200/80 cursor-pointer hover:border-amber-300"
                  onClick={() => setPreviewSaved(t)}
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="p-1.5 rounded-md bg-amber-50">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <h4 className="text-sm font-medium text-slate-900 truncate">{t.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mb-3 truncate">{t.subject}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] capitalize ${CATEGORY_STYLES[t.category] || ''}`}>{t.category}</Badge>
                    <Badge variant="secondary" className={`text-[10px] ${t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {t.variables.length > 0 && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Tag className="w-3 h-3" /> {t.variables.length} vars
                      </span>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Platform Template Preview */}
      <Dialog open={!!previewPlatform} onOpenChange={() => setPreviewPlatform(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <span className="text-xl">{previewPlatform?.icon}</span>
              {previewPlatform?.name}
            </DialogTitle>
            <DialogDescription>{previewPlatform?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium text-slate-500">Subject</Label>
              <div className="bg-slate-50 rounded-lg p-3 mt-1">
                <p className="text-sm text-slate-800">{previewPlatform?.subject}</p>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500">Email Body</Label>
              <div className="bg-slate-50 rounded-lg p-4 mt-1 max-h-[40vh] overflow-y-auto">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{previewPlatform?.content}</pre>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewPlatform(null)}>Close</Button>
            <Button onClick={() => { if (previewPlatform) { onApplyTemplate(previewPlatform); setPreviewPlatform(null); } }} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Copy className="w-4 h-4 mr-2" /> Use This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saved Template Preview */}
      <Dialog open={!!previewSaved} onOpenChange={() => setPreviewSaved(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <FileText className="w-5 h-5 text-amber-600" />
              {previewSaved?.name}
            </DialogTitle>
            <DialogDescription>Slug: {previewSaved?.slug} — {previewSaved?.category}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium text-slate-500">Subject</Label>
              <div className="bg-slate-50 rounded-lg p-3 mt-1">
                <p className="text-sm text-slate-800">{previewSaved?.subject}</p>
              </div>
            </div>
            {previewSaved?.variables && previewSaved.variables.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-slate-500">Variables</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {previewSaved.variables.map(v => (
                    <Badge key={v} variant="secondary" className="text-[10px] bg-slate-100">{`{{${v}}}`}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs font-medium text-slate-500">HTML Preview</Label>
              <div className="mt-1 border rounded-lg overflow-hidden bg-white">
                <iframe
                  srcDoc={previewSaved?.html_body || ''}
                  title="Template Preview"
                  className="w-full h-[400px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewSaved(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
