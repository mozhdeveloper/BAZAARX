import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/sellerStore';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Star, 
  BarChart3, 
  Settings, 
  Store,
  Wallet,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Download,
  CheckCircle,
  AlertCircle,
  Zap,
  MessageSquare
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function SellerEarnings() {
  const { seller } = useAuthStore();
  const [open, setOpen] = useState(false);

  const sellerLinks = [
    {
      label: "Dashboard",
      href: "/seller",
      icon: <LayoutDashboard className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Store Profile",
      href: "/seller/store-profile",
      icon: <Store className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Products",
      href: "/seller/products",
      icon: <Package className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Orders",
      href: "/seller/orders",
      icon: <ShoppingBag className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Flash Sales",
      href: "/seller/flash-sales",
      icon: <Zap className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Messages",
      href: "/seller/messages",
      icon: <MessageSquare className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Earnings",
      href: "/seller/earnings",
      icon: <Wallet className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Reviews",
      href: "/seller/reviews",
      icon: <Star className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Analytics",
      href: "/seller/analytics",
      icon: <BarChart3 className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Settings",
      href: "/seller/settings",
      icon: <Settings className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    }
  ];

  const Logo = () => (
    <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
      <img 
        src="/Logo.png" 
        alt="BazaarPH Logo" 
        className="h-5 w-6 flex-shrink-0"
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black whitespace-pre"
      >
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

  // Demo data
  const payoutHistory = [
    {
      id: 1,
      date: '2024-01-15',
      amount: 25840.50,
      status: 'completed',
      method: 'Bank Transfer',
      reference: 'PYT-2024-001'
    },
    {
      id: 2,
      date: '2024-01-08',
      amount: 18920.00,
      status: 'completed',
      method: 'Bank Transfer',
      reference: 'PYT-2024-002'
    },
    {
      id: 3,
      date: '2024-01-01',
      amount: 32150.75,
      status: 'completed',
      method: 'Bank Transfer',
      reference: 'PYT-2024-003'
    }
  ];

  const totalEarnings = 76911.25;
  const pendingPayout = 15240.50;
  const availableBalance = totalEarnings - pendingPayout;

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
          <div>
            <SidebarLink
              link={{
                label: seller?.storeName || "Store",
                href: "/seller/store-profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {seller?.storeName?.charAt(0) || 'S'}
                    </span>
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Earnings Dashboard</h1>
            <p className="text-gray-600 mt-2">Track your store's financial performance and payouts</p>
          </div>

          {/* Earnings Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Earnings */}
            <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1 text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                  <TrendingUp className="h-4 w-4" />
                  +12.5%
                </div>
              </div>
              <p className="text-white/80 text-sm mb-1">Total Earnings</p>
              <p className="text-3xl font-bold">₱{totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              <p className="text-white/70 text-xs mt-2">Lifetime earnings from sales</p>
            </Card>

            {/* Available Balance */}
            <Card className="p-6 border-2 border-green-200 bg-green-50">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-green-600" />
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-gray-600 text-sm mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-gray-900">₱{availableBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              <p className="text-gray-600 text-xs mt-2">Ready for payout</p>
            </Card>

            {/* Pending Payout */}
            <Card className="p-6 border-2 border-amber-200 bg-amber-50">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-gray-600 text-sm mb-1">Pending Payout</p>
              <p className="text-3xl font-bold text-gray-900">₱{pendingPayout.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              <p className="text-gray-600 text-xs mt-2">Processing orders</p>
            </Card>
          </div>

          {/* Payout Schedule */}
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Payout Schedule</h2>
                <p className="text-gray-600 text-sm mt-1">Automatic payouts every Friday</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Next payout: Friday, Jan 26</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payout Frequency</p>
                    <p className="font-semibold text-gray-900">Weekly</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">Every Friday at 5:00 PM PHT</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Processing Time</p>
                    <p className="font-semibold text-gray-900">1-3 Business Days</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">Funds arrive in your account</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Minimum Payout</p>
                    <p className="font-semibold text-gray-900">₱500.00</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">Required minimum balance</p>
              </div>
            </div>
          </Card>

          {/* Bank Account Info */}
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Bank Account</h2>
              <Button variant="outline" size="sm">
                Update Account
              </Button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Account Name</p>
                  <p className="font-semibold text-gray-900">{seller?.accountName || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Bank Name</p>
                  <p className="font-semibold text-gray-900">{seller?.bankName || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Account Number</p>
                  <p className="font-semibold text-gray-900">
                    {seller?.accountNumber ? `****${seller.accountNumber.slice(-4)}` : 'Not set'}
                  </p>
                </div>

              </div>
            </div>
          </Card>

          {/* Payout History */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Payout History</h2>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>

            {payoutHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Reference</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Method</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutHistory.map((payout) => (
                      <tr key={payout.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <p className="font-medium text-gray-900">
                            {new Date(payout.date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(payout.date).toLocaleDateString('en-US', { weekday: 'long' })}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-mono text-sm text-gray-900">{payout.reference}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-gray-900">{payout.method}</p>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <p className="font-semibold text-gray-900">
                            ₱{payout.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center">
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Completed
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-2">No payout history yet</p>
                <p className="text-sm text-gray-500">Your payouts will appear here once processed</p>
              </div>
            )}
          </Card>

          {/* Help Section */}
          <Card className="p-6 mt-8 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Need help with payouts?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  If you have questions about your earnings, payouts, or bank account setup, our support team is here to help.
                </p>
                <Button variant="outline" size="sm" className="bg-white">
                  Contact Support
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
