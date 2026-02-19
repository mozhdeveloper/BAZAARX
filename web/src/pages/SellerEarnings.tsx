import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/sellerStore';
import { SellerSidebar } from '@/components/seller/SellerSidebar';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Download,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Logo components defined outside of render


export function SellerEarnings() {
  const { seller } = useAuthStore();

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
    <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
      <SellerSidebar />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
        </div>

        <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto relative z-10 scrollbar-hide">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight">Earnings Dashboard</h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">Track your store's financial performance and payouts</p>
            </div>

            {/* Earnings Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Earnings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="text-[var(--secondary-foreground)] group-hover:text-[var(--brand-primary)] transition-all">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-[var(--text-muted)] text-sm relative z-10">Total Earnings</h3>
                  <div className="flex items-end gap-3 mt-1 relative z-10">
                    <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all">
                      ₱{totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 mb-1.5">
                      <TrendingUp className="h-3 w-3" />
                      +12.5%
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Available Balance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-50 to-green-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-green-100 transition-colors"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="text-green-600 group-hover:text-green-700 transition-all">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-[var(--text-muted)] text-sm relative z-10">Available Balance</h3>
                  <div className="flex items-end gap-3 mt-1 relative z-10">
                    <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-green-600 transition-all">
                      ₱{availableBalance.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Ready
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Pending Payout */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-amber-100 transition-colors"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="text-amber-600 group-hover:text-amber-700 transition-all">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-[var(--text-muted)] text-sm relative z-10">Pending Payout</h3>
                  <div className="flex items-end gap-3 mt-1 relative z-10">
                    <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-amber-600 transition-all">
                      ₱{pendingPayout.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Processing
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Payout Schedule */}
            <Card className="p-8 mb-8 border-0 shadow-md rounded-xl bg-white">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-headline)]">Payout Schedule</h2>
                  <p className="text-[var(--text-muted)] text-sm mt-1">Automatic payouts every Friday</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100 shadow-sm">
                  <Calendar className="h-4 w-4" />
                  <span className="font-bold text-sm">Next payout: Friday, Jan 26</span>
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
            <Card className="p-8 mb-8 border-0 shadow-md rounded-xl bg-white">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--text-headline)]">Bank Account</h2>
                <Button variant="outline" size="sm" className="rounded-full border-gray-200 hover:border-orange-200 hover:bg-orange-50 text-gray-600 hover:text-orange-600">
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
            <Card className="p-8 border-0 shadow-md rounded-xl bg-white">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-[var(--text-headline)]">Payout History</h2>
                <Button variant="outline" size="sm" className="rounded-full border-gray-200 hover:border-orange-200 hover:bg-orange-50 text-gray-600 hover:text-orange-600">
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
            <Card className="p-8 mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="flex items-start gap-6 relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-blue-600">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Need help with payouts?</h3>
                  <p className="text-sm text-gray-600 mb-6 max-w-2xl leading-relaxed font-medium">
                    If you have questions about your earnings, payouts, or bank account setup, our support team is here to help.
                  </p>
                  <Button variant="outline" size="sm" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 rounded-xl px-6 font-semibold shadow-sm">
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


