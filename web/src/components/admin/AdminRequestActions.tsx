/**
 * Admin moderation actions for a product request.
 * BX-07-029, BX-07-031, BX-07-032, BX-07-033, BX-07-034, BX-07-035.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { productRequestService, type ProductRequest } from '@/services/productRequestService';
import { CheckCircle2, XCircle, Pause, GitMerge, Link2, Loader2, Sparkles } from 'lucide-react';

interface Props {
  request: ProductRequest;
  onChanged: () => void;
}

type Modal = null | 'reject' | 'hold' | 'merge' | 'link' | 'convert';

export function AdminRequestActions({ request, onChanged }: Props) {
  const { toast } = useToast();
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [targetId, setTargetId] = useState('');

  const close = () => { setModal(null); setReason(''); setTargetId(''); };

  const run = async (action: 'approve' | 'reject' | 'hold' | 'resolve' | 'merge' | 'link_product') => {
    if ((action === 'reject' || action === 'hold') && !reason.trim()) {
      toast({ title: 'Reason is required', variant: 'destructive' }); return;
    }
    if ((action === 'merge' || action === 'link_product') && !targetId.trim()) {
      toast({ title: action === 'merge' ? 'Target request ID required' : 'Product ID required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const res = await productRequestService.adminAction({
      requestId: request.id, action, reason: reason || undefined, targetId: targetId || undefined,
    });
    setBusy(false);
    if (!res.success) {
      toast({ title: 'Action failed', description: res.error, variant: 'destructive' }); return;
    }
    toast({ title: 'Done', description: `Request → ${res.newStatus}` });
    close(); onChanged();
  };

  const convert = async () => {
    if (!targetId.trim()) { toast({ title: 'Product ID required', variant: 'destructive' }); return; }
    setBusy(true);
    const res = await productRequestService.convertToListing(request.id, targetId);
    setBusy(false);
    if (!res.success) { toast({ title: 'Conversion failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: '🎉 Converted', description: 'Stakers have been rewarded.' });
    close(); onChanged();
  };

  const isActionable = !['rejected', 'converted_to_listing', 'already_available'].includes(request.status);

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Admin Actions</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Button
          size="sm"
          disabled={!isActionable || request.status === 'approved_for_sourcing'}
          onClick={() => run('approve')}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
        </Button>
        <Button size="sm" variant="outline" disabled={!isActionable} onClick={() => setModal('reject')}>
          <XCircle className="h-4 w-4 mr-1 text-red-600" /> Reject
        </Button>
        <Button size="sm" variant="outline" disabled={!isActionable} onClick={() => setModal('hold')}>
          <Pause className="h-4 w-4 mr-1 text-amber-600" /> Hold
        </Button>
        <Button size="sm" variant="outline" disabled={!isActionable} onClick={() => setModal('merge')}>
          <GitMerge className="h-4 w-4 mr-1 text-purple-600" /> Merge
        </Button>
        <Button size="sm" variant="outline" disabled={!isActionable} onClick={() => setModal('link')}>
          <Link2 className="h-4 w-4 mr-1 text-blue-600" /> Link Product
        </Button>
        <Button
          size="sm"
          disabled={request.status !== 'approved_for_sourcing' && request.status !== 'in_progress'}
          onClick={() => setModal('convert')}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Sparkles className="h-4 w-4 mr-1" /> Convert
        </Button>
      </div>

      {request.status === 'on_hold' && (
        <Button size="sm" variant="ghost" className="mt-3" onClick={() => run('resolve')}>
          Clear hold and re-open
        </Button>
      )}

      <Dialog open={modal !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modal === 'reject' && 'Reject request'}
              {modal === 'hold' && 'Place on hold'}
              {modal === 'merge' && 'Merge into another request'}
              {modal === 'link' && 'Link to existing product'}
              {modal === 'convert' && 'Convert to product listing'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {(modal === 'reject' || modal === 'hold') && (
              <Textarea
                placeholder="Reason (visible to the buyer)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            )}
            {modal === 'merge' && (
              <Input placeholder="Canonical request ID (UUID)" value={targetId} onChange={(e) => setTargetId(e.target.value)} />
            )}
            {(modal === 'link' || modal === 'convert') && (
              <Input placeholder="Product ID (UUID) to link" value={targetId} onChange={(e) => setTargetId(e.target.value)} />
            )}
            {modal === 'convert' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                This will pay BazCoin rewards to all supporters and mark the request as fulfilled.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
            <Button
              disabled={busy}
              onClick={() =>
                modal === 'convert' ? convert() :
                modal === 'reject'  ? run('reject')  :
                modal === 'hold'    ? run('hold')    :
                modal === 'merge'   ? run('merge')   :
                                      run('link_product')
              }
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
