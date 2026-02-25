import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  Filter,
  Eye,
  LogOut,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { useAuthStore } from '@/stores/sellerStore';
import { useSellerReturnStore, SellerReturnRequest } from '@/stores/sellerReturnStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { sellerLinks } from '@/config/sellerLinks';
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

const Logo = () => (
  <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
    <img 
      src="/Logo.png" 
      alt="BazaarPH Logo" 
      className="h-8 w-8 object-contain flex-shrink-0"
    />
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-semibold text-gray-900 whitespace-pre">
      BazaarPH Seller
    </motion.span>
  </Link>
);

const LogoIcon = () => (
  <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
    <img 
      src="/Logo.png" 
      alt="BazaarPH Logo" 
      className="h-8 w-8 object-contain flex-shrink-0"
    />
  </Link>
);

export function SellerReturns() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<SellerReturnRequest | null>(null);
  
  const { seller, logout } = useAuthStore();
  const { requests, approveRequest, rejectRequest } = useSellerReturnStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/seller/auth');
  };

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
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {sellerLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <SidebarLink
              link={{
                label: seller?.name || "Seller",
                href: "/seller/profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {seller?.name?.charAt(0) || 'S'}
                    </span>
                  </div>
                ),
              }}
            />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {open && <span>Logout</span>}
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <div className="px-8 py-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
             <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
               <RotateCcw className="h-6 w-6 text-orange-600" />
               Returns & Refunds
             </h1>
             <div className="flex gap-2">
                <Button 
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('all')}
                    size="sm"
                >
                    All
                </Button>
                <Button 
                    variant={statusFilter === 'pending' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('pending')}
                    size="sm"
                    className={statusFilter === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                >
                    Pending
                </Button>
                <Button 
                    variant={statusFilter === 'approved' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('approved')}
                    size="sm"
                    className={statusFilter === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                    Approved
                </Button>
             </div>
          </div>
        </div>

        <div className="p-8 overflow-y-auto">
             <div className="mb-6 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                        className="pl-9" 
                        placeholder="Search order ID, buyer name..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
             </div>

             <Card>
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
  );
}
