/**
 * Seller-facing sourcing dashboard.
 * Suppliers see approved-for-sourcing requests ranked by demand & stake,
 * and can submit competitive offers (BX-07-038, BX-07-039).
 */
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/sellerStore';
import { supplierOfferService, type SupplierOffer } from '@/services/supplierOfferService';
import { Coins, Users, TrendingUp, Loader2, Package, ChevronRight } from 'lucide-react';

const SellerSourcingRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { seller } = useAuthStore();

  const [requests, setRequests] = useState<any[]>([]);
  const [myOffers, setMyOffers] = useState<SupplierOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const [price, setPrice] = useState('');
  const [moq, setMoq] = useState('1');
  const [leadDays, setLeadDays] = useState('7');
  const [terms, setTerms] = useState('');
  const [quality, setQuality] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [reqs, offers] = await Promise.all([
      supplierOfferService.listEligibleForSuppliers(),
      seller?.id ? supplierOfferService.listForSupplier(seller.id) : Promise.resolve([]),
    ]);
    setRequests(reqs);
    setMyOffers(offers);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [seller?.id]);

  const offerForRequest = (rid: string) => myOffers.find((o) => o.requestId === rid);

  const submit = async () => {
    if (!seller?.id || !selected) return;
    if (!price || Number(price) <= 0) { toast({ title: 'Enter a valid price', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      await supplierOfferService.submit({
        requestId: selected.id,
        supplierId: seller.id,
        price: Number(price),
        moq: Math.max(1, Number(moq) || 1),
        leadTimeDays: Math.max(0, Number(leadDays) || 0),
        terms: terms || undefined,
        qualityNotes: quality || undefined,
      });
      toast({ title: 'Offer submitted', description: 'BazaarX will review and respond.' });
      setSelected(null); setPrice(''); setMoq('1'); setLeadDays('7'); setTerms(''); setQuality('');
      reload();
    } catch (err: any) {
      toast({ title: 'Failed to submit', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Sourcing Demand Board</h1>
          <p className="text-sm text-gray-600 mt-1">
            High-demand product requests approved for sourcing. Submit competitive offers to win these orders.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
        ) : requests.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-gray-500">
            <Package className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            No active sourcing requests at the moment. Check back soon.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((r) => {
              const existing = offerForRequest(r.id);
              return (
                <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="hover:shadow-md transition-shadow border">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">{r.title || r.product_name}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{r.summary || r.description}</p>
                        </div>
                        {r.category && <Badge variant="outline">{r.category}</Badge>}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 rounded p-2">
                          <Users className="h-4 w-4 mx-auto text-gray-500" />
                          <p className="text-sm font-bold mt-1">{r.demand_count ?? 0}</p>
                          <p className="text-[10px] text-gray-500 uppercase">Backers</p>
                        </div>
                        <div className="bg-amber-50 rounded p-2">
                          <Coins className="h-4 w-4 mx-auto text-amber-600" />
                          <p className="text-sm font-bold mt-1">{(r.staked_bazcoins ?? 0).toLocaleString()}</p>
                          <p className="text-[10px] text-amber-700 uppercase">Staked</p>
                        </div>
                        <div className="bg-blue-50 rounded p-2">
                          <TrendingUp className="h-4 w-4 mx-auto text-blue-600" />
                          <p className="text-sm font-bold mt-1 capitalize">{(r.sourcing_stage || 'quoting').replace(/_/g, ' ')}</p>
                          <p className="text-[10px] text-blue-700 uppercase">Stage</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/requests/${r.id}`)}>
                          View details <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                        {existing ? (
                          <Badge className="bg-green-100 text-green-800">
                            Offer {existing.status}
                          </Badge>
                        ) : (
                          <Button size="sm" onClick={() => setSelected(r)} className="bg-amber-500 hover:bg-amber-600">
                            Submit Offer
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit offer — {selected?.title || selected?.product_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Unit Price (₱)</label>
              <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 250.00" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700">MOQ</label>
                <Input type="number" min={1} value={moq} onChange={(e) => setMoq(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Lead time (days)</label>
                <Input type="number" min={0} value={leadDays} onChange={(e) => setLeadDays(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Terms</label>
              <Textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Payment, warranty, returns..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Quality notes</label>
              <Textarea rows={2} value={quality} onChange={(e) => setQuality(e.target.value)} placeholder="Materials, certifications..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)} disabled={submitting}>Cancel</Button>
            <Button onClick={submit} disabled={submitting} className="bg-amber-500 hover:bg-amber-600 text-white">
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerSourcingRequestsPage;
