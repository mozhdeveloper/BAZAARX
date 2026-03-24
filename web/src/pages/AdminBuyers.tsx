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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              {buyer.avatar ? (
                <img loading="lazy" src={buyer.avatar} alt={`${buyer.firstName} ${buyer.lastName}`} className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <span className="text-white font-semibold text-xl">
                  {buyer.firstName.charAt(0)}{buyer.lastName.charAt(0)}
                </span>
              )}
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-xl text-gray-900 leading-tight">
                {buyer.firstName} {buyer.lastName}
              </h3>
              <p className="text-gray-500 text-sm mt-0.5">{buyer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(buyer.status)}
            {getStatusBadge(buyer.status)}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:gap-x-20 gap-y-4 mb-4">
          {/* Contact Info */}
          <div className="space-y-1.5 min-w-[180px]">
            {buyer.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2.5 text-gray-400" />
                {buyer.phone}
              </div>
            )}
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2.5 text-gray-400" />
              Joined {buyer.joinDate.toLocaleDateString()}
            </div>
            {buyer.lastActivity && (
              <div className="flex items-center text-sm text-gray-600">
                <Activity className="w-4 h-4 mr-2.5 text-gray-400" />
                Last active {buyer.lastActivity.toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Metrics Groups */}
          <div className="flex-1 max-w-[240px] md:pl-20">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-50">
                <tr className="group/row">
                  <td className="py-1.5 text-gray-600">Total Orders</td>
                  <td className="py-1.5 text-right font-bold text-gray-900">{buyer.metrics.totalOrders}</td>
                </tr>
                <tr className="group/row">
                  <td className="py-1.5 text-gray-600">Total Spent</td>
                  <td className="py-1.5 text-right font-bold text-gray-900">₱{buyer.metrics.totalSpent.toLocaleString()}</td>
                </tr>
                <tr className="group/row">
                  <td className="py-1.5 text-gray-600">Avg Order</td>
                  <td className="py-1.5 text-right font-bold text-gray-900">₱{buyer.metrics.averageOrderValue.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(buyer)}
              className="h-8 px-4 rounded-lg text-xs border-gray-200 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:bg-transparent transition-all flex items-center gap-2"
            >
              <Eye className="w-3.5 h-3.5" />
              View Details
            </Button>
          </div>
        </div>
      </div>
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
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">Buyer Management</h1>
              <p className="text-[var(--text-muted)]">
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

          {/* Filters and Search Bar */}
          <div className="flex items-center justify-between gap-6 mb-4">
            <div className="bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm rounded-full p-0.5 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-0.5">
                {[
                  { id: 'all', label: 'All', count: allFilteredBuyers.length },
                  { id: 'active', label: 'Active', count: activeBuyers.length },
                  { id: 'suspended', label: 'Suspended', count: suspendedBuyers.length },
                  { id: 'banned', label: 'Banned', count: bannedBuyers.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-4 h-7 text-xs font-medium transition-all duration-300 rounded-full flex items-center gap-1.5 whitespace-nowrap z-10 ${activeTab === tab.id
                      ? 'text-white'
                      : 'text-gray-500 hover:text-[var(--brand-primary)]'
                      }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] font-normal transition-colors ${activeTab === tab.id ? 'text-white/80' : 'text-[var(--text-muted)]/60'}`}>
                      ({tab.count})
                    </span>
                    {activeTab === tab.id && (
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
                placeholder="Search buyers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 bg-white border-gray-200 rounded-xl shadow-sm focus:border-[var(--brand-primary)] focus:ring-0 placeholder:text-gray-400 text-sm"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

            <TabsContent value="all">
              <Card className="border-none shadow-md rounded-xl overflow-hidden">
                <div className="bg-white">
                  <AnimatePresence mode="popLayout">
                    {allFilteredBuyers.map((buyer) => (
                      <BuyerCard key={buyer.id} buyer={buyer} showActions={true} />
                    ))}
                  </AnimatePresence>
                </div>
                {allFilteredBuyers.length === 0 && (
                  <div className="text-center py-20 bg-white">
                    <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No buyers found</h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-sm">
                      Try adjusting your search criteria.
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="active">
              <Card className="border-none shadow-md rounded-xl overflow-hidden">
                <div className="bg-white">
                  <AnimatePresence mode="popLayout">
                    {activeBuyers.map((buyer) => (
                      <BuyerCard key={buyer.id} buyer={buyer} showActions={true} />
                    ))}
                  </AnimatePresence>
                </div>
                {activeBuyers.length === 0 && (
                  <div className="text-center py-20 bg-white">
                    <CheckCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No active buyers</h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-sm">No active buyers found.</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="suspended">
              <Card className="border-none shadow-md rounded-xl overflow-hidden">
                <div className="bg-white">
                  <AnimatePresence mode="popLayout">
                    {suspendedBuyers.map((buyer) => (
                      <BuyerCard key={buyer.id} buyer={buyer} showActions={true} />
                    ))}
                  </AnimatePresence>
                </div>
                {suspendedBuyers.length === 0 && (
                  <div className="text-center py-20 bg-white">
                    <Ban className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No suspended buyers</h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-sm">No buyers are currently suspended.</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="banned">
              <Card className="border-none shadow-md rounded-xl overflow-hidden">
                <div className="bg-white">
                  <AnimatePresence mode="popLayout">
                    {bannedBuyers.map((buyer) => (
                      <BuyerCard key={buyer.id} buyer={buyer} />
                    ))}
                  </AnimatePresence>
                </div>
                {bannedBuyers.length === 0 && (
                  <div className="text-center py-20 bg-white">
                    <UserX className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No banned buyers</h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-sm">No buyers are currently banned.</p>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Buyer Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold text-gray-900">Buyer Details</DialogTitle>
          </DialogHeader>

          {selectedBuyer && (
            <div className="px-6 py-2 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-hide">
              {/* Basic Info */}
              <div className="grid gap-4">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 mr-4">
                    {selectedBuyer.avatar ? (
                      <img loading="lazy" src={selectedBuyer.avatar} alt={`${selectedBuyer.firstName} ${selectedBuyer.lastName}`} className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-xl">
                        {selectedBuyer.firstName.charAt(0)}{selectedBuyer.lastName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 leading-tight">
                      {selectedBuyer.firstName} {selectedBuyer.lastName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-500 text-[13px]">{selectedBuyer.email}</p>
                      {getStatusBadge(selectedBuyer.status)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-xs text-gray-900">{selectedBuyer.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                    <p className="text-xs text-gray-900 capitalize">{selectedBuyer.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                    <p className="text-xs text-gray-900">
                      {selectedBuyer.dateOfBirth ? selectedBuyer.dateOfBirth.toLocaleDateString() : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Join Date</label>
                    <p className="text-xs text-gray-900">{selectedBuyer.joinDate.toLocaleDateString()}</p>
                  </div>
                </div>


              </div>

              {/* Addresses */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Addresses</h4>
                <div className="space-y-3">
                  {selectedBuyer.addresses.map((address: any) => (
                    <div key={address.id} className="p-3 bg-gray-50/50 rounded-lg border border-gray-100/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-900">{address.label}</span>
                        {address.isDefault && (
                          <Badge className="text-[10px] bg-transparent shadow-none text-[var(--brand-primary)] hover:bg-transparent border-none font-bold uppercase tracking-wider">Default</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        {address.street}, {address.city}, {address.province} {address.zipCode}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shopping Metrics */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Shopping Activity
                </h4>
                <div className="bg-gray-50/50 rounded-xl overflow-hidden border border-gray-100/50">
                  <table className="w-full text-[13px]">
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="text-xs px-4 py-2 text-gray-600">Total Orders</td>
                        <td className="text-xs px-4 py-2 text-right font-bold text-gray-900">
                          {selectedBuyer.metrics.totalOrders}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-xs px-4 py-2 text-gray-600">Total Spent</td>
                        <td className="text-xs px-4 py-2 text-right font-bold text-gray-900">
                          ₱{selectedBuyer.metrics.totalSpent.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-xs px-4 py-2 text-gray-600">Average Order</td>
                        <td className="text-xs px-4 py-2 text-right font-bold text-gray-900">
                          ₱{selectedBuyer.metrics.averageOrderValue.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-xs px-4 py-2 text-gray-600">Bazcoins</td>
                        <td className="text-xs px-4 py-2 text-right font-bold text-[var(--brand-accent)]">
                          {selectedBuyer.metrics.bazcoins}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-xs px-4 py-2 text-gray-600">Cancelled Orders</td>
                        <td className="text-xs px-4 py-2 text-right font-bold text-red-600">
                          {selectedBuyer.metrics.cancelledOrders}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-xs px-4 py-2 text-gray-600">Returned Orders</td>
                        <td className="text-xs px-4 py-2 text-right font-bold text-red-600">
                          {selectedBuyer.metrics.returnedOrders}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row items-center justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50/50">
            {selectedBuyer?.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSuspendDialog(true)}
                className="text-gray-500 border-gray-200 hover:text-orange-600 hover:border-orange-600 hover:bg-orange-50 transition-all flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Suspend Account
              </Button>
            )}

            {selectedBuyer?.status === 'suspended' && (
              <Button
                size="sm"
                onClick={() => setShowActivateDialog(true)}
                className="bg-green-600 hover:bg-green-700 text-white transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Activate Account
              </Button>
            )}
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