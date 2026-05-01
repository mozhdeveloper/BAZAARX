/**
 * Admin-only list of supplier offers for a product request.
 * BX-07-040, BX-07-041.
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supplierOfferService, type SupplierOffer, type OfferStatus } from '@/services/supplierOfferService';
import { Award, Star, X, Package, Clock } from 'lucide-react';

const STATUS_COLOR: Record<OfferStatus, string> = {
  submitted:   'bg-gray-100 text-gray-700',
  shortlisted: 'bg-blue-100 text-blue-800',
  rejected:    'bg-red-100 text-red-800',
  awarded:     'bg-green-100 text-green-800',
};

export function SupplierOffersList({ requestId, isAdmin = false }: { requestId: string; isAdmin?: boolean }) {
  const { toast } = useToast();
  const [offers, setOffers] = useState<SupplierOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    supplierOfferService.list(requestId).then((rows) => {
      setOffers(rows); setLoading(false);
    });
  };

  useEffect(() => { reload(); }, [requestId]);

  const setStatus = async (offerId: string, status: OfferStatus) => {
    try {
      await supplierOfferService.setStatus(offerId, status);
      toast({ title: `Marked as ${status}` });
      reload();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Package className="h-4 w-4" /> Supplier Offers ({offers.length})
      </h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : offers.length === 0 ? (
        <p className="text-sm text-gray-500">No offers yet. Suppliers will see this request when it's approved for sourcing.</p>
      ) : (
        <ul className="space-y-3">
          {offers.map((o) => (
            <li key={o.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium">{o.supplierStoreName || 'Unnamed seller'}</p>
                  <p className="text-xs text-gray-500 font-mono">{o.supplierId.slice(0, 8)}…</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${STATUS_COLOR[o.status]}`}>{o.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                <div>
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="font-semibold">₱{o.price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">MOQ</p>
                  <p className="font-semibold">{o.moq}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500"><Clock className="h-3 w-3 inline" /> Lead</p>
                  <p className="font-semibold">{o.leadTimeDays}d</p>
                </div>
              </div>
              {o.terms && <p className="text-xs text-gray-700 mb-1"><strong>Terms:</strong> {o.terms}</p>}
              {o.qualityNotes && <p className="text-xs text-gray-700 mb-2"><strong>Quality:</strong> {o.qualityNotes}</p>}

              {o.status === 'submitted' && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => setStatus(o.id, 'shortlisted')}>
                    <Star className="h-3 w-3 mr-1" /> Shortlist
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setStatus(o.id, 'awarded')}>
                    <Award className="h-3 w-3 mr-1" /> Award
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(o.id, 'rejected')}>
                    <X className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              )}
              {o.status === 'shortlisted' && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setStatus(o.id, 'awarded')}>
                  <Award className="h-3 w-3 mr-1" /> Award
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
