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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SellerSidebar } from '@/components/seller/SellerSidebar';
import { useAuthStore } from '@/stores/sellerStore';
import { useSellerReturnStore, SellerReturnRequest } from '@/stores/sellerReturnStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<SellerReturnRequest | null>(null);

  const { seller, logout } = useAuthStore();
  const { requests, isLoading, loadRequests, approveRequest, rejectRequest } = useSellerReturnStore();
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
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const statusOptions = [
    { value: 'all', label: 'All Returns', count: allCount },
    { value: 'pending', label: 'Pending', count: pendingCount },
    { value: 'approved', label: 'Approved', count: approvedCount },
    { value: 'rejected', label: 'Rejected', count: rejectedCount },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-none">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handeApprove = () => {
    if (selectedRequest) {
      approveRequest(selectedRequest.id);
      setSelectedRequest(null);
    }
  };

  const handleReject = () => {
    if (selectedRequest) {
      rejectRequest(selectedRequest.id);
      setSelectedRequest(null);
    }
  };

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
                          onClick={() => setStatusFilter(option.value as any)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-300",
                            statusFilter === option.value
                              ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                              : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50",
                          )}
                        >
                          {option.label}
                          <span className={cn(
                            "ml-1 text-[11px] font-medium",
                            statusFilter === option.value
                              ? "text-white/90"
                              : "text-gray-400 group-hover:text-[var(--brand-primary)]"
                          )}>
                            ({option.count})
                          </span>
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
                      <TableHead className="py-4 text-sm text-[var(--secondary-foreground)]">Date</TableHead>
                      <TableHead className="py-4 text-sm text-[var(--secondary-foreground)]">Status</TableHead>
                      <TableHead className="py-4 text-sm text-[var(--secondary-foreground)] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No return requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests.map((req) => (
                        <TableRow key={req.id} className="group/row hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                          <TableCell className="font-medium">
                            <span className="font-bold text-[var(--secondary-foreground)] font-mono text-sm group-hover/row:text-[var(--brand-primary)] transition-colors">
                              #{req.id}
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
                              <img src={req.items[0].image} className="h-8 w-8 rounded bg-gray-100 object-cover" alt="" />
                              <span className="text-sm truncate max-w-[150px]">{req.items[0].productName}</span>
                            </div>
                          </TableCell>
                          <TableCell>₱{req.totalRefundAmount.toLocaleString()}</TableCell>
                          <TableCell>{new Date(req.requestDate).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="hover:bg-[var(--text-accent)] group" onClick={() => setSelectedRequest(req)}>
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
          <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Return Request Details</DialogTitle>
                <DialogDescription>Review the request below</DialogDescription>
              </DialogHeader>

              {selectedRequest && (
                <div className="grid gap-4 py-4">
                  <div className="flex justify-between items-start border-b pb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Request ID</p>
                      <p className="font-mono">#{selectedRequest.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Reason</p>
                      <p className="text-sm font-semibold">{selectedRequest.reason}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Requested Amount</p>
                      <p className="text-lg font-bold text-orange-600">₱{selectedRequest.totalRefundAmount.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
                      <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                        {selectedRequest.description}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>Close</Button>
                {selectedRequest?.status === 'pending' && (
                  <>
                    <Button variant="destructive" onClick={handleReject}>Reject Request</Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={handeApprove}>Approve Return</Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

