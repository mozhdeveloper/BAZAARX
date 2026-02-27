import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Package,
  ChevronLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Plus,
  MessageSquare,
  Filter,
  Search,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { productRequestService, ProductRequest } from '../services/productRequestService';
import { useBuyerStore } from '../stores/buyerStore';
import ProductRequestModal from '../components/ProductRequestModal';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending Review',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: <Clock className="h-4 w-4 text-amber-600" />,
  },
  approved: {
    label: 'Approved',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />,
  },
  rejected: {
    label: 'Not Available',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: <XCircle className="h-4 w-4 text-red-600" />,
  },
};

export default function BuyerProductRequestsPage() {
  const navigate = useNavigate();
  const { profile } = useBuyerStore();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = async () => {
    if (!profile?.id) return;
    try {
      const data = await productRequestService.getRequestsByUser(profile.id);
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [profile?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const filteredRequests = filterStatus
    ? requests.filter((r) => r.status === filterStatus)
    : requests;

  const statusCounts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-[var(--brand-wash)]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-4 group"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-extrabold font-heading text-[var(--text-headline)] tracking-tight mb-2">
                My Product Requests
              </h1>
              <p className="text-[var(--text-muted)]">
                Track the status of products you've requested
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button
                onClick={() => setShowRequestModal(true)}
                className="gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
              >
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { key: 'pending', label: 'Pending', count: statusCounts.pending, icon: <Clock className="h-5 w-5" />, delay: 0.1 },
            { key: 'in_progress', label: 'In Progress', count: statusCounts.in_progress, icon: <Loader2 className="h-5 w-5" />, delay: 0.2 },
            { key: 'approved', label: 'Approved', count: statusCounts.approved, icon: <CheckCircle2 className="h-5 w-5" />, delay: 0.3 },
            { key: 'rejected', label: 'Not Available', count: statusCounts.rejected, icon: <XCircle className="h-5 w-5" />, delay: 0.4 },
          ].map((stat) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay }}
            >
              <Card
                className={cn(
                  "cursor-pointer border transition-all hover:shadow-md",
                  filterStatus === stat.key
                    ? "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20 shadow-md"
                    : "border-gray-100 hover:border-[var(--brand-primary)]/30"
                )}
                onClick={() => setFilterStatus(filterStatus === stat.key ? null : stat.key)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--brand-wash)] rounded-xl flex items-center justify-center text-[var(--brand-primary)]">
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-headline)]">{stat.count}</p>
                    <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filter Info */}
        {filterStatus && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4"
          >
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Filter className="h-4 w-4" />
              <span>Showing: <span className="font-semibold text-[var(--text-primary)]">{STATUS_CONFIG[filterStatus]?.label}</span></span>
              <button
                onClick={() => setFilterStatus(null)}
                className="ml-2 text-[var(--brand-primary)] hover:underline text-xs font-medium"
              >
                Clear filter
              </button>
            </div>
          </motion.div>
        )}

        {/* Request List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-[var(--brand-primary)] animate-spin mb-4" />
            <p className="text-[var(--text-muted)]">Loading your requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border border-gray-100">
              <CardContent className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-20 h-20 bg-[var(--brand-wash)] rounded-full flex items-center justify-center mb-6">
                  <Package className="h-10 w-10 text-[var(--brand-primary)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-headline)] mb-2">
                  {filterStatus ? 'No requests found' : 'No product requests yet'}
                </h3>
                <p className="text-[var(--text-muted)] text-center max-w-md mb-6">
                  {filterStatus
                    ? 'Try a different filter or submit a new request.'
                    : "Can't find what you're looking for? Request a product and we'll notify you when it becomes available!"}
                </p>
                <Button
                  onClick={() => setShowRequestModal(true)}
                  className="gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
                >
                  <Plus className="h-4 w-4" />
                  Request a Product
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request, index) => {
              const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border border-gray-100 hover:border-[var(--brand-primary)]/20 hover:shadow-md transition-all">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        {/* Left: Product Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-[var(--brand-wash)] rounded-xl flex items-center justify-center shrink-0">
                            <Package className="h-6 w-6 text-[var(--brand-primary)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-[var(--text-headline)] mb-1 truncate">
                              {request.productName}
                            </h3>
                            <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-2">
                              {request.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(request.requestDate)}
                              </span>
                              {request.category && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  {request.category}
                                </Badge>
                              )}
                              {request.votes > 0 && (
                                <span className="flex items-center gap-1">
                                  👍 {request.votes} {request.votes === 1 ? 'vote' : 'votes'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Status Badge */}
                        <div className="flex items-center sm:justify-end">
                          <div
                            className={cn(
                              'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium',
                              config.bg,
                              config.color
                            )}
                          >
                            {config.icon}
                            {config.label}
                          </div>
                        </div>
                      </div>

                      {/* Admin Notes (if any) */}
                      {request.adminNotes && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Admin Response</p>
                              <p className="text-sm text-[var(--text-primary)]">{request.adminNotes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <BazaarFooter />

      {/* Product Request Modal */}
      <ProductRequestModal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          // Refresh the list after submitting
          loadRequests();
        }}
      />
    </div>
  );
}
