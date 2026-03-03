import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  RotateCcw,
  AlertTriangle,
  Truck,
  ShieldAlert,
  DollarSign,
  Package,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SellerSidebar } from '@/components/seller/SellerSidebar';
import { useAuthStore } from '@/stores/sellerStore';
import { useSellerReturnStore, SellerReturnRequest, getStatusLabel, getStatusColor } from '@/stores/sellerReturnStore';
import { returnService, ReturnStatus } from '@/services/returnService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';



export function SellerReturns() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<SellerReturnRequest | null>(null);
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [counterOfferNote, setCounterOfferNote] = useState('');
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { seller, logout } = useAuthStore();
  const {
    requests,
    isLoading,
    loadRequests,
    approveRequest,
    rejectRequest,
    counterOfferRequest,
    requestItemBack,
    confirmReturnReceived,
  } = useSellerReturnStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (seller?.id) {
      loadRequests(seller.id);
    }
  }, [seller?.id, loadRequests]);

  const filteredRequests = requests.filter(req => {
    const matchesSearch =
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.buyerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const allCount = requests.length;
  const statusCounts: Record<string, number> = {};
  for (const r of requests) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  }

  const statusOptions: { value: ReturnStatus | 'all'; label: string; count: number }[] = [
    { value: 'all', label: 'All Returns', count: allCount },
    { value: 'pending', label: 'Pending', count: statusCounts['pending'] || 0 },
    { value: 'seller_review', label: 'Under Review', count: statusCounts['seller_review'] || 0 },
    { value: 'counter_offered', label: 'Counter Offered', count: statusCounts['counter_offered'] || 0 },
    { value: 'approved', label: 'Approved', count: statusCounts['approved'] || 0 },
    { value: 'rejected', label: 'Rejected', count: statusCounts['rejected'] || 0 },
    { value: 'escalated', label: 'Escalated', count: statusCounts['escalated'] || 0 },
    { value: 'return_in_transit', label: 'In Transit', count: statusCounts['return_in_transit'] || 0 },
    { value: 'refunded', label: 'Refunded', count: statusCounts['refunded'] || 0 },
  ];

  const getStatusBadgeColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      seller_review: 'bg-blue-100 text-blue-800',
      counter_offered: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      escalated: 'bg-purple-100 text-purple-800',
      return_in_transit: 'bg-indigo-100 text-indigo-800',
      return_received: 'bg-teal-100 text-teal-800',
      refunded: 'bg-green-100 text-green-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={cn(getStatusBadgeColor(status), 'hover:opacity-90 border-none')}>
        {getStatusLabel(status as ReturnStatus)}
      </Badge>
    );
  };

  const handleApprove = () => {
    if (selectedRequest) {
      approveRequest(selectedRequest.id);
      setSelectedRequest(null);
      resetDialogState();
    }
  };

  const handleReject = () => {
    if (selectedRequest && rejectReason.trim()) {
      rejectRequest(selectedRequest.id, rejectReason.trim());
      setSelectedRequest(null);
      resetDialogState();
    }
  };

  const handleCounterOffer = () => {
    if (selectedRequest && counterOfferAmount && counterOfferNote.trim()) {
      counterOfferRequest(selectedRequest.id, parseFloat(counterOfferAmount), counterOfferNote.trim());
      setSelectedRequest(null);
      resetDialogState();
    }
  };

  const handleRequestItemBack = () => {
    if (selectedRequest) {
      requestItemBack(selectedRequest.id);
      setSelectedRequest(null);
      resetDialogState();
    }
  };

  const handleConfirmReceived = () => {
    if (selectedRequest) {
      confirmReturnReceived(selectedRequest.id);
      setSelectedRequest(null);
      resetDialogState();
    }
  };

  const resetDialogState = () => {
    setShowCounterOffer(false);
    setShowRejectForm(false);
    setCounterOfferAmount('');
    setCounterOfferNote('');
    setRejectReason('');
  };

  const canTakeAction = (status: string) =>
    ['pending', 'seller_review'].includes(status);

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
      <SellerSidebar />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
        </div>

        <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto relative z-10 scrollbar-hide">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight">
                  Returns & Refunds
                </h1>
                <p className="text-sm text-[var(--text-muted)] mt-1 font-normal">Manage your return requests and refunds</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-row items-center gap-4">
                {/* Status Navigation Container */}
                <div className="flex-1 relative min-w-0">
                  <div className="overflow-x-auto scrollbar-hide pb-0.5">
                    <div className="inline-flex items-center p-1 bg-white rounded-full border border-orange-100/50 shadow-sm min-w-full md:min-w-max">
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setStatusFilter(option.value)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all duration-300",
                            statusFilter === option.value
                              ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                              : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50",
                          )}
                        >
                          {option.label}
                          {option.count > 0 && (
                            <span className={cn(
                              "ml-1 text-[10px] font-medium",
                              statusFilter === option.value
                                ? "text-white/90"
                                : "text-gray-400"
                            )}>
                              ({option.count})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="relative w-48 sm:w-64 lg:w-80 flex-shrink-0">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search returns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-orange-200 bg-white rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all shadow-sm"
                  />
                </div>
              </div>

              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-orange-100">
                      <TableHead className="py-4 text-sm text-[var(--secondary-foreground)]">Return ID</TableHead>
                      <TableHead className="py-4 text-sm text-[var(--secondary-foreground)]">Order ID</TableHead>
                      <TableHead className="py-4 text-sm text-[var(--secondary-foreground)]">Buyer</TableHead>
                      <TableHead className="py-4 text-sm text-[var(--secondary-foreground)]">Item</TableHead>
                      <TableHead className="py-4 text-sm text-[var(--secondary-foreground)]">Amount</TableHead>
                      <TableHead className="py-4 text-sm text-[var(--secondary-foreground)]">Path</TableHead>
                      <TableHead className="py-4 text-sm text-[var(--secondary-foreground)]">Date</TableHead>
                      <TableHead className="py-4 text-sm text-[var(--secondary-foreground)]">Status</TableHead>
                      <TableHead className="py-4 text-sm text-[var(--secondary-foreground)] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          No return requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests.map((req) => (
                        <TableRow key={req.id} className="group/row hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                          <TableCell className="font-medium">
                            <span className="font-bold text-[var(--secondary-foreground)] font-mono text-sm group-hover/row:text-[var(--brand-primary)] transition-colors">
                              #{req.id.slice(0, 8)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-[var(--secondary-foreground)] font-mono text-sm group-hover/row:text-[var(--brand-primary)] transition-colors">
                              {req.orderNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{req.buyerName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {req.items[0]?.image ? (
                                <img src={req.items[0].image} className="h-8 w-8 rounded bg-gray-100 object-cover" alt="" />
                              ) : (
                                <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                                  <Package className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                              <span className="text-sm truncate max-w-[150px]">{req.items[0]?.productName || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>₱{req.totalRefundAmount.toLocaleString()}</TableCell>
                          <TableCell>
                            {req.resolutionPath && (
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {req.resolutionPath.replace('_', ' ')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{new Date(req.requestDate).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="hover:bg-[var(--text-accent)] group" onClick={() => { setSelectedRequest(req); resetDialogState(); }}>
                              <Eye className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>

          {/* Detail Dialog */}
          <Dialog open={!!selectedRequest} onOpenChange={(open) => { if (!open) { setSelectedRequest(null); resetDialogState(); } }}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Return Request Details</DialogTitle>
                <DialogDescription>Review and take action on this return request</DialogDescription>
              </DialogHeader>

              {selectedRequest && (
                <div className="grid gap-4 py-4">
                  {/* Header info */}
                  <div className="flex justify-between items-start border-b pb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Request ID</p>
                      <p className="font-mono">#{selectedRequest.id.slice(0, 8)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <div>{getStatusBadge(selectedRequest.status)}</div>
                      {selectedRequest.resolutionPath && (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {selectedRequest.resolutionPath.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Deadline countdown */}
                  {selectedRequest.sellerDeadline && canTakeAction(selectedRequest.status) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">
                        Seller Deadline: {returnService.formatDeadlineRemaining(selectedRequest.sellerDeadline)}
                      </span>
                      <span className="text-xs text-amber-600 ml-auto">
                        Auto-escalates if no action taken
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Reason</p>
                      <p className="text-sm font-semibold">{selectedRequest.reason}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Requested Amount</p>
                      <p className="text-lg font-bold text-orange-600">₱{selectedRequest.totalRefundAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Buyer</p>
                      <p className="text-sm">{selectedRequest.buyerName}</p>
                      {selectedRequest.buyerEmail && (
                        <p className="text-xs text-gray-400">{selectedRequest.buyerEmail}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Return Type</p>
                      <p className="text-sm capitalize">{selectedRequest.returnType?.replace('_', ' & ') || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
                      <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                        {selectedRequest.description || 'No description provided'}
                      </div>
                    </div>
                  </div>

                  {/* Evidence Photos */}
                  {selectedRequest.evidenceUrls && selectedRequest.evidenceUrls.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                        <ImageIcon className="h-4 w-4" /> Evidence Photos ({selectedRequest.evidenceUrls.length})
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedRequest.evidenceUrls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Evidence ${idx + 1}`}
                            className="h-24 w-24 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  {selectedRequest.items.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">Items</p>
                      <div className="space-y-2">
                        {selectedRequest.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                            {item.image ? (
                              <img src={item.image} className="h-10 w-10 rounded object-cover" alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.productName}</p>
                              <p className="text-xs text-gray-500">Qty: {item.quantity} × ₱{item.price.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Counter-offer info (if already sent) */}
                  {selectedRequest.status === 'counter_offered' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-orange-800 flex items-center gap-1 mb-2">
                        <DollarSign className="h-4 w-4" /> Counter Offer Sent
                      </p>
                      <p className="text-lg font-bold text-orange-600">₱{selectedRequest.counterOfferAmount?.toLocaleString()}</p>
                      {selectedRequest.sellerNote && (
                        <p className="text-sm text-orange-700 mt-1">{selectedRequest.sellerNote}</p>
                      )}
                      <p className="text-xs text-orange-500 mt-2">Waiting for buyer response...</p>
                    </div>
                  )}

                  {/* Return shipping info */}
                  {selectedRequest.status === 'return_in_transit' && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-indigo-800 flex items-center gap-1 mb-2">
                        <Truck className="h-4 w-4" /> Return Shipment
                      </p>
                      {selectedRequest.returnTrackingNumber && (
                        <p className="text-sm text-indigo-700">Tracking: <span className="font-mono font-bold">{selectedRequest.returnTrackingNumber}</span></p>
                      )}
                      {selectedRequest.buyerShippedAt && (
                        <p className="text-xs text-indigo-500 mt-1">Shipped: {new Date(selectedRequest.buyerShippedAt).toLocaleString()}</p>
                      )}
                    </div>
                  )}

                  {/* Escalation info */}
                  {selectedRequest.status === 'escalated' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-purple-800 flex items-center gap-1">
                        <ShieldAlert className="h-4 w-4" /> Escalated to Admin
                      </p>
                      {selectedRequest.escalatedAt && (
                        <p className="text-xs text-purple-500 mt-1">
                          Escalated on: {new Date(selectedRequest.escalatedAt).toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-purple-600 mt-1">An admin will review this case and make a decision.</p>
                    </div>
                  )}

                  {/* Rejected reason */}
                  {selectedRequest.status === 'rejected' && selectedRequest.rejectedReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                      <p className="text-sm text-red-700 mt-1">{selectedRequest.rejectedReason}</p>
                    </div>
                  )}

                  {/* Counter-offer form */}
                  {showCounterOffer && canTakeAction(selectedRequest.status) && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-medium text-orange-800">Send Counter Offer</p>
                      <Input
                        type="number"
                        placeholder="Counter offer amount (₱)"
                        value={counterOfferAmount}
                        onChange={(e) => setCounterOfferAmount(e.target.value)}
                        className="bg-white"
                      />
                      <Textarea
                        placeholder="Explain why you're offering a different amount..."
                        value={counterOfferNote}
                        onChange={(e) => setCounterOfferNote(e.target.value)}
                        className="bg-white"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleCounterOffer} className="bg-orange-600 hover:bg-orange-700">
                          Send Offer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowCounterOffer(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reject form */}
                  {showRejectForm && canTakeAction(selectedRequest.status) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                      <Textarea
                        placeholder="Provide a reason for rejecting this return..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="bg-white"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>
                          Confirm Reject
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowRejectForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
                <Button variant="outline" onClick={() => { setSelectedRequest(null); resetDialogState(); }}>
                  Close
                </Button>
                {selectedRequest && canTakeAction(selectedRequest.status) && !showCounterOffer && !showRejectForm && (
                  <>
                    <Button
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={() => setShowCounterOffer(true)}
                    >
                      <DollarSign className="h-4 w-4 mr-1" /> Counter Offer
                    </Button>
                    <Button
                      variant="outline"
                      className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                      onClick={handleRequestItemBack}
                    >
                      <Package className="h-4 w-4 mr-1" /> Request Item Back
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectForm(true)}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve & Refund
                    </Button>
                  </>
                )}
                {selectedRequest?.status === 'return_in_transit' && (
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleConfirmReceived}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Confirm Received & Refund
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

