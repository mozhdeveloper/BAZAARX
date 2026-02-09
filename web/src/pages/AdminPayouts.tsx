import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth, useAdminPayouts, Payout } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import {
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar
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

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

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
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payout Management</h1>
              <p className="text-gray-500 mt-1">Process and track seller payouts</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
              {selectedPayoutIds.length > 0 && (
                <Button onClick={handleProcessBatch} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
                  Process Batch ({selectedPayoutIds.length})
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search seller or reference number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="text-gray-400 h-5 w-5" />
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--brand-primary)] outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'processing' | 'paid' | 'failed')}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Payouts Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 w-10">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Reference / Date</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Details</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
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
                        <td className="px-6 py-4 text-right">
                          {payout.status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkPaidClick(payout)}
                              className="text-xs"
                            >
                              Mark Paid
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
            <Button variant="outline" onClick={() => setIsMarkPaidDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
              onClick={handleConfirmMarkPaid}
              disabled={!referenceNumber}
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayouts;
