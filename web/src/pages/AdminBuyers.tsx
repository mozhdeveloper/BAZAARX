import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth, useAdminBuyers } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Search,
  Eye,
  Ban,
  CheckCircle,
  Phone,
  Calendar,
  ShoppingBag,
  DollarSign,
  Award,
  UserCheck,
  UserX,
  Activity,
  Loader2,
  Star
} from 'lucide-react';

const AdminBuyers: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const { 
    buyers,
    selectedBuyer,
    isLoading,
    loadBuyers,
    suspendBuyer,
    activateBuyer,
    selectBuyer
  } = useAdminBuyers();

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadBuyers();
    }
  }, [isAuthenticated, loadBuyers]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const getFilteredBuyers = (status?: string) => {
    const buyersToFilter = status && status !== 'all' 
      ? buyers.filter(buyer => buyer.status === status) 
      : buyers;
    
    return buyersToFilter.filter(buyer =>
      buyer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const activeBuyers = getFilteredBuyers('active');
  const suspendedBuyers = getFilteredBuyers('suspended');
  const bannedBuyers = getFilteredBuyers('banned');
  const allFilteredBuyers = getFilteredBuyers();

  const handleViewDetails = (buyer: any) => {
    selectBuyer(buyer);
    setShowDetailsDialog(true);
  };

  const handleSuspend = async () => {
    if (!selectedBuyer || !suspendReason) return;
    await suspendBuyer(selectedBuyer.id, suspendReason);
    setShowSuspendDialog(false);
    setSuspendReason('');
    selectBuyer(null);
  };

  const handleActivate = async () => {
    if (!selectedBuyer) return;
    await activateBuyer(selectedBuyer.id);
    setShowActivateDialog(false);
    selectBuyer(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Suspended</Badge>;
      case 'banned':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Banned</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'suspended':
        return <Ban className="w-4 h-4 text-orange-600" />;
      case 'banned':
        return <UserX className="w-4 h-4 text-red-600" />;
      default:
        return <UserCheck className="w-4 h-4 text-gray-600" />;
    }
  };

  const BuyerCard = ({ buyer, showActions = false }: { buyer: any; showActions?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
    >
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                {buyer.avatar ? (
                  <img src={buyer.avatar} alt={`${buyer.firstName} ${buyer.lastName}`} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <span className="text-white font-semibold text-lg">
                    {buyer.firstName.charAt(0)}{buyer.lastName.charAt(0)}
                  </span>
                )}
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-lg text-gray-900">
                  {buyer.firstName} {buyer.lastName}
                </h3>
                <p className="text-gray-600">{buyer.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(buyer.status)}
              {getStatusBadge(buyer.status)}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {buyer.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                {buyer.phone}
              </div>
            )}
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              Joined {buyer.joinDate.toLocaleDateString()}
            </div>
            {buyer.lastActivity && (
              <div className="flex items-center text-sm text-gray-600">
                <Activity className="w-4 h-4 mr-2" />
                Last active {buyer.lastActivity.toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Verification Status */}
          <div className="flex gap-2 mb-4">
            <Badge variant={buyer.isEmailVerified ? 'default' : 'secondary'} className="text-xs">
              {buyer.isEmailVerified ? '✓ Email Verified' : '✗ Email Unverified'}
            </Badge>
            <Badge variant={buyer.isPhoneVerified ? 'default' : 'secondary'} className="text-xs">
              {buyer.isPhoneVerified ? '✓ Phone Verified' : '✗ Phone Unverified'}
            </Badge>
          </div>

          {/* Shopping Metrics */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Shopping Activity</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="font-semibold text-gray-900">{buyer.metrics.totalOrders}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="font-semibold text-gray-900">₱{buyer.metrics.totalSpent.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Avg Order</p>
                <p className="font-semibold text-gray-900">₱{buyer.metrics.averageOrderValue.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Loyalty Points</p>
                <p className="font-semibold text-gray-900">{buyer.metrics.loyaltyPoints}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(buyer)}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </Button>
            
            {showActions && buyer.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  selectBuyer(buyer);
                  setShowSuspendDialog(true);
                }}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <Ban className="w-4 h-4 mr-1" />
                Suspend
              </Button>
            )}
            
            {showActions && buyer.status === 'suspended' && (
              <Button
                size="sm"
                onClick={() => {
                  selectBuyer(buyer);
                  setShowActivateDialog(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Activate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (isLoading && buyers.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar
          open={open}
          setOpen={setOpen}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading buyers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar
        open={open}
        setOpen={setOpen}
      />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Buyer Management</h1>
              <p className="text-gray-600">
                Manage customer accounts and monitor shopping activity
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                {buyers.length} Total Buyers
              </Badge>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search buyers by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                All ({allFilteredBuyers.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Active ({activeBuyers.length})
              </TabsTrigger>
              <TabsTrigger value="suspended" className="flex items-center gap-2">
                <Ban className="w-4 h-4" />
                Suspended ({suspendedBuyers.length})
              </TabsTrigger>
              <TabsTrigger value="banned" className="flex items-center gap-2">
                <UserX className="w-4 h-4" />
                Banned ({bannedBuyers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence>
                  {allFilteredBuyers.map((buyer) => (
                    <BuyerCard key={buyer.id} buyer={buyer} showActions={true} />
                  ))}
                </AnimatePresence>
              </div>
              {allFilteredBuyers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No buyers found</h3>
                  <p className="text-gray-600">Try adjusting your search criteria.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="active">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence>
                  {activeBuyers.map((buyer) => (
                    <BuyerCard key={buyer.id} buyer={buyer} showActions={true} />
                  ))}
                </AnimatePresence>
              </div>
              {activeBuyers.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active buyers</h3>
                  <p className="text-gray-600">No active buyers found.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="suspended">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence>
                  {suspendedBuyers.map((buyer) => (
                    <BuyerCard key={buyer.id} buyer={buyer} showActions={true} />
                  ))}
                </AnimatePresence>
              </div>
              {suspendedBuyers.length === 0 && (
                <div className="text-center py-12">
                  <Ban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No suspended buyers</h3>
                  <p className="text-gray-600">No buyers are currently suspended.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="banned">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence>
                  {bannedBuyers.map((buyer) => (
                    <BuyerCard key={buyer.id} buyer={buyer} />
                  ))}
                </AnimatePresence>
              </div>
              {bannedBuyers.length === 0 && (
                <div className="text-center py-12">
                  <UserX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No banned buyers</h3>
                  <p className="text-gray-600">No buyers are currently banned.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Buyer Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Buyer Details</DialogTitle>
          </DialogHeader>
          
          {selectedBuyer && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 mr-4">
                    {selectedBuyer.avatar ? (
                      <img src={selectedBuyer.avatar} alt={`${selectedBuyer.firstName} ${selectedBuyer.lastName}`} className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-xl">
                        {selectedBuyer.firstName.charAt(0)}{selectedBuyer.lastName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl text-gray-900">
                      {selectedBuyer.firstName} {selectedBuyer.lastName}
                    </h3>
                    <p className="text-gray-600">{selectedBuyer.email}</p>
                    {getStatusBadge(selectedBuyer.status)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-sm text-gray-900">{selectedBuyer.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedBuyer.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <p className="text-sm text-gray-900">
                      {selectedBuyer.dateOfBirth ? selectedBuyer.dateOfBirth.toLocaleDateString() : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                    <p className="text-sm text-gray-900">{selectedBuyer.joinDate.toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Verification Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Verification Status</label>
                  <div className="flex gap-2">
                    <Badge variant={selectedBuyer.isEmailVerified ? 'default' : 'secondary'}>
                      {selectedBuyer.isEmailVerified ? '✓ Email Verified' : '✗ Email Unverified'}
                    </Badge>
                    <Badge variant={selectedBuyer.isPhoneVerified ? 'default' : 'secondary'}>
                      {selectedBuyer.isPhoneVerified ? '✓ Phone Verified' : '✗ Phone Unverified'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Addresses</h4>
                <div className="space-y-3">
                  {selectedBuyer.addresses.map((address: any) => (
                    <div key={address.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{address.label}</span>
                        {address.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {address.street}, {address.city}, {address.province} {address.zipCode}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shopping Metrics */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Shopping Activity</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Total Orders</p>
                        <p className="text-2xl font-bold text-blue-900">{selectedBuyer.metrics.totalOrders}</p>
                      </div>
                      <ShoppingBag className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">Total Spent</p>
                        <p className="text-2xl font-bold text-green-900">₱{selectedBuyer.metrics.totalSpent.toLocaleString()}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600">Average Order</p>
                        <p className="text-2xl font-bold text-purple-900">₱{selectedBuyer.metrics.averageOrderValue.toLocaleString()}</p>
                      </div>
                      <Star className="w-8 h-8 text-purple-500" />
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-600">Loyalty Points</p>
                        <p className="text-2xl font-bold text-yellow-900">{selectedBuyer.metrics.loyaltyPoints}</p>
                      </div>
                      <Award className="w-8 h-8 text-yellow-500" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">Cancelled Orders</p>
                    <p className="text-lg font-bold text-red-900">{selectedBuyer.metrics.cancelledOrders}</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600">Returned Orders</p>
                    <p className="text-lg font-bold text-orange-900">{selectedBuyer.metrics.returnedOrders}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Buyer Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Buyer</DialogTitle>
            <DialogDescription>
              Please provide a reason for suspending "{selectedBuyer?.firstName} {selectedBuyer?.lastName}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter suspension reason..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSuspendDialog(false);
              setSuspendReason('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              disabled={!suspendReason.trim() || isLoading}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suspending...
                </>
              ) : (
                'Suspend Buyer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Buyer Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Buyer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate "{selectedBuyer?.firstName} {selectedBuyer?.lastName}"? 
              This will restore their full access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                'Activate Buyer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBuyers;