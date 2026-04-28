import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth, useAdminPayouts, Payout } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { useAdminRealtime } from '@/hooks/useAdminRealtime';
import {
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  ChevronRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AdminPayouts: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const { payouts, isLoading, loadPayouts, markAsPaid, processBatch } = useAdminPayouts();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'paid' | 'failed'>('all');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [selectedPayoutIds, setSelectedPayoutIds] = useState<string[]>([]);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  // Live updates: payouts derive from order_items + seller_payout_settings.
  // NOTE: realtime must subscribe to a base table — `seller_payout_accounts`
  // is now a view (see migration 040) and emits no logical-replication events.
  useAdminRealtime('order_items', loadPayouts, { channelName: 'admin-payouts-items' });
  useAdminRealtime('seller_payout_settings', loadPayouts, { channelName: 'admin-payouts-accounts' });

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const filteredPayouts = payouts.filter(payout => {
    const matchesSearch = payout.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payout.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleMarkPaidClick = (payout: Payout) => {
    setSelectedPayout(payout);
    setReferenceNumber('');
    setIsMarkPaidDialogOpen(true);
  };

  const handleConfirmMarkPaid = async () => {
    if (selectedPayout && referenceNumber) {
      await markAsPaid(selectedPayout.id, referenceNumber);
      setIsMarkPaidDialogOpen(false);
      setSelectedPayout(null);
    }
  };

  const handleProcessBatch = async () => {
    if (selectedPayoutIds.length > 0) {
      await processBatch(selectedPayoutIds);
      setSelectedPayoutIds([]);
    }
  };

  const toggleSelectPayout = (id: string) => {
    if (selectedPayoutIds.includes(id)) {
      setSelectedPayoutIds(selectedPayoutIds.filter(pid => pid !== id));
    } else {
      setSelectedPayoutIds([...selectedPayoutIds, id]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> Paid</span>;
      case 'pending':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" /> Pending</span>;
      case 'processing':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"><Clock className="w-3 h-3" /> Processing</span>;
      case 'failed':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800"><AlertCircle className="w-3 h-3" /> Failed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">Payout Management</h1>
              <p className="text-[var(--text-muted)]">Process and track seller payouts</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex items-center gap-2 hover:bg-base hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
              {selectedPayoutIds.length > 0 && (
                <Button onClick={handleProcessBatch} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] hover:text-white">
                  Process Batch ({selectedPayoutIds.length})
                </Button>
              )}
            </div>
          </div>



          {/* Stats calculation */}
          {(() => {
            const stats = {
              all: payouts.length,
              pending: payouts.filter(p => p.status === 'pending').length,
              processing: payouts.filter(p => p.status === 'processing').length,
              paid: payouts.filter(p => p.status === 'paid').length,
              failed: payouts.filter(p => p.status === 'failed').length,
            };

            return (
              <div className="flex items-center justify-between gap-6 mb-4">
                <div className="bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm rounded-full p-0.5 overflow-x-auto scrollbar-hide">
                  <div className="flex items-center gap-0.5">
                    {[
                      { id: 'all', label: 'All', count: stats.all },
                      { id: 'pending', label: 'Pending', count: stats.pending },
                      { id: 'processing', label: 'Processing', count: stats.processing },
                      { id: 'paid', label: 'Paid', count: stats.paid },
                      { id: 'failed', label: 'Failed', count: stats.failed },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id as any)}
                        className={`relative px-4 h-7 text-xs font-medium transition-all duration-300 rounded-full flex items-center gap-1.5 whitespace-nowrap z-10 ${statusFilter === tab.id
                          ? 'text-white'
                          : 'text-gray-500 hover:text-[var(--brand-primary)]'
                          }`}
                      >
                        {tab.label}
                        <span className={`text-[10px] font-normal transition-colors ${statusFilter === tab.id ? 'text-white/80' : 'text-[var(--text-muted)]/60'}`}>
                          ({tab.count})
                        </span>
                        {statusFilter === tab.id && (
                          <motion.div
                            layoutId="activeTabPill"
                            className="absolute inset-0 bg-[var(--brand-primary)] rounded-full -z-10"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative w-[320px] group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--brand-primary)]" />
                  <Input
                    placeholder="Search seller or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 bg-white border-gray-200 rounded-xl shadow-sm focus:border-[var(--brand-primary)] focus:ring-0 placeholder:text-gray-400 text-sm"
                  />
                </div>
              </div>
            );
          })()}

          {/* Payouts Table */}
          <div className="bg-white border-none shadow-md rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 w-10">
                    </th>
                    <th className="px-6 py-3 text-sm font-medium text-[var(--text-secondary)]">Reference / Date</th>
                    <th className="px-6 py-3 text-sm font-medium text-[var(--text-secondary)]">Seller</th>
                    <th className="px-6 py-3 text-sm font-medium text-[var(--text-secondary)]">Amount</th>
                    <th className="px-6 py-3 text-sm font-medium text-[var(--text-secondary)]">Bank Details</th>
                    <th className="px-6 py-3 text-sm font-medium text-[var(--text-secondary)]">Status</th>
                    <th className="px-6 py-3 text-sm font-medium text-[var(--text-secondary)] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        Loading payouts...
                      </td>
                    </tr>
                  ) : filteredPayouts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No payouts found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPayouts.map((payout) => (
                      <motion.tr
                        key={payout.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={selectedPayoutIds.includes(payout.id)}
                            onChange={() => toggleSelectPayout(payout.id)}
                            disabled={payout.status === 'paid'}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{payout.referenceNumber}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(payout.periodEnd).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{payout.sellerName}</div>
                          <div className="text-xs text-gray-500">ID: {payout.sellerId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">₱{payout.amount.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{payout.bankName}</div>
                          <div className="text-xs text-gray-500 font-mono">{payout.accountNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(payout.status)}
                        </td>
                        <td className="px-2 py-4 text-right">
                          {payout.status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkPaidClick(payout)}
                              className="text-xs bg-transparent hover:bg-transparent hover:text-[var(--brand-primary)] border-0"
                            >
                              Mark Paid <ChevronRight className="w-3 h-3" />
                            </Button>
                          )}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>


          {/* Mark Paid Dialog */}
          <Dialog open={isMarkPaidDialogOpen} onOpenChange={setIsMarkPaidDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Payout</DialogTitle>
                <DialogDescription>
                  Enter the transaction reference number to mark this payout as paid.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Seller:</span>
                    <span className="font-medium">{selectedPayout?.sellerName}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Amount:</span>
                    <span className="font-bold text-[var(--brand-primary)]">₱{selectedPayout?.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bank:</span>
                    <span>{selectedPayout?.bankName} - {selectedPayout?.accountNumber}</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="ref" className="mb-2 block">Transaction Reference Number</Label>
                  <Input
                    id="ref"
                    placeholder="e.g., TR-123456789"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" className="bg-transparent text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-600" onClick={() => setIsMarkPaidDialogOpen(false)}>Cancel</Button>
                <Button
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)]"
                  onClick={handleConfirmMarkPaid}
                  disabled={!referenceNumber}
                >
                  Confirm Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default AdminPayouts;
