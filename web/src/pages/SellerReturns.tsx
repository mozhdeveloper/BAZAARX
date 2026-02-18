import { useState } from 'react';
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
  const { requests, approveRequest, rejectRequest } = useSellerReturnStore();
  const navigate = useNavigate();



  const filteredRequests = requests.filter(req => {
    const matchesSearch =
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.buyerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
              <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight flex items-center gap-2">
                <div>
                  Returns & Refunds
                  <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">Manage your return requests and refunds</p>
                </div>
              </h1>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'ghost'}
                  onClick={() => setStatusFilter('all')}
                  size="sm"
                  className={cn("rounded-full font-bold", statusFilter === 'all' ? "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark)]" : "text-gray-600 hover:bg-gray-100")}
                >
                  All Returns
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'ghost'}
                  onClick={() => setStatusFilter('pending')}
                  size="sm"
                  className={cn("rounded-full font-bold", statusFilter === 'pending' ? "bg-amber-500 hover:bg-amber-600 text-white" : "text-gray-600 hover:bg-gray-100")}
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'approved' ? 'default' : 'ghost'}
                  onClick={() => setStatusFilter('approved')}
                  size="sm"
                  className={cn("rounded-full font-bold", statusFilter === 'approved' ? "bg-green-600 hover:bg-green-700 text-white" : "text-gray-600 hover:bg-gray-100")}
                >
                  Approved
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex lg:flex-row flex-col gap-4">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                  <Input
                    className="pl-12 py-6 rounded-2xl border-orange-100 bg-white shadow-sm focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-all font-medium"
                    placeholder="Search by Order ID, Buyer Name, or Item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <Card className="border-orange-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-xl bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return ID</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
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
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">#{req.id}</TableCell>
                          <TableCell>{req.orderId}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{req.buyerName}</span>
                              <span className="text-xs text-gray-500">{req.buyerEmail}</span>
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
                            <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(req)}>
                              <Eye className="h-4 w-4 text-gray-500" />
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

